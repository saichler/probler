// Probler Host & VM Enums
window.ProblerHosts = window.ProblerHosts || {};
ProblerHosts.enums = {};

ProblerHosts.enums.HYPERVISOR_STATUS = {
    'operational': 0,
    'warning': 1,
    'critical': 2
};

ProblerHosts.enums.HYPERVISOR_STATUS_CLASSES = {
    'operational': 'status-operational',
    'warning': 'status-warning',
    'critical': 'status-critical'
};

ProblerHosts.enums.VM_STATUS = {
    'running': 0,
    'stopped': 1,
    'suspended': 2,
    'error': 3
};

ProblerHosts.enums.VM_STATUS_CLASSES = {
    'running': 'status-operational',
    'stopped': 'status-offline',
    'suspended': 'status-warning',
    'error': 'status-critical'
};
