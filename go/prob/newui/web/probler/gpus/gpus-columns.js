// Probler GPU Device Column Definitions
window.ProblerGpus = window.ProblerGpus || {};
ProblerGpus.columns = {};

ProblerGpus.columns.GpuDevice = [
    { key: 'hostname', label: 'Hostname', filterKey: 'deviceInfo.hostname', sortKey: 'deviceInfo.hostname' },
    { key: 'ipAddress', label: 'IP Address', filterKey: 'deviceInfo.ipAddress', sortKey: 'deviceInfo.ipAddress' },
    { key: 'model', label: 'Model', filterKey: 'deviceInfo.model', sortKey: 'deviceInfo.model' },
    { key: 'gpuCount', label: 'GPUs', filterKey: 'deviceInfo.gpuCount', sortKey: 'deviceInfo.gpuCount' },
    { key: 'driverVersion', label: 'Driver', filterKey: 'deviceInfo.driverVersion', sortKey: 'deviceInfo.driverVersion' },
    { key: 'cudaVersion', label: 'CUDA', filterKey: 'deviceInfo.cudaVersion', sortKey: 'deviceInfo.cudaVersion' },
    {
        key: 'status', label: 'Status',
        filterKey: 'deviceInfo.deviceStatus', sortKey: 'deviceInfo.deviceStatus',
        enumValues: ProblerGpus.enums.DEVICE_STATUS,
        render: function(item) {
            var status = item.status || 'unknown';
            var cssClass = ProblerGpus.enums.DEVICE_STATUS_CLASSES[status] || 'status-offline';
            return '<span class="status-badge ' + cssClass + '">' + Layer8DUtils.escapeHtml(status) + '</span>';
        }
    }
];
