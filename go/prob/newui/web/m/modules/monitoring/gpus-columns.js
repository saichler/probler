/**
 * Mobile GPUs Module - Column Definitions
 * Aligned with desktop: probler/gpus/gpus-columns.js
 * Fields reference post-transform names from MobileGpus.transforms.GpuDevice
 */
(function() {
    'use strict';

    const col = window.Layer8ColumnFactory;

    // Status renderer — transform returns string ('online','offline',...) not enum int
    // Matches desktop ProblerGpus.enums.DEVICE_STATUS_CLASSES
    var STATUS_CLASSES = {
        'online': 'status-active',
        'offline': 'status-terminated',
        'warning': 'status-pending',
        'critical': 'status-terminated',
        'maintenance': 'status-pending',
        'partial': 'status-pending',
        'unknown': 'status-info'
    };

    function renderDeviceStatus(item) {
        var status = item.status || 'unknown';
        var cls = STATUS_CLASSES[status] || 'status-info';
        var esc = (typeof Layer8MUtils !== 'undefined') ? Layer8MUtils.escapeHtml : function(s) { return s; };
        return '<span class="status-badge ' + cls + '">' + esc(status) + '</span>';
    }

    MobileGpus.columns = {
        GpuDevice: [
            ...col.col('hostname', 'Hostname'),
            ...col.col('ipAddress', 'IP Address'),
            ...col.col('gpuModel', 'GPU Model'),
            ...col.col('gpuCount', 'GPUs'),
            ...col.col('driverVersion', 'Driver'),
            ...col.col('cudaVersion', 'CUDA'),
            ...col.col('dcgmVersion', 'DCGM'),
            ...col.custom('status', 'Status', renderDeviceStatus)
        ]
    };

    MobileGpus.primaryKeys = {
        GpuDevice: 'id'
    };

})();
