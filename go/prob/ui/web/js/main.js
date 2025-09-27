// Main Application Initialization

// Initialize the application
async function initializeApp() {
    loadUsername(); // Load and display current username
    loadDashboardPreference(); // Load saved preference first
    loadSectionPreferences(); // Load section preferences

    // Load devices first, then dashboard stats (which depends on device data)
    await loadDevices();
    loadDashboardStats();
    loadAlarms();

    // Set up auto-refresh every 5 minutes
    setInterval(async () => {
        await loadDevices();
        loadDashboardStats();
        loadAlarms();
    }, 300000);
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