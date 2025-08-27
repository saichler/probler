// System Health Management - Professional top equivalent web GUI
// Fetches data from /0/Health endpoint and displays in FormatTop equivalent format

let servicesRefreshInterval = null;
let currentProcesses = [];
let currentHealthData = null; // Store original health data
let currentSortColumn = null;
let currentSortOrder = "desc";
let isAutoRefreshEnabled = false;
const REFRESH_INTERVAL = 15000; // 15 seconds


// Initialize health monitoring when app loads
function initializeServices() {
    console.log('Initializing System Health Monitor...');
    refreshServices();
    updateAutoRefreshButton();
}

// Main function to refresh services data
async function refreshServices() {
    console.log("refreshServices called");
    // Use global notification if available
    if (typeof window.showNotification === "function") {
        window.showNotification("🔄 Refreshing system health...", "info");
    }
    
    hideError();
    
    try {
        const response = await fetch('/probler/0/Health', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const topData = await response.json();
        
        // Process and display the data
        processServicesData(topData);
        updateLastUpdateTime();
        
    } catch (error) {
        console.error('Failed to fetch services data:', error);
        showError(`Failed to load health data: ${error.message}`);
    }
}

// Process the Top data and render the table
function processServicesData(topData) {
    console.log('Received top data:', topData); // Debug log
    
    if (!topData || !topData.healths) {
        showError('No health data received from server');
        return;
    }
    
    // Store original health data
    currentHealthData = topData.healths;
    
    // Convert health data to process info similar to FormatTop
    const processes = [];
    
    for (const [key, health] of Object.entries(topData.healths)) {
        const process = {
            command: health.alias || key || 'unknown',
            originalKey: key, // Store original key for lookup
            rxCount: health.stats?.rxMsgCount || 0,
            rxDataCount: health.stats?.rxDataCont || 0,
            txCount: health.stats?.txMsgCount || 0,
            txDataCount: health.stats?.txDataCount || 0,
            memoryUsage: health.stats?.memoryUsage || 0,
            status: getStatusChar(health.status),
            cpuUsage: health.stats?.cpuUsage || 0,
            upTime: calculateUptime(health.startTime),
            lastPulse: calculateLastPulse(health.stats?.lastMsgTime)
        };
        
        processes.push(process);
    }
    
    console.log('Processed processes:', processes); // Debug log
    
    // Store processes globally for sorting
    currentProcesses = processes;
    
    // Sort by CPU usage (descending) - initial sort
    processes.sort((a, b) => b.cpuUsage - a.cpuUsage);
    
    // Update statistics
    updateServicesStats(processes);
    
    // Render the table
    renderServicesTable(processes);
}

// Calculate column widths dynamically like FormatTop.go
function calculateColumnWidths(processes) {
    const widths = {
        command: Math.max('Service'.length, ...processes.map(p => p.command.length)), // Service
        rx: Math.max(2, ...processes.map(p => String(p.rxCount).length)), // RX
        rxData: Math.max(7, ...processes.map(p => formatMemory(p.rxDataCount).length)), // RX DATA
        tx: Math.max(2, ...processes.map(p => String(p.txCount).length)), // TX
        txData: Math.max(7, ...processes.map(p => formatMemory(p.txDataCount).length)), // TX DATA
        memory: Math.max(6, ...processes.map(p => formatMemory(p.memoryUsage).length)), // MEMORY
        status: Math.max(1, ...processes.map(p => p.status.length)), // S
        cpu: Math.max(4, ...processes.map(p => p.cpuUsage.toFixed(1).length)), // %CPU
        upTime: Math.max(7, ...processes.map(p => p.upTime.length)), // UP TIME
        lastPulse: Math.max(10, ...processes.map(p => p.lastPulse.length)) // LAST PULSE
    };
    
    return widths;
}

// Render the services table
function renderServicesTable(processes) {
    const headerElement = document.getElementById('servicesTableHeader');
    const separatorElement = document.getElementById('servicesTableSeparator');
    const bodyElement = document.getElementById('servicesTableBody');
    
    if (!headerElement || !separatorElement || !bodyElement) {
        console.error('Table elements not found');
        return;
    }
    
    // Calculate dynamic column widths
    const widths = calculateColumnWidths(processes);
    
    // Build header
    const headers = [
        { text: 'Service', width: widths.command },
        { text: 'RX', width: widths.rx },
        { text: 'RX DATA', width: widths.rxData },
        { text: 'TX', width: widths.tx },
        { text: 'TX DATA', width: widths.txData },
        { text: 'MEMORY', width: widths.memory },
        { text: 'S', width: widths.status },
        { text: '%CPU', width: widths.cpu },
        { text: 'UP TIME', width: widths.upTime },
        { text: 'LAST PULSE', width: widths.lastPulse }
    ];
    
    headerElement.innerHTML = headers.map((h, index) => {
        const isSorted = currentSortColumn === index;
        const sortIndicator = isSorted ? " ↓" : "";
        return `<th style="min-width: ${h.width * 8}px; cursor: pointer; user-select: none; ${isSorted ? "background: linear-gradient(135deg, #dee2e6, #ced4da);" : ""}" onclick="sortProcesses(${index})" title="Click to sort by ${h.text} (descending)">${h.text}${sortIndicator}</th>`;
    }).join("");
    separatorElement.innerHTML = headers.map(h => `<td>${'-'.repeat(h.width)}</td>`).join('');
    
    // Build body
    bodyElement.innerHTML = processes.map((process, index) => `
        <tr onclick="showServiceHealthDetails(${index})" style="cursor: pointer;" title="Click to view detailed health information">
            <td>${process.command}</td>
            <td>${process.rxCount}</td>
            <td class="memory-value">${formatMemory(process.rxDataCount)}</td>
            <td>${process.txCount}</td>
            <td class="memory-value">${formatMemory(process.txDataCount)}</td>
            <td class="memory-value">${formatMemory(process.memoryUsage)}</td>
            <td class="status-${getStatusClass(process.status)}">${process.status}</td>
            <td class="cpu-value">${process.cpuUsage.toFixed(1)}</td>
            <td class="time-value">${process.upTime}</td>
            <td class="time-value">${process.lastPulse}</td>
        </tr>
    `).join('');
}

// Update statistics display
function updateServicesStats(processes) {
    const totalServices = processes.length;
    const runningServices = processes.filter(p => p.status === 'R').length;
    const stoppedServices = processes.filter(p => p.status === 'T').length;
    
    document.getElementById('totalServices').textContent = totalServices;
    document.getElementById('runningServices').textContent = runningServices;
    document.getElementById('stoppedServices').textContent = stoppedServices;
}

// Helper functions
function getStatusChar(healthState) {
    // Handle string status from JSON
    if (typeof healthState === 'string') {
        switch (healthState.toLowerCase()) {
            case 'up':
                return 'R';
            case 'down':
                return 'T';
            default:
                return 'S';
        }
    }
    // Handle numeric status (legacy)
    switch (healthState) {
        case 1: // HealthState_Up
            return 'R';
        case 2: // HealthState_Down
            return 'T';
        default:
            return 'S';
    }
}

function getStatusClass(statusChar) {
    switch (statusChar) {
        case 'R': return 'running';
        case 'T': return 'stopped';
        default: return 'sleeping';
    }
}

function formatMemory(bytes) {
    if (!bytes || bytes === 0) return '0B';
    
    const sizes = ['B', 'K', 'M', 'G'];
    let value = bytes;
    let sizeIndex = 0;
    
    while (value >= 1024 && sizeIndex < sizes.length - 1) {
        value /= 1024;
        sizeIndex++;
    }
    
    if (sizeIndex === 0) {
        return `${value}${sizes[sizeIndex]}`;
    } else {
        return `${value.toFixed(1)}${sizes[sizeIndex]}`;
    }
}

function calculateUptime(startTime) {
    if (!startTime || startTime === 0 || startTime === '0') return '00:00:00';
    
    // Convert string to number if needed
    let startTimeMs = typeof startTime === 'string' ? parseInt(startTime, 10) : startTime;
    
    // startTime is epoch time in milliseconds
    const nowMs = Date.now();
    
    // Calculate uptime: (now - startTime) / 1000 to get seconds
    const uptimeSeconds = Math.floor((nowMs - startTimeMs) / 1000);
    
    // Handle negative uptime (future start time)
    if (uptimeSeconds < 0) {
        return '00:00:00';
    }
    
    // Convert seconds to HH:MM:SS format
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function calculateLastPulse(lastMsgTime) {
    if (!lastMsgTime || lastMsgTime === 0 || lastMsgTime === '0') return '00:00:00';
    
    // Convert string to number if needed
    let lastMsgTimeMs = typeof lastMsgTime === 'string' ? parseInt(lastMsgTime, 10) : lastMsgTime;
    
    // lastMsgTime is epoch time in milliseconds
    const nowMs = Date.now();
    
    // Calculate time since last pulse: (now - lastMsgTime) / 1000 to get seconds
    const timeSinceSeconds = Math.floor((nowMs - lastMsgTimeMs) / 1000);
    
    // Handle negative time (future message time)
    if (timeSinceSeconds < 0) {
        return '00:00:00';
    }
    
    // Convert seconds to HH:MM:SS format
    const hours = Math.floor(timeSinceSeconds / 3600);
    const minutes = Math.floor((timeSinceSeconds % 3600) / 60);
    const seconds = timeSinceSeconds % 60;
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Auto-refresh management
function startAutoRefresh() {
    if (servicesRefreshInterval) {
        clearInterval(servicesRefreshInterval);
    }
    
    if (isAutoRefreshEnabled) {
        servicesRefreshInterval = setInterval(refreshServices, REFRESH_INTERVAL);
        updateAutoRefreshButton();
    }
}

function stopAutoRefresh() {
    if (servicesRefreshInterval) {
        clearInterval(servicesRefreshInterval);
        servicesRefreshInterval = null;
    }
}

function toggleAutoRefresh() {
    isAutoRefreshEnabled = !isAutoRefreshEnabled;
    
    if (isAutoRefreshEnabled) {
        startAutoRefresh();
    } else {
        stopAutoRefresh();
    }
    
    updateAutoRefreshButton();
}

function updateAutoRefreshButton() {
    const button = document.getElementById('autoRefreshBtn');
    if (button) {
        if (isAutoRefreshEnabled) {
            button.innerHTML = '⏸️ Auto-refresh (15s)';
            button.title = 'Pause auto-refresh';
        } else {
            button.innerHTML = '▶️ Auto-refresh (OFF)';
            button.title = 'Start auto-refresh';
        }
    }
}

// UI helpers (showLoading replaced with notifications)
// Loading function kept for compatibility but does nothing
function showLoading(show) {
    // Replaced with notification system - no action needed
}

function showError(message) {
    const errorElement = document.getElementById('servicesError');
    const errorText = document.querySelector('#servicesError .error-text');
    
    if (errorElement && errorText) {
        errorText.textContent = message;
        errorElement.style.display = 'flex';
    }
    
    // Hide table
    const tableContainer = document.getElementById('servicesTableContainer');
    if (tableContainer) {
        tableContainer.style.display = 'none';
    }
}

function hideError() {
    const errorElement = document.getElementById('servicesError');
    if (errorElement) {
        errorElement.style.display = 'none';
    }
    
    // Show table
    const tableContainer = document.getElementById('servicesTableContainer');
    if (tableContainer) {
        tableContainer.style.display = 'block';
    }
}

function updateLastUpdateTime() {
    const lastUpdateElement = document.getElementById('lastUpdate');
    if (lastUpdateElement) {
        const now = new Date();
        lastUpdateElement.textContent = now.toLocaleTimeString();
    }
}

// Initialize health monitoring when the app is opened
// This will be called from app-management.js when the health app is activated
function initServicesApp() {
    console.log("initServicesApp called");
    if (typeof window.showNotification === "function") {
        window.showNotification("💚 System Health initialized", "info");
    }
    initializeServices();
}

// Cleanup when switching away from health app
function cleanupServicesApp() {
    stopAutoRefresh();
}

// Export functions for global access
window.refreshServices = refreshServices;
window.toggleAutoRefresh = toggleAutoRefresh;
window.initServicesApp = initServicesApp;
window.cleanupServicesApp = cleanupServicesApp;console.log('Services.js loaded');

// Debug: Test manual trigger
window.testServices = function() {
    console.log('Manual health test');
    if (window.initServicesApp) {
        window.initServicesApp();
    } else {
        console.error('initServicesApp not found');
    }
};

// Sorting functionality
function sortProcesses(columnIndex) {
    if (!currentProcesses || currentProcesses.length === 0) {
        console.log("No processes to sort");
        return;
    }
    
    // Column mapping
    const columnFields = [
        "command",      // 0: Service
        "rxCount",      // 1: RX
        "rxDataCount",  // 2: RX DATA
        "txCount",      // 3: TX
        "txDataCount",  // 4: TX DATA
        "memoryUsage",  // 5: MEMORY
        "status",       // 6: S
        "cpuUsage",     // 7: %CPU
        "upTime",       // 8: UP TIME
        "lastPulse"     // 9: LAST PULSE
    ];
    
    const field = columnFields[columnIndex];
    if (!field) {
        console.error("Invalid column index:", columnIndex);
        return;
    }
    
    console.log("Sorting by column:", field, "index:", columnIndex);
    
    // Show notification
    if (typeof window.showNotification === "function") {
        const headers = ["Service", "RX", "RX DATA", "TX", "TX DATA", "MEMORY", "S", "%CPU", "UP TIME", "LAST PULSE"];
        window.showNotification(`📊 Sorted by ${headers[columnIndex]} ↓`, "success");
    }
    
    // Sort in descending order (always descending as requested)
    currentProcesses.sort((a, b) => {
        let valueA = a[field];
        let valueB = b[field];
        
        // Handle different data types
        if (field === "command" || field === "status") {
            // String comparison (case insensitive)
            return valueB.toLowerCase().localeCompare(valueA.toLowerCase());
        } else if (field === "upTime" || field === "lastPulse") {
            // Time string comparison - convert to seconds for proper sorting
            const timeToSeconds = (timeStr) => {
                const parts = timeStr.split(":");
                return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
            };
            return timeToSeconds(valueB) - timeToSeconds(valueA);
        } else if (field === "rxCount" || field === "txCount" || field === "rxDataCount" || field === "txDataCount" || field === "memoryUsage" || field === "cpuUsage") {
            // Numeric comparison for all count and memory fields (use raw numeric values)
            return valueB - valueA;
        } else {
            // Fallback to string comparison
            return String(valueB).localeCompare(String(valueA));
        }
    });
    
    // Update current sort state
    currentSortColumn = columnIndex;
    currentSortOrder = "desc";
    
    console.log("Sorted processes by", field, "- first 3 items:", currentProcesses.slice(0, 3).map(p => ({[field]: p[field]})));
    
    // Re-render the table with sorted data
    renderServicesTable(currentProcesses);
    
    // Update statistics with sorted data
    updateServicesStats(currentProcesses);
}
window.sortProcesses = sortProcesses;

// Service Health Modal Functions
function showServiceHealthDetails(processIndex) {
    const process = currentProcesses[processIndex];
    if (!process) {
        console.error('Process not found at index:', processIndex);
        return;
    }
    
    console.log('Showing service health details for:', process.command);
    
    // Get the original health data for this service
    const originalHealthData = findOriginalHealthData(processIndex);
    
    // Set modal title
    document.getElementById('modalServiceName').textContent = `${process.command} - Health Details`;
    
    // Populate service information section
    populateServiceInfo(process, originalHealthData);
    
    // Populate services map section
    populateServiceMap(process, originalHealthData);
    
    // Populate service statistics section
    populateServiceStats(process, originalHealthData);
    
    // Show the modal
    document.getElementById('serviceHealthModal').style.display = 'block';
    
    // Show notification
    if (typeof window.showNotification === "function") {
        window.showNotification(`📊 Viewing health details for ${process.command}`, "info");
    }
}

function findOriginalHealthData(processIndex) {
    const process = currentProcesses[processIndex];
    if (!process || !currentHealthData) {
        return null;
    }
    
    // Find the original health data using the originalKey
    return currentHealthData[process.originalKey] || null;
}

function populateServiceInfo(process, originalHealthData) {
    const serviceInfoContent = document.getElementById('serviceInfoContent');
    
    const statusIndicator = getStatusIndicatorHtml(process.status);
    const startTimeStr = originalHealthData?.startTime ? 
        new Date(parseInt(originalHealthData.startTime)).toLocaleString() : 
        'Unknown';
    
    // Get service areas and types
    const services = originalHealthData?.services?.serviceToAreas || {};
    const serviceTypes = Object.keys(services).join(', ') || 'Unknown';
    const isVnet = originalHealthData?.isVnet ? 'Yes' : 'No';
    const uuid = originalHealthData?.aUuid || 'Unknown';
    const zoneUuid = originalHealthData?.zUuid || 'N/A';
    
    serviceInfoContent.innerHTML = `
        <div class="service-details">
            <div class="service-detail-item">
                <div class="service-detail-label">Service Name</div>
                <div class="service-detail-value">${process.command}</div>
            </div>
            <div class="service-detail-item">
                <div class="service-detail-label">Status</div>
                <div class="service-detail-value">${statusIndicator}</div>
            </div>
            <div class="service-detail-item">
                <div class="service-detail-label">Service UUID</div>
                <div class="service-detail-value" style="font-family: monospace; font-size: 0.8rem;">${uuid}</div>
            </div>
            <div class="service-detail-item">
                <div class="service-detail-label">Zone UUID</div>
                <div class="service-detail-value" style="font-family: monospace; font-size: 0.8rem;">${zoneUuid}</div>
            </div>
            <div class="service-detail-item">
                <div class="service-detail-label">Service Types</div>
                <div class="service-detail-value">${serviceTypes}</div>
            </div>
            <div class="service-detail-item">
                <div class="service-detail-label">VNet Service</div>
                <div class="service-detail-value">${isVnet}</div>
            </div>
            <div class="service-detail-item">
                <div class="service-detail-label">Start Time</div>
                <div class="service-detail-value">${startTimeStr}</div>
            </div>
            <div class="service-detail-item">
                <div class="service-detail-label">Uptime</div>
                <div class="service-detail-value">${process.upTime}</div>
            </div>
            <div class="service-detail-item">
                <div class="service-detail-label">Last Activity</div>
                <div class="service-detail-value">${process.lastPulse} ago</div>
            </div>
            <div class="service-detail-item">
                <div class="service-detail-label">CPU Usage</div>
                <div class="service-detail-value">${process.cpuUsage.toFixed(2)}%</div>
            </div>
        </div>
    `;
}

function populateServiceMap(process, originalHealthData) {
    const serviceMapContent = document.getElementById('serviceMapContent');
    
    // Get services map from original health data
    const servicesMap = originalHealthData?.services?.serviceToAreas || {};
    const serviceKeys = Object.keys(servicesMap);
    
    if (serviceKeys.length === 0) {
        serviceMapContent.innerHTML = `
            <div class="no-services-message">
                🔍 No services map available for this service
            </div>
        `;
        return;
    }
    
    // Create service count summary
    const totalServices = serviceKeys.length;
    const totalAreas = new Set();
    
    // Count unique areas across all services
    serviceKeys.forEach(serviceName => {
        const areas = servicesMap[serviceName]?.areas || {};
        Object.keys(areas).forEach(area => totalAreas.add(area));
    });
    
    serviceMapContent.innerHTML = `
        <div class="service-count-summary">
            📊 <strong>${totalServices}</strong> service${totalServices !== 1 ? 's' : ''} mapped to <strong>${totalAreas.size}</strong> area${totalAreas.size !== 1 ? 's' : ''}
        </div>
        <div class="service-map-grid">
            ${serviceKeys.map(serviceName => {
                const serviceData = servicesMap[serviceName];
                const areas = serviceData?.areas || {};
                const areaKeys = Object.keys(areas);
                
                // Get service icon based on service type
                const serviceIcon = getServiceIcon(serviceName);
                
                return `
                    <div class="service-item">
                        <div class="service-item-header">
                            <span class="service-icon">${serviceIcon}</span>
                            <span class="service-name">${serviceName}</span>
                        </div>
                        <div class="service-areas">
                            <div class="service-areas-label">Areas (${areaKeys.length})</div>
                            <div class="area-tags">
                                ${areaKeys.map(areaKey => {
                                    const isActive = areas[areaKey] === true;
                                    return `<span class="area-tag ${isActive ? 'active' : ''}" title="${isActive ? 'Active' : 'Inactive'} area">
                                        Area ${areaKey}
                                    </span>`;
                                }).join('')}
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function getServiceIcon(serviceName) {
    const name = serviceName.toLowerCase();
    
    if (name.includes('health')) return '🏥';
    if (name.includes('web') || name.includes('http')) return '🌐';
    if (name.includes('plugin')) return '🔌';
    if (name.includes('database') || name.includes('db')) return '🗄️';
    if (name.includes('auth') || name.includes('security')) return '🔐';
    if (name.includes('api')) return '🔗';
    if (name.includes('log') || name.includes('monitor')) return '📋';
    if (name.includes('cache')) return '💾';
    if (name.includes('queue') || name.includes('message')) return '📬';
    if (name.includes('file') || name.includes('storage')) return '📁';
    if (name.includes('network') || name.includes('net')) return '🌍';
    if (name.includes('config') || name.includes('setting')) return '⚙️';
    
    // Default service icon
    return '⚡';
}

function populateServiceStats(process, originalHealthData) {
    const serviceStatsContent = document.getElementById('serviceStatsContent');
    
    serviceStatsContent.innerHTML = `
        <div class="service-metrics-grid">
            <div class="service-metric-card">
                <div class="service-metric-label">Memory Usage</div>
                <div class="service-metric-value memory">${formatMemory(process.memoryUsage)}</div>
            </div>
            <div class="service-metric-card">
                <div class="service-metric-label">CPU Usage</div>
                <div class="service-metric-value cpu">${process.cpuUsage.toFixed(2)}%</div>
            </div>
            <div class="service-metric-card">
                <div class="service-metric-label">RX Messages</div>
                <div class="service-metric-value count">${process.rxCount.toLocaleString()}</div>
            </div>
            <div class="service-metric-card">
                <div class="service-metric-label">TX Messages</div>
                <div class="service-metric-value count">${process.txCount.toLocaleString()}</div>
            </div>
            <div class="service-metric-card">
                <div class="service-metric-label">RX Data</div>
                <div class="service-metric-value memory">${formatMemory(process.rxDataCount)}</div>
            </div>
            <div class="service-metric-card">
                <div class="service-metric-label">TX Data</div>
                <div class="service-metric-value memory">${formatMemory(process.txDataCount)}</div>
            </div>
            <div class="service-metric-card">
                <div class="service-metric-label">Uptime</div>
                <div class="service-metric-value time">${process.upTime}</div>
            </div>
            <div class="service-metric-card">
                <div class="service-metric-label">Last Pulse</div>
                <div class="service-metric-value time">${process.lastPulse}</div>
            </div>
        </div>
    `;
}

function getStatusIndicatorHtml(status) {
    const statusClass = getStatusClass(status);
    const statusText = status === 'R' ? 'Running' : status === 'T' ? 'Stopped' : 'Sleeping';
    
    return `<span class="service-status-indicator status-${statusClass}">
        <span class="status-indicator">${status === 'R' ? '🟢' : status === 'T' ? '🔴' : '🟡'}</span>
        ${statusText}
    </span>`;
}

function closeServiceHealthModal() {
    document.getElementById('serviceHealthModal').style.display = 'none';
}

// Close modal when clicking outside of it
window.addEventListener('click', function(event) {
    const modal = document.getElementById('serviceHealthModal');
    if (event.target === modal) {
        closeServiceHealthModal();
    }
});

// Export functions for global access
window.showServiceHealthDetails = showServiceHealthDetails;
window.closeServiceHealthModal = closeServiceHealthModal;
