#!/usr/bin/env bash
set -e
docker build --no-cache --platform=linux/amd64 -t saichler/probler-parser:latest .
docker push saichler/probler-parser:latest
