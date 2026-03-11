/**
 * Mobile Monitoring Module Registry
 * Registers all monitoring sub-modules with Layer8MModuleRegistry
 */
Layer8MModuleRegistry.create('MobileMonitoring', {
    'Network': MobileNetwork,
    'GPUs': MobileGpus,
    'Hosts & VMs': MobileHosts,
    'Kubernetes': MobileK8s
});
