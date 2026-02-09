// Probler Kubernetes Enums
window.ProblerK8s = window.ProblerK8s || {};
ProblerK8s.enums = {};

// Pod status: enum index -> display label
ProblerK8s.enums.POD_STATUS = {
    0: 'Invalid_Pod_Status',
    1: 'Running',
    2: 'Pending',
    3: 'Succeeded',
    4: 'Failed',
    5: 'Unknown',
    6: 'CrashLoopBackOff',
    7: 'Terminating',
    8: 'ContainerCreating',
    9: 'ImagePullBackOff',
    10: 'Error',
    11: 'Completed'
};

// Convert pod status value (int or string) to display text
ProblerK8s.enums.getPodStatusText = function(statusValue) {
    if (typeof statusValue === 'string') return statusValue;
    return ProblerK8s.enums.POD_STATUS[statusValue] || 'Unknown';
};

// Get CSS class for pod status display text
ProblerK8s.enums.getPodStatusClass = function(statusText) {
    var s = statusText.toLowerCase();
    if (s === 'running' || s === 'succeeded' || s === 'completed') return 'status-operational';
    if (s === 'pending' || s === 'containercreating' || s === 'terminating') return 'status-warning';
    if (s === 'failed' || s === 'error' || s === 'crashloopbackoff' ||
        s === 'imagepullbackoff' || s === 'unknown' || s === 'invalid_pod_status') return 'status-critical';
    return 'status-warning';
};

// Node status CSS class mapping
ProblerK8s.enums.getNodeStatusClass = function(status) {
    if (status === 'Ready') return 'status-operational';
    if (status === 'SchedulingDisabled') return 'status-warning';
    return 'status-critical';
};

// Namespace status CSS class mapping
ProblerK8s.enums.getNamespaceStatusClass = function(status) {
    return status === 'Active' ? 'status-operational' : 'status-warning';
};
