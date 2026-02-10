kubectl apply -f vnet.yaml
kubectl apply -f logs.yaml
sleep 5
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
kubectl apply -f webui2.yaml
sleep 2
#kubectl apply -f topo.yaml
#kubectl apply -f log-agent.yaml
