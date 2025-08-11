// Main Application Initialization

// Initialize the application
function initializeApp() {
    loadUsername(); // Load and display current username
    loadDashboardPreference(); // Load saved preference first
    loadSectionPreferences(); // Load section preferences
    loadDashboardStats();
    loadDevices();
    loadAlarms();
    
    // Set up auto-refresh every 30 seconds
    setInterval(() => {
        loadDashboardStats();
        loadDevices();
        loadAlarms();
    }, 30000);
}

// Application startup when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize authentication
    initializeAuth();
    
    // Initialize the main application
    initializeApp();
    
    // Initialize keyboard shortcuts
    initializeKeyboardShortcuts();
});