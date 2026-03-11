/**
 * Mobile Network Module - Column Definitions & Data Transform
 * Desktop Equivalent: probler/network/network-columns.js, network-devices-init.js
 */
(function() {
    'use strict';

    var col = window.Layer8ColumnFactory;
    var enums = MobileNetwork.enums;
    var render = MobileNetwork.render;

    function formatUptime(centiseconds) {
        if (!centiseconds || centiseconds === 0) return '0m';
        var s = Math.floor(centiseconds / 100);
        var d = Math.floor(s / 86400);
        var h = Math.floor((s % 86400) / 3600);
        var m = Math.floor((s % 3600) / 60);
        return d + 'd ' + h + 'h ' + m + 'm';
    }

    function transformDeviceData(device) {
        var eq = device.equipmentinfo || {};
        var physicals = device.physicals || {};
        return {
            id: device.id,
            name: eq.sysName || device.id,
            sysName: eq.sysName || '',
            ipAddress: eq.ipAddress || device.id,
            deviceType: eq.deviceType || 0,
            location: eq.location || '',
            status: eq.deviceStatus || 0,
            uptime: formatUptime(eq.uptime),
            model: eq.model || eq.hardware || '',
            vendor: eq.vendor || '',
            series: eq.series || '',
            family: eq.family || '',
            software: eq.software || '',
            serialNumber: eq.serialNumber || '',
            firmware: eq.firmwareVersion || eq.version || '',
            version: eq.version || '',
            hardware: eq.hardware || '',
            sysOid: eq.sysOid || '',
            interfaces: eq.interfaceCount || 0,
            lastSeen: new Date().toISOString().replace('T', ' ').substring(0, 19),
            vendorTypeOid: eq.vendorTypeOid || '',
            physicalAlias: eq.physicalAlias || '',
            assetId: eq.assetId || '',
            isFru: eq.isFru || false,
            manufacturingDate: eq.manufacturingDate || '',
            manufacturerName: eq.manufacturerName || '',
            identificationUris: eq.identificationUris || '',
            latitude: eq.latitude,
            longitude: eq.longitude,
            raw: device
        };
    }

    MobileNetwork.columns = {
        NetworkDevice: [
            ...col.col('name', 'Device Name'),
            ...col.col('ipAddress', 'IP Address'),
            ...col.enum('deviceType', 'Type', null, render.deviceType),
            ...col.status('status', 'Status', enums.DEVICE_STATUS_VALUES, render.deviceStatus),
            ...col.col('location', 'Location'),
            ...col.col('uptime', 'Uptime')
        ]
    };

    MobileNetwork.primaryKeys = {
        NetworkDevice: 'deviceId'
    };

    MobileNetwork.transforms = {
        NetworkDevice: transformDeviceData
    };

    MobileNetwork.getTransformData = function(model) {
        return this.transforms[model] || null;
    };

})();
