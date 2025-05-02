#!/usr/bin/env bash
set -e
docker build --no-cache --platform=linux/amd64 -t saichler/probler-inv-k8s:latest .
docker push saichler/probler-inv-k8s:latest
