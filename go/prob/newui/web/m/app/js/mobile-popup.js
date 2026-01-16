/**
 * MobilePopup - Full-screen modal component for mobile
 * Desktop Equivalent: ProblerPopup in popup/popup.js
 */
(function() {
    'use strict';

    // Modal stack for nested popups
    const _stack = [];
    let _idCounter = 0;

    // Public API
    window.MobilePopup = {
        /**
         * Show a popup
         * @param {object} config - Popup configuration
         * @returns {string} Popup ID
         */
        show(config) {
            const id = config.id || 'mobile-popup-' + (++_idCounter);

            const popup = {
                id: id,
                config: {
                    title: '',
                    titleHtml: null,
                    content: '',
                    size: 'large',          // small, medium, large, full, xlarge
                    showFooter: true,
                    noPadding: false,
                    saveButtonText: 'Save',
                    cancelButtonText: 'Cancel',
                    showCancelButton: true,
                    saveButtonClass: 'mobile-popup-btn-save',
                    tabs: null,             // Array of { id, label, content }
                    onShow: null,
                    onSave: null,
                    onClose: null,
                    ...config
                }
            };

            // Create DOM
            const overlay = this._createPopupDOM(popup);
            document.body.appendChild(overlay);

            // Prevent body scroll
            document.body.style.overflow = 'hidden';

            // Add stacked class if there are existing popups
            if (_stack.length > 0) {
                overlay.classList.add('stacked');
                if (_stack.length > 1) {
                    overlay.classList.add('stacked-2');
                }
            }

            // Store reference
            popup.overlay = overlay;
            popup.element = overlay.querySelector('.mobile-popup');
            popup.body = overlay.querySelector('.mobile-popup-body');
            _stack.push(popup);

            // Trigger open animation
            requestAnimationFrame(() => {
                overlay.classList.add('open');
            });

            // Setup event listeners
            this._setupEventListeners(popup);

            // Call onShow callback
            if (popup.config.onShow) {
                setTimeout(() => popup.config.onShow(popup), 300);
            }

            // Focus first input if present
            setTimeout(() => {
                const firstInput = popup.body.querySelector('input, textarea, select');
                if (firstInput) {
                    firstInput.focus();
                }
            }, 350);

            return id;
        },

        /**
         * Create popup DOM structure
         * @private
         */
        _createPopupDOM(popup) {
            const config = popup.config;
            const overlay = document.createElement('div');
            overlay.className = 'mobile-popup-overlay';
            overlay.id = popup.id + '-overlay';

            // Build title
            const titleHtml = config.titleHtml ||
                `<span class="mobile-popup-title">${this._escapeHtml(config.title)}</span>`;

            // Build tabs if provided
            let tabsHtml = '';
            let tabContentHtml = config.content;

            if (config.tabs && config.tabs.length > 0) {
                tabsHtml = `
                    <div class="mobile-popup-tabs">
                        ${config.tabs.map((tab, idx) => `
                            <button class="mobile-popup-tab ${idx === 0 ? 'active' : ''}"
                                    data-tab="${tab.id}">${this._escapeHtml(tab.label)}</button>
                        `).join('')}
                    </div>
                `;

                tabContentHtml = config.tabs.map((tab, idx) => `
                    <div class="mobile-popup-tab-content ${idx === 0 ? 'active' : ''}"
                         data-tab-content="${tab.id}">
                        ${tab.content}
                    </div>
                `).join('');
            }

            // Build footer
            let footerHtml = '';
            if (config.showFooter) {
                footerHtml = `
                    <div class="mobile-popup-footer">
                        ${config.showCancelButton ? `
                            <button class="mobile-popup-btn mobile-popup-btn-cancel">
                                ${this._escapeHtml(config.cancelButtonText)}
                            </button>
                        ` : ''}
                        <button class="mobile-popup-btn ${config.saveButtonClass}">
                            ${this._escapeHtml(config.saveButtonText)}
                        </button>
                    </div>
                `;
            }

            overlay.innerHTML = `
                <div class="mobile-popup size-${config.size}">
                    <div class="mobile-popup-handle"></div>
                    <div class="mobile-popup-header">
                        ${titleHtml}
                        <button class="mobile-popup-close">&times;</button>
                    </div>
                    ${tabsHtml}
                    <div class="mobile-popup-body ${config.noPadding ? 'no-padding' : ''}">
                        ${tabContentHtml}
                    </div>
                    ${footerHtml}
                </div>
            `;

            return overlay;
        },

        /**
         * Setup event listeners for popup
         * @private
         */
        _setupEventListeners(popup) {
            const overlay = popup.overlay;
            const config = popup.config;

            // Close button
            overlay.querySelector('.mobile-popup-close').addEventListener('click', () => {
                this.close(popup.id);
            });

            // Overlay click to close
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.close(popup.id);
                }
            });

            // Cancel button
            const cancelBtn = overlay.querySelector('.mobile-popup-btn-cancel');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    this.close(popup.id);
                });
            }

            // Save button
            const saveBtn = overlay.querySelector('.mobile-popup-btn-save, .mobile-popup-btn-danger');
            if (saveBtn && config.onSave) {
                saveBtn.addEventListener('click', () => {
                    config.onSave(popup);
                });
            }

            // Tab switching
            const tabs = overlay.querySelectorAll('.mobile-popup-tab');
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    const tabId = tab.dataset.tab;

                    // Update tab buttons
                    tabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');

                    // Update tab content
                    overlay.querySelectorAll('.mobile-popup-tab-content').forEach(content => {
                        content.classList.toggle('active', content.dataset.tabContent === tabId);
                    });
                });
            });

            // Escape key to close
            popup._escapeHandler = (e) => {
                if (e.key === 'Escape' && _stack.length > 0 && _stack[_stack.length - 1].id === popup.id) {
                    this.close(popup.id);
                }
            };
            document.addEventListener('keydown', popup._escapeHandler);

            // Drag to dismiss (for touch devices)
            this._setupDragToDismiss(popup);
        },

        /**
         * Setup drag to dismiss functionality
         * @private
         */
        _setupDragToDismiss(popup) {
            const handle = popup.element.querySelector('.mobile-popup-handle');
            const popupEl = popup.element;

            if (!handle) return;

            let startY = 0;
            let currentY = 0;
            let isDragging = false;

            handle.addEventListener('touchstart', (e) => {
                startY = e.touches[0].clientY;
                isDragging = true;
                popupEl.style.transition = 'none';
            }, { passive: true });

            handle.addEventListener('touchmove', (e) => {
                if (!isDragging) return;

                currentY = e.touches[0].clientY;
                const deltaY = currentY - startY;

                if (deltaY > 0) {
                    popupEl.style.transform = `translateY(${deltaY}px)`;
                }
            }, { passive: true });

            handle.addEventListener('touchend', () => {
                if (!isDragging) return;

                isDragging = false;
                popupEl.style.transition = '';

                const deltaY = currentY - startY;

                if (deltaY > 100) {
                    // Dismiss
                    this.close(popup.id);
                } else {
                    // Snap back
                    popupEl.style.transform = '';
                }

                startY = 0;
                currentY = 0;
            });
        },

        /**
         * Close a popup by ID (or topmost if no ID)
         * @param {string} id - Popup ID (optional)
         */
        close(id) {
            let popup;

            if (id) {
                const index = _stack.findIndex(p => p.id === id);
                if (index === -1) return;
                popup = _stack.splice(index, 1)[0];
            } else {
                if (_stack.length === 0) return;
                popup = _stack.pop();
            }

            // Remove escape handler
            if (popup._escapeHandler) {
                document.removeEventListener('keydown', popup._escapeHandler);
            }

            // Animate out
            popup.overlay.classList.remove('open');

            // Call onClose callback
            if (popup.config.onClose) {
                popup.config.onClose(popup);
            }

            // Remove from DOM after animation
            setTimeout(() => {
                popup.overlay.remove();

                // Restore body scroll if no more popups
                if (_stack.length === 0) {
                    document.body.style.overflow = '';
                }
            }, 300);
        },

        /**
         * Close all popups
         */
        closeAll() {
            while (_stack.length > 0) {
                this.close();
            }
        },

        /**
         * Update popup content
         * @param {string} html - New HTML content
         * @param {string} id - Popup ID (optional, defaults to topmost)
         */
        updateContent(html, id) {
            const popup = id ? _stack.find(p => p.id === id) : _stack[_stack.length - 1];
            if (popup && popup.body) {
                popup.body.innerHTML = html;
            }
        },

        /**
         * Update popup title
         * @param {string} title - New title
         * @param {string} id - Popup ID (optional)
         */
        updateTitle(title, id) {
            const popup = id ? _stack.find(p => p.id === id) : _stack[_stack.length - 1];
            if (popup) {
                const titleEl = popup.element.querySelector('.mobile-popup-title');
                if (titleEl) {
                    titleEl.textContent = title;
                }
            }
        },

        /**
         * Get popup body element
         * @param {string} id - Popup ID (optional)
         * @returns {HTMLElement}
         */
        getBody(id) {
            const popup = id ? _stack.find(p => p.id === id) : _stack[_stack.length - 1];
            return popup ? popup.body : null;
        },

        /**
         * Get popup element
         * @param {string} id - Popup ID (optional)
         * @returns {HTMLElement}
         */
        getElement(id) {
            const popup = id ? _stack.find(p => p.id === id) : _stack[_stack.length - 1];
            return popup ? popup.element : null;
        },

        /**
         * Get modal stack
         * @returns {Array}
         */
        getStack() {
            return _stack;
        },

        /**
         * Check if any popup is open
         * @returns {boolean}
         */
        isOpen() {
            return _stack.length > 0;
        },

        /**
         * Show loading state in popup
         * @param {string} message - Loading message
         * @param {string} id - Popup ID (optional)
         */
        showLoading(message = 'Loading...', id) {
            this.updateContent(`
                <div class="mobile-popup-loading">
                    <div class="spinner"></div>
                    <span>${this._escapeHtml(message)}</span>
                </div>
            `, id);
        },

        /**
         * Escape HTML for safe rendering
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
