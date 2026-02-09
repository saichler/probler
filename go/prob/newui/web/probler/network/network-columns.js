// Probler Network Device Column Definitions
window.ProblerNetwork = window.ProblerNetwork || {};
ProblerNetwork.columns = {};

ProblerNetwork.columns.NetworkDevice = [
    { key: 'name', label: 'Device Name', filterKey: 'equipmentinfo.sysName', sortKey: 'equipmentinfo.sysName' },
    { key: 'ipAddress', label: 'IP Address', filterKey: 'equipmentinfo.ipAddress', sortKey: 'equipmentinfo.ipAddress' },
    { key: 'deviceType', label: 'Type', filterKey: 'equipmentinfo.deviceType', sortKey: 'equipmentinfo.deviceType', enumValues: ProblerNetwork.enums.DEVICE_TYPE },
    { key: 'location', label: 'Location', filterKey: 'equipmentinfo.location', sortKey: 'equipmentinfo.location' },
    {
        key: 'status', label: 'Status',
        filterKey: 'equipmentinfo.deviceStatus', sortKey: 'equipmentinfo.deviceStatus',
        enumValues: ProblerNetwork.enums.DEVICE_STATUS,
        render: function(item) {
            var status = item.status || 'unknown';
            var cssClass = ProblerNetwork.enums.DEVICE_STATUS_CLASSES[status] || 'status-offline';
            return '<span class="status-badge ' + cssClass + '">' + Layer8DUtils.escapeHtml(status) + '</span>';
        }
    },
    { key: 'cpuUsage', label: 'CPU %', sortKey: 'stats.cpuUsage', render: function(item) { return item.cpuUsage + '%'; } },
    { key: 'memoryUsage', label: 'Memory %', sortKey: 'stats.memoryUsage', render: function(item) { return item.memoryUsage + '%'; } },
    { key: 'uptime', label: 'Uptime', filterKey: 'equipmentinfo.uptime', sortKey: 'equipmentinfo.uptime' }
];
