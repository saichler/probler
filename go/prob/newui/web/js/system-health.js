// System Health Management Module
// Fetches and displays service health data

let healthTable = null;
let healthDataMap = new Map(); // Store raw health data for modal details

// Initialize Health section
function initializeHealth() {
    setupSystemTabSwitching();
    fetchHealthData();
}

// Set up system tab switching
function setupSystemTabSwitching() {
    const systemTabs = document.querySelectorAll('.resource-tab[data-tab]');
    systemTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');

            // Update active tab button
            systemTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update active tab content
            const tabContents = document.querySelectorAll('.resource-content[data-tab-content]');
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.getAttribute('data-tab-content') === tabName) {
                    content.classList.add('active');
                }
            });

            // Load data for health tab if selected
            if (tabName === 'health' && !healthTable) {
                fetchHealthData();
            }

            // Lazy-load users iframe and init data when tab is selected
            if (tabName === 'users') {
                if (typeof initUsersRolesData === 'function') initUsersRolesData();
                const usersIframe = document.getElementById('users-iframe');
                if (usersIframe && !usersIframe.getAttribute('src')) {
                    usersIframe.src = 'users/index.html?tab=users';
                }
            }

            // Lazy-load roles iframe and init data when tab is selected
            if (tabName === 'roles') {
                if (typeof initUsersRolesData === 'function') initUsersRolesData();
                const rolesIframe = document.getElementById('roles-iframe');
                if (rolesIframe && !rolesIframe.getAttribute('src')) {
                    rolesIframe.src = 'users/index.html?tab=roles';
                }
            }
        });
    });
}

// Fetch health data from the server
async function fetchHealthData() {
    try {
        const bodyParam = JSON.stringify({ text: 'select * from L8Health' });
        const url = `/probler/0/Health?body=${encodeURIComponent(bodyParam)}`;

        const response = await makeAuthenticatedRequest(url, {
            method: 'GET'
        });

        if (!response || !response.ok) {
            throw new Error(`HTTP error! status: ${response ? response.status : 'unknown'}`);
        }

        const data = await response.json();
        processHealthData(data);
    } catch (error) {
        console.error('Error fetching health data:', error);
        displayErrorMessage('Failed to load health data. Please try again later.');
    }
}

// Process and display health data
function processHealthData(data) {
    if (!data || !data.list) {
        displayErrorMessage('No health data available.');
        return;
    }

    // Clear the map and store raw data
    healthDataMap.clear();

    // Transform data for table display
    const tableData = data.list
        .filter(item => item.stats) // Only include items with stats
        .map(item => {
            const serviceName = item.alias || 'Unknown';
            // Store the raw item for later use in modal
            healthDataMap.set(serviceName, item);

            return {
                service: serviceName,
                rx: item.stats.rxMsgCount || 0,
                rxData: formatBytes(item.stats.rxDataCont || 0),
                rxDataRaw: item.stats.rxDataCont || 0,
                tx: item.stats.txMsgCount || 0,
                txData: formatBytes(item.stats.txDataCount || 0),
                txDataRaw: item.stats.txDataCount || 0,
                memory: formatBytes(item.stats.memoryUsage || 0),
                memoryRaw: item.stats.memoryUsage || 0,
                cpuPercent: formatCPU(item.stats.cpuUsage || 0),
                cpuPercentRaw: item.stats.cpuUsage || 0,
                upTime: formatUptime(item.startTime),
                lastPulse: formatLastPulse(item.stats.lastMsgTime)
            };
        });

    renderHealthTable(tableData);
}

// Render health table
function renderHealthTable(data) {
    const columns = [
        { key: 'service', label: 'Service' },
        { key: 'rx', label: 'RX' },
        { key: 'rxData', label: 'RX Data', sortKey: 'rxDataRaw' },
        { key: 'tx', label: 'TX' },
        { key: 'txData', label: 'TX Data', sortKey: 'txDataRaw' },
        { key: 'memory', label: 'Memory', sortKey: 'memoryRaw' },
        { key: 'cpuPercent', label: 'CPU %', sortKey: 'cpuPercentRaw' },
        { key: 'upTime', label: 'Up Time' },
        { key: 'lastPulse', label: 'Last Pulse' }
    ];

    healthTable = new ProblerTable('health-table', {
        columns: columns,
        data: data,
        rowsPerPage: 15,
        sortable: true,
        filterable: true,
        statusColumn: null,
        onRowClick: (rowData) => {
            showHealthDetailsModal(rowData);
        }
    });
}

// Helper function to format bytes to human-readable format
function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';

    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));

    if (i === 0) return bytes + ' B';

    return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
}

// Helper function to format CPU percentage
function formatCPU(cpu) {
    if (!cpu || cpu === 0) return '0.00%';
    return cpu.toFixed(2) + '%';
}

// Helper function to format uptime
function formatUptime(startTime) {
    if (!startTime || startTime === 0 || startTime === '0') return '00:00:00';

    const startMs = typeof startTime === 'string' ? parseInt(startTime, 10) : startTime;
    const nowMs = Date.now();
    const uptimeSeconds = Math.floor((nowMs - startMs) / 1000);

    if (uptimeSeconds < 0) return '00:00:00';

    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Helper function to format last pulse
function formatLastPulse(lastMsgTime) {
    if (!lastMsgTime || lastMsgTime === 0 || lastMsgTime === '0') return '00:00:00';

    const lastMsgMs = typeof lastMsgTime === 'string' ? parseInt(lastMsgTime, 10) : lastMsgTime;
    const nowMs = Date.now();
    const timeSinceSeconds = Math.floor((nowMs - lastMsgMs) / 1000);

    if (timeSinceSeconds < 0) return '00:00:00';

    const hours = Math.floor(timeSinceSeconds / 3600);
    const minutes = Math.floor((timeSinceSeconds % 3600) / 60);
    const seconds = timeSinceSeconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Display error message
function displayErrorMessage(message) {
    const container = document.getElementById('health-table');
    if (container) {
        container.innerHTML = `
            <div class="error-message">
                <div class="error-icon">⚠️</div>
                <div class="error-text">${message}</div>
            </div>
        `;
    }
}

// Show health detail modal
function showHealthDetailsModal(rowData) {
    const modal = document.getElementById('health-detail-modal');
    const content = document.getElementById('health-detail-content');
    const modalTitle = modal.querySelector('.modal-title');

    // Get the raw data for this service
    const rawData = healthDataMap.get(rowData.service);

    if (!rawData) {
        return;
    }

    const stats = rawData.stats || {};
    const services = rawData.services || {};
    const serviceToAreas = services.serviceToAreas || {};

    // Update modal title
    modalTitle.innerHTML = `
        <span>Service Health - ${rowData.service}</span>
    `;

    content.innerHTML = `
        <div class="modal-tab-content active">
            <div class="device-detail-grid">
                <!-- Service Information -->
                <div class="detail-section">
                    <div class="detail-section-title">Service Information</div>
                    <div class="detail-row">
                        <span class="detail-label">Service Name</span>
                        <span class="detail-value">${rowData.service}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Alias</span>
                        <span class="detail-value">${rawData.alias || 'N/A'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Start Time</span>
                        <span class="detail-value">${rawData.startTime ? new Date(parseInt(rawData.startTime)).toLocaleString() : 'N/A'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Up Time</span>
                        <span class="detail-value">${rowData.upTime}</span>
                    </div>
                </div>

                <!-- Network Statistics -->
                <div class="detail-section">
                    <div class="detail-section-title">Network Statistics</div>
                    <div class="detail-row">
                        <span class="detail-label">RX Messages</span>
                        <span class="detail-value">${rowData.rx.toLocaleString()}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">RX Data</span>
                        <span class="detail-value">${rowData.rxData}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">TX Messages</span>
                        <span class="detail-value">${rowData.tx.toLocaleString()}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">TX Data</span>
                        <span class="detail-value">${rowData.txData}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Last Message</span>
                        <span class="detail-value">${stats.lastMsgTime ? new Date(parseInt(stats.lastMsgTime)).toLocaleString() : 'N/A'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Time Since Last Msg</span>
                        <span class="detail-value">${rowData.lastPulse}</span>
                    </div>
                </div>

                <!-- Resource Usage -->
                <div class="detail-section">
                    <div class="detail-section-title">Resource Usage</div>
                    <div class="detail-row">
                        <span class="detail-label">Memory Usage</span>
                        <span class="detail-value">${rowData.memory}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">CPU Usage</span>
                        <span class="detail-value">${rowData.cpuPercent}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Raw Memory (bytes)</span>
                        <span class="detail-value">${(stats.memoryUsage || 0).toLocaleString()}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Raw CPU Value</span>
                        <span class="detail-value">${stats.cpuUsage || 0}</span>
                    </div>
                </div>

                <!-- Additional Details -->
                <div class="detail-section">
                    <div class="detail-section-title">Additional Details</div>
                    <div class="detail-row">
                        <span class="detail-label">RX Data Count</span>
                        <span class="detail-value">${(stats.rxDataCont || 0).toLocaleString()} bytes</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">TX Data Count</span>
                        <span class="detail-value">${(stats.txDataCount || 0).toLocaleString()} bytes</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Data Object</span>
                        <span class="detail-value">${rawData.data || 'N/A'}</span>
                    </div>
                </div>

                <!-- Services -->
                <div class="detail-section detail-full-width">
                    <div class="detail-section-title">Services</div>
                    ${Object.keys(serviceToAreas).length > 0 ?
                        Object.entries(serviceToAreas).map(([serviceName, serviceData]) => {
                            const areas = serviceData.areas || {};
                            const areasList = Object.keys(areas).filter(area => areas[area]).join(', ');
                            return `
                                <div class="detail-row">
                                    <span class="detail-label">${serviceName}</span>
                                    <span class="detail-value">Areas: ${areasList || 'None'}</span>
                                </div>
                            `;
                        }).join('')
                        : '<div class="detail-row"><span class="detail-label">No services available</span></div>'
                    }
                </div>
            </div>
        </div>
    `;

    // Close modal on overlay click
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeHealthDetailModal();
        }
    };

    // Close modal on Escape key
    document.addEventListener('keydown', handleHealthEscapeKey);

    // Show modal
    modal.classList.add('active');
}

// Close health detail modal
function closeHealthDetailModal() {
    const modal = document.getElementById('health-detail-modal');
    modal.classList.remove('active');
    document.removeEventListener('keydown', handleHealthEscapeKey);
}

// Handle Escape key to close modal
function handleHealthEscapeKey(e) {
    if (e.key === 'Escape') {
        closeHealthDetailModal();
    }
}

// Export functions for external use
window.initializeHealth = initializeHealth;
window.showHealthDetailsModal = showHealthDetailsModal;
window.closeHealthDetailModal = closeHealthDetailModal;
