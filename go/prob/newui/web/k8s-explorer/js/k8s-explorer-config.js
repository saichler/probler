/*
 * Kubernetes Explorer — group/service definitions for Layer8DExplorer.
 *
 * The classic Kubernetes section's `Probler.k8sCategories` (in
 * probler/probler-config.js) lists every K8s resource type with its
 * endpoint, model, and service-area. The explorer reorganizes those
 * definitions into the slimmer info-architecture from
 * `kubernetes-ui-redesign-notes.md` (with my evaluation pushback that
 * Tenancy stays distinct from Platform):
 *
 *   Overview, Workloads, Networking, Storage,
 *   Config & Access, Tenancy, Mesh, Events
 *
 * Each item carries the same shape as the classic config so Phase 5 can
 * pass `service` to K8sTables.create / K8sDetail.show without translation.
 *
 * Item IDs (`item.key`) are unique across the entire rail — Layer8DExplorer
 * uses flat keys for counts/status maps, and the Phase 4 cluster summary
 * → counts mapping reads these keys directly.
 */
(function() {
    'use strict';

    window.K8sExplorerConfig = window.K8sExplorerConfig || {};

    /**
     * Helper to build an item entry, mirroring the classic services list.
     * The explorer config carries everything Phase 5+ will need so the
     * resource view doesn't need to look anything up at mount time.
     */
    function svc(key, label, endpoint, model) {
        return {
            key: key,
            label: label,
            endpoint: endpoint,
            model: model,
            readOnly: true
        };
    }

    K8sExplorerConfig.groups = [
        // Overview is leaf-only (no children) — the rail header itself
        // is selectable and renders the action-card overview in Phase 4.
        {
            key: 'overview',
            label: 'Overview',
            icon: '◉'
        },

        // Workloads — what runs in the cluster.
        {
            key: 'workloads',
            label: 'Workloads',
            icon: '⚙',
            items: [
                svc('pods',         'Pods',         '/11/K8sPod',   'K8SPod'),
                svc('deployments',  'Deployments',  '/12/K8sDploy', 'K8SDeployment'),
                svc('statefulsets', 'StatefulSets', '/13/K8sSts',   'K8SStatefulSet'),
                svc('daemonsets',   'DaemonSets',   '/14/K8sDs',    'K8SDaemonSet'),
                svc('replicasets',  'ReplicaSets',  '/15/K8sRs',    'K8SReplicaSet'),
                svc('jobs',         'Jobs',         '/16/K8sJob',   'K8SJob'),
                svc('cronjobs',     'CronJobs',     '/17/K8sCj',    'K8SCronJob'),
                svc('hpas',         'HPAs',         '/18/K8sHpa',   'K8SHPA')
            ]
        },

        // Networking — how things talk.
        {
            key: 'networking',
            label: 'Networking',
            icon: '🌐',
            items: [
                svc('services',          'Services',         '/19/K8sSvc',   'K8SService'),
                svc('ingresses',         'Ingresses',        '/20/K8sIng',   'K8SIngress'),
                svc('network-policies',  'NetworkPolicies',  '/21/K8sNtPol', 'K8SNetworkPolicy'),
                svc('endpoints',         'Endpoints',        '/22/K8sEp',    'K8SEndpoints'),
                svc('endpoint-slices',   'EndpointSlices',   '/23/K8sEpSl',  'K8SEndpointSlice'),
                svc('ingress-classes',   'IngressClasses',   '/24/K8sIngCl', 'K8SIngressClass')
            ]
        },

        // Storage.
        {
            key: 'storage',
            label: 'Storage',
            icon: '💾',
            items: [
                svc('persistent-volumes', 'PersistentVolumes', '/25/K8sPv',  'K8SPersistentVolume'),
                svc('pvcs',               'PVCs',              '/26/K8sPvc', 'K8SPersistentVolumeClaim'),
                svc('storage-classes',    'StorageClasses',    '/27/K8sScl', 'K8SStorageClass')
            ]
        },

        // Config & Access — merges the classic Configuration + Access Control
        // categories per the source notes' "fewer top-level groups" guidance.
        {
            key: 'config-access',
            label: 'Config & Access',
            icon: '🔐',
            items: [
                svc('configmaps',           'ConfigMaps',          '/28/K8sCm',   'K8SConfigMap'),
                svc('secrets',              'Secrets',             '/29/K8sSec',  'K8SSecret'),
                svc('resource-quotas',      'ResourceQuotas',      '/30/K8sRq',   'K8SResourceQuota'),
                svc('limit-ranges',         'LimitRanges',         '/31/K8sLr',   'K8SLimitRange'),
                svc('pdbs',                 'PDBs',                '/32/K8sPdb',  'K8SPodDisruptionBudget'),
                svc('service-accounts',     'ServiceAccounts',     '/33/K8sSa',   'K8SServiceAccount'),
                svc('roles',                'Roles',               '/34/K8sRole', 'K8SRole'),
                svc('cluster-roles',        'ClusterRoles',        '/35/K8sCr',   'K8SClusterRole'),
                svc('role-bindings',        'RoleBindings',        '/36/K8sRb',   'K8SRoleBinding'),
                svc('cluster-role-bindings','ClusterRoleBindings', '/37/K8sCrb',  'K8SClusterRoleBinding')
            ]
        },

        // Tenancy — kept distinct from Platform per the evaluation pushback.
        // Namespaces is referenced by every other view; vCluster and CRDs
        // are the multi-tenant primitives. Nodes lives separately below.
        {
            key: 'tenancy',
            label: 'Tenancy',
            icon: '📁',
            items: [
                svc('namespaces', 'Namespaces', '/39/K8sNs',  'K8SNamespace'),
                svc('vclusters',  'vClusters',  '/40/K8sVCl', 'K8SVCluster'),
                svc('crds',       'CRDs',       '/49/K8sCrd', 'K8SCRD')
            ]
        },

        // Nodes is its own small group — nodes are platform infrastructure,
        // not multi-tenant resources. Single-item group renders inline as
        // "Nodes" in the rail.
        {
            key: 'nodes',
            label: 'Nodes',
            icon: '🖥',
            items: [
                svc('nodes', 'Nodes', '/38/K8sNode', 'K8SNode')
            ]
        },

        // Mesh — Istio resources grouped together.
        {
            key: 'mesh',
            label: 'Mesh',
            icon: '🕸',
            items: [
                svc('virtual-services',   'VirtualServices',     '/41/IstioVs', 'IstioVirtualService'),
                svc('destination-rules',  'DestinationRules',    '/42/IstioDr', 'IstioDestinationRule'),
                svc('gateways',           'Gateways',            '/43/IstioGw', 'IstioGateway'),
                svc('service-entries',    'ServiceEntries',      '/44/IstioSe', 'IstioServiceEntry'),
                svc('peer-auth',          'PeerAuthentication',  '/45/IstioPa', 'IstioPeerAuthentication'),
                svc('authz-policy',       'AuthorizationPolicy', '/46/IstioAp', 'IstioAuthorizationPolicy'),
                svc('sidecars',           'Sidecars',            '/47/IstioSc', 'IstioSidecar'),
                svc('envoy-filters',      'EnvoyFilters',        '/48/IstioEf', 'IstioEnvoyFilter')
            ]
        },

        // Events — leaf group at the bottom.
        {
            key: 'events',
            label: 'Events',
            icon: '📋',
            items: [
                svc('events', 'Events', '/50/K8sEvt', 'K8SEvent')
            ]
        }
    ];

    /**
     * findItem(itemKey) — flat lookup by item.key across all groups.
     * Returns { group, item } or null.
     */
    K8sExplorerConfig.findItem = function(itemKey) {
        for (var i = 0; i < K8sExplorerConfig.groups.length; i++) {
            var g = K8sExplorerConfig.groups[i];
            if (!g.items) continue;
            for (var j = 0; j < g.items.length; j++) {
                if (g.items[j].key === itemKey) return { group: g, item: g.items[j] };
            }
        }
        return null;
    };

    /** findGroup(groupKey) — return the group object or null. */
    K8sExplorerConfig.findGroup = function(groupKey) {
        for (var i = 0; i < K8sExplorerConfig.groups.length; i++) {
            if (K8sExplorerConfig.groups[i].key === groupKey) return K8sExplorerConfig.groups[i];
        }
        return null;
    };
})();
