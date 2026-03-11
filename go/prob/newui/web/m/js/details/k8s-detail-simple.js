/**
 * Kubernetes Detail Popups - Mobile v2 (StatefulSet, DaemonSet, Service, Namespace, NetworkPolicy)
 * These resource types use inline table data (no async exec API calls)
 */
(function() {
    'use strict';

    var D = ProblerDetail;
    var row = D.row;

    // ── StatefulSet Detail ──────────────────────────────────────────
    window.showK8sStatefulSetDetail = function(ss) {
        var readyParts = ss.ready ? ss.ready.split('/') : ['0', '0'];
        var readyReplicas = parseInt(readyParts[0]) || 0;
        var totalReplicas = parseInt(readyParts[1]) || 0;
        var containerList = ss.containers ? ss.containers.split(',') : [];
        var imageList = ss.images ? ss.images.split(',') : [];

        var overviewContent =
            '<div class="detail-section">' +
                '<div class="detail-section-title">StatefulSet Information</div>' +
                row('Name', ss.name) +
                row('Namespace', ss.namespace) +
                row('Age', ss.age) +
                row('Replicas', totalReplicas) +
                row('Ready Replicas', '<span style="color:' +
                    (readyReplicas === totalReplicas ? 'var(--layer8d-success)' : 'var(--layer8d-warning)') +
                    '">' + readyReplicas + '/' + totalReplicas + '</span>') +
            '</div>';

        var templateContent = '<div class="detail-section">' +
            '<div class="detail-section-title">Containers</div>';
        containerList.forEach(function(name, idx) {
            templateContent +=
                '<div style="background:var(--layer8d-bg-light);padding:12px;border-radius:8px;margin-bottom:12px;">' +
                    '<div style="color:var(--layer8d-primary);font-weight:600;margin-bottom:8px;">' +
                        D.esc(name.trim()) + '</div>' +
                    row('Image', (imageList[idx] || '').trim() || 'N/A') +
                '</div>';
        });
        if (containerList.length === 0) {
            templateContent += '<p style="color:var(--layer8d-text-muted);text-align:center;padding:20px;">No containers</p>';
        }
        templateContent += '</div>';

        var statusContent =
            '<div class="detail-section">' +
                '<div class="detail-section-title">Replica Status</div>' +
                row('Total Replicas', totalReplicas) +
                row('Ready Replicas', readyReplicas) +
            '</div>';

        D.showTabbedPopup(ss.name, [
            { id: 'overview', label: 'Overview', content: overviewContent },
            { id: 'template', label: 'Template', content: templateContent },
            { id: 'status', label: 'Status', content: statusContent }
        ]);
    };

    // ── DaemonSet Detail ────────────────────────────────────────────
    window.showK8sDaemonSetDetail = function(ds) {
        var containerList = ds.containers ? ds.containers.split(',') : [];
        var imageList = ds.images ? ds.images.split(',') : [];
        var desired = parseInt(ds.desired) || 0;
        var current = parseInt(ds.current) || 0;
        var ready = parseInt(ds.ready) || 0;
        var available = parseInt(ds.available) || 0;
        var upToDate = parseInt(ds.upToDate) || 0;
        var coverage = desired > 0 ? ((ready / desired) * 100).toFixed(1) : '0';

        var overviewContent =
            '<div class="detail-section">' +
                '<div class="detail-section-title">DaemonSet Information</div>' +
                row('Name', ds.name) +
                row('Namespace', ds.namespace) +
                row('Age', ds.age) +
                row('Desired Scheduled', desired) +
                row('Current Scheduled', '<span style="color:' +
                    (current === desired ? 'var(--layer8d-success)' : 'var(--layer8d-warning)') +
                    '">' + current + '/' + desired + '</span>') +
            '</div>';

        var templateContent = '<div class="detail-section">' +
            '<div class="detail-section-title">Containers</div>';
        containerList.forEach(function(name, idx) {
            templateContent +=
                '<div style="background:var(--layer8d-bg-light);padding:12px;border-radius:8px;margin-bottom:12px;">' +
                    '<div style="color:var(--layer8d-primary);font-weight:600;margin-bottom:8px;">' +
                        D.esc(name.trim()) + '</div>' +
                    row('Image', (imageList[idx] || '').trim() || 'N/A') +
                '</div>';
        });
        if (containerList.length === 0) {
            templateContent += '<p style="color:var(--layer8d-text-muted);text-align:center;padding:20px;">No containers</p>';
        }
        templateContent += '</div>';

        var statusContent =
            '<div class="detail-section">' +
                '<div class="detail-section-title">DaemonSet Status</div>' +
                row('Current Number Scheduled', current) +
                row('Desired Number Scheduled', desired) +
                row('Number Ready', ready) +
                row('Number Available', available) +
                row('Updated Number Scheduled', upToDate) +
            '</div>' +
            '<div class="detail-section">' +
                '<div class="detail-section-title">Node Distribution</div>' +
                row('Pods Running', ready + ' of ' + desired + ' nodes') +
                row('Coverage', coverage + '%') +
            '</div>';

        D.showTabbedPopup(ds.name, [
            { id: 'overview', label: 'Overview', content: overviewContent },
            { id: 'template', label: 'Template', content: templateContent },
            { id: 'status', label: 'Status', content: statusContent }
        ]);
    };

    // ── Service Detail ──────────────────────────────────────────────
    window.showK8sServiceDetail = function(svc) {
        var portEntries = [];
        if (svc.ports) {
            svc.ports.split(',').forEach(function(p) {
                var parts = p.trim().split(':');
                var port = parseInt(parts[0]) || 0;
                var targetPart = parts[1] || parts[0];
                var tpParts = targetPart.split('/');
                portEntries.push({
                    port: port,
                    protocol: tpParts[1] || 'TCP',
                    targetPort: parseInt(tpParts[0]) || port
                });
            });
        }

        var overviewContent =
            '<div class="detail-section">' +
                '<div class="detail-section-title">Service Information</div>' +
                row('Name', svc.name) +
                row('Namespace', svc.namespace) +
                row('Age', svc.age) +
                row('Type', svc.type || 'N/A') +
                row('Cluster IP', svc.clusterIp || 'N/A') +
                row('External IP', svc.externalIp || 'None') +
                (svc.selector ? row('Selector', svc.selector) : '') +
            '</div>';

        var portsContent = '<div class="detail-section">' +
            '<div class="detail-section-title">Service Ports</div>';
        if (portEntries.length > 0) {
            portsContent += '<table style="width:100%;border-collapse:collapse;font-size:14px;">' +
                '<thead><tr style="border-bottom:2px solid var(--layer8d-border);">' +
                    '<th style="text-align:left;padding:8px;">Port</th>' +
                    '<th style="text-align:left;padding:8px;">Target</th>' +
                    '<th style="text-align:left;padding:8px;">Protocol</th>' +
                '</tr></thead><tbody>';
            portEntries.forEach(function(pe) {
                portsContent += '<tr style="border-bottom:1px solid var(--layer8d-border);">' +
                    '<td style="padding:8px;">' + pe.port + '</td>' +
                    '<td style="padding:8px;">' + pe.targetPort + '</td>' +
                    '<td style="padding:8px;">' + pe.protocol + '</td>' +
                '</tr>';
            });
            portsContent += '</tbody></table>';
        } else {
            portsContent += '<p style="color:var(--layer8d-text-muted);text-align:center;padding:20px;">No ports configured</p>';
        }
        portsContent += '</div>';

        var statusContent = '<div class="detail-section">' +
            '<div class="detail-section-title">Service Status</div>';
        if (svc.type === 'LoadBalancer' && svc.externalIp && svc.externalIp !== '<none>') {
            statusContent += row('External IP', svc.externalIp);
        } else {
            statusContent += '<p style="color:var(--layer8d-text-muted);text-align:center;padding:20px;">No load balancer status available</p>';
        }
        statusContent += '</div>';

        D.showTabbedPopup(svc.name, [
            { id: 'overview', label: 'Overview', content: overviewContent },
            { id: 'ports', label: 'Ports', content: portsContent },
            { id: 'status', label: 'Status', content: statusContent }
        ]);
    };

    // ── Namespace Detail ────────────────────────────────────────────
    window.showK8sNamespaceDetail = function(ns) {
        var statusColor = ns.status === 'Active' ? 'var(--layer8d-success)' : 'var(--layer8d-warning)';
        var content =
            '<div class="detail-section">' +
                '<div class="detail-section-title">Namespace Information</div>' +
                row('Name', ns.name) +
                row('Status', '<span style="color:' + statusColor + '">' + D.esc(ns.status || '') + '</span>') +
                row('Age', ns.age) +
            '</div>';

        D.showTabbedPopup(ns.name, [
            { id: 'info', label: 'Info', content: content }
        ]);
    };

    // ── Network Policy Detail ───────────────────────────────────────
    window.showK8sNetworkPolicyDetail = function(np) {
        var content =
            '<div class="detail-section">' +
                '<div class="detail-section-title">Network Policy Information</div>' +
                row('Name', np.name) +
                row('Namespace', np.namespace) +
                row('Pod Selector', np.podSelector || 'N/A') +
                row('Age', np.age) +
            '</div>' +
            '<div class="detail-section">' +
                '<div class="detail-section-title">Rules</div>' +
                row('Policy Types', np.policyTypes || 'N/A') +
                row('Ingress Rules', np.ingressRules || 0) +
                row('Egress Rules', np.egressRules || 0) +
            '</div>';

        D.showTabbedPopup(np.name, [
            { id: 'info', label: 'Info', content: content }
        ]);
    };

})();
