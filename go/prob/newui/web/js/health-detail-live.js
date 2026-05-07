// Probler-specific wrapper: inject live refresh into the Health detail popup.
// l8health.js is a shared l8ui file — WebSocket logic goes here instead.
(function() {
    'use strict';
    if (typeof L8Health === 'undefined' || typeof LivePopup === 'undefined') return;

    var origShow = L8Health._showHealthDetailsModal;
    if (!origShow && L8Health.initialize) {
        // showHealthDetailsModal is private inside the IIFE. We hook into the
        // popup's onShow via Layer8DPopup events instead.
        // Strategy: subscribe when a health detail popup opens, unsubscribe on close.
        var _unsub = null;

        var origInit = L8Health.initialize;
        L8Health.initialize = function() {
            origInit();
            // After init, listen for health detail popups via a MutationObserver on
            // the popup root. A simpler approach: wrap the public refresh to also
            // subscribe. But the cleanest approach is to use Layer8DPopup's onClose
            // callback — which requires us to intercept the popup open.
            //
            // Since showHealthDetailsModal is encapsulated, we instead subscribe
            // globally to L8Health changes and refresh the popup content if one is open.
            if (typeof Layer8DWebSocket !== 'undefined') {
                Layer8DWebSocket.subscribe('L8Health', function(msg) {
                    var popup = document.getElementById('health-detail-modal');
                    if (popup) {
                        L8Health.refresh();
                    }
                });
            }
        };
    }
})();
