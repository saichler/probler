/* Probler Confirmation Popup Component */

(function() {
    'use strict';

    // Confirmation type configurations
    const TYPES = {
        danger: {
            icon: '<svg class="confirm-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>',
            iconClass: 'confirm-icon-danger',
            buttonClass: 'confirm-btn-danger',
            headerClass: 'confirm-header-danger'
        },
        warning: {
            icon: '<svg class="confirm-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4m0 4h.01m8.46 2H3.54a2 2 0 0 1-1.73-3l8.46-14a2 2 0 0 1 3.46 0l8.46 14a2 2 0 0 1-1.73 3Z"/></svg>',
            iconClass: 'confirm-icon-warning',
            buttonClass: 'confirm-btn-warning',
            headerClass: 'confirm-header-warning'
        },
        info: {
            icon: '<svg class="confirm-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/></svg>',
            iconClass: 'confirm-icon-info',
            buttonClass: 'confirm-btn-info',
            headerClass: 'confirm-header-info'
        }
    };

    // Store pending confirmations for iframe communication
    const pendingConfirmations = {};

    // Initialize confirmation system
    function init() {
        // Listen for postMessage from iframes
        window.addEventListener('message', handleMessage);
    }

    // Handle postMessage from iframes
    function handleMessage(event) {
        if (!event.data || !event.data.type) return;

        switch (event.data.type) {
            case 'probler-confirm-show':
                const config = event.data.config || {};
                // Store the source iframe for response
                if (config.id) {
                    pendingConfirmations[config.id] = {
                        source: event.source,
                        origin: event.origin
                    };
                }
                show(config);
                break;
        }
    }

    // Escape HTML to prevent XSS
    function escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    // Build confirmation content HTML
    function buildContent(config, typeConfig) {
        const confirmText = config.confirmText || 'Confirm';
        const cancelText = config.cancelText || 'Cancel';

        let html = '<div class="confirm-content">';

        // Icon
        html += '<div class="confirm-icon ' + typeConfig.iconClass + '">';
        html += typeConfig.icon;
        html += '</div>';

        // Message container
        html += '<div class="confirm-message-container">';

        // Main message
        html += '<div class="confirm-message">' + escapeHtml(config.message || 'Are you sure you want to proceed?') + '</div>';

        // Detail (optional)
        if (config.detail) {
            html += '<div class="confirm-detail">' + escapeHtml(config.detail) + '</div>';
        }

        html += '</div>';

        // Action buttons
        html += '<div class="confirm-actions">';
        html += '<button type="button" class="confirm-btn confirm-btn-cancel">' + escapeHtml(cancelText) + '</button>';
        html += '<button type="button" class="confirm-btn ' + typeConfig.buttonClass + '">' + escapeHtml(confirmText) + '</button>';
        html += '</div>';

        html += '</div>';

        return html;
    }

    // Setup button handlers
    function setupHandlers(body, config) {
        const confirmBtn = body.querySelector('.confirm-btn:not(.confirm-btn-cancel)');
        const cancelBtn = body.querySelector('.confirm-btn-cancel');

        if (confirmBtn) {
            confirmBtn.addEventListener('click', function() {
                // Close the popup first
                if (typeof ProblerPopup !== 'undefined') {
                    ProblerPopup.close();
                }

                // Notify iframe if applicable
                if (config.id && pendingConfirmations[config.id]) {
                    const pending = pendingConfirmations[config.id];
                    if (pending.source) {
                        pending.source.postMessage({
                            type: 'probler-confirm-result',
                            id: config.id,
                            confirmed: true
                        }, '*');
                    }
                    delete pendingConfirmations[config.id];
                }

                // Call onConfirm callback
                if (typeof config.onConfirm === 'function') {
                    config.onConfirm();
                }
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', function() {
                // Close the popup first
                if (typeof ProblerPopup !== 'undefined') {
                    ProblerPopup.close();
                }

                // Notify iframe if applicable
                if (config.id && pendingConfirmations[config.id]) {
                    const pending = pendingConfirmations[config.id];
                    if (pending.source) {
                        pending.source.postMessage({
                            type: 'probler-confirm-result',
                            id: config.id,
                            confirmed: false
                        }, '*');
                    }
                    delete pendingConfirmations[config.id];
                }

                // Call onCancel callback
                if (typeof config.onCancel === 'function') {
                    config.onCancel();
                }
            });
        }
    }

    // Show confirmation popup
    function show(config) {
        if (typeof ProblerPopup === 'undefined') {
            console.error('ProblerConfirm: ProblerPopup is required but not found');
            return;
        }

        const typeName = config.type || 'warning';
        const typeConfig = TYPES[typeName] || TYPES.warning;

        const content = buildContent(config, typeConfig);

        ProblerPopup.show({
            title: config.title || 'Confirm',
            content: content,
            size: 'small',
            showFooter: false,
            noPadding: false,
            onShow: function(body) {
                setupHandlers(body, config);

                // Focus the confirm button for keyboard accessibility
                const confirmBtn = body.querySelector('.confirm-btn:not(.confirm-btn-cancel)');
                if (confirmBtn) {
                    setTimeout(function() { confirmBtn.focus(); }, 100);
                }
            }
        });
    }

    // Shorthand methods
    function danger(title, message, onConfirm) {
        show({
            type: 'danger',
            title: title,
            message: message,
            onConfirm: onConfirm,
            confirmText: 'Delete'
        });
    }

    function warning(title, message, onConfirm) {
        show({
            type: 'warning',
            title: title,
            message: message,
            onConfirm: onConfirm
        });
    }

    function info(title, message, onConfirm) {
        show({
            type: 'info',
            title: title,
            message: message,
            onConfirm: onConfirm
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose API
    window.ProblerConfirm = {
        show: show,
        danger: danger,
        warning: warning,
        info: info
    };

})();
