#!/usr/bin/env bash
set -euo pipefail

# Resolve the target context ONCE and pass it explicitly to every call below.
# This deploys to whatever cluster is current, so it cannot hardcode one --
# but leaving it implicit means a sibling project creating a kind cluster
# mid-run silently retargets it, and the target can even change between two
# calls in this same script. Override with KUBE_CONTEXT=... .
KUBE_CONTEXT="${KUBE_CONTEXT:-$(kubectl config current-context 2>/dev/null)}"
if [ -z "$KUBE_CONTEXT" ]; then
  echo "error: no current kubectl context -- set KUBE_CONTEXT=<context>" >&2
  exit 1
fi
echo "Targeting kubectl context: ${KUBE_CONTEXT}"
KUBECTL=(kubectl --context "${KUBE_CONTEXT}")

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEBHOOK_YAML="${SCRIPT_DIR}/validating-webhook.yaml"
ADMISSION_YAML="${SCRIPT_DIR}/admission-control.yaml"

"${KUBECTL[@]}" apply -f "${WEBHOOK_YAML}"

# The bootstrap job is intentionally recreated on each deploy so it can
# refresh the TLS secret and patch the webhook caBundle deterministically.
"${KUBECTL[@]}" delete job -n probler l8collector-admission-bootstrap --ignore-not-found

"${KUBECTL[@]}" apply -f "${ADMISSION_YAML}"

"${KUBECTL[@]}" wait --for=condition=complete -n probler job/l8collector-admission-bootstrap --timeout=180s
"${KUBECTL[@]}" wait --for=condition=available -n probler deployment/l8collector-admission --timeout=180s

