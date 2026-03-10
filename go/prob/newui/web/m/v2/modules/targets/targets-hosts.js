/**
 * Mobile Targets Module - Host & Protocol Config Management (stacked modals)
 * Desktop Equivalent: targets/targets-hosts.js
 * Manages nested hosts within a target and protocol configs within a host
 */
(function() {
    'use strict';

    var tempConfigs = [];
    var editingHostIndex = -1;
    var editingConfigIndex = -1;
    var parentHosts = null;
    var onHostsSaved = null;
    var cachedCredentials = null;

    var PROTOCOLS = MobileTargets.enums.PROTOCOLS;

    var PROTOCOL_DEFAULT_PORTS = {
        1: 22, 2: 161, 3: 161, 4: 443, 5: 830, 6: 50051, 7: 6443, 8: 443
    };

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function configsMapToArray(configsMap) {
        if (!configsMap) return [];
        return Object.entries(configsMap).map(function(entry) {
            var key = entry[0];
            var cfg = entry[1];
            return {
                protocol: cfg.protocol || parseInt(key, 10),
                addr: cfg.addr || '',
                port: cfg.port || PROTOCOL_DEFAULT_PORTS[cfg.protocol] || 22,
                credId: cfg.credId || '',
                terminal: cfg.terminal || '',
                timeout: cfg.timeout || ''
            };
        });
    }

    function configsArrayToMap(configsArray) {
        var map = {};
        configsArray.forEach(function(cfg) {
            map[String(cfg.protocol)] = {
                protocol: cfg.protocol,
                addr: cfg.addr,
                port: cfg.port,
                credId: cfg.credId,
                terminal: cfg.terminal,
                timeout: cfg.timeout
            };
        });
        return map;
    }

    // ============================================
    // Credentials
    // ============================================

    async function fetchCredentials() {
        if (cachedCredentials) return cachedCredentials;
        try {
            var query = encodeURIComponent(JSON.stringify({ text: 'select * from L8Credentials' }));
            var data = await Layer8MAuth.get(Layer8MConfig.resolveEndpoint('/75/Creds') + '?body=' + query);
            cachedCredentials = {};
            if (data && data.list) {
                data.list.forEach(function(cred) {
                    cachedCredentials[cred.id] = cred;
                });
            }
        } catch (e) {
            cachedCredentials = {};
        }
        return cachedCredentials;
    }

    // ============================================
    // Host Modal (Level 2)
    // ============================================

    function generateConfigsListHtml() {
        if (tempConfigs.length === 0) {
            return '<p style="color:var(--layer8d-text-muted,#999);padding:10px;text-align:center;">No protocols configured. Click "Add Protocol" to add one.</p>';
        }
        return tempConfigs.map(function(cfg, index) {
            var protoName = PROTOCOLS[cfg.protocol] || 'Unknown';
            return '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px;border:1px solid var(--layer8d-border,#e2e8f0);border-radius:6px;margin-bottom:6px;">' +
                '<div style="flex:1;">' +
                '<div style="font-weight:600;font-size:14px;">' + escapeHtml(protoName) + '</div>' +
                '<div style="font-size:12px;color:var(--layer8d-text-medium,#718096);margin-top:2px;">' +
                escapeHtml(cfg.addr || '-') + ':' + (cfg.port || '-') +
                (cfg.credId ? ' | Cred: ' + escapeHtml(cfg.credId) : '') +
                '</div></div>' +
                '<div style="display:flex;gap:6px;">' +
                '<button type="button" class="btn" style="height:32px;padding:0 12px;font-size:12px;" data-action="edit-config" data-index="' + index + '">Edit</button>' +
                '<button type="button" class="btn btn-danger" style="height:32px;padding:0 12px;font-size:12px;" data-action="remove-config" data-index="' + index + '">Delete</button>' +
                '</div></div>';
        }).join('');
    }

    function generateHostFormHtml(hostId) {
        return '<div class="mobile-form-field">' +
            '<label class="mobile-form-label">Host ID</label>' +
            '<input type="text" id="m-host-id" class="mobile-form-input" value="' + escapeHtml(hostId || '') + '"' + (editingHostIndex >= 0 ? ' disabled' : '') + ' placeholder="e.g., router1, switch-core" required>' +
            '</div>' +
            '<div class="mobile-form-field">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
            '<label class="mobile-form-label" style="margin-bottom:0;">Protocol Configurations</label>' +
            '<button type="button" class="btn" style="height:32px;padding:0 12px;font-size:12px;" data-action="add-config">Add Protocol</button>' +
            '</div>' +
            '<div id="m-host-configs-container">' + generateConfigsListHtml() + '</div>' +
            '</div>';
    }

    function refreshHostModal() {
        var body = Layer8MPopup.getBody();
        if (!body || !body.querySelector('#m-host-id')) return;
        var hostId = (body.querySelector('#m-host-id') || {}).value || '';
        Layer8MPopup.updateContent(generateHostFormHtml(hostId));
    }

    function attachHostModalEvents(popup) {
        popup.body.addEventListener('click', function(e) {
            var btn = e.target.closest('[data-action]');
            if (!btn) return;
            var action = btn.dataset.action;
            var index = parseInt(btn.dataset.index, 10);

            if (action === 'add-config') {
                openConfigModal(null);
            } else if (action === 'edit-config' && !isNaN(index)) {
                openConfigModal(index);
            } else if (action === 'remove-config' && !isNaN(index)) {
                tempConfigs.splice(index, 1);
                refreshHostModal();
            }
        });
    }

    function openHostModal(hosts, index, refreshCallback) {
        parentHosts = hosts;
        onHostsSaved = refreshCallback;

        if (index !== null && index !== undefined && index >= 0 && hosts[index]) {
            editingHostIndex = index;
            tempConfigs = configsMapToArray(hosts[index].configs);
        } else {
            editingHostIndex = -1;
            tempConfigs = [];
        }

        var hostId = editingHostIndex >= 0 ? hosts[editingHostIndex].hostId : '';

        Layer8MPopup.show({
            title: editingHostIndex >= 0 ? 'Edit Host' : 'Add Host',
            content: generateHostFormHtml(hostId),
            size: 'large',
            showFooter: true,
            saveButtonText: 'Save Host',
            onSave: function() { handleHostSave(); },
            onShow: attachHostModalEvents
        });
    }

    function handleHostSave() {
        var body = Layer8MPopup.getBody();
        if (!body) return;

        var hostId = (body.querySelector('#m-host-id') || {}).value || '';
        hostId = hostId.trim();

        if (!hostId) {
            Layer8MUtils.showError('Host ID is required');
            return;
        }

        if (editingHostIndex < 0 && parentHosts) {
            if (parentHosts.findIndex(function(h) { return h.hostId === hostId; }) >= 0) {
                Layer8MUtils.showError('A host with this ID already exists');
                return;
            }
        }

        var hostObj = {
            hostId: hostId,
            configs: configsArrayToMap(tempConfigs),
            polls: {},
            groups: {}
        };

        if (parentHosts) {
            if (editingHostIndex >= 0) {
                parentHosts[editingHostIndex] = hostObj;
            } else {
                parentHosts.push(hostObj);
            }
        }

        editingHostIndex = -1;
        tempConfigs = [];
        Layer8MPopup.close();
        if (onHostsSaved) {
            setTimeout(onHostsSaved, 250);
        }
    }

    // ============================================
    // Protocol Config Modal (Level 3)
    // ============================================

    function generateCredentialOptions(selectedCredId) {
        var options = '<option value="">-- Select Credential --</option>';
        if (cachedCredentials) {
            Object.values(cachedCredentials).forEach(function(cred) {
                var selected = cred.id === selectedCredId ? ' selected' : '';
                var label = cred.id + (cred.name ? ' (' + cred.name + ')' : '');
                options += '<option value="' + escapeHtml(cred.id) + '"' + selected + '>' + escapeHtml(label) + '</option>';
            });
        }
        return options;
    }

    function generateConfigFormHtml(cfg) {
        var isEdit = !!cfg;
        var protocol = isEdit ? cfg.protocol : 1;
        var addr = isEdit ? cfg.addr : '';
        var port = isEdit ? cfg.port : PROTOCOL_DEFAULT_PORTS[1];
        var credId = isEdit ? cfg.credId : '';
        var terminal = isEdit ? cfg.terminal : '';
        var timeout = isEdit ? cfg.timeout : '60';

        var protoOptions = '';
        for (var p = 1; p <= 8; p++) {
            protoOptions += '<option value="' + p + '"' + (protocol === p ? ' selected' : '') + '>' + (PROTOCOLS[p] || p) + '</option>';
        }

        return '<div class="mobile-form-field">' +
            '<label class="mobile-form-label">Protocol</label>' +
            '<select id="m-config-protocol" class="mobile-form-input">' + protoOptions + '</select>' +
            '</div>' +
            '<div class="mobile-form-field">' +
            '<label class="mobile-form-label">Address</label>' +
            '<input type="text" id="m-config-addr" class="mobile-form-input" value="' + escapeHtml(addr) + '" placeholder="e.g., 10.20.30.16" required>' +
            '</div>' +
            '<div class="mobile-form-field">' +
            '<label class="mobile-form-label">Port</label>' +
            '<input type="number" id="m-config-port" class="mobile-form-input" value="' + (port || '') + '" min="1" max="65535">' +
            '</div>' +
            '<div class="mobile-form-field">' +
            '<label class="mobile-form-label">Credential</label>' +
            '<select id="m-config-cred-id" class="mobile-form-input">' + generateCredentialOptions(credId) + '</select>' +
            '</div>' +
            '<div class="mobile-form-field">' +
            '<label class="mobile-form-label">Terminal</label>' +
            '<input type="text" id="m-config-terminal" class="mobile-form-input" value="' + escapeHtml(terminal) + '" placeholder="e.g., vt100">' +
            '</div>' +
            '<div class="mobile-form-field">' +
            '<label class="mobile-form-label">Timeout (seconds)</label>' +
            '<input type="text" id="m-config-timeout" class="mobile-form-input" value="' + escapeHtml(timeout) + '" placeholder="e.g., 60">' +
            '</div>';
    }

    function attachConfigModalEvents(popup) {
        popup.body.addEventListener('change', function(e) {
            if (e.target.id === 'm-config-protocol') {
                var proto = parseInt(e.target.value, 10);
                var portInput = popup.body.querySelector('#m-config-port');
                if (portInput) {
                    portInput.value = PROTOCOL_DEFAULT_PORTS[proto] || 22;
                }
            }
        });
    }

    function openConfigModal(index) {
        if (index !== null && index !== undefined && index >= 0 && tempConfigs[index]) {
            editingConfigIndex = index;
        } else {
            editingConfigIndex = -1;
        }

        var cfg = editingConfigIndex >= 0 ? tempConfigs[editingConfigIndex] : null;

        Layer8MPopup.show({
            title: cfg ? 'Edit Protocol' : 'Add Protocol',
            content: generateConfigFormHtml(cfg),
            size: 'large',
            showFooter: true,
            saveButtonText: 'Save Protocol',
            onSave: function() { handleConfigSave(); },
            onShow: attachConfigModalEvents
        });
    }

    function handleConfigSave() {
        var body = Layer8MPopup.getBody();
        if (!body) return;

        var protocol = parseInt((body.querySelector('#m-config-protocol') || {}).value, 10) || 1;
        var addr = ((body.querySelector('#m-config-addr') || {}).value || '').trim();
        var port = parseInt((body.querySelector('#m-config-port') || {}).value, 10) || PROTOCOL_DEFAULT_PORTS[protocol] || 22;
        var credId = ((body.querySelector('#m-config-cred-id') || {}).value || '').trim();
        var terminal = ((body.querySelector('#m-config-terminal') || {}).value || '').trim();
        var timeout = ((body.querySelector('#m-config-timeout') || {}).value || '').trim();

        if (!addr) {
            Layer8MUtils.showError('Address is required');
            return;
        }

        if (editingConfigIndex < 0) {
            if (tempConfigs.findIndex(function(c) { return c.protocol === protocol; }) >= 0) {
                Layer8MUtils.showError('This protocol is already configured');
                return;
            }
        }

        var configObj = {
            protocol: protocol, addr: addr, port: port,
            credId: credId, terminal: terminal, timeout: timeout
        };

        if (editingConfigIndex >= 0) {
            tempConfigs[editingConfigIndex] = configObj;
        } else {
            tempConfigs.push(configObj);
        }

        editingConfigIndex = -1;
        Layer8MPopup.close();
        setTimeout(function() { refreshHostModal(); }, 250);
    }

    window.MobileTargetsHosts = {
        openHostModal: openHostModal,
        fetchCredentials: fetchCredentials
    };
})();
