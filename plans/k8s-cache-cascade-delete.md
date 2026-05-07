# K8s Cache Cascade Delete — Stale Resource Cleanup

## Problem

A pod `rubi-parser/rubi-parser-6cc654d65d-q6fqp` remained in the inventory cache after its entire namespace was deleted from the cluster. The pod has `status: 3` (Terminated), `ready: false`, `containerState: "Terminated"`, but was never removed from cache.

### Root Cause Analysis

The existing delete pipeline (implemented in `k8s-delete-propagation.md`) handles the happy path: a single resource DELETE event arrives via the admission webhook or informer, and it propagates through Collector → Parser → Inventory Cache → ORM. Three failure modes cause delete events to be lost:

1. **Namespace termination breaks informer watch streams**: Informers are namespace-scoped (`dynamicinformer.NewFilteredDynamicSharedInformerFactory(shared.dynamicClient, 0, namespace, nil)` — `ClientGoCollector.go:252`). When K8s terminates a namespace, the API server closes the watch stream for that namespace. Pod DELETE events that fire during namespace termination may never reach the informer's `DeleteFunc`.

2. **Webhook `FailurePolicy: Ignore`**: The admission webhook uses `FailurePolicy: Ignore` (observe-only). During namespace termination, the API server may skip the webhook entirely, meaning pod DELETE events never reach `handleAdmissionEvent`.

3. **No cascade logic**: Deleting a Deployment only removes the Deployment from cache. K8s garbage collection asynchronously deletes owned ReplicaSets and then Pods, but those child DELETE events can be lost via failure modes 1 and 2.

### Solution: Three Complementary Fixes

| Fix | Purpose | Catches |
|-----|---------|---------|
| **A: Stale Reaper** | Periodic reconciliation against live cluster state | Any stale resource regardless of cause |
| **B: Namespace CASCADE** | When namespace DELETE is received, cascade-delete all resources in that namespace | Failure modes 1 & 2 (namespace-scoped informer/webhook gaps) |
| **C: Deployment CASCADE** | When deployment DELETE is received, cascade-delete owned ReplicaSets and Pods | Failure mode 3 (no owner-aware cascade) |

All three are needed because each covers a different edge case window:
- **B** fires instantly but depends on the namespace DELETE event itself reaching the collector
- **C** fires instantly but depends on the deployment DELETE event reaching the collector
- **A** is the safety net that catches anything B and C miss (e.g., if the collector itself was restarting during the delete)

## Project Location

Per `never-edit-vendor.md`, all changes are in the actual sibling project:

| Component | Source Project | Path |
|-----------|---------------|------|
| l8collector | `../l8collector` | `../l8collector/go/collector/protocols/k8sclient/` |
| probler | this project | re-vendor after upstream commits |

No changes needed in l8parser or l8inventory — the existing delete pipeline handles everything downstream once the collector issues delete calls.

---

## Fix A: Stale Resource Reaper

### Overview

A background goroutine runs periodically (e.g., every 60 seconds) and reconciles the collector cache against the live K8s cluster. For each cached object, it checks whether the resource still exists in the cluster. If not, it fires the delete pipeline.

### File: `protocols/k8sclient/Reaper.go` (NEW)

```go
package k8sclient

import (
    "context"
    "fmt"
    "strings"
    "time"

    "k8s.io/apimachinery/pkg/runtime/schema"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

const reaperInterval = 60 * time.Second

// StartReaper begins a background goroutine that periodically checks all
// cached K8s objects against the live cluster. Objects that no longer exist
// are deleted from cache and forwarded through the delete pipeline.
func StartReaper() {
    go func() {
        for {
            select {
            case <-time.After(reaperInterval):
                reapStaleEntries()
            case <-shared.stopCh:
                return
            }
        }
    }()
}

func reapStaleEntries() {
    if shared.dynamicClient == nil {
        return
    }

    // Snapshot all cached objects (read lock, then release)
    entries := shared.cache.List("", "", "")

    for _, entry := range entries {
        if entry.GVR == "" || entry.Name == "" {
            continue
        }
        // Skip cluster-scoped resources that have no namespace
        // (nodes, namespaces themselves, clusterroles, etc.)
        // — they use a different check path
        gvr := parseGVR(entry.GVR)

        var exists bool
        var err error
        if entry.Namespace == "" {
            // Cluster-scoped resource
            _, err = shared.dynamicClient.Resource(gvr).Get(
                context.TODO(), entry.Name, metav1.GetOptions{})
        } else {
            // Namespace-scoped resource
            _, err = shared.dynamicClient.Resource(gvr).Namespace(entry.Namespace).Get(
                context.TODO(), entry.Name, metav1.GetOptions{})
        }

        if err == nil {
            exists = true
        }

        if !exists {
            fmt.Printf("[REAPER] stale entry: gvr=%s ns=%s name=%s — removing\n",
                entry.GVR, entry.Namespace, entry.Name)
            shared.cache.Delete(entry.GVR, entry.Namespace, entry.Name)
            if shared.onDelete != nil {
                shared.onDelete(entry.GVR, entry.Namespace, entry.Name)
            }
        }
    }
}

// parseGVR converts the string format "group/version/resource" or
// "version/resource" back to a schema.GroupVersionResource.
func parseGVR(gvrText string) schema.GroupVersionResource {
    parts := strings.Split(gvrText, "/")
    switch len(parts) {
    case 2:
        // "v1/pods" -> group="", version="v1", resource="pods"
        return schema.GroupVersionResource{
            Group: "", Version: parts[0], Resource: parts[1],
        }
    case 3:
        // "apps/v1/deployments" -> group="apps", version="v1", resource="deployments"
        return schema.GroupVersionResource{
            Group: parts[0], Version: parts[1], Resource: parts[2],
        }
    default:
        // Multi-segment group: "networking.k8s.io/v1/ingresses"
        // Everything before the last two segments is the group
        if len(parts) >= 3 {
            return schema.GroupVersionResource{
                Group:    strings.Join(parts[:len(parts)-2], "/"),
                Version:  parts[len(parts)-2],
                Resource: parts[len(parts)-1],
            }
        }
        return schema.GroupVersionResource{}
    }
}
```

### Activation

In `ClientGoCollector.go`, call `StartReaper()` after the shared runtime is initialized and connected. This should happen once, guarded by the same pattern used for `ensureAdmissionServer`:

```go
// In Activate() or after successful connect(), after informers are ready:
go StartReaper()
```

Use a `sync.Once` or a flag on `sharedRuntimeState` to ensure the reaper starts exactly once, similar to how `serverStarted` guards the admission server.

### Rate Limiting

The reaper iterates all cached objects and issues one GET per object per cycle. To avoid overloading the API server:

1. **Batch with sleep**: Process entries in batches (e.g., 50 at a time) with a short sleep between batches
2. **Skip recently observed**: If `entry.ObservedAt` is within the last 30 seconds, skip it — it was just seen by the informer
3. **Log summary**: Print a single summary line per cycle (`[REAPER] checked=%d reaped=%d`) rather than per-entry logging for non-reaped items

### Error Handling

- If `dynamicClient.Get()` returns a non-NotFound error (e.g., network timeout, RBAC), do NOT delete the entry — skip it. Only delete on a confirmed 404/NotFound.
- Use `k8s.io/apimachinery/pkg/api/errors` `IsNotFound(err)` for reliable detection.

---

## Fix B: Namespace DELETE Cascade

### Overview

When a namespace DELETE event is received (via admission webhook or informer), before or after deleting the namespace itself from cache, scan the cache for ALL objects in that namespace across ALL GVR types and issue deletes for each.

### File: `protocols/k8sclient/Cascade.go` (NEW)

```go
package k8sclient

import "fmt"

// cascadeNamespaceDelete removes all cached objects belonging to the
// given namespace. Called when a namespace DELETE event is received.
// This handles the case where namespace-scoped informers lose their
// watch stream before child resource DELETE events fire.
func cascadeNamespaceDelete(namespace string) {
    if namespace == "" {
        return
    }

    // List ALL objects in this namespace across ALL GVR types
    // (pass empty gvr to match all types, per Cache.List logic)
    entries := shared.cache.List("", namespace, "")

    fmt.Printf("[CASCADE-NS] namespace=%s found=%d cached objects to delete\n",
        namespace, len(entries))

    for _, entry := range entries {
        // Skip the namespace resource itself (already being deleted by caller)
        if entry.GVR == "v1/namespaces" {
            continue
        }
        shared.cache.Delete(entry.GVR, entry.Namespace, entry.Name)
        if shared.onDelete != nil {
            shared.onDelete(entry.GVR, entry.Namespace, entry.Name)
        }
    }
}
```

### Integration Point: Shared Helper in `Cascade.go`

The DELETE handling logic (UID extraction, cache delete, onDelete callback, cascade checks) is called from both `handleAdmissionEvent` and `startInformer DeleteFunc`. Per the no-duplication rule, this is extracted into a single function in `Cascade.go`:

```go
// handleResourceDeletion is the single entry point for all delete processing.
// Called by both the admission webhook handler and the informer DeleteFunc.
func handleResourceDeletion(gvrText, namespace, name string) {
    // Get UID before deleting from cache (needed for ownership cascade)
    var uid string
    if existing, ok := shared.cache.Get(gvrText, namespace, name); ok {
        uid = existing.UID
    }

    shared.cache.Delete(gvrText, namespace, name)
    if shared.onDelete != nil {
        shared.onDelete(gvrText, namespace, name)
    }

    // CASCADE: namespace deletion → delete all namespaced resources
    if gvrText == "v1/namespaces" {
        cascadeNamespaceDelete(name) // name IS the namespace name for ns resources
    }
    // CASCADE: deployment deletion → delete owned RS and Pods
    if gvrText == "apps/v1/deployments" {
        cascadeDeploymentDelete(namespace, name, uid)
    }
}
```

### Callers: `ClientGoCollector.go`

Both call sites become single-line delegations:

**`handleAdmissionEvent` (line 198-203):**
```go
if event.Operation == "DELETE" {
    handleResourceDeletion(gvrText, event.Namespace, event.Name)
    return nil
}
```

**`startInformer` DeleteFunc (line 269-278):**
```go
DeleteFunc: func(obj interface{}) {
    item, ok := extractDeletedObject(obj)
    if !ok {
        return
    }
    handleResourceDeletion(gvrText, item.GetNamespace(), item.GetName())
},
```

### Key Detail: Namespace Name vs Namespace Field

For a namespace resource itself:
- `event.Namespace` is empty (namespaces are cluster-scoped)
- `event.Name` is the namespace name (e.g., `"rubi-parser"`)

When cascading, we call `shared.cache.List("", event.Name, "")` — the second parameter matches against `entry.Namespace`, which is the namespace field of namespaced resources (pods, deployments, etc.). So `event.Name` (the deleted namespace's name) correctly matches the `.Namespace` field of all resources that belong to that namespace.

---

## Fix C: Deployment DELETE Cascade

### Overview

When a Deployment DELETE event is received, scan the cache for ReplicaSets owned by that Deployment, then scan for Pods owned by those ReplicaSets. Delete all of them from cache and forward through the pipeline.

### Implementation in `protocols/k8sclient/Cascade.go`

```go
// cascadeDeploymentDelete removes ReplicaSets and Pods owned by the
// deleted Deployment. K8s garbage collector deletes these asynchronously,
// but those DELETE events may be lost if the informer/webhook misses them.
func cascadeDeploymentDelete(namespace, deploymentName, deploymentUID string) {
    if namespace == "" || deploymentName == "" {
        return
    }

    // Find ReplicaSets in this namespace owned by this Deployment
    allRS := shared.cache.List("apps/v1/replicasets", namespace, "")
    var ownedRS []*CachedObject
    for _, rs := range allRS {
        if isOwnedBy(rs, deploymentUID, deploymentName, "Deployment") {
            ownedRS = append(ownedRS, rs)
        }
    }

    fmt.Printf("[CASCADE-DEPLOY] deployment=%s/%s found=%d owned ReplicaSets\n",
        namespace, deploymentName, len(ownedRS))

    // For each owned ReplicaSet, find and delete its Pods
    for _, rs := range ownedRS {
        rsUID := rs.UID
        rsName := rs.Name

        pods := shared.cache.List("v1/pods", namespace, "")
        podCount := 0
        for _, pod := range pods {
            if isOwnedBy(pod, rsUID, rsName, "ReplicaSet") {
                shared.cache.Delete(pod.GVR, pod.Namespace, pod.Name)
                if shared.onDelete != nil {
                    shared.onDelete(pod.GVR, pod.Namespace, pod.Name)
                }
                podCount++
            }
        }
        fmt.Printf("[CASCADE-DEPLOY]   rs=%s/%s found=%d owned Pods\n",
            namespace, rsName, podCount)

        // Delete the ReplicaSet itself
        shared.cache.Delete(rs.GVR, rs.Namespace, rs.Name)
        if shared.onDelete != nil {
            shared.onDelete(rs.GVR, rs.Namespace, rs.Name)
        }
    }
}

// isOwnedBy checks the ownerReferences in the cached object's metadata
// to see if it is owned by the given owner.
func isOwnedBy(obj *CachedObject, ownerUID, ownerName, ownerKind string) bool {
    if obj == nil || obj.Object == nil {
        return false
    }
    metadataRaw, ok := obj.Object["metadata"]
    if !ok {
        return false
    }
    metadata, ok := metadataRaw.(map[string]interface{})
    if !ok {
        return false
    }
    ownersRaw, ok := metadata["ownerReferences"]
    if !ok {
        return false
    }
    owners, ok := ownersRaw.([]interface{})
    if !ok {
        return false
    }
    for _, ownerRaw := range owners {
        owner, ok := ownerRaw.(map[string]interface{})
        if !ok {
            continue
        }
        // Match by UID if available (most reliable)
        if ownerUID != "" {
            if uid, _ := owner["uid"].(string); uid == ownerUID {
                return true
            }
        }
        // Fallback: match by name + kind
        if name, _ := owner["name"].(string); name == ownerName {
            if kind, _ := owner["kind"].(string); kind == ownerKind {
                return true
            }
        }
    }
    return false
}
```

### Integration Points

Both `handleAdmissionEvent` and `startInformer DeleteFunc` already delegate to the shared `handleResourceDeletion()` function (defined in Fix B above). The deployment cascade is triggered by the `gvrText == "apps/v1/deployments"` check inside that shared function — no additional call-site changes needed beyond what Fix B already introduced.

### Why Only Deployment → ReplicaSet → Pod?

This is the most common ownership chain that causes stale entries. Other owner relationships (StatefulSet → Pod, DaemonSet → Pod, Job → Pod) follow the same pattern. The cascade function can be extended for these:

```go
// Future: extend for other owner types
if gvrText == "apps/v1/statefulsets" {
    cascadeStatefulSetDelete(event.Namespace, event.Name, uid)
}
```

For the initial implementation, Deployment → RS → Pod covers the reported bug and the most common workload type.

---

## Implementation Phases

### Phase 1: Cascade Logic (Fix B + C)

**Project**: `../l8collector`

1. Create `protocols/k8sclient/Cascade.go` with:
   - `handleResourceDeletion(gvrText, namespace, name string)` — single shared entry point for all delete processing (UID extraction, cache delete, onDelete callback, cascade dispatch)
   - `cascadeNamespaceDelete(namespace string)`
   - `cascadeDeploymentDelete(namespace, deploymentName, deploymentUID string)`
   - `isOwnedBy(obj *CachedObject, ownerUID, ownerName, ownerKind string) bool`

2. Modify `protocols/k8sclient/ClientGoCollector.go`:
   - In `handleAdmissionEvent` DELETE block (line 198-203): replace inline logic with single call to `handleResourceDeletion(gvrText, event.Namespace, event.Name)`
   - In `startInformer` DeleteFunc (line 269-278): replace inline logic with single call to `handleResourceDeletion(gvrText, item.GetNamespace(), item.GetName())`

### Phase 2: Stale Reaper (Fix A)

**Project**: `../l8collector`

1. Create `protocols/k8sclient/Reaper.go` with:
   - `StartReaper()` goroutine
   - `reapStaleEntries()` reconciliation logic
   - `parseGVR(gvrText string) schema.GroupVersionResource` helper

2. Modify `protocols/k8sclient/SharedRuntime.go`:
   - Add `reaperStarted bool` field to `sharedRuntimeState`
   - Add `startReaper()` method guarded by `reaperStarted` flag

3. Modify `protocols/k8sclient/ClientGoCollector.go`:
   - Call `shared.startReaper()` after successful `connect()` in `Activate()`

### Phase 3: Re-vendor & Build

**Project**: probler (this project)

```bash
cd go
rm -rf go.sum go.mod vendor
go mod init
GOPROXY=direct GOPRIVATE=github.com go mod tidy
go mod vendor
go build ./...
```

### Phase 4: End-to-End Verification

Test all three fixes:

1. **Fix B (Namespace CASCADE)**:
   - Create a namespace with a deployment: `kubectl create ns test-cascade && kubectl -n test-cascade create deployment nginx --image=nginx`
   - Wait for pods to appear in inventory cache
   - Delete the namespace: `kubectl delete ns test-cascade`
   - Verify log: `[CASCADE-NS] namespace=test-cascade found=N cached objects to delete`
   - Query inventory cache — pods, RS, deployment, services in `test-cascade` should all be gone

2. **Fix C (Deployment CASCADE)**:
   - Create a deployment: `kubectl -n default create deployment test-deploy --image=nginx --replicas=2`
   - Wait for pods to appear in inventory cache
   - Delete just the deployment: `kubectl -n default delete deployment test-deploy`
   - Verify log: `[CASCADE-DEPLOY] deployment=default/test-deploy found=1 owned ReplicaSets`
   - Verify log: `[CASCADE-DEPLOY]   rs=default/test-deploy-xxxx found=2 owned Pods`
   - Query inventory cache — pods and RS owned by the deployment should be gone

3. **Fix A (Stale Reaper)**:
   - With all fixes active, manually create a stale cache entry (or kill the collector briefly while deleting a pod, then restart)
   - Wait up to 60 seconds
   - Verify log: `[REAPER] stale entry: gvr=v1/pods ns=... name=... — removing`
   - Query inventory cache — stale entry should be gone

4. **No regressions**:
   - Create new deployments — verify pods appear in cache normally
   - Update deployments (scale up/down) — verify cache reflects changes
   - Normal pod restarts — verify cache stays consistent

---

## Traceability Matrix

| # | Gap / Edge Case | Fix | Phase |
|---|----------------|-----|-------|
| 1 | Namespace deletion breaks informer watch streams — child DELETE events lost | B: Namespace CASCADE | Phase 1 |
| 2 | Webhook FailurePolicy:Ignore — API server skips webhook during namespace termination | B: Namespace CASCADE | Phase 1 |
| 3 | No owner-aware cascade — Deployment delete doesn't remove owned RS/Pods | C: Deployment CASCADE | Phase 1 |
| 4 | Collector restart during deletes — events missed entirely | A: Stale Reaper | Phase 2 |
| 5 | Any unknown edge case causing stale entries | A: Stale Reaper (safety net) | Phase 2 |
| 6 | Probler vendor stale after upstream changes | Re-vendor | Phase 3 |
| 7 | All three fixes verified end-to-end | E2E testing | Phase 4 |

---

## Data Flow (with cascades)

```
K8s API Server
     │
     │ DELETE namespace "rubi-parser"
     ▼
ClientGoCollector (informer/webhook)
     │
     ├─ 1. cache.Delete("v1/namespaces", "", "rubi-parser")
     ├─ 2. onDelete("v1/namespaces", "", "rubi-parser") → pipeline
     │
     ├─ 3. [Fix B] cascadeNamespaceDelete("rubi-parser")
     │      │
     │      ├─ cache.List("", "rubi-parser", "") → all objects in namespace
     │      │
     │      ├─ For each object:
     │      │   ├─ cache.Delete(gvr, ns, name)
     │      │   └─ onDelete(gvr, ns, name) → pipeline
     │      │
     │      └─ Result: all pods, RS, deployments, services, etc. in
     │         "rubi-parser" removed from cache and forwarded to pipeline
     │
     └─ (Fix C would also fire if a specific deployment DELETE was received)

                                    ┌─────────────────────────────────┐
                                    │ Fix A: Reaper (every 60s)       │
                                    │                                 │
                                    │ For each cached object:         │
                                    │   GET from live cluster         │
                                    │   If 404 → delete + pipeline    │
                                    │                                 │
                                    │ Catches anything B+C missed     │
                                    └─────────────────────────────────┘
```

## Notes

- **Thread safety**: `cascadeNamespaceDelete` and `cascadeDeploymentDelete` call `shared.cache.List()` then `shared.cache.Delete()` in separate lock acquisitions. This is safe because `Delete` on a non-existent key is a no-op, and `onDelete` downstream is idempotent (parser creates a minimal proto and forwards DELETE; inventory cache's `Delete` returns "not found" harmlessly).

- **Ordering**: In Fix C, pods are deleted before their owning ReplicaSet. This is intentional — if the RS is deleted first, a subsequent cascade from RS wouldn't find the pods (they've already been removed from cache by the deployment cascade). The current approach deletes children first, then parent.

- **UID extraction**: The UID is read from the cache entry BEFORE it's deleted. This is important for Fix C's `isOwnedBy` check — the deployment's UID must be available to match against RS ownerReferences. If the entry is deleted first, the UID is lost.

- **Idempotency**: If Fix B cascade fires AND the individual pod DELETE events also arrive (race window), the duplicate deletes are harmless — `cache.Delete` on a missing key is a no-op, and the downstream pipeline handles "not found" gracefully.
