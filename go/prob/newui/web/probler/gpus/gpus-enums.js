// Probler GPU Enums
window.ProblerGpus = window.ProblerGpus || {};
ProblerGpus.enums = {};

// Device status: display label -> backend enum value (for filter dropdowns)
ProblerGpus.enums.DEVICE_STATUS = {
    'online': 1,
    'offline': 2,
    'warning': 3,
    'critical': 4,
    'maintenance': 5,
    'partial': 6,
    'unknown': 0
};

// Device status -> CSS class mapping for badge rendering
ProblerGpus.enums.DEVICE_STATUS_CLASSES = {
    'online': 'status-operational',
    'offline': 'status-offline',
    'warning': 'status-warning',
    'critical': 'status-critical',
    'maintenance': 'status-maintenance',
    'partial': 'status-warning',
    'unknown': 'status-offline'
};

// Backend enum value/string -> display label
ProblerGpus.enums.mapDeviceStatus = function(status) {
    if (status === 1 || status === 'DEVICE_STATUS_ONLINE') return 'online';
    if (status === 2 || status === 'DEVICE_STATUS_OFFLINE') return 'offline';
    if (status === 3 || status === 'DEVICE_STATUS_WARNING') return 'warning';
    if (status === 4 || status === 'DEVICE_STATUS_CRITICAL') return 'critical';
    if (status === 5 || status === 'DEVICE_STATUS_MAINTENANCE') return 'maintenance';
    if (status === 6 || status === 'DEVICE_STATUS_PARTIAL') return 'partial';
    return 'unknown';
};

// GPU health status: display label -> backend enum value
ProblerGpus.enums.GPU_HEALTH_STATUS = {
    'healthy': 1,
    'warning': 2,
    'critical': 3,
    'unknown': 0
};

ProblerGpus.enums.mapHealthStatus = function(status) {
    if (status === 1 || status === 'GPU_HEALTH_HEALTHY') return 'healthy';
    if (status === 2 || status === 'GPU_HEALTH_WARNING') return 'warning';
    if (status === 3 || status === 'GPU_HEALTH_CRITICAL') return 'critical';
    return 'unknown';
};
