// Dashboard Management and Statistics

// Dashboard visibility state
let isDashboardVisible = true;
let isAlarmsVisible = true;

function toggleDashboard() {
    const dashboardSection = document.getElementById('dashboardSection');
    
    isDashboardVisible = !isDashboardVisible;
    
    if (isDashboardVisible) {
        dashboardSection.className = 'dashboard visible';
        showNotification('📊 Dashboard shown', 'info');
    } else {
        dashboardSection.className = 'dashboard hidden';
        showNotification('📊 Dashboard hidden', 'info');
    }
    
    // Save preference to localStorage (if available)
    try {
        if (typeof Storage !== 'undefined') {
            sessionStorage.setItem('dashboardVisible', isDashboardVisible);
        }
    } catch (e) {
        // Storage not available, continue without saving preference
    }
}

// toggleDevicesSection function removed - devices section is always visible

function toggleAlarmsSection() {
    const alarmsSection = document.getElementById('alarmsSection');
    const toggleIcon = document.getElementById('alarmsToggleIcon');
    
    isAlarmsVisible = !isAlarmsVisible;
    
    if (isAlarmsVisible) {
        alarmsSection.className = 'section visible';
        toggleIcon.textContent = '−';
    } else {
        alarmsSection.className = 'section collapsed';
        toggleIcon.textContent = '+';
    }
    
    // Save preference
    saveSectionPreference('alarmsVisible', isAlarmsVisible);
}

function saveSectionPreference(key, value) {
    try {
        if (typeof Storage !== 'undefined') {
            sessionStorage.setItem(key, value);
        }
    } catch (e) {
        // Storage not available, continue without saving
    }
}

function loadDashboardPreference() {
    try {
        if (typeof Storage !== 'undefined') {
            const saved = sessionStorage.getItem('dashboardVisible');
            if (saved !== null) {
                isDashboardVisible = saved === 'true';
                const dashboardSection = document.getElementById('dashboardSection');
                const toggleText = document.getElementById('dashboardToggleText');
                
                if (isDashboardVisible) {
                    dashboardSection.className = 'dashboard visible';
                    toggleText.innerHTML = '📊 Hide Dashboard';
                } else {
                    dashboardSection.className = 'dashboard hidden';
                    toggleText.innerHTML = '📊 Show Dashboard';
                }
            }
        }
    } catch (e) {
        // Storage not available, use default (visible)
    }
}

function loadSectionPreferences() {
    try {
        if (typeof Storage !== 'undefined') {
            // Devices section is always visible (no toggle functionality)
            
            // Load alarms preference
            const alarmsVisible = sessionStorage.getItem('alarmsVisible');
            if (alarmsVisible !== null) {
                isAlarmsVisible = alarmsVisible === 'true';
                const alarmsSection = document.getElementById('alarmsSection');
                const alarmsToggleIcon = document.getElementById('alarmsToggleIcon');
                
                if (isAlarmsVisible) {
                    alarmsSection.className = 'section visible';
                    alarmsToggleIcon.textContent = '−';
                } else {
                    alarmsSection.className = 'section collapsed';
                    alarmsToggleIcon.textContent = '+';
                }
            }
        }
    } catch (e) {
        // Storage not available, use defaults (visible)
    }
}

async function loadDashboardStats() {
    try {
        // Calculate real device statistics from the devicesData array
        const stats = calculateDeviceStats();
        updateDashboardStats(stats);
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        // Fallback to sample data if calculation fails
        const fallbackStats = {
            totalDevices: 0,
            onlineDevices: 0,
            offlineDevices: 0,
            criticalAlarms: 2,
            totalAlarms: 15
        };
        updateDashboardStats(fallbackStats);
    }
}

function calculateDeviceStats() {
    // Access devicesData from devices.js - if not available, return zeros
    if (typeof devicesData === 'undefined' || !Array.isArray(devicesData)) {
        console.warn('devicesData not available, returning default stats');
        return {
            totalDevices: 0,
            onlineDevices: 0,
            offlineDevices: 0,
            criticalAlarms: 2,
            totalAlarms: 15
        };
    }

    // With server-side paging, calculate total devices as 25 * totalPages
    const totalDevicesEstimate = (typeof totalPages !== 'undefined' && totalPages > 0) ? 25 * totalPages : devicesData.length;
    let onlineDevices = 0;
    let offlineDevices = 0;
    let warningDevices = 0;
    let criticalDevices = 0;
    let partialDevices = 0;
    let maintenanceDevices = 0;

    devicesData.forEach(device => {
        switch (device.status.toLowerCase()) {
            case 'online':
                onlineDevices++;
                break;
            case 'offline':
                offlineDevices++;
                break;
            case 'warning':
                warningDevices++;
                break;
            case 'critical':
                criticalDevices++;
                break;
            case 'partial':
                partialDevices++;
                break;
            case 'maintenance':
                maintenanceDevices++;
                break;
            default:
                // Unknown status - count as offline for safety
                offlineDevices++;
        }
    });

    console.log(`Dashboard Stats: Total=${totalDevicesEstimate}, Online=${onlineDevices}, Offline=${offlineDevices}, Warning=${warningDevices}, Critical=${criticalDevices}, Partial=${partialDevices}, Maintenance=${maintenanceDevices}`);

    return {
        totalDevices: totalDevicesEstimate,
        onlineDevices: onlineDevices,
        offlineDevices: offlineDevices,
        warningDevices: warningDevices,
        criticalDevices: criticalDevices,
        partialDevices: partialDevices,
        maintenanceDevices: maintenanceDevices,
        criticalAlarms: 2, // Keep existing alarm data for now
        totalAlarms: 15
    };
}

function updateDashboardStats(stats) {
    document.getElementById('totalDevices').textContent = stats.totalDevices;
    document.getElementById('onlineDevices').textContent = stats.onlineDevices;
    document.getElementById('offlineDevices').textContent = stats.offlineDevices;
    document.getElementById('criticalAlarms').textContent = stats.criticalAlarms;
    document.getElementById('totalAlarms').textContent = stats.totalAlarms;
}