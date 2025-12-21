// Network Devices App - Standalone Module

// Authentication token
let bearerToken = localStorage.getItem('bearerToken') || null;

// Global table instance
let networkDevicesTable = null;

// Cache for total count
let cachedTotalCount = 0;

// Current filters for server-side filtering
let currentFilters = {};

// Reverse enum mappings: display value → backend enum value
const deviceStatusEnum = {
    'online': 1,
    'offline': 2,
    'warning': 3,
    'critical': 4,
    'maintenance': 5,
    'partial': 6,
    'unknown': 0
};

const deviceTypeEnum = {
    'router': 1,
    'switch': 2,
    'firewall': 3,
    'server': 4,
    'access point': 5,
    'unknown': 0
};

// Find matching enum value from user input (case-insensitive partial match)
function matchEnumValue(input, enumValues) {
    const normalizedInput = input.toLowerCase().trim();
    if (!normalizedInput) return null;

    // Try exact match first
    if (enumValues[normalizedInput] !== undefined) {
        return enumValues[normalizedInput];
    }

    // Try partial match (input is prefix of enum key)
    for (const [key, value] of Object.entries(enumValues)) {
        if (key.startsWith(normalizedInput)) {
            return value;
        }
    }

    return null; // No match found
}

// Column definitions with filterKey for server-side filtering
const columns = [
    { key: 'name', label: 'Device Name', filterKey: 'equipmentinfo.sysName' },
    { key: 'ipAddress', label: 'IP Address', filterKey: 'equipmentinfo.ipAddress' },
    { key: 'deviceType', label: 'Type', filterKey: 'equipmentinfo.deviceType', enumValues: deviceTypeEnum },
    { key: 'location', label: 'Location', filterKey: 'equipmentinfo.location' },
    { key: 'status', label: 'Status', filterKey: 'equipmentinfo.deviceStatus', enumValues: deviceStatusEnum },
    { key: 'cpuUsage', label: 'CPU %', formatter: (value) => `${value}%` },
    { key: 'memoryUsage', label: 'Memory %', formatter: (value) => `${value}%` },
    { key: 'uptime', label: 'Uptime', filterKey: 'equipmentinfo.uptime' }
];

// Build query with filter conditions
function buildFilteredQuery(page, filters) {
    let whereClause = 'Id=*';
    const invalidFilters = [];  // Track columns with invalid enum values

    for (const [columnKey, filterValue] of Object.entries(filters)) {
        if (!filterValue) continue;

        const column = columns.find(c => c.key === columnKey);
        if (!column || !column.filterKey) continue;

        let queryValue;
        if (column.enumValues) {
            // Enum column: validate and convert to enum value
            const enumValue = matchEnumValue(filterValue, column.enumValues);
            if (enumValue === null) {
                // No match - mark as invalid, skip this filter
                invalidFilters.push(columnKey);
                continue;
            }
            queryValue = enumValue;  // Use numeric enum value
        } else {
            // Non-enum column: use text with wildcard
            queryValue = `${filterValue}*`;
        }

        whereClause += ` and ${column.filterKey}=${queryValue}`;
    }

    return {
        query: `select * from NetworkDevice where ${whereClause} limit 15 page ${page}`,
        invalidFilters: invalidFilters
    };
}

// Set bearer token
function setBearerToken(token) {
    bearerToken = token;
    if (token) {
        localStorage.setItem('bearerToken', token);
    } else {
        localStorage.removeItem('bearerToken');
    }
}

// Get auth headers
function getAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (bearerToken) {
        headers['Authorization'] = `Bearer ${bearerToken}`;
    }
    return headers;
}

// Get API error message
async function getApiErrorMessage(response, defaultMessage) {
    if (response.status === 400 || response.status === 401) {
        try {
            const text = await response.text();
            if (text) return text;
        } catch (e) {
            console.error('Error reading response body:', e);
        }
    }
    return defaultMessage;
}

// Map device status from JSON format to UI format
// Proto enum: UNKNOWN=0, ONLINE=1, OFFLINE=2, WARNING=3, CRITICAL=4, MAINTENANCE=5, PARTIAL=6
function mapDeviceStatus(status) {
    if (status === 1 || status === 'DEVICE_STATUS_ONLINE') return 'online';
    if (status === 2 || status === 'DEVICE_STATUS_OFFLINE') return 'offline';
    if (status === 3 || status === 'DEVICE_STATUS_WARNING') return 'warning';
    if (status === 4 || status === 'DEVICE_STATUS_CRITICAL') return 'critical';
    if (status === 5 || status === 'DEVICE_STATUS_MAINTENANCE') return 'maintenance';
    if (status === 6 || status === 'DEVICE_STATUS_PARTIAL') return 'partial';
    if (status === 0 || status === 'DEVICE_STATUS_UNKNOWN') return 'unknown';
    return 'unknown';
}

// Map device type from JSON format to UI format
function mapDeviceType(type) {
    if (type === 1 || type === 'DEVICE_TYPE_ROUTER') return 'Router';
    if (type === 2 || type === 'DEVICE_TYPE_SWITCH') return 'Switch';
    if (type === 3 || type === 'DEVICE_TYPE_FIREWALL') return 'Firewall';
    if (type === 4 || type === 'DEVICE_TYPE_SERVER') return 'Server';
    if (type === 5 || type === 'DEVICE_TYPE_ACCESS_POINT') return 'Access Point';
    if (type === 6) return 'Server';
    return 'Unknown';
}

// Convert uptime in centiseconds to readable format
function formatUptime(centiseconds) {
    if (!centiseconds || centiseconds === 0) return '0m';
    const seconds = Math.floor(centiseconds / 100);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
}

// Calculate CPU and memory usage (generate random for demo)
function getRandomUsage() {
    return Math.floor(Math.random() * 100);
}

// Calculate temperature (generate random for demo)
function getRandomTemperature() {
    return Math.floor(Math.random() * 40) + 25;
}

// Transform JSON device data to table format
function transformDeviceData(device) {
    const equipment = device.equipmentinfo || {};
    const physicals = device.physicals || {};

    return {
        id: device.id,
        name: equipment.sysName || device.id,
        sysName: equipment.sysName || '',
        ipAddress: equipment.ipAddress || device.id,
        deviceType: mapDeviceType(equipment.deviceType),
        location: equipment.location || '',
        status: mapDeviceStatus(equipment.deviceStatus),
        cpuUsage: getRandomUsage(),
        memoryUsage: getRandomUsage(),
        uptime: formatUptime(equipment.uptime),
        model: equipment.model || equipment.hardware || '',
        vendor: equipment.vendor || '',
        series: equipment.series || '',
        family: equipment.family || '',
        software: equipment.software || '',
        serialNumber: equipment.serialNumber || '',
        firmware: equipment.version || '',
        hardware: equipment.hardware || '',
        sysOid: equipment.sysOid || '',
        interfaces: physicals['physical-0'] ? (physicals['physical-0'].ports || []).length : 0,
        temperature: getRandomTemperature(),
        lastSeen: new Date().toISOString().replace('T', ' ').substring(0, 19),
        physicals: physicals
    };
}

// Get devices endpoint
function getDevicesEndpoint() {
    return NETWORK_DEVICES_CONFIG.apiPrefix + NETWORK_DEVICES_CONFIG.devicesPath;
}

// Fetch devices for a specific page
async function fetchNetworkDevices(page) {
    const serverPage = page - 1;
    const { query } = buildFilteredQuery(serverPage, currentFilters);
    return await fetchNetworkDevicesWithQuery(query, serverPage);
}

// Fetch devices with a custom query
async function fetchNetworkDevicesWithQuery(queryText, serverPage) {
    const container = document.getElementById('network-devices-table');

    try {
        const query = JSON.stringify({ text: queryText });

        const response = await fetch(getDevicesEndpoint() + '?body=' + encodeURIComponent(query), {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const errorMsg = await getApiErrorMessage(response, 'Failed to fetch devices');
            throw new Error(errorMsg);
        }

        const data = await response.json();

        // Transform the device list
        const networkDevicesData = (data.list || []).map(device => transformDeviceData(device));

        // Get counts from metadata
        let totalDevices = cachedTotalCount;

        if (serverPage === 0 && data.metadata?.keyCount?.counts) {
            totalDevices = data.metadata.keyCount.counts.Total || 0;
            const onlineDevices = data.metadata.keyCount.counts.Online || 0;
            cachedTotalCount = totalDevices;

            // Update parent hero subtitle if accessible
            try {
                const parentHeroSubtitle = window.parent.document.querySelector('.network-hero .hero-subtitle');
                if (parentHeroSubtitle) {
                    const uptime = totalDevices > 0 ? ((onlineDevices / totalDevices) * 100).toFixed(2) : 0;
                    parentHeroSubtitle.textContent = `Real-time monitoring • ${onlineDevices} Active Devices • ${uptime}% Uptime`;
                }
            } catch (e) {
                // Cross-origin restriction, ignore
            }
        }

        return { devices: networkDevicesData, totalCount: totalDevices };
    } catch (error) {
        console.error('Error fetching network devices:', error);
        if (container) {
            container.innerHTML = '<div style="padding: 20px; color: #718096; text-align: center;">Failed to load network devices data</div>';
        }
        throw error;
    }
}

// Initialize Network Devices
async function initializeNetworkDevices() {
    try {
        // Reset filters on initialization
        currentFilters = {};

        const { devices, totalCount } = await fetchNetworkDevices(1);

        networkDevicesTable = new ProblerTable('network-devices-table', {
            columns: columns,
            data: devices,
            rowsPerPage: 15,
            sortable: true,
            filterable: true,
            statusColumn: 'status',
            serverSide: true,
            totalCount: totalCount,
            onPageChange: async (page) => {
                const { devices, totalCount } = await fetchNetworkDevices(page);
                networkDevicesTable.updateServerData(devices, totalCount);
            },
            onFilterChange: async (filters, page) => {
                currentFilters = filters;
                const serverPage = page - 1;
                const { query, invalidFilters } = buildFilteredQuery(serverPage, filters);

                const { devices, totalCount } = await fetchNetworkDevicesWithQuery(query, serverPage);
                networkDevicesTable.updateServerData(devices, totalCount);

                // Show visual feedback for invalid enum filters (must be AFTER updateServerData which calls render())
                networkDevicesTable.setInvalidFilters(invalidFilters);
            },
            onRowClick: (rowData) => {
                showDeviceDetailModal(rowData);
            }
        });
    } catch (error) {
        console.error('Error initializing network devices:', error);
        const container = document.getElementById('network-devices-table');
        if (container) {
            container.innerHTML = '<div style="padding: 20px; color: #718096; text-align: center;">Failed to load network devices data</div>';
        }
    }
}

// Toast notifications
function showToast(message, type, duration) {
    if (type === undefined) type = 'error';
    if (duration === undefined) duration = 5000;

    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = { error: '!', success: '\u2713', warning: '\u26A0' };
    const titles = { error: 'Error', success: 'Success', warning: 'Warning' };

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

// Escape HTML
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', async () => {
    await loadConfig();

    // Get bearer token from parent if available
    if (window.parent !== window && window.parent.bearerToken) {
        bearerToken = window.parent.bearerToken;
    }

    if (bearerToken) {
        await initializeNetworkDevices();
    } else {
        const container = document.getElementById('network-devices-table');
        if (container) {
            container.innerHTML = '<div style="padding: 20px; color: #718096; text-align: center;">Authentication required</div>';
        }
    }
});

// Export app interface
if (typeof window !== 'undefined') {
    window.NetworkDevicesApp = {
        setBearerToken: setBearerToken,
        refresh: initializeNetworkDevices
    };
}
