// Kubernetes Overview view — fetches K8SCluster summary for the selected
// cluster and renders a Layer8DWidget grid of category cards. Click a card
// to activate that category's tab.
//
// Per the plan:
//   - Uses Layer8DWidget.render (not a custom card grid).
//   - L8Query uses the protobuf JSON name: where name=<cluster>.
//   - If no row exists yet, shows a placeholder card and retries every 5 s.
(function() {
    'use strict';

    var RETRY_MS = 5000;
    var pendingRetry = null;

    function escHtml(s) {
        var div = document.createElement('div');
        div.textContent = String(s == null ? '' : s);
        return div.innerHTML;
    }

    function fetchClusterSummary(clusterName, cb) {
        var endpoint = Layer8DConfig.resolveEndpoint('/10/KCluster');
        var query = encodeURIComponent(JSON.stringify({
            text: 'select * from K8SCluster where name=' + clusterName
        }));
        var url = endpoint + '?body=' + query;
        var headers = (typeof getAuthHeaders === 'function') ? getAuthHeaders() : {};
        fetch(url, { method: 'GET', headers: headers })
            .then(function(r) { return r.ok ? r.json() : { list: [] }; })
            .then(function(data) {
                var list = (data && data.list) || [];
                cb(list.length > 0 ? list[0] : null);
            })
            .catch(function() { cb(null); });
    }

    function renderPlaceholder(container, clusterName) {
        container.innerHTML =
            '<div class="layer8d-widget" style="grid-column:1/-1;cursor:default;">'
                + '<div class="layer8d-widget-header">'
                    + '<div class="layer8d-widget-info">'
                        + '<div class="layer8d-widget-value">…</div>'
                        + '<div class="layer8d-widget-label">'
                            + 'Cluster ' + escHtml(clusterName)
                            + ' not yet reported — waiting for adcon'
                        + '</div>'
                    + '</div>'
                + '</div>'
            + '</div>';
    }

    function renderGrid(container, cluster) {
        var summary = (cluster && cluster.summary) || {};
        var html = '<div class="k8s-overview-meta">'
            + '<span class="k8s-overview-meta-name">' + escHtml(cluster.name || '-') + '</span>'
            + (cluster.k8sVersion ? '<span class="k8s-overview-meta-pill">' + escHtml(cluster.k8sVersion) + '</span>' : '')
            + (cluster.platform ? '<span class="k8s-overview-meta-pill">' + escHtml(cluster.platform) + '</span>' : '')
            + '</div>';
        html += '<div class="k8s-overview-grid">';
        var kpis = window.K8sOverviewKPIs || [];
        for (var i = 0; i < kpis.length; i++) {
            var kpi = kpis[i];
            var stats = kpi.statsFn(summary) || { value: 0, sublabel: '' };
            html += '<div class="k8s-overview-card-wrap" data-category="' + escHtml(kpi.key) + '">';
            html += Layer8DWidget.render(
                {
                    label: kpi.label + (stats.sublabel ? ' — ' + stats.sublabel : ''),
                    icon: 'k8s-' + kpi.key,
                    iconSvg: '<span class="k8s-overview-card-icon">' + escHtml(kpi.icon) + '</span>',
                    onClick: "K8sCategoryNav.activate('" + kpi.key + "')"
                },
                stats.value,
                {}
            );
            html += '</div>';
        }
        html += '</div>';
        container.innerHTML = html;
    }

    function show(containerId, clusterName) {
        var container = document.getElementById(containerId);
        if (!container) return;
        if (pendingRetry) { clearTimeout(pendingRetry); pendingRetry = null; }
        if (!clusterName) {
            renderPlaceholder(container, '');
            return;
        }
        fetchClusterSummary(clusterName, function(cluster) {
            if (!cluster) {
                renderPlaceholder(container, clusterName);
                pendingRetry = setTimeout(function() {
                    show(containerId, clusterName);
                }, RETRY_MS);
                return;
            }
            renderGrid(container, cluster);
        });
    }

    window.K8sOverview = { show: show };
})();
