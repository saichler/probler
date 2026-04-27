/*
 * Kubernetes Explorer — relation definitions for the detail popup's
 * Related tab. Per the plan's Phase 7, only relations that work with the
 * current backend are real fetches; the rest render with a "(coming soon)"
 * pill (and the reason in a tooltip) so the UI does not silently empty.
 *
 * What's "real" today:
 *   • Pod → Node            (lookup by spec.nodeName === Node.name)
 *   • Service → Endpoints   (lookup by namespace + name; K8s shares names)
 *   • Namespace → navigation jumps (no fetch, just rail moves)
 *
 * Stubbed (with reason):
 *   • Pod → Owner workload    (needs ownerReferences index)
 *   • Pod → PVCs              (needs spec.volumes preserved on K8sPod)
 *   • Service → matching Pods (needs pod labels + label-match query)
 *   • Service → Ingresses     (needs back-ref index)
 *   • Deployment → ReplicaSets / HPAs  (needs ownerReferences)
 */
(function() {
    'use strict';

    function relationsFor(item, service) {
        if (!service || !service.model) return [];
        switch (service.model) {
            case 'K8SPod':         return podRelations(item);
            case 'K8SService':     return serviceRelations(item);
            case 'K8SNamespace':   return namespaceRelations(item);
            case 'K8SDeployment':  return deploymentRelations(item);
            case 'K8SNode':        return nodeRelations(item);
        }
        return [{ label: 'Related resources', comingSoon: 'No relation map for ' + service.model + ' yet' }];
    }

    // ── Pod ────────────────────────────────────────────────────────

    function podRelations(pod) {
        return [
            {
                label: 'Node',
                fetch: function() {
                    if (!pod || !pod.node) return Promise.resolve([]);
                    return runQuery('/38/K8sNode',
                        'select * from K8SNode where name=' + pod.node).then(function(list) {
                        return list.map(function(n) {
                            return {
                                label: n.name,
                                sublabel: n.internalIp || '',
                                target: { entity: n, service: serviceFor('nodes') }
                            };
                        });
                    });
                }
            },
            {
                label: 'Owner workload',
                comingSoon: 'Requires ownerReferences index in the inventory backend'
            },
            {
                label: 'Mounted PVCs',
                comingSoon: 'Requires spec.volumes to be preserved on K8sPod (only containers_json is exposed today)'
            },
            {
                label: 'Services targeting this pod',
                comingSoon: 'Requires pod labels + label-match queries'
            }
        ];
    }

    // ── Service ────────────────────────────────────────────────────

    function serviceRelations(svc) {
        return [
            {
                label: 'Endpoints',
                fetch: function() {
                    if (!svc || !svc.namespace || !svc.name) return Promise.resolve([]);
                    return runQuery('/22/K8sEp',
                        'select * from K8SEndpoints where namespace=' + svc.namespace +
                        ' and name=' + svc.name).then(function(list) {
                        return list.map(function(ep) {
                            return {
                                label: ep.namespace + '/' + ep.name,
                                sublabel: ep.endpoints || '',
                                target: { entity: ep, service: serviceFor('endpoints') }
                            };
                        });
                    });
                }
            },
            {
                label: 'EndpointSlices',
                comingSoon: 'Requires label-match query (kubernetes.io/service-name)'
            },
            {
                label: 'Pods matching selector',
                comingSoon: 'Requires pod labels in the K8sPod proto'
            },
            {
                label: 'Ingresses routing here',
                comingSoon: 'Requires back-reference index'
            }
        ];
    }

    // ── Namespace ──────────────────────────────────────────────────

    // For a namespace, "related resources" is really "everything that
    // lives in this namespace". Rather than fetch them all, offer
    // navigation jumps to each namespace-scoped resource type with the
    // namespace pre-applied.
    function namespaceRelations(ns) {
        if (!ns || !ns.name) return [];
        var jumps = [
            { item: 'pods',         label: 'Pods' },
            { item: 'deployments',  label: 'Deployments' },
            { item: 'statefulsets', label: 'StatefulSets' },
            { item: 'daemonsets',   label: 'DaemonSets' },
            { item: 'services',     label: 'Services' },
            { item: 'ingresses',    label: 'Ingresses' },
            { item: 'configmaps',   label: 'ConfigMaps' },
            { item: 'secrets',      label: 'Secrets' },
            { item: 'pvcs',         label: 'PVCs' },
            { item: 'jobs',         label: 'Jobs' },
            { item: 'cronjobs',     label: 'CronJobs' }
        ];
        var groupOf = {
            'pods': 'workloads', 'deployments': 'workloads', 'statefulsets': 'workloads',
            'daemonsets': 'workloads', 'jobs': 'workloads', 'cronjobs': 'workloads',
            'services': 'networking', 'ingresses': 'networking',
            'configmaps': 'config-access', 'secrets': 'config-access',
            'pvcs': 'storage'
        };
        return [{
            label: 'Resources in this namespace',
            links: jumps.map(function(j) {
                return {
                    label: j.label,
                    target: {
                        nav: true,
                        groupKey: groupOf[j.item] || '',
                        itemKey: j.item,
                        namespace: ns.name
                    }
                };
            })
        }];
    }

    // ── Deployment ─────────────────────────────────────────────────

    function deploymentRelations(_dep) {
        return [
            { label: 'ReplicaSets', comingSoon: 'Requires ownerReferences index' },
            { label: 'Pods',        comingSoon: 'Requires ownerReferences (or label-match)' },
            { label: 'HPAs',        comingSoon: 'Requires scaleTargetRef back-ref' }
        ];
    }

    // ── Node ───────────────────────────────────────────────────────

    function nodeRelations(node) {
        return [
            {
                label: 'Pods on this node',
                fetch: function() {
                    if (!node || !node.name) return Promise.resolve([]);
                    return runQuery('/11/K8sPod',
                        'select * from K8SPod where node=' + node.name + ' limit 200')
                        .then(function(list) {
                            return list.map(function(p) {
                                return {
                                    label: (p.namespace || '?') + '/' + (p.name || '?'),
                                    sublabel: p.ip || '',
                                    target: { entity: p, service: serviceFor('pods') }
                                };
                            });
                        });
                }
            }
        ];
    }

    // ── Helpers ────────────────────────────────────────────────────

    function runQuery(path, queryText) {
        var endpoint = (typeof Layer8DConfig !== 'undefined')
            ? Layer8DConfig.resolveEndpoint(path)
            : '/probler' + path;
        var body = encodeURIComponent(JSON.stringify({ text: queryText }));
        var headers = {};
        var token = sessionStorage.getItem('bearerToken');
        if (token) headers['Authorization'] = 'Bearer ' + token;
        return fetch(endpoint + '?body=' + body, { method: 'GET', headers: headers })
            .then(function(resp) {
                if (!resp.ok) throw new Error('HTTP ' + resp.status);
                return resp.json();
            })
            .then(function(data) { return (data && data.list) || []; });
    }

    function serviceFor(itemKey) {
        if (typeof K8sExplorerConfig === 'undefined') return null;
        var hit = K8sExplorerConfig.findItem(itemKey);
        return hit ? hit.item : null;
    }

    window.K8sExplorerRelated = {
        relationsFor: relationsFor
    };
})();
