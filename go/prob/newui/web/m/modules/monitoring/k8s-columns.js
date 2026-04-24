// Mobile Kubernetes Module - Column Definitions (Core + Workloads + Networking + Nodes + Namespaces)
// Desktop Equivalent: probler/k8s/k8s-columns.js
(function() {
    'use strict';

    window.MobileK8s = window.MobileK8s || {};
    var render = MobileK8s.render;
    MobileK8s.columns = {};

    // --- Overview (SA 1) ---

    MobileK8s.columns.K8SCluster = [
        { key: 'name', label: 'NAME', primary: true, filterKey: 'name' },
        { key: 'k8sVersion', label: 'K8S VERSION', secondary: true },
        { key: 'platform', label: 'PLATFORM', filterKey: 'platform' }
    ];

    // --- Workloads (SA 10) ---

    MobileK8s.columns.K8SPod = [
        { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
        { key: 'namespace', label: 'NAMESPACE', filterKey: 'namespace' },
        { key: 'name', label: 'NAME', primary: true, filterKey: 'name' },
        { key: 'ready', label: 'READY', render: function(item) { return render.podReady(item.ready); } },
        { key: 'status', label: 'STATUS', secondary: true, filterKey: 'status',
          render: function(item) { return render.podStatus(item.status); } },
        { key: 'restarts', label: 'RESTARTS', render: function(item) { return render.restarts(item.restarts); } },
        { key: 'age', label: 'AGE' },
        { key: 'ip', label: 'IP', filterKey: 'ip' },
        { key: 'node', label: 'NODE', filterKey: 'node' },
        { key: 'nominatedNode', label: 'NOMINATED NODE' },
        { key: 'readinessGates', label: 'READINESS GATES' }
    ];

    MobileK8s.columns.K8SDeployment = [
        { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
        { key: 'namespace', label: 'NAMESPACE', secondary: true, filterKey: 'namespace' },
        { key: 'name', label: 'NAME', primary: true, filterKey: 'name' },
        { key: 'ready', label: 'READY' },
        { key: 'upToDate', label: 'UP-TO-DATE' },
        { key: 'available', label: 'AVAILABLE' },
        { key: 'age', label: 'AGE' },
        { key: 'containers', label: 'CONTAINERS', filterKey: 'containers' },
        { key: 'images', label: 'IMAGES', filterKey: 'images' },
        { key: 'selector', label: 'SELECTOR', filterKey: 'selector' }
    ];

    MobileK8s.columns.K8SStatefulSet = [
        { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
        { key: 'namespace', label: 'NAMESPACE', secondary: true, filterKey: 'namespace' },
        { key: 'name', label: 'NAME', primary: true, filterKey: 'name' },
        { key: 'ready', label: 'READY' },
        { key: 'age', label: 'AGE' },
        { key: 'containers', label: 'CONTAINERS', filterKey: 'containers' },
        { key: 'images', label: 'IMAGES', filterKey: 'images' }
    ];

    MobileK8s.columns.K8SDaemonSet = [
        { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
        { key: 'namespace', label: 'NAMESPACE', secondary: true, filterKey: 'namespace' },
        { key: 'name', label: 'NAME', primary: true, filterKey: 'name' },
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

    MobileK8s.columns.K8SReplicaSet = [
        { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
        { key: 'namespace', label: 'NAMESPACE', secondary: true, filterKey: 'namespace' },
        { key: 'name', label: 'NAME', primary: true, filterKey: 'name' },
        { key: 'desired', label: 'DESIRED' },
        { key: 'current', label: 'CURRENT' },
        { key: 'ready', label: 'READY' },
        { key: 'age', label: 'AGE' }
    ];

    MobileK8s.columns.K8SJob = [
        { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
        { key: 'namespace', label: 'NAMESPACE', secondary: true, filterKey: 'namespace' },
        { key: 'name', label: 'NAME', primary: true, filterKey: 'name' },
        { key: 'completions', label: 'COMPLETIONS' },
        { key: 'duration', label: 'DURATION' },
        { key: 'condition', label: 'CONDITION', filterKey: 'condition',
          render: function(item) { return render.jobCondition(item.condition); } },
        { key: 'age', label: 'AGE' }
    ];

    MobileK8s.columns.K8SCronJob = [
        { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
        { key: 'namespace', label: 'NAMESPACE', secondary: true, filterKey: 'namespace' },
        { key: 'name', label: 'NAME', primary: true, filterKey: 'name' },
        { key: 'schedule', label: 'SCHEDULE', filterKey: 'schedule' },
        { key: 'lastSchedule', label: 'LAST SCHEDULE' },
        { key: 'suspend', label: 'SUSPEND',
          render: function(item) { return render.cronJobSuspend(item.suspend); } },
        { key: 'active', label: 'ACTIVE' },
        { key: 'age', label: 'AGE' }
    ];

    MobileK8s.columns.K8SHPA = [
        { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
        { key: 'namespace', label: 'NAMESPACE', secondary: true, filterKey: 'namespace' },
        { key: 'name', label: 'NAME', primary: true, filterKey: 'name' },
        { key: 'reference', label: 'REFERENCE', filterKey: 'reference' },
        { key: 'targets', label: 'TARGETS' },
        { key: 'minReplicas', label: 'MIN' },
        { key: 'maxReplicas', label: 'MAX' },
        { key: 'currentReplicas', label: 'CURRENT' },
        { key: 'age', label: 'AGE' }
    ];

    // --- Networking (SA 11) ---

    MobileK8s.columns.K8SService = [
        { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
        { key: 'namespace', label: 'NAMESPACE', filterKey: 'namespace' },
        { key: 'name', label: 'NAME', primary: true, filterKey: 'name' },
        { key: 'type', label: 'TYPE', secondary: true, filterKey: 'type' },
        { key: 'clusterIp', label: 'CLUSTER-IP', filterKey: 'clusterIp' },
        { key: 'externalIp', label: 'EXTERNAL-IP', filterKey: 'externalIp' },
        { key: 'ports', label: 'PORT(S)', filterKey: 'ports' },
        { key: 'age', label: 'AGE' },
        { key: 'selector', label: 'SELECTOR', filterKey: 'selector' }
    ];

    MobileK8s.columns.K8SIngress = [
        { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
        { key: 'namespace', label: 'NAMESPACE', secondary: true, filterKey: 'namespace' },
        { key: 'name', label: 'NAME', primary: true, filterKey: 'name' },
        { key: 'className', label: 'CLASS', filterKey: 'className' },
        { key: 'hosts', label: 'HOSTS', filterKey: 'hosts' },
        { key: 'address', label: 'ADDRESS', filterKey: 'address' },
        { key: 'ports', label: 'PORTS' },
        { key: 'age', label: 'AGE' }
    ];

    MobileK8s.columns.K8SNetworkPolicy = [
        { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
        { key: 'namespace', label: 'NAMESPACE', secondary: true, filterKey: 'namespace' },
        { key: 'name', label: 'NAME', primary: true, filterKey: 'name' },
        { key: 'podSelector', label: 'POD-SELECTOR', filterKey: 'podSelector' },
        { key: 'age', label: 'AGE' }
    ];

    MobileK8s.columns.K8SEndpoints = [
        { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
        { key: 'namespace', label: 'NAMESPACE', secondary: true, filterKey: 'namespace' },
        { key: 'name', label: 'NAME', primary: true, filterKey: 'name' },
        { key: 'endpoints', label: 'ENDPOINTS' },
        { key: 'age', label: 'AGE' }
    ];

    MobileK8s.columns.K8SEndpointSlice = [
        { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
        { key: 'namespace', label: 'NAMESPACE', secondary: true, filterKey: 'namespace' },
        { key: 'name', label: 'NAME', primary: true, filterKey: 'name' },
        { key: 'addressType', label: 'ADDRESS TYPE', filterKey: 'addressType' },
        { key: 'ports', label: 'PORTS' },
        { key: 'endpoints', label: 'ENDPOINTS' },
        { key: 'age', label: 'AGE' }
    ];

    MobileK8s.columns.K8SIngressClass = [
        { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
        { key: 'name', label: 'NAME', primary: true, filterKey: 'name' },
        { key: 'controller', label: 'CONTROLLER', secondary: true, filterKey: 'controller' },
        { key: 'age', label: 'AGE' }
    ];

    // --- Nodes (SA 15) ---

    MobileK8s.columns.K8SNode = [
        { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
        { key: 'name', label: 'NAME', primary: true, filterKey: 'name' },
        { key: 'roles', label: 'ROLES', filterKey: 'roles' },
        { key: 'status', label: 'STATUS', secondary: true, filterKey: 'status',
          render: function(item) { return render.nodeStatus(item.status); } },
        { key: 'age', label: 'AGE' },
        { key: 'version', label: 'VERSION', filterKey: 'version' },
        { key: 'internalIp', label: 'INTERNAL-IP', filterKey: 'internalIp' },
        { key: 'externalIp', label: 'EXTERNAL-IP', filterKey: 'externalIp' },
        { key: 'osImage', label: 'OS-IMAGE', filterKey: 'osImage' },
        { key: 'kernelVersion', label: 'KERNEL-VERSION', filterKey: 'kernelVersion' },
        { key: 'containerRuntime', label: 'CONTAINER-RUNTIME', filterKey: 'containerRuntime' }
    ];

    // --- Namespaces (SA 16) ---

    MobileK8s.columns.K8SNamespace = [
        { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
        { key: 'name', label: 'NAME', primary: true, filterKey: 'name' },
        { key: 'status', label: 'STATUS', secondary: true, filterKey: 'status',
          render: function(item) { return render.namespaceStatus(item.status); } },
        { key: 'age', label: 'AGE' }
    ];

    // --- Primary Keys ---

    MobileK8s.primaryKeys = {
        K8SCluster: 'name',
        K8SPod: 'key', K8SDeployment: 'key', K8SStatefulSet: 'key',
        K8SDaemonSet: 'key', K8SReplicaSet: 'key', K8SJob: 'key',
        K8SCronJob: 'key', K8SHPA: 'key',
        K8SService: 'key', K8SIngress: 'key', K8SNetworkPolicy: 'key',
        K8SEndpoints: 'key', K8SEndpointSlice: 'key', K8SIngressClass: 'key',
        K8SNode: 'key', K8SNamespace: 'name'
    };

})();
