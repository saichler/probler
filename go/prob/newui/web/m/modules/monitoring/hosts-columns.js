/**
 * Mobile Hosts Module - Column Definitions
 * Desktop Equivalent: probler/hosts/hosts-columns.js
 */
(function() {
    'use strict';

    const col = window.Layer8ColumnFactory;
    const enums = MobileHosts.enums;
    const render = MobileHosts.render;

    MobileHosts.columns = {
        Hypervisor: [
            ...col.col('name', 'Host Name'),
            ...col.col('type', 'Type'),
            ...col.col('cluster', 'Cluster'),
            ...col.status('status', 'Status', enums.HYPERVISOR_STATUS_VALUES, render.hypervisorStatus),
            ...col.custom('cpuUsage', 'CPU %', (item) => (item.cpuUsage || 0) + '%'),
            ...col.custom('memoryUsage', 'Memory %', (item) => (item.memoryUsage || 0) + '%'),
            ...col.custom('vmCount', 'VMs', (item) => (item.vmRunning || 0) + '/' + (item.vmCount || 0)),
            ...col.col('datacenter', 'Datacenter')
        ],

        VirtualMachine: [
            ...col.col('name', 'VM Name'),
            ...col.col('os', 'Operating System'),
            ...col.col('hypervisor', 'Host'),
            ...col.status('status', 'Status', enums.VM_STATUS_VALUES, render.vmStatus),
            ...col.custom('cpuUsage', 'CPU %', (item) => (item.cpuUsage || 0) + '%'),
            ...col.custom('memory', 'Memory', (item) => (item.memoryUsed || 0) + '/' + (item.memory || 0) + ' GB'),
            ...col.custom('diskUsage', 'Disk %', (item) => (item.diskUsage || 0) + '%'),
            ...col.col('ipAddress', 'IP Address')
        ]
    };

    MobileHosts.primaryKeys = {
        Hypervisor: 'hypervisorId',
        VirtualMachine: 'vmId'
    };

})();
