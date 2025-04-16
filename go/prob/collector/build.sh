#!/usr/bin/env bash
set -e
docker build --no-cache --platform=linux/amd64 -t saichler/probler-collector:latest .
docker push saichler/probler-collector:latest
