#!/usr/bin/env bash
# Use the protoc image to run protoc.sh and generate the bindings.

wget https://raw.githubusercontent.com/saichler/l8types/refs/heads/main/proto/api.proto

docker run --user "$(id -u):$(id -g)" -e PROTO=k8s.proto --mount type=bind,source="$PWD",target=/home/proto/ -it saichler/protoc:latest
docker run --user "$(id -u):$(id -g)" -e PROTO=kubernetes.proto --mount type=bind,source="$PWD",target=/home/proto/ -it saichler/protoc:latest
docker run --user "$(id -u):$(id -g)" -e PROTO=inventory.proto --mount type=bind,source="$PWD",target=/home/proto/ -it saichler/protoc:latest

rm api.proto

# Now move the generated bindings to the models directory and clean up
mkdir -p ../go/types
mv ./types/*.pb.go ../go/types/.
rm -rf ./types

cd ../go
find . -name "*.go" -type f -exec sed -i 's|"./types/l8services"|"github.com/saichler/l8types/go/types/l8services"|g' {} +
find . -name "*.go" -type f -exec sed -i 's|"./types/l8api"|"github.com/saichler/l8types/go/types/l8api"|g' {} +