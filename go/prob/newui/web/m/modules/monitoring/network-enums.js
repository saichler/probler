/**
 * Mobile Network Module - Enum Definitions
 * Desktop Equivalent: probler/network/network-enums.js
 */
(function() {
    'use strict';

    const factory = window.Layer8EnumFactory;
    const { createStatusRenderer, renderEnum } = Layer8MRenderers;

    window.MobileNetwork = window.MobileNetwork || {};

    const DEVICE_STATUS = factory.create([
        ['Unknown', null, 'status-offline'],
        ['Online', 'online', 'status-active'],
        ['Offline', 'offline', 'status-inactive'],
        ['Warning', 'warning', 'status-pending'],
        ['Critical', 'critical', 'status-terminated'],
        ['Maintenance', 'maintenance', 'status-inactive'],
        ['Partial', 'partial', 'status-pending']
    ]);

    const DEVICE_TYPE = factory.simple([
        'Unknown', 'Router', 'Switch', 'Firewall', 'Server', 'Access Point', 'Server'
    ]);

    MobileNetwork.enums = {
        DEVICE_STATUS: DEVICE_STATUS.enum,
        DEVICE_STATUS_VALUES: DEVICE_STATUS.values,
        DEVICE_STATUS_CLASSES: DEVICE_STATUS.classes,
        DEVICE_TYPE: DEVICE_TYPE.enum
    };

    MobileNetwork.render = {
        deviceStatus: createStatusRenderer(DEVICE_STATUS.enum, DEVICE_STATUS.classes),
        deviceType: (type) => renderEnum(type, DEVICE_TYPE.enum)
    };

})();
