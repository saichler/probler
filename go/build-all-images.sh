set -e
cd prob
cd ./collector
./build.sh
cd ../parser
./build.sh
cd ../vnet
./build.sh
cd ../inv_box
./build.sh
cd ../inv_k8s
./build.sh
cd ../newui
./build.sh
cd ../orm
./build.sh
cd ../topology
./build.sh
