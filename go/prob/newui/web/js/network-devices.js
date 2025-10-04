// Network Devices Section Module

// Map device status from JSON format to UI format
function mapDeviceStatus(status) {
    if (status === 'DEVICE_STATUS_ONLINE') return 'online';
    if (status === 'DEVICE_STATUS_OFFLINE') return 'offline';
    if (status === 'DEVICE_STATUS_WARNING') return 'warning';
    return 'offline';
}

// Map device type from JSON format to UI format
function mapDeviceType(type) {
    if (type === 'DEVICE_TYPE_ROUTER') return 'Router';
    if (type === 'DEVICE_TYPE_SWITCH') return 'Switch';
    if (type === 'DEVICE_TYPE_FIREWALL') return 'Firewall';
    if (type === 'DEVICE_TYPE_SERVER') return 'Server';
    if (type === 'DEVICE_TYPE_ACCESS_POINT') return 'Access Point';
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
        model: equipment.model || '',
        vendor: equipment.vendor || '',
        series: equipment.series || '',
        family: equipment.family || '',
        software: equipment.software || '',
        serialNumber: equipment.serialNumber || '',
        firmware: equipment.version || '',
        interfaces: physicals['physical-0'] ? (physicals['physical-0'].ports || []).length : 0,
        temperature: getRandomTemperature(),
        lastSeen: new Date().toISOString().replace('T', ' ').substring(0, 19),
        physicals: physicals
    };
}

// Initialize Network Devices
function initializeNetworkDevices() {
    // Fetch devices data from JSON file
    fetch('samples/devices.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load devices data');
            }
            return response.json();
        })
        .then(data => {
            // Transform the device list from JSON format to table format
            const networkDevicesData = (data.list || []).map(device => transformDeviceData(device));

            // Create the network devices table
            const devicesTable = new ProblerTable('network-devices-table', {
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
                data: networkDevicesData,
                rowsPerPage: 15,
                sortable: true,
                filterable: true,
                statusColumn: 'status',
                onRowClick: (rowData) => {
                    showDeviceDetailModal(rowData);
                }
            });
        })
        .catch(error => {
            const container = document.getElementById('network-devices-table');
            if (container) {
                container.innerHTML = '<div style="padding: 20px; color: #718096; text-align: center;">Failed to load network devices data</div>';
            }
        });
}
