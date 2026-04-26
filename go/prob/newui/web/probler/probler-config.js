// Probler Module Configuration
// Defines module structure, services, and submodule registries

window.Probler = window.Probler || {};

Probler.modules = {
    'monitoring': {
        label: 'Monitoring',
        icon: '📊',
        services: [
            { key: 'network', label: 'Network Devices', icon: '🌐', endpoint: '/0/NCache', model: 'NetworkDevice' },
            { key: 'gpus', label: 'GPUs', icon: '🖧', endpoint: '/2/GCache', model: 'GpuDevice' },
            { key: 'hosts', label: 'Hosts & VMs', icon: '🖥️', model: null },
            { key: 'kubernetes', label: 'Kubernetes', icon: '☸️', model: null }
        ]
    },
    'infrastructure': {
        label: 'Infrastructure',
        icon: '🔌',
        services: [
            { key: 'inventory', label: 'Inventory', icon: '📦', endpoint: '/0/L8PTarget', model: 'L8PTarget' },
            { key: 'topologies', label: 'Topologies', icon: '🗺️', model: null },
            { key: 'storage', label: 'Storage & Power', icon: '🔌', model: null }
        ]
    }
};

Probler.submodules = ['ProblerNetwork', 'ProblerGpus', 'ProblerHosts', 'ProblerK8s'];

// Kubernetes resource categories — used by kubernetes-init.js to build the UI
Probler.k8sCategories = [
    {
        // Overview is a custom view rendered by kubernetes-overview.js — it shows
        // KPI cards summarizing every other category for the selected cluster.
        // It does not have sub-services (kubernetes-init.js special-cases it).
        key: 'overview', label: 'Overview', icon: '📊',
        services: []
    },
    {
        key: 'workloads', label: 'Workloads', icon: '⚙️',
        services: [
            { key: 'pods', label: 'Pods', endpoint: '/11/K8sPod', model: 'K8SPod', readOnly: true },
            { key: 'deployments', label: 'Deployments', endpoint: '/12/K8sDploy', model: 'K8SDeployment', readOnly: true },
            { key: 'statefulsets', label: 'StatefulSets', endpoint: '/13/K8sSts', model: 'K8SStatefulSet', readOnly: true },
            { key: 'daemonsets', label: 'DaemonSets', endpoint: '/14/K8sDs', model: 'K8SDaemonSet', readOnly: true },
            { key: 'replicasets', label: 'ReplicaSets', endpoint: '/15/K8sRs', model: 'K8SReplicaSet', readOnly: true },
            { key: 'jobs', label: 'Jobs', endpoint: '/16/K8sJob', model: 'K8SJob', readOnly: true },
            { key: 'cronjobs', label: 'CronJobs', endpoint: '/17/K8sCj', model: 'K8SCronJob', readOnly: true },
            { key: 'hpas', label: 'HPAs', endpoint: '/18/K8sHpa', model: 'K8SHPA', readOnly: true }
        ]
    },
    {
        key: 'networking', label: 'Networking', icon: '🌐',
        services: [
            { key: 'services', label: 'Services', endpoint: '/19/K8sSvc', model: 'K8SService', readOnly: true },
            { key: 'ingresses', label: 'Ingresses', endpoint: '/20/K8sIng', model: 'K8SIngress', readOnly: true },
            { key: 'network-policies', label: 'NetworkPolicies', endpoint: '/21/K8sNtPol', model: 'K8SNetworkPolicy', readOnly: true },
            { key: 'endpoints', label: 'Endpoints', endpoint: '/22/K8sEp', model: 'K8SEndpoints', readOnly: true },
            { key: 'endpoint-slices', label: 'EndpointSlices', endpoint: '/23/K8sEpSl', model: 'K8SEndpointSlice', readOnly: true },
            { key: 'ingress-classes', label: 'IngressClasses', endpoint: '/24/K8sIngCl', model: 'K8SIngressClass', readOnly: true }
        ]
    },
    {
        key: 'storage', label: 'Storage', icon: '💾',
        services: [
            { key: 'persistent-volumes', label: 'PersistentVolumes', endpoint: '/25/K8sPv', model: 'K8SPersistentVolume', readOnly: true },
            { key: 'pvcs', label: 'PVCs', endpoint: '/26/K8sPvc', model: 'K8SPersistentVolumeClaim', readOnly: true },
            { key: 'storage-classes', label: 'StorageClasses', endpoint: '/27/K8sScl', model: 'K8SStorageClass', readOnly: true }
        ]
    },
    {
        key: 'configuration', label: 'Configuration', icon: '🔧',
        services: [
            { key: 'configmaps', label: 'ConfigMaps', endpoint: '/28/K8sCm', model: 'K8SConfigMap', readOnly: true },
            { key: 'secrets', label: 'Secrets', endpoint: '/29/K8sSec', model: 'K8SSecret', readOnly: true },
            { key: 'resource-quotas', label: 'ResourceQuotas', endpoint: '/30/K8sRq', model: 'K8SResourceQuota', readOnly: true },
            { key: 'limit-ranges', label: 'LimitRanges', endpoint: '/31/K8sLr', model: 'K8SLimitRange', readOnly: true },
            { key: 'pdbs', label: 'PDBs', endpoint: '/32/K8sPdb', model: 'K8SPodDisruptionBudget', readOnly: true }
        ]
    },
    {
        key: 'access-control', label: 'Access Control', icon: '🔐',
        services: [
            { key: 'service-accounts', label: 'ServiceAccounts', endpoint: '/33/K8sSa', model: 'K8SServiceAccount', readOnly: true },
            { key: 'roles', label: 'Roles', endpoint: '/34/K8sRole', model: 'K8SRole', readOnly: true },
            { key: 'cluster-roles', label: 'ClusterRoles', endpoint: '/35/K8sCr', model: 'K8SClusterRole', readOnly: true },
            { key: 'role-bindings', label: 'RoleBindings', endpoint: '/36/K8sRb', model: 'K8SRoleBinding', readOnly: true },
            { key: 'cluster-role-bindings', label: 'ClusterRoleBindings', endpoint: '/37/K8sCrb', model: 'K8SClusterRoleBinding', readOnly: true }
        ]
    },
    {
        key: 'nodes', label: 'Nodes', icon: '🖥️',
        services: [
            { key: 'nodes', label: 'Nodes', endpoint: '/38/K8sNode', model: 'K8SNode', readOnly: true }
        ]
    },
    {
        key: 'namespaces', label: 'Namespaces', icon: '📁',
        services: [
            { key: 'namespaces', label: 'Namespaces', endpoint: '/39/K8sNs', model: 'K8SNamespace', readOnly: true }
        ]
    },
    {
        key: 'vcluster', label: 'vCluster', icon: '🔮',
        services: [
            { key: 'vclusters', label: 'vClusters', endpoint: '/40/K8sVCl', model: 'K8SVCluster', readOnly: true }
        ]
    },
    {
        key: 'istio', label: 'Istio', icon: '🕸️',
        services: [
            { key: 'virtual-services', label: 'VirtualServices', endpoint: '/41/IstioVs', model: 'IstioVirtualService', readOnly: true },
            { key: 'destination-rules', label: 'DestinationRules', endpoint: '/42/IstioDr', model: 'IstioDestinationRule', readOnly: true },
            { key: 'gateways', label: 'Gateways', endpoint: '/43/IstioGw', model: 'IstioGateway', readOnly: true },
            { key: 'service-entries', label: 'ServiceEntries', endpoint: '/44/IstioSe', model: 'IstioServiceEntry', readOnly: true },
            { key: 'peer-auth', label: 'PeerAuthentication', endpoint: '/45/IstioPa', model: 'IstioPeerAuthentication', readOnly: true },
            { key: 'authz-policy', label: 'AuthorizationPolicy', endpoint: '/46/IstioAp', model: 'IstioAuthorizationPolicy', readOnly: true },
            { key: 'sidecars', label: 'Sidecars', endpoint: '/47/IstioSc', model: 'IstioSidecar', readOnly: true },
            { key: 'envoy-filters', label: 'EnvoyFilters', endpoint: '/48/IstioEf', model: 'IstioEnvoyFilter', readOnly: true }
        ]
    },
    {
        key: 'crds', label: 'CRDs', icon: '🧩',
        services: [
            { key: 'crds', label: 'CRDs', endpoint: '/49/K8sCrd', model: 'K8SCRD', readOnly: true }
        ]
    },
    {
        key: 'events', label: 'Events', icon: '📋',
        services: [
            { key: 'events', label: 'Events', endpoint: '/50/K8sEvt', model: 'K8SEvent', readOnly: true }
        ]
    }
];
