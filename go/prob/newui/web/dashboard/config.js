// Dashboard App Configuration
// Loaded from ../login.json

let DASHBOARD_CONFIG = null;

// Load configuration from login.json
async function loadConfig() {
    try {
        const response = await fetch('../login.json');
        if (!response.ok) {
            throw new Error('Failed to load configuration');
        }
        const config = await response.json();
        DASHBOARD_CONFIG = {
            apiPrefix: config.api.prefix,
            cachePath: config.api.devicesPath || '/0/NCache'
        };
        return true;
    } catch (error) {
        console.error('Error loading configuration:', error);
        // Fallback defaults
        DASHBOARD_CONFIG = {
            apiPrefix: '/probler',
            cachePath: '/0/NCache'
        };
        return false;
    }
}
