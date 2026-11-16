#!/usr/bin/env bash
set -e

CLUSTER_NAME="probler"

# Pin the target cluster instead of inheriting the ambient context. `kind
# create cluster` rewrites the global current-context, so whichever kind
# cluster was created last would otherwise own every kubectl call here --
# which is how one project's pods end up inside another's cluster.
KUBECTL=(kubectl --context "kind-${CLUSTER_NAME}")
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

# Optional: BUILD=1 builds every image locally first (k8s/build-images.sh).
if [ -n "${BUILD}" ]; then
  "${SCRIPT_DIR}/build-images.sh"
fi

# Simulated devices (l8opensim on the host) feed the network/GPU pipeline.
# SKIP_SIM=1 deploys without them.
if [ -z "${SKIP_SIM}" ]; then
  "${SCRIPT_DIR}/sim-start.sh"
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
  # Single node: kind removes the control-plane NoSchedule taint itself on a
  # one-node cluster, so do NOT patch nodeRegistration.taints here -- setting
  # it empty makes kind's own `kubectl taint ... control-plane-` step fail with
  # `taint "node-role.kubernetes.io/control-plane" not found` and the create
  # aborts. The port mappings must live on this node because probler-kind.yaml
  # declares no hostPorts, so host access to 2443/4443 comes only from here.
  - role: control-plane
    extraPortMappings:
      - containerPort: 2443
        hostPort: 2443
        protocol: TCP
      - containerPort: 4443
        hostPort: 4443
        protocol: TCP
EOF

echo "Creating KIND cluster '${CLUSTER_NAME}' (single node)..."
kind create cluster --name "${CLUSTER_NAME}" --config "${SCRIPT_DIR}/${KIND_CONFIG}"

echo "Waiting for nodes to be Ready..."
"${KUBECTL[@]}" wait --for=condition=Ready nodes --all --timeout=120s

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
  saichler/probler-logagent:latest
  saichler/probler-topo:latest
  saichler/probler-admission:latest
  saichler/probler-chat-orm:latest
  saichler/probler-chat:latest
  saichler/probler-chat-router:latest
  saichler/probler-chat-users:latest
  saichler/probler-chat-agent:latest
)

for img in "${IMAGES[@]}"; do
  if docker image inspect "$img" &>/dev/null; then
    echo "  Loading $img..."
    kind load docker-image "$img" --name "${CLUSTER_NAME}"
  else
    echo "  SKIP $img (not found locally — will pull from registry)"
  fi
done

# Phase boundaries come from the manifest itself (not fixed line numbers, which
# break on every edit): phase 1 ends before the parser, phase 2 before the
# admission controller's ServiceAccount.
# hostAliases map LAN-only names (the LLM and web tools of the chat agent) to
# LAN addresses. They are used only when this machine is on the subnet of
# those addresses; elsewhere they are left out and the pods resolve the public
# names. The pods cannot decide this themselves: on KIND their node's address
# is a docker address, not this machine's.
ip2int() { local IFS=.; read -r a b c d <<< "$1"; echo $(( (a << 24) + (b << 16) + (c << 8) + d )); }
in_subnet() {
  local ip="$1" cidr="$2" bits mask
  bits="${cidr#*/}"
  mask=$(( bits == 0 ? 0 : (0xFFFFFFFF << (32 - bits)) & 0xFFFFFFFF ))
  (( ($(ip2int "$ip") & mask) == ($(ip2int "${cidr%/*}") & mask) ))
}
on_lan_of() {
  command -v ip &>/dev/null || return 1
  local cidr
  for cidr in $(ip -o -4 addr show scope global | awk '{print $4}'); do
    in_subnet "$1" "$cidr" && return 0
  done
  return 1
}

MANIFEST="${SCRIPT_DIR}/probler-kind.yaml"
LAN_IPS=$(grep -A2 'hostAliases:' "${MANIFEST}" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' | sort -u)
USE_LAN=1
for lan_ip in ${LAN_IPS}; do
  on_lan_of "${lan_ip}" || USE_LAN=""
done
if [ -n "${LAN_IPS}" ] && [ -z "${USE_LAN}" ]; then
  echo "Not on the LAN of ${LAN_IPS//$'\n'/ }: deploying without hostAliases (public names)."
  APPLIED="$(mktemp)"
  trap 'rm -f "${APPLIED}"' EXIT
  # Drop each hostAliases block: the key line and the lines indented under it.
  awk '
    /^[[:space:]]*hostAliases:/ { skip = 1; match($0, /^[[:space:]]*/); indent = RLENGTH; next }
    skip { match($0, /^[[:space:]]*/); if (RLENGTH > indent) next; skip = 0 }
    { print }
  ' "${MANIFEST}" > "${APPLIED}"
  MANIFEST="${APPLIED}"
elif [ -n "${LAN_IPS}" ]; then
  echo "On the LAN of ${LAN_IPS//$'\n'/ }: deploying with hostAliases."
fi
PHASE1_END=$(( $(grep -n '^# probler-parser' "${MANIFEST}" | head -1 | cut -d: -f1) - 1 ))
PHASE2_END=$(( $(grep -n '^kind: ServiceAccount' "${MANIFEST}" | head -1 | cut -d: -f1) - 2 ))

echo "Phase 1: Deploying namespace + vnet + logs-vnet..."
head -n "${PHASE1_END}" "${MANIFEST}" | "${KUBECTL[@]}" apply -f -

echo "Waiting for probler-vnet to be Ready..."
"${KUBECTL[@]}" -n probler rollout status statefulset/probler-vnet --timeout=120s
echo "Waiting for probler-logs to be Ready..."
"${KUBECTL[@]}" -n probler rollout status statefulset/probler-logs --timeout=120s

echo "Phase 2: Deploying core services..."
head -n "${PHASE2_END}" "${MANIFEST}" | "${KUBECTL[@]}" apply -f -

echo "Waiting for all core services to be Ready..."
for sts in probler-parser probler-collector probler-box probler-gpu probler-k8s \
           probler-orm probler-alarms probler-webui2 probler-log-agent probler-topo \
           probler-chat-orm probler-chat probler-chat-router probler-chat-users probler-chat-agent; do
  echo "  Waiting for ${sts}..."
  "${KUBECTL[@]}" -n probler rollout status statefulset/"${sts}" --timeout=180s
done

echo "Phase 3: Deploying admission controller..."
"${KUBECTL[@]}" apply -f "${MANIFEST}"

if [ -z "${SKIP_SIM}" ]; then
  echo "Allowing KIND -> l8opensim forwarding..."
  "${SCRIPT_DIR}/sim-route-kind.sh"
fi

echo "Seeding targets and waiting for live data..."
"${SCRIPT_DIR}/seed-mocks.sh"

echo ""
echo "KIND cluster '${CLUSTER_NAME}' is up and probler is deployed."
echo "Run 'kubectl get pods -n probler' to check status."
echo "Run './kind-stop.sh' to tear down."
