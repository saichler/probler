/**
 * Mobile Targets Module - Detail View (read-only) + Delete
 * Desktop Equivalent: targets/targets-detail.js
 * Shows target overview with nested hosts & protocol configurations
 */
(function() {
    'use strict';

    var PROTOCOLS = MobileTargets.enums.PROTOCOLS;
    var INVENTORY_TYPES = MobileTargets.enums.INVENTORY_TYPES;
    var TARGET_STATES = MobileTargets.enums.TARGET_STATES;

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function generateHostsDetailHtml(hosts) {
        var hostKeys = Object.keys(hosts);
        if (hostKeys.length === 0) {
            return '<p style="color:var(--layer8d-text-muted,#999);text-align:center;padding:10px;">No hosts configured</p>';
        }

        var html = '';
        hostKeys.forEach(function(hostId) {
            var host = hosts[hostId];
            var configs = host.configs || {};
            var configKeys = Object.keys(configs);

            html += '<div style="border:1px solid var(--layer8d-border,#e2e8f0);border-radius:6px;padding:10px;margin-bottom:8px;">' +
                '<div style="font-weight:600;font-size:14px;margin-bottom:6px;">' + escapeHtml(host.hostId || hostId) + '</div>';

            if (configKeys.length === 0) {
                html += '<div style="font-size:12px;color:var(--layer8d-text-muted,#999);">No protocol configs</div>';
            } else {
                configKeys.forEach(function(cfgKey) {
                    var cfg = configs[cfgKey];
                    var protoName = PROTOCOLS[cfg.protocol] || 'Unknown';
                    var details = escapeHtml(cfg.addr || '-') + ':' + (cfg.port || '-');
                    if (cfg.credId) details += ' | Cred: ' + escapeHtml(cfg.credId);
                    if (cfg.terminal) details += ' | Terminal: ' + escapeHtml(cfg.terminal);
                    if (cfg.timeout) details += ' | Timeout: ' + escapeHtml(String(cfg.timeout)) + 's';

                    html += '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;">' +
                        '<span style="font-weight:500;min-width:80px;">' + escapeHtml(protoName) + '</span>' +
                        '<span style="color:var(--layer8d-text-medium,#718096);">' + details + '</span>' +
                        '</div>';
                });
            }
            html += '</div>';
        });
        return html;
    }

    function showDetails(service, item) {
        // Use item directly from table's loaded data — no server re-fetch needed
        // (matches desktop targets-detail.js pattern: showTargetDetailsModal(target))
        var target = item;

        var stateLabel = TARGET_STATES[target.state] || 'Unknown';
        var typeLabel = INVENTORY_TYPES[target.inventoryType] || 'Unknown';
        var hosts = target.hosts || {};
        var hostKeys = Object.keys(hosts);

        var content = '<div class="mobile-form-field"><label class="mobile-form-label">Target ID</label>' +
            '<div class="mobile-form-input" style="background:var(--layer8d-bg-light,#f7fafc);">' + escapeHtml(target.targetId) + '</div></div>' +
            '<div class="mobile-form-field"><label class="mobile-form-label">Links ID</label>' +
            '<div class="mobile-form-input" style="background:var(--layer8d-bg-light,#f7fafc);">' + escapeHtml(target.linksId || '-') + '</div></div>' +
            '<div class="mobile-form-field"><label class="mobile-form-label">State</label>' +
            '<div class="mobile-form-input" style="background:var(--layer8d-bg-light,#f7fafc);">' + escapeHtml(stateLabel) + '</div></div>' +
            '<div class="mobile-form-field"><label class="mobile-form-label">Inventory Type</label>' +
            '<div class="mobile-form-input" style="background:var(--layer8d-bg-light,#f7fafc);">' + escapeHtml(typeLabel) + '</div></div>' +
            '<div class="mobile-form-field"><label class="mobile-form-label">Hosts (' + hostKeys.length + ')</label>' +
            generateHostsDetailHtml(hosts) + '</div>';

        Layer8MPopup.show({
            title: 'Target Details',
            content: content,
            size: 'large',
            showFooter: false
        });
    }

    async function confirmDelete(service, targetId) {
        var confirmed = await Layer8MConfirm.confirmDelete('target "' + targetId + '"');
        if (confirmed) {
            try {
                var query = { text: 'select * from L8PTarget where targetId=' + targetId };
                await Layer8MAuth.delete(Layer8MConfig.resolveEndpoint(service.endpoint), query);
                Layer8MUtils.showSuccess('Target deleted');
                var activeTable = window._Layer8MNavActiveTable;
                if (activeTable) activeTable.refresh();
            } catch (e) {
                Layer8MUtils.showError('Failed to delete target: ' + (e.message || e));
            }
        }
    }

    window.MobileTargetsDetail = {
        showDetails: showDetails,
        confirmDelete: confirmDelete
    };
})();
