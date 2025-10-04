// Main Application Initialization

// Initialize the application
async function initializeApp() {
    loadUsername(); // Load and display current username
    loadDashboardPreference(); // Load saved preference first
    loadSectionPreferences(); // Load section preferences

    // Only load data if user is authenticated
    if (sessionStorage.getItem('authenticated') === 'true') {
        // Load dashboard data (don't load devices here since it's in a separate file now)
        loadDashboardStats();
        loadAlarms();

        // Set up auto-refresh every 5 minutes (only if authenticated)
        setInterval(async () => {
            if (sessionStorage.getItem('authenticated') === 'true') {
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