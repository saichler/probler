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

"${KUBECTL[@]}" delete -f log-agent.yaml
"${KUBECTL[@]}" delete -f webui2.yaml
"${KUBECTL[@]}" delete -f box.yaml
"${KUBECTL[@]}" delete -f k8s.yaml
"${KUBECTL[@]}" delete -f gpu.yaml
"${KUBECTL[@]}" delete -f orm.yaml
"${KUBECTL[@]}" delete -f alarms.yaml
"${KUBECTL[@]}" delete -f parser.yaml
"${KUBECTL[@]}" delete -f collector.yaml
"${KUBECTL[@]}" delete -f vnet.yaml
"${KUBECTL[@]}" delete -f logs.yaml
"${KUBECTL[@]}" delete -f topo.yaml
