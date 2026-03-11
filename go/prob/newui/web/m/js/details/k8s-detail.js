/**
 * Kubernetes Detail Popups - Mobile v2 (Node, Pod, Deployment)
 * These 3 resource types fetch detailed data via POST to /0/exec
 */
(function() {
    'use strict';

    var D = ProblerDetail;
    var row = D.row;

    // Shared: fetch K8s detail from exec endpoint
    async function fetchK8sDetail(jobName, args, itemName) {
        try {
            var url = Layer8DConfig.resolveEndpoint('/0/exec');
            var response = await Layer8MAuth.makeAuthenticatedRequest(url, {
                method: 'POST',
                body: JSON.stringify({
                    targetId: 'lab', hostId: 'lab',
                    pollarisName: 'kubernetes',
                    jobName: jobName,
                    arguments: args
                })
            });
            if (!response || !response.ok) return null;
            var data = await response.json();
            if (!data || !data.result) return null;
            var decoded = atob(data.result);
            var jsonStart = decoded.indexOf('{');
            if (jsonStart > 0) decoded = decoded.substring(jsonStart);
            var parsed = JSON.parse(decoded);
            if (parsed && parsed.items && parsed.items.length > 0) {
                return parsed.items.find(function(i) { return i.metadata.name === itemName; }) || parsed.items[0];
            }
            if (parsed && parsed.metadata && parsed.metadata.name) return parsed;
            return null;
        } catch (e) { return null; }
    }

    // Shared: render key-value table
    function kvTable(obj) {
        if (!obj || typeof obj !== 'object') return '<p style="color: var(--layer8d-text-muted);">None</p>';
        var entries = Object.entries(obj);
        if (entries.length === 0) return '<p style="color: var(--layer8d-text-muted);">None</p>';
        var html = '<div style="overflow-x: auto;"><table class="net-detail-table"><thead><tr><th>Key</th><th>Value</th></tr></thead><tbody>';
        entries.forEach(function(e) {
            html += '<tr><td style="font-size:0.75rem;">' + D.esc(e[0]) + '</td><td style="font-size:0.75rem; word-break:break-all;">' + D.esc(e[1]) + '</td></tr>';
        });
        return html + '</tbody></table></div>';
    }

    function conditionBadge(status) {
        var cls = status === 'True' ? 'status-active' : 'status-terminated';
        return '<span class="status-badge ' + cls + '">' + D.esc(status) + '</span>';
    }

    // ── NODE DETAIL ───────────────────────────────────────────────
    window.showK8sNodeDetail = async function(node, cluster) {
        var details = await fetchK8sDetail('nodedetails', { nodename: node.name }, node.name);
        if (!details) {
            D.showTabbedPopup('Node: ' + node.name, [
                { id: 'info', label: 'Info', content: '<div class="detail-section">' + row('Name', node.name) + row('Status', node.status) + row('Roles', node.roles) + '<p style="color:var(--layer8d-error);padding:12px;">Could not fetch node details.</p></div>' }
            ]);
            return;
        }
        var md = details.metadata;
        var st = details.status;
        var ni = st.nodeInfo || {};

        var tabs = [
            { id: 'overview', label: 'Overview', content:
                '<div class="detail-section"><div class="detail-section-title">Metadata</div>' +
                row('Name', md.name) + row('UID', md.uid) + row('Created', md.creationTimestamp) +
                row('Resource Version', md.resourceVersion) + row('Age', node.age) + row('Cluster', cluster) +
                '</div><div class="detail-section"><div class="detail-section-title">Spec</div>' +
                row('Pod CIDR', details.spec.podCIDR) +
                row('Pod CIDRs', details.spec.podCIDRs ? details.spec.podCIDRs.join(', ') : '') +
                '</div>'
            },
            { id: 'labels', label: 'Labels', content: '<div class="detail-section"><div class="detail-section-title">Labels</div>' + kvTable(md.labels) + '</div>' },
            { id: 'annotations', label: 'Annotations', content: '<div class="detail-section"><div class="detail-section-title">Annotations</div>' + kvTable(md.annotations) + '</div>' },
            { id: 'addresses', label: 'Addresses', content: buildAddressesTab(st.addresses) },
            { id: 'resources', label: 'Resources', content: buildResourcesTab(st) },
            { id: 'conditions', label: 'Conditions', content: buildNodeConditionsTab(st.conditions) },
            { id: 'system', label: 'System', content: buildSystemInfoTab(ni, st) },
            { id: 'images', label: 'Images', content: buildImagesTab(st.images) }
        ];
        D.showTabbedPopup('Node: ' + node.name, tabs);
    };

    function buildAddressesTab(addresses) {
        if (!addresses || addresses.length === 0) return '<p style="color:var(--layer8d-text-muted);text-align:center;padding:40px;">No addresses</p>';
        var html = '<div style="overflow-x:auto;"><table class="net-detail-table"><thead><tr><th>Type</th><th>Address</th></tr></thead><tbody>';
        addresses.forEach(function(a) { html += '<tr><td>' + D.esc(a.type) + '</td><td>' + D.esc(a.address) + '</td></tr>'; });
        return html + '</tbody></table></div>';
    }

    function buildResourcesTab(st) {
        var html = '<div class="detail-section"><div class="detail-section-title">Capacity</div>' + kvTable(st.capacity) + '</div>';
        html += '<div class="detail-section"><div class="detail-section-title">Allocatable</div>' + kvTable(st.allocatable) + '</div>';
        return html;
    }

    function buildNodeConditionsTab(conditions) {
        if (!conditions || conditions.length === 0) return '<p style="color:var(--layer8d-text-muted);text-align:center;padding:40px;">No conditions</p>';
        var html = '<div style="overflow-x:auto;"><table class="net-detail-table"><thead><tr><th>Type</th><th>Status</th><th>Reason</th><th>Message</th></tr></thead><tbody>';
        conditions.forEach(function(c) {
            html += '<tr><td>' + D.esc(c.type) + '</td><td>' + conditionBadge(c.status) + '</td><td>' + D.esc(c.reason) + '</td><td style="max-width:200px;font-size:0.7rem;">' + D.esc(c.message) + '</td></tr>';
        });
        return html + '</tbody></table></div>';
    }

    function buildSystemInfoTab(ni, st) {
        return '<div class="detail-section"><div class="detail-section-title">Node Info</div>' +
            row('OS Image', ni.osImage) + row('Kernel Version', ni.kernelVersion) +
            row('Container Runtime', ni.containerRuntimeVersion) + row('Kubelet Version', ni.kubeletVersion) +
            row('Kube-Proxy Version', ni.kubeProxyVersion) + row('Architecture', ni.architecture) +
            row('Operating System', ni.operatingSystem) + row('Machine ID', ni.machineID) +
            row('System UUID', ni.systemUUID) + row('Boot ID', ni.bootID) +
            '</div><div class="detail-section"><div class="detail-section-title">Daemon Endpoints</div>' +
            row('Kubelet Port', st.daemonEndpoints ? st.daemonEndpoints.kubeletEndpoint.Port : '') +
            '</div>';
    }

    function buildImagesTab(images) {
        if (!images || images.length === 0) return '<p style="color:var(--layer8d-text-muted);text-align:center;padding:40px;">No images</p>';
        var html = '<div class="detail-section"><div class="detail-section-title">Container Images (' + images.length + ')</div>' +
            '<div style="overflow-x:auto;"><table class="net-detail-table"><thead><tr><th>Image</th><th>Size</th></tr></thead><tbody>';
        var shown = images.slice(0, 20);
        shown.forEach(function(img) {
            html += '<tr><td style="font-size:0.7rem;word-break:break-all;">' + D.esc(img.names ? img.names[0] : '') + '</td><td>' + D.formatBytes(img.sizeBytes) + '</td></tr>';
        });
        if (images.length > 20) html += '<tr><td colspan="2" style="text-align:center;font-style:italic;color:var(--layer8d-text-muted);">...and ' + (images.length - 20) + ' more</td></tr>';
        return html + '</tbody></table></div></div>';
    }

    // ── POD DETAIL ────────────────────────────────────────────────
    window.showK8sPodDetail = async function(pod, cluster) {
        var details = await fetchK8sDetail('poddetails', { namespace: pod.namespace, podname: pod.name }, pod.name);
        if (!details) {
            D.showTabbedPopup('Pod: ' + pod.name, [
                { id: 'info', label: 'Info', content: '<div class="detail-section">' + row('Name', pod.name) + row('Namespace', pod.namespace) + row('Node', pod.node) + '<p style="color:var(--layer8d-error);padding:12px;">Could not fetch pod details.</p></div>' }
            ]);
            return;
        }
        var md = details.metadata;
        var spec = details.spec;
        var st = details.status;
        var containers = (spec && spec.containers) || [];
        var statuses = (st && st.containerStatuses) || [];

        var tabs = [
            { id: 'overview', label: 'Overview', content: buildPodOverview(md, spec, st, cluster, containers) },
            { id: 'metadata', label: 'Metadata', content: buildPodMetadata(md) },
            { id: 'spec', label: 'Spec', content: buildPodSpec(spec) },
            { id: 'containers', label: 'Containers', content: buildPodContainers(containers, statuses) },
            { id: 'volumes', label: 'Volumes', content: buildPodVolumes(spec.volumes) },
            { id: 'conditions', label: 'Conditions', content: buildPodConditions(st.conditions) },
            { id: 'status', label: 'Status', content: buildPodStatus(st) }
        ];
        D.showTabbedPopup('Pod: ' + pod.name, tabs);
    };

    function buildPodOverview(md, spec, st, cluster, containers) {
        var images = containers.map(function(c) { return c.image || ''; }).join(', ');
        return '<div class="detail-section"><div class="detail-section-title">Pod Information</div>' +
            row('Name', md.name) + row('Namespace', md.namespace) + row('UID', md.uid) +
            row('Cluster', cluster) + row('Phase', st.phase) + row('QoS Class', st.qosClass) +
            row('Node', spec.nodeName) + row('Pod IP', st.podIP) + row('Host IP', st.hostIP) +
            row('Start Time', st.startTime) + row('Images', images) + '</div>';
    }

    function buildPodMetadata(md) {
        var html = '<div class="detail-section"><div class="detail-section-title">Metadata</div>' +
            row('Name', md.name) + row('Generate Name', md.generateName) +
            row('Namespace', md.namespace) + row('UID', md.uid) +
            row('Resource Version', md.resourceVersion) + row('Created', md.creationTimestamp) +
            '</div><div class="detail-section"><div class="detail-section-title">Labels</div>' + kvTable(md.labels) + '</div>';
        if (md.ownerReferences && md.ownerReferences.length > 0) {
            html += '<div class="detail-section"><div class="detail-section-title">Owner References</div>';
            md.ownerReferences.forEach(function(ref) {
                html += row(ref.kind, ref.name);
            });
            html += '</div>';
        }
        return html;
    }

    function buildPodSpec(spec) {
        var html = '<div class="detail-section"><div class="detail-section-title">Pod Spec</div>' +
            row('Node', spec.nodeName) + row('Service Account', spec.serviceAccountName || 'default') +
            row('Restart Policy', spec.restartPolicy || 'Always') + row('DNS Policy', spec.dnsPolicy || 'ClusterFirst') +
            row('Scheduler', spec.schedulerName || 'default-scheduler') +
            row('Priority', spec.priority != null ? spec.priority : '') +
            row('Termination Grace', (spec.terminationGracePeriodSeconds || 30) + 's') +
            row('Host Network', spec.hostNetwork ? 'Yes' : 'No') + '</div>';
        if (spec.tolerations && spec.tolerations.length > 0) {
            html += '<div class="detail-section"><div class="detail-section-title">Tolerations</div>';
            spec.tolerations.forEach(function(t) { html += row(t.key || '(all)', (t.operator || '') + ' ' + (t.effect || '')); });
            html += '</div>';
        }
        return html;
    }

    function buildPodContainers(containers, statuses) {
        var html = '';
        containers.forEach(function(c, idx) {
            var s = statuses[idx];
            var running = s && s.state && s.state.running;
            html += '<div class="detail-section"><div class="detail-section-title">Container: ' + D.esc(c.name) + '</div>' +
                row('Image', c.image) + row('Pull Policy', c.imagePullPolicy) +
                row('State', running ? 'Running' : 'Not Running') +
                row('Ready', s ? String(s.ready) : '') + row('Restarts', s ? s.restartCount : '') +
                row('Started', s ? String(s.started) : '') + '</div>';
        });
        return html || '<p style="color:var(--layer8d-text-muted);text-align:center;padding:40px;">No containers</p>';
    }

    function buildPodVolumes(volumes) {
        if (!volumes || volumes.length === 0) return '<p style="color:var(--layer8d-text-muted);text-align:center;padding:40px;">No volumes</p>';
        var html = '<div class="detail-section"><div class="detail-section-title">Volumes</div>';
        volumes.forEach(function(v) {
            var type = 'Unknown', detail = '';
            if (v.configMap) { type = 'ConfigMap'; detail = v.configMap.name; }
            else if (v.secret) { type = 'Secret'; detail = v.secret.secretName; }
            else if (v.emptyDir) { type = 'EmptyDir'; detail = v.emptyDir.medium || 'Default'; }
            else if (v.hostPath) { type = 'HostPath'; detail = v.hostPath.path; }
            else if (v.persistentVolumeClaim) { type = 'PVC'; detail = v.persistentVolumeClaim.claimName; }
            else if (v.projected) { type = 'Projected'; detail = v.projected.sources.length + ' sources'; }
            html += row(v.name, type + ': ' + detail);
        });
        return html + '</div>';
    }

    function buildPodConditions(conditions) {
        if (!conditions || conditions.length === 0) return '<p style="color:var(--layer8d-text-muted);text-align:center;padding:40px;">No conditions</p>';
        var html = '<div style="overflow-x:auto;"><table class="net-detail-table"><thead><tr><th>Type</th><th>Status</th><th>Last Transition</th></tr></thead><tbody>';
        conditions.forEach(function(c) {
            html += '<tr><td>' + D.esc(c.type) + '</td><td>' + conditionBadge(c.status) + '</td><td style="font-size:0.75rem;">' + D.esc(c.lastTransitionTime || '') + '</td></tr>';
        });
        return html + '</tbody></table></div>';
    }

    function buildPodStatus(st) {
        var podIPs = st.podIPs || (st.podIP ? [{ ip: st.podIP }] : []);
        return '<div class="detail-section"><div class="detail-section-title">Runtime Status</div>' +
            row('Phase', st.phase) + row('QoS Class', st.qosClass) + row('Start Time', st.startTime) +
            row('Pod IP', st.podIP) + row('Host IP', st.hostIP) +
            row('Pod IPs', podIPs.map(function(x) { return x.ip || x; }).join(', ')) +
            '</div>';
    }

    // ── DEPLOYMENT DETAIL ─────────────────────────────────────────
    window.showK8sDeploymentDetail = async function(dep, cluster) {
        var details = await fetchK8sDetail('deploymentdetails', { namespace: dep.namespace, deploymentname: dep.name }, dep.name);
        if (!details) {
            D.showTabbedPopup('Deployment: ' + dep.name, [
                { id: 'info', label: 'Info', content: '<div class="detail-section">' + row('Name', dep.name) + row('Namespace', dep.namespace) + '<p style="color:var(--layer8d-error);padding:12px;">Could not fetch deployment details.</p></div>' }
            ]);
            return;
        }
        var md = details.metadata;
        var spec = details.spec;
        var st = details.status;
        var tmpl = spec.template;

        var tabs = [
            { id: 'overview', label: 'Overview', content:
                '<div class="detail-section"><div class="detail-section-title">Deployment Information</div>' +
                row('Name', md.name) + row('Namespace', md.namespace) + row('UID', md.uid) +
                row('Cluster', cluster) + row('Generation', md.generation) +
                row('Created', md.creationTimestamp) + row('Replicas', spec.replicas) +
                row('Ready', (st.readyReplicas || 0) + '/' + spec.replicas) + '</div>'
            },
            { id: 'metadata', label: 'Metadata', content:
                '<div class="detail-section"><div class="detail-section-title">Metadata</div>' +
                row('Name', md.name) + row('Namespace', md.namespace) + row('UID', md.uid) +
                row('Resource Version', md.resourceVersion) + row('Generation', md.generation) +
                row('Created', md.creationTimestamp) + '</div>' +
                '<div class="detail-section"><div class="detail-section-title">Labels</div>' + kvTable(md.labels) + '</div>' +
                '<div class="detail-section"><div class="detail-section-title">Annotations</div>' + kvTable(md.annotations) + '</div>'
            },
            { id: 'spec', label: 'Spec', content: buildDeploymentSpec(spec) },
            { id: 'template', label: 'Template', content: buildDeploymentTemplate(tmpl) },
            { id: 'conditions', label: 'Conditions', content: buildDeploymentConditions(st.conditions) },
            { id: 'status', label: 'Status', content:
                '<div class="detail-section"><div class="detail-section-title">Replica Status</div>' +
                row('Replicas', st.replicas) + row('Updated', st.updatedReplicas) +
                row('Ready', st.readyReplicas) + row('Available', st.availableReplicas) +
                row('Observed Generation', st.observedGeneration) + '</div>'
            }
        ];
        D.showTabbedPopup('Deployment: ' + dep.name, tabs);
    };

    function buildDeploymentSpec(spec) {
        var strategy = spec.strategy || {};
        var rolling = strategy.rollingUpdate || {};
        var html = '<div class="detail-section"><div class="detail-section-title">Deployment Spec</div>' +
            row('Replicas', spec.replicas) + row('Revision History Limit', spec.revisionHistoryLimit) +
            row('Progress Deadline', (spec.progressDeadlineSeconds || '') + 's') +
            row('Strategy', strategy.type) + row('Max Unavailable', rolling.maxUnavailable) +
            row('Max Surge', rolling.maxSurge) + '</div>';
        if (spec.selector && spec.selector.matchLabels) {
            html += '<div class="detail-section"><div class="detail-section-title">Selector</div>' + kvTable(spec.selector.matchLabels) + '</div>';
        }
        return html;
    }

    function buildDeploymentTemplate(tmpl) {
        if (!tmpl) return '<p style="color:var(--layer8d-text-muted);">No template</p>';
        var spec = tmpl.spec || {};
        var html = '<div class="detail-section"><div class="detail-section-title">Pod Template</div>' +
            row('DNS Policy', spec.dnsPolicy) + row('Restart Policy', spec.restartPolicy) +
            row('Scheduler', spec.schedulerName) +
            row('Termination Grace', (spec.terminationGracePeriodSeconds || 30) + 's') + '</div>';
        if (tmpl.metadata && tmpl.metadata.labels) {
            html += '<div class="detail-section"><div class="detail-section-title">Template Labels</div>' + kvTable(tmpl.metadata.labels) + '</div>';
        }
        var containers = (spec.containers || []);
        containers.forEach(function(c) {
            html += '<div class="detail-section"><div class="detail-section-title">Container: ' + D.esc(c.name) + '</div>' +
                row('Image', c.image) + row('Pull Policy', c.imagePullPolicy) + '</div>';
        });
        return html;
    }

    function buildDeploymentConditions(conditions) {
        if (!conditions || conditions.length === 0) return '<p style="color:var(--layer8d-text-muted);text-align:center;padding:40px;">No conditions</p>';
        var html = '<div style="overflow-x:auto;"><table class="net-detail-table"><thead><tr><th>Type</th><th>Status</th><th>Reason</th><th>Message</th></tr></thead><tbody>';
        conditions.forEach(function(c) {
            html += '<tr><td>' + D.esc(c.type) + '</td><td>' + conditionBadge(c.status) + '</td><td>' + D.esc(c.reason) + '</td><td style="max-width:200px;font-size:0.7rem;">' + D.esc(c.message) + '</td></tr>';
        });
        return html + '</tbody></table></div>';
    }

})();
