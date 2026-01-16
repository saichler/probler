cd demo
rm -rf web
cp -r ../prob/newui/web ./.

if [ -z "$1" ]; then
  echo "Starting all demo services..."
  pkill demo 2>/dev/null
  docker stop $(docker ps -q) 2>/dev/null
  sleep 1

  # Start background services with nohup so they survive when webui_demo exits
  nohup ./vnet_demo > vnet_demo.log 2>&1 &
  nohup ./logvnet_demo > logvnet_demo.log 2>&1 &
  sleep 5
  nohup ./orm_demo > orm_demo.log 2>&1 &
  nohup ./collector_demo > collector_demo.log 2>&1 &
  nohup ./parser_demo > parser_demo.log 2>&1 &
  nohup ./box_demo > box_demo.log 2>&1 &
  nohup ./k8s_demo > k8s_demo.log 2>&1 &
  nohup ./topology_demo > topology_demo.log 2>&1 &
  nohup ./logagent_demo > logagent_demo.log 2>&1 &
  #../run-orm.sh
  echo "Background services started."
else
  echo "Running webui_demo only (background services should already be running)..."
fi

echo "Starting webui_demo..."
./webui_demo
