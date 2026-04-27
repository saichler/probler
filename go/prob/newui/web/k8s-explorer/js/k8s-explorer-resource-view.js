/*
 * Kubernetes Explorer — resource view (table for the selected rail item).
 *
 * Mounts a Layer8DTable into the explorer's main pane for whatever
 * service the user clicked in the rail. Reuses the classic K8s section's
 * column definitions (`ProblerK8s.columns[<model>]`) — those files are
 * pure data and live in `web/probler/k8s/`. The classic-section
 * `K8sTables.create` helper is intentionally NOT used here: it doesn't
 * accept a namespace filter and doesn't know about the explorer's detail
 * popup wrapper. Instead we build the Layer8DTable directly with the
 * same shape but a composite baseWhereClause.
 *
 * Cluster-scoped resource types do NOT receive a `namespace=…` filter
 * even when one is selected — applying it would yield an empty list.
 *
 * Phase 6 search wires through to `extraFilters.name` so the search box
 * narrows the visible rows by name (client-side, scoped to the loaded
 * page).
 */
(function() {
    'use strict';

    // Items whose underlying K8s resource is cluster-scoped (no namespace).
    // Anything not listed here is treated as namespace-scoped.
    var CLUSTER_SCOPED_ITEMS = {
        'nodes': 1,
        'namespaces': 1,
        'crds': 1,
        'persistent-volumes': 1,
        'storage-classes': 1,
        'cluster-roles': 1,
        'cluster-role-bindings': 1,
        'ingress-classes': 1
    };

    var current = null; // { table, containerId, service, slotId, extraWhere }

    /**
     * Show a resource view for the given service in the given container.
     * service is one of the entries from K8sExplorerConfig.groups[].items.
     * context is the current Layer8DContextBar snapshot
     * { cluster, namespace, search }.
     */
    function show(containerId, service, context) {
        var container = document.getElementById(containerId);
        if (!container) return;
        if (typeof Layer8DTable === 'undefined') {
            container.innerHTML = '<div class="k8s-explorer-empty"><div class="k8s-explorer-empty-inner"><p>Layer8DTable not loaded.</p></div></div>';
            return;
        }
        var columns = (window.ProblerK8s && ProblerK8s.columns && ProblerK8s.columns[service.model]) || null;
        if (!columns) {
            container.innerHTML = '<div class="k8s-explorer-empty"><div class="k8s-explorer-empty-inner"><p>No column definitions for ' + escapeHtml(service.model) + '.</p></div></div>';
            return;
        }

        // Mount slot. Layer8DTable expects its own container.
        var slotId = 'k8s-explorer-table-' + service.key;
        container.innerHTML =
            '<div class="k8s-explorer-resource-view">'
            + '<div class="k8s-explorer-resource-header">'
            +   '<h2 class="k8s-explorer-resource-title">' + escapeHtml(service.label) + '</h2>'
            +   '<div class="k8s-explorer-resource-scope" id="' + slotId + '-scope"></div>'
            + '</div>'
            + '<div class="k8s-explorer-resource-table" id="' + slotId + '"></div>'
            + '</div>';

        renderScope(slotId, service, context);
        var baseWhere = composeWhere(service, context);

        var table = new Layer8DTable({
            containerId: slotId,
            endpoint: Layer8DConfig.resolveEndpoint(service.endpoint),
            modelName: service.model,
            columns: columns,
            pageSize: 50,
            serverSide: true,
            sortable: true,
            filterable: true,
            baseWhereClause: baseWhere,
            showActions: false,
            onRowClick: function(item) {
                // Use the explorer's detail wrapper (Phase 7 adds a
                // Related tab); falls back to classic K8sDetail.show
                // when the wrapper isn't loaded.
                if (typeof K8sExplorerDetail !== 'undefined' && K8sExplorerDetail.show) {
                    K8sExplorerDetail.show(item, service);
                } else if (typeof K8sDetail !== 'undefined' && K8sDetail.show) {
                    K8sDetail.show(item, service);
                }
            }
        });
        table.init();

        // Apply the initial search term, if present.
        if (context && context.search) {
            applySearch(table, context.search);
        }

        current = {
            table: table,
            containerId: containerId,
            service: service,
            slotId: slotId,
            extraWhere: ''
        };
    }

    /**
     * Re-apply the cluster + namespace filters on the active view (e.g.
     * after the context bar changes). If the active service no longer
     * matches the new context's cluster, the table re-fetches.
     */
    function refreshContext(context) {
        if (!current || !current.table) return;
        var baseWhere = composeWhere(current.service, context);
        if (current.extraWhere) {
            baseWhere = baseWhere ? baseWhere + ' and ' + current.extraWhere : current.extraWhere;
        }
        current.table.setBaseWhereClause(baseWhere);
        renderScope(current.slotId, current.service, context);
        // Reapply search after refetch.
        applySearch(current.table, context && context.search);
    }

    /**
     * Layer the given extra clause on top of cluster + namespace.
     * Used by the action-card overview when the user clicks "Pending Pods"
     * etc. — the cards carry a `baseWhereClause` that should narrow the
     * resource view further without disturbing the user's chosen
     * cluster/namespace.
     */
    function setExtraWhere(extra) {
        if (!current || !current.table) return;
        current.extraWhere = extra || '';
        var ctx = (window.K8sExplorerContextBar
            ? K8sExplorerContextBar.getContext()
            : { cluster: '', namespace: '', search: '' });
        var base = composeWhere(current.service, ctx);
        var composed = base
            ? (current.extraWhere ? base + ' and ' + current.extraWhere : base)
            : current.extraWhere;
        current.table.setBaseWhereClause(composed);
    }

    /**
     * Apply the search query as a client-side row filter. Operates on the
     * already-rendered DOM so it does not refetch — exactly what Phase 6
     * specifies for "filter the current view's name column".
     */
    function applySearch(tableOrUndef, query) {
        var t = tableOrUndef || (current && current.table);
        if (!t) return;
        var slotId = current && current.slotId;
        if (!slotId) return;
        var slot = document.getElementById(slotId);
        if (!slot) return;
        var rows = slot.querySelectorAll('tbody tr');
        var q = (query || '').toLowerCase().trim();
        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            if (!q) { row.style.display = ''; continue; }
            var nameCell = row.querySelector('[data-col="name"], td:nth-child(1), td:nth-child(2)');
            // Fall back: any cell text contains the query.
            var hay = (nameCell ? nameCell.textContent : row.textContent) || '';
            row.style.display = hay.toLowerCase().indexOf(q) === -1 ? 'none' : '';
        }
    }

    function clear() {
        current = null;
    }

    function getCurrentService() {
        return current && current.service;
    }

    function composeWhere(service, context) {
        var clauses = [];
        if (context && context.cluster) {
            clauses.push('clusterName=' + context.cluster);
        }
        if (context && context.namespace && !CLUSTER_SCOPED_ITEMS[service.key]) {
            clauses.push('namespace=' + context.namespace);
        }
        return clauses.join(' and ');
    }

    function renderScope(slotId, service, context) {
        var scopeEl = document.getElementById(slotId + '-scope');
        if (!scopeEl) return;
        var bits = [];
        bits.push('<span class="k8s-explorer-scope-pill">' + escapeHtml(service.model) + '</span>');
        if (context && context.cluster) {
            bits.push('<span class="k8s-explorer-scope-pill">cluster: ' + escapeHtml(context.cluster) + '</span>');
        }
        if (context && context.namespace && !CLUSTER_SCOPED_ITEMS[service.key]) {
            bits.push('<span class="k8s-explorer-scope-pill">namespace: ' + escapeHtml(context.namespace) + '</span>');
        } else if (CLUSTER_SCOPED_ITEMS[service.key]) {
            bits.push('<span class="k8s-explorer-scope-pill k8s-explorer-scope-muted">cluster-scoped</span>');
        }
        scopeEl.innerHTML = bits.join(' ');
    }

    function escapeHtml(s) {
        if (s === null || s === undefined) return '';
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    window.K8sExplorerResourceView = {
        show: show,
        refreshContext: refreshContext,
        applySearch: applySearch,
        clear: clear,
        getCurrentService: getCurrentService,
        isClusterScoped: function(item) { return !!CLUSTER_SCOPED_ITEMS[item]; },
        // Internal — used by the action-card flow in k8s-explorer-init.js
        // to narrow the active view without re-mounting.
        _setExtraWhere: setExtraWhere
    };
})();
