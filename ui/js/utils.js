// Utility Functions and Common Constants

// API Base URL - Replace with your actual API endpoint
const API_BASE_URL = 'https://api.yournetworkautomation.com/v1';

// Modal functions
function closeModal() {
    document.getElementById('deviceModal').style.display = 'none';
}

// Loading functions
function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = 'block';
    }
}

function hideLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = 'none';
    }
}

// Notification system
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">×</button>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Keyboard shortcuts
function initializeKeyboardShortcuts() {
    document.addEventListener('keydown', function(event) {
        // Ctrl/Cmd + R: Refresh all data
        if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
            event.preventDefault();
            refreshDevices();
            refreshAlarms();
            loadDashboardStats();
        }
        
        // Escape: Close modal
        if (event.key === 'Escape') {
            closeModal();
        }
        
        // Ctrl/Cmd + D: Toggle dashboard
        if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
            event.preventDefault();
            toggleDashboard();
        }
        
        // Ctrl/Cmd + 1: Toggle devices section
        if ((event.ctrlKey || event.metaKey) && event.key === '1') {
            event.preventDefault();
            toggleDevicesSection();
        }
        
        // Ctrl/Cmd + 2: Toggle alarms section
        if ((event.ctrlKey || event.metaKey) && event.key === '2') {
            event.preventDefault();
            toggleAlarmsSection();
        }
    });
}