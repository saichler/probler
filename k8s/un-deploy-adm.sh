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

"${KUBECTL[@]}" delete -f "${ADMISSION_YAML}" --ignore-not-found
"${KUBECTL[@]}" delete -f "${WEBHOOK_YAML}" --ignore-not-found

