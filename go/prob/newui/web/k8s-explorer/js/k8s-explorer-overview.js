/*
 * Kubernetes Explorer — action-oriented overview.
 *
 * The default Overview lands the operator in a grid of "verbs":
 *   • Pending Pods          → Pods view, status=PENDING
 *   • Failing Pods          → Pods view, status in (FAILED, CRASHLOOP, ERROR…)
 *   • Unavailable Deploys   → Deployments view, the unhealthy slice
 *   • Failing Jobs          → Jobs view, condition=FAILED
 *   • Warning Events        → Events view, type=Warning
 *   • Storage health        → PVCs view, the unbound slice
 *
 * Cards drive directly off the K8SCluster summary (already polled every
 * 30 s by k8s-explorer-summary.js). When a value is zero or missing the
 * card still renders but with neutral styling — operators see
 * everything's quiet at a glance.
 *
 * Card click semantics: navigate the rail to the target item AND apply
 * a baseWhereClause filter so the resource view loads pre-filtered.
 */
(function() {
    'use strict';

    // Pod-status enum values (from proto K8SPodStatus). Defined here so
    // we don't pull in the classic enums file just to read these.
    var POD_PENDING = 2;
    var POD_FAILED = 4;
    var POD_CRASHLOOP = 6;
    var POD_IMAGEPULL = 9;
    var POD_ERROR = 10;
    var JOB_FAILED = 2;

    // Card definitions. `valueFn(summary)` extracts the headline number;
    // `severityFn(value, summary)` chooses the severity (or empty for
    // neutral). `target` carries the navigation hint that the consumer's
    // onClick handler interprets.
    var CARDS = [
        {
            id: 'cluster-health', label: 'Cluster Status', icon: '◉',
            valueFn: function(s) { return s ? 'Online' : '—'; },
            severityFn: function(_, s) {
                if (!s) return '';
                if (n(s.failedPods) > 0) return 'critical';
                if (n(s.pendingPods) > 0) return 'warning';
                return 'ok';
            },
            sublabelFn: function(s) {
                if (!s) return '';
                return n(s.totalNodes) + ' nodes · ' + n(s.totalNamespaces) + ' namespaces';
            }
            // No target — informational header card.
        },
        {
            id: 'pending-pods', label: 'Pending Pods', icon: '⏳',
            valueFn: function(s) { return n(s.pendingPods); },
            severityFn: function(v) { return v > 0 ? 'warning' : 'ok'; },
            sublabelFn: function(s) {
                var v = n(s.pendingPods);
                return v > 0 ? 'awaiting scheduling' : 'all pods scheduled';
            },
            target: { groupKey: 'workloads', itemKey: 'pods', baseWhereClause: 'status=' + POD_PENDING }
        },
        {
            id: 'failing-pods', label: 'Failing Pods', icon: '✖',
            valueFn: function(s) { return n(s.failedPods); },
            severityFn: function(v) { return v > 0 ? 'critical' : 'ok'; },
            sublabelFn: function(s) {
                var v = n(s.failedPods);
                return v > 0 ? 'including crashloop / errors' : 'no failures';
            },
            // L8Query OR isn't universally supported; we filter by the
            // single most common bad state and let users drill from there.
            target: { groupKey: 'workloads', itemKey: 'pods', baseWhereClause: 'status=' + POD_FAILED }
        },
        {
            id: 'running-pods', label: 'Running Pods', icon: '▶',
            valueFn: function(s) { return n(s.runningPods); },
            severityFn: function() { return ''; },
            sublabelFn: function(s) {
                return 'of ' + n(s.totalPods) + ' total';
            },
            target: { groupKey: 'workloads', itemKey: 'pods' }
        },
        {
            id: 'unavailable-deployments', label: 'Degraded Deployments', icon: '⚠',
            valueFn: function(s) {
                var t = n(s.totalDeployments);
                var a = n(s.availableDeployments);
                return Math.max(0, t - a);
            },
            severityFn: function(v) { return v > 0 ? 'warning' : 'ok'; },
            sublabelFn: function(s) {
                var t = n(s.totalDeployments);
                var a = n(s.availableDeployments);
                if (t === 0) return 'no deployments';
                return a + '/' + t + ' available';
            },
            target: { groupKey: 'workloads', itemKey: 'deployments' }
        },
        {
            id: 'failing-jobs', label: 'Failed Jobs', icon: '✖',
            valueFn: function(s) {
                // Summary doesn't yet expose failedJobs; show totalJobs
                // as a hint, target the Jobs view with condition=FAILED.
                return n(s.totalJobs);
            },
            severityFn: function() { return ''; },
            sublabelFn: function(s) {
                var a = n(s.activeJobs);
                return a > 0 ? a + ' active' : 'click to inspect';
            },
            target: { groupKey: 'workloads', itemKey: 'jobs', baseWhereClause: 'condition=' + JOB_FAILED }
        },
        {
            id: 'warning-events', label: 'Warning Events', icon: '⚠',
            valueFn: function(s) { return n(s.warningEvents); },
            severityFn: function(v) { return v > 0 ? 'warning' : 'ok'; },
            sublabelFn: function(s) {
                var t = n(s.totalEvents);
                return 'of ' + t + ' total events';
            },
            target: { groupKey: 'events', itemKey: 'events', baseWhereClause: "type='Warning'" }
        },
        {
            id: 'storage', label: 'Unbound PVCs', icon: '💾',
            valueFn: function(s) {
                var t = n(s.totalPvcs);
                var b = n(s.boundPvcs);
                return Math.max(0, t - b);
            },
            severityFn: function(v) { return v > 0 ? 'warning' : 'ok'; },
            sublabelFn: function(s) {
                var t = n(s.totalPvcs);
                var b = n(s.boundPvcs);
                if (t === 0) return 'no PVCs';
                return b + '/' + t + ' bound';
            },
            target: { groupKey: 'storage', itemKey: 'pvcs' }
        },
        {
            id: 'node-readiness', label: 'Nodes', icon: '🖥',
            valueFn: function(s) { return n(s.totalNodes); },
            severityFn: function(_, s) {
                if (!s) return '';
                var t = n(s.totalNodes), r = n(s.readyNodes);
                if (t === 0) return '';
                return r < t ? 'warning' : 'ok';
            },
            sublabelFn: function(s) {
                var t = n(s.totalNodes), r = n(s.readyNodes);
                if (t === 0) return '—';
                return r + '/' + t + ' ready';
            },
            target: { groupKey: 'nodes', itemKey: 'nodes' }
        }
    ];

    /**
     * Render the action-card grid for the given summary.
     *
     * @param {string} containerId
     * @param {object|null} summary  current K8SCluster summary, or null when
     *                               none is available (renders dim cards).
     * @param {function} onCardClick called with (target, card)
     */
    function show(containerId, summary, onCardClick) {
        var container = document.getElementById(containerId);
        if (!container) return;
        if (typeof Layer8DActionCard === 'undefined') {
            container.innerHTML = '<div class="k8s-explorer-empty"><div class="k8s-explorer-empty-inner"><p>Layer8DActionCard not loaded.</p></div></div>';
            return;
        }
        // Hero header — same Probler `.l8-header-frame` look as the
        // resource views, so the Overview landing matches the rest of
        // the explorer's chrome instead of standing out as a one-off.
        var heroHtml = (typeof Layer8SectionGenerator !== 'undefined' && Layer8SectionGenerator.renderHero)
            ? Layer8SectionGenerator.renderHero({
                title:    'KUBERNETES OVERVIEW',
                subtitle: 'Cluster health at a glance · click a card to drill in',
                svgKey:   'k8s-explorer'
              })
            : '<h2>Overview</h2>';
        container.innerHTML =
            '<div class="k8s-explorer-overview">'
            + heroHtml
            + '<div class="k8s-explorer-overview-grid" id="' + containerId + '-grid"></div>'
            + (summary ? '' : '<p class="k8s-explorer-overview-stale">No cluster summary available yet — counts will appear once the next 30-second poll lands.</p>')
            + '</div>';

        var grid = document.getElementById(containerId + '-grid');
        var cards = buildCards(summary);
        Layer8DActionCard.renderGrid(grid, cards, function(target, card) {
            if (typeof onCardClick === 'function') onCardClick(target, card);
        });
    }

    function buildCards(summary) {
        var s = summary || {};
        var out = [];
        for (var i = 0; i < CARDS.length; i++) {
            var def = CARDS[i];
            var value = def.valueFn ? def.valueFn(s) : '';
            var severity = def.severityFn ? def.severityFn(value, s) : '';
            var sublabel = def.sublabelFn ? def.sublabelFn(s) : '';
            out.push({
                id: def.id,
                label: def.label,
                icon: def.icon,
                value: summary ? value : '—',
                severity: summary ? severity : '',
                sublabel: summary ? sublabel : '',
                target: def.target || null
            });
        }
        return out;
    }

    function n(v) {
        if (v === null || v === undefined || v === '') return 0;
        var x = typeof v === 'number' ? v : Number(v);
        return isFinite(x) ? x : 0;
    }

    window.K8sExplorerOverview = {
        show: show,
        buildCards: buildCards
    };
})();
