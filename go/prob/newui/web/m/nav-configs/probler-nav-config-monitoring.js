(function() {
    'use strict';
    window.PROBLER_NAV_CONFIG_MONITORING = {
        // Dashboard — special section, loaded via loadSection not Layer8MNav
        dashboard: {
            section: 'dashboard'
        },

        // Network Devices — single READ-ONLY table, auto-skip to table
        // Desktop: Layer8DTable with server-side sort/filter, row click → 3-tab detail modal
        // Detail tabs: Device Info, Performance (CPU/Memory/Temp charts), Routing (VRFs, BGP, OSPF, static routes)
        network: {
            subModules: [
                { key: 'devices', label: 'Network Devices', icon: 'network' }
            ],
            services: {
                'devices': [
                    { key: 'network-devices', label: 'Network Devices', icon: 'network', endpoint: '/0/NCache', model: 'NetworkDevice', idField: 'id', readOnly: true, supportedViews: ['table', 'chart'], onRowClick: function(item) { if (typeof showNetworkDeviceDetail === 'function') showNetworkDeviceDetail(item); } }
                ]
            }
        },

        // GPUs — single READ-ONLY table, auto-skip to table
        // Desktop: Layer8DTable, row click → 4-tab detail modal (Overview, Hardware, Performance, Processes)
        gpus: {
            subModules: [
                { key: 'gpu-devices', label: 'GPU Devices', icon: 'gpus' }
            ],
            services: {
                'gpu-devices': [
                    { key: 'gpus', label: 'GPU Devices', icon: 'gpus', endpoint: '/2/GCache', model: 'GpuDevice', idField: 'id', readOnly: true, supportedViews: ['table', 'chart'], onRowClick: function(item) { if (typeof showGpuDetail === 'function') showGpuDetail(item); } }
                ]
            }
        },

        // Hosts & VMs — two READ-ONLY tables (Hypervisors, VMs)
        // Desktop: Tab-based UI (Hypervisors tab, VMs tab), each with Layer8DTable
        // HV detail: 4 tabs (Overview, Hardware, Resources, VMs list)
        // VM detail: 4 tabs (Overview, Resources, Network, Backup)
        hosts: {
            subModules: [
                { key: 'hosts-vms', label: 'Hosts & VMs', icon: 'hosts' }
            ],
            services: {
                'hosts-vms': [
                    { key: 'hypervisors', label: 'Hypervisors', icon: 'hosts', endpoint: '/0/NCache', model: 'Hypervisor', idField: 'id', readOnly: true, supportedViews: ['table', 'chart'], onRowClick: function(item) { if (typeof showHypervisorDetail === 'function') showHypervisorDetail(item); } },
                    { key: 'vms', label: 'Virtual Machines', icon: 'hosts', endpoint: '/0/NCache', model: 'VirtualMachine', idField: 'id', readOnly: true, supportedViews: ['table', 'chart'], onRowClick: function(item) { if (typeof showVmDetail === 'function') showVmDetail(item); } }
                ]
            }
        },

        // Kubernetes — READ-ONLY tables for 42 resource types across 12 categories
        // Per-type endpoints, generic detail popup via MobileK8sDetail.show()
        kubernetes: (function() {
            function k8sClick(svc) {
                return function(item) { if (typeof MobileK8sDetail !== 'undefined') MobileK8sDetail.show(item, svc); };
            }
            function svc(key, label, endpoint, model, idField) {
                var s = { key: key, label: label, icon: 'kubernetes', endpoint: endpoint, model: model, idField: idField || 'key', readOnly: true, supportedViews: ['table'] };
                s.onRowClick = k8sClick(s);
                return s;
            }
            return {
                subModules: [
                    { key: 'k8s-overview', label: 'Overview', icon: 'kubernetes' },
                    { key: 'k8s-workloads', label: 'Workloads', icon: 'kubernetes' },
                    { key: 'k8s-networking', label: 'Networking', icon: 'kubernetes' },
                    { key: 'k8s-storage', label: 'Storage', icon: 'kubernetes' },
                    { key: 'k8s-configuration', label: 'Configuration', icon: 'kubernetes' },
                    { key: 'k8s-access-control', label: 'Access Control', icon: 'kubernetes' },
                    { key: 'k8s-nodes', label: 'Nodes', icon: 'kubernetes' },
                    { key: 'k8s-namespaces', label: 'Namespaces', icon: 'kubernetes' },
                    { key: 'k8s-vcluster', label: 'vCluster', icon: 'kubernetes' },
                    { key: 'k8s-istio', label: 'Istio', icon: 'kubernetes' },
                    { key: 'k8s-crds', label: 'CRDs', icon: 'kubernetes' },
                    { key: 'k8s-events', label: 'Events', icon: 'kubernetes' }
                ],
                services: {
                    'k8s-overview': [
                        svc('clusters', 'Clusters', '/1/KCluster', 'K8SCluster', 'name')
                    ],
                    'k8s-workloads': [
                        svc('pods', 'Pods', '/10/K8sPod', 'K8SPod'),
                        svc('deployments', 'Deployments', '/10/K8sDeploy', 'K8SDeployment'),
                        svc('statefulsets', 'StatefulSets', '/10/K8sSts', 'K8SStatefulSet'),
                        svc('daemonsets', 'DaemonSets', '/10/K8sDs', 'K8SDaemonSet'),
                        svc('replicasets', 'ReplicaSets', '/10/K8sRs', 'K8SReplicaSet'),
                        svc('jobs', 'Jobs', '/10/K8sJob', 'K8SJob'),
                        svc('cronjobs', 'CronJobs', '/10/K8sCj', 'K8SCronJob'),
                        svc('hpas', 'HPA', '/10/K8sHpa', 'K8SHPA')
                    ],
                    'k8s-networking': [
                        svc('services', 'Services', '/11/K8sSvc', 'K8SService'),
                        svc('ingresses', 'Ingresses', '/11/K8sIng', 'K8SIngress'),
                        svc('networkpolicies', 'Network Policies', '/11/K8sNetPol', 'K8SNetworkPolicy'),
                        svc('endpoints', 'Endpoints', '/11/K8sEp', 'K8SEndpoints'),
                        svc('endpointslices', 'Endpoint Slices', '/11/K8sEpSl', 'K8SEndpointSlice'),
                        svc('ingressclasses', 'Ingress Classes', '/11/K8sIngCl', 'K8SIngressClass')
                    ],
                    'k8s-storage': [
                        svc('pvs', 'Persistent Volumes', '/12/K8sPv', 'K8SPersistentVolume'),
                        svc('pvcs', 'Persistent Volume Claims', '/12/K8sPvc', 'K8SPersistentVolumeClaim'),
                        svc('storageclasses', 'Storage Classes', '/12/K8sScl', 'K8SStorageClass')
                    ],
                    'k8s-configuration': [
                        svc('configmaps', 'ConfigMaps', '/13/K8sCm', 'K8SConfigMap'),
                        svc('secrets', 'Secrets', '/13/K8sSec', 'K8SSecret'),
                        svc('resourcequotas', 'Resource Quotas', '/13/K8sRq', 'K8SResourceQuota'),
                        svc('limitranges', 'Limit Ranges', '/13/K8sLr', 'K8SLimitRange'),
                        svc('pdbs', 'Pod Disruption Budgets', '/13/K8sPdb', 'K8SPodDisruptionBudget')
                    ],
                    'k8s-access-control': [
                        svc('serviceaccounts', 'Service Accounts', '/14/K8sSa', 'K8SServiceAccount'),
                        svc('roles', 'Roles', '/14/K8sRole', 'K8SRole'),
                        svc('clusterroles', 'Cluster Roles', '/14/K8sCr', 'K8SClusterRole'),
                        svc('rolebindings', 'Role Bindings', '/14/K8sRb', 'K8SRoleBinding'),
                        svc('clusterrolebindings', 'Cluster Role Bindings', '/14/K8sCrb', 'K8SClusterRoleBinding')
                    ],
                    'k8s-nodes': [
                        svc('nodes', 'Nodes', '/15/K8sNode', 'K8SNode')
                    ],
                    'k8s-namespaces': [
                        svc('namespaces', 'Namespaces', '/16/K8sNs', 'K8SNamespace', 'name')
                    ],
                    'k8s-vcluster': [
                        svc('vclusters', 'vClusters', '/17/K8sVCl', 'K8SVCluster')
                    ],
                    'k8s-istio': [
                        svc('virtualservices', 'Virtual Services', '/18/IstioVs', 'IstioVirtualService'),
                        svc('destinationrules', 'Destination Rules', '/18/IstioDr', 'IstioDestinationRule'),
                        svc('gateways', 'Gateways', '/18/IstioGw', 'IstioGateway'),
                        svc('serviceentries', 'Service Entries', '/18/IstioSe', 'IstioServiceEntry'),
                        svc('peerauthn', 'Peer Authentication', '/18/IstioPa', 'IstioPeerAuthentication'),
                        svc('authzpolicies', 'Authorization Policies', '/18/IstioAp', 'IstioAuthorizationPolicy'),
                        svc('sidecars', 'Sidecars', '/18/IstioSc', 'IstioSidecar'),
                        svc('envoyfilters', 'Envoy Filters', '/18/IstioEf', 'IstioEnvoyFilter')
                    ],
                    'k8s-crds': [
                        svc('crds', 'Custom Resource Definitions', '/19/K8sCrd', 'K8SCRD', 'name')
                    ],
                    'k8s-events': [
                        svc('events', 'Events', '/20/K8sEvt', 'K8SEvent')
                    ]
                }
            };
        })(),

        // Inventory — single EDITABLE table (Targets CRUD)
        // Desktop: Full CRUD with nested hosts/protocol configs (targets.js 740 lines)
        // Protocols: SSH(22), SNMPV2(161), SNMPV3(161), RESTCONF(443), NETCONF(830), GRPC(50051), Kubectl(6443), GraphQL(443)
        // States: Down, Up, Maintenance, Offline
        // Types: Network Device, GPUs, Hosts, VMs, K8s Cluster, Storage, Power
        // Features: Bulk state change, nested host modal with protocol table
        inventory: {
            subModules: [
                { key: 'targets', label: 'Targets', icon: 'inventory' }
            ],
            services: {
                'targets': [
                    { key: 'targets', label: 'Targets', icon: 'inventory', endpoint: '/91/Targets', model: 'L8PTarget', idField: 'targetId', supportedViews: ['table'],
                        baseWhereClause: 'inventoryType=1',
                        filterDropdown: {
                            label: 'Type',
                            field: 'inventoryType',
                            defaultValue: 1,
                            options: { 1: 'Network Device', 2: 'GPUS', 3: 'Hosts', 4: 'Virtual Machine', 5: 'K8s Cluster', 6: 'Storage', 7: 'Power' }
                        },
                        onRowClick: function(item) { if (typeof MobileTargetsDetail !== 'undefined') MobileTargetsDetail.showDetails({ endpoint: '/91/Targets', label: 'Targets', model: 'L8PTarget', idField: 'targetId' }, item); },
                        onAdd: function() { if (typeof MobileTargetsCRUD !== 'undefined') MobileTargetsCRUD.openAdd({ endpoint: '/91/Targets', label: 'Targets', model: 'L8PTarget', idField: 'targetId' }); },
                        onEdit: function(id, item) { if (typeof MobileTargetsCRUD !== 'undefined') MobileTargetsCRUD.openEdit({ endpoint: '/91/Targets', label: 'Targets', model: 'L8PTarget', idField: 'targetId' }, item); },
                        onDelete: function(id) { if (typeof MobileTargetsDetail !== 'undefined') MobileTargetsDetail.confirmDelete({ endpoint: '/91/Targets', label: 'Targets', model: 'L8PTarget', idField: 'targetId' }, id); }
                    }
                ]
            }
        },

        // Topologies — custom view (iframe-based WebGL/SVG on desktop)
        topologies: {
            subModules: [
                { key: 'topology-map', label: 'Topology Map', icon: 'topologies' }
            ],
            services: {
                'topology-map': [
                    { key: 'topology', label: 'Topology Map', icon: 'topologies', customInit: true, customContainer: 'topology-container' }
                ]
            }
        }
    };
})();
