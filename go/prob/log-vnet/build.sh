#!/usr/bin/env bash
set -e
TAG="${1:-latest}"
docker build --no-cache --platform=linux/amd64 -t saichler/logs-vnet:${TAG} .
docker push saichler/logs-vnet:${TAG}
