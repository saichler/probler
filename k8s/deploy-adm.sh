#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEBHOOK_YAML="${SCRIPT_DIR}/validating-webhook.yaml"
ADMISSION_YAML="${SCRIPT_DIR}/admission-control.yaml"

kubectl apply -f "${WEBHOOK_YAML}"

# The bootstrap job is intentionally recreated on each deploy so it can
# refresh the TLS secret and patch the webhook caBundle deterministically.
kubectl delete job -n probler l8collector-admission-bootstrap --ignore-not-found

kubectl apply -f "${ADMISSION_YAML}"

kubectl wait --for=condition=complete -n probler job/l8collector-admission-bootstrap --timeout=180s
kubectl wait --for=condition=available -n probler deployment/l8collector-admission --timeout=180s

