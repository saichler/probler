#!/usr/bin/env bash
# Start l8opensim (../l8opensim) on the host and create the simulated devices the
# e2e suite observes. The device ranges match the targets registered by
# `prctl ... add devices base|gpus` (go/prob/common/commands/addDevices.go):
#   10.20.30.1-19  network devices (SNMP v2c + SSH, round robin over vendor profiles)
#   20.20.30.1-3   GPU servers (SNMP + SSH + REST 8443)
# They deliberately avoid the KIND pod/service CIDRs (10.244/16, 10.96/12) and the
# docker "kind" network (172.18/16).
#
# Needs root (TUN interfaces, the opensim netns, host routes, FORWARD rules).
# Collector pods are not hostNetwork: their traffic is SNATed to the kind node,
# leaves through the kind docker bridge, follows the simulator's host route via
# 10.254.0.2 and needs a DOCKER-USER accept rule (FORWARD policy is DROP).
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SIM_DIR="$(cd "${SCRIPT_DIR}/../../l8opensim/go/simulator" && pwd)"
SIM_PORT="${SIM_PORT:-8080}"
SIM_API="http://localhost:${SIM_PORT}"
LOG="${SCRIPT_DIR}/.sim.log"
NET_DEVICES="${NET_DEVICES:-19}"
GPU_DEVICES="${GPU_DEVICES:-3}"

if [ ! -x "${SIM_DIR}/simulator" ] || [ -n "${SIM_REBUILD}" ]; then
  echo "Building l8opensim simulator..."
  (cd "${SIM_DIR}" && go build -o simulator .)
fi

sudo modprobe tun

if curl -sf "${SIM_API}/health" >/dev/null 2>&1; then
  echo "Simulator already running on ${SIM_PORT}."
else
  echo "Starting simulator on ${SIM_PORT} (log: ${LOG})..."
  sudo sysctl -qw net.core.rmem_max=26214400 net.core.wmem_max=26214400
  (cd "${SIM_DIR}" && sudo setsid nohup prlimit --nofile=1048576:1048576 \
      ./simulator -port "${SIM_PORT}" >"${LOG}" 2>&1 </dev/null &) >/dev/null 2>&1
  for i in $(seq 1 60); do
    curl -sf "${SIM_API}/health" >/dev/null 2>&1 && break
    sleep 1
  done
  curl -sf "${SIM_API}/health" >/dev/null || { echo "simulator did not come up"; tail -20 "${LOG}"; exit 1; }
fi

device_count() {
  curl -sf "${SIM_API}/api/v1/devices" | python3 -c '
import json,sys
d=json.load(sys.stdin)
if isinstance(d,dict):
    d=d.get("devices", d.get("data", []))
print(len(d or []))'
}

if [ "$(device_count)" -ge $((NET_DEVICES + GPU_DEVICES)) ]; then
  echo "Devices already created."
else
  echo "Creating ${NET_DEVICES} network devices at 10.20.30.1/24..."
  curl -sf -XPOST "${SIM_API}/api/v1/devices" -H 'Content-Type: application/json' \
    -d "{\"start_ip\":\"10.20.30.1\",\"device_count\":${NET_DEVICES},\"netmask\":\"24\",\"round_robin\":true,\"category\":\"Network Devices\"}" >/dev/null
  echo "Creating ${GPU_DEVICES} GPU servers at 20.20.30.1/24..."
  curl -sf -XPOST "${SIM_API}/api/v1/devices" -H 'Content-Type: application/json' \
    -d "{\"start_ip\":\"20.20.30.1\",\"device_count\":${GPU_DEVICES},\"netmask\":\"24\",\"round_robin\":true,\"category\":\"GPU Servers\"}" >/dev/null
fi
echo "Simulated devices: $(device_count)"

# Let KIND nodes reach the simulator (idempotent; re-run after kind-start creates the network).
"${SCRIPT_DIR}/sim-route-kind.sh" || true
