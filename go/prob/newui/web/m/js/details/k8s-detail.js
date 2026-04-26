// Mobile Kubernetes Detail - Generic tabbed detail popup for all K8s resource types
// Desktop Equivalent: kubernetes/kubernetes-detail.js
(function() {
    'use strict';

    var D = ProblerDetail;

    var detailSections = {
        K8SPod: [
            { title: 'Identity', keys: ['clusterName', 'namespace', 'name', 'key'] },
            { title: 'Status', keys: ['status', 'ready', 'restarts', 'age'] },
            { title: 'Scheduling', keys: ['ip', 'node', 'nominatedNode', 'readinessGates'] },
            { title: 'Containers', custom: 'containers' }
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

            // Custom renderer dispatch — mirrors desktop kubernetes-detail.js.
            // Currently only "containers" is implemented (pod containers).
            if (section.custom === 'containers') {
                html += renderContainers(item.containersJson);
            } else {
                for (var k = 0; k < section.keys.length; k++) {
                    var key = section.keys[k];
                    var col = columnMap[key];
                    var label = col ? col.label : formatKeyLabel(key);
                    var value = getNestedValue(item, key);
                    var displayValue = renderValue(item, col, value);
                    html += D.rowHtml(label, displayValue);
                }
            }
            html += '</div>';
        }
        return html;
    }

    // renderContainers parses K8sPod.containers_json and renders one
    // stacked card per container with its image / imagePullPolicy / ports /
    // env / resources / volumeMounts. Non-silent-fallback rule:
    //   • empty/missing → "—"
    //   • parse failure → console.warn + raw JSON in a code block
    function renderContainers(jsonStr) {
        if (jsonStr === null || jsonStr === undefined || jsonStr === '') {
            return '<div style="color:var(--layer8d-text-muted);padding:8px 0;">—</div>';
        }
        var list;
        try {
            list = JSON.parse(jsonStr);
        } catch (e) {
            if (typeof console !== 'undefined' && console.warn) {
                console.warn('K8s pod containers_json parse failed:', e, jsonStr);
            }
            return '<pre style="background:var(--layer8d-bg-light);border:1px solid var(--layer8d-border);' +
                'border-radius:4px;padding:8px;font-size:11px;overflow-x:auto;max-height:150px;overflow-y:auto;' +
                'white-space:pre;margin:0;">' + D.esc(jsonStr) + '</pre>';
        }
        if (!Array.isArray(list) || list.length === 0) {
            return '<div style="color:var(--layer8d-text-muted);padding:8px 0;">—</div>';
        }
        var html = '';
        for (var i = 0; i < list.length; i++) {
            html += renderContainerCard(list[i]);
        }
        return html;
    }

    function renderContainerCard(c) {
        if (!c || typeof c !== 'object') return '';
        var html = '<div style="border:1px solid var(--layer8d-border);border-radius:6px;'
            + 'padding:10px;margin-bottom:10px;background:var(--layer8d-bg-white);">';

        // Header
        html += '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:8px;">';
        html += '<span style="font-weight:600;color:var(--layer8d-text-dark);font-size:13px;">'
            + D.esc(c.name || '(unnamed)') + '</span>';
        if (c.kind) html += pill(c.kind, c.kind === 'init' ? 'initContainer' : 'container');
        if (c.state) html += pill(c.state);
        if (c.ready === true) html += pill('ready', 'ready');
        else if (c.ready === false) html += pill('not ready', 'notready');
        if (typeof c.restartCount === 'number' && c.restartCount > 0) {
            html += pill('restarts: ' + c.restartCount);
        }
        html += '</div>';

        // Meta: image / imagePullPolicy
        html += D.rowHtml('Image', escOrDash(c.image));
        html += D.rowHtml('Image Pull Policy', escOrDash(c.imagePullPolicy));

        // Ports
        if (c.ports && c.ports.length) {
            html += '<div style="font-size:10px;font-weight:600;color:var(--layer8d-text-medium);'
                + 'text-transform:uppercase;margin:8px 0 4px;letter-spacing:0.4px;">Ports</div>';
            for (var p = 0; p < c.ports.length; p++) {
                var port = c.ports[p] || {};
                var portStr = (port.containerPort != null ? port.containerPort : '?')
                    + '/' + (port.protocol || 'TCP')
                    + (port.name ? ' (' + port.name + ')' : '');
                html += D.rowHtml('Port ' + (p + 1), D.esc(portStr));
            }
        }

        // Env
        if (c.env && c.env.length) {
            html += '<div style="font-size:10px;font-weight:600;color:var(--layer8d-text-medium);'
                + 'text-transform:uppercase;margin:8px 0 4px;letter-spacing:0.4px;">Environment</div>';
            for (var e = 0; e < c.env.length; e++) {
                var env = c.env[e] || {};
                var val = env.value;
                if (val === undefined && env.valueFrom) {
                    val = '<from: ' + JSON.stringify(env.valueFrom) + '>';
                }
                html += D.rowHtml(D.esc(env.name || ''), D.esc(strOr(val, '')));
            }
        }

        // Resources
        if (c.resources && (c.resources.requests || c.resources.limits)) {
            html += '<div style="font-size:10px;font-weight:600;color:var(--layer8d-text-medium);'
                + 'text-transform:uppercase;margin:8px 0 4px;letter-spacing:0.4px;">Resources</div>';
            if (c.resources.requests) {
                html += D.rowHtml('Requests CPU', escOrDash(c.resources.requests.cpu));
                html += D.rowHtml('Requests Mem', escOrDash(c.resources.requests.memory));
            }
            if (c.resources.limits) {
                html += D.rowHtml('Limits CPU', escOrDash(c.resources.limits.cpu));
                html += D.rowHtml('Limits Mem', escOrDash(c.resources.limits.memory));
            }
        }

        // Volume mounts
        if (c.volumeMounts && c.volumeMounts.length) {
            html += '<div style="font-size:10px;font-weight:600;color:var(--layer8d-text-medium);'
                + 'text-transform:uppercase;margin:8px 0 4px;letter-spacing:0.4px;">Volume Mounts</div>';
            for (var v = 0; v < c.volumeMounts.length; v++) {
                var m = c.volumeMounts[v] || {};
                var mount = (m.mountPath || '?') + (m.readOnly ? ' (ro)' : '')
                    + (m.subPath ? ' subPath=' + m.subPath : '');
                html += D.rowHtml(D.esc(m.name || ''), D.esc(mount));
            }
        }

        html += '</div>';
        return html;
    }

    function pill(text, variant) {
        var bg = 'var(--layer8d-bg-light)';
        var color = 'var(--layer8d-text-medium)';
        var border = 'var(--layer8d-border)';
        if (variant === 'ready') {
            bg = 'rgba(34,197,94,0.12)'; color = 'var(--layer8d-success,#16a34a)'; border = color;
        } else if (variant === 'notready') {
            bg = 'rgba(239,68,68,0.12)'; color = 'var(--layer8d-error,#dc2626)'; border = color;
        } else if (variant === 'initContainer') {
            color = 'var(--layer8d-primary)'; border = color;
        }
        return '<span style="display:inline-block;font-size:10px;font-weight:600;'
            + 'padding:2px 8px;border-radius:10px;background:' + bg + ';color:' + color + ';'
            + 'border:1px solid ' + border + ';text-transform:lowercase;letter-spacing:0.3px;">'
            + D.esc(text) + '</span>';
    }

    function escOrDash(v) {
        if (v === null || v === undefined || v === '') {
            return '<span style="color:var(--layer8d-text-muted);">—</span>';
        }
        return D.esc(String(v));
    }

    function strOr(v, fallback) {
        if (v === null || v === undefined || v === '') return fallback;
        return String(v);
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
