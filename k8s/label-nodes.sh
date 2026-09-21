#!/usr/bin/env bash
set -e

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

# Label nodes for probler collector/parser distribution
#   node1 (64G) → 6 collectors + 6 parsers
#   node2 (32G) → 4 collectors + 4 parsers
#   node3 (16G) → 2 collectors + 2 parsers

"${KUBECTL[@]}" label nodes node1 probler-size=large  --overwrite
"${KUBECTL[@]}" label nodes node2 probler-size=medium --overwrite
"${KUBECTL[@]}" label nodes node3 probler-size=small  --overwrite

echo "Labels applied:"
"${KUBECTL[@]}" get nodes -L probler-size
