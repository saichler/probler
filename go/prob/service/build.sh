#!/usr/bin/env bash
set -e
docker build --platform=linux/amd64 -t saichler/probler-vnic:latest .
docker push saichler/probler-vnic:latest
