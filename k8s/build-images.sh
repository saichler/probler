#!/usr/bin/env bash
# Build every probler image locally (host arch, --load, NO push) under the names
# kind-start.sh loads into KIND. Use this for local/KIND runs and the e2e suite;
# go/prob/<svc>/build.sh remains the multi-arch build+push path for releases.
#
# Usage: k8s/build-images.sh [service-dir ...]
#   no args   -> security plugin image + all services
#   newui orm -> only those service dirs (e.g. in the e2e fix loop)
#
# The service Dockerfiles copy only main.go and resolve every other package
# (including github.com/saichler/probler/go/...) with `go mod tidy` against
# GitHub, so a change outside a main.go must be pushed before it shows up here.
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROB_DIR="${SCRIPT_DIR}/../go/prob"
L8SECURE_DIR="${SCRIPT_DIR}/../../l8secure"

case "$(uname -m)" in
  x86_64|amd64) ARCH=amd64 ;;
  aarch64|arm64) ARCH=arm64 ;;
  *) echo "unsupported arch $(uname -m)"; exit 1 ;;
esac

# dir:image
ALL=(
  "vnet:saichler/probler-vnet"
  "log-vnet:saichler/logs-vnet"
  "parser:saichler/probler-parser"
  "collector:saichler/probler-collector"
  "inv_box:saichler/probler-inv-box"
  "inv_gpu:saichler/probler-inv-gpu"
  "inv_k8s:saichler/probler-inv-k8s"
  "orm:saichler/probler-orm"
  "alarms:saichler/probler-alarms"
  "newui:saichler/probler-webui2"
  "log-agent:saichler/probler-logagent"
  "topology:saichler/probler-topo"
  "adcon:saichler/probler-admission"
)

build_security() {
  # The security provider is a Go plugin: host binaries and loader.so must be
  # built by the same toolchain, so rebuild it whenever the builder image moves.
  echo "*** Building probler security plugin image (l8secure) ***"
  (cd "${L8SECURE_DIR}/security" && ./build.sh probler "${ARCH}")
  docker tag probler-security:latest saichler/probler-security:latest
  # orm/alarms run on the postgres variant, built FROM probler-security:latest.
  (cd "${L8SECURE_DIR}/postgres" && ./build.sh probler "${ARCH}")
  docker tag probler-postgres:latest saichler/probler-postgres:latest
}

build_one() {
  local dir="$1" image="$2"
  echo "*** Building ${image} (${dir}) ***"
  (cd "${PROB_DIR}/${dir}" && docker buildx build --no-cache --load \
      --platform="linux/${ARCH}" -t "${image}:latest" .)
}

# PARALLEL=N builds N service images at a time (each `go mod tidy` against
# GitHub dominates the build time). Per-image logs go to k8s/.build-<dir>.log.
PARALLEL="${PARALLEL:-4}"

build_many() {
  if [ "${PARALLEL}" -le 1 ]; then
    for d in "$@"; do "$0" "$d"; done
    return
  fi
  printf '%s\n' "$@" | xargs -P "${PARALLEL}" -I{} sh -c \
    '"$0" "$1" > "$2/.build-$1.log" 2>&1 && echo "  OK   $1" || { echo "  FAIL $1 (see k8s/.build-$1.log)"; exit 1; }' \
    "$0" {} "${SCRIPT_DIR}"
}

if [ $# -eq 0 ]; then
  build_security
  dirs=()
  for entry in "${ALL[@]}"; do dirs+=("${entry%%:*}"); done
  build_many "${dirs[@]}"
elif [ $# -gt 1 ]; then
  for want in "$@"; do [ "$want" = "security" ] && build_security; done
  dirs=()
  for want in "$@"; do [ "$want" != "security" ] && dirs+=("$want"); done
  build_many "${dirs[@]}"
else
  for want in "$@"; do
    if [ "$want" = "security" ]; then build_security; continue; fi
    found=""
    for entry in "${ALL[@]}"; do
      if [ "${entry%%:*}" = "$want" ]; then build_one "$want" "${entry##*:}"; found=1; fi
    done
    [ -n "$found" ] || { echo "unknown service dir: $want"; exit 1; }
  done
fi
echo "Done."
