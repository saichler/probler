#!/usr/bin/env bash
# Seed a freshly deployed probler (KIND) with live data for local runs and the
# e2e suite: registers the l8opensim targets (k8s/sim-start.sh) and waits until
# the inventory caches actually hold parsed devices, so table/filter/paging
# specs never pass vacuously against an empty cluster. Re-runnable (POSTing an
# existing target is an upsert on TargetId).
#
# K8s data needs no seeding: the admission controller (probler-admission)
# observes the KIND cluster it runs in.
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ADDRESS="${PROBLER_BASE_URL:-https://localhost:2443}"
PREFIX="${PROBLER_API_PREFIX:-/probler}"
SEED_USER="${PROBLER_USER:-operator}"
SEED_PASS="${PROBLER_PASS:-Oper123!}"

echo "Waiting for ${ADDRESS}/login.json ..."
for i in $(seq 1 90); do
  curl -sfk -o /dev/null "${ADDRESS}/login.json" && break
  sleep 2
done
curl -sfk -o /dev/null "${ADDRESS}/login.json" || { echo "web UI not reachable"; exit 1; }

login() {
  curl -sk -X POST "${ADDRESS}/auth" -H 'Content-Type: application/json' \
    -d "{\"user\":\"${SEED_USER}\",\"pass\":\"${SEED_PASS}\"}" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p'
}

# query <endpoint> <l8ql> -> prints HTTP code; body in $QBODY_FILE
QBODY_FILE="$(mktemp)"
trap 'rm -f "${QBODY_FILE}"' EXIT
query() {
  curl -sk -o "${QBODY_FILE}" -w '%{http_code}' -G "${ADDRESS}${PREFIX}$1" \
    -H "Authorization: Bearer ${TOKEN}" --data-urlencode "body={\"text\":\"$2\"}"
}

# The web server serves static files at once but registers each service
# endpoint only when that service announces itself -- wait for a real one.
echo "Waiting for the Targets service endpoint ..."
CODE=000
for i in $(seq 1 120); do
  TOKEN="$(login)"
  if [ -n "${TOKEN}" ]; then
    CODE="$(query /91/Targets 'select * from L8PTarget limit 1 page 0')"
    [ "${CODE}" != "404" ] && [ "${CODE}" != "000" ] && [ "${CODE}" != "503" ] && break
  fi
  sleep 2
done
[ -n "${TOKEN}" ] || { echo "login as ${SEED_USER} failed"; exit 1; }
[ "${CODE}" = "200" ] || { echo "Targets endpoint not ready (HTTP ${CODE})"; cat "${QBODY_FILE}"; exit 1; }

echo "Registering l8opensim targets (base + gpus) ..."
TARGETS_JSON="$(cd "${SCRIPT_DIR}/../go" && go run ./tests/seed base gpus)"
CODE="$(curl -sk -o "${QBODY_FILE}" -w '%{http_code}' -X POST "${ADDRESS}${PREFIX}/91/Targets" \
  -H "Authorization: Bearer ${TOKEN}" -H 'Content-Type: application/json' -d "${TARGETS_JSON}")"
[ "${CODE}" = "200" ] || { echo "POST targets failed (HTTP ${CODE})"; cat "${QBODY_FILE}"; exit 1; }

# total <endpoint> <l8ql> -> keyCount Total (page 0 is the only page with real counts)
total() {
  query "$1" "$2" >/dev/null
  python3 -c '
import json,sys
try:
    d=json.load(open(sys.argv[1]))
except Exception:
    print(0); sys.exit()
c=((d.get("metadata") or {}).get("keyCount") or {}).get("counts") or {}
print(int(c.get("Total", 0)) or len(d.get("list") or []))' "${QBODY_FILE}"
}

wait_for() {
  local label="$1" endpoint="$2" q="$3" min="$4" n=0
  echo "Waiting for ${label} (>= ${min}) ..."
  for i in $(seq 1 150); do
    n="$(total "${endpoint}" "${q}")"
    [ "${n}" -ge "${min}" ] && { echo "  ${label}: ${n}"; return 0; }
    sleep 4
  done
  echo "  ${label}: only ${n} after waiting"; return 1
}

wait_for "network devices" /0/NCache 'select * from NetworkDevice where Id=* limit 1 page 0' 19
wait_for "GPU devices" /2/GCache 'select * from GpuDevice where Id=* limit 1 page 0' 1
wait_for "K8s clusters" /10/KCluster 'select * from K8SCluster' 1
echo "Seed complete."
