/**
 * Mobile GPUs Module - Column Definitions
 * Desktop Equivalent: probler/gpus/gpus-columns.js
 */
(function() {
    'use strict';

    const col = window.Layer8ColumnFactory;
    const enums = MobileGpus.enums;
    const render = MobileGpus.render;

    MobileGpus.columns = {
        GpuDevice: [
            ...col.col('name', 'GPU Name'),
            ...col.col('model', 'Model'),
            ...col.col('hostName', 'Host'),
            ...col.status('status', 'Status', enums.GPU_STATUS_VALUES, render.gpuStatus),
            ...col.custom('utilization', 'GPU %', (item) => (item.utilization || 0) + '%'),
            ...col.custom('memoryUsed', 'Memory', (item) => (item.memoryUsed || 0) + 'GB / ' + (item.memoryTotal || 0) + 'GB'),
            ...col.custom('temperature', 'Temp', (item) => (item.temperature || 0) + '\u00B0C'),
            ...col.custom('powerDraw', 'Power', (item) => (item.powerDraw || 0) + 'W / ' + (item.powerLimit || 0) + 'W')
        ]
    };

    MobileGpus.primaryKeys = {
        GpuDevice: 'gpuId'
    };

})();
