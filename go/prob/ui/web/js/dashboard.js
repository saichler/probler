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
    console.log('🔍 Dashboard: Starting to load dashboard stats...');

    try {
        // Check if authenticatedFetch is available
        if (typeof authenticatedFetch === 'undefined') {
            console.error('❌ Dashboard: authenticatedFetch not available, falling back to calculateDeviceStats');
            const stats = calculateDeviceStats();
            updateDashboardStats(stats);
            return;
        }

        // Fetch device stats directly from API for dashboard using authenticatedFetch
        // Use the same format as devices.js with the body parameter
        const apiEndpoint = '/probler/0/NetDev';
        const bodyParam = '{"text":"select * from NetworkDevice limit 25 page 0", "rootType":"networkdevice", "properties":["*"], "limit":25, "page":0, "matchCase":true}';

        // Pass the body parameter as URL query parameter for GET request
        const queryParams = new URLSearchParams({
            body: bodyParam
        });

        const apiUrl = `${apiEndpoint}?${queryParams}`;
        console.log('🔍 Dashboard: Fetching device stats from:', apiEndpoint);
        console.log('🔍 Dashboard: Using body parameter:', bodyParam);

        const response = await authenticatedFetch(apiUrl, {
            method: 'GET'
        });

        console.log('🔍 Dashboard: API Response status:', response.status, 'OK:', response.ok);

        if (response.ok) {
            const data = await response.json();
            console.log('🔍 Dashboard: API Response data:', data);

            if (data && data.stats) {
                const serverStats = data.stats;
                console.log('🔍 Dashboard: Server stats object:', serverStats);

                const totalDevices = serverStats.Total || 0;
                const onlineDevices = serverStats.Online || 0;
                const offlineDevices = totalDevices - onlineDevices;

                console.log(`✅ Dashboard Stats from server: Total=${totalDevices}, Online=${onlineDevices}, Offline=${offlineDevices}`);

                const stats = {
                    totalDevices: totalDevices,
                    onlineDevices: onlineDevices,
                    offlineDevices: offlineDevices,
                    criticalAlarms: 2, // TODO: Get from actual alarms API
                    totalAlarms: 15 // TODO: Get from actual alarms API
                };

                console.log('🔍 Dashboard: Calling updateDashboardStats with:', stats);
                updateDashboardStats(stats);
            } else {
                console.log('⚠️ Dashboard: No stats in API response, trying calculateDeviceStats');
                // Calculate from existing data if available
                const stats = calculateDeviceStats();
                updateDashboardStats(stats);
            }
        } else {
            console.log('⚠️ Dashboard: API response not OK, status:', response.status);
            // Calculate from existing data if available
            const stats = calculateDeviceStats();
            updateDashboardStats(stats);
        }
    } catch (error) {
        console.error('❌ Dashboard: Error loading dashboard stats:', error);
        console.error('Error details:', error.message, error.stack);

        // Fallback to sample data if calculation fails
        const fallbackStats = {
            totalDevices: 0,
            onlineDevices: 0,
            offlineDevices: 0,
            criticalAlarms: 2,
            totalAlarms: 15
        };
        console.log('🔍 Dashboard: Using fallback stats:', fallbackStats);
        updateDashboardStats(fallbackStats);
    }
}

function calculateDeviceStats() {
    // Check if we have server stats from the API response
    if (typeof window.lastApiResponse !== 'undefined' && window.lastApiResponse && window.lastApiResponse.stats) {
        const serverStats = window.lastApiResponse.stats;
        const totalDevices = serverStats.Total || 0;
        const onlineDevices = serverStats.Online || 0;
        const offlineDevices = totalDevices - onlineDevices;

        console.log(`Dashboard Stats from server: Total=${totalDevices}, Online=${onlineDevices}, Offline=${offlineDevices}`);

        return {
            totalDevices: totalDevices,
            onlineDevices: onlineDevices,
            offlineDevices: offlineDevices,
            warningDevices: 0, // Keep for compatibility
            criticalDevices: 0, // Keep for compatibility
            partialDevices: 0, // Keep for compatibility
            maintenanceDevices: 0, // Keep for compatibility
            criticalAlarms: 2, // Keep existing alarm data for now
            totalAlarms: 15
        };
    }

    // Fallback: Access devicesData from devices.js - if not available, return zeros
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

    // With server-side paging, calculate total devices as 25 * totalPages (fallback method)
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

    console.log(`Dashboard Stats (fallback): Total=${totalDevicesEstimate}, Online=${onlineDevices}, Offline=${offlineDevices}, Warning=${warningDevices}, Critical=${criticalDevices}, Partial=${partialDevices}, Maintenance=${maintenanceDevices}`);

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
    console.log('🔍 Dashboard: updateDashboardStats called with:', stats);

    const totalDevicesElement = document.getElementById('totalDevices');
    if (totalDevicesElement) {
        console.log('🔍 Dashboard: Updating totalDevices to:', stats.totalDevices);
        totalDevicesElement.textContent = stats.totalDevices;
    } else {
        console.error('❌ Dashboard: totalDevices element not found!');
    }

    const onlineDevicesElement = document.getElementById('onlineDevices');
    if (onlineDevicesElement) {
        console.log('🔍 Dashboard: Updating onlineDevices to:', stats.onlineDevices);
        onlineDevicesElement.textContent = stats.onlineDevices;
    } else {
        console.error('❌ Dashboard: onlineDevices element not found!');
    }

    const offlineDevicesElement = document.getElementById('offlineDevices');
    if (offlineDevicesElement) {
        console.log('🔍 Dashboard: Updating offlineDevices to:', stats.offlineDevices);
        offlineDevicesElement.textContent = stats.offlineDevices;
    } else {
        console.error('❌ Dashboard: offlineDevices element not found!');
    }

    const criticalAlarmsElement = document.getElementById('criticalAlarms');
    if (criticalAlarmsElement) {
        console.log('🔍 Dashboard: Updating criticalAlarms to:', stats.criticalAlarms);
        criticalAlarmsElement.textContent = stats.criticalAlarms;
    } else {
        console.error('❌ Dashboard: criticalAlarms element not found!');
    }

    const totalAlarmsElement = document.getElementById('totalAlarms');
    if (totalAlarmsElement) {
        console.log('🔍 Dashboard: Updating totalAlarms to:', stats.totalAlarms);
        totalAlarmsElement.textContent = stats.totalAlarms;
    } else {
        console.error('❌ Dashboard: totalAlarms element not found!');
    }

    console.log('✅ Dashboard: Stats update completed');
}