/**
 * MobileAuth - Centralized authentication utilities for mobile app
 * Desktop Equivalent: getAuthHeaders() pattern and makeAuthenticatedRequest()
 */
(function() {
    'use strict';

    // Session expired callback
    let _onSessionExpired = null;

    // Public API
    window.MobileAuth = {
        /**
         * Get bearer token from storage
         * @returns {string|null}
         */
        getBearerToken() {
            return sessionStorage.getItem('bearerToken') ||
                   localStorage.getItem('bearerToken') ||
                   null;
        },

        /**
         * Set bearer token in storage
         * @param {string} token
         * @param {boolean} remember - Also store in localStorage
         */
        setBearerToken(token, remember = false) {
            sessionStorage.setItem('bearerToken', token);
            if (remember) {
                localStorage.setItem('bearerToken', token);
            }
            // Also set on window for iframe access
            window.bearerToken = token;
        },

        /**
         * Get authentication headers for API requests
         * @param {object} additionalHeaders - Additional headers to merge
         * @returns {object}
         */
        getAuthHeaders(additionalHeaders = {}) {
            const headers = {
                'Content-Type': 'application/json',
                ...additionalHeaders
            };

            const token = this.getBearerToken();
            if (token) {
                headers['Authorization'] = 'Bearer ' + token;
            }

            return headers;
        },

        /**
         * Check if user is authenticated
         * @returns {boolean}
         */
        isAuthenticated() {
            return !!this.getBearerToken();
        },

        /**
         * Get current username from storage
         * @returns {string}
         */
        getUsername() {
            return sessionStorage.getItem('currentUser') ||
                   localStorage.getItem('rememberedUser') ||
                   'Admin';
        },

        /**
         * Set current username
         * @param {string} username
         * @param {boolean} remember - Also store in localStorage
         */
        setUsername(username, remember = false) {
            sessionStorage.setItem('currentUser', username);
            if (remember) {
                localStorage.setItem('rememberedUser', username);
            }
        },

        /**
         * Make an authenticated API request
         * Handles 401 responses automatically
         * @param {string} url - Request URL
         * @param {object} options - Fetch options
         * @returns {Promise<Response>}
         */
        async makeAuthenticatedRequest(url, options = {}) {
            const token = this.getBearerToken();

            if (!token) {
                console.error('MobileAuth: No bearer token found');
                this._handleSessionExpired();
                return null;
            }

            const headers = this.getAuthHeaders(options.headers);

            try {
                const response = await fetch(url, {
                    ...options,
                    headers: headers
                });

                // Handle unauthorized
                if (response.status === 401) {
                    console.warn('MobileAuth: Session expired (401)');
                    this._handleSessionExpired();
                    return null;
                }

                return response;

            } catch (error) {
                console.error('MobileAuth: Request failed:', error);
                throw error;
            }
        },

        /**
         * Make a GET request with authentication
         * @param {string} url
         * @returns {Promise<any>}
         */
        async get(url) {
            const response = await this.makeAuthenticatedRequest(url, {
                method: 'GET'
            });

            if (!response) return null;
            if (!response.ok) {
                throw new Error(`Request failed: ${response.status}`);
            }

            return response.json();
        },

        /**
         * Make a POST request with authentication
         * @param {string} url
         * @param {object} data
         * @returns {Promise<any>}
         */
        async post(url, data) {
            const response = await this.makeAuthenticatedRequest(url, {
                method: 'POST',
                body: JSON.stringify(data)
            });

            if (!response) return null;
            if (!response.ok) {
                throw new Error(`Request failed: ${response.status}`);
            }

            return response.json();
        },

        /**
         * Make a PUT request with authentication
         * @param {string} url
         * @param {object} data
         * @returns {Promise<any>}
         */
        async put(url, data) {
            const response = await this.makeAuthenticatedRequest(url, {
                method: 'PUT',
                body: JSON.stringify(data)
            });

            if (!response) return null;
            if (!response.ok) {
                throw new Error(`Request failed: ${response.status}`);
            }

            return response.json();
        },

        /**
         * Make a DELETE request with authentication
         * @param {string} url
         * @returns {Promise<any>}
         */
        async delete(url) {
            const response = await this.makeAuthenticatedRequest(url, {
                method: 'DELETE'
            });

            if (!response) return null;
            if (!response.ok) {
                throw new Error(`Request failed: ${response.status}`);
            }

            return response.json();
        },

        /**
         * Login with username and password
         * @param {string} username
         * @param {string} password
         * @param {boolean} remember - Remember credentials
         * @returns {Promise<boolean>}
         */
        async login(username, password, remember = false) {
            try {
                const response = await fetch('/auth', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });

                if (!response.ok) {
                    return false;
                }

                const data = await response.json();

                if (data.token) {
                    this.setBearerToken(data.token, remember);
                    this.setUsername(username, remember);
                    return true;
                }

                return false;

            } catch (error) {
                console.error('MobileAuth: Login failed:', error);
                return false;
            }
        },

        /**
         * Logout and clear session
         * @param {boolean} redirect - Redirect to login page
         */
        logout(redirect = true) {
            // Clear session storage
            sessionStorage.removeItem('bearerToken');
            sessionStorage.removeItem('currentUser');

            // Clear local storage
            localStorage.removeItem('bearerToken');
            localStorage.removeItem('rememberedUser');

            // Clear window reference
            window.bearerToken = null;

            console.log('MobileAuth: Logged out');

            if (redirect) {
                window.location.href = '../l8ui/login/index.html';
            }
        },

        /**
         * Set callback for session expiration
         * @param {function} callback
         */
        onSessionExpired(callback) {
            _onSessionExpired = callback;
        },

        /**
         * Handle session expiration
         * @private
         */
        _handleSessionExpired() {
            // Clear token
            sessionStorage.removeItem('bearerToken');

            // Call callback if set
            if (_onSessionExpired) {
                _onSessionExpired();
            } else {
                // Default: redirect to login
                window.location.href = '../l8ui/login/index.html';
            }
        },

        /**
         * Check authentication and redirect if not authenticated
         * @returns {boolean}
         */
        requireAuth() {
            if (!this.isAuthenticated()) {
                window.location.href = '../l8ui/login/index.html';
                return false;
            }
            return true;
        },

        /**
         * Initialize auth module
         * Syncs token to window and localStorage
         */
        init() {
            const token = this.getBearerToken();
            if (token) {
                window.bearerToken = token;
                localStorage.setItem('bearerToken', token);
            }
        }
    };

    // Auto-initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => MobileAuth.init());
    } else {
        MobileAuth.init();
    }

})();
