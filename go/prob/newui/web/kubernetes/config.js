// Kubernetes App Configuration

// API Configuration
const K8S_API_CONFIG = {
    baseUrl: '/probler',
    endpoints: {
        clusters: '/probler/1/KCache',
        exec: '/probler/0/exec'
    }
};

// Authentication token
let bearerToken = localStorage.getItem('bearerToken') || null;

// Get auth headers
function getAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (bearerToken) {
        headers['Authorization'] = `Bearer ${bearerToken}`;
    }
    return headers;
}

// Make authenticated API request
async function makeAuthenticatedRequest(url, options = {}) {
    try {
        const response = await fetch(url, {
            ...options,
            headers: getAuthHeaders()
        });
        return response;
    } catch (error) {
        console.error('API request failed:', error);
        return null;
    }
}
