// System Services Management - Professional top equivalent web GUI
// Fetches data from /0/Health endpoint and displays in FormatTop equivalent format

let servicesRefreshInterval = null;
let currentProcesses = [];
let currentSortColumn = null;
let currentSortOrder = "desc";
let isAutoRefreshEnabled = true;
const REFRESH_INTERVAL = 15000; // 15 seconds


// Initialize services when app loads
function initializeServices() {
    console.log('Initializing System Services...');
    refreshServices();
    startAutoRefresh();
}

// Main function to refresh services data
async function refreshServices() {
    console.log("refreshServices called");
    // Use global notification if available
    if (typeof window.showNotification === "function") {
        window.showNotification("🔄 Refreshing system services...", "info");
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
        showError(`Failed to load services: ${error.message}`);
    }
}

// Process the Top data and render the table
function processServicesData(topData) {
    console.log('Received top data:', topData); // Debug log
    
    if (!topData || !topData.healths) {
        showError('No health data received from server');
        return;
    }
    
    // Convert health data to process info similar to FormatTop
    const processes = [];
    
    for (const [key, health] of Object.entries(topData.healths)) {
        const process = {
            command: health.alias || key || 'unknown',
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
    bodyElement.innerHTML = processes.map(process => `
        <tr>
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

// Initialize services when the app is opened
// This will be called from app-management.js when the services app is activated
function initServicesApp() {
    console.log("initServicesApp called");
    if (typeof window.showNotification === "function") {
        window.showNotification("⚙️ System Services initialized", "info");
    }
    initializeServices();
}

// Cleanup when switching away from services app
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
    console.log('Manual services test');
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
