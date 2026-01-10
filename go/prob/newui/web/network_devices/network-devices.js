// Network Devices App - Standalone Module

// Authentication token
let bearerToken = localStorage.getItem('bearerToken') || null;

// Global table instance
let networkDevicesTable = null;

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

// Column definitions with filterKey for server-side filtering and sortKey for server-side sorting
const columns = [
    { key: 'name', label: 'Device Name', filterKey: 'equipmentinfo.sysName', sortKey: 'equipmentinfo.sysName' },
    { key: 'ipAddress', label: 'IP Address', filterKey: 'equipmentinfo.ipAddress', sortKey: 'equipmentinfo.ipAddress' },
    { key: 'deviceType', label: 'Type', filterKey: 'equipmentinfo.deviceType', sortKey: 'equipmentinfo.deviceType', enumValues: deviceTypeEnum },
    { key: 'location', label: 'Location', filterKey: 'equipmentinfo.location', sortKey: 'equipmentinfo.location' },
    { key: 'status', label: 'Status', filterKey: 'equipmentinfo.deviceStatus', sortKey: 'equipmentinfo.deviceStatus', enumValues: deviceStatusEnum },
    { key: 'cpuUsage', label: 'CPU %', sortKey: 'stats.cpuUsage', formatter: (value) => `${value}%` },
    { key: 'memoryUsage', label: 'Memory %', sortKey: 'stats.memoryUsage', formatter: (value) => `${value}%` },
    { key: 'uptime', label: 'Uptime', filterKey: 'equipmentinfo.uptime', sortKey: 'equipmentinfo.uptime' }
];

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

// Update hero subtitle with device stats
function updateHeroStats(counts) {
    if (!counts) return;
    try {
        const parentHeroSubtitle = window.parent.document.querySelector('.network-hero .hero-subtitle');
        if (parentHeroSubtitle) {
            const totalDevices = counts.Total || 0;
            const onlineDevices = counts.Online || 0;
            const uptime = totalDevices > 0 ? ((onlineDevices / totalDevices) * 100).toFixed(2) : 0;
            parentHeroSubtitle.textContent = `Real-time monitoring • ${onlineDevices} Active Devices • ${uptime}% Uptime`;
        }
    } catch (e) {
        // Cross-origin restriction, ignore
    }
}

// Initialize Network Devices
function initializeNetworkDevices() {
    networkDevicesTable = new ProblerTable('network-devices-table', {
        endpoint: getDevicesEndpoint(),
        modelName: 'NetworkDevice',
        columns: columns,
        rowsPerPage: 15,
        sortable: true,
        filterable: true,
        statusColumn: 'status',
        serverSide: true,
        transformData: transformDeviceData,
        onDataLoaded: (data, items, totalCount) => {
            // Update hero subtitle with device stats
            if (data.metadata?.keyCount?.counts) {
                updateHeroStats(data.metadata.keyCount.counts);
            }
        },
        onRowClick: (rowData) => {
            showDeviceDetailModal(rowData);
        }
    });
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
        initializeNetworkDevices();
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
