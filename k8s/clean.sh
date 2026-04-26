#set -e
./un-deploy.sh
remote_sudo.sh 'rm -rf /data/logs/probler'
remote_sudo.sh 'rm -rf /data/logsdb/probler'
remote_sudo.sh 'rm -rf /data/postgres/problerdb'
remote_sudo.sh 'rm -rf /data/postgres/probleralarms'
remote_sudo.sh 'rm -rf /data/.probler'

#./deploy.sh
