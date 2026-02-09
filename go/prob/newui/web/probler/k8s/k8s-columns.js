// Probler Kubernetes Column Definitions
window.ProblerK8s = window.ProblerK8s || {};
ProblerK8s.columns = {};

ProblerK8s.columns.Node = [
    { key: 'name', label: 'NAME', filterKey: 'name' },
    { key: 'roles', label: 'ROLES', filterKey: 'roles' },
    { key: 'age', label: 'AGE' },
    { key: 'version', label: 'VERSION', filterKey: 'version' },
    { key: 'internalIp', label: 'INTERNAL-IP', filterKey: 'internalIp' },
    { key: 'externalIp', label: 'EXTERNAL-IP', filterKey: 'externalIp' },
    { key: 'osImage', label: 'OS-IMAGE', filterKey: 'osImage' },
    { key: 'kernelVersion', label: 'KERNEL-VERSION', filterKey: 'kernelVersion' },
    { key: 'containerRuntime', label: 'CONTAINER-RUNTIME', filterKey: 'containerRuntime' }
];

ProblerK8s.columns.Pod = [
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
            var statusClass = count === outof ? 'status-operational' : count > 0 ? 'status-warning' : 'status-critical';
            return '<span class="status-badge ' + statusClass + '">' + count + '/' + outof + '</span>';
        }
    },
    {
        key: 'status', label: 'STATUS', filterKey: 'status',
        render: function(item) {
            var statusText = ProblerK8s.enums.getPodStatusText(item.status);
            var statusClass = ProblerK8s.enums.getPodStatusClass(statusText);
            return '<span class="status-badge ' + statusClass + '">' + statusText + '</span>';
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

ProblerK8s.columns.Deployment = [
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

ProblerK8s.columns.StatefulSet = [
    { key: 'namespace', label: 'NAMESPACE', filterKey: 'namespace' },
    { key: 'name', label: 'NAME', filterKey: 'name' },
    { key: 'ready', label: 'READY' },
    { key: 'age', label: 'AGE' },
    { key: 'containers', label: 'CONTAINERS', filterKey: 'containers' },
    { key: 'images', label: 'IMAGES', filterKey: 'images' }
];

ProblerK8s.columns.DaemonSet = [
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

ProblerK8s.columns.Service = [
    { key: 'namespace', label: 'NAMESPACE', filterKey: 'namespace' },
    { key: 'name', label: 'NAME', filterKey: 'name' },
    { key: 'type', label: 'TYPE', filterKey: 'type' },
    { key: 'clusterIp', label: 'CLUSTER-IP', filterKey: 'clusterIp' },
    { key: 'externalIp', label: 'EXTERNAL-IP', filterKey: 'externalIp' },
    { key: 'ports', label: 'PORT(S)', filterKey: 'ports' },
    { key: 'age', label: 'AGE' },
    { key: 'selector', label: 'SELECTOR', filterKey: 'selector' }
];

ProblerK8s.columns.Namespace = [
    { key: 'name', label: 'NAME', filterKey: 'name' },
    { key: 'status', label: 'STATUS', filterKey: 'status' },
    { key: 'age', label: 'AGE' }
];

ProblerK8s.columns.NetworkPolicy = [
    { key: 'namespace', label: 'NAMESPACE', filterKey: 'namespace' },
    { key: 'name', label: 'NAME', filterKey: 'name' },
    { key: 'podSelector', label: 'POD-SELECTOR', filterKey: 'podSelector' },
    { key: 'age', label: 'AGE' }
];
