#!/usr/bin/env bash
set -e

CLUSTER_NAME="probler"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Stop l8opensim too unless KEEP_SIM=1 (it runs on the host, see sim-start.sh).
if [ -z "${KEEP_SIM}" ]; then
  "${SCRIPT_DIR}/sim-stop.sh" || true
fi

if ! command -v kind &>/dev/null; then
  echo "kind not found — nothing to stop."
  exit 0
fi

if ! kind get clusters 2>/dev/null | grep -q "^${CLUSTER_NAME}$"; then
  echo "KIND cluster '${CLUSTER_NAME}' does not exist."
  exit 0
fi

echo "Deleting KIND cluster '${CLUSTER_NAME}'..."
kind delete cluster --name "${CLUSTER_NAME}"

# Clean up generated config
rm -f "${SCRIPT_DIR}/kind-cluster.yaml"

echo "KIND cluster '${CLUSTER_NAME}' deleted."
