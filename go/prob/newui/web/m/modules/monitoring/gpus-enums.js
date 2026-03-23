/**
 * Mobile GPUs Module - Enum Definitions
 * Aligned with desktop: probler/gpus/gpus-enums.js
 * Data model: GpuDevice.deviceInfo.deviceStatus (DeviceStatus enum)
 *             Gpu.health (GpuComponentHealth) with GpuHealthStatus enum
 */
(function() {
    'use strict';

    const factory = window.Layer8EnumFactory;
    const { createStatusRenderer } = Layer8MRenderers;

    window.MobileGpus = window.MobileGpus || {};

    // Device status — matches desktop ProblerGpus.enums.DEVICE_STATUS
    // Backend enum: DeviceStatus (0=unknown, 1=online, 2=offline, 3=warning, 4=critical, 5=maintenance, 6=partial)
    const DEVICE_STATUS = factory.create([
        ['Online', 'online', 'status-active'],
        ['Offline', 'offline', 'status-terminated'],
        ['Warning', 'warning', 'status-pending'],
        ['Critical', 'critical', 'status-terminated'],
        ['Maintenance', 'maintenance', 'status-pending'],
        ['Partial', 'partial', 'status-pending'],
        ['Unknown', 'unknown', 'status-info']
    ]);

    // GPU health status — matches desktop ProblerGpus.enums.mapHealthStatus
    // Backend enum: GpuHealthStatus (0=unknown, 1=healthy, 2=warning, 3=critical)
    const GPU_HEALTH = factory.create([
        ['Healthy', 'healthy', 'status-active'],
        ['Warning', 'warning', 'status-pending'],
        ['Critical', 'critical', 'status-terminated'],
        ['Unknown', 'unknown', 'status-info']
    ]);

    // Map backend enum value/string → display label (matches desktop mapDeviceStatus)
    function mapDeviceStatus(status) {
        if (status === 1 || status === 'DEVICE_STATUS_ONLINE') return 'online';
        if (status === 2 || status === 'DEVICE_STATUS_OFFLINE') return 'offline';
        if (status === 3 || status === 'DEVICE_STATUS_WARNING') return 'warning';
        if (status === 4 || status === 'DEVICE_STATUS_CRITICAL') return 'critical';
        if (status === 5 || status === 'DEVICE_STATUS_MAINTENANCE') return 'maintenance';
        if (status === 6 || status === 'DEVICE_STATUS_PARTIAL') return 'partial';
        return 'unknown';
    }

    // Map backend health enum → display label (matches desktop mapHealthStatus)
    function mapHealthStatus(status) {
        if (status === 1 || status === 'GPU_HEALTH_HEALTHY') return 'healthy';
        if (status === 2 || status === 'GPU_HEALTH_WARNING') return 'warning';
        if (status === 3 || status === 'GPU_HEALTH_CRITICAL') return 'critical';
        return 'unknown';
    }

    MobileGpus.enums = {
        DEVICE_STATUS: DEVICE_STATUS.enum,
        DEVICE_STATUS_VALUES: DEVICE_STATUS.values,
        DEVICE_STATUS_CLASSES: DEVICE_STATUS.classes,
        GPU_HEALTH: GPU_HEALTH.enum,
        GPU_HEALTH_VALUES: GPU_HEALTH.values,
        GPU_HEALTH_CLASSES: GPU_HEALTH.classes,
        mapDeviceStatus: mapDeviceStatus,
        mapHealthStatus: mapHealthStatus
    };

    MobileGpus.render = {
        deviceStatus: createStatusRenderer(DEVICE_STATUS.enum, DEVICE_STATUS.classes),
        healthStatus: createStatusRenderer(GPU_HEALTH.enum, GPU_HEALTH.classes)
    };

    /** Strip extra embedded quotes from protobuf string values */
    function stripQuotes(str) {
        if (!str) return '';
        return str.replace(/^"+|"+$/g, '');
    }

    /**
     * Transform raw GpuDevice protobuf → flat table row.
     * Matches desktop transformGpuDeviceData() in gpus-init.js.
     * Protobuf: {id, deviceInfo: GpuDeviceInfo, gpus: map<string,Gpu>, system, health, topology}
     */
    MobileGpus.transforms = {
        GpuDevice: function(device) {
            var info = device.deviceInfo || {};
            var gpusMap = device.gpus || {};
            var gpusList = Object.values(gpusMap);
            var firstGpu = gpusList[0] || {};
            return {
                id: device.id,
                ipAddress: info.ipAddress || device.id,
                hostname: info.hostname || device.id,
                gpuModel: stripQuotes(firstGpu.deviceName) || info.model || '',
                gpuCount: info.gpuCount || gpusList.length || 0,
                driverVersion: info.driverVersion || '',
                cudaVersion: info.cudaVersion || '',
                dcgmVersion: info.dcgmVersion || '',
                status: mapDeviceStatus(info.deviceStatus),
                lastSeen: info.lastSeen || '',
                uptime: info.uptime || '',
                vendor: info.vendor || '',
                serialNumber: info.serialNumber || '',
                location: info.location || '',
                osVersion: info.osVersion || '',
                kernelVersion: info.kernelVersion || '',
                gpus: gpusList,
                system: device.system || {},
                health: device.health || {}
            };
        }
    };

})();
