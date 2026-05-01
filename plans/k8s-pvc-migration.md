# K8s Migration: Single probler.yaml with "probler" Namespace + PVC

## Problem
1. All k8s manifests mount `/data` via `hostPath`, which doesn't work on GKE clusters
2. Each service has its own namespace, making PVC sharing impossible

## Decision
Do NOT modify any existing manifests or scripts. Instead, create a single new `k8s/probler.yaml` that consolidates all workloads into one `probler` namespace with a shared PVC.

Existing per-service manifests remain as-is for reference or bare-metal deployments.

## Phase 1: Create k8s/probler.yaml

A single file containing, in order:

1. **Namespace** — `probler`
2. **StorageClass** — `probler-storage` (GCE PD, WaitForFirstConsumer, Retain)
3. **PersistentVolumeClaim** — `probler-data` (50Gi, ReadWriteOnce)
4. **All workloads** — copied from existing manifests with these changes:
   - Remove individual `kind: Namespace` blocks (the single Namespace above covers all)
   - All `namespace:` fields → `probler`
   - All hostPath volumes → `persistentVolumeClaim: claimName: probler-data`
   - `volumeMounts` unchanged (`name: hdata`, `mountPath: /data`)

### Workloads to include (in deploy order)

| # | Source Manifest | Kind | Special Notes |
|---|----------------|------|---------------|
| 1 | vnet.yaml | DaemonSet | hostNetwork: true |
| 2 | logs.yaml | DaemonSet | hostNetwork: true, port 12888 |
| 3 | parser.yaml | Deployment x3 | large/medium/small with nodeSelector |
| 4 | collector.yaml | Deployment x3 | large/medium/small with nodeSelector |
| 5 | box.yaml | DaemonSet | |
| 6 | gpu.yaml | DaemonSet | |
| 7 | k8s.yaml | DaemonSet | |
| 8 | orm.yaml | StatefulSet | |
| 9 | alarms.yaml | StatefulSet | |
| 10 | webui2.yaml | DaemonSet | hostNetwork: true |
| 11 | webui.yaml | DaemonSet | hostNetwork: true |
| 12 | maint.yaml | DaemonSet | hostNetwork: true |
| 13 | log-agent.yaml | DaemonSet | LOGPATH/LOGFILE env vars |
| 14 | topo.yaml | StatefulSet | No volumes — namespace change only |
| 15 | te_app.yaml | Deployment + Service + Ingress | No volumes — add namespace |
| 16 | admission-control.yaml | SA, Role, ClusterRole, RoleBindings, ConfigMap, Job, Service, Deployment | Keep tls/bootstrap/work volumes; replace `data` hostPath with PVC; all `probler-k8s-admin` refs → `probler`; Job env NAMESPACE → `probler` |
| 17 | validating-webhook.yaml | ValidatingWebhookConfiguration | Service namespace → `probler`; webhook name → `l8collector-admission.probler.svc` |

### admission-control.yaml details

All `probler-k8s-admin` namespace references change to `probler`. The Deployment has 3 volumes:
- `data` (hostPath) → replace with PVC (`claimName: probler-data`), rename to `hdata`
- `tls` (secret) → keep as-is
- Job volumes (`bootstrap` configMap + `work` emptyDir) → keep as-is

### Volume replacement pattern

```yaml
# BEFORE
      volumes:
        - name: hdata
          hostPath:
            path: /data
            type: DirectoryOrCreate

# AFTER
      volumes:
        - name: hdata
          persistentVolumeClaim:
            claimName: probler-data
```

## What is NOT changed

- No existing manifests in `k8s/` are modified
- `deploy.sh`, `un-deploy.sh`, `clean.sh` are not modified
- The new `probler.yaml` is deployed independently: `kubectl apply -f probler.yaml`

## Traceability Matrix

| # | Item | Phase |
|---|------|-------|
| 1 | Namespace definition | Phase 1 |
| 2 | StorageClass definition | Phase 1 |
| 3 | PVC definition | Phase 1 |
| 4 | vnet DaemonSet | Phase 1 |
| 5 | logs DaemonSet | Phase 1 |
| 6 | parser Deployments (x3) | Phase 1 |
| 7 | collector Deployments (x3) | Phase 1 |
| 8 | box DaemonSet | Phase 1 |
| 9 | gpu DaemonSet | Phase 1 |
| 10 | k8s DaemonSet | Phase 1 |
| 11 | orm StatefulSet | Phase 1 |
| 12 | alarms StatefulSet | Phase 1 |
| 13 | webui2 DaemonSet | Phase 1 |
| 14 | webui DaemonSet | Phase 1 |
| 15 | maint DaemonSet | Phase 1 |
| 16 | log-agent DaemonSet | Phase 1 |
| 17 | topo StatefulSet (no volumes) | Phase 1 |
| 18 | te_app Deployment + Service + Ingress | Phase 1 |
| 19 | admission-control (all resources) | Phase 1 |
| 20 | validating-webhook config | Phase 1 |

## Verification

```bash
# Dry-run
kubectl apply --dry-run=client -f k8s/probler.yaml

# Verify no old namespace references
grep -n 'probler-vnet\|probler-orm\|probler-parser\|probler-collector\|probler-box\|probler-gpu\|probler-webui\|probler-maint\|probler-log-agent\|probler-logs\|probler-alarms\|probler-topo\|probler-k8s-admin' k8s/probler.yaml

# Verify no hostPath remains
grep -n 'hostPath' k8s/probler.yaml

# Deploy
kubectl apply -f k8s/probler.yaml

# Verify
kubectl get pvc -n probler
kubectl get pods -n probler
```
