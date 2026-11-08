#!/usr/bin/env bash
# Stop l8opensim started by sim-start.sh and remove the KIND forwarding rules.
SIM_PORT="${SIM_PORT:-8080}"
curl -sf -XDELETE "http://localhost:${SIM_PORT}/api/v1/devices" >/dev/null 2>&1 || true
sudo pkill -f "simulator -port ${SIM_PORT}" 2>/dev/null || true

NET_ID="$(docker network inspect kind -f '{{.Id}}' 2>/dev/null || true)"
if [ -n "${NET_ID}" ]; then
  BR="br-${NET_ID:0:12}"
  sudo iptables -D DOCKER-USER -i "${BR}" -o veth-sim-host -j ACCEPT 2>/dev/null || true
  sudo iptables -D DOCKER-USER -i veth-sim-host -o "${BR}" -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT 2>/dev/null || true
fi
echo "Simulator stopped."
