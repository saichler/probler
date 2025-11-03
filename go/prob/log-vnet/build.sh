#!/usr/bin/env bash
set -e
docker build --no-cache --platform=linux/amd64 -t saichler/log-vnet:latest .
docker push saichler/log-vnet:latest
