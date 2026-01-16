/**
 * MobileConfig - Centralized configuration loader for mobile app
 * Desktop Equivalent: config.js pattern in each section
 */
(function() {
    'use strict';

    // Private state
    let _config = null;
    let _loaded = false;
    let _loading = false;
    let _loadPromise = null;

    // Default configuration (fallback)
    const DEFAULT_CONFIG = {
        api: {
            prefix: '/probler',
            cachePath: '/0/NCache',
            usersPath: '/73/users',
            rolesPath: '/74/roles',
            credsPath: '/75/Creds',
            targetsPath: '/91/Targets',
            registryPath: '/registry',
            healthPath: '/0/Health'
        }
    };

    // Public API
    window.MobileConfig = {
        /**
         * Load configuration from server
         * @returns {Promise<boolean>} Success status
         */
        async load() {
            // Return existing promise if already loading
            if (_loading && _loadPromise) {
                return _loadPromise;
            }

            // Return immediately if already loaded
            if (_loaded) {
                return true;
            }

            _loading = true;
            _loadPromise = this._doLoad();

            try {
                const result = await _loadPromise;
                return result;
            } finally {
                _loading = false;
            }
        },

        /**
         * Internal load implementation
         * @private
         */
        async _doLoad() {
            try {
                // Load from login.json (same as desktop)
                const response = await fetch('../login.json?t=' + Date.now());

                if (!response.ok) {
                    throw new Error('Failed to load config');
                }

                _config = await response.json();
                _loaded = true;
                console.log('MobileConfig: Loaded successfully');
                return true;

            } catch (error) {
                console.warn('MobileConfig: Failed to load, using defaults:', error.message);
                _config = DEFAULT_CONFIG;
                _loaded = true;
                return false;
            }
        },

        /**
         * Check if configuration is loaded
         * @returns {boolean}
         */
        isLoaded() {
            return _loaded;
        },

        /**
         * Get API prefix
         * @returns {string}
         */
        getApiPrefix() {
            return _config?.api?.prefix || DEFAULT_CONFIG.api.prefix;
        },

        /**
         * Get cache path
         * @returns {string}
         */
        getCachePath() {
            return _config?.api?.cachePath || DEFAULT_CONFIG.api.cachePath;
        },

        /**
         * Get full cache endpoint URL
         * @returns {string}
         */
        getCacheEndpoint() {
            return this.getApiPrefix() + this.getCachePath();
        },

        /**
         * Get a specific endpoint by name
         * @param {string} name - Endpoint name (users, roles, creds, targets, registry, health)
         * @returns {string}
         */
        getEndpoint(name) {
            const pathKey = name + 'Path';
            const path = _config?.api?.[pathKey] || DEFAULT_CONFIG.api[pathKey];

            if (!path) {
                console.warn('MobileConfig: Unknown endpoint:', name);
                return null;
            }

            return this.getApiPrefix() + path;
        },

        /**
         * Get users endpoint
         * @returns {string}
         */
        getUsersEndpoint() {
            return this.getEndpoint('users');
        },

        /**
         * Get roles endpoint
         * @returns {string}
         */
        getRolesEndpoint() {
            return this.getEndpoint('roles');
        },

        /**
         * Get credentials endpoint
         * @returns {string}
         */
        getCredsEndpoint() {
            return this.getEndpoint('creds');
        },

        /**
         * Get targets endpoint
         * @returns {string}
         */
        getTargetsEndpoint() {
            return this.getEndpoint('targets');
        },

        /**
         * Get registry endpoint
         * @returns {string}
         */
        getRegistryEndpoint() {
            return this.getEndpoint('registry');
        },

        /**
         * Get health endpoint
         * @returns {string}
         */
        getHealthEndpoint() {
            return this.getEndpoint('health');
        },

        /**
         * Get full configuration object
         * @returns {object}
         */
        getConfig() {
            return _config || DEFAULT_CONFIG;
        },

        /**
         * Get a custom config value by path
         * @param {string} path - Dot-separated path (e.g., 'api.prefix')
         * @param {*} defaultValue - Default value if not found
         * @returns {*}
         */
        get(path, defaultValue = null) {
            const parts = path.split('.');
            let value = _config || DEFAULT_CONFIG;

            for (const part of parts) {
                if (value && typeof value === 'object' && part in value) {
                    value = value[part];
                } else {
                    return defaultValue;
                }
            }

            return value;
        }
    };

})();
