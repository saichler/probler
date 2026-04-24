// Probler Kubernetes Column Definitions — Storage, Config, RBAC, vCluster, Istio, CRDs, Events
window.ProblerK8s = window.ProblerK8s || {};
ProblerK8s.columns = ProblerK8s.columns || {};

// --- Storage (SA 12) ---

ProblerK8s.columns.K8SPersistentVolume = [
    { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
    { key: 'name', label: 'NAME', filterKey: 'name' },
    { key: 'capacity', label: 'CAPACITY' },
    { key: 'accessModes', label: 'ACCESS MODES' },
    { key: 'reclaimPolicy', label: 'RECLAIM POLICY', filterKey: 'reclaimPolicy' },
    {
        key: 'status', label: 'STATUS', filterKey: 'status',
        render: function(item) {
            var txt = ProblerK8s.enums.getPvPhaseText(item.status);
            var cls = ProblerK8s.enums.getPvPhaseClass(item.status);
            return '<span class="status-badge ' + cls + '">' + txt + '</span>';
        }
    },
    { key: 'claim', label: 'CLAIM', filterKey: 'claim' },
    { key: 'storageClass', label: 'STORAGECLASS', filterKey: 'storageClass' },
    { key: 'volumeMode', label: 'VOLUME MODE' },
    { key: 'reason', label: 'REASON' },
    { key: 'age', label: 'AGE' }
];

ProblerK8s.columns.K8SPersistentVolumeClaim = [
    { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
    { key: 'namespace', label: 'NAMESPACE', filterKey: 'namespace' },
    { key: 'name', label: 'NAME', filterKey: 'name' },
    {
        key: 'status', label: 'STATUS', filterKey: 'status',
        render: function(item) {
            var txt = ProblerK8s.enums.getPvPhaseText(item.status);
            var cls = ProblerK8s.enums.getPvPhaseClass(item.status);
            return '<span class="status-badge ' + cls + '">' + txt + '</span>';
        }
    },
    { key: 'volume', label: 'VOLUME', filterKey: 'volume' },
    { key: 'capacity', label: 'CAPACITY' },
    { key: 'accessModes', label: 'ACCESS MODES' },
    { key: 'storageClass', label: 'STORAGECLASS', filterKey: 'storageClass' },
    { key: 'volumeMode', label: 'VOLUME MODE' },
    { key: 'age', label: 'AGE' }
];

ProblerK8s.columns.K8SStorageClass = [
    { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
    { key: 'name', label: 'NAME', filterKey: 'name' },
    { key: 'provisioner', label: 'PROVISIONER', filterKey: 'provisioner' },
    { key: 'reclaimPolicy', label: 'RECLAIM POLICY', filterKey: 'reclaimPolicy' },
    { key: 'volumeBindingMode', label: 'VOLUME BINDING MODE' },
    {
        key: 'allowVolumeExpansion', label: 'EXPANSION',
        render: function(item) {
            return item.allowVolumeExpansion ? 'Yes' : 'No';
        }
    },
    { key: 'age', label: 'AGE' }
];

// --- Configuration (SA 13) ---

ProblerK8s.columns.K8SConfigMap = [
    { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
    { key: 'namespace', label: 'NAMESPACE', filterKey: 'namespace' },
    { key: 'name', label: 'NAME', filterKey: 'name' },
    { key: 'dataCount', label: 'DATA' },
    { key: 'age', label: 'AGE' }
];

ProblerK8s.columns.K8SSecret = [
    { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
    { key: 'namespace', label: 'NAMESPACE', filterKey: 'namespace' },
    { key: 'name', label: 'NAME', filterKey: 'name' },
    { key: 'type', label: 'TYPE', filterKey: 'type' },
    { key: 'dataCount', label: 'DATA' },
    { key: 'age', label: 'AGE' }
];

ProblerK8s.columns.K8SResourceQuota = [
    { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
    { key: 'namespace', label: 'NAMESPACE', filterKey: 'namespace' },
    { key: 'name', label: 'NAME', filterKey: 'name' },
    { key: 'requestCpu', label: 'REQ CPU' },
    { key: 'usedRequestCpu', label: 'USED CPU' },
    { key: 'requestMemory', label: 'REQ MEM' },
    { key: 'usedRequestMemory', label: 'USED MEM' },
    { key: 'limitCpu', label: 'LIM CPU' },
    { key: 'limitMemory', label: 'LIM MEM' },
    { key: 'age', label: 'AGE' }
];

ProblerK8s.columns.K8SLimitRange = [
    { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
    { key: 'namespace', label: 'NAMESPACE', filterKey: 'namespace' },
    { key: 'name', label: 'NAME', filterKey: 'name' },
    { key: 'age', label: 'AGE' }
];

ProblerK8s.columns.K8SPodDisruptionBudget = [
    { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
    { key: 'namespace', label: 'NAMESPACE', filterKey: 'namespace' },
    { key: 'name', label: 'NAME', filterKey: 'name' },
    { key: 'minAvailable', label: 'MIN AVAILABLE' },
    { key: 'maxUnavailable', label: 'MAX UNAVAILABLE' },
    { key: 'allowedDisruptions', label: 'ALLOWED DISRUPTIONS' },
    { key: 'age', label: 'AGE' }
];

// --- Access Control (SA 14) ---

ProblerK8s.columns.K8SServiceAccount = [
    { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
    { key: 'namespace', label: 'NAMESPACE', filterKey: 'namespace' },
    { key: 'name', label: 'NAME', filterKey: 'name' },
    { key: 'secrets', label: 'SECRETS' },
    { key: 'age', label: 'AGE' }
];

ProblerK8s.columns.K8SRole = [
    { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
    { key: 'namespace', label: 'NAMESPACE', filterKey: 'namespace' },
    { key: 'name', label: 'NAME', filterKey: 'name' },
    { key: 'age', label: 'AGE' }
];

ProblerK8s.columns.K8SClusterRole = [
    { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
    { key: 'name', label: 'NAME', filterKey: 'name' },
    { key: 'age', label: 'AGE' }
];

ProblerK8s.columns.K8SRoleBinding = [
    { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
    { key: 'namespace', label: 'NAMESPACE', filterKey: 'namespace' },
    { key: 'name', label: 'NAME', filterKey: 'name' },
    { key: 'roleRef', label: 'ROLE REF', filterKey: 'roleRef' },
    { key: 'age', label: 'AGE' }
];

ProblerK8s.columns.K8SClusterRoleBinding = [
    { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
    { key: 'name', label: 'NAME', filterKey: 'name' },
    { key: 'roleRef', label: 'ROLE REF', filterKey: 'roleRef' },
    { key: 'age', label: 'AGE' }
];

// --- vCluster (SA 17) ---

ProblerK8s.columns.K8SVCluster = [
    { key: 'clusterName', label: 'HOST CLUSTER', filterKey: 'clusterName' },
    { key: 'namespace', label: 'NAMESPACE', filterKey: 'namespace' },
    { key: 'name', label: 'NAME', filterKey: 'name' },
    {
        key: 'status', label: 'STATUS', filterKey: 'status',
        render: function(item) {
            var cls = (item.status === 'Running') ? 'status-operational' : 'status-warning';
            return '<span class="status-badge ' + cls + '">' + (item.status || 'Unknown') + '</span>';
        }
    },
    { key: 'k8sVersion', label: 'K8S VERSION' },
    { key: 'distro', label: 'DISTRO', filterKey: 'distro' },
    { key: 'connected', label: 'CONNECTED' },
    { key: 'syncedPods', label: 'SYNCED PODS' },
    { key: 'syncedServices', label: 'SYNCED SVCS' },
    { key: 'syncedIngresses', label: 'SYNCED ING' },
    { key: 'age', label: 'AGE' }
];

// --- Istio (SA 18) ---

ProblerK8s.columns.IstioVirtualService = [
    { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
    { key: 'namespace', label: 'NAMESPACE', filterKey: 'namespace' },
    { key: 'name', label: 'NAME', filterKey: 'name' },
    { key: 'gateways', label: 'GATEWAYS' },
    { key: 'hosts', label: 'HOSTS' },
    { key: 'age', label: 'AGE' }
];

ProblerK8s.columns.IstioDestinationRule = [
    { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
    { key: 'namespace', label: 'NAMESPACE', filterKey: 'namespace' },
    { key: 'name', label: 'NAME', filterKey: 'name' },
    { key: 'host', label: 'HOST', filterKey: 'host' },
    { key: 'age', label: 'AGE' }
];

ProblerK8s.columns.IstioGateway = [
    { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
    { key: 'namespace', label: 'NAMESPACE', filterKey: 'namespace' },
    { key: 'name', label: 'NAME', filterKey: 'name' },
    { key: 'servers', label: 'SERVERS' },
    { key: 'selector', label: 'SELECTOR', filterKey: 'selector' },
    { key: 'age', label: 'AGE' }
];

ProblerK8s.columns.IstioServiceEntry = [
    { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
    { key: 'namespace', label: 'NAMESPACE', filterKey: 'namespace' },
    { key: 'name', label: 'NAME', filterKey: 'name' },
    { key: 'hosts', label: 'HOSTS' },
    { key: 'location', label: 'LOCATION', filterKey: 'location' },
    { key: 'resolution', label: 'RESOLUTION', filterKey: 'resolution' },
    { key: 'ports', label: 'PORTS' },
    { key: 'age', label: 'AGE' }
];

ProblerK8s.columns.IstioPeerAuthentication = [
    { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
    { key: 'namespace', label: 'NAMESPACE', filterKey: 'namespace' },
    { key: 'name', label: 'NAME', filterKey: 'name' },
    { key: 'mode', label: 'MODE', filterKey: 'mode' },
    { key: 'age', label: 'AGE' }
];

ProblerK8s.columns.IstioAuthorizationPolicy = [
    { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
    { key: 'namespace', label: 'NAMESPACE', filterKey: 'namespace' },
    { key: 'name', label: 'NAME', filterKey: 'name' },
    { key: 'action', label: 'ACTION', filterKey: 'action' },
    { key: 'age', label: 'AGE' }
];

ProblerK8s.columns.IstioSidecar = [
    { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
    { key: 'namespace', label: 'NAMESPACE', filterKey: 'namespace' },
    { key: 'name', label: 'NAME', filterKey: 'name' },
    { key: 'age', label: 'AGE' }
];

ProblerK8s.columns.IstioEnvoyFilter = [
    { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
    { key: 'namespace', label: 'NAMESPACE', filterKey: 'namespace' },
    { key: 'name', label: 'NAME', filterKey: 'name' },
    { key: 'age', label: 'AGE' }
];

// --- CRDs (SA 19) ---

ProblerK8s.columns.K8SCRD = [
    { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
    { key: 'name', label: 'NAME', filterKey: 'name' },
    { key: 'group', label: 'GROUP', filterKey: 'group' },
    { key: 'version', label: 'VERSION', filterKey: 'version' },
    { key: 'scope', label: 'SCOPE', filterKey: 'scope' },
    { key: 'age', label: 'AGE' }
];

// --- Events (SA 20) ---

ProblerK8s.columns.K8SEvent = [
    { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
    { key: 'namespace', label: 'NAMESPACE', filterKey: 'namespace' },
    {
        key: 'type', label: 'TYPE', filterKey: 'type',
        render: function(item) {
            var cls = item.type === 'Normal' ? 'status-operational' : 'status-warning';
            return '<span class="status-badge ' + cls + '">' + (item.type || '') + '</span>';
        }
    },
    { key: 'reason', label: 'REASON', filterKey: 'reason' },
    { key: 'object', label: 'OBJECT', filterKey: 'object' },
    { key: 'message', label: 'MESSAGE' },
    { key: 'source', label: 'SOURCE' },
    { key: 'count', label: 'COUNT' },
    { key: 'firstSeen', label: 'FIRST SEEN' },
    { key: 'lastSeen', label: 'LAST SEEN' }
];
