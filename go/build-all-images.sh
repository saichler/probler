set -e
cd prob
echo "*** Building Collector ***"
cd ./collector
./build.sh
echo "*** Building Parser ***"
cd ../parser
./build.sh
echo "*** Building Parser ***"
cd ../vnet
./build.sh
echo "*** Building Box ***"
cd ../inv_box
./build.sh
echo "*** Building K8s ***"
cd ../inv_k8s
./build.sh
echo "*** Building GPUs ***"
cd ../inv_gpu
./build.sh
echo "*** Building UI ***"
cd ../newui
./build.sh
echo "*** Building Log Vnet ***"
cd ../log-vnet
./build.sh
echo "*** Building Log Agent ***"
cd ../log-agent
./build.sh
echo "*** Building ORM ***"
cd ../orm
./build.sh
echo "*** Building Alarms ***"
cd ../alarms
./build.sh
echo "*** Building Topology ***"
cd ../topology
./build.sh
