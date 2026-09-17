#!/usr/bin/env bash
set -e
TAG="${1:-latest}"
docker build --no-cache --platform=linux/amd64 -t saichler/probler-vnet:${TAG} .
#docker build --platform=linux/amd64 -t saichler/probler-vnet:${TAG} .
docker push saichler/probler-vnet:${TAG}
