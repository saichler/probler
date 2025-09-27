// Main Application Initialization

// Initialize the application
async function initializeApp() {
    loadUsername(); // Load and display current username
    loadDashboardPreference(); // Load saved preference first
    loadSectionPreferences(); // Load section preferences

    // Only load data if user is authenticated
    if (sessionStorage.getItem('authenticated') === 'true') {
        // Load devices first, then dashboard stats (which depends on device data)
        await loadDevices();
        loadDashboardStats();
        loadAlarms();

        // Set up auto-refresh every 5 minutes (only if authenticated)
        setInterval(async () => {
            if (sessionStorage.getItem('authenticated') === 'true') {
                await loadDevices();
                loadDashboardStats();
                loadAlarms();
            }
        }, 300000);
    }
}

// Application startup when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize authentication
    initializeAuth();
    
    // Initialize the main application
    initializeApp();
    
    // Initialize keyboard shortcuts
    initializeKeyboardShortcuts();
    
    // Initialize modal handlers
    initializeModalHandlers();
});