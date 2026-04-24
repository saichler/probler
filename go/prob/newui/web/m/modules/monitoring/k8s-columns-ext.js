// Mobile Kubernetes Module - Column Definitions (Storage + Config + RBAC + vCluster + Istio + CRDs + Events)
// Desktop Equivalent: probler/k8s/k8s-columns-ext.js
(function() {
    'use strict';

    window.MobileK8s = window.MobileK8s || {};
    MobileK8s.columns = MobileK8s.columns || {};
    MobileK8s.primaryKeys = MobileK8s.primaryKeys || {};
    var render = MobileK8s.render;

    // --- Storage (SA 12) ---

    MobileK8s.columns.K8SPersistentVolume = [
        { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
        { key: 'name', label: 'NAME', primary: true, filterKey: 'name' },
        { key: 'capacity', label: 'CAPACITY' },
        { key: 'accessModes', label: 'ACCESS MODES' },
        { key: 'reclaimPolicy', label: 'RECLAIM POLICY', filterKey: 'reclaimPolicy' },
        { key: 'status', label: 'STATUS', secondary: true, filterKey: 'status',
          render: function(item) { return render.pvStatus(item.status); } },
        { key: 'claim', label: 'CLAIM', filterKey: 'claim' },
        { key: 'storageClass', label: 'STORAGECLASS', filterKey: 'storageClass' },
        { key: 'volumeMode', label: 'VOLUME MODE' },
        { key: 'reason', label: 'REASON' },
        { key: 'age', label: 'AGE' }
    ];

    MobileK8s.columns.K8SPersistentVolumeClaim = [
        { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
        { key: 'namespace', label: 'NAMESPACE', filterKey: 'namespace' },
        { key: 'name', label: 'NAME', primary: true, filterKey: 'name' },
        { key: 'status', label: 'STATUS', secondary: true, filterKey: 'status',
          render: function(item) { return render.pvStatus(item.status); } },
        { key: 'volume', label: 'VOLUME', filterKey: 'volume' },
        { key: 'capacity', label: 'CAPACITY' },
        { key: 'accessModes', label: 'ACCESS MODES' },
        { key: 'storageClass', label: 'STORAGECLASS', filterKey: 'storageClass' },
        { key: 'volumeMode', label: 'VOLUME MODE' },
        { key: 'age', label: 'AGE' }
    ];

    MobileK8s.columns.K8SStorageClass = [
        { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
        { key: 'name', label: 'NAME', primary: true, filterKey: 'name' },
        { key: 'provisioner', label: 'PROVISIONER', secondary: true, filterKey: 'provisioner' },
        { key: 'reclaimPolicy', label: 'RECLAIM POLICY', filterKey: 'reclaimPolicy' },
        { key: 'volumeBindingMode', label: 'VOLUME BINDING MODE' },
        { key: 'allowVolumeExpansion', label: 'EXPANSION',
          render: function(item) { return render.boolYesNo(item.allowVolumeExpansion); } },
        { key: 'age', label: 'AGE' }
    ];

    // --- Configuration (SA 13) ---

    MobileK8s.columns.K8SConfigMap = [
        { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
        { key: 'namespace', label: 'NAMESPACE', secondary: true, filterKey: 'namespace' },
        { key: 'name', label: 'NAME', primary: true, filterKey: 'name' },
        { key: 'dataCount', label: 'DATA' },
        { key: 'age', label: 'AGE' }
    ];

    MobileK8s.columns.K8SSecret = [
        { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
        { key: 'namespace', label: 'NAMESPACE', filterKey: 'namespace' },
        { key: 'name', label: 'NAME', primary: true, filterKey: 'name' },
        { key: 'type', label: 'TYPE', secondary: true, filterKey: 'type' },
        { key: 'dataCount', label: 'DATA' },
        { key: 'age', label: 'AGE' }
    ];

    MobileK8s.columns.K8SResourceQuota = [
        { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
        { key: 'namespace', label: 'NAMESPACE', secondary: true, filterKey: 'namespace' },
        { key: 'name', label: 'NAME', primary: true, filterKey: 'name' },
        { key: 'requestCpu', label: 'REQ CPU' },
        { key: 'usedRequestCpu', label: 'USED CPU' },
        { key: 'requestMemory', label: 'REQ MEM' },
        { key: 'usedRequestMemory', label: 'USED MEM' },
        { key: 'limitCpu', label: 'LIM CPU' },
        { key: 'limitMemory', label: 'LIM MEM' },
        { key: 'age', label: 'AGE' }
    ];

    MobileK8s.columns.K8SLimitRange = [
        { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
        { key: 'namespace', label: 'NAMESPACE', secondary: true, filterKey: 'namespace' },
        { key: 'name', label: 'NAME', primary: true, filterKey: 'name' },
        { key: 'age', label: 'AGE' }
    ];

    MobileK8s.columns.K8SPodDisruptionBudget = [
        { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
        { key: 'namespace', label: 'NAMESPACE', secondary: true, filterKey: 'namespace' },
        { key: 'name', label: 'NAME', primary: true, filterKey: 'name' },
        { key: 'minAvailable', label: 'MIN AVAILABLE' },
        { key: 'maxUnavailable', label: 'MAX UNAVAILABLE' },
        { key: 'allowedDisruptions', label: 'ALLOWED DISRUPTIONS' },
        { key: 'age', label: 'AGE' }
    ];

    // --- Access Control (SA 14) ---

    MobileK8s.columns.K8SServiceAccount = [
        { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
        { key: 'namespace', label: 'NAMESPACE', secondary: true, filterKey: 'namespace' },
        { key: 'name', label: 'NAME', primary: true, filterKey: 'name' },
        { key: 'secrets', label: 'SECRETS' },
        { key: 'age', label: 'AGE' }
    ];

    MobileK8s.columns.K8SRole = [
        { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
        { key: 'namespace', label: 'NAMESPACE', secondary: true, filterKey: 'namespace' },
        { key: 'name', label: 'NAME', primary: true, filterKey: 'name' },
        { key: 'age', label: 'AGE' }
    ];

    MobileK8s.columns.K8SClusterRole = [
        { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
        { key: 'name', label: 'NAME', primary: true, filterKey: 'name' },
        { key: 'age', label: 'AGE' }
    ];

    MobileK8s.columns.K8SRoleBinding = [
        { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
        { key: 'namespace', label: 'NAMESPACE', secondary: true, filterKey: 'namespace' },
        { key: 'name', label: 'NAME', primary: true, filterKey: 'name' },
        { key: 'roleRef', label: 'ROLE REF', filterKey: 'roleRef' },
        { key: 'age', label: 'AGE' }
    ];

    MobileK8s.columns.K8SClusterRoleBinding = [
        { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
        { key: 'name', label: 'NAME', primary: true, filterKey: 'name' },
        { key: 'roleRef', label: 'ROLE REF', secondary: true, filterKey: 'roleRef' },
        { key: 'age', label: 'AGE' }
    ];

    // --- vCluster (SA 17) ---

    MobileK8s.columns.K8SVCluster = [
        { key: 'clusterName', label: 'HOST CLUSTER', filterKey: 'clusterName' },
        { key: 'namespace', label: 'NAMESPACE', filterKey: 'namespace' },
        { key: 'name', label: 'NAME', primary: true, filterKey: 'name' },
        { key: 'status', label: 'STATUS', secondary: true, filterKey: 'status',
          render: function(item) { return render.vclusterStatus(item.status); } },
        { key: 'k8sVersion', label: 'K8S VERSION' },
        { key: 'distro', label: 'DISTRO', filterKey: 'distro' },
        { key: 'connected', label: 'CONNECTED' },
        { key: 'syncedPods', label: 'SYNCED PODS' },
        { key: 'syncedServices', label: 'SYNCED SVCS' },
        { key: 'syncedIngresses', label: 'SYNCED ING' },
        { key: 'age', label: 'AGE' }
    ];

    // --- Istio (SA 18) ---

    MobileK8s.columns.IstioVirtualService = [
        { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
        { key: 'namespace', label: 'NAMESPACE', secondary: true, filterKey: 'namespace' },
        { key: 'name', label: 'NAME', primary: true, filterKey: 'name' },
        { key: 'gateways', label: 'GATEWAYS' },
        { key: 'hosts', label: 'HOSTS' },
        { key: 'age', label: 'AGE' }
    ];

    MobileK8s.columns.IstioDestinationRule = [
        { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
        { key: 'namespace', label: 'NAMESPACE', secondary: true, filterKey: 'namespace' },
        { key: 'name', label: 'NAME', primary: true, filterKey: 'name' },
        { key: 'host', label: 'HOST', filterKey: 'host' },
        { key: 'age', label: 'AGE' }
    ];

    MobileK8s.columns.IstioGateway = [
        { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
        { key: 'namespace', label: 'NAMESPACE', secondary: true, filterKey: 'namespace' },
        { key: 'name', label: 'NAME', primary: true, filterKey: 'name' },
        { key: 'servers', label: 'SERVERS' },
        { key: 'selector', label: 'SELECTOR', filterKey: 'selector' },
        { key: 'age', label: 'AGE' }
    ];

    MobileK8s.columns.IstioServiceEntry = [
        { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
        { key: 'namespace', label: 'NAMESPACE', secondary: true, filterKey: 'namespace' },
        { key: 'name', label: 'NAME', primary: true, filterKey: 'name' },
        { key: 'hosts', label: 'HOSTS' },
        { key: 'location', label: 'LOCATION', filterKey: 'location' },
        { key: 'resolution', label: 'RESOLUTION', filterKey: 'resolution' },
        { key: 'ports', label: 'PORTS' },
        { key: 'age', label: 'AGE' }
    ];

    MobileK8s.columns.IstioPeerAuthentication = [
        { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
        { key: 'namespace', label: 'NAMESPACE', secondary: true, filterKey: 'namespace' },
        { key: 'name', label: 'NAME', primary: true, filterKey: 'name' },
        { key: 'mode', label: 'MODE', filterKey: 'mode' },
        { key: 'age', label: 'AGE' }
    ];

    MobileK8s.columns.IstioAuthorizationPolicy = [
        { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
        { key: 'namespace', label: 'NAMESPACE', secondary: true, filterKey: 'namespace' },
        { key: 'name', label: 'NAME', primary: true, filterKey: 'name' },
        { key: 'action', label: 'ACTION', filterKey: 'action' },
        { key: 'age', label: 'AGE' }
    ];

    MobileK8s.columns.IstioSidecar = [
        { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
        { key: 'namespace', label: 'NAMESPACE', secondary: true, filterKey: 'namespace' },
        { key: 'name', label: 'NAME', primary: true, filterKey: 'name' },
        { key: 'age', label: 'AGE' }
    ];

    MobileK8s.columns.IstioEnvoyFilter = [
        { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
        { key: 'namespace', label: 'NAMESPACE', secondary: true, filterKey: 'namespace' },
        { key: 'name', label: 'NAME', primary: true, filterKey: 'name' },
        { key: 'age', label: 'AGE' }
    ];

    // --- CRDs (SA 19) ---

    MobileK8s.columns.K8SCRD = [
        { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
        { key: 'name', label: 'NAME', primary: true, filterKey: 'name' },
        { key: 'group', label: 'GROUP', secondary: true, filterKey: 'group' },
        { key: 'version', label: 'VERSION', filterKey: 'version' },
        { key: 'scope', label: 'SCOPE', filterKey: 'scope' },
        { key: 'age', label: 'AGE' }
    ];

    // --- Events (SA 20) ---

    MobileK8s.columns.K8SEvent = [
        { key: 'clusterName', label: 'CLUSTER', filterKey: 'clusterName' },
        { key: 'namespace', label: 'NAMESPACE', filterKey: 'namespace' },
        { key: 'type', label: 'TYPE', secondary: true, filterKey: 'type',
          render: function(item) { return render.eventType(item.type); } },
        { key: 'reason', label: 'REASON', primary: true, filterKey: 'reason' },
        { key: 'object', label: 'OBJECT', filterKey: 'object' },
        { key: 'message', label: 'MESSAGE' },
        { key: 'source', label: 'SOURCE' },
        { key: 'count', label: 'COUNT' },
        { key: 'firstSeen', label: 'FIRST SEEN' },
        { key: 'lastSeen', label: 'LAST SEEN' }
    ];

    // --- Primary Keys (extended) ---

    var extKeys = {
        K8SPersistentVolume: 'key', K8SPersistentVolumeClaim: 'key', K8SStorageClass: 'key',
        K8SConfigMap: 'key', K8SSecret: 'key', K8SResourceQuota: 'key',
        K8SLimitRange: 'key', K8SPodDisruptionBudget: 'key',
        K8SServiceAccount: 'key', K8SRole: 'key', K8SClusterRole: 'key',
        K8SRoleBinding: 'key', K8SClusterRoleBinding: 'key',
        K8SVCluster: 'key',
        IstioVirtualService: 'key', IstioDestinationRule: 'key', IstioGateway: 'key',
        IstioServiceEntry: 'key', IstioPeerAuthentication: 'key',
        IstioAuthorizationPolicy: 'key', IstioSidecar: 'key', IstioEnvoyFilter: 'key',
        K8SCRD: 'name', K8SEvent: 'key'
    };
    for (var k in extKeys) {
        if (extKeys.hasOwnProperty(k)) {
            MobileK8s.primaryKeys[k] = extKeys[k];
        }
    }

})();
