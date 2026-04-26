// Mobile Kubernetes Module - Enum Definitions
// Desktop Equivalent: probler/k8s/k8s-enums.js
(function() {
    'use strict';

    window.MobileK8s = window.MobileK8s || {};

    var POD_STATUS = {
        0: 'Unspecified', 1: 'Running', 2: 'Pending', 3: 'Succeeded',
        4: 'Failed', 5: 'Unknown', 6: 'CrashLoopBackOff', 7: 'Terminating',
        8: 'ContainerCreating', 9: 'ImagePullBackOff', 10: 'Error', 11: 'Completed'
    };

    var NODE_STATUS = { 0: 'Unspecified', 1: 'Ready', 2: 'NotReady' };

    var JOB_CONDITION = { 0: 'Unspecified', 1: 'Complete', 2: 'Failed', 3: 'Suspended' };

    var PV_PHASE = { 0: 'Unspecified', 1: 'Available', 2: 'Bound', 3: 'Released', 4: 'Failed' };

    // Non-silent-fallback rule (see plans/k8s-table-fixes.md):
    //   - null/undefined/'' → '—' (truly absent)
    //   - unmapped enum value → console.warn + show raw
    function getPodStatusText(v) {
        if (v === null || v === undefined || v === '') return '—';
        if (typeof v === 'string') return v;
        var label = POD_STATUS[v];
        if (label) return label;
        if (typeof console !== 'undefined' && console.warn) {
            console.warn('K8s pod status: unmapped enum value', v);
        }
        return String(v);
    }

    function getPodStatusClass(txt) {
        var s = (typeof txt === 'string') ? txt.toLowerCase() : '';
        if (s === 'running' || s === 'succeeded' || s === 'completed') return 'status-active';
        if (s === 'pending' || s === 'containercreating' || s === 'terminating') return 'status-pending';
        return 'status-terminated';
    }

    function getNodeStatusClass(v) {
        if (v === 1 || v === 'Ready') return 'status-active';
        if (v === 2 || v === 'NotReady') return 'status-terminated';
        return 'status-pending';
    }

    function getNamespaceStatusClass(s) {
        return s === 'Active' ? 'status-active' : 'status-pending';
    }

    function getJobConditionText(v) {
        if (typeof v === 'string') return v;
        return JOB_CONDITION[v] || 'Unspecified';
    }

    function getJobConditionClass(v) {
        var n = (typeof v === 'number') ? v : 0;
        if (n === 1) return 'status-active';
        if (n === 2) return 'status-terminated';
        if (n === 3) return 'status-pending';
        return 'status-pending';
    }

    function getPvPhaseText(v) {
        if (typeof v === 'string') return v;
        return PV_PHASE[v] || 'Unspecified';
    }

    function getPvPhaseClass(v) {
        var n = (typeof v === 'number') ? v : 0;
        if (n === 1 || n === 2) return 'status-active';
        if (n === 3) return 'status-pending';
        if (n === 4) return 'status-terminated';
        return 'status-pending';
    }

    MobileK8s.enums = {
        POD_STATUS: POD_STATUS,
        NODE_STATUS: NODE_STATUS,
        JOB_CONDITION: JOB_CONDITION,
        PV_PHASE: PV_PHASE,
        getPodStatusText: getPodStatusText,
        getPodStatusClass: getPodStatusClass,
        getNodeStatusClass: getNodeStatusClass,
        getNamespaceStatusClass: getNamespaceStatusClass,
        getJobConditionText: getJobConditionText,
        getJobConditionClass: getJobConditionClass,
        getPvPhaseText: getPvPhaseText,
        getPvPhaseClass: getPvPhaseClass
    };

    MobileK8s.render = {
        podStatus: function(value) {
            var text = getPodStatusText(value);
            var cls = getPodStatusClass(text);
            return '<span class="status-badge ' + cls + '">' + text + '</span>';
        },
        nodeStatus: function(value) {
            // Same non-silent-fallback rule as getPodStatusText.
            var txt;
            if (value === null || value === undefined || value === '') {
                txt = '—';
            } else if (typeof value === 'string') {
                txt = value;
            } else {
                var label = NODE_STATUS[value];
                if (label) {
                    txt = label;
                } else {
                    if (typeof console !== 'undefined' && console.warn) {
                        console.warn('K8s node status: unmapped enum value', value);
                    }
                    txt = String(value);
                }
            }
            var cls = getNodeStatusClass(value);
            return '<span class="status-badge ' + cls + '">' + txt + '</span>';
        },
        podReady: function(value) {
            var count = 0, outof = 0;
            if (value && typeof value === 'object') {
                count = value.count || 0;
                outof = value.outof || 0;
            } else if (typeof value === 'string') {
                var parts = value.split('/');
                count = parseInt(parts[0]) || 0;
                outof = parseInt(parts[1]) || 0;
            }
            var cls = count === outof ? 'status-active' : count > 0 ? 'status-pending' : 'status-terminated';
            return '<span class="status-badge ' + cls + '">' + count + '/' + outof + '</span>';
        },
        restarts: function(value) {
            if (typeof value === 'object' && value !== null) {
                return (value.count || 0) + ' ' + (value.ago || '');
            }
            return '' + (value || 0);
        },
        namespaceStatus: function(value) {
            var cls = getNamespaceStatusClass(value);
            return '<span class="status-badge ' + cls + '">' + (value || 'Unknown') + '</span>';
        },
        jobCondition: function(value) {
            var txt = getJobConditionText(value);
            var cls = getJobConditionClass(value);
            return '<span class="status-badge ' + cls + '">' + txt + '</span>';
        },
        cronJobSuspend: function(value) {
            var cls = value ? 'status-pending' : 'status-active';
            return '<span class="status-badge ' + cls + '">' + (value ? 'Yes' : 'No') + '</span>';
        },
        pvStatus: function(value) {
            var txt = getPvPhaseText(value);
            var cls = getPvPhaseClass(value);
            return '<span class="status-badge ' + cls + '">' + txt + '</span>';
        },
        vclusterStatus: function(value) {
            var cls = (value === 'Running') ? 'status-active' : 'status-pending';
            return '<span class="status-badge ' + cls + '">' + (value || 'Unknown') + '</span>';
        },
        eventType: function(value) {
            var cls = value === 'Normal' ? 'status-active' : 'status-pending';
            return '<span class="status-badge ' + cls + '">' + (value || '') + '</span>';
        },
        boolYesNo: function(value) {
            return value ? 'Yes' : 'No';
        }
    };

})();
