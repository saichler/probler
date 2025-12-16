// Network Devices Section Module

// Map device status from JSON format to UI format
function mapDeviceStatus(status) {
    // Handle numeric status codes
    if (status === 1 || status === 'DEVICE_STATUS_ONLINE') return 'online';
    if (status === 0 || status === 'DEVICE_STATUS_OFFLINE') return 'offline';
    if (status === 2 || status === 'DEVICE_STATUS_WARNING') return 'warning';
    return 'offline';
}

// Map device type from JSON format to UI format
function mapDeviceType(type) {
    // Handle numeric type codes
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
    return Math.floor(Math.random() * 40) + 25; // 25-65°C
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

// Global variable to store the network devices table instance
let networkDevicesTable = null;

// Cache for total count (metadata exists on all pages, but only page 0 has real data)
let cachedTotalCount = 0;

// Fetch devices for a specific page
async function fetchNetworkDevices(page) {
    const container = document.getElementById('network-devices-table');

    try {
        // Convert GUI page (1-based) to server page (0-based)
        const serverPage = page - 1;

        // Fetch devices data from API endpoint
        const response = await makeAuthenticatedRequest('/probler/0/NCache?body=' + encodeURIComponent(JSON.stringify({
            text: `select * from NetworkDevice where Id=* limit 15 page ${serverPage}`
        })), {
            method: 'GET'
        });

        if (!response || !response.ok) {
            throw new Error('Failed to load devices data');
        }

        const data = await response.json();

        // Transform the device list from JSON format to table format
        const networkDevicesData = (data.list || []).map(device => transformDeviceData(device));

        // Get counts from metadata (only use page 0, pages 1+ contain per-page totals)
        let totalDevices = cachedTotalCount; // Use cached value by default

        if (serverPage === 0 && data.metadata?.keyCount?.counts) {
            // Page 0: metadata contains real aggregate data, extract and cache counts
            totalDevices = data.metadata.keyCount.counts.Total || 0;
            const onlineDevices = data.metadata.keyCount.counts.Online || 0;
            cachedTotalCount = totalDevices; // Cache for pages 1+ (disregard their metadata)

            // Update hero subtitle with actual stats (only on page 0)
            const heroSubtitle = document.querySelector('.network-hero .hero-subtitle');
            if (heroSubtitle) {
                const uptime = totalDevices > 0 ? ((onlineDevices / totalDevices) * 100).toFixed(2) : 0;
                heroSubtitle.textContent = `Real-time monitoring • ${onlineDevices} Active Devices • ${uptime}% Uptime`;
            }
        }

        return { devices: networkDevicesData, totalCount: totalDevices };
    } catch (error) {
        if (container) {
            container.innerHTML = '<div style="padding: 20px; color: #718096; text-align: center;">Failed to load network devices data</div>';
        }
        throw error;
    }
}

// Initialize Network Devices
async function initializeNetworkDevices() {
    try {
        // Fetch the first page of devices
        const { devices, totalCount } = await fetchNetworkDevices(1);

        // Create the network devices table with server-side pagination
        networkDevicesTable = new ProblerTable('network-devices-table', {
            columns: [
                { key: 'name', label: 'Device Name' },
                { key: 'ipAddress', label: 'IP Address' },
                { key: 'deviceType', label: 'Type' },
                { key: 'location', label: 'Location' },
                { key: 'status', label: 'Status' },
                { key: 'cpuUsage', label: 'CPU %', formatter: (value) => `${value}%` },
                { key: 'memoryUsage', label: 'Memory %', formatter: (value) => `${value}%` },
                { key: 'uptime', label: 'Uptime' }
            ],
            data: devices,
            rowsPerPage: 15,
            sortable: true,
            filterable: true,
            statusColumn: 'status',
            serverSide: true,
            totalCount: totalCount,
            onPageChange: async (page) => {
                // Fetch new page data from server
                const { devices, totalCount } = await fetchNetworkDevices(page);
                networkDevicesTable.updateServerData(devices, totalCount);
            },
            onRowClick: (rowData) => {
                showDeviceDetailModal(rowData);
            }
        });
    } catch (error) {
        const container = document.getElementById('network-devices-table');
        if (container) {
            container.innerHTML = '<div style="padding: 20px; color: #718096; text-align: center;">Failed to load network devices data</div>';
        }
    }
}
