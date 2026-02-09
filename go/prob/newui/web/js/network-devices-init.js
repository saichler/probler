// Network Devices - Direct Integration (no iframe)
// Enums: ProblerNetwork.enums (probler/network/network-enums.js)
// Columns: ProblerNetwork.columns (probler/network/network-columns.js)

// Global table instance
let networkDevicesTable = null;

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
        deviceType: ProblerNetwork.enums.mapDeviceType(equipment.deviceType),
        location: equipment.location || '',
        status: ProblerNetwork.enums.mapDeviceStatus(equipment.deviceStatus),
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

// Update hero subtitle with device stats
function updateNetworkHeroStats(counts) {
    if (!counts) return;
    const heroSubtitle = document.querySelector('.network-hero .hero-subtitle');
    if (heroSubtitle) {
        const totalDevices = counts.Total || 0;
        const onlineDevices = counts.Online || 0;
        const uptime = totalDevices > 0 ? ((onlineDevices / totalDevices) * 100).toFixed(2) : 0;
        heroSubtitle.textContent = `Real-time monitoring \u2022 ${onlineDevices} Active Devices \u2022 ${uptime}% Uptime`;
    }
}

// Initialize Network Devices table
function initializeNetworkDevices() {
    const endpoint = Layer8DConfig.resolveEndpoint('/0/NCache');

    networkDevicesTable = new Layer8DTable({
        containerId: 'network-devices-table',
        endpoint: endpoint,
        modelName: 'NetworkDevice',
        columns: ProblerNetwork.columns.NetworkDevice,
        pageSize: 15,
        pageSizeOptions: [15, 25, 50],
        sortable: true,
        filterable: true,
        serverSide: true,
        transformData: transformDeviceData,
        onDataLoaded: (data, items, totalCount) => {
            if (data.metadata?.keyCount?.counts) {
                updateNetworkHeroStats(data.metadata.keyCount.counts);
            }
        },
        onRowClick: (rowData) => {
            showDeviceDetailModal(rowData);
        }
    });
    networkDevicesTable.init();
}
