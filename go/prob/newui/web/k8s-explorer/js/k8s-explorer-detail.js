/*
 * Kubernetes Explorer — detail-popup wrapper.
 *
 * The classic K8sDetail.show (in `web/kubernetes/kubernetes-detail.js`)
 * is intentionally left untouched per the frozen-section contract in
 * plans/k8s-explorer-portal.md. To get the new "Related" tab, the
 * explorer wraps the call: invoke K8sDetail.show as-is, then DOM-inject
 * an extra tab + pane into the popup body.
 *
 * Layer8DPopup uses event delegation on `.probler-popup-tab` clicks
 * (verified in l8ui/popup/layer8d-popup.js), so a tab appended after
 * the popup mounts works out of the box. The injection is idempotent —
 * if the Related tab already exists we don't add a duplicate.
 *
 * Stacking note: clicking a related entity opens *another* detail popup
 * on top of this one. Layer8DPopup.getBody() returns the topmost body,
 * so each call injects into the right popup.
 */
(function() {
    'use strict';

    var INJECT_DELAY_MS = 80; // popup onShow is at 50ms; a small cushion

    function show(item, service) {
        if (typeof K8sDetail === 'undefined' || !K8sDetail.show) {
            if (typeof console !== 'undefined' && console.warn) {
                console.warn('K8sExplorerDetail: classic K8sDetail not loaded — falling back to no-op.');
            }
            return;
        }
        K8sDetail.show(item, service);
        touchObjectRecent(item, service);
        // Defer the injection so Layer8DPopup has finished mounting the
        // initial tabs/content. 80ms is comfortably past the popup's
        // 50ms onShow scheduling.
        setTimeout(function() { injectRelatedTab(item, service); }, INJECT_DELAY_MS);
    }

    // Object-kind recents: Phase 8 stashes them in localStorage so a
    // future "open last detail" affordance can re-hydrate without a
    // round-trip. The rail itself does NOT render object recents today
    // (k8s-explorer-init.js maps them out); they live silently until
    // we ship a UI for them.
    function touchObjectRecent(item, service) {
        if (!window.Layer8DRecents || !item || !service) return;
        var ns = item.namespace || '';
        var name = item.name || item.key || '';
        var cluster = item.clusterName || '';
        var key = (cluster ? cluster + ':' : '') + (ns ? ns + '/' : '') + name;
        if (!key) return;
        Layer8DRecents.touch('k8s', {
            kind: 'object',
            key: key,
            label: name,
            group: '',
            item: service.key || '',
            model: service.model || '',
            entity: { name: name, namespace: ns, clusterName: cluster, key: item.key || '' }
        });
    }

    function injectRelatedTab(item, service) {
        if (typeof Layer8DPopup === 'undefined' || !Layer8DPopup.getBody) return;
        var body = Layer8DPopup.getBody();
        if (!body) return;

        var tabsBar = body.querySelector('.probler-popup-tabs');
        var contentBar = body.querySelector('.probler-popup-tab-content');
        if (!tabsBar || !contentBar) return;
        // Idempotent — don't double-add when re-fired.
        if (tabsBar.querySelector('.probler-popup-tab[data-tab="related"]')) return;

        var newTab = document.createElement('div');
        newTab.className = 'probler-popup-tab';
        newTab.setAttribute('data-tab', 'related');
        newTab.textContent = 'Related';
        tabsBar.appendChild(newTab);

        var pane = document.createElement('div');
        pane.className = 'probler-popup-tab-pane';
        pane.setAttribute('data-pane', 'related');

        var mountId = 'k8s-explorer-related-mount-' + uniqueId();
        var inner = document.createElement('div');
        inner.id = mountId;
        inner.style.padding = '12px 0';
        pane.appendChild(inner);
        contentBar.appendChild(pane);

        // Build relations and render. K8sExplorerRelated determines what's
        // fetched vs what's a "(coming soon)" stub.
        var relations = (typeof K8sExplorerRelated !== 'undefined' && K8sExplorerRelated.relationsFor)
            ? K8sExplorerRelated.relationsFor(item, service)
            : [];
        if (typeof Layer8DRelatedResources === 'undefined') {
            inner.innerHTML = '<div class="layer8d-related-error">Layer8DRelatedResources not loaded.</div>';
            return;
        }
        Layer8DRelatedResources.render({
            container: inner,
            relations: relations,
            onSelect: function(target) {
                if (!target) return;
                // Direct entity-detail jump (e.g. clicking a node opens
                // the Node detail popup on top of the current Pod popup).
                if (target.entity && target.service) {
                    show(target.entity, target.service);
                    return;
                }
                // Navigation jump (e.g. namespace → Pods view). Close the
                // popup stack first so the rail change is visible.
                if (target.nav && target.itemKey) {
                    if (Layer8DPopup.closeAll) Layer8DPopup.closeAll();
                    if (window.K8sExplorerNavigate) {
                        K8sExplorerNavigate({
                            groupKey: target.groupKey || '',
                            itemKey:  target.itemKey,
                            namespace: target.namespace || null
                        });
                    }
                }
            }
        });
    }

    var _id = 0;
    function uniqueId() { return (++_id) + '-' + Date.now(); }

    window.K8sExplorerDetail = { show: show };
})();
