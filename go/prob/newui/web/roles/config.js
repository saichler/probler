// Roles App Configuration
// Loaded from ../login.json

let ROLES_CONFIG = null;

// Load configuration from login.json
async function loadConfig() {
    try {
        const response = await fetch('../login.json');
        if (!response.ok) {
            throw new Error('Failed to load configuration');
        }
        const config = await response.json();
        ROLES_CONFIG = {
            apiPrefix: config.api.prefix,
            rolesPath: config.api.rolesPath,
            registryPath: config.api.registryPath
        };
        return true;
    } catch (error) {
        console.error('Error loading configuration:', error);
        // Fallback defaults
        ROLES_CONFIG = {
            apiPrefix: '/probler',
            rolesPath: '/74/roles',
            registryPath: '/registry'
        };
        return false;
    }
}
