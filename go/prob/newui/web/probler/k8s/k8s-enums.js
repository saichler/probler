// Probler Kubernetes Enums
window.ProblerK8s = window.ProblerK8s || {};
ProblerK8s.enums = {};

// Pod status: enum index -> display label
ProblerK8s.enums.POD_STATUS = {
    0: 'Unspecified',
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

// Node status: enum index -> display label
ProblerK8s.enums.NODE_STATUS = {
    0: 'Unspecified',
    1: 'Ready',
    2: 'NotReady'
};

// Job condition: enum index -> display label
ProblerK8s.enums.JOB_CONDITION = {
    0: 'Unspecified',
    1: 'Complete',
    2: 'Failed',
    3: 'Suspended'
};

// PV phase: enum index -> display label
ProblerK8s.enums.PV_PHASE = {
    0: 'Unspecified',
    1: 'Available',
    2: 'Bound',
    3: 'Released',
    4: 'Failed'
};

// Per the non-silent-fallback rule: distinguish (a) genuinely-absent values
// (null/undefined/'') from (b) values the parser produced but the UI does
// not have a label for. Case (a) renders "—"; case (b) console.warns and
// returns the raw value so the bug stays visible instead of being silently
// coerced to "Unknown".
ProblerK8s.enums.getPodStatusText = function(statusValue) {
    if (statusValue === null || statusValue === undefined || statusValue === '') return '—';
    if (typeof statusValue === 'string') return statusValue;
    var label = ProblerK8s.enums.POD_STATUS[statusValue];
    if (label) return label;
    if (typeof console !== 'undefined' && console.warn) {
        console.warn('K8s pod status: unmapped enum value', statusValue);
    }
    return String(statusValue);
};

ProblerK8s.enums.getPodStatusClass = function(statusText) {
    var s = (typeof statusText === 'string') ? statusText.toLowerCase() : '';
    if (s === 'running' || s === 'succeeded' || s === 'completed') return 'status-operational';
    if (s === 'pending' || s === 'containercreating' || s === 'terminating') return 'status-warning';
    if (s === 'failed' || s === 'error' || s === 'crashloopbackoff' ||
        s === 'imagepullbackoff' || s === 'unknown' || s === 'unspecified') return 'status-critical';
    return 'status-warning';
};

ProblerK8s.enums.getNodeStatusClass = function(statusValue) {
    if (statusValue === 1 || statusValue === 'Ready') return 'status-operational';
    if (statusValue === 2 || statusValue === 'NotReady') return 'status-critical';
    return 'status-warning';
};

ProblerK8s.enums.getNamespaceStatusClass = function(status) {
    return status === 'Active' ? 'status-operational' : 'status-warning';
};

ProblerK8s.enums.getJobConditionText = function(condValue) {
    if (typeof condValue === 'string') return condValue;
    return ProblerK8s.enums.JOB_CONDITION[condValue] || 'Unspecified';
};

ProblerK8s.enums.getJobConditionClass = function(condValue) {
    var v = (typeof condValue === 'number') ? condValue : 0;
    if (v === 1) return 'status-operational';
    if (v === 2) return 'status-critical';
    if (v === 3) return 'status-warning';
    return 'status-warning';
};

ProblerK8s.enums.getPvPhaseText = function(phaseValue) {
    if (typeof phaseValue === 'string') return phaseValue;
    return ProblerK8s.enums.PV_PHASE[phaseValue] || 'Unspecified';
};

ProblerK8s.enums.getPvPhaseClass = function(phaseValue) {
    var v = (typeof phaseValue === 'number') ? phaseValue : 0;
    if (v === 1) return 'status-operational';
    if (v === 2) return 'status-operational';
    if (v === 3) return 'status-warning';
    if (v === 4) return 'status-critical';
    return 'status-warning';
};
