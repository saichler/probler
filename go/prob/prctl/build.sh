#!/usr/bin/env bash
set -e
docker build --no-cache --platform=linux/amd64 -t saichler/probler-ptctl:latest .
#docker build --platform=linux/amd64 -t saichler/probler-ptctl:latest .
# docker push saichler/probler-collector:latest
docker run -it saichler/probler-ptctl:latest sh
