// Kubernetes Overview KPI definitions — SHARED between desktop and mobile.
//
// Each entry maps a category key (matching Probler.k8sCategories) to:
//   - label:        human-readable card title
//   - icon:         emoji or icon string (matches the corresponding category icon)
//   - statsFn(s):   given a K8SClusterSummary object, returns:
//                   { value: <primary number>, sublabel: <secondary text> }
//
// Each platform's renderer (Layer8DWidget on desktop, Layer8MWidget on mobile)
// imports this list and feeds the per-card values into its widget primitive.
// Do NOT add platform-specific rendering here — only data shaping.
(function() {
    'use strict';

    function n(v) { return v == null ? 0 : Number(v) || 0; }

    window.K8sOverviewKPIs = [
        {
            key: 'workloads',
            label: 'Workloads',
            icon: '⚙️',
            statsFn: function(s) {
                return {
                    value: n(s.totalPods),
                    sublabel: 'pods ' + n(s.runningPods) + '/' + n(s.totalPods)
                        + ' • deploys ' + n(s.availableDeployments) + '/' + n(s.totalDeployments)
                };
            }
        },
        {
            key: 'networking',
            label: 'Networking',
            icon: '🌐',
            statsFn: function(s) {
                return {
                    value: n(s.totalServices),
                    sublabel: 'services • ingresses ' + n(s.totalIngresses)
                        + ' • netpols ' + n(s.totalNetworkpolicies)
                };
            }
        },
        {
            key: 'storage',
            label: 'Storage',
            icon: '💾',
            statsFn: function(s) {
                return {
                    value: n(s.totalPersistentvolumes) + n(s.totalPvcs),
                    sublabel: 'PVs ' + n(s.boundPersistentvolumes) + '/' + n(s.totalPersistentvolumes)
                        + ' • PVCs ' + n(s.boundPvcs) + '/' + n(s.totalPvcs)
                };
            }
        },
        {
            key: 'configuration',
            label: 'Configuration',
            icon: '🔧',
            statsFn: function(s) {
                return {
                    value: n(s.totalConfigmaps) + n(s.totalSecrets),
                    sublabel: 'configmaps ' + n(s.totalConfigmaps)
                        + ' • secrets ' + n(s.totalSecrets)
                        + ' • pdbs ' + n(s.totalPoddisruptionbudgets)
                };
            }
        },
        {
            key: 'access-control',
            label: 'Access Control',
            icon: '🔐',
            statsFn: function(s) {
                return {
                    value: n(s.totalRoles) + n(s.totalClusterroles),
                    sublabel: 'roles ' + n(s.totalRoles)
                        + ' • clusterroles ' + n(s.totalClusterroles)
                        + ' • bindings ' + (n(s.totalRolebindings) + n(s.totalClusterrolebindings))
                };
            }
        },
        {
            key: 'nodes',
            label: 'Nodes',
            icon: '🖥️',
            statsFn: function(s) {
                return {
                    value: n(s.totalNodes),
                    sublabel: n(s.readyNodes) + ' / ' + n(s.totalNodes) + ' ready'
                };
            }
        },
        {
            key: 'namespaces',
            label: 'Namespaces',
            icon: '📁',
            statsFn: function(s) {
                return { value: n(s.totalNamespaces), sublabel: 'total namespaces' };
            }
        },
        {
            key: 'vcluster',
            label: 'vCluster',
            icon: '🔮',
            statsFn: function(s) {
                return { value: n(s.totalVclusters), sublabel: 'virtual clusters' };
            }
        },
        {
            key: 'istio',
            label: 'Istio',
            icon: '🕸️',
            statsFn: function(s) {
                var total = n(s.totalIstioVirtualservices) + n(s.totalIstioGateways)
                    + n(s.totalIstioDestinationrules) + n(s.totalIstioServiceentries)
                    + n(s.totalIstioPeerauthentications) + n(s.totalIstioAuthorizationpolicies)
                    + n(s.totalIstioSidecars) + n(s.totalIstioEnvoyfilters);
                return {
                    value: total,
                    sublabel: 'vs ' + n(s.totalIstioVirtualservices)
                        + ' • gw ' + n(s.totalIstioGateways)
                        + ' • peer-auth ' + n(s.totalIstioPeerauthentications)
                };
            }
        },
        {
            key: 'crds',
            label: 'CRDs',
            icon: '🧩',
            statsFn: function(s) {
                return { value: n(s.totalCrds), sublabel: 'custom resources' };
            }
        },
        {
            key: 'events',
            label: 'Events',
            icon: '📋',
            statsFn: function(s) {
                return {
                    value: n(s.totalEvents),
                    sublabel: n(s.warningEvents) + ' warnings'
                };
            }
        }
    ];
})();
