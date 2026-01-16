/**
 * MobileConfirm - Confirmation dialog component for mobile
 * Desktop Equivalent: ProblerConfirm in confirm/confirm.js
 */
(function() {
    'use strict';

    // SVG Icons
    const ICONS = {
        danger: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>`,

        warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>`,

        info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>`
    };

    // Current confirm dialog reference
    let _currentConfirm = null;

    // Public API
    window.MobileConfirm = {
        /**
         * Show a confirmation dialog
         * @param {object} config - Configuration
         * @returns {Promise<boolean>} Resolves true if confirmed, false if cancelled
         */
        show(config) {
            // Close existing if any
            if (_currentConfirm) {
                this._close(false);
            }

            const settings = {
                type: 'danger',         // danger, warning, info
                title: 'Confirm',
                message: 'Are you sure?',
                detail: '',
                confirmText: 'Confirm',
                cancelText: 'Cancel',
                onConfirm: null,
                onCancel: null,
                ...config
            };

            return new Promise((resolve) => {
                // Create overlay
                const overlay = document.createElement('div');
                overlay.className = 'mobile-confirm-overlay';

                overlay.innerHTML = `
                    <div class="mobile-confirm-dialog ${settings.type}">
                        <div class="mobile-confirm-icon">
                            ${ICONS[settings.type] || ICONS.info}
                        </div>
                        <div class="mobile-confirm-content">
                            <h3 class="mobile-confirm-title">${this._escapeHtml(settings.title)}</h3>
                            <p class="mobile-confirm-message">${this._escapeHtml(settings.message)}</p>
                            ${settings.detail ? `<p class="mobile-confirm-detail">${this._escapeHtml(settings.detail)}</p>` : ''}
                        </div>
                        <div class="mobile-confirm-actions">
                            <button class="mobile-confirm-btn mobile-confirm-btn-confirm">
                                ${this._escapeHtml(settings.confirmText)}
                            </button>
                            <button class="mobile-confirm-btn mobile-confirm-btn-cancel">
                                ${this._escapeHtml(settings.cancelText)}
                            </button>
                        </div>
                    </div>
                `;

                document.body.appendChild(overlay);

                // Store reference
                _currentConfirm = {
                    overlay: overlay,
                    settings: settings,
                    resolve: resolve
                };

                // Trigger open animation
                requestAnimationFrame(() => {
                    overlay.classList.add('open');
                });

                // Event listeners
                const confirmBtn = overlay.querySelector('.mobile-confirm-btn-confirm');
                const cancelBtn = overlay.querySelector('.mobile-confirm-btn-cancel');

                confirmBtn.addEventListener('click', () => {
                    this._close(true);
                });

                cancelBtn.addEventListener('click', () => {
                    this._close(false);
                });

                // Overlay click to cancel
                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) {
                        this._close(false);
                    }
                });

                // Escape key
                _currentConfirm._escapeHandler = (e) => {
                    if (e.key === 'Escape') {
                        this._close(false);
                    }
                };
                document.addEventListener('keydown', _currentConfirm._escapeHandler);

                // Haptic feedback on show (if available)
                if ('vibrate' in navigator) {
                    navigator.vibrate(10);
                }

                // Focus confirm button
                setTimeout(() => confirmBtn.focus(), 100);
            });
        },

        /**
         * Close the current dialog
         * @private
         */
        _close(confirmed) {
            if (!_currentConfirm) return;

            const { overlay, settings, resolve } = _currentConfirm;

            // Remove escape handler
            if (_currentConfirm._escapeHandler) {
                document.removeEventListener('keydown', _currentConfirm._escapeHandler);
            }

            // Animate out
            overlay.classList.remove('open');

            // Haptic feedback on confirm
            if (confirmed && 'vibrate' in navigator) {
                navigator.vibrate([10, 50, 10]);
            }

            // Call callbacks
            if (confirmed && settings.onConfirm) {
                settings.onConfirm();
            } else if (!confirmed && settings.onCancel) {
                settings.onCancel();
            }

            // Resolve promise
            resolve(confirmed);

            // Remove from DOM
            setTimeout(() => {
                overlay.remove();
            }, 200);

            _currentConfirm = null;
        },

        /**
         * Show danger confirmation
         * @param {string} title
         * @param {string} message
         * @param {function} onConfirm
         * @returns {Promise<boolean>}
         */
        danger(title, message, onConfirm) {
            return this.show({
                type: 'danger',
                title: title,
                message: message,
                confirmText: 'Delete',
                onConfirm: onConfirm
            });
        },

        /**
         * Show warning confirmation
         * @param {string} title
         * @param {string} message
         * @param {function} onConfirm
         * @returns {Promise<boolean>}
         */
        warning(title, message, onConfirm) {
            return this.show({
                type: 'warning',
                title: title,
                message: message,
                onConfirm: onConfirm
            });
        },

        /**
         * Show info confirmation
         * @param {string} title
         * @param {string} message
         * @param {function} onConfirm
         * @returns {Promise<boolean>}
         */
        info(title, message, onConfirm) {
            return this.show({
                type: 'info',
                title: title,
                message: message,
                onConfirm: onConfirm
            });
        },

        /**
         * Prompt for delete confirmation
         * @param {string} itemName - Name of item being deleted
         * @param {function} onConfirm
         * @returns {Promise<boolean>}
         */
        delete(itemName, onConfirm) {
            return this.show({
                type: 'danger',
                title: 'Delete ' + itemName + '?',
                message: 'This action cannot be undone.',
                detail: 'The item will be permanently removed.',
                confirmText: 'Delete',
                onConfirm: onConfirm
            });
        },

        /**
         * Check if a dialog is currently open
         * @returns {boolean}
         */
        isOpen() {
            return _currentConfirm !== null;
        },

        /**
         * Escape HTML
         * @private
         */
        _escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    };

})();
