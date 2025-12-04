// Users App Configuration
// Loaded from ../login.json

let USERS_CONFIG = null;

// Load configuration from login.json
async function loadConfig() {
    try {
        const response = await fetch('../login.json');
        if (!response.ok) {
            throw new Error('Failed to load configuration');
        }
        const config = await response.json();
        USERS_CONFIG = {
            apiPrefix: config.api.prefix,
            usersPath: config.api.usersPath,
            rolesPath: config.api.rolesPath
        };
        return true;
    } catch (error) {
        console.error('Error loading configuration:', error);
        // Fallback defaults
        USERS_CONFIG = {
            apiPrefix: '/probler',
            usersPath: '/73/users',
            rolesPath: '/74/roles'
        };
        return false;
    }
}
