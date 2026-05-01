# GKE Ingress with Managed TLS: probler-GKE.yaml

## Problem
The probler webui uses a self-signed certificate on port 2443. Browsers block self-signed certs. On GKE, we need a trusted certificate from a public CA so users can connect without warnings.

## Solution
Copy `probler.yaml` to `probler-GKE.yaml` and add:
1. A `ManagedCertificate` resource — GKE provisions a trusted Let's Encrypt cert automatically
2. A `Service` (NodePort) for webui2 — required for GKE Ingress backend
3. A `BackendConfig` — tells GKE's load balancer to use HTTPS when connecting to webui2 pods
4. An `Ingress` with GKE annotations — routes external HTTPS traffic to webui2

## Prerequisites
- A domain name pointing to the GKE Ingress IP (e.g., `probler.example.com`)
- GKE Standard cluster (ManagedCertificate is a GKE-specific CRD)

## Changes from probler.yaml

### 1. webui2 DaemonSet changes
- **Remove** `hostNetwork: true` — Ingress routes to pods via Service, not host ports
- **Add** `containerPort: 2443` — declares the listening port for the Service to target

### 2. New resources to add (at the end of the file)

**Service for webui2** (NodePort — required by GKE Ingress):
```yaml
apiVersion: v1
kind: Service
metadata:
  namespace: probler
  name: probler-webui2-svc
  labels:
    app: probler-webui2
  annotations:
    cloud.google.com/backend-config: '{"default": "probler-webui2-backend"}'
spec:
  type: NodePort
  selector:
    app: probler-webui2
  ports:
    - name: https
      port: 2443
      targetPort: 2443
      protocol: TCP
```

**BackendConfig** (tells GKE LB to connect via HTTPS to backend pods):
```yaml
apiVersion: cloud.google.com/v1
kind: BackendConfig
metadata:
  namespace: probler
  name: probler-webui2-backend
spec:
  healthCheck:
    type: HTTPS
    port: 2443
    requestPath: /
```

**ManagedCertificate**:
```yaml
apiVersion: networking.gke.io/v1
kind: ManagedCertificate
metadata:
  namespace: probler
  name: probler-cert
spec:
  domains:
    - probler.example.com
```
The domain must be replaced with the actual domain before deploying.

**Ingress**:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  namespace: probler
  name: probler-ingress
  annotations:
    kubernetes.io/ingress.class: "gce"
    networking.gke.io/managed-certificates: "probler-cert"
    kubernetes.io/ingress.allow-http: "false"
spec:
  defaultBackend:
    service:
      name: probler-webui2-svc
      port:
        number: 2443
```

### 3. Other hostNetwork services — unchanged

| Service | hostNetwork | Reason to keep |
|---------|-------------|---------------|
| vnet | true | Inter-node L8Bus communication (port 25998), not user-facing |
| logs | true | Log aggregation (port 12888), not user-facing |
| maint | true | Maintenance page, internal-only |
| webui (old) | true | Inactive (not in deploy.sh), kept for reference |

These are infrastructure services that communicate between nodes. They are not exposed to browsers and don't need Ingress.

### 4. No other changes

All other workloads (parser, collector, box, gpu, k8s, orm, alarms, log-agent, topo, te_app, admission-control, webhook) remain identical to probler.yaml.

## TLS flow

```
Browser → HTTPS (trusted cert) → GKE Ingress/LB
  → HTTPS (self-signed, OK inside cluster) → webui2 pod :2443
```

GKE's load balancer accepts the self-signed cert from backend pods — it only validates the TLS handshake, not the CA chain. The user's browser sees the trusted ManagedCertificate, not the self-signed one.

## After deploying

1. `kubectl apply -f k8s/probler-GKE.yaml`
2. Wait for Ingress IP: `kubectl get ingress probler-ingress -n probler`
3. Point DNS `probler.example.com` → Ingress IP
4. Wait for cert provisioning (~10-15 minutes): `kubectl get managedcertificate probler-cert -n probler`
5. Access `https://probler.example.com` — trusted cert, no browser warning

## Traceability Matrix

| # | Item | Change |
|---|------|--------|
| 1 | Copy probler.yaml → probler-GKE.yaml | Base |
| 2 | webui2 DaemonSet: remove hostNetwork | Edit |
| 3 | webui2 DaemonSet: add containerPort 2443 | Edit |
| 4 | Add Service for webui2 | New resource |
| 5 | Add BackendConfig for HTTPS health check | New resource |
| 6 | Add ManagedCertificate | New resource |
| 7 | Add Ingress | New resource |

## Verification

```bash
kubectl apply --dry-run=client -f k8s/probler-GKE.yaml
kubectl get managedcertificate -n probler
kubectl get ingress -n probler
kubectl get svc probler-webui2-svc -n probler
```
