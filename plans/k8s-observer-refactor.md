# Professional Kubernetes Cluster Observer — Refactor Plan

## Executive Summary

Refactor Probler's Kubernetes section from a basic 8-resource viewer into a comprehensive, professional-grade K8s cluster observer covering the full Kubernetes resource taxonomy, plus vCluster, Istio service mesh, and extended ecosystem resources.

---

## Current State Analysis

### What Exists Today

**Proto layer (`k8s.proto`):**
- `K8sCluster` — top-level entity, keyed by `name`
- 8 resource types as `map<string, T>` fields: Nodes, Pods, Deployments, StatefulSets, DaemonSets, Services, Namespaces, NetworkPolicies
- All fields are flat strings (parsed from `kubectl` table output), no structured spec/status split
- A second proto (`kubernetes.proto`) has 1260 lines of detailed K8s resource definitions (Pod, Deployment, Node, etc. with full spec/status) but these are **not used** by the current UI or inventory service

**Collection (l8collector):**
- Two collection paths:
  1. `L8PKubectl` — external `kubectl get X -o wide` table parsing
  2. `L8PKubernetesAPI` — in-cluster client-go with admission webhook + dynamic informers
- The client-go collector (`k8sclient/`) uses GVR-based dynamic informers, supports any GVR string, and has an admission controller webhook for real-time change capture
- Current GVRs watched: `v1/pods`, `v1/nodes`, `v1/services`, `v1/namespaces`, `apps/v1/deployments`, `apps/v1/statefulsets`, `apps/v1/daemonsets`, `networking.k8s.io/v1/networkpolicies`

**Parser (l8parser `boot/K8s.go`):**
- 8 table polls + 8 detail (on-demand `-o json`) polls + 1 logs poll
- Client-go equivalent table polls for the same 8 resources
- Parser rules map collected table data into the `K8sCluster` map fields

**Inventory service (`inv_k8s`):**
- Single service, registers `K8sCluster` as the primary entity
- Custom serializers for `K8sReadyState` and `K8sRestartsState`

**UI (12 JS files, ~2200 lines):**
- Custom standalone section (not using l8ui module pattern)
- Cluster dropdown + 8 resource tabs with count badges
- Detail modals for each resource type (node, pod, deployment, statefulset, daemonset, service, namespace)
- Custom CSS (`kubernetes.css`, 427 lines)
- No mobile parity

### What's Missing

| Category | Missing Resources |
|----------|------------------|
| **Core** | ConfigMaps, Secrets, ServiceAccounts, Endpoints, Events, ResourceQuotas, LimitRanges, PodDisruptionBudgets |
| **Workloads** | ReplicaSets, Jobs, CronJobs, HorizontalPodAutoscalers |
| **Storage** | PersistentVolumes, PersistentVolumeClaims, StorageClasses |
| **RBAC** | Roles, ClusterRoles, RoleBindings, ClusterRoleBindings |
| **Networking** | Ingresses, IngressClasses, EndpointSlices |
| **CRD/Extension** | CustomResourceDefinitions, API Services |
| **vCluster** | Virtual clusters, their resource isolation and mapping |
| **Istio** | VirtualServices, DestinationRules, Gateways, ServiceEntries, PeerAuthentication, AuthorizationPolicy, Sidecars, EnvoyFilters, Telemetry |
| **Cluster-level** | Cluster health summary, resource utilization rollup, event timeline |

---

## Design Decisions

### D1: Multiple Prime Objects — One Per Resource Type, Grouped by UI Category

Break the monolithic `K8sCluster` (single root with 40+ map fields) into individual prime objects — one per K8s resource type. Each resource type has its own proto message, its own inventory service, its own service area (shared within a UI category), and a **composite primary key of `(ClusterName, Key)`** where Key is typically `namespace/name`.

**Why not a single root?** A single K8sCluster with 40 map fields returns the ENTIRE cluster state in one query. For a cluster with 10K pods and thousands of ConfigMaps/Secrets, that's unacceptable. Individual prime objects enable server-side pagination per resource type: `select * from K8SPod where clusterName=mycluster limit 50 page 0`.

**Grouping by UI category:** Resource types sharing a UI category tab share a service area. This keeps the service routing clean and aligns the backend with the UI's natural structure.

| UI Category | Service Area | Resource Types (Prime Objects) |
|-------------|-------------|-------------------------------|
| **Cluster** | 1 | K8SCluster (summary only, PK: Name) |
| **Workloads** | 10 | K8SPod, K8SDeployment, K8SStatefulSet, K8SDaemonSet, K8SReplicaSet, K8SJob, K8SCronJob, K8SHPA |
| **Networking** | 11 | K8SService, K8SIngress, K8SNetworkPolicy, K8SEndpoints, K8SEndpointSlice, K8SIngressClass |
| **Storage** | 12 | K8SPersistentVolume, K8SPersistentVolumeClaim, K8SStorageClass |
| **Configuration** | 13 | K8SConfigMap, K8SSecret, K8SResourceQuota, K8SLimitRange, K8SPodDisruptionBudget |
| **Access Control** | 14 | K8SServiceAccount, K8SRole, K8SClusterRole, K8SRoleBinding, K8SClusterRoleBinding |
| **Nodes** | 15 | K8SNode (PK: ClusterName, Name) |
| **Namespaces** | 16 | K8SNamespace (PK: ClusterName, Name) |
| **vCluster** | 17 | K8SVCluster |
| **Istio** | 18 | IstioVirtualService, IstioDestinationRule, IstioGateway, IstioServiceEntry, IstioPeerAuthentication, IstioAuthorizationPolicy, IstioSidecar, IstioEnvoyFilter |
| **CRDs** | 19 | K8SCRD (PK: ClusterName, Name) |
| **Events** | 20 | K8SEvent |

**42 prime objects total.** Each gets its own `inventory.Activate()` call in the same `inv_k8s` process. The `inventory.Activate()` variadic `primaryKeys` parameter supports the composite PK:
```go
inventory.Activate(common.K8sPod_Links_ID, &types2.K8SPod{}, &types2.K8SPodList{}, nic, "ClusterName", "Key")
```

**Full prime object table:**

| Proto Type | ServiceName | LinksID | PK Fields | SA |
|-----------|-------------|---------|-----------|-----|
| K8SCluster | KCluster | K8sClust | Name | 1 |
| K8SPod | K8sPod | K8sPod | ClusterName, Key | 10 |
| K8SDeployment | K8sDeploy | K8sDeploy | ClusterName, Key | 10 |
| K8SStatefulSet | K8sSts | K8sSts | ClusterName, Key | 10 |
| K8SDaemonSet | K8sDs | K8sDs | ClusterName, Key | 10 |
| K8SReplicaSet | K8sRs | K8sRs | ClusterName, Key | 10 |
| K8SJob | K8sJob | K8sJob | ClusterName, Key | 10 |
| K8SCronJob | K8sCj | K8sCj | ClusterName, Key | 10 |
| K8SHPA | K8sHpa | K8sHpa | ClusterName, Key | 10 |
| K8SService | K8sSvc | K8sSvc | ClusterName, Key | 11 |
| K8SIngress | K8sIng | K8sIng | ClusterName, Key | 11 |
| K8SNetworkPolicy | K8sNetPol | K8sNetPol | ClusterName, Key | 11 |
| K8SEndpoints | K8sEp | K8sEp | ClusterName, Key | 11 |
| K8SEndpointSlice | K8sEpSl | K8sEpSl | ClusterName, Key | 11 |
| K8SIngressClass | K8sIngCl | K8sIngCl | ClusterName, Key | 11 |
| K8SPersistentVolume | K8sPv | K8sPv | ClusterName, Key | 12 |
| K8SPersistentVolumeClaim | K8sPvc | K8sPvc | ClusterName, Key | 12 |
| K8SStorageClass | K8sScl | K8sScl | ClusterName, Key | 12 |
| K8SConfigMap | K8sCm | K8sCm | ClusterName, Key | 13 |
| K8SSecret | K8sSec | K8sSec | ClusterName, Key | 13 |
| K8SResourceQuota | K8sRq | K8sRq | ClusterName, Key | 13 |
| K8SLimitRange | K8sLr | K8sLr | ClusterName, Key | 13 |
| K8SPodDisruptionBudget | K8sPdb | K8sPdb | ClusterName, Key | 13 |
| K8SServiceAccount | K8sSa | K8sSa | ClusterName, Key | 14 |
| K8SRole | K8sRole | K8sRole | ClusterName, Key | 14 |
| K8SClusterRole | K8sCr | K8sCr | ClusterName, Key | 14 |
| K8SRoleBinding | K8sRb | K8sRb | ClusterName, Key | 14 |
| K8SClusterRoleBinding | K8sCrb | K8sCrb | ClusterName, Key | 14 |
| K8SNode | K8sNode | K8sNode | ClusterName, Name | 15 |
| K8SNamespace | K8sNs | K8sNs | ClusterName, Name | 16 |
| K8SVCluster | K8sVCl | K8sVCl | ClusterName, Key | 17 |
| IstioVirtualService | IstioVs | IstioVs | ClusterName, Key | 18 |
| IstioDestinationRule | IstioDr | IstioDr | ClusterName, Key | 18 |
| IstioGateway | IstioGw | IstioGw | ClusterName, Key | 18 |
| IstioServiceEntry | IstioSe | IstioSe | ClusterName, Key | 18 |
| IstioPeerAuthentication | IstioPa | IstioPa | ClusterName, Key | 18 |
| IstioAuthorizationPolicy | IstioAp | IstioAp | ClusterName, Key | 18 |
| IstioSidecar | IstioSc | IstioSc | ClusterName, Key | 18 |
| IstioEnvoyFilter | IstioEf | IstioEf | ClusterName, Key | 18 |
| K8SCRD | K8sCrd | K8sCrd | ClusterName, Name | 19 |
| K8SEvent | K8sEvt | K8sEvt | ClusterName, Key | 20 |

### D2: Each Resource Type Gets `cluster_name` + `key` Composite PK Fields

Every existing flat resource type (K8SPod, K8SDeployment, etc.) gains two new fields:
- `cluster_name` (field 100) — which cluster this resource belongs to
- `key` (field 101) — composite identifier within the cluster, typically `namespace/name`

For cluster-scoped resources (Nodes, Namespaces, CRDs), the PK is `(ClusterName, Name)` since they don't have namespaces.

K8SCluster itself becomes a lightweight summary-only model — all map fields are removed. Resource data lives in the per-type prime objects.

### D3: UI Categories Align with Service Area Groupings

The UI tab structure directly mirrors the service area groupings from D1. Each UI category tab corresponds to one service area. Sub-tabs within each category correspond to individual resource types (prime objects), each querying its own service endpoint with server-side pagination:

| Category Tab | Service Area | Sub-tabs (each queries its own service) |
|-------------|-------------|---------------------------------------|
| **Overview** | 1 | Cluster health dashboard (from K8SCluster summary) |
| **Workloads** | 10 | Pods, Deployments, StatefulSets, DaemonSets, ReplicaSets, Jobs, CronJobs, HPAs |
| **Networking** | 11 | Services, Ingresses, NetworkPolicies, Endpoints, EndpointSlices, IngressClasses |
| **Storage** | 12 | PersistentVolumes, PVCs, StorageClasses |
| **Configuration** | 13 | ConfigMaps, Secrets, ResourceQuotas, LimitRanges, PDBs |
| **Access Control** | 14 | ServiceAccounts, Roles, ClusterRoles, RoleBindings, ClusterRoleBindings |
| **Nodes** | 15 | Node list |
| **Namespaces** | 16 | Namespace list |
| **vCluster** | 17 | vCluster list |
| **Istio** | 18 | VirtualServices, DestinationRules, Gateways, ServiceEntries, PeerAuth, AuthzPolicy, Sidecars, EnvoyFilters |
| **CRDs** | 19 | CRD list |
| **Events** | 20 | Event stream |

Each sub-tab's L8Query targets its own prime object with a `clusterName` filter:
```
select * from K8SPod where clusterName=mycluster limit 50 page 0
select * from K8SDeployment where clusterName=mycluster limit 50 page 0
```

### D4: Leverage the Existing Client-Go Collector Architecture

The `k8sclient` collector already supports arbitrary GVRs via `ParseGVR()` and dynamic informers. Adding new resources to collection requires only:
1. New boot poll definitions in `l8parser/boot/K8s.go`
2. New parser attribute mappings to the new `K8sCluster` fields
3. No changes to the collector itself

For Istio CRDs, we simply add GVRs like `networking.istio.io/v1beta1/virtualservices`. The collector's dynamic informer handles any GVR.

For vCluster, we collect from the host cluster's vCluster CRDs (`infrastructure.cluster.x-k8s.io` or `vcluster.loft.sh`) and from within each virtual cluster via separate targets.

### D5: UI Follows l8ui Module Pattern

Migrate from the custom standalone section to the standard l8ui module pattern with `Layer8DModuleFactory.create()`. This gives us:
- Standard tab/sub-nav navigation
- Consistent table rendering with column factory
- Detail popups via `Layer8DPopup`
- Mobile parity via the standard mobile flow

---

## Phase Breakdown

### Phase 0: Proto Redesign

Redesign `k8s.proto` to hold the full resource taxonomy. Fix existing proto rule violations. Split oversized proto files.

**Step 0a: Fix existing proto rule violations**
- Fix `K8sPodStatus` enum zero value: rename `Invalid_Pod_Status = 0` → `K8S_POD_STATUS_UNSPECIFIED = 0` (per proto-enum-zero-value rule)
- Fix `K8sNodeStatus` enum zero value: rename `Invalid_Node_Status = 0` → `K8S_NODE_STATUS_UNSPECIFIED = 0`
- Fix `K8sClusterList`: add missing `l8api.L8MetaData metadata = 2` field (per proto-list-convention rule)

**Step 0b: Split `kubernetes.proto` (1260 lines, violates 500-line maintainability limit)**
Split into 3 files, each under 500 lines:
- `proto/kubernetes-workloads.proto` — Pod, Deployment, ReplicaSet, StatefulSet, DaemonSet, Job, CronJob, HPA (~400 lines)
- `proto/kubernetes-infra.proto` — Node, Service, Ingress, NetworkPolicy, Endpoints, EndpointSlice, PV, PVC, StorageClass (~400 lines)
- `proto/kubernetes-config-rbac.proto` — ConfigMap, Secret, ServiceAccount, Role, ClusterRole, RoleBinding, ClusterRoleBinding, ResourceQuota, LimitRange, PDB, CRD, Event (~400 lines)
- Delete `proto/kubernetes.proto` after splitting

**Step 0c: Redesign protos — individual prime objects with composite PKs**

**Architectural change:** Remove all map fields from K8SCluster. Each resource type becomes its own standalone prime object with `cluster_name` and `key` fields for composite PK. K8SCluster becomes summary-only.

**Files to modify:**
- `proto/k8s.proto` — Strip K8SCluster to summary-only, add `cluster_name`/`key` fields to existing types, add new resource types, add K8SClusterSummary
- `proto/kubernetes-workloads.proto` — Split from kubernetes.proto + add missing types (Jobs, CronJobs, HPA, ReplicaSets) with composite PK fields
- `proto/kubernetes-infra.proto` — Split from kubernetes.proto + add missing types (IngressClass, EndpointSlice, Endpoints) with composite PK fields
- `proto/kubernetes-config-rbac.proto` — New types (ConfigMap, Secret, ServiceAccount, ResourceQuota, LimitRange, PDB, CRD, Event, RBAC types) with composite PK fields
- New `proto/istio.proto` — Istio CRD types with composite PK fields
- New `proto/vcluster.proto` — vCluster types with composite PK fields
- `proto/make-bindings.sh` — Add all new/split proto files, remove `kubernetes.proto`

**All new enums MUST follow the zero-value convention:**
```protobuf
enum K8sPvPhase {
  K8S_PV_PHASE_UNSPECIFIED = 0;
  K8S_PV_PHASE_AVAILABLE = 1;
  K8S_PV_PHASE_BOUND = 2;
  K8S_PV_PHASE_RELEASED = 3;
  K8S_PV_PHASE_FAILED = 4;
}
// Same pattern for all new enums: *_UNSPECIFIED = 0
```

**All new List types MUST include metadata:**
```protobuf
message K8SPodList {
  repeated K8SPod list = 1;
  l8api.L8MetaData metadata = 2;
}
// Same for all 42 prime object List types
```

**New `K8SCluster` — summary only (no map fields):**
```protobuf
message K8SCluster {
  string name = 1;
  K8SClusterSummary summary = 2;
  string k8s_version = 3;
  string platform = 4;
}

message K8SClusterSummary {
  int32 total_nodes = 1;
  int32 ready_nodes = 2;
  int32 total_pods = 3;
  int32 running_pods = 4;
  int32 failed_pods = 5;
  int32 pending_pods = 6;
  int32 total_deployments = 7;
  int32 available_deployments = 8;
  int32 total_services = 9;
  int32 total_namespaces = 10;
  int32 total_pvcs = 11;
  int32 bound_pvcs = 12;
  int32 total_ingresses = 13;
  int32 total_jobs = 14;
  int32 active_jobs = 15;
  bool istio_installed = 16;
  string istio_version = 17;
  int32 total_vclusters = 18;
  int32 total_crds = 19;
}
```

**Existing resource types — add composite PK fields:**

Each existing type (K8SPod, K8SDeployment, etc.) gains two fields at high field numbers to avoid wire-compat issues:
```protobuf
message K8SPod {
  string namespace = 1;
  string name = 2;
  K8SReadyState ready = 3;
  K8SPodStatus status = 4;
  K8SRestartsState restarts = 5;
  string age = 6;
  string ip = 7;
  string node = 8;
  string nominated_node = 9;
  string readiness_gates = 10;
  // Composite PK fields (new)
  string cluster_name = 100;
  string key = 101;  // "namespace/name"
}
// Same pattern: add cluster_name=100, key=101 to K8SDeployment, K8SStatefulSet, etc.
// For cluster-scoped resources (K8SNode, K8SNamespace, K8SCRD): PK is (cluster_name, name)
```

**New resource types follow the same flat-string + composite PK pattern:**
```protobuf
message K8SJob {
  string namespace = 1;
  string name = 2;
  string completions = 3;
  string duration = 4;
  string age = 5;
  K8SJobStatus status = 6;
  string cluster_name = 100;
  string key = 101;
}

message K8SCronJob {
  string namespace = 1;
  string name = 2;
  string schedule = 3;
  string last_schedule = 4;
  bool suspend = 5;
  int32 active = 6;
  string age = 7;
  string cluster_name = 100;
  string key = 101;
}

message K8SHPA {
  string namespace = 1;
  string name = 2;
  string reference = 3;
  string targets = 4;
  int32 min_replicas = 5;
  int32 max_replicas = 6;
  int32 current_replicas = 7;
  string age = 8;
  string cluster_name = 100;
  string key = 101;
}

message K8SConfigMap {
  string namespace = 1;
  string name = 2;
  int32 data_count = 3;
  string age = 4;
  string cluster_name = 100;
  string key = 101;
}

message K8SSecret {
  string namespace = 1;
  string name = 2;
  string type = 3;
  int32 data_count = 4;
  string age = 5;
  string cluster_name = 100;
  string key = 101;
}

// ... same pattern for all 30+ new types. Each has:
// - Resource-specific display fields (namespace, name, type-specific columns)
// - cluster_name = 100 (PK part 1)
// - key = 101 (PK part 2, typically "namespace/name")
```

**New Istio types (`istio.proto`) — with composite PK:**
```protobuf
message IstioVirtualService {
  string namespace = 1;
  string name = 2;
  repeated string gateways = 3;
  repeated string hosts = 4;
  string age = 5;
  string cluster_name = 100;
  string key = 101;
}
// Same pattern for all 8 Istio types
```

**New vCluster types (`vcluster.proto`) — with composite PK:**
```protobuf
message K8SVCluster {
  string namespace = 1;
  string name = 2;
  string status = 3;
  string k8s_version = 4;
  string distro = 5;
  string connected = 6;
  int32 synced_pods = 7;
  int32 synced_services = 8;
  int32 synced_ingresses = 9;
  string age = 10;
  string cluster_name = 100;
  string key = 101;
}
```

### Phase 1: Collection — New Boot Polls in l8parser

Add new poll definitions for all new resource types. This is the parser-side configuration that tells the collector what GVRs to watch.

**Step 1a: Extract duplicated poll pattern (per plan-duplication-audit rule)**

The existing code has 27 poll functions that are near-identical, differing only in configuration values. Adding 24+ more would create 400+ lines of copy-paste. Extract a shared data-driven function first, then refactor existing polls to use it, then add new ones as config-only structs.

Current pattern (13 lines per resource, duplicated 8× today):
```go
func createClientDeploymentsPoll(p *l8tpollaris.L8Pollaris) {
    poll := createBaseK8sClientPoll("deployments")
    poll.What = createClientTableSpec("apps/v1/deployments",
        []string{"metadata.namespace", "metadata.name", ...},
        []string{"NAMESPACE", "NAME", ...})
    poll.Attributes = append(poll.Attributes, createDeplymentsTable())
    p.Polling[poll.Name] = poll
}
func createDeplymentsTable() *l8tpollaris.L8PAttribute {
    attr := &l8tpollaris.L8PAttribute{}
    attr.PropertyId = map[string]string{"k8scluster": "k8scluster.deployments"}
    attr.Rules = make([]*l8tpollaris.L8PRule, 0)
    attr.Rules = append(attr.Rules, createToTable(9, 0, 1))
    attr.Rules = append(attr.Rules, createTableToMap())
    return attr
}
```

Extracted pattern (~5 lines per resource, config-only):
```go
type K8sResourcePollDef struct {
    Name       string
    GVR        string
    Fields     []string
    Headers    []string
    ModelName  string   // Target prime object model (e.g., "k8spod")
    ColCount   int
    KeyIndices []int    // Columns forming the key (namespace=0, name=1)
}

func registerClientResourcePoll(p *l8tpollaris.L8Pollaris, def K8sResourcePollDef) {
    poll := createBaseK8sClientPoll(def.Name)
    poll.What = createClientTableSpec(def.GVR, def.Fields, def.Headers)
    attr := &l8tpollaris.L8PAttribute{}
    attr.PropertyId = map[string]string{def.ModelName: def.ModelName}
    attr.Rules = []*l8tpollaris.L8PRule{createToTable(def.ColCount, def.KeyIndices...), createTableToInstances()}
    poll.Attributes = append(poll.Attributes, attr)
    p.Polling[poll.Name] = poll
}

// Each resource is now config-only:
var k8sClientPolls = []K8sResourcePollDef{
    {Name: "deployments", GVR: "apps/v1/deployments", ModelName: "k8sdeployment", ColCount: 9, KeyIndices: []int{0, 1},
     Fields: []string{"metadata.namespace", "metadata.name", "_k.ready", ...},
     Headers: []string{"NAMESPACE", "NAME", "READY", ...}},
    {Name: "jobs", GVR: "batch/v1/jobs", ModelName: "k8sjob", ColCount: 5, KeyIndices: []int{0, 1},
     Fields: []string{"metadata.namespace", "metadata.name", "_k.completions", "_k.duration", "_k.age"},
     Headers: []string{"NAMESPACE", "NAME", "COMPLETIONS", "DURATION", "AGE"}},
    // ... all 42 resources as config structs
}
```

**Key change vs. old approach:** `PropertyId` targets individual models (e.g., `"k8spod"`) instead of map fields on K8SCluster (e.g., `"k8scluster.pods"`). The final rule changes from `createTableToMap()` to `createTableToInstances()` — a new rule that creates individual model instances from table rows, setting `ClusterName` from the target context and `Key` from the key columns. See **Step 1c** below for the new parser rule.

This refactors the 8 existing client poll functions + 8 existing table functions (16 functions, ~200 lines) into 1 shared function + 8 struct literals (~80 lines). The 24+ new resources then add ~120 lines of config instead of ~310 lines of duplicated functions.

Apply the same extraction to the kubectl-path polls (`create<Resource>Poll` functions) and detail polls (`create<Resource>Details` functions).

**Step 1b: Add new resource poll definitions**

**Files to modify (in l8parser, then re-vendor):**
- `l8parser/go/parser/boot/K8s.go` — Extract shared function, refactor existing 8 polls, add new resource definitions for:

| GVR | Resource | Target Model |
|-----|----------|-------------|
| `v1/events` | Events | `k8sevent` |
| `v1/configmaps` | ConfigMaps | `k8sconfigmap` |
| `v1/secrets` | Secrets | `k8ssecret` |
| `v1/serviceaccounts` | ServiceAccounts | `k8sserviceaccount` |
| `v1/endpoints` | Endpoints | `k8sendpoints` |
| `v1/persistentvolumes` | PVs | `k8spersistentvolume` |
| `v1/persistentvolumeclaims` | PVCs | `k8spersistentvolumeclaim` |
| `v1/resourcequotas` | ResourceQuotas | `k8sresourcequota` |
| `v1/limitranges` | LimitRanges | `k8slimitrange` |
| `apps/v1/replicasets` | ReplicaSets | `k8sreplicaset` |
| `batch/v1/jobs` | Jobs | `k8sjob` |
| `batch/v1/cronjobs` | CronJobs | `k8scronjob` |
| `autoscaling/v2/horizontalpodautoscalers` | HPAs | `k8shpa` |
| `networking.k8s.io/v1/ingresses` | Ingresses | `k8singress` |
| `networking.k8s.io/v1/ingressclasses` | IngressClasses | `k8singressclass` |
| `discovery.k8s.io/v1/endpointslices` | EndpointSlices | `k8sendpointslice` |
| `storage.k8s.io/v1/storageclasses` | StorageClasses | `k8sstorageclass` |
| `rbac.authorization.k8s.io/v1/roles` | Roles | `k8srole` |
| `rbac.authorization.k8s.io/v1/clusterroles` | ClusterRoles | `k8sclusterrole` |
| `rbac.authorization.k8s.io/v1/rolebindings` | RoleBindings | `k8srolebinding` |
| `rbac.authorization.k8s.io/v1/clusterrolebindings` | ClusterRoleBindings | `k8sclusterrolebinding` |
| `apiextensions.k8s.io/v1/customresourcedefinitions` | CRDs | `k8scrd` |
| `policy/v1/poddisruptionbudgets` | PDBs | `k8spoddisruptionbudget` |
| `networking.istio.io/v1beta1/virtualservices` | Istio VS | `istiovirtualservice` |
| `networking.istio.io/v1beta1/destinationrules` | Istio DR | `istiodestinationrule` |
| `networking.istio.io/v1beta1/gateways` | Istio GW | `istiogateway` |
| `networking.istio.io/v1beta1/serviceentries` | Istio SE | `istioserviceentry` |
| `security.istio.io/v1beta1/peerauthentications` | Istio PA | `istiopeerauthentication` |
| `security.istio.io/v1beta1/authorizationpolicies` | Istio AuthZ | `istioauthorizationpolicy` |
| `networking.istio.io/v1beta1/sidecars` | Istio Sidecar | `istiosidecar` |
| `networking.istio.io/v1alpha3/envoyfilters` | Istio EnvoyFilter | `istioenvoyfilter` |
| `infrastructure.cluster.x-k8s.io/v1alpha1/vclusters` OR `management.loft.sh/v1/virtualclusterinstances` | vClusters | `k8svcluster` |

Note: Istio and vCluster GVRs are CRDs — the dynamic informer will fail gracefully if the CRDs don't exist in the cluster (informer start returns an error, which is logged and skipped). The collector should handle this: poll those resources in a separate "optional" boot stage, and if the GVR doesn't exist, mark the resource as unavailable rather than erroring.

**Files to modify in l8parser:**
- `l8parser/go/parser/boot/K8s.go` — Add new poll functions, add to `CreateK8sClientBootPolls()`
- New file if K8s.go exceeds 500 lines: `l8parser/go/parser/boot/K8s_extended.go` — Overflow polls (storage, RBAC, CRDs, Istio, vCluster)

**Step 1c: New parser rule — `createTableToInstances()`**

The existing `createTableToMap()` rule converts table rows into map entries on a parent model. The multi-model approach requires a new rule that creates **individual model instances** from table rows, one per row:

```go
func createTableToInstances() *l8tpollaris.L8PRule {
    // Converts table rows to a list of individual model instances.
    // Each row becomes one instance with:
    //   - ClusterName set from the target context (cluster name)
    //   - Key set from the key columns (e.g., "namespace/name")
    //   - All other fields mapped from table columns
    rule := &l8tpollaris.L8PRule{}
    rule.Type = l8tpollaris.L8PRuleType_TABLE_TO_INSTANCES
    return rule
}
```

This rule is a contained addition to l8parser — it follows the same pattern as `createTableToMap()` but outputs a list of model instances instead of a map on a parent. The parser POSTs the resulting list (e.g., `K8SPodList`) to the resource's inventory service via the LinksID routing.

**Parser attribute example (new pattern):**
```go
// Old pattern (single root model with map field):
// attr.PropertyId = map[string]string{"k8scluster": "k8scluster.pods"}
// attr.Rules = []*l8tpollaris.L8PRule{createToTable(10, 0, 1), createTableToMap()}

// New pattern (individual prime object):
attr.PropertyId = map[string]string{"k8spod": "k8spod"}
attr.Rules = []*l8tpollaris.L8PRule{createToTable(10, 0, 1), createTableToInstances()}
```

### Phase 2: Inventory Service + Links Routing

Register all 42 prime objects as separate inventory services in the same `inv_k8s` process. Update Links.go with map-based routing for all new LinksIDs. Deprecate and migrate existing K8s constants.

**Step 2a: Deprecate existing K8s constants**

The following existing constants are **removed** and replaced by per-type equivalents in the new `k8sLinkMap`:

| Old Constant | Replaced By | Notes |
|-------------|-------------|-------|
| `K8s_Links_ID = "K8s"` | `K8sClust_Links_ID = "K8sClust"` | Cluster summary only |
| `K8s_Cache_Service_Name = "KCache"` | Per-type CacheName in `k8sLinkMap` | e.g., `"K8sPod"`, `"K8sDeploy"` |
| `K8s_Cache_Service_Area = byte(1)` | Per-type CacheArea in `k8sLinkMap` | SA 1 for cluster, SA 10-20 for resources |
| `K8s_Persist_Service_Name = "KPersist"` | Per-type PersistName in `k8sLinkMap` | Shared `"KPersist"` but with per-type area |
| `K8s_Persist_Service_Area = byte(1)` | Per-type PersistArea in `k8sLinkMap` | |
| `K8s_Model_Name = "k8scluster"` | Per-type ModelName in `k8sLinkMap` | e.g., `"k8spod"`, `"k8sdeployment"` |

The following constant is **preserved** (collector process routing still needs it):

| Constant | Why Preserved |
|----------|---------------|
| `K8sC_Links_ID = "K8sC"` | Routes K8s client-go collection to AdControl. `Links.Collector("K8sC")` → `(AdControl, 1)`. Per-type LinksIDs are for cache/persist routing only — the collector process is shared across all K8s resource types. |

The `K8s_Parser_Service_Name/Area` constants are preserved since all 42 types share the same parser process (`"KPars"`, SA 1).

**Consuming files that must be updated:**

| File | Current Usage | Migration |
|------|---------------|-----------|
| `go/prob/inv_k8s/main.go:62` | `inventory.Activate(common2.K8s_Links_ID, ...)` | Replace with 42 per-type `inventory.Activate()` calls |
| `go/prob/parser/main.go:61` | `service.Activate(common2.K8s_Links_ID, ...)` | Replace with per-type service activations |
| `go/prob/common/creates/CreateCluster.go:26` | `device.LinksId = common.K8s_Links_ID` | Change to `common.K8sClust_Links_ID` |
| `go/prob/common/creates/CreateCluster2.go:28` | `device.LinksId = common.K8sC_Links_ID` | Keep as-is (K8sC_Links_ID preserved) |
| `go/prob/common/commands/getClusters.go:44,69` | `targets.Links.Cache(common.K8s_Links_ID)` | Change to `common.K8sClust_Links_ID` |

**Step 2b: Register inventory services**

**File: `go/prob/inv_k8s/main.go` — Multiple `inventory.Activate()` calls:**

```go
func main() {
    res := common2.CreateResources("k8s")
    ifs.SetNetworkMode(ifs.NETWORK_K8s)
    nic := vnic.NewVirtualNetworkInterface(res, nil)
    nic.Start()
    nic.WaitForConnection()

    // Register types and decorators
    registerK8sTypes(nic)

    // Cluster summary (existing, modified PK)
    inventory.Activate(common2.K8sClust_Links_ID, &types2.K8SCluster{}, &types2.K8SClusterList{}, nic, "Name")

    // Workloads (SA 10)
    inventory.Activate(common2.K8sPod_Links_ID, &types2.K8SPod{}, &types2.K8SPodList{}, nic, "ClusterName", "Key")
    inventory.Activate(common2.K8sDeploy_Links_ID, &types2.K8SDeployment{}, &types2.K8SDeploymentList{}, nic, "ClusterName", "Key")
    inventory.Activate(common2.K8sSts_Links_ID, &types2.K8SStatefulSet{}, &types2.K8SStatefulSetList{}, nic, "ClusterName", "Key")
    inventory.Activate(common2.K8sDs_Links_ID, &types2.K8SDaemonSet{}, &types2.K8SDaemonSetList{}, nic, "ClusterName", "Key")
    inventory.Activate(common2.K8sRs_Links_ID, &types2.K8SReplicaSet{}, &types2.K8SReplicaSetList{}, nic, "ClusterName", "Key")
    inventory.Activate(common2.K8sJob_Links_ID, &types2.K8SJob{}, &types2.K8SJobList{}, nic, "ClusterName", "Key")
    inventory.Activate(common2.K8sCj_Links_ID, &types2.K8SCronJob{}, &types2.K8SCronJobList{}, nic, "ClusterName", "Key")
    inventory.Activate(common2.K8sHpa_Links_ID, &types2.K8SHPA{}, &types2.K8SHPAList{}, nic, "ClusterName", "Key")

    // Networking (SA 11)
    inventory.Activate(common2.K8sSvc_Links_ID, &types2.K8SService{}, &types2.K8SServiceList{}, nic, "ClusterName", "Key")
    inventory.Activate(common2.K8sIng_Links_ID, &types2.K8SIngress{}, &types2.K8SIngressList{}, nic, "ClusterName", "Key")
    inventory.Activate(common2.K8sNetPol_Links_ID, &types2.K8SNetworkPolicy{}, &types2.K8SNetworkPolicyList{}, nic, "ClusterName", "Key")
    // ... same pattern for Endpoints, EndpointSlice, IngressClass

    // Storage (SA 12), Config (SA 13), Access Control (SA 14), Nodes (SA 15),
    // Namespaces (SA 16), vCluster (SA 17), Istio (SA 18), CRDs (SA 19), Events (SA 20)
    // ... same inventory.Activate() pattern for each type

    common2.WaitForSignal(nic.Resources())
}
```

**File: `go/prob/common/Links.go` — Map-based routing:**

Replace the growing switch statements with a map-based lookup for K8s resource links. The existing NetworkDevice and GPU links keep their switch cases. New K8s links use a `k8sLinkMap`:

```go
type k8sLinkEntry struct {
    CacheName   string
    CacheArea   byte
    ParserName  string
    ParserArea  byte
    PersistName string
    PersistArea byte
    ModelName   string
}

var k8sLinkMap = map[string]k8sLinkEntry{
    K8sClust_Links_ID:  {CacheName: "KCluster", CacheArea: 1, ParserName: "KPars", ParserArea: 1, PersistName: "KPersist", PersistArea: 1, ModelName: "k8scluster"},
    K8sPod_Links_ID:    {CacheName: "K8sPod", CacheArea: 10, ParserName: "KPars", ParserArea: 1, PersistName: "KPersist", PersistArea: 10, ModelName: "k8spod"},
    K8sDeploy_Links_ID: {CacheName: "K8sDeploy", CacheArea: 10, ParserName: "KPars", ParserArea: 1, PersistName: "KPersist", PersistArea: 10, ModelName: "k8sdeployment"},
    // ... one entry per prime object (42 total)
}

func (this *Links) Cache(linkid string) (string, byte) {
    if entry, ok := k8sLinkMap[linkid]; ok {
        return entry.CacheName, entry.CacheArea
    }
    switch linkid {
    case NetworkDevice_Links_ID:
        return NetDev_Cache_Service_Name, NetDev_Cache_Service_Area
    case GPU_Links_ID:
        return GPU_Cache_Service_Name, GPU_Cache_Service_Area
    }
    return "", 0
}
// Same map-first-then-switch pattern for Parser(), Persist(), Model()

// Collector() is NOT changed to use k8sLinkMap — collector routing is
// process-level (which collector binary), not per-type. The preserved
// K8sC_Links_ID routes to AdControl; all other K8s LinksIDs are never
// passed to Collector() (they're used for cache/persist routing only).
func (this *Links) Collector(linkid string) (string, byte) {
    if linkid == K8sC_Links_ID {  // preserved constant
        return AdControl_Service_Name, AdControl_Service_Area
    }
    return Collector_Service_Name, Collector_Service_Area
}
```

**New constants in Links.go:**

```go
const (
    // Cluster summary
    K8sClust_Links_ID = "K8sClust"

    // Workloads (SA 10)
    K8sPod_Links_ID    = "K8sPod"
    K8sDeploy_Links_ID = "K8sDeploy"
    K8sSts_Links_ID    = "K8sSts"
    K8sDs_Links_ID     = "K8sDs"
    K8sRs_Links_ID     = "K8sRs"
    K8sJob_Links_ID    = "K8sJob"
    K8sCj_Links_ID     = "K8sCj"
    K8sHpa_Links_ID    = "K8sHpa"

    // Networking (SA 11)
    K8sSvc_Links_ID    = "K8sSvc"
    K8sIng_Links_ID    = "K8sIng"
    K8sNetPol_Links_ID = "K8sNetPol"
    K8sEp_Links_ID     = "K8sEp"
    K8sEpSl_Links_ID   = "K8sEpSl"
    K8sIngCl_Links_ID  = "K8sIngCl"

    // Storage (SA 12)
    K8sPv_Links_ID  = "K8sPv"
    K8sPvc_Links_ID = "K8sPvc"
    K8sScl_Links_ID = "K8sScl"

    // Config (SA 13)
    K8sCm_Links_ID  = "K8sCm"
    K8sSec_Links_ID = "K8sSec"
    K8sRq_Links_ID  = "K8sRq"
    K8sLr_Links_ID  = "K8sLr"
    K8sPdb_Links_ID = "K8sPdb"

    // Access Control (SA 14)
    K8sSa_Links_ID   = "K8sSa"
    K8sRole_Links_ID = "K8sRole"
    K8sCr_Links_ID   = "K8sCr"
    K8sRb_Links_ID   = "K8sRb"
    K8sCrb_Links_ID  = "K8sCrb"

    // Nodes (SA 15), Namespaces (SA 16)
    K8sNode_Links_ID = "K8sNode"
    K8sNs_Links_ID   = "K8sNs"

    // vCluster (SA 17)
    K8sVCl_Links_ID = "K8sVCl"

    // Istio (SA 18)
    IstioVs_Links_ID = "IstioVs"
    IstioDr_Links_ID = "IstioDr"
    IstioGw_Links_ID = "IstioGw"
    IstioSe_Links_ID = "IstioSe"
    IstioPa_Links_ID = "IstioPa"
    IstioAp_Links_ID = "IstioAp"
    IstioSc_Links_ID = "IstioSc"
    IstioEf_Links_ID = "IstioEf"

    // CRDs (SA 19), Events (SA 20)
    K8sCrd_Links_ID = "K8sCrd"
    K8sEvt_Links_ID = "K8sEvt"
)
```

Note: Links.go will exceed 500 lines with 42 map entries. Split into `Links.go` (existing + map lookup functions) and `Links_k8s.go` (k8sLinkMap and constants).

### Phase 3: Proto Generation & Backend Build

- Update `proto/make-bindings.sh` to include new files (`istio.proto`, `vcluster.proto`) and replace `kubernetes.proto` with the three split files (`kubernetes-workloads.proto`, `kubernetes-infra.proto`, `kubernetes-config-rbac.proto`)
- Verify `make-bindings.sh` uses `-i` (not `-it`) on all `docker run` commands (per protobuf-generation rule)
- Run `cd proto && ./make-bindings.sh` to regenerate all bindings
- Verify generated `.pb.go` files exist in `go/types/` for all new types
- Re-vendor l8parser/l8collector after changes
- Run `go build ./...` from `go/` to verify compilation (per cleanup-test-binaries rule — never `go build` a main package directly)

### Phase 4: UI — Module Structure (Desktop)

Migrate from custom standalone section to l8ui module pattern with category-based navigation.

**Duplication audit (per plan-duplication-audit rule):**

All 12 resource categories and 40+ sub-tabs share identical behavioral logic — table initialization, detail modal opening, cluster data extraction, tab switching. The ONLY differences are configuration: column definitions, form definitions, field names, and resource-type-specific detail tabs. Therefore:
- `kubernetes-tables.js` is the single shared behavioral component — it accepts a resource type key and column definition, builds and manages the table. NO per-resource-type table initialization functions.
- `kubernetes-detail.js` is the single shared detail component — it accepts a resource type key and detail tab configuration, builds the tabbed detail modal. NO per-resource-type modal files.
- Per-resource-type configuration lives ONLY in `k8s-columns.js` / `k8s-columns-ext.js` (column arrays) and `k8s-forms.js` / `k8s-forms-ext.js` (form definitions).
- Each resource category contributes ~10-20 lines of configuration. All behavioral logic is in the shared components.

**Read-only UI (per immutability-ui-alignment rule):**

All K8s observation services are read-only. In the probler config (`probler-config.js`), every K8s service MUST set `readOnly: true`. Each sub-tab queries its own service endpoint:
```js
// Workloads (SA 10) — each resource type has its own endpoint
svc('pods', 'Pods', 'icon', '/10/K8sPod', 'K8SPod', { readOnly: true }),
svc('deployments', 'Deployments', 'icon', '/10/K8sDeploy', 'K8SDeployment', { readOnly: true }),
svc('statefulsets', 'StatefulSets', 'icon', '/10/K8sSts', 'K8SStatefulSet', { readOnly: true }),
svc('daemonsets', 'DaemonSets', 'icon', '/10/K8sDs', 'K8SDaemonSet', { readOnly: true }),
svc('replicasets', 'ReplicaSets', 'icon', '/10/K8sRs', 'K8SReplicaSet', { readOnly: true }),
svc('jobs', 'Jobs', 'icon', '/10/K8sJob', 'K8SJob', { readOnly: true }),
svc('cronjobs', 'CronJobs', 'icon', '/10/K8sCj', 'K8SCronJob', { readOnly: true }),
svc('hpas', 'HPAs', 'icon', '/10/K8sHpa', 'K8SHPA', { readOnly: true }),

// Networking (SA 11)
svc('services', 'Services', 'icon', '/11/K8sSvc', 'K8SService', { readOnly: true }),
svc('ingresses', 'Ingresses', 'icon', '/11/K8sIng', 'K8SIngress', { readOnly: true }),
// ... same pattern for all resource types per category
```
Each table uses a `baseWhereClause` of `clusterName=<selected-cluster>` to scope queries. L8Query example: `select * from K8SPod where clusterName=mycluster limit 50 page 0`. This enables server-side pagination per resource type.

**New file structure under `go/prob/newui/web/probler/k8s/`:**

File size limits enforced (per maintainability rule — max 500 lines per file):
```
probler/k8s/
├── k8s-enums.js           # All K8s enums (pod status, node status, PV phase, etc.) — ~200 lines
├── k8s-columns.js         # Column defs: Core, Workloads, Networking (~300 lines)
├── k8s-columns-ext.js     # Column defs: Storage, Config, RBAC, CRDs, Istio, vCluster (~300 lines)
├── k8s-forms.js           # Detail view forms: Core, Workloads, Networking (~300 lines)
└── k8s-forms-ext.js       # Detail view forms: Storage, Config, RBAC, CRDs, Istio, vCluster (~300 lines)
```

If any file approaches 450 lines during implementation, split immediately before continuing (per maintainability rule).

**New file structure under `go/prob/newui/web/kubernetes/`:**

Replace all 12 existing files with:

```
kubernetes/
├── kubernetes-init.js       # Module init: fetches clusters, builds UI, manages cluster switching
├── kubernetes-overview.js   # Dashboard: cluster health summary, resource counts, event timeline
├── kubernetes-tables.js     # Generic table builder for all resource categories (shared behavioral logic)
├── kubernetes-detail.js     # Generic detail modal using Layer8DPopup (shared behavioral logic, replaces 7 modal files)
├── kubernetes-events.js     # Live event stream with filtering
├── kubernetes.css           # Styles (theme-compliant, see CSS rules below)
```

**CSS theme compliance (per l8ui-theme-compliance rule):**

`kubernetes.css` MUST:
- Use exclusively `--layer8d-*` CSS custom properties (e.g., `var(--layer8d-primary)`, `var(--layer8d-bg-white)`, `var(--layer8d-text-dark)`)
- NOT contain any hardcoded hex colors
- NOT contain any `[data-theme="dark"]` blocks (dark mode is handled centrally by `layer8d-theme.css`)
- Use shared button classes (`layer8d-btn layer8d-btn-primary layer8d-btn-small`) instead of custom button styles

**Navigation design:**

```
[Cluster Dropdown] [Overview | Workloads | Networking | Storage | Config | RBAC | Nodes | Namespaces | vCluster | Istio | CRDs | Events]
                                |
                   [Pods | Deployments | StatefulSets | DaemonSets | ReplicaSets | Jobs | CronJobs | HPAs]
```

- Top bar: cluster selector + main category tabs
- Each category tab shows sub-resource tabs underneath
- Category tabs that have no data (e.g., Istio when not installed, vCluster when not present) show a grey "Not Detected" state rather than being hidden

**Overview dashboard widgets:**
- Total nodes (ready/not ready)
- Total pods (running/pending/failed)
- Deployments health (available/total)
- PVC status (bound/pending)
- Istio status (installed/version/mTLS coverage) — if detected
- vCluster count — if detected
- Event timeline (last 50 events, colored by type: Normal/Warning)
- Namespace resource breakdown chart

### Phase 5: UI — Detail Modals

Consolidate the 7 separate modal files into a single generic detail system using `Layer8DPopup` with tabs.

**Detail view pattern (shared for all resource types):**

```
┌──────────────────────────────────────┐
│ Pod: nginx-deployment-abc123    [×]  │
├──────────────────────────────────────┤
│ [Overview] [Spec] [Status] [Events] [YAML] [Logs] │
├──────────────────────────────────────┤
│ Overview:                            │
│   Namespace: default                 │
│   Node: worker-1                     │
│   Status: Running                    │
│   IP: 10.244.0.5                     │
│   QoS Class: BestEffort              │
│   ...                                │
│                                      │
│ Containers:                          │
│ ┌─────────────────────────────────┐  │
│ │ Name  │ Image  │ Ready │ State │  │
│ │ nginx │ nginx  │ ✓     │ Run.. │  │
│ └─────────────────────────────────┘  │
└──────────────────────────────────────┘
```

Tabs are resource-type specific:
- **All resources**: Overview, Events, YAML (raw JSON)
- **Pods**: + Containers, Volumes, Logs
- **Deployments/StatefulSets/DaemonSets**: + Pods (child pods matching selector), Strategy
- **Services**: + Endpoints, Ports
- **Nodes**: + Conditions, Capacity/Allocatable, Taints, System Info
- **Ingresses**: + Rules, TLS, Backend
- **PVs/PVCs**: + Capacity, Access Modes, Storage Class
- **Istio VirtualService**: + Routes, Matches, Fault Injection
- **vCluster**: + Synced Resources, Connectivity Status

The detail fetching uses the existing on-demand CJob mechanism (e.g., `poddetails` poll) to get the full `-o json` representation.

### Phase 6: UI — Mobile Parity

Create mobile equivalents following the standard l8ui mobile module pattern (per mobile-rules rule).

**Files to create under `go/prob/newui/web/m/`:**

```
m/modules/monitoring/
├── k8s-enums.js           # Share desktop enums (or import)
├── k8s-columns.js         # Mobile columns with primary/secondary markers
└── k8s-index.js           # Layer8MModuleRegistry.create('MobileK8s', {...})

m/js/details/
├── k8s-detail.js          # Mobile detail popup (rewrite)
```

Update mobile nav config to include K8s resource categories. All K8s services MUST set `readOnly: true` in the mobile nav config. Each resource type queries its own endpoint:
```js
// Workloads sub-module
{ key: 'pods', label: 'Pods', icon: 'pods',
  endpoint: '/10/K8sPod', model: 'K8SPod', idField: 'key', readOnly: true },
{ key: 'deployments', label: 'Deployments', icon: 'deployments',
  endpoint: '/10/K8sDeploy', model: 'K8SDeployment', idField: 'key', readOnly: true },
// ... same pattern for all resource types
```
Mobile tables use `baseWhereClause: 'clusterName=' + selectedCluster` for scoping.

### Phase 7: Section HTML & App Integration

**Files to modify:**
- `go/prob/newui/web/sections/kubernetes.html` — Rewrite to use the new category-tab layout with l8ui CSS classes
- `go/prob/newui/web/js/sections.js` — Update section initializer
- `go/prob/newui/web/app.html` — Update script includes (remove old files, add new ones)
- `go/prob/newui/web/m/app.html` — Add mobile script includes

### Phase 8: End-to-End Verification

**Functional verification** — for every resource type (42 total):
1. Verify collection — the informer starts and caches resources for the GVR
2. Verify parsing — data flows through the parser, `createTableToInstances()` produces individual model instances
3. Verify inventory routing — each model reaches its own cache/persist services via `k8sLinkMap` routing
4. Verify composite PK — each record stored with correct `(clusterName, key)` composite primary key
5. Verify UI data load — table shows data from per-type endpoint (e.g., `/10/K8sPod`)
6. Verify `baseWhereClause` — `clusterName=<selected>` correctly scopes queries per resource type
7. Verify server-side pagination — page 2+ returns correct data for each resource type independently
8. Verify detail modal — clicking a row opens detail with populated tabs, correct record resolved via composite PK
9. Verify mobile — mobile card view shows data from per-type endpoints
10. Verify graceful degradation — Istio/vCluster tabs show "Not Detected" when CRDs absent
11. Verify cluster switching — switching clusters updates `baseWhereClause` on all active tables
12. Verify no Add/Edit/Delete buttons appear on any K8s table (readOnly enforcement)

**Multi-model specific verification:**
```bash
# Verify all 42 inventory services activated (check log output)
grep "Activated Inventory on" /data/logs/*.log | wc -l
# Expected: 42 (one per resource type)

# Verify composite PK works — query single pod by cluster + key
curl -s "https://localhost:2443/probler/10/K8sPod?body=$(echo '{"text":"select * from K8SPod where clusterName=demo-cluster and key=default/nginx"}' | jq -c | python3 -c 'import sys,urllib.parse; print(urllib.parse.quote(sys.stdin.read()))')"
# Expected: single pod record returned

# Verify per-type pagination — pods page 2
curl -s "https://localhost:2443/probler/10/K8sPod?body=$(echo '{"text":"select * from K8SPod where clusterName=demo-cluster limit 10 page 1"}' | jq -c | python3 -c 'import sys,urllib.parse; print(urllib.parse.quote(sys.stdin.read()))')"
# Expected: second page of pods

# Verify different service areas — workloads vs networking
curl -s "https://localhost:2443/probler/10/K8sPod?body=..."    # SA 10
curl -s "https://localhost:2443/probler/11/K8sSvc?body=..."    # SA 11
# Expected: both return data independently
```

**Rule compliance verification:**
```bash
# All proto enums have UNSPECIFIED/INVALID/UNKNOWN zero value
grep -A1 "^enum " proto/k8s.proto proto/istio.proto proto/vcluster.proto proto/kubernetes-*.proto | grep "= 0" | grep -iv "unspecified\|invalid\|unknown"
# Expected: no output

# All 42 List types have metadata field
grep -A2 "List {" proto/k8s.proto proto/istio.proto proto/vcluster.proto proto/kubernetes-*.proto | grep -c "metadata"
# Expected: 42

# No proto file exceeds 500 lines
wc -l proto/k8s.proto proto/istio.proto proto/vcluster.proto proto/kubernetes-*.proto
# Expected: all under 500

# No JS file exceeds 500 lines
wc -l go/prob/newui/web/probler/k8s/*.js go/prob/newui/web/kubernetes/*.js
# Expected: all under 500

# CSS uses only --layer8d-* tokens (no hardcoded colors)
grep -P '#[0-9a-fA-F]{3,8}' go/prob/newui/web/kubernetes/kubernetes.css
# Expected: no output

# No [data-theme="dark"] blocks in component CSS
grep 'data-theme.*dark' go/prob/newui/web/kubernetes/kubernetes.css
# Expected: no output

# Verify Links_k8s.go has all 42 LinksID entries
grep -c "LinksID" go/prob/common/Links_k8s.go
# Expected: 42

# Verify inv_k8s/main.go has all 42 inventory.Activate calls
grep -c "inventory.Activate" go/prob/inv_k8s/main.go
# Expected: 42
```

---

## Test Data & Local Development

K8s observation data comes from live clusters via l8collector, not from mock data generators. However, for local UI development and testing without a live cluster, the following is required (per data-completeness-pipeline rule — every proto field visible in UI columns must have populated data during testing):

**Approach: Per-model JSON fixture files for local development**

Create `go/tests/fixtures/k8s/` with pre-built per-model JSON snapshots. Each file is a `*List` type POSTed to its inventory service endpoint:

```
go/tests/fixtures/k8s/
├── cluster.json         # K8SClusterList (summary data)
├── pods.json            # K8SPodList (20 pods, mixed statuses)
├── deployments.json     # K8SDeploymentList (5 deployments)
├── statefulsets.json    # K8SStatefulSetList
├── nodes.json           # K8SNodeList (3 nodes)
├── services.json        # K8SServiceList
├── namespaces.json      # K8SNamespaceList
├── pods-large.json      # K8SPodList (200 pods, for scale testing)
├── istio-vs.json        # IstioVirtualServiceList (if Istio testing)
└── ...                  # One file per resource type
```

Each fixture's records MUST have `clusterName` set (e.g., `"clusterName": "demo-cluster"`) and `key` set (e.g., `"key": "default/nginx"`).

These fixtures are loaded by `run-demo.sh` which POSTs each `*List` to its service endpoint (e.g., `POST /10/K8sPod` for pods, `POST /11/K8sSvc` for services).

**Fixture coverage requirements:**
- Every resource type that has UI columns MUST have at least 3 entries in its fixture file
- Every enum field (pod status, node status, PV phase, etc.) MUST have entries covering at least 3 distinct enum values (not just the default)
- `K8SClusterSummary` MUST be fully populated with non-zero counts
- All records MUST have non-empty `clusterName` and `key` fields

**No mock data generator needed:** Unlike ERP modules, K8s observation does not use the `go/tests/mocks/` pipeline. Data is either collected live or loaded from fixtures.

---

## Traceability Matrix

| # | Gap / Action Item | Phase |
|---|-------------------|-------|
| 1 | Fix K8sPodStatus/K8sNodeStatus enum zero value naming convention | Phase 0 |
| 2 | Fix K8sClusterList: add missing `l8api.L8MetaData metadata = 2` | Phase 0 |
| 3 | Split kubernetes.proto (1260 lines) into 3 files under 500 lines each | Phase 0 |
| 4 | Strip K8SCluster to summary-only (remove all map fields) | Phase 0 |
| 5 | Add `cluster_name` + `key` composite PK fields to all existing resource types | Phase 0 |
| 6 | Add new resource types with composite PK fields (Jobs, CronJobs, HPA, PV, PVC, etc.) | Phase 0 |
| 7 | Add Istio proto types with composite PK + proper zero-value enums | Phase 0 |
| 8 | Add vCluster proto type with composite PK | Phase 0 |
| 9 | Add K8SClusterSummary for dashboard | Phase 0 |
| 10 | All new enums: UNSPECIFIED = 0 zero values | Phase 0 |
| 11 | All 42 List types: include `l8api.L8MetaData metadata = 2` | Phase 0 |
| 12 | Extract duplicated poll/table pattern into data-driven `registerClientResourcePoll` | Phase 1 |
| 13 | Refactor existing 8 client polls to use extracted pattern | Phase 1 |
| 14 | Add new boot poll definitions for all new GVRs (config-only structs) | Phase 1 |
| 15 | Update PropertyId targets: individual models instead of K8SCluster fields | Phase 1 |
| 16 | Implement `createTableToInstances()` parser rule | Phase 1 |
| 17 | Handle graceful CRD-not-found for Istio/vCluster informers | Phase 1 |
| 18 | Deprecate old K8s constants (`K8s_Links_ID`, `K8s_Cache_Service_Name/Area`, etc.) | Phase 2 |
| 19 | Preserve `K8sC_Links_ID` for collector → AdControl routing | Phase 2 |
| 20 | Update consuming files: `CreateCluster.go`, `getClusters.go`, `parser/main.go` | Phase 2 |
| 21 | Add 42 LinksID constants to Links_k8s.go | Phase 2 |
| 22 | Implement map-based link routing (`k8sLinkMap`) with explicit `Collector()` preservation | Phase 2 |
| 23 | Add 42 `inventory.Activate()` calls in inv_k8s/main.go | Phase 2 |
| 24 | Register composite PK decorators for all resource types | Phase 2 |
| 25 | Update make-bindings.sh for new/split proto files | Phase 3 |
| 26 | Regenerate proto bindings | Phase 3 |
| 27 | Re-vendor l8parser/l8collector | Phase 3 |
| 28 | Rebuild with `go build ./...` | Phase 3 |
| 29 | Create k8s-enums.js with all resource status enums | Phase 4 |
| 30 | Create k8s-columns.js + k8s-columns-ext.js (split at ~300 lines each) | Phase 4 |
| 31 | Set `readOnly: true` on all K8s service configs (desktop) | Phase 4 |
| 32 | Create kubernetes-tables.js (shared behavioral — no per-type duplication) | Phase 4 |
| 33 | Create kubernetes-detail.js (shared behavioral — no per-type duplication) | Phase 4 |
| 34 | Create kubernetes-init.js with category-tab navigation + cluster selector + baseWhereClause | Phase 4 |
| 35 | Create kubernetes-overview.js dashboard | Phase 4 |
| 36 | Create kubernetes.css (--layer8d-* tokens only, no hardcoded colors, no dark blocks) | Phase 4 |
| 37 | Per-resource-type service endpoints in probler-config.js (42 svc entries) | Phase 4 |
| 38 | Consolidate 7 modal files into kubernetes-detail.js | Phase 5 |
| 39 | Create mobile k8s module (enums, columns, index, detail) | Phase 6 |
| 40 | Update mobile nav config with `readOnly: true` + per-type endpoints | Phase 6 |
| 41 | Create per-model JSON fixture files for local dev | Phase 7 |
| 42 | Rewrite kubernetes.html section | Phase 7 |
| 43 | Update app.html script includes | Phase 7 |
| 44 | Update m/app.html script includes | Phase 7 |
| 45 | Update sections.js initializer | Phase 7 |
| 46 | End-to-end verification: per resource type, verify table loads from its own endpoint | Phase 8 |
| 47 | Verify composite PK works: row click resolves correct record via (clusterName, key) | Phase 8 |
| 48 | Verify server-side pagination: page 2+ returns correct data per resource type | Phase 8 |
| 49 | Graceful degradation verification (no Istio/vCluster) | Phase 8 |
| 50 | Mobile parity verification | Phase 8 |
| 51 | Verify all proto enums have UNSPECIFIED = 0 | Phase 8 |
| 52 | Verify all JS files under 500 lines | Phase 8 |
| 53 | Verify CSS uses only --layer8d-* tokens | Phase 8 |

---

## Resource Count Summary

| Category | Current | After Refactor |
|----------|---------|----------------|
| Prime objects (proto types) | 1 (K8SCluster with 8 maps) | 42 independent prime objects |
| Inventory services | 1 (`inventory.Activate`) | 42 (`inventory.Activate` calls in 1 process) |
| LinksID constants | 2 (K8s, K8sC) | 42 (map-based routing) |
| Service areas | 1 (SA 1) | 12 (SA 1-12, one per UI category) |
| GVRs collected | 8 | 32+ |
| UI categories | 8 flat tabs | 12 category tabs |
| UI sub-tabs (per category) | 0 | 42 total across categories |
| Service endpoints | 1 (/1/KCache) | 42 per-type endpoints |
| Modal files | 7 | 1 (generic) |
| Desktop JS files (k8s/) | 12 | 6 |
| Mobile support | Partial | Full parity |
| Istio resource types | None | 8 |
| vCluster resource types | None | 2 |
| Storage resource types | None | 3 (PV, PVC, StorageClass) |
| RBAC resource types | None | 4 (Role, ClusterRole, RoleBinding, ClusterRoleBinding) |
| Config resource types | None | 3 (ConfigMap, Secret, ResourceQuota) |
| CRDs | None | Discovery + instance listing |
| Links.go files | 1 (Links.go) | 2 (Links.go + Links_k8s.go) |
| Proto files (k8s) | 2 (k8s.proto, kubernetes.proto) | 5+ (split for 500-line limit) |

---

## Risk & Considerations

1. **`createTableToInstances()` parser rule dependency**: The multi-model architecture requires a new parser rule (`createTableToInstances`) in l8parser. This is a contained change — a single new rule type alongside the existing `createTableToMap` — but it is a prerequisite for Phase 2+. If l8parser changes are blocked, no data will flow to the per-type inventory services. **Mitigation**: implement and test this rule in isolation before proceeding with other phases.

2. **42 inventory services in one process**: `inv_k8s/main.go` will call `inventory.Activate()` 42 times on the same vnic. Each activation registers a separate service instance with its own `InventoryCenter` (in-memory cache). Memory impact: each `InventoryCenter` has a lock, a map, and metadata — negligible per-instance overhead (<1KB). The data itself is the same total volume as before (same resources, just partitioned by type instead of stuffed into one map). **Mitigation**: monitor `inv_k8s` RSS in a cluster with 10K+ resources; partition into `inv_k8s_workloads` and `inv_k8s_infra` processes only if memory exceeds thresholds.

3. **Links.go file split**: The current `Links.go` (119 lines) uses switch statements for 4 LinksIDs. Adding 42 more would violate the 500-line limit. The plan splits into `Links.go` (unchanged, existing IDs) + `Links_k8s.go` (map-based routing for K8s IDs). **Risk**: the `Links` struct methods (`Cache`, `Persist`, `Parser`) must fall through from the switch to the map lookup. If a future LinksID is added to the wrong file, routing silently fails.

4. **Composite primary key wire compat**: Existing K8SCluster uses `Name` as single PK. The new resource types use `(ClusterName, Key)` as composite PK. Both the `inventory.Activate()` call and the introspector PK decorator must specify both fields in the same order. Mismatch causes "cannot find element by key" errors on GET. **Mitigation**: Phase 8 verification explicitly tests composite PK queries.

5. **CRD absence**: Istio and vCluster GVRs may not exist. The collector must catch informer start failures and mark the resource category as unavailable. The UI checks `K8SClusterSummary.istio_installed` and `total_vclusters` to show/hide relevant tabs.

6. **Scale**: Clusters with 10K+ pods and thousands of ConfigMaps/Secrets. With per-type services, each type's cache is smaller than the old single-map model, and server-side pagination (`select * from K8SPod where clusterName=X limit 50 page 0`) keeps UI response times bounded. The overview dashboard uses `K8SClusterSummary` counts rather than client-side counting.

7. **Secrets**: The `K8SSecret` type should NOT include `data` or `stringData` fields in the table view — only metadata (name, namespace, type, age). Data should only be fetchable via the detail `-o json` path, and even then consider masking.

8. **vCluster protocol detection**: Need to detect which vCluster distribution is installed (loft.sh vCluster vs. Cluster API). Boot polls should try both GVRs and use whichever succeeds.

9. **PropertyId namespace collision**: With 42 models using individual PropertyId targets (e.g., `k8spod`, `k8sdeployment`), each must be globally unique across all l8pollaris users. The `k8s` prefix on all names ensures no collision with existing `networkdevice` or `gpudevice` models.

---

## Rule Compliance Checklist

| Rule | Status | How Addressed |
|------|--------|---------------|
| proto-enum-zero-value | ✓ | Phase 0 Step 0a fixes existing enums; all new enums use `_UNSPECIFIED = 0` |
| proto-list-convention | ✓ | Phase 0 Step 0a fixes K8sClusterList; all 42 List types include `metadata = 2` |
| maintainability (500-line limit) | ✓ | Phase 0 Step 0b splits proto files; JS files have explicit size budgets; Links_k8s.go split |
| maintainability (ServiceArea) | ✓ (deviation) | Rule says "SA should be the same for Services under the same Module." This plan uses 12 SAs (1, 10-20) for 42 K8s resource types grouped by UI category. **Justification**: a single SA would force all 42 types into one query namespace; per-category SAs align backend routing with UI structure and enable independent pagination. Within each category, all services share one SA — the deviation is at the category level, not the individual service level. |
| data-completeness-pipeline | ✓ | Test Data section: per-model JSON fixtures with populated composite PKs |
| immutability-ui-alignment | ✓ | Phase 4 + Phase 6: `readOnly: true` on all 42 K8s service configs |
| plan-duplication-audit | ✓ | Phase 4: shared behavioral components; per-type files are config-only |
| l8ui-theme-compliance | ✓ | Phase 4: CSS requirements specify `--layer8d-*` tokens only |
| plan-traceability-and-verification | ✓ | Traceability matrix (50 items) + verification phase (Phase 8) |
| plan-approval-workflow | ✓ | Plan written to `./plans/`, awaiting user approval |
| canonical-project-selection | ✓ | Probler is the correct canonical reference for observation projects |
| prime-object-references | ✓ | 42 independent prime objects, each with own service/LinksID/PK. No cross-references between prime objects — only ID fields (clusterName). Child types (containers in pods) remain embedded as repeated fields. |
| protobuf-generation | ✓ | Phase 3: explicit make-bindings.sh update and run |
| cleanup-test-binaries | ✓ | Phase 3: uses `go build ./...` not direct main package build |
| no-go-generics | ✓ | No generics used; map-based Links routing uses concrete types |
| mobile-rules | ✓ | Phase 6: full mobile parity with per-type endpoints and readOnly |
| l8pollaris-binary-deployment | ✓ | No new processes; inv_k8s updated in place with 42 Activate calls in same binary |
| vendor-third-party-code | ✓ | Phase 3: re-vendor l8parser/l8collector after createTableToInstances changes |
