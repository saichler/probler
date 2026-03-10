/**
 * Mobile Hosts Module - Enum Definitions
 * Desktop Equivalent: probler/hosts/hosts-enums.js
 */
(function() {
    'use strict';

    const factory = window.Layer8EnumFactory;
    const { createStatusRenderer } = Layer8MRenderers;

    window.MobileHosts = window.MobileHosts || {};

    const HYPERVISOR_STATUS = factory.create([
        ['Operational', 'operational', 'status-active'],
        ['Warning', 'warning', 'status-pending'],
        ['Critical', 'critical', 'status-terminated']
    ]);

    const VM_STATUS = factory.create([
        ['Running', 'running', 'status-active'],
        ['Stopped', 'stopped', 'status-inactive'],
        ['Suspended', 'suspended', 'status-pending'],
        ['Error', 'error', 'status-terminated']
    ]);

    MobileHosts.enums = {
        HYPERVISOR_STATUS: HYPERVISOR_STATUS.enum,
        HYPERVISOR_STATUS_VALUES: HYPERVISOR_STATUS.values,
        HYPERVISOR_STATUS_CLASSES: HYPERVISOR_STATUS.classes,
        VM_STATUS: VM_STATUS.enum,
        VM_STATUS_VALUES: VM_STATUS.values,
        VM_STATUS_CLASSES: VM_STATUS.classes
    };

    MobileHosts.render = {
        hypervisorStatus: createStatusRenderer(HYPERVISOR_STATUS.enum, HYPERVISOR_STATUS.classes),
        vmStatus: createStatusRenderer(VM_STATUS.enum, VM_STATUS.classes)
    };

})();
