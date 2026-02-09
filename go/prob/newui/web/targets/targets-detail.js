// Layer 8 Ecosystem - Target Detail View (read-only row click popup)
// Uses detail-* CSS classes from layer8d-popup-content.css (same pattern as network devices)

function showTargetDetailsModal(target) {
    var stateLabel = TARGET_STATES[target.state] || 'Unknown';
    var stateIsUp = target.state === 2;
    var statusClass = stateIsUp ? 'status-online' : 'status-offline';

    var titleHtml = '<div class="probler-popup-title-wrapper">' +
        '<h3 class="probler-popup-title">Target Details - ' + escapeHtml(target.targetId) + '</h3>' +
        '<span class="probler-popup-status-badge ' + statusClass + '">' +
        escapeHtml(stateLabel.toUpperCase()) + '</span>' +
        '</div>';

    var contentHtml = generateTargetDetailContent(target);

    if (window.parent !== window) {
        window.parent.postMessage({
            type: 'probler-popup-show',
            config: {
                id: 'target-detail-modal',
                titleHtml: titleHtml,
                size: 'large',
                content: contentHtml,
                showFooter: false,
                noPadding: true
            }
        }, '*');
    }
}

function generateTargetDetailContent(target) {
    var stateLabel = TARGET_STATES[target.state] || 'Unknown';
    var stateIsUp = target.state === 2;
    var statusClass = stateIsUp ? 'status-online' : 'status-offline';
    var typeLabel = INVENTORY_TYPES[target.inventoryType] || 'Unknown';
    var hosts = target.hosts || {};
    var hostKeys = Object.keys(hosts);
    var hostCount = hostKeys.length;

    // Build hosts & protocols tab content
    var hostsContent = '';
    if (hostCount === 0) {
        hostsContent = '<div class="detail-section detail-full-width">' +
            '<div class="detail-row">' +
            '<span class="detail-label">No hosts configured</span>' +
            '</div></div>';
    } else {
        hostKeys.forEach(function(hostId) {
            var host = hosts[hostId];
            var configs = host.configs || {};
            var configKeys = Object.keys(configs);

            hostsContent += '<div class="detail-section detail-full-width">' +
                '<div class="detail-section-title">' + escapeHtml(host.hostId || hostId) + '</div>';

            if (configKeys.length === 0) {
                hostsContent += '<div class="detail-row">' +
                    '<span class="detail-label">No protocol configs</span>' +
                    '</div>';
            } else {
                configKeys.forEach(function(cfgKey) {
                    var cfg = configs[cfgKey];
                    var protoName = PROTOCOLS[cfg.protocol] || 'Unknown';
                    var addr = cfg.addr || '-';
                    var port = cfg.port || '-';
                    var credId = cfg.credId || '-';
                    var terminal = cfg.terminal || '-';
                    var timeout = cfg.timeout || '-';

                    var details = escapeHtml(addr) + ':' + escapeHtml(String(port));
                    if (credId !== '-') details += ' | Cred: ' + escapeHtml(credId);
                    if (terminal !== '-') details += ' | Terminal: ' + escapeHtml(terminal);
                    if (timeout !== '-') details += ' | Timeout: ' + escapeHtml(String(timeout)) + 's';

                    hostsContent += '<div class="detail-row">' +
                        '<span class="detail-label">' + escapeHtml(protoName) + '</span>' +
                        '<span class="detail-value">' + details + '</span>' +
                        '</div>';
                });
            }
            hostsContent += '</div>';
        });
    }

    return '' +
        '<div class="probler-popup-tabs">' +
            '<div class="probler-popup-tab active" data-tab="overview">Overview</div>' +
            '<div class="probler-popup-tab" data-tab="hosts">Hosts &amp; Protocols</div>' +
        '</div>' +
        '<div class="probler-popup-tab-content">' +
            '<div class="probler-popup-tab-pane active" data-pane="overview">' +
                '<div class="detail-grid">' +
                    '<div class="detail-section">' +
                        '<div class="detail-section-title">Target Information</div>' +
                        '<div class="detail-row">' +
                            '<span class="detail-label">Target ID</span>' +
                            '<span class="detail-value">' + escapeHtml(target.targetId) + '</span>' +
                        '</div>' +
                        '<div class="detail-row">' +
                            '<span class="detail-label">Links ID</span>' +
                            '<span class="detail-value">' + escapeHtml(target.linksId || '-') + '</span>' +
                        '</div>' +
                        '<div class="detail-row">' +
                            '<span class="detail-label">State</span>' +
                            '<span class="detail-value ' + statusClass + '">' +
                                escapeHtml(stateLabel.toUpperCase()) +
                            '</span>' +
                        '</div>' +
                    '</div>' +
                    '<div class="detail-section">' +
                        '<div class="detail-section-title">Configuration</div>' +
                        '<div class="detail-row">' +
                            '<span class="detail-label">Inventory Type</span>' +
                            '<span class="detail-value">' + escapeHtml(typeLabel) + '</span>' +
                        '</div>' +
                        '<div class="detail-row">' +
                            '<span class="detail-label">Host Count</span>' +
                            '<span class="detail-value">' + hostCount + '</span>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="probler-popup-tab-pane" data-pane="hosts">' +
                '<div class="detail-grid">' +
                    hostsContent +
                '</div>' +
            '</div>' +
        '</div>';
}
