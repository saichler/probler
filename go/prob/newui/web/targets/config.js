// Targets App Configuration
// Loaded from ../login.json

let TARGETS_CONFIG = null;

// Load configuration from login.json
async function loadConfig() {
    try {
        const response = await fetch('../login.json');
        if (!response.ok) {
            throw new Error('Failed to load configuration');
        }
        const config = await response.json();
        TARGETS_CONFIG = {
            apiPrefix: config.api.prefix,
            targetsPath: config.api.targetsPath || '/91/Targets',
            credsPath: config.api.credsPath || '/75/Creds'
        };
        return true;
    } catch (error) {
        console.error('Error loading configuration:', error);
        // Fallback defaults
        TARGETS_CONFIG = {
            apiPrefix: '/probler',
            targetsPath: '/91/Targets',
            credsPath: '/75/Creds'
        };
        return false;
    }
}
