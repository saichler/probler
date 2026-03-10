/**
 * Mobile Kubernetes Module - Enum Definitions
 * Desktop Equivalent: probler/k8s/k8s-enums.js
 */
(function() {
    'use strict';

    window.MobileK8s = window.MobileK8s || {};

    const POD_STATUS = {
        0: 'Invalid',
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

    const POD_STATUS_CLASSES = {
        'Running': 'status-active',
        'Succeeded': 'status-active',
        'Completed': 'status-active',
        'Pending': 'status-pending',
        'ContainerCreating': 'status-pending',
        'Terminating': 'status-pending',
        'Failed': 'status-terminated',
        'Error': 'status-terminated',
        'CrashLoopBackOff': 'status-terminated',
        'ImagePullBackOff': 'status-terminated',
        'Unknown': 'status-inactive',
        'Invalid': 'status-inactive'
    };

    function getPodStatusText(statusValue) {
        if (typeof statusValue === 'string') return statusValue;
        return POD_STATUS[statusValue] || 'Unknown';
    }

    function getPodStatusClass(statusText) {
        return POD_STATUS_CLASSES[statusText] || 'status-pending';
    }

    function getNodeStatusClass(status) {
        if (status === 'Ready') return 'status-active';
        if (status === 'SchedulingDisabled') return 'status-pending';
        return 'status-terminated';
    }

    MobileK8s.enums = {
        POD_STATUS,
        POD_STATUS_CLASSES,
        getPodStatusText,
        getPodStatusClass,
        getNodeStatusClass
    };

    MobileK8s.render = {
        podStatus: function(value) {
            var text = getPodStatusText(value);
            var cls = getPodStatusClass(text);
            return '<span class="status-badge ' + cls + '">' + text + '</span>';
        },
        nodeStatus: function(value) {
            var cls = getNodeStatusClass(value);
            return '<span class="status-badge ' + cls + '">' + (value || 'Unknown') + '</span>';
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
        }
    };

})();
