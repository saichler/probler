// LivePopup — shared WebSocket subscription lifecycle for detail popups.
// Subscribe on open, match by primaryKey, debounce re-fetch, unsubscribe on close.
window.LivePopup = {
    subscribe: function(config) {
        if (typeof Layer8DWebSocket === 'undefined') {
            return function() {};
        }
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
    }
};
