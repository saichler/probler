// Credentials App Configuration
// Loaded from ../login.json

let CREDENTIALS_CONFIG = null;

// Load configuration from login.json
async function loadConfig() {
    try {
        const response = await fetch('../login.json');
        if (!response.ok) {
            throw new Error('Failed to load configuration');
        }
        const config = await response.json();
        CREDENTIALS_CONFIG = {
            apiPrefix: config.api.prefix,
            credsPath: config.api.credsPath || '/75/Creds'
        };
        return true;
    } catch (error) {
        console.error('Error loading configuration:', error);
        // Fallback defaults
        CREDENTIALS_CONFIG = {
            apiPrefix: '/probler',
            credsPath: '/75/Creds'
        };
        return false;
    }
}
