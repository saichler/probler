TAG="${1:-latest}"
cd prob
echo "*** Building Collector ***"
cd ./collector
if ! ./build.sh "$TAG"; then echo "FAILED to build Collector"; exit 1; fi
echo "*** Building Parser ***"
cd ../parser
if ! ./build.sh "$TAG"; then echo "FAILED to build Parser"; exit 1; fi
echo "*** Building Vnet ***"
cd ../vnet
if ! ./build.sh "$TAG"; then echo "FAILED to build Vnet"; exit 1; fi
echo "*** Building Box ***"
cd ../inv_box
if ! ./build.sh "$TAG"; then echo "FAILED to build Box"; exit 1; fi
echo "*** Building K8s ***"
cd ../inv_k8s
if ! ./build.sh "$TAG"; then echo "FAILED to build K8s"; exit 1; fi
echo "*** Building GPUs ***"
cd ../inv_gpu
if ! ./build.sh "$TAG"; then echo "FAILED to build GPUs"; exit 1; fi
echo "*** Building UI ***"
cd ../newui
if ! ./build.sh "$TAG"; then echo "FAILED to build UI"; exit 1; fi
echo "*** Building Log Vnet ***"
cd ../log-vnet
if ! ./build.sh "$TAG"; then echo "FAILED to build Log Vnet"; exit 1; fi
echo "*** Building Log Agent ***"
cd ../log-agent
if ! ./build.sh "$TAG"; then echo "FAILED to build Log Agent"; exit 1; fi
echo "*** Building ORM ***"
cd ../orm
if ! ./build.sh "$TAG"; then echo "FAILED to build ORM"; exit 1; fi
echo "*** Building Alarms ***"
cd ../alarms
if ! ./build.sh "$TAG"; then echo "FAILED to build Alarms"; exit 1; fi
echo "*** Building Topology ***"
cd ../topology
if ! ./build.sh "$TAG"; then echo "FAILED to build Topology"; exit 1; fi
