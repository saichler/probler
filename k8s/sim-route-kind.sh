#!/usr/bin/env bash
# Allow traffic between the KIND docker network bridge and the l8opensim veth.
# Idempotent; needs the "kind" docker network and a running simulator.
set -e
NET_ID="$(docker network inspect kind -f '{{.Id}}' 2>/dev/null || true)"
if [ -z "${NET_ID}" ]; then
  echo "docker network 'kind' not found yet (run again after kind-start)."
  exit 1
fi
BR="br-${NET_ID:0:12}"
SIM_IF="veth-sim-host"
ip link show "${SIM_IF}" >/dev/null 2>&1 || { echo "${SIM_IF} missing: simulator not running?"; exit 1; }

add_rule() {
  sudo iptables -C DOCKER-USER "$@" 2>/dev/null || sudo iptables -I DOCKER-USER "$@"
}
add_rule -i "${BR}" -o "${SIM_IF}" -j ACCEPT
add_rule -i "${SIM_IF}" -o "${BR}" -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
echo "FORWARD ${BR} <-> ${SIM_IF} allowed."
