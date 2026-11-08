// LivePopup — shared WebSocket subscription lifecycle for detail popups.
// Subscribe on open, match by primaryKey, debounce re-fetch, unsubscribe on close.
window.LivePopup = {
    subscribe: function(config) {
        var debounceTimer = null;
        var unsubscribe = Layer8DWebSocket.subscribe(config.modelType, function(msg) {
            if (msg.primaryKey === config.primaryKey) {
                if (debounceTimer) return;
                debounceTimer = setTimeout(function() {
                    debounceTimer = null;
                    config.onUpdate(msg);
                }, 500);
            }
        });
        return function() {
            if (debounceTimer) clearTimeout(debounceTimer);
            unsubscribe();
        };
    },

    /**
     * Re-renders the open detail popup in place from a freshly fetched record,
     * keeping the active tab, instead of closing it on every pushed update
     * (which made a device's detail popup vanish each poll cycle).
     *
     * config: { popupId, endpoint, query, transform(raw), build(record) -> html,
     *           afterRender(record) }
     */
    refreshInPlace: async function(config) {
        var stack = Layer8DPopup.getStack();
        var top = stack[stack.length - 1];
        if (!top || top.config.id !== config.popupId) return; // closed or covered
        var body = encodeURIComponent(JSON.stringify({ text: config.query }));
        var resp = await fetch(Layer8DConfig.resolveEndpoint(config.endpoint) + '?body=' + body,
            { headers: getAuthHeaders() });
        if (!resp.ok) throw new Error('LivePopup.refreshInPlace: ' + config.endpoint + ' -> HTTP ' + resp.status);
        var data = await resp.json();
        var raw = (data.list || [])[0];
        if (!raw) { Layer8DPopup.close(); return; } // the record was deleted
        var record = config.transform(raw);
        var popupBody = Layer8DPopup.getBody();
        var active = popupBody && popupBody.querySelector('.probler-popup-tab.active');
        var activeTab = active ? active.getAttribute('data-tab') : null;
        Layer8DPopup.updateContent(config.build(record));
        // afterRender first: it may add tabs (k8s-explorer's Related tab)
        // that the restored active tab refers to.
        if (config.afterRender) config.afterRender(record);
        if (activeTab) {
            var tab = Layer8DPopup.getBody().querySelector('.probler-popup-tab[data-tab="' + activeTab + '"]');
            if (tab) tab.click();
        }
    }
};
