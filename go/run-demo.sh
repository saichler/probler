cd demo
rm -rf web
cp -r ../prob/newui/web ./.

if [ -z "$1" ]; then
  echo "Starting all demo services..."
  pkill demo 2>/dev/null
  #docker stop $(docker ps -q) 2>/dev/null
  sleep 1

  # Start background services with nohup so they survive when webui_demo exits
  nohup ./vnet_demo &
  nohup ./logvnet_demo &
  sleep 5
  nohup ./orm_demo local &
  nohup ./alarms_demo &
  nohup ./collector_demo &
  nohup ./parser_demo &
  nohup ./box_demo &
  nohup ./k8s_demo &
  nohup ./gpu_demo &
  nohup ./topology_demo & 
  nohup ./logagent_demo &
  echo "Background services started."
else
  echo "Running webui_demo only (background services should already be running)..."
fi

echo "Starting webui_demo..."
./webui_demo
