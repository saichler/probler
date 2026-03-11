/**
 * Mobile Targets Module - Enum Definitions
 * Desktop Equivalent: targets/targets.js (PROTOCOLS, INVENTORY_TYPES, TARGET_STATES)
 */
(function() {
    'use strict';

    var factory = window.Layer8EnumFactory;
    var { createStatusRenderer, renderEnum } = Layer8DRenderers;

    window.MobileTargets = window.MobileTargets || {};

    var PROTOCOLS = factory.simple([
        'Invalid', 'SSH', 'SNMPV2', 'SNMPV3', 'RESTCONF', 'NETCONF', 'GRPC', 'Kubectl', 'GraphQL'
    ]);

    var INVENTORY_TYPES = factory.simple([
        'Invalid', 'Network Device', 'GPUS', 'Hosts', 'Virtual Machine', 'K8s Cluster', 'Storage', 'Power'
    ]);

    var TARGET_STATES = factory.create([
        ['Invalid', null, ''],
        ['Down', 'down', 'layer8d-status-terminated'],
        ['Up', 'up', 'layer8d-status-active'],
        ['Maintenance', 'maintenance', 'layer8d-status-pending'],
        ['Offline', 'offline', 'layer8d-status-inactive']
    ]);

    MobileTargets.enums = {
        PROTOCOLS: PROTOCOLS.enum,
        INVENTORY_TYPES: INVENTORY_TYPES.enum,
        TARGET_STATES: TARGET_STATES.enum,
        TARGET_STATES_CLASSES: TARGET_STATES.classes
    };

    MobileTargets.render = {
        protocol: function(v) { return renderEnum(v, PROTOCOLS.enum); },
        inventoryType: function(v) { return renderEnum(v, INVENTORY_TYPES.enum); },
        state: createStatusRenderer(TARGET_STATES.enum, TARGET_STATES.classes)
    };

})();
