// Probler GPU Enums
window.ProblerGpus = window.ProblerGpus || {};
ProblerGpus.enums = {};

ProblerGpus.enums.GPU_STATUS = {
    'operational': 0,
    'warning': 1,
    'critical': 2
};

ProblerGpus.enums.GPU_STATUS_CLASSES = {
    'operational': 'status-operational',
    'warning': 'status-warning',
    'critical': 'status-critical'
};
