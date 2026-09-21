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

"${KUBECTL[@]}" apply -f vnet.yaml
"${KUBECTL[@]}" apply -f logs.yaml
sleep 5
"${KUBECTL[@]}" apply -f parser.yaml
sleep 2
"${KUBECTL[@]}" apply -f collector.yaml
sleep 2
"${KUBECTL[@]}" apply -f box.yaml
sleep 2
"${KUBECTL[@]}" apply -f gpu.yaml
sleep 2
"${KUBECTL[@]}" apply -f k8s.yaml
sleep 2
"${KUBECTL[@]}" apply -f orm.yaml
sleep 2
"${KUBECTL[@]}" apply -f alarms.yaml
sleep 2
"${KUBECTL[@]}" apply -f webui2.yaml
#sleep 2
#kubectl apply -f topo.yaml
#kubectl apply -f log-agent.yaml
