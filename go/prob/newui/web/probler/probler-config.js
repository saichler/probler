// Probler Module Configuration
// Defines module structure, services, and submodule registries

window.Probler = window.Probler || {};

Probler.modules = {
    'monitoring': {
        label: 'Monitoring',
        icon: '📊',
        services: [
            { key: 'network', label: 'Network Devices', icon: '🌐', endpoint: '/0/NCache', model: 'NetworkDevice' },
            { key: 'gpus', label: 'GPUs', icon: '🖧', model: null },
            { key: 'hosts', label: 'Hosts & VMs', icon: '🖥️', model: null },
            { key: 'kubernetes', label: 'Kubernetes', icon: '☸️', endpoint: '/1/KCache', model: 'K8sCluster' }
        ]
    },
    'infrastructure': {
        label: 'Infrastructure',
        icon: '🔌',
        services: [
            { key: 'inventory', label: 'Inventory', icon: '📦', endpoint: '/0/L8PTarget', model: 'L8PTarget' },
            { key: 'topologies', label: 'Topologies', icon: '🗺️', model: null },
            { key: 'storage', label: 'Storage & Power', icon: '🔌', model: null }
        ]
    }
};

Probler.submodules = ['ProblerNetwork', 'ProblerGpus', 'ProblerHosts', 'ProblerK8s'];
