// Kubernetes Detail — Tabbed read-only detail popup for any K8s resource
(function() {
    'use strict';

    window.K8sDetail = window.K8sDetail || {};

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

    K8sDetail.show = function(item, service) {
        if (!item) return;

        var title = buildTitle(item, service);
        var columns = ProblerK8s.columns[service.model] || [];
        var sections = detailSections[service.model];
        var html = buildTabbedHtml(item, columns, service, sections);

        Layer8DPopup.show({
            title: title,
            content: html,
            size: 'large',
            showFooter: false
        });
    };

    function buildTitle(item, service) {
        var label = service.label || service.model;
        var name = item.name || item.key || '';
        if (item.namespace) {
            return label + ': ' + item.namespace + '/' + name;
        }
        return label + ': ' + name;
    }

    function buildTabbedHtml(item, columns, service, sections) {
        var html = '<div class="k8s-detail-view">';

        // Tabs
        html += '<div class="probler-popup-tabs">';
        html += '<div class="probler-popup-tab active" data-tab="overview">Overview</div>';
        html += '<div class="probler-popup-tab" data-tab="allfields">All Fields</div>';
        html += '<div class="probler-popup-tab" data-tab="json">JSON</div>';
        html += '</div>';

        // Tab content
        html += '<div class="probler-popup-tab-content">';

        // Overview tab
        html += '<div class="probler-popup-tab-pane active" data-pane="overview">';
        if (sections) {
            html += buildSectionedOverview(item, columns, sections);
        } else {
            html += buildFlatOverview(item, columns);
        }
        html += '</div>';

        // All Fields tab
        html += '<div class="probler-popup-tab-pane" data-pane="allfields">';
        html += buildAllFieldsTable(item);
        html += '</div>';

        // JSON tab
        html += '<div class="probler-popup-tab-pane" data-pane="json">';
        html += '<pre class="k8s-detail-json">' + escapeHtml(JSON.stringify(item, null, 2)) + '</pre>';
        html += '</div>';

        html += '</div>'; // tab-content
        html += '</div>'; // detail-view
        return html;
    }

    function buildSectionedOverview(item, columns, sections) {
        var html = '';
        var columnMap = buildColumnMap(columns);

        for (var s = 0; s < sections.length; s++) {
            var section = sections[s];
            html += '<div class="k8s-detail-section">';
            html += '<h3 class="k8s-detail-section-title">' + escapeHtml(section.title) + '</h3>';
            html += '<table class="k8s-detail-table">';

            for (var k = 0; k < section.keys.length; k++) {
                var key = section.keys[k];
                var col = columnMap[key];
                var label = col ? col.label : formatKeyLabel(key);
                var value = getNestedValue(item, key);
                var displayValue = renderValue(item, col, value);

                html += '<tr>';
                html += '<td class="k8s-detail-label">' + escapeHtml(label) + '</td>';
                html += '<td class="k8s-detail-value">' + displayValue + '</td>';
                html += '</tr>';
            }

            html += '</table>';
            html += '</div>';
        }

        return html;
    }

    function buildFlatOverview(item, columns) {
        var html = '<div class="k8s-detail-section">';
        html += '<table class="k8s-detail-table">';

        for (var i = 0; i < columns.length; i++) {
            var col = columns[i];
            var value = getNestedValue(item, col.key);
            var displayValue = renderValue(item, col, value);

            html += '<tr>';
            html += '<td class="k8s-detail-label">' + escapeHtml(col.label) + '</td>';
            html += '<td class="k8s-detail-value">' + displayValue + '</td>';
            html += '</tr>';
        }

        html += '</table>';
        html += '</div>';
        return html;
    }

    function buildAllFieldsTable(item) {
        var html = '<div class="k8s-detail-section">';
        html += '<table class="k8s-detail-table">';

        var keys = Object.keys(item).sort();
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var value = item[key];
            var displayValue;

            if (value === null || value === undefined || value === '') {
                displayValue = '<span class="k8s-detail-empty">-</span>';
            } else if (typeof value === 'object') {
                displayValue = '<pre class="k8s-detail-inline-json">' +
                    escapeHtml(JSON.stringify(value, null, 2)) + '</pre>';
            } else {
                displayValue = escapeHtml(String(value));
            }

            html += '<tr>';
            html += '<td class="k8s-detail-label">' + escapeHtml(formatKeyLabel(key)) + '</td>';
            html += '<td class="k8s-detail-value">' + displayValue + '</td>';
            html += '</tr>';
        }

        html += '</table>';
        html += '</div>';
        return html;
    }

    function buildColumnMap(columns) {
        var map = {};
        for (var i = 0; i < columns.length; i++) {
            map[columns[i].key] = columns[i];
        }
        return map;
    }

    function renderValue(item, col, value) {
        if (col && col.render) {
            return col.render(item);
        }
        if (value === null || value === undefined || value === '') {
            return '<span class="k8s-detail-empty">-</span>';
        }
        if (typeof value === 'object') {
            return '<pre class="k8s-detail-inline-json">' +
                escapeHtml(JSON.stringify(value, null, 2)) + '</pre>';
        }
        return escapeHtml(String(value));
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

    function escapeHtml(text) {
        if (typeof Layer8DUtils !== 'undefined' && Layer8DUtils.escapeHtml) {
            return Layer8DUtils.escapeHtml(text);
        }
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

})();
