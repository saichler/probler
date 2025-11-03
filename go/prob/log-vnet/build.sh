#!/usr/bin/env bash
set -e
docker build --no-cache --platform=linux/amd64 -t saichler/logs-vnet:latest .
docker push saichler/logs-vnet:latest
