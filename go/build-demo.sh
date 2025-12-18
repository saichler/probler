#!/usr/bin/env bash
export GOOS=$1
export GOARCH=$2


# Fail on errors and don't open cover file
set -e
# clean up
rm -rf go.sum
rm -rf go.mod
rm -rf vendor

# fetch dependencies
go mod init
GOPROXY=direct GOPRIVATE=github.com go mod tidy
go mod vendor

mkdir -p demo
echo "Building Vnet"
cd ./prob/vnet/
go build -o vnet_demo
mv ./vnet_demo ../../demo/.

echo "Building Log Vnet"
cd ../log-vnet/
go build -o logvnet_demo
mv ./logvnet_demo ../../demo/.

echo "Building Orm"
cd ../orm/
go build -o orm_demo
mv ./orm_demo ../../demo/.

echo "Building Collector"
cd ../collector/
go build -o collector_demo
mv ./collector_demo ../../demo/.

echo "Building Parser"
cd ../parser/
go build -o parser_demo
mv ./parser_demo ../../demo/.

echo "Building Box"
cd ../inv_box/
go build -o box_demo
mv ./box_demo ../../demo/.

echo "Building K8s"
cd ../inv_k8s/
go build -o k8s_demo
mv ./k8s_demo ../../demo/.

echo "Building Log Agent"
cd ../log-agent/
go build -o logagent_demo
mv ./logagent_demo ../../demo/.

echo "Building Topology"
cd ../topology/
go build -o topology_demo
mv ./topology_demo ../../demo/.

echo "Building Webui"
cd ../newui/
go build -o webui_demo
mv ./webui_demo ../../demo/.
cp -r ./web ../../demo/.
