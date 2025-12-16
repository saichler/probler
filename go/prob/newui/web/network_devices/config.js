// Network Devices App Configuration
// Loaded from ../login.json

let NETWORK_DEVICES_CONFIG = null;

// Load configuration from login.json
async function loadConfig() {
    try {
        const response = await fetch('../login.json');
        if (!response.ok) {
            throw new Error('Failed to load configuration');
        }
        const config = await response.json();
        NETWORK_DEVICES_CONFIG = {
            apiPrefix: config.api.prefix,
            devicesPath: config.api.devicesPath || '/0/NCache'
        };
        return true;
    } catch (error) {
        console.error('Error loading configuration:', error);
        // Fallback defaults
        NETWORK_DEVICES_CONFIG = {
            apiPrefix: '/probler',
            devicesPath: '/0/NCache'
        };
        return false;
    }
}
