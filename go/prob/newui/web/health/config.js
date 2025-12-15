// Health App Configuration
// Loaded from ../login.json

let HEALTH_CONFIG = null;

// Load configuration from login.json
async function loadConfig() {
    try {
        const response = await fetch('../login.json');
        if (!response.ok) {
            throw new Error('Failed to load configuration');
        }
        const config = await response.json();
        HEALTH_CONFIG = {
            apiPrefix: config.api.prefix,
            healthPath: config.api.healthPath
        };
        return true;
    } catch (error) {
        console.error('Error loading configuration:', error);
        // Fallback defaults
        HEALTH_CONFIG = {
            apiPrefix: '/probler',
            healthPath: '/0/Health'
        };
        return false;
    }
}
