(function() {
    'use strict';
    // 13 sections matching desktop sidebar exactly
    window.LAYER8M_NAV_CONFIG_BASE = {
        modules: [
            { key: 'dashboard', label: 'Datacenter Dashboard', icon: 'dashboard' },
            { key: 'inventory', label: 'Inventory', icon: 'inventory' },
            { key: 'network', label: 'Network Devices', icon: 'network' },
            { key: 'gpus', label: 'GPUs', icon: 'gpus' },
            { key: 'hosts', label: 'Hosts & VMs', icon: 'hosts' },
            { key: 'kubernetes', label: 'Kubernetes Clusters', icon: 'kubernetes' },
            { key: 'infrastructure', label: 'Storage, Power & Temp', icon: 'infrastructure' },
            { key: 'topologies', label: 'Topologies', icon: 'topologies' },
            { key: 'alarms', label: 'Events & Alarms', icon: 'alarms' },
            { key: 'automation', label: 'Automation & Workflows', icon: 'automation' },
            { key: 'applications', label: 'Applications', icon: 'applications' },
            { key: 'analytics', label: 'Analytics', icon: 'analytics' },
            { key: 'system', label: 'System', icon: 'system' }
        ]
    };
})();
