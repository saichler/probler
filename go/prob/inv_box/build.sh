#!/usr/bin/env bash
set -e
docker build --no-cache --platform=linux/amd64 -t saichler/probler-inv-box:latest .
docker push saichler/probler-inv-box:latest
