docker run -d --network host -e NODE_IP="192.168.6.183" -v /data/:/data/ saichler/probler-orm:latest
echo "Sleeping 10 seconds"
sleep 10
