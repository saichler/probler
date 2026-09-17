#!/usr/bin/env bash
set -e
TAG="${1:-latest}"
docker build --no-cache --platform=linux/amd64 -t saichler/probler-collector:${TAG} .
docker push saichler/probler-collector:${TAG}
