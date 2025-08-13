#!/usr/bin/env bash
set -e
rm -rf web
cp -r ../../../ui ./web
docker build --no-cache --platform=linux/amd64 -t saichler/probler-vnet:latest .
#docker build --platform=linux/amd64 -t saichler/probler-vnet:latest .
docker push saichler/probler-vnet:latest
