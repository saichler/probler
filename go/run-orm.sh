docker run -d --network host -e NODE_IP="192.168.6.183" -v /data/:/data/ registry.layer-8.dev:44443/probler/probler-orm:latest
echo "Sleeping 10 seconds"
sleep 10
