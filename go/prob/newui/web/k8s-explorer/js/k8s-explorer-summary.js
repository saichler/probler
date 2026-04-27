/*
 * Kubernetes Explorer — counts + status driven by the K8SCluster summary.
 *
 * Phase 4 of plans/k8s-explorer-portal.md.
 *
 * Strategy: poll the K8SCluster service every 30 s for the *selected*
 * cluster, then map the summary's `total_*` fields to the explorer rail's
 * per-item counts. Some fields also drive a per-item status hint (e.g.
 * `failed_pods > 0` lights the Pods row warning). Group counts are the
 * sum of their item counts so a glance at the rail tells the operator
 * "Workloads has 1.3k things across 8 resource types".
 *
 * Constraints (per plan):
 *   - No per-resource fetches. Stale-by-≤30s is acceptable.
 *   - Empty count → no badge (NOT "0").
 *   - Failed fetch → clear counts + console.warn (no silent fallback).
 *
 * The Layer8DExplorer instance is exposed by k8s-explorer-init.js as
 * `window.K8sExplorerInstance`. K8sExplorerConfig.groups is the rail
 * topology this module pushes counts into.
 */
(function() {
    'use strict';

    var REFRESH_MS = 30 * 1000;
    var timer = null;
    var currentCluster = '';
    var latestSummary = null;
    var subscribers = [];

    // Map of explorer item-key → K8SClusterSummary field name. Item keys
    // come from k8s-explorer-config.js; field names come from the proto.
    // Anything in the rail without a corresponding field is intentionally
    // omitted (e.g. groups themselves, which are computed by sum).
    var ITEM_TO_FIELD = {
        // Workloads
        'pods':         'totalPods',
        'deployments':  'totalDeployments',
        'statefulsets': 'totalStatefulsets',
        'daemonsets':   'totalDaemonsets',
        'replicasets':  'totalReplicasets',
        'jobs':         'totalJobs',
        'cronjobs':     'totalCronjobs',
        'hpas':         'totalHpas',

        // Networking
        'services':         'totalServices',
        'ingresses':        'totalIngresses',
        'network-policies': 'totalNetworkpolicies',
        'endpoints':        'totalEndpoints',
        'endpoint-slices':  'totalEndpointslices',
        'ingress-classes':  'totalIngressclasses',

        // Storage
        'persistent-volumes': 'totalPersistentvolumes',
        'pvcs':               'totalPvcs',
        'storage-classes':    'totalStorageclasses',

        // Config & Access
        'configmaps':            'totalConfigmaps',
        'secrets':               'totalSecrets',
        'resource-quotas':       'totalResourcequotas',
        'limit-ranges':          'totalLimitranges',
        'pdbs':                  'totalPoddisruptionbudgets',
        'service-accounts':      'totalServiceaccounts',
        'roles':                 'totalRoles',
        'cluster-roles':         'totalClusterroles',
        'role-bindings':         'totalRolebindings',
        'cluster-role-bindings': 'totalClusterrolebindings',

        // Tenancy
        'namespaces': 'totalNamespaces',
        'vclusters':  'totalVclusters',
        'crds':       'totalCrds',

        // Nodes
        'nodes': 'totalNodes',

        // Mesh (Istio)
        'virtual-services':  'totalIstioVirtualservices',
        'destination-rules': 'totalIstioDestinationrules',
        'gateways':          'totalIstioGateways',
        'service-entries':   'totalIstioServiceentries',
        'peer-auth':         'totalIstioPeerauthentications',
        'authz-policy':      'totalIstioAuthorizationpolicies',
        'sidecars':          'totalIstioSidecars',
        'envoy-filters':     'totalIstioEnvoyfilters',

        // Events
        'events': 'totalEvents'
    };

    // setCluster is the only public entry point used by the portal init.
    // Called every time the context bar's cluster changes — including the
    // initial onChange after page load.
    function setCluster(name) {
        var changed = name !== currentCluster;
        currentCluster = name || '';
        if (changed) {
            // Clear stale data immediately so the rail doesn't show last
            // cluster's counts while we re-fetch.
            applyEmpty();
        }
        ensureTimer();
        if (currentCluster) {
            fetchAndApply();
        }
    }

    function stop() {
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
    }

    function ensureTimer() {
        if (timer) return;
        timer = setInterval(fetchAndApply, REFRESH_MS);
    }

    function fetchAndApply() {
        if (!currentCluster) {
            applyEmpty();
            return;
        }
        var endpoint = (typeof Layer8DConfig !== 'undefined')
            ? Layer8DConfig.resolveEndpoint('/10/KCluster')
            : '/probler/10/KCluster';
        var query = encodeURIComponent(JSON.stringify({
            text: 'select * from K8SCluster where name=' + currentCluster
        }));
        var headers = {};
        var t = sessionStorage.getItem('bearerToken');
        if (t) headers['Authorization'] = 'Bearer ' + t;

        var requestedFor = currentCluster;
        fetch(endpoint + '?body=' + query, { method: 'GET', headers: headers })
            .then(function(resp) {
                if (!resp.ok) throw new Error('HTTP ' + resp.status);
                return resp.json();
            })
            .then(function(data) {
                // Late response — a faster cluster switch may have come in
                // while this fetch was inflight; ignore stale results.
                if (requestedFor !== currentCluster) return;
                var summary = extractSummary(data);
                if (!summary) {
                    latestSummary = null;
                    applyEmpty();
                    notify();
                    if (typeof console !== 'undefined' && console.warn) {
                        console.warn('K8sExplorerSummary: K8SCluster lookup returned no summary for "' + requestedFor + '"');
                    }
                    return;
                }
                latestSummary = summary;
                applySummary(summary);
                notify();
            })
            .catch(function(err) {
                if (requestedFor !== currentCluster) return;
                latestSummary = null;
                applyEmpty();
                notify();
                if (typeof console !== 'undefined' && console.warn) {
                    console.warn('K8sExplorerSummary: fetch failed for "' + requestedFor + '"', err);
                }
            });
    }

    function notify() {
        for (var i = 0; i < subscribers.length; i++) {
            try { subscribers[i](latestSummary, currentCluster); } catch (e) {
                if (typeof console !== 'undefined' && console.warn) {
                    console.warn('K8sExplorerSummary subscriber threw:', e);
                }
            }
        }
    }

    function extractSummary(data) {
        if (!data) return null;
        var list = data.list || (Array.isArray(data) ? data : null);
        if (!list || list.length === 0) return null;
        var c = list[0];
        return c && c.summary ? c.summary : null;
    }

    function applyEmpty() {
        var explorer = window.K8sExplorerInstance;
        if (!explorer) return;
        var counts = {};
        var status = {};
        // Set every known key to empty so the badges/dots disappear cleanly.
        for (var k in ITEM_TO_FIELD) counts[k] = '';
        // Group keys too.
        var groups = (window.K8sExplorerConfig && K8sExplorerConfig.groups) || [];
        for (var g = 0; g < groups.length; g++) counts[groups[g].key] = '';
        // Status: clear any item key we might have set previously.
        for (var sk in ITEM_TO_FIELD) status[sk] = '';
        for (var sg = 0; sg < groups.length; sg++) status[groups[sg].key] = '';
        explorer.setCounts(counts);
        explorer.setStatus(status);
    }

    function applySummary(summary) {
        var explorer = window.K8sExplorerInstance;
        if (!explorer) return;

        var counts = {};
        var statuses = {};

        // Item-level counts.
        for (var itemKey in ITEM_TO_FIELD) {
            var fld = ITEM_TO_FIELD[itemKey];
            var v = numericOrNull(summary[fld]);
            counts[itemKey] = v === null ? '' : v;
        }

        // Item-level status hints. We set ok / warning / critical
        // intentionally per field; everything else is left undecorated.
        // Empty string means "clear any existing status" (per
        // Layer8DExplorer.setStatus contract).
        statuses['pods']         = podStatus(summary);
        statuses['deployments']  = readinessStatus(summary.totalDeployments, summary.availableDeployments);
        statuses['statefulsets'] = readinessStatus(summary.totalStatefulsets, summary.readyStatefulsets);
        statuses['daemonsets']   = readinessStatus(summary.totalDaemonsets, summary.readyDaemonsets);
        statuses['nodes']        = readinessStatus(summary.totalNodes, summary.readyNodes);
        statuses['pvcs']         = readinessStatus(summary.totalPvcs, summary.boundPvcs);
        statuses['persistent-volumes'] =
            readinessStatus(summary.totalPersistentvolumes, summary.boundPersistentvolumes);
        statuses['events']       = eventsStatus(summary);

        // Group counts = sum of child item counts (when any child has a count).
        var groups = (window.K8sExplorerConfig && K8sExplorerConfig.groups) || [];
        for (var i = 0; i < groups.length; i++) {
            var g = groups[i];
            if (!g.items || g.items.length === 0) continue;
            var sum = 0;
            var any = false;
            var childWorst = ''; // '' < 'ok' < 'warning' < 'critical'
            for (var j = 0; j < g.items.length; j++) {
                var ck = g.items[j].key;
                if (typeof counts[ck] === 'number') {
                    sum += counts[ck];
                    any = true;
                }
                childWorst = worseStatus(childWorst, statuses[ck]);
            }
            counts[g.key] = any ? sum : '';
            statuses[g.key] = childWorst;
        }

        explorer.setCounts(counts);
        explorer.setStatus(statuses);
    }

    function podStatus(s) {
        var failed = numericOrNull(s.failedPods) || 0;
        var pending = numericOrNull(s.pendingPods) || 0;
        if (failed > 0) return 'critical';
        if (pending > 0) return 'warning';
        return '';
    }

    // readinessStatus returns 'warning' when ready < total, 'ok' when
    // both numbers are present and equal-and-positive, '' otherwise.
    // We deliberately do NOT light a critical state on ready/total
    // skew — that's a soft degradation, not a failure. The Pod
    // critical state is reserved for `failedPods > 0` which is a hard
    // signal.
    function readinessStatus(total, ready) {
        var t = numericOrNull(total);
        var r = numericOrNull(ready);
        if (t === null || r === null) return '';
        if (t === 0) return ''; // nothing to be ready about
        if (r < t) return 'warning';
        return ''; // healthy → no badge dot (less rail noise)
    }

    function eventsStatus(s) {
        var w = numericOrNull(s.warningEvents) || 0;
        if (w > 0) return 'warning';
        return '';
    }

    function worseStatus(a, b) {
        var rank = { '': 0, 'ok': 1, 'warning': 2, 'critical': 3 };
        var ra = rank[a] || 0;
        var rb = rank[b] || 0;
        return ra >= rb ? a : b;
    }

    function numericOrNull(v) {
        if (v === null || v === undefined || v === '') return null;
        var n = typeof v === 'number' ? v : Number(v);
        return isFinite(n) ? n : null;
    }

    window.K8sExplorerSummary = {
        setCluster: setCluster,
        stop: stop,
        getLatest: function() { return latestSummary; },
        subscribe: function(fn) {
            if (typeof fn !== 'function') return function() {};
            subscribers.push(fn);
            return function unsubscribe() {
                var idx = subscribers.indexOf(fn);
                if (idx !== -1) subscribers.splice(idx, 1);
            };
        }
    };
})();
