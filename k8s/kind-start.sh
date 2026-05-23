#!/usr/bin/env bash
set -e

CLUSTER_NAME="probler"
KIND_CONFIG="kind-cluster.yaml"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Install KIND if not present
if ! command -v kind &>/dev/null; then
  echo "kind not found — installing..."
  if [[ "$(uname)" == "Darwin" ]]; then
    brew install kind
  else
    curl -Lo ./kind https://kind.sigs.k8s.io/dl/latest/kind-linux-amd64
    chmod +x ./kind
    sudo mv ./kind /usr/local/bin/kind
  fi
  echo "kind installed: $(kind version)"
fi

# Check if cluster already exists
if kind get clusters 2>/dev/null | grep -q "^${CLUSTER_NAME}$"; then
  echo "KIND cluster '${CLUSTER_NAME}' already exists."
  echo "Run ./kind-stop.sh first if you want to recreate it."
  exit 1
fi

# Write cluster config
cat > "${SCRIPT_DIR}/${KIND_CONFIG}" <<'EOF'
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
  - role: worker
  - role: worker
  - role: worker
EOF

echo "Creating KIND cluster '${CLUSTER_NAME}' (1 control-plane + 3 workers)..."
kind create cluster --name "${CLUSTER_NAME}" --config "${SCRIPT_DIR}/${KIND_CONFIG}"

echo "Waiting for nodes to be Ready..."
kubectl wait --for=condition=Ready nodes --all --timeout=120s

echo "Loading Docker images into KIND cluster..."
IMAGES=(
  saichler/probler-vnet:latest
  saichler/logs-vnet:latest
  saichler/probler-parser:latest
  saichler/probler-collector:latest
  saichler/probler-inv-box:latest
  saichler/probler-inv-gpu:latest
  saichler/probler-inv-k8s:latest
  saichler/probler-orm:latest
  saichler/probler-alarms:latest
  saichler/probler-webui2:latest
  saichler/probler-webui:latest
  saichler/probler-maint:latest
  saichler/probler-logagent:latest
  saichler/probler-topo:latest
  saichler/probler-admission:latest
)

for img in "${IMAGES[@]}"; do
  if docker image inspect "$img" &>/dev/null; then
    echo "  Loading $img..."
    kind load docker-image "$img" --name "${CLUSTER_NAME}"
  else
    echo "  SKIP $img (not found locally — will pull from registry)"
  fi
done

echo "Deploying probler-kind.yaml..."
kubectl apply -f "${SCRIPT_DIR}/probler-kind.yaml"

echo ""
echo "KIND cluster '${CLUSTER_NAME}' is up and probler is deployed."
echo "Run 'kubectl get pods -n probler' to check status."
echo "Run './kind-stop.sh' to tear down."
