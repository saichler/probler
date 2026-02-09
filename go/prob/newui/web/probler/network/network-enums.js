// Probler Network Device Enums
window.ProblerNetwork = window.ProblerNetwork || {};
ProblerNetwork.enums = {};

// Device status: display label -> backend enum value (for filter dropdowns)
ProblerNetwork.enums.DEVICE_STATUS = {
    'online': 1,
    'offline': 2,
    'warning': 3,
    'critical': 4,
    'maintenance': 5,
    'partial': 6,
    'unknown': 0
};

// Device type: display label -> backend enum value
ProblerNetwork.enums.DEVICE_TYPE = {
    'router': 1,
    'switch': 2,
    'firewall': 3,
    'server': 4,
    'access point': 5,
    'unknown': 0
};

// Device status -> CSS class mapping for badge rendering
ProblerNetwork.enums.DEVICE_STATUS_CLASSES = {
    'online': 'status-operational',
    'offline': 'status-offline',
    'warning': 'status-warning',
    'critical': 'status-critical',
    'maintenance': 'status-maintenance',
    'partial': 'status-warning',
    'unknown': 'status-offline'
};

// Backend enum value/string -> display label
ProblerNetwork.enums.mapDeviceStatus = function(status) {
    if (status === 1 || status === 'DEVICE_STATUS_ONLINE') return 'online';
    if (status === 2 || status === 'DEVICE_STATUS_OFFLINE') return 'offline';
    if (status === 3 || status === 'DEVICE_STATUS_WARNING') return 'warning';
    if (status === 4 || status === 'DEVICE_STATUS_CRITICAL') return 'critical';
    if (status === 5 || status === 'DEVICE_STATUS_MAINTENANCE') return 'maintenance';
    if (status === 6 || status === 'DEVICE_STATUS_PARTIAL') return 'partial';
    return 'unknown';
};

ProblerNetwork.enums.mapDeviceType = function(type) {
    if (type === 1 || type === 'DEVICE_TYPE_ROUTER') return 'Router';
    if (type === 2 || type === 'DEVICE_TYPE_SWITCH') return 'Switch';
    if (type === 3 || type === 'DEVICE_TYPE_FIREWALL') return 'Firewall';
    if (type === 4 || type === 'DEVICE_TYPE_SERVER') return 'Server';
    if (type === 5 || type === 'DEVICE_TYPE_ACCESS_POINT') return 'Access Point';
    if (type === 6) return 'Server';
    return 'Unknown';
};
