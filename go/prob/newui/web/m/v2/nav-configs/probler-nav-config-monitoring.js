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
                    { key: 'network-devices', label: 'Network Devices', icon: 'network', endpoint: '/0/NCache', model: 'NetworkDevice', idField: 'Id', readOnly: true, supportedViews: ['table'], onRowClick: function(item) { if (typeof showNetworkDeviceDetail === 'function') showNetworkDeviceDetail(item); } }
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
                    { key: 'gpus', label: 'GPU Devices', icon: 'gpus', endpoint: '/0/NCache', model: 'GpuDevice', idField: 'Id', readOnly: true, supportedViews: ['table'], onRowClick: function(item) { if (typeof showGpuDetail === 'function') showGpuDetail(item); } }
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
                    { key: 'hypervisors', label: 'Hypervisors', icon: 'hosts', endpoint: '/0/NCache', model: 'Hypervisor', idField: 'Id', readOnly: true, supportedViews: ['table'], onRowClick: function(item) { if (typeof showHypervisorDetail === 'function') showHypervisorDetail(item); } },
                    { key: 'vms', label: 'Virtual Machines', icon: 'hosts', endpoint: '/0/NCache', model: 'VirtualMachine', idField: 'Id', readOnly: true, supportedViews: ['table'], onRowClick: function(item) { if (typeof showVmDetail === 'function') showVmDetail(item); } }
                ]
            }
        },

        // Kubernetes — READ-ONLY tables for 8 resource types
        // Desktop: Cluster dropdown + resource tabs with counts, all data from /1/KCache
        // Detail modals: Node (8 tabs), Pod (7 tabs), Deployment (6 tabs),
        //   StatefulSet (3 tabs), DaemonSet (3 tabs), Service (3 tabs),
        //   Namespace (no tabs), NetworkPolicy (no tabs)
        // Detail data fetched via /0/exec POST with job names (nodedetails, poddetails, etc.)
        kubernetes: {
            subModules: [
                { key: 'k8s-resources', label: 'Kubernetes Resources', icon: 'kubernetes' }
            ],
            services: {
                'k8s-resources': [
                    { key: 'pods', label: 'Pods', icon: 'kubernetes', endpoint: '/1/KCache', model: 'K8sPod', idField: 'Id', readOnly: true, supportedViews: ['table'], onRowClick: function(item) { if (typeof showK8sPodDetail === 'function') showK8sPodDetail(item); } },
                    { key: 'nodes', label: 'Nodes', icon: 'kubernetes', endpoint: '/1/KCache', model: 'K8sNode', idField: 'Id', readOnly: true, supportedViews: ['table'], onRowClick: function(item) { if (typeof showK8sNodeDetail === 'function') showK8sNodeDetail(item); } },
                    { key: 'deployments', label: 'Deployments', icon: 'kubernetes', endpoint: '/1/KCache', model: 'K8sDeployment', idField: 'Id', readOnly: true, supportedViews: ['table'], onRowClick: function(item) { if (typeof showK8sDeploymentDetail === 'function') showK8sDeploymentDetail(item); } },
                    { key: 'statefulsets', label: 'StatefulSets', icon: 'kubernetes', endpoint: '/1/KCache', model: 'K8sStatefulSet', idField: 'Id', readOnly: true, supportedViews: ['table'], onRowClick: function(item) { if (typeof showK8sStatefulSetDetail === 'function') showK8sStatefulSetDetail(item); } },
                    { key: 'daemonsets', label: 'DaemonSets', icon: 'kubernetes', endpoint: '/1/KCache', model: 'K8sDaemonSet', idField: 'Id', readOnly: true, supportedViews: ['table'], onRowClick: function(item) { if (typeof showK8sDaemonSetDetail === 'function') showK8sDaemonSetDetail(item); } },
                    { key: 'services', label: 'Services', icon: 'kubernetes', endpoint: '/1/KCache', model: 'K8sService', idField: 'Id', readOnly: true, supportedViews: ['table'], onRowClick: function(item) { if (typeof showK8sServiceDetail === 'function') showK8sServiceDetail(item); } },
                    { key: 'namespaces', label: 'Namespaces', icon: 'kubernetes', endpoint: '/1/KCache', model: 'K8sNamespace', idField: 'Id', readOnly: true, supportedViews: ['table'], onRowClick: function(item) { if (typeof showK8sNamespaceDetail === 'function') showK8sNamespaceDetail(item); } },
                    { key: 'networkpolicies', label: 'Network Policies', icon: 'kubernetes', endpoint: '/1/KCache', model: 'K8sNetworkPolicy', idField: 'Id', readOnly: true, supportedViews: ['table'], onRowClick: function(item) { if (typeof showK8sNetworkPolicyDetail === 'function') showK8sNetworkPolicyDetail(item); } }
                ]
            }
        },

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
                        onRowClick: function(item) { if (typeof MobileTargetsDetail !== 'undefined') MobileTargetsDetail.showDetails({ endpoint: '/91/Targets', label: 'Targets', model: 'L8PTarget', idField: 'targetId' }, item); },
                        onAdd: function() { if (typeof MobileTargetsCRUD !== 'undefined') MobileTargetsCRUD.openAdd({ endpoint: '/91/Targets', label: 'Targets', model: 'L8PTarget', idField: 'targetId' }); },
                        onEdit: function(id, item) { if (typeof MobileTargetsCRUD !== 'undefined') MobileTargetsCRUD.openEdit({ endpoint: '/91/Targets', label: 'Targets', model: 'L8PTarget', idField: 'targetId' }, id); },
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
