// Mobile Kubernetes Detail - Generic tabbed detail popup for all K8s resource types
// Desktop Equivalent: kubernetes/kubernetes-detail.js
(function() {
    'use strict';

    var D = ProblerDetail;

    var detailSections = {
        K8SPod: [
            { title: 'Identity', keys: ['clusterName', 'namespace', 'name', 'key'] },
            { title: 'Status', keys: ['status', 'ready', 'restarts', 'age'] },
            { title: 'Scheduling', keys: ['ip', 'node', 'nominatedNode', 'readinessGates'] }
        ],
        K8SNode: [
            { title: 'Identity', keys: ['clusterName', 'name', 'roles', 'status', 'age'] },
            { title: 'Version', keys: ['version', 'containerRuntime'] },
            { title: 'Network', keys: ['internalIp', 'externalIp'] },
            { title: 'System', keys: ['osImage', 'kernelVersion'] }
        ],
        K8SDeployment: [
            { title: 'Identity', keys: ['clusterName', 'namespace', 'name', 'key'] },
            { title: 'Status', keys: ['ready', 'upToDate', 'available', 'age'] },
            { title: 'Spec', keys: ['containers', 'images', 'selector'] }
        ],
        K8SService: [
            { title: 'Identity', keys: ['clusterName', 'namespace', 'name', 'key'] },
            { title: 'Networking', keys: ['type', 'clusterIp', 'externalIp', 'ports'] },
            { title: 'Routing', keys: ['selector', 'age'] }
        ],
        K8SEvent: [
            { title: 'Identity', keys: ['clusterName', 'namespace', 'name', 'key'] },
            { title: 'Event', keys: ['type', 'reason', 'object', 'source'] },
            { title: 'Message', keys: ['message'] },
            { title: 'Timing', keys: ['count', 'firstSeen', 'lastSeen'] }
        ],
        K8SVCluster: [
            { title: 'Identity', keys: ['clusterName', 'namespace', 'name', 'key'] },
            { title: 'Status', keys: ['status', 'connected', 'k8sVersion', 'distro', 'age'] },
            { title: 'Synced Resources', keys: ['syncedPods', 'syncedServices', 'syncedIngresses'] }
        ],
        K8SHPA: [
            { title: 'Identity', keys: ['clusterName', 'namespace', 'name', 'key'] },
            { title: 'Scaling', keys: ['reference', 'targets', 'minReplicas', 'maxReplicas', 'currentReplicas'] },
            { title: 'Metadata', keys: ['age'] }
        ],
        K8SPersistentVolume: [
            { title: 'Identity', keys: ['clusterName', 'name', 'key'] },
            { title: 'Storage', keys: ['capacity', 'accessModes', 'volumeMode', 'storageClass'] },
            { title: 'Status', keys: ['status', 'claim', 'reclaimPolicy', 'reason', 'age'] }
        ],
        K8SPersistentVolumeClaim: [
            { title: 'Identity', keys: ['clusterName', 'namespace', 'name', 'key'] },
            { title: 'Storage', keys: ['capacity', 'accessModes', 'volumeMode', 'storageClass'] },
            { title: 'Status', keys: ['status', 'volume', 'age'] }
        ],
        K8SResourceQuota: [
            { title: 'Identity', keys: ['clusterName', 'namespace', 'name', 'key'] },
            { title: 'Requests', keys: ['requestCpu', 'usedRequestCpu', 'requestMemory', 'usedRequestMemory'] },
            { title: 'Limits', keys: ['limitCpu', 'usedLimitCpu', 'limitMemory', 'usedLimitMemory'] },
            { title: 'Metadata', keys: ['age'] }
        ],
        K8SStatefulSet: [
            { title: 'Identity', keys: ['clusterName', 'namespace', 'name', 'key'] },
            { title: 'Status', keys: ['ready', 'age'] },
            { title: 'Spec', keys: ['containers', 'images'] }
        ],
        K8SDaemonSet: [
            { title: 'Identity', keys: ['clusterName', 'namespace', 'name', 'key'] },
            { title: 'Status', keys: ['desired', 'current', 'ready', 'upToDate', 'available', 'age'] },
            { title: 'Spec', keys: ['nodeSelector', 'containers', 'images', 'selector'] }
        ],
        K8SReplicaSet: [
            { title: 'Identity', keys: ['clusterName', 'namespace', 'name', 'key'] },
            { title: 'Status', keys: ['desired', 'current', 'ready', 'age'] }
        ],
        K8SJob: [
            { title: 'Identity', keys: ['clusterName', 'namespace', 'name', 'key'] },
            { title: 'Status', keys: ['completions', 'duration', 'condition', 'age'] }
        ],
        K8SCronJob: [
            { title: 'Identity', keys: ['clusterName', 'namespace', 'name', 'key'] },
            { title: 'Schedule', keys: ['schedule', 'suspend', 'active', 'lastSchedule', 'age'] }
        ],
        K8SIngress: [
            { title: 'Identity', keys: ['clusterName', 'namespace', 'name', 'key'] },
            { title: 'Routing', keys: ['className', 'hosts', 'address', 'ports', 'age'] }
        ],
        K8SStorageClass: [
            { title: 'Identity', keys: ['clusterName', 'name', 'key'] },
            { title: 'Configuration', keys: ['provisioner', 'reclaimPolicy', 'volumeBindingMode', 'allowVolumeExpansion', 'age'] }
        ],
        K8SRoleBinding: [
            { title: 'Identity', keys: ['clusterName', 'namespace', 'name', 'key'] },
            { title: 'Binding', keys: ['roleRef', 'age'] }
        ],
        K8SClusterRoleBinding: [
            { title: 'Identity', keys: ['clusterName', 'name', 'key'] },
            { title: 'Binding', keys: ['roleRef', 'age'] }
        ],
        K8SEndpointSlice: [
            { title: 'Identity', keys: ['clusterName', 'namespace', 'name', 'key'] },
            { title: 'Endpoints', keys: ['addressType', 'ports', 'endpoints', 'age'] }
        ],
        IstioVirtualService: [
            { title: 'Identity', keys: ['clusterName', 'namespace', 'name', 'key'] },
            { title: 'Routing', keys: ['gateways', 'hosts', 'age'] }
        ],
        IstioGateway: [
            { title: 'Identity', keys: ['clusterName', 'namespace', 'name', 'key'] },
            { title: 'Configuration', keys: ['servers', 'selector', 'age'] }
        ],
        IstioServiceEntry: [
            { title: 'Identity', keys: ['clusterName', 'namespace', 'name', 'key'] },
            { title: 'Configuration', keys: ['hosts', 'location', 'resolution', 'ports', 'age'] }
        ],
        K8SCRD: [
            { title: 'Identity', keys: ['clusterName', 'name'] },
            { title: 'Definition', keys: ['group', 'version', 'scope', 'age'] }
        ]
    };

    window.MobileK8sDetail = {};

    MobileK8sDetail.show = function(item, service) {
        if (!item) return;

        var label = service.label || service.model;
        var name = item.name || item.key || '';
        var title = item.namespace ? label + ': ' + item.namespace + '/' + name : label + ': ' + name;

        var columns = MobileK8s.columns[service.model] || [];
        var sections = detailSections[service.model];

        var overviewContent = sections
            ? buildSectionedOverview(item, columns, sections)
            : buildFlatOverview(item, columns);

        var tabs = [
            { id: 'overview', label: 'Overview', content: overviewContent },
            { id: 'allfields', label: 'All Fields', content: buildAllFields(item) },
            { id: 'json', label: 'JSON', content: buildJson(item) }
        ];

        D.showTabbedPopup(title, tabs);
    };

    function buildSectionedOverview(item, columns, sections) {
        var columnMap = {};
        for (var i = 0; i < columns.length; i++) {
            columnMap[columns[i].key] = columns[i];
        }

        var html = '';
        for (var s = 0; s < sections.length; s++) {
            var section = sections[s];
            html += '<div class="detail-section">';
            html += '<div class="detail-section-title">' + D.esc(section.title) + '</div>';

            for (var k = 0; k < section.keys.length; k++) {
                var key = section.keys[k];
                var col = columnMap[key];
                var label = col ? col.label : formatKeyLabel(key);
                var value = getNestedValue(item, key);
                var displayValue = renderValue(item, col, value);
                html += D.rowHtml(label, displayValue);
            }
            html += '</div>';
        }
        return html;
    }

    function buildFlatOverview(item, columns) {
        var html = '<div class="detail-section">';
        for (var i = 0; i < columns.length; i++) {
            var col = columns[i];
            var value = getNestedValue(item, col.key);
            var displayValue = renderValue(item, col, value);
            html += D.rowHtml(col.label, displayValue);
        }
        html += '</div>';
        return html;
    }

    function buildAllFields(item) {
        var keys = Object.keys(item).sort();
        var html = '<div class="detail-section">';
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var value = item[key];
            var displayValue;
            if (value === null || value === undefined || value === '') {
                displayValue = '<span style="color:var(--layer8d-text-muted);">-</span>';
            } else if (typeof value === 'object') {
                displayValue = '<pre style="background:var(--layer8d-bg-light);border:1px solid var(--layer8d-border);' +
                    'border-radius:4px;padding:8px;font-size:11px;overflow-x:auto;max-height:150px;overflow-y:auto;' +
                    'white-space:pre;margin:0;">' + D.esc(JSON.stringify(value, null, 2)) + '</pre>';
            } else {
                displayValue = D.esc(String(value));
            }
            html += D.rowHtml(formatKeyLabel(key), displayValue);
        }
        html += '</div>';
        return html;
    }

    function buildJson(item) {
        return '<pre style="background:var(--layer8d-bg-light);border:1px solid var(--layer8d-border);' +
            'border-radius:6px;padding:16px;font-size:12px;line-height:1.5;color:var(--layer8d-text-dark);' +
            'overflow-x:auto;max-height:500px;overflow-y:auto;white-space:pre;margin:0;">' +
            D.esc(JSON.stringify(item, null, 2)) + '</pre>';
    }

    function renderValue(item, col, value) {
        if (col && col.render) {
            return col.render(item);
        }
        if (value === null || value === undefined || value === '') {
            return '<span style="color:var(--layer8d-text-muted);">-</span>';
        }
        if (typeof value === 'object') {
            return '<pre style="background:var(--layer8d-bg-light);border:1px solid var(--layer8d-border);' +
                'border-radius:4px;padding:8px;font-size:11px;overflow-x:auto;max-height:150px;overflow-y:auto;' +
                'white-space:pre;margin:0;">' + D.esc(JSON.stringify(value, null, 2)) + '</pre>';
        }
        return D.esc(String(value));
    }

    function formatKeyLabel(key) {
        return key.replace(/([A-Z])/g, ' $1')
                   .replace(/^./, function(c) { return c.toUpperCase(); })
                   .trim();
    }

    function getNestedValue(obj, key) {
        if (!obj || !key) return undefined;
        var parts = key.split('.');
        var current = obj;
        for (var i = 0; i < parts.length; i++) {
            if (current === null || current === undefined) return undefined;
            current = current[parts[i]];
        }
        return current;
    }

})();
