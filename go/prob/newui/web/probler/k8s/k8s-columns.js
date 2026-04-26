// Probler Kubernetes Column Definitions — Core, Workloads, Networking
window.ProblerK8s = window.ProblerK8s || {};
ProblerK8s.columns = {};

// --- Overview (SA 1) ---

ProblerK8s.columns.K8SCluster = [
    { key: 'name', label: 'NAME', filterKey: 'name' },
    { key: 'k8sVersion', label: 'K8S VERSION' },
    { key: 'platform', label: 'PLATFORM', filterKey: 'platform' }
];

// --- Workloads (SA 10) ---

ProblerK8s.columns.K8SPod = [
    { key: 'namespace', label: 'NAMESPACE', filterKey: 'namespace' },
    { key: 'name', label: 'NAME', filterKey: 'name' },
    {
        key: 'ready', label: 'READY',
        render: function(item) {
            var value = item.ready;
            var count, outof;
            if (value && typeof value === 'object') {
                count = value.count || 0;
                outof = value.outof || 0;
            } else if (typeof value === 'string') {
                var parts = value.split('/');
                count = parseInt(parts[0]) || 0;
                outof = parseInt(parts[1]) || 0;
            } else {
                count = 0; outof = 0;
            }
            var cls = count === outof ? 'status-operational' : count > 0 ? 'status-warning' : 'status-critical';
            return '<span class="status-badge ' + cls + '">' + count + '/' + outof + '</span>';
        }
    },
    {
        key: 'status', label: 'STATUS', filterKey: 'status',
        render: function(item) {
            var txt = ProblerK8s.enums.getPodStatusText(item.status);
            var cls = ProblerK8s.enums.getPodStatusClass(txt);
            return '<span class="status-badge ' + cls + '">' + txt + '</span>';
        }
    },
    {
        key: 'restarts', label: 'RESTARTS',
        render: function(item) {
            var value = item.restarts;
            if (typeof value === 'object' && value !== null) {
                return '<span>' + (value.count || 0) + ' ' + (value.ago || '') + '</span>';
            }
            return '<span>' + value + '</span>';
        }
    },
    { key: 'age', label: 'AGE' },
    { key: 'ip', label: 'IP', filterKey: 'ip' },
    { key: 'node', label: 'NODE', filterKey: 'node' },
    { key: 'nominatedNode', label: 'NOMINATED NODE', filterKey: 'nominatedNode' },
    { key: 'readinessGates', label: 'READINESS GATES' }
];

ProblerK8s.columns.K8SDeployment = [
    { key: 'namespace', label: 'NAMESPACE', filterKey: 'namespace' },
    { key: 'name', label: 'NAME', filterKey: 'name' },
    { key: 'ready', label: 'READY' },
    { key: 'upToDate', label: 'UP-TO-DATE' },
    { key: 'available', label: 'AVAILABLE' },
    { key: 'age', label: 'AGE' },
    { key: 'containers', label: 'CONTAINERS', filterKey: 'containers' },
    { key: 'images', label: 'IMAGES', filterKey: 'images' },
    { key: 'selector', label: 'SELECTOR', filterKey: 'selector' }
];

ProblerK8s.columns.K8SStatefulSet = [
    { key: 'namespace', label: 'NAMESPACE', filterKey: 'namespace' },
    { key: 'name', label: 'NAME', filterKey: 'name' },
    { key: 'ready', label: 'READY' },
    { key: 'age', label: 'AGE' },
    { key: 'containers', label: 'CONTAINERS', filterKey: 'containers' },
    { key: 'images', label: 'IMAGES', filterKey: 'images' }
];

ProblerK8s.columns.K8SDaemonSet = [
    { key: 'namespace', label: 'NAMESPACE', filterKey: 'namespace' },
    { key: 'name', label: 'NAME', filterKey: 'name' },
    { key: 'desired', label: 'DESIRED' },
    { key: 'current', label: 'CURRENT' },
    { key: 'ready', label: 'READY' },
    { key: 'upToDate', label: 'UP-TO-DATE' },
    { key: 'available', label: 'AVAILABLE' },
    { key: 'nodeSelector', label: 'NODE SELECTOR', filterKey: 'nodeSelector' },
    { key: 'age', label: 'AGE' },
    { key: 'containers', label: 'CONTAINERS', filterKey: 'containers' },
    { key: 'images', label: 'IMAGES', filterKey: 'images' },
    { key: 'selector', label: 'SELECTOR', filterKey: 'selector' }
];

ProblerK8s.columns.K8SReplicaSet = [
    { key: 'namespace', label: 'NAMESPACE', filterKey: 'namespace' },
    { key: 'name', label: 'NAME', filterKey: 'name' },
    { key: 'desired', label: 'DESIRED' },
    { key: 'current', label: 'CURRENT' },
    { key: 'ready', label: 'READY' },
    { key: 'age', label: 'AGE' }
];

ProblerK8s.columns.K8SJob = [
    { key: 'namespace', label: 'NAMESPACE', filterKey: 'namespace' },
    { key: 'name', label: 'NAME', filterKey: 'name' },
    { key: 'completions', label: 'COMPLETIONS' },
    { key: 'duration', label: 'DURATION' },
    {
        key: 'condition', label: 'CONDITION', filterKey: 'condition',
        render: function(item) {
            var txt = ProblerK8s.enums.getJobConditionText(item.condition);
            var cls = ProblerK8s.enums.getJobConditionClass(item.condition);
            return '<span class="status-badge ' + cls + '">' + txt + '</span>';
        }
    },
    { key: 'age', label: 'AGE' }
];

ProblerK8s.columns.K8SCronJob = [
    { key: 'namespace', label: 'NAMESPACE', filterKey: 'namespace' },
    { key: 'name', label: 'NAME', filterKey: 'name' },
    { key: 'schedule', label: 'SCHEDULE', filterKey: 'schedule' },
    { key: 'lastSchedule', label: 'LAST SCHEDULE' },
    {
        key: 'suspend', label: 'SUSPEND',
        render: function(item) {
            var cls = item.suspend ? 'status-warning' : 'status-operational';
            return '<span class="status-badge ' + cls + '">' + (item.suspend ? 'Yes' : 'No') + '</span>';
        }
    },
    { key: 'active', label: 'ACTIVE' },
    { key: 'age', label: 'AGE' }
];

ProblerK8s.columns.K8SHPA = [
    { key: 'namespace', label: 'NAMESPACE', filterKey: 'namespace' },
    { key: 'name', label: 'NAME', filterKey: 'name' },
    { key: 'reference', label: 'REFERENCE', filterKey: 'reference' },
    { key: 'targets', label: 'TARGETS' },
    { key: 'minReplicas', label: 'MIN' },
    { key: 'maxReplicas', label: 'MAX' },
    { key: 'currentReplicas', label: 'CURRENT' },
    { key: 'age', label: 'AGE' }
];

// --- Networking (SA 11) ---

ProblerK8s.columns.K8SService = [
    { key: 'namespace', label: 'NAMESPACE', filterKey: 'namespace' },
    { key: 'name', label: 'NAME', filterKey: 'name' },
    { key: 'type', label: 'TYPE', filterKey: 'type' },
    { key: 'clusterIp', label: 'CLUSTER-IP', filterKey: 'clusterIp' },
    { key: 'externalIp', label: 'EXTERNAL-IP', filterKey: 'externalIp' },
    { key: 'ports', label: 'PORT(S)', filterKey: 'ports' },
    { key: 'age', label: 'AGE' },
    { key: 'selector', label: 'SELECTOR', filterKey: 'selector' }
];

ProblerK8s.columns.K8SIngress = [
    { key: 'namespace', label: 'NAMESPACE', filterKey: 'namespace' },
    { key: 'name', label: 'NAME', filterKey: 'name' },
    { key: 'className', label: 'CLASS', filterKey: 'className' },
    { key: 'hosts', label: 'HOSTS', filterKey: 'hosts' },
    { key: 'address', label: 'ADDRESS', filterKey: 'address' },
    { key: 'ports', label: 'PORTS' },
    { key: 'age', label: 'AGE' }
];

ProblerK8s.columns.K8SNetworkPolicy = [
    { key: 'namespace', label: 'NAMESPACE', filterKey: 'namespace' },
    { key: 'name', label: 'NAME', filterKey: 'name' },
    { key: 'podSelector', label: 'POD-SELECTOR', filterKey: 'podSelector' },
    { key: 'age', label: 'AGE' }
];

ProblerK8s.columns.K8SEndpoints = [
    { key: 'namespace', label: 'NAMESPACE', filterKey: 'namespace' },
    { key: 'name', label: 'NAME', filterKey: 'name' },
    { key: 'endpoints', label: 'ENDPOINTS' },
    { key: 'age', label: 'AGE' }
];

ProblerK8s.columns.K8SEndpointSlice = [
    { key: 'namespace', label: 'NAMESPACE', filterKey: 'namespace' },
    { key: 'name', label: 'NAME', filterKey: 'name' },
    { key: 'addressType', label: 'ADDRESS TYPE', filterKey: 'addressType' },
    { key: 'ports', label: 'PORTS' },
    { key: 'endpoints', label: 'ENDPOINTS' },
    { key: 'age', label: 'AGE' }
];

ProblerK8s.columns.K8SIngressClass = [
    { key: 'name', label: 'NAME', filterKey: 'name' },
    { key: 'controller', label: 'CONTROLLER', filterKey: 'controller' },
    { key: 'age', label: 'AGE' }
];

// --- Nodes (SA 15) ---

ProblerK8s.columns.K8SNode = [
    { key: 'name', label: 'NAME', filterKey: 'name' },
    { key: 'roles', label: 'ROLES', filterKey: 'roles' },
    {
        key: 'status', label: 'STATUS', filterKey: 'status',
        render: function(item) {
            // Non-silent-fallback rule: '—' for absent, raw + warn for unmapped.
            var v = item.status;
            var txt;
            if (v === null || v === undefined || v === '') {
                txt = '—';
            } else if (typeof v === 'string') {
                txt = v;
            } else {
                var label = ProblerK8s.enums.NODE_STATUS[v];
                if (label) {
                    txt = label;
                } else {
                    if (typeof console !== 'undefined' && console.warn) {
                        console.warn('K8s node status: unmapped enum value', v);
                    }
                    txt = String(v);
                }
            }
            var cls = ProblerK8s.enums.getNodeStatusClass(item.status);
            return '<span class="status-badge ' + cls + '">' + txt + '</span>';
        }
    },
    { key: 'age', label: 'AGE' },
    { key: 'version', label: 'VERSION', filterKey: 'version' },
    { key: 'internalIp', label: 'INTERNAL-IP', filterKey: 'internalIp' },
    { key: 'externalIp', label: 'EXTERNAL-IP', filterKey: 'externalIp' },
    { key: 'osImage', label: 'OS-IMAGE', filterKey: 'osImage' },
    { key: 'kernelVersion', label: 'KERNEL-VERSION', filterKey: 'kernelVersion' },
    { key: 'containerRuntime', label: 'CONTAINER-RUNTIME', filterKey: 'containerRuntime' }
];

// --- Namespaces (SA 16) ---

ProblerK8s.columns.K8SNamespace = [
    { key: 'name', label: 'NAME', filterKey: 'name' },
    {
        key: 'status', label: 'STATUS', filterKey: 'status',
        render: function(item) {
            var cls = ProblerK8s.enums.getNamespaceStatusClass(item.status);
            return '<span class="status-badge ' + cls + '">' + (item.status || 'Unknown') + '</span>';
        }
    },
    { key: 'age', label: 'AGE' }
];
