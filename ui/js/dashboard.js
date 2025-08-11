// Dashboard Management and Statistics

// Dashboard visibility state
let isDashboardVisible = true;
let isDevicesVisible = false;
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

function toggleDevicesSection() {
    const devicesSection = document.getElementById('devicesSection');
    const toggleIcon = document.getElementById('devicesToggleIcon');
    
    isDevicesVisible = !isDevicesVisible;
    
    if (isDevicesVisible) {
        devicesSection.className = 'section visible devices-section';
        toggleIcon.textContent = '−';
    } else {
        devicesSection.className = 'section collapsed devices-section';
        toggleIcon.textContent = '+';
    }
    
    // Save preference
    saveSectionPreference('devicesVisible', isDevicesVisible);
}

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
            // Load devices preference
            const devicesVisible = sessionStorage.getItem('devicesVisible');
            if (devicesVisible !== null) {
                isDevicesVisible = devicesVisible === 'true';
                const devicesSection = document.getElementById('devicesSection');
                const devicesToggleIcon = document.getElementById('devicesToggleIcon');
                
                if (isDevicesVisible) {
                    devicesSection.className = 'section visible devices-section';
                    devicesToggleIcon.textContent = '−';
                } else {
                    devicesSection.className = 'section collapsed devices-section';
                    devicesToggleIcon.textContent = '+';
                }
            }
            
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
        // Replace with actual API call
        // const response = await fetch(`${API_BASE_URL}/dashboard/stats`);
        // const stats = await response.json();
        
        // Sample data
        const stats = {
            totalDevices: 127,
            onlineDevices: 123,
            offlineDevices: 4,
            criticalAlarms: 2,
            totalAlarms: 15
        };

        updateDashboardStats(stats);
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

function updateDashboardStats(stats) {
    document.getElementById('totalDevices').textContent = stats.totalDevices;
    document.getElementById('onlineDevices').textContent = stats.onlineDevices;
    document.getElementById('offlineDevices').textContent = stats.offlineDevices;
    document.getElementById('criticalAlarms').textContent = stats.criticalAlarms;
    document.getElementById('totalAlarms').textContent = stats.totalAlarms;
}