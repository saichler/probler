#!/usr/bin/env bash
set -e

# Label nodes for probler collector/parser distribution
#   node1 (64G) → 6 collectors + 6 parsers
#   node2 (32G) → 4 collectors + 4 parsers
#   node3 (16G) → 2 collectors + 2 parsers

kubectl label nodes node1 probler-size=large  --overwrite
kubectl label nodes node2 probler-size=medium --overwrite
kubectl label nodes node3 probler-size=small  --overwrite

echo "Labels applied:"
kubectl get nodes -L probler-size
