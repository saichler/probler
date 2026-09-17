#!/usr/bin/env bash
set -e
TAG="${1:-latest}"
docker build --no-cache --platform=linux/amd64 -t saichler/probler-inv-box:${TAG} .
docker push saichler/probler-inv-box:${TAG}
