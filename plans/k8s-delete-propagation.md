# K8s Resource Delete Propagation

## Problem
When K8s workloads (pods, deployments, etc.) are deleted from a cluster, the collector's informer/admission webhook detects the deletion and removes the item from the local `CollectorCache`, but never propagates the deletion downstream. The parser and inventory cache retain stale entries indefinitely.

## Solution
Propagate DELETE events through the existing pipeline: **Collector → Parser → Inventory Cache**.

When a DELETE is detected (informer `DeleteFunc` or admission webhook `DELETE` operation):
1. Collector creates a `CJob` with the resource keys encoded in `CJob.Result` (as a serialized `CMap`)
2. Collector sends the CJob to the parser via `vnic.Proximity` with `ifs.DELETE` action
3. Parser's `Delete()` method decodes the keys, constructs a minimal proto with primary key fields set
4. Parser forwards to the inventory cache via `agg.AddElement` with `ifs.DELETE` action
5. Inventory cache's existing `Delete()` removes the entry from the distributed cache

## Project Locations

Per the `never-edit-vendor.md` rule, all changes are made in the **actual sibling projects**, NOT in `probler/go/vendor/`:

| Component | Source Project | Path (relative to probler) |
|-----------|---------------|----------------------------|
| l8collector | `../l8collector` | `../l8collector/go/collector/` |
| l8parser | `../l8parser` | `../l8parser/go/parser/` |
| l8inventory | (no changes) | — |
| probler | this project | re-vendor after upstream commits |

After all upstream changes are committed, probler re-vendors:
```bash
cd go
rm -rf go.sum go.mod vendor
go mod init
GOPROXY=direct GOPRIVATE=github.com go mod tidy
go mod vendor
```

---

## Phase 1: l8collector — Delete Callback & GVR Map

All changes in `../l8collector/go/collector/`.

**Problem:** The `ClientGoCollector` struct only has `c.resources` (IResources) — no access to the `CollectorService.vnic` or `CollectorService.agg` needed for forwarding.

**Solution:** Add a package-level delete callback to `sharedRuntimeState` that the `CollectorService` registers at activation time. The informer/admission code calls this callback instead of needing direct vnic access.

### 1.1 File: `protocols/k8sclient/SharedRuntime.go`
Add to `sharedRuntimeState`:
```go
type sharedRuntimeState struct {
    // ... existing fields ...
    onDelete func(gvrText, namespace, name string) // callback registered by CollectorService
}
```

Add a registration function:
```go
func RegisterDeleteCallback(fn func(gvrText, namespace, name string)) {
    shared.mu.Lock()
    defer shared.mu.Unlock()
    shared.onDelete = fn
}
```

### 1.2 File: `protocols/k8sclient/GvrLinksMap.go` (NEW)
A GVR-to-LinksId lookup map, built from the same data as `parser/boot/k8s/` poll definitions:
```go
package k8sclient

// gvrToLinksId maps GVR strings (as used by informers) to LinksId values
// (as defined in probler/prob/common/Links_k8s.go).
var gvrToLinksId = map[string]string{
    "v1/pods":                          "K8sPod",
    "apps/v1/deployments":              "K8sDeploy",
    "apps/v1/statefulsets":             "K8sSts",
    "apps/v1/daemonsets":               "K8sDs",
    "apps/v1/replicasets":              "K8sRs",
    "batch/v1/jobs":                    "K8sJob",
    "batch/v1/cronjobs":                "K8sCj",
    "v1/services":                      "K8sSvc",
    "v1/configmaps":                    "K8sCm",
    "v1/secrets":                       "K8sSec",
    "v1/namespaces":                    "K8sNs",
    "v1/nodes":                         "K8sNode",
    "v1/persistentvolumes":             "K8sPv",
    "v1/persistentvolumeclaims":        "K8sPvc",
    "v1/endpoints":                     "K8sEp",
    "v1/events":                        "K8sEvt",
    "v1/serviceaccounts":               "K8sSa",
    "v1/limitranges":                   "K8sLr",
    "v1/resourcequotas":                "K8sRq",
    "networking.k8s.io/v1/ingresses":                       "K8sIng",
    "networking.k8s.io/v1/ingressclasses":                  "K8sIngCl",
    "networking.k8s.io/v1/networkpolicies":                 "K8sNetPol",
    "policy/v1/poddisruptionbudgets":                       "K8sPdb",
    "storage.k8s.io/v1/storageclasses":                     "K8sScl",
    "autoscaling/v2/horizontalpodautoscalers":              "K8sHpa",
    "discovery.k8s.io/v1/endpointslices":                   "K8sEpSl",
    "rbac.authorization.k8s.io/v1/roles":                   "K8sRole",
    "rbac.authorization.k8s.io/v1/rolebindings":            "K8sRb",
    "rbac.authorization.k8s.io/v1/clusterroles":            "K8sCr",
    "rbac.authorization.k8s.io/v1/clusterrolebindings":     "K8sCrb",
    "apiextensions.k8s.io/v1/customresourcedefinitions":    "K8sCrd",
    "management.loft.sh/v1/virtualclusterinstances":        "K8sVCl",
    "networking.istio.io/v1alpha3/envoyfilters":            "IstioEf",
    "networking.istio.io/v1beta1/virtualservices":          "IstioVs",
    "networking.istio.io/v1beta1/destinationrules":         "IstioDr",
    "networking.istio.io/v1beta1/gateways":                 "IstioGw",
    "networking.istio.io/v1beta1/serviceentries":           "IstioSe",
    "networking.istio.io/v1beta1/sidecars":                 "IstioSc",
    "security.istio.io/v1beta1/authorizationpolicies":      "IstioAp",
    "security.istio.io/v1beta1/peerauthentications":        "IstioPa",
}

func GVRToLinksId(gvrText string) string {
    return gvrToLinksId[gvrText]
}
```

### 1.3 File: `protocols/k8sclient/ClientGoCollector.go`
In `DeleteFunc` (line 275-281) and `handleAdmissionEvent` DELETE case (line 208-210), after `shared.cache.Delete(...)`, call the callback:

```go
// In DeleteFunc:
DeleteFunc: func(obj interface{}) {
    item, ok := extractDeletedObject(obj)
    if !ok { return }
    shared.cache.Delete(gvrText, item.GetNamespace(), item.GetName())
    if shared.onDelete != nil {
        shared.onDelete(gvrText, item.GetNamespace(), item.GetName())
    }
},

// In handleAdmissionEvent:
if event.Operation == "DELETE" {
    shared.cache.Delete(gvrText, event.Namespace, event.Name)
    if shared.onDelete != nil {
        shared.onDelete(gvrText, event.Namespace, event.Name)
    }
    return nil
}
```

### 1.4 File: `service/CollectorService.go`
At activation time (in `Activate()` after `agg` is created), register the callback:
```go
k8sclient.RegisterDeleteCallback(func(gvrText, namespace, name string) {
    this.handleK8sDelete(gvrText, namespace, name)
})
```

Add a new method `handleK8sDelete`:
```go
func (this *CollectorService) handleK8sDelete(gvrText, namespace, name string) {
    linksId := k8sclient.GVRToLinksId(gvrText)
    if linksId == "" {
        return
    }

    // Encode namespace+name into CMap, serialize to CJob.Result
    cmap := &l8tpollaris.CMap{Data: map[string][]byte{
        "namespace": []byte(namespace),
        "name":      []byte(name),
    }}
    result, err := proto.Marshal(cmap)
    if err != nil {
        this.vnic.Resources().Logger().Error("handleK8sDelete marshal:", err.Error())
        return
    }

    job := &l8tpollaris.CJob{
        LinksId: linksId,
        HostId:  this.hostId(),  // ClusterName
        Result:  result,
    }

    pService, pArea := targets.Links.Parser(linksId)
    this.agg.AddElement(job, ifs.Proximity, "", pService, pArea, ifs.DELETE)
}
```

---

## Phase 2: l8parser — Implement Delete Forwarding

All changes in `../l8parser/go/parser/`.

### 2.1 File: `service/ParsingService.go`

Replace the empty `Delete()` with:
```go
func (this *ParsingService) Delete(pb ifs.IElements, vnic ifs.IVNic) ifs.IElements {
    for _, elem := range pb.Elements() {
        job, ok := elem.(*l8tpollaris.CJob)
        if !ok {
            continue
        }
        this.parsingCenter.HandleDelete(job)
    }
    return nil
}
```

### 2.2 File: `service/ParsingCenter.go`

Add a new method `HandleDelete`:
```go
func (this *ParsingCenter) HandleDelete(job *l8tpollaris.CJob) {
    // Decode CMap from job.Result
    cmap := &l8tpollaris.CMap{}
    if err := proto.Unmarshal(job.Result, cmap); err != nil {
        resources := this.vnic.Resources()
        resources.Logger().Error("ParsingCenter.HandleDelete unmarshal:", err.Error())
        return
    }

    namespace := string(cmap.Data["namespace"])
    name := string(cmap.Data["name"])

    // Build composite key (same format used during parsing: "namespace/name")
    key := name
    if namespace != "" {
        key = namespace + "/" + name
    }

    // Construct a minimal proto with only primary key fields set.
    // Inventory cache uses (ClusterName, Key) as composite primary key.
    resources := this.vnic.Resources()
    registry := resources.Registry()

    cacheServiceName, cacheServiceArea := targets.Links.Cache(job.LinksId)

    // Create proto instance and set primary key fields
    node := registry.NodeByServiceName(cacheServiceName, int32(cacheServiceArea))
    if node == nil {
        resources.Logger().Error("HandleDelete: no node for ", cacheServiceName, "/", cacheServiceArea)
        return
    }

    inst := node.NewInstance()
    // Set ClusterName = job.HostId, Key = composite key
    object.SetField(inst, "ClusterName", job.HostId)
    object.SetField(inst, "Key", key)

    fmt.Printf("[PARSER-FWD-DELETE] linksId=%s cluster=%s key=%s -> cache=(%s,%d)\n",
        job.LinksId, job.HostId, key, cacheServiceName, cacheServiceArea)

    this.agg.AddElement(inst, ifs.Leader, "", cacheServiceName, cacheServiceArea, ifs.DELETE)
}
```

---

## Phase 3: probler — Re-vendor & Build

1. Commit changes in `../l8collector` and `../l8parser`
2. Re-vendor in probler:
   ```bash
   cd go
   rm -rf go.sum go.mod vendor
   go mod init
   GOPROXY=direct GOPRIVATE=github.com go mod tidy
   go mod vendor
   ```
3. Build: `cd go && go build ./...`

---

## Phase 4: End-to-End Verification

For the complete delete propagation pipeline:

1. Start the system with a K8s cluster connected (`./run-demo.sh` or K8s deployment)
2. Verify pods appear in inventory cache (query K8sPod service, confirm entries exist)
3. Delete a pod: `kubectl delete pod <name> -n <ns>`
4. Observe log lines in collector output: callback invoked, CJob created
5. Observe log line in parser output: `[PARSER-FWD-DELETE] linksId=K8sPod cluster=<name> key=<ns>/<pod>`
6. Query the inventory cache for the deleted pod — confirm it no longer appears
7. Query the ORM/DB — confirm the row is deleted
8. Repeat with a different resource type (e.g., Deployment, ConfigMap) to verify the GVR map works across types
9. Test admission webhook path: if admission controller is configured, trigger a DELETE via webhook and verify same propagation
10. Verify no regressions: existing create/update flows still work (pods created after the change appear in cache normally)

---

## l8inventory — No Changes Needed

The `InventoryService.Delete()` and `InventoryCenter.Delete()` already work correctly:
- `Delete()` removes from the distributed cache by primary key
- It also forwards to the persist layer (ORM) via `agg.AddElement(..., ifs.DELETE)` if aggregation is enabled

---

## Data Flow

```
K8s API Server
     |
     | (watch event: DELETED)
     v
ClientGoCollector (informer DeleteFunc / admission webhook)
     |
     | 1. shared.cache.Delete(gvr, ns, name)  -- remove from local cache
     | 2. shared.onDelete(gvr, ns, name)       -- trigger callback
     v
CollectorService.handleK8sDelete(gvr, ns, name)
     |
     | 3. Resolve gvr -> linksId
     | 4. Encode {namespace, name} into CMap -> CJob.Result
     | 5. agg.AddElement(job, Proximity, parser, DELETE)
     v
ParsingService.Delete(elements)
     |
     | 6. Decode CJob from elements
     | 7. Decode CMap from CJob.Result
     | 8. Build composite key: "namespace/name"
     | 9. Instantiate proto, set ClusterName + Key
     | 10. agg.AddElement(proto, Leader, cache, DELETE)
     v
InventoryService.Delete(elements)
     |
     | 11. InventoryCenter.Delete() -- remove from distributed cache
     | 12. Forward to persist (ORM) with DELETE
     v
Database (row deleted)
```

## Key Composite Format

The inventory cache uses composite primary keys `(ClusterName, Key)` as registered in `inv_k8s/main.go`:
```go
inventory.Activate(common2.K8sPod_Links_ID, &types2.K8SPod{}, &types2.K8SPodList{}, nic, "ClusterName", "Key")
```

The `Key` field is built during parsing as `namespace/name` (or just `name` for cluster-scoped resources like Nodes and Namespaces). The delete path must construct the same format.

---

## Traceability Matrix

| # | Gap | Description | Phase |
|---|-----|-------------|-------|
| 1 | No delete forwarding from collector | Informer/admission `Delete` only removes from local cache, never sends downstream | Phase 1 (1.3) |
| 2 | No GVR→LinksId mapping in collector | Collector has no way to resolve which LinksId a GVR corresponds to | Phase 1 (1.2) |
| 3 | No vnic/agg access in ClientGoCollector | Protocol collector cannot send messages — only CollectorService can | Phase 1 (1.1, 1.4) |
| 4 | Parser Delete() is empty | ParsingService.Delete returns nil, never processes delete CJobs | Phase 2 (2.1) |
| 5 | Parser has no delete-to-cache logic | ParsingCenter only does PATCH to cache, no DELETE path exists | Phase 2 (2.2) |
| 6 | Probler vendor is stale after upstream changes | Vendored copies won't reflect upstream commits until re-vendored | Phase 3 |
| 7 | No end-to-end verification of delete flow | Must confirm full pipeline works with real K8s cluster | Phase 4 |
