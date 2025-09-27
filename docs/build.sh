#!/usr/bin/env bash
set -e
docker build --no-cache --platform=linux/amd64 -t saichler/layer8-webui:latest .
docker push saichler/layer8-webui:latest
