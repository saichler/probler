/*
 * Kubernetes Explorer portal — bootstrap.
 *
 * Responsibilities (cumulative as phases land):
 *   - Auth gate (redirect to login if no bearer token).
 *   - Load shared Layer8DConfig (apiPrefix, dateFormat).
 *   - Initialize the theme picker so the portal honors the user's theme.
 *   - Initialize the portal switcher so the user can hop back to /app.html.
 *   - Show the username in the header.
 *   - Mount Layer8DExplorer rail with K8s groups (Phase 2).
 *   - Mount Layer8DContextBar with cluster + namespace + search (Phase 3).
 *   - Drive rail counts/status from K8SCluster summary (Phase 4).
 *
 * Phase 5+ extends this file to drive the main pane (overview cards / resource
 * tables) from explorer selection + context-bar values.
 */
(function() {
    'use strict';

    // Auth gate — bounce to login and remember the redirect.
    var token = sessionStorage.getItem('bearerToken');
    if (!token) {
        window.location.href = 'login.html?redirect=k8s-explorer.html';
        return;
    }

    // Surface the username (matches app.html behavior).
    var username = sessionStorage.getItem('username') || 'Admin';
    var usernameEl = document.getElementById('k8s-explorer-username');
    if (usernameEl) usernameEl.textContent = username;

    // Bootstrap async pieces in order: config → theme → portal switcher.
    // Each step degrades gracefully if its dependency is missing so that
    // a broken include order produces a visible warning instead of a
    // silent blank screen.
    (async function() {
        if (typeof Layer8DConfig !== 'undefined') {
            try {
                await Layer8DConfig.load();
            } catch (e) {
                if (typeof console !== 'undefined' && console.warn) {
                    console.warn('K8sExplorer: Layer8DConfig.load failed:', e);
                }
            }
        } else if (typeof console !== 'undefined' && console.warn) {
            console.warn('K8sExplorer: Layer8DConfig missing — script include order may be wrong.');
        }

        // Theme picker — same component as app.html. If the script wasn't
        // loaded, the button's onclick will throw at click time; logging
        // here makes the cause obvious.
        if (typeof Layer8DThemeSwitcher === 'undefined' && typeof console !== 'undefined' && console.warn) {
            console.warn('K8sExplorer: Layer8DThemeSwitcher missing — theme picker will not respond.');
        }

        // Portal switcher dropdown.
        if (typeof Layer8DPortalSwitcher !== 'undefined') {
            var headerRight = document.querySelector('.k8s-explorer-header-right');
            var userMenu = document.querySelector('.k8s-explorer-header-right .user-menu');
            if (headerRight) {
                Layer8DPortalSwitcher.init({
                    container: headerRight,
                    insertBefore: userMenu,
                    apiPrefix: typeof Layer8DConfig !== 'undefined'
                        ? Layer8DConfig.getApiPrefix()
                        : '',
                    currentPath: window.location.pathname
                });
            }
        } else if (typeof console !== 'undefined' && console.warn) {
            console.warn('K8sExplorer: Layer8DPortalSwitcher missing — no inter-portal navigation.');
        }

        // ── Phase 2: Layer8DExplorer rail ───────────────────────────
        // The rail is the left navigator. Its selection drives the main
        // pane. Today (Phase 2) selecting an item is a no-op log + a
        // Layer8DRouter write (`k8s.group`, `k8s.item`); Phase 4 wires
        // the Overview cards and Phase 5 swaps in resource views.
        mountExplorer();

        // ── Phase 3: Layer8DContextBar (cluster + namespace + search) ─
        // Cluster + namespace persist via Layer8DRouter (`k8s.cluster`,
        // `k8s.namespace`). Phase 4/5 read getContext() to apply
        // baseWhereClause to resource views; today the change handler
        // just logs.
        mountContextBar();
    })();

    function mountExplorer() {
        if (typeof Layer8DExplorer === 'undefined') {
            if (typeof console !== 'undefined' && console.warn) {
                console.warn('K8sExplorer: Layer8DExplorer missing — rail will not render.');
            }
            return;
        }
        if (typeof K8sExplorerConfig === 'undefined' || !K8sExplorerConfig.groups) {
            if (typeof console !== 'undefined' && console.warn) {
                console.warn('K8sExplorer: K8sExplorerConfig.groups missing — rail has no content.');
            }
            return;
        }
        var rail = document.getElementById('k8s-explorer-rail');
        if (!rail) return;
        rail.innerHTML = ''; // remove the Phase 1 placeholder

        // Hydrate initial selection from URL (Layer8DRouter) so a refresh
        // restores the operator's last view. Defaults to overview.
        var routerGroup = '';
        var routerItem  = '';
        if (typeof Layer8DRouter !== 'undefined') {
            routerGroup = Layer8DRouter.get('k8s.group') || '';
            routerItem  = Layer8DRouter.get('k8s.item')  || '';
        }
        var initialSelection = resolveInitialSelection(routerGroup, routerItem);

        var explorer = new Layer8DExplorer({
            containerId: 'k8s-explorer-rail',
            namespace: 'k8s',
            groups: K8sExplorerConfig.groups,
            favorites: window.Layer8DFavorites
                ? toRailFavorites(Layer8DFavorites.list('k8s'))
                : [],
            recents: window.Layer8DRecents
                ? toRailRecents(Layer8DRecents.list('k8s'))
                : [],
            selected: initialSelection,
            onSelect: function(groupKey, itemKey) {
                if (typeof Layer8DRouter !== 'undefined') {
                    Layer8DRouter.setMany({
                        'k8s.group': groupKey || '',
                        'k8s.item':  itemKey  || ''
                    });
                }
                // Phase 8: every rail click is a recents touch.
                if (groupKey && itemKey && window.Layer8DRecents) {
                    var hit = K8sExplorerConfig.findItem(itemKey);
                    if (hit) {
                        Layer8DRecents.touch('k8s', {
                            kind: 'resource',
                            key: itemKey,
                            label: hit.item.label,
                            group: groupKey,
                            icon: hit.group.icon || ''
                        });
                    }
                }
                // Phase 5: drive the main pane.
                renderMainPane(groupKey, itemKey);
            },
            onToggleFavorite: function(target) {
                if (!window.Layer8DFavorites) return;
                if (!target.groupKey || !target.itemKey) return;
                Layer8DFavorites.toggle('k8s', {
                    key: target.itemKey,
                    label: target.label,
                    group: target.groupKey,
                    icon: target.icon || ''
                });
                // Subscriber will re-push into explorer.setFavorites.
            }
        });
        explorer.render();
        window.K8sExplorerInstance = explorer; // expose for later phases / debugging

        // Phase 8: keep the explorer's favorites/recents in sync as the
        // user pins, unpins, and visits items.
        if (window.Layer8DFavorites && Layer8DFavorites.subscribe) {
            Layer8DFavorites.subscribe('k8s', function(list) {
                explorer.setFavorites(toRailFavorites(list));
            });
        }
        if (window.Layer8DRecents && Layer8DRecents.subscribe) {
            Layer8DRecents.subscribe('k8s', function(list) {
                explorer.setRecents(toRailRecents(list));
            });
        }

        // Render the initial selection's content right away (rail.onSelect
        // only fires on user interaction; this kicks the first render).
        renderMainPane(initialSelection.group, initialSelection.item);
    }

    // Mappers from Layer8DFavorites/Recents storage shape → rail shape.
    // Today both store a small subset of the rail item; mappers exist so
    // a future schema change in the utility doesn't ripple to the rail.

    function toRailFavorites(list) {
        if (!Array.isArray(list)) return [];
        return list
            .filter(function(f) { return f && f.kind !== 'object'; }) // resource pins only
            .map(function(f) {
                return { key: f.key, label: f.label, group: f.group, icon: f.icon || '' };
            });
    }

    function toRailRecents(list) {
        if (!Array.isArray(list)) return [];
        // Resource recents only on the rail. Object recents are stored
        // (so K8sExplorerDetail can populate them) but are not yet
        // rendered on the rail — that's a follow-up plan once we have
        // a sensible "open last detail" UX.
        return list
            .filter(function(r) { return r && (r.kind === 'resource' || !r.kind); })
            .slice(0, 8)
            .map(function(r) {
                return { key: r.key, label: r.label, group: r.group, icon: r.icon || '' };
            });
    }

    function resolveInitialSelection(routerGroup, routerItem) {
        if (routerGroup) {
            var g = K8sExplorerConfig.findGroup(routerGroup);
            if (g) {
                if (routerItem && g.items) {
                    for (var i = 0; i < g.items.length; i++) {
                        if (g.items[i].key === routerItem) {
                            return { group: routerGroup, item: routerItem };
                        }
                    }
                }
                // Group exists but item didn't — fall back to first item or
                // leaf-group selection.
                if (g.items && g.items.length > 0) {
                    return { group: routerGroup, item: g.items[0].key };
                }
                return { group: routerGroup, item: null };
            }
        }
        // Default to overview leaf.
        return { group: 'overview', item: null };
    }

    function mountContextBar() {
        if (typeof Layer8DContextBar === 'undefined') {
            if (typeof console !== 'undefined' && console.warn) {
                console.warn('K8sExplorer: Layer8DContextBar missing — context bar will not render.');
            }
            return;
        }
        var bar = new Layer8DContextBar({
            containerId: 'k8s-explorer-context-bar',
            contexts: [
                {
                    key: 'cluster',
                    label: 'Cluster',
                    optionsFetcher: fetchClusters,
                    persistTo: 'k8s.cluster'
                },
                {
                    key: 'namespace',
                    label: 'Namespace',
                    dependsOn: ['cluster'],
                    allowAll: true,
                    allLabel: 'All namespaces',
                    optionsFetcher: fetchNamespaces,
                    persistTo: 'k8s.namespace'
                }
            ],
            search: {
                placeholder: 'Search current view...',
                onInput: function(query) {
                    // Phase 6: client-side filter against the active
                    // resource view's loaded rows.
                    if (window.K8sExplorerResourceView
                        && K8sExplorerResourceView.applySearch) {
                        K8sExplorerResourceView.applySearch(undefined, query);
                    }
                }
            },
            onChange: function(ctx) {
                // Phase 4: refresh rail counts when cluster changes.
                if (window.K8sExplorerSummary) {
                    K8sExplorerSummary.setCluster(ctx.cluster || '');
                }
                // Phase 5: re-apply baseWhereClause to the active resource
                // view (when one is mounted) so cluster + namespace
                // changes propagate without re-mounting the table.
                if (window.K8sExplorerResourceView
                    && K8sExplorerResourceView.refreshContext) {
                    K8sExplorerResourceView.refreshContext(ctx);
                }
            }
        });
        bar.render();
        window.K8sExplorerContextBar = bar; // expose for later phases / debugging

        // Phase 5: react to summary updates so the Overview action cards
        // refresh when the K8SCluster summary polls in.
        if (window.K8sExplorerSummary && K8sExplorerSummary.subscribe) {
            K8sExplorerSummary.subscribe(function(_summary) {
                // Re-render only when Overview is currently selected.
                if (currentMain && currentMain.kind === 'overview') {
                    renderMainPane(currentMain.groupKey, currentMain.itemKey);
                }
            });
        }
    }

    // ── Main-pane router ────────────────────────────────────────────
    // Mounts either the Overview action-card grid or a resource view
    // (Layer8DTable) into #k8s-explorer-main, depending on the current
    // rail selection.

    var currentMain = null;

    function renderMainPane(groupKey, itemKey) {
        var main = document.getElementById('k8s-explorer-main');
        if (!main) return;

        if (groupKey === 'overview' || (!groupKey && !itemKey)) {
            currentMain = { kind: 'overview', groupKey: 'overview', itemKey: null };
            if (window.K8sExplorerResourceView) K8sExplorerResourceView.clear();
            renderOverviewPane(main);
            return;
        }

        // Resource view: resolve the service from the config.
        var hit = (window.K8sExplorerConfig && K8sExplorerConfig.findItem)
            ? K8sExplorerConfig.findItem(itemKey)
            : null;
        if (!hit) {
            // Group with no item selected (or unknown key) — show a hint.
            main.innerHTML =
                '<div class="k8s-explorer-empty"><div class="k8s-explorer-empty-inner">'
                + '<h2>Pick a resource</h2>'
                + '<p>Expand a group on the left and choose a resource type to view.</p>'
                + '</div></div>';
            currentMain = { kind: 'empty', groupKey: groupKey, itemKey: null };
            return;
        }
        currentMain = { kind: 'resource', groupKey: groupKey, itemKey: itemKey, service: hit.item };
        if (typeof K8sExplorerResourceView === 'undefined' || !K8sExplorerResourceView.show) {
            main.innerHTML = '<div class="k8s-explorer-empty"><div class="k8s-explorer-empty-inner"><p>K8sExplorerResourceView not loaded.</p></div></div>';
            return;
        }
        var ctx = window.K8sExplorerContextBar
            ? K8sExplorerContextBar.getContext()
            : { cluster: '', namespace: '', search: '' };
        K8sExplorerResourceView.show('k8s-explorer-main', hit.item, ctx);
    }

    function renderOverviewPane(main) {
        if (typeof K8sExplorerOverview === 'undefined' || !K8sExplorerOverview.show) {
            main.innerHTML = '<div class="k8s-explorer-empty"><div class="k8s-explorer-empty-inner"><p>K8sExplorerOverview not loaded.</p></div></div>';
            return;
        }
        var summary = (window.K8sExplorerSummary && K8sExplorerSummary.getLatest)
            ? K8sExplorerSummary.getLatest()
            : null;
        K8sExplorerOverview.show('k8s-explorer-main', summary, function(target) {
            // Card click → navigate the rail + apply baseWhereClause.
            if (!target) return;
            navigateTo(target);
        });
    }

    // ── Public navigation API used by overview cards + related panel ──

    window.K8sExplorerNavigate = function(target) { navigateTo(target); };

    function navigateTo(target) {
        if (!target || (!target.groupKey && !target.itemKey)) return;

        // Apply baseWhereClause via Layer8DRouter so it survives refresh.
        if (typeof Layer8DRouter !== 'undefined') {
            Layer8DRouter.setMany({
                'k8s.group':           target.groupKey || '',
                'k8s.item':            target.itemKey  || '',
                'k8s.baseWhereClause': target.baseWhereClause || ''
            });
        }

        // If the target carries a namespace, write it through the
        // context bar so the resource view picks it up.
        if (target.namespace !== undefined && window.K8sExplorerContextBar) {
            K8sExplorerContextBar.setContext({ namespace: target.namespace || '' });
        }

        // Move the rail; the rail's onSelect fires renderMainPane().
        if (window.K8sExplorerInstance && K8sExplorerInstance.setSelected) {
            K8sExplorerInstance.setSelected({
                group: target.groupKey || '',
                item:  target.itemKey  || null
            });
        }
        renderMainPane(target.groupKey || '', target.itemKey || null);

        // Apply the per-card baseWhereClause to the freshly mounted view.
        // (renderMainPane just mounted it with the cluster/namespace
        // baseWhere; we layer the card's filter on top.)
        if (target.baseWhereClause && window.K8sExplorerResourceView
            && K8sExplorerResourceView.getCurrentService) {
            applyOverviewFilter(target.baseWhereClause);
        }
    }

    function applyOverviewFilter(extraWhere) {
        // Layer the action-card's filter on top of the user's cluster +
        // namespace context. The resource view does the composition.
        if (window.K8sExplorerResourceView && K8sExplorerResourceView._setExtraWhere) {
            K8sExplorerResourceView._setExtraWhere(extraWhere || '');
        }
    }

    // ── Context-bar option fetchers ────────────────────────────────
    // Both reuse the same /probler/{area}/{service} endpoints the classic
    // section uses; the explorer never gets project-specific data into
    // the l8ui component itself — it stays in this glue file.

    function fetchClusters() {
        var endpoint = Layer8DConfig.resolveEndpoint('/10/KCluster');
        var query = encodeURIComponent(JSON.stringify({ text: 'select * from K8SCluster' }));
        return authedFetch(endpoint + '?body=' + query).then(function(data) {
            var list = (data && data.list) || [];
            return list.map(function(c) {
                return { value: c.name || '', label: c.name || '(unnamed)' };
            }).filter(function(o) { return o.value !== ''; });
        });
    }

    function fetchNamespaces(ctx) {
        // Without a selected cluster we cannot meaningfully list namespaces;
        // return an empty list so the dropdown shows "(no options)" with
        // "All namespaces" as the only choice.
        if (!ctx || !ctx.cluster) return Promise.resolve([]);
        var endpoint = Layer8DConfig.resolveEndpoint('/39/K8sNs');
        var query = encodeURIComponent(JSON.stringify({
            text: 'select * from K8SNamespace where clusterName=' + ctx.cluster
        }));
        return authedFetch(endpoint + '?body=' + query).then(function(data) {
            var list = (data && data.list) || [];
            return list.map(function(n) {
                return { value: n.name || '', label: n.name || '(unnamed)' };
            }).filter(function(o) { return o.value !== ''; });
        });
    }

    function authedFetch(url) {
        var headers = {};
        var t = sessionStorage.getItem('bearerToken');
        if (t) headers['Authorization'] = 'Bearer ' + t;
        return fetch(url, { method: 'GET', headers: headers })
            .then(function(resp) {
                if (!resp.ok) {
                    return Promise.reject(new Error('HTTP ' + resp.status + ' ' + url));
                }
                return resp.json();
            });
    }

    // Logout helper — mirrors app.html so this scaffold stands alone
    // without depending on app.js. Same session keys as the main app.
    window.logout = function() {
        sessionStorage.removeItem('bearerToken');
        sessionStorage.removeItem('username');
        localStorage.removeItem('bearerToken');
        window.location.href = 'login.html';
    };
})();
