// Health Monitor Application

// Data stores
let healthTable = null;
let healthDataMap = new Map();

// Current filters for server-side filtering
let currentFilters = {};

// Column definitions with filterKey for server-side filtering
const columns = [
    { key: 'service', label: 'Service', filterKey: 'alias' },
    { key: 'rx', label: 'RX', filterKey: 'stats.rxMsgCount' },
    { key: 'rxData', label: 'RX Data', sortKey: 'rxDataRaw', filterKey: 'stats.rxDataCont' },
    { key: 'tx', label: 'TX', filterKey: 'stats.txMsgCount' },
    { key: 'txData', label: 'TX Data', sortKey: 'txDataRaw', filterKey: 'stats.txDataCount' },
    { key: 'memory', label: 'Memory', sortKey: 'memoryRaw', filterKey: 'stats.memoryUsage' },
    { key: 'cpuPercent', label: 'CPU %', sortKey: 'cpuPercentRaw', filterKey: 'stats.cpuUsage' },
    { key: 'upTime', label: 'Up Time', filterKey: 'startTime' },
    { key: 'lastPulse', label: 'Last Pulse', filterKey: 'stats.lastMsgTime' }
];

// Build query with filter conditions
function buildFilteredQuery(page, filters) {
    let whereClause = 'Id=*';
    const invalidFilters = [];

    for (const [columnKey, filterValue] of Object.entries(filters)) {
        if (!filterValue) continue;

        const column = columns.find(c => c.key === columnKey);
        if (!column || !column.filterKey) continue;

        // No enums in Health - use text with wildcard
        whereClause += ` and ${column.filterKey}=${filterValue}*`;
    }

    return {
        query: `select * from L8Health where ${whereClause} limit 15 page ${page}`,
        invalidFilters: invalidFilters
    };
}

// Authentication token (from localStorage or parent window)
let bearerToken = localStorage.getItem('bearerToken') || null;

// Get authorization headers for API calls
function getAuthHeaders() {
    const headers = {
        'Content-Type': 'application/json'
    };
    if (bearerToken) {
        headers['Authorization'] = `Bearer ${bearerToken}`;
    }
    return headers;
}

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    // Load configuration first
    await loadConfig();

    // Check for token from parent window (if embedded)
    if (window.parent !== window && window.parent.bearerToken) {
        bearerToken = window.parent.bearerToken;
    }

    // Initialize health data
    await initializeHealth();
});

// Initialize health table with server-side filtering
async function initializeHealth() {
    try {
        currentFilters = {};
        const { tableData, totalCount } = await fetchHealthData(1);
        renderHealthTable(tableData, totalCount);
    } catch (error) {
        console.error('Error initializing health:', error);
        displayErrorMessage('Failed to load health data. Please try again later.');
    }
}

// Get API endpoint URL
function getHealthEndpoint() {
    return HEALTH_CONFIG.apiPrefix + HEALTH_CONFIG.healthPath;
}

// Fetch health data for a specific page
async function fetchHealthData(page) {
    const serverPage = (page || 1) - 1;
    const { query } = buildFilteredQuery(serverPage, currentFilters);
    return await fetchHealthDataWithQuery(query, serverPage);
}

// Fetch health data with a custom query
async function fetchHealthDataWithQuery(queryText, serverPage) {
    try {
        const bodyParam = JSON.stringify({ text: queryText });
        const url = `${getHealthEndpoint()}?body=${encodeURIComponent(bodyParam)}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return processHealthDataForTable(data, serverPage);
    } catch (error) {
        console.error('Error fetching health data:', error);
        throw error;
    }
}

// Process health data and return table data
function processHealthDataForTable(data, serverPage) {
    if (!data || !data.list) {
        return { tableData: [], totalCount: 0 };
    }

    // Clear and rebuild the map
    healthDataMap.clear();

    const tableData = data.list
        .filter(item => item.stats)
        .map(item => {
            const serviceName = item.alias || 'Unknown';
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

    // Get total count from metadata
    let totalCount = tableData.length;
    if (serverPage === 0 && data.metadata?.keyCount?.counts) {
        totalCount = data.metadata.keyCount.counts.Total || tableData.length;
    }

    return { tableData, totalCount };
}

// Render health table
function renderHealthTable(data, totalCount) {
    healthTable = new ProblerTable('health-table-container', {
        columns: columns,
        data: data,
        rowsPerPage: 15,
        sortable: true,
        filterable: true,
        statusColumn: null,
        serverSide: true,
        totalCount: totalCount,
        onPageChange: async (page) => {
            const { tableData, totalCount } = await fetchHealthData(page);
            healthTable.updateServerData(tableData, totalCount);
        },
        onFilterChange: async (filters, page) => {
            currentFilters = filters;
            const serverPage = page - 1;
            const { query, invalidFilters } = buildFilteredQuery(serverPage, filters);

            const { tableData, totalCount } = await fetchHealthDataWithQuery(query, serverPage);
            healthTable.updateServerData(tableData, totalCount);

            // Show visual feedback for invalid filters (after render)
            healthTable.setInvalidFilters(invalidFilters);
        },
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
    const container = document.getElementById('health-table-container');
    if (container) {
        container.innerHTML = `
            <div class="error-message">
                <div class="error-icon">!</div>
                <div class="error-text">${message}</div>
            </div>
        `;
    }
}

// Generate health detail content HTML
function generateHealthDetailContent(rowData) {
    const rawData = healthDataMap.get(rowData.service);

    if (!rawData) {
        return '<div class="empty-state">No health data available.</div>';
    }

    const stats = rawData.stats || {};
    const services = rawData.services || {};
    const serviceToAreas = services.serviceToAreas || {};

    return `
        <!-- Tabs -->
        <div class="probler-popup-tabs">
            <div class="probler-popup-tab active" data-tab="overview">Overview</div>
            <div class="probler-popup-tab" data-tab="network">Network</div>
            <div class="probler-popup-tab" data-tab="resources">Resources</div>
            <div class="probler-popup-tab" data-tab="services">Services</div>
        </div>

        <div class="probler-popup-tab-content">
            <!-- Overview Tab -->
            <div class="probler-popup-tab-pane active" data-pane="overview">
                <div class="detail-grid">
                    <div class="detail-section">
                        <div class="detail-section-title">Service Information</div>
                        <div class="detail-row">
                            <span class="detail-label">Service Name</span>
                            <span class="detail-value">${escapeHtml(rowData.service)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Alias</span>
                            <span class="detail-value">${escapeHtml(rawData.alias || 'N/A')}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Start Time</span>
                            <span class="detail-value">${rawData.startTime ? new Date(parseInt(rawData.startTime)).toLocaleString() : 'N/A'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Up Time</span>
                            <span class="detail-value">${escapeHtml(rowData.upTime)}</span>
                        </div>
                    </div>
                    <div class="detail-section">
                        <div class="detail-section-title">Quick Stats</div>
                        <div class="detail-row">
                            <span class="detail-label">Memory Usage</span>
                            <span class="detail-value">${escapeHtml(rowData.memory)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">CPU Usage</span>
                            <span class="detail-value">${escapeHtml(rowData.cpuPercent)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Last Pulse</span>
                            <span class="detail-value">${escapeHtml(rowData.lastPulse)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Network Tab -->
            <div class="probler-popup-tab-pane" data-pane="network">
                <div class="detail-grid">
                    <div class="detail-section">
                        <div class="detail-section-title">Receive Statistics</div>
                        <div class="detail-row">
                            <span class="detail-label">RX Messages</span>
                            <span class="detail-value">${rowData.rx.toLocaleString()}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">RX Data</span>
                            <span class="detail-value">${escapeHtml(rowData.rxData)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">RX Data (bytes)</span>
                            <span class="detail-value">${(stats.rxDataCont || 0).toLocaleString()}</span>
                        </div>
                    </div>
                    <div class="detail-section">
                        <div class="detail-section-title">Transmit Statistics</div>
                        <div class="detail-row">
                            <span class="detail-label">TX Messages</span>
                            <span class="detail-value">${rowData.tx.toLocaleString()}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">TX Data</span>
                            <span class="detail-value">${escapeHtml(rowData.txData)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">TX Data (bytes)</span>
                            <span class="detail-value">${(stats.txDataCount || 0).toLocaleString()}</span>
                        </div>
                    </div>
                    <div class="detail-section detail-full-width">
                        <div class="detail-section-title">Message Timing</div>
                        <div class="detail-row">
                            <span class="detail-label">Last Message</span>
                            <span class="detail-value">${stats.lastMsgTime ? new Date(parseInt(stats.lastMsgTime)).toLocaleString() : 'N/A'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Time Since Last Msg</span>
                            <span class="detail-value">${escapeHtml(rowData.lastPulse)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Resources Tab -->
            <div class="probler-popup-tab-pane" data-pane="resources">
                <div class="detail-grid">
                    <div class="detail-section">
                        <div class="detail-section-title">Memory Usage</div>
                        <div class="detail-row">
                            <span class="detail-label">Formatted</span>
                            <span class="detail-value">${escapeHtml(rowData.memory)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Raw (bytes)</span>
                            <span class="detail-value">${(stats.memoryUsage || 0).toLocaleString()}</span>
                        </div>
                    </div>
                    <div class="detail-section">
                        <div class="detail-section-title">CPU Usage</div>
                        <div class="detail-row">
                            <span class="detail-label">Percentage</span>
                            <span class="detail-value">${escapeHtml(rowData.cpuPercent)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Raw Value</span>
                            <span class="detail-value">${stats.cpuUsage || 0}</span>
                        </div>
                    </div>
                    <div class="detail-section detail-full-width">
                        <div class="detail-section-title">Additional Details</div>
                        <div class="detail-row">
                            <span class="detail-label">Data Object</span>
                            <span class="detail-value">${escapeHtml(rawData.data || 'N/A')}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Services Tab -->
            <div class="probler-popup-tab-pane" data-pane="services">
                <div class="detail-grid">
                    <div class="detail-section detail-full-width">
                        <div class="detail-section-title">Registered Services</div>
                        ${Object.keys(serviceToAreas).length > 0 ?
                            Object.entries(serviceToAreas).map(([serviceName, serviceData]) => {
                                const areas = serviceData.areas || {};
                                const areasList = Object.keys(areas).filter(area => areas[area]).join(', ');
                                return `
                                    <div class="detail-row">
                                        <span class="detail-label">${escapeHtml(serviceName)}</span>
                                        <span class="detail-value">Areas: ${escapeHtml(areasList) || 'None'}</span>
                                    </div>
                                `;
                            }).join('')
                            : '<div class="detail-row"><span class="detail-label">No services available</span></div>'
                        }
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Show health detail modal using generic popup
function showHealthDetailsModal(rowData) {
    const rawData = healthDataMap.get(rowData.service);
    if (!rawData) {
        return;
    }

    const contentHtml = generateHealthDetailContent(rowData);

    if (window.parent !== window) {
        window.parent.postMessage({
            type: 'probler-popup-show',
            config: {
                id: 'health-detail-modal',
                title: 'Service Health - ' + rowData.service,
                size: 'xlarge',
                content: contentHtml,
                showFooter: false,
                noPadding: true,
                iframeId: 'health-iframe'
            }
        }, '*');
    }
}

// Toast notification system
function showToast(message, type, duration) {
    if (type === undefined) type = 'error';
    if (duration === undefined) duration = 5000;

    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = {
        error: '!',
        success: '\u2713',
        warning: '\u26A0'
    };

    const titles = {
        error: 'Error',
        success: 'Success',
        warning: 'Warning'
    };

    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || icons.error}</div>
        <div class="toast-content">
            <div class="toast-title">${titles[type] || titles.error}</div>
            <div class="toast-message">${escapeHtml(message)}</div>
        </div>
        <button class="toast-close" onclick="dismissToast(this.parentElement)">&times;</button>
    `;

    container.appendChild(toast);

    if (duration > 0) {
        setTimeout(function() { dismissToast(toast); }, duration);
    }

    return toast;
}

function dismissToast(toast) {
    if (!toast || toast.classList.contains('removing')) return;
    toast.classList.add('removing');
    setTimeout(function() { toast.remove(); }, 300);
}

// Utility function to escape HTML
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

// Refresh data (can be called from parent)
async function refreshData() {
    if (!HEALTH_CONFIG) {
        await loadConfig();
    }
    await initializeHealth();
}

// Export for use by parent window
if (typeof window !== 'undefined') {
    window.HealthApp = {
        refreshData: refreshData,
        getHealthData: function() { return healthDataMap; }
    };
}
