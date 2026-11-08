Kubernetes manifests for the `L8PKubernetesAPI` admission collector live here.

`validating-webhook.yaml` is generated from the active Pollaris boot polls. To regenerate it:

```bash
cd go
GOCACHE=/tmp/go-build go run ./cmd/k8s-webhook-config \
  -name l8collector-k8s \
  -service l8collector-admission \
  -namespace probler-k8s-admin \
  -path /admission/kubernetes
```

The current checked-in manifest assumes:

- Service name: `l8collector-admission`
- Namespace: `probler-k8s-admin`
- Admission path: `/admission/kubernetes`
- ClusterName: `lab`

`admission-control.yaml` deploys the `go/adcon` image and exposes HTTPS on port `8443`.
It also creates the service account, RBAC, TLS bootstrap job, and the deployment.

The admission deployment also mirrors the base collector runtime assumptions:

- `NODE_IP` is injected from the node `status.hostIP`
- `/data` is backed by a hostPath volume at `/data`

The bootstrap job:

- generates a self-signed certificate for `l8collector-admission`, `l8collector-admission.probler-k8s-admin`, and `l8collector-admission.probler-k8s-admin.svc`
- creates or updates the `l8collector-admission-tls` secret
- patches the `ValidatingWebhookConfiguration` with the matching `caBundle`

The deployment mounts that secret as:

- `/data/admission.crt`
- `/data/admission.crtKey`

Apply order matters because the bootstrap job patches the webhook object:

```bash
kubectl apply -f k8s/validating-webhook.yaml
kubectl apply -f k8s/admission-control.yaml
```

Wrapper scripts are included:

```bash
./k8s/deploy-adm.sh
./k8s/un-deploy-adm.sh
```

## Local Development Setup (KIND + l8opensim + e2e)

Local runs and all testing go through a KIND cluster and the Playwright suite in `../e2e`.

| Script | What it does |
|--------|--------------|
| `build-images.sh [dirs...]` | Builds the security plugin images (via `../l8secure`) and every service image locally for the host arch, `--load`, no push. `PARALLEL=N` (default 4). |
| `sim-start.sh` / `sim-stop.sh` | Runs `../l8opensim` on the host (sudo): 19 network devices at 10.20.30.1/24 and 3 GPU servers at 20.20.30.1/24. |
| `sim-route-kind.sh` | Adds `DOCKER-USER` accept rules between the kind docker bridge and `veth-sim-host` so collector pods reach the simulator. |
| `kind-start.sh` | `sim-start` -> create cluster -> load images -> deploy in 3 phases -> `sim-route-kind` -> `seed-mocks`. `BUILD=1` builds images first, `SKIP_SIM=1` skips the simulator. |
| `seed-mocks.sh` | Waits for the Targets endpoint, registers the simulator targets (`go run ./tests/seed`), then waits until NetworkDevice / GpuDevice / K8SCluster data is live. Re-runnable. |
| `kind-stop.sh` | Stops the simulator (unless `KEEP_SIM=1`) and deletes the cluster. |

```bash
k8s/build-images.sh && k8s/kind-start.sh
cd e2e && npm install && npx playwright install chromium && npm test
k8s/kind-stop.sh
```

Kind manifests use `imagePullPolicy: IfNotPresent` (`Always` silently discards images loaded with `kind load`).
