kubectl apply -f vnet.yaml
sleep 5
#pod-logs.sh vnet
kubectl apply -f parser.yaml
sleep 2
kubectl apply -f collector.yaml
sleep 2
kubectl apply -f box.yaml
sleep 2
kubectl apply -f k8s.yaml
sleep 2
kubectl apply -f orm.yaml
sleep 2
kubectl apply -f webui.yaml
sleep 2
kubectl apply -f topo.yaml
