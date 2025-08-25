#!/bin/bash

echo "Building TE Application..."

# Build the Go binary
cd ../../../
go build -o go/prob/te_app/te_app ./go/prob/te_app/

# Build Docker image
docker build -t probler/te_app:latest -f go/prob/te_app/Dockerfile .

echo "TE Application build complete!"