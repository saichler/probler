/**
 * Mobile Targets Module - Target CRUD (Add/Edit/Save)
 * Desktop Equivalent: targets/targets.js (target-level operations)
 * Delegates to MobileTargetsHosts for nested host/protocol management
 */
(function() {
    'use strict';

    var currentService = null;
    var currentIsEdit = false;

    var INVENTORY_TYPES = MobileTargets.enums.INVENTORY_TYPES;
    var TARGET_STATES = MobileTargets.enums.TARGET_STATES;

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function hostsMapToArray(hostsMap) {
        if (!hostsMap) return [];
        return Object.entries(hostsMap).map(function(entry) {
            return {
                hostId: entry[1].hostId || entry[0],
                configs: entry[1].configs || {},
                polls: entry[1].polls || {},
                groups: entry[1].groups || {}
            };
        });
    }

    function hostsArrayToMap(hostsArray) {
        var map = {};
        hostsArray.forEach(function(host) {
            if (host.hostId && host.hostId.trim()) {
                map[host.hostId.trim()] = {
                    hostId: host.hostId.trim(),
                    configs: host.configs || {},
                    polls: host.polls || {},
                    groups: host.groups || {}
                };
            }
        });
        return map;
    }

    // Shared state for nested host editing
    var tempHosts = [];

    function generateHostsListHtml() {
        if (tempHosts.length === 0) {
            return '<p style="color:var(--layer8d-text-muted,#999);padding:10px;text-align:center;">No hosts configured. Click "Add Host" to add one.</p>';
        }
        return tempHosts.map(function(host, index) {
            var cfgCount = host.configs ? Object.keys(host.configs).length : 0;
            return '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px;border:1px solid var(--layer8d-border,#e2e8f0);border-radius:6px;margin-bottom:6px;">' +
                '<div style="flex:1;">' +
                '<div style="font-weight:600;font-size:14px;">' + escapeHtml(host.hostId) + '</div>' +
                '<div style="font-size:12px;color:var(--layer8d-text-medium,#718096);margin-top:2px;">' +
                cfgCount + ' protocol' + (cfgCount !== 1 ? 's' : '') +
                '</div></div>' +
                '<div style="display:flex;gap:6px;">' +
                '<button type="button" class="btn" style="height:32px;padding:0 12px;font-size:12px;" data-action="edit-host" data-index="' + index + '">Edit</button>' +
                '<button type="button" class="btn btn-danger" style="height:32px;padding:0 12px;font-size:12px;" data-action="remove-host" data-index="' + index + '">Delete</button>' +
                '</div></div>';
        }).join('');
    }

    function generateTargetFormHtml(targetId, linksId, state, inventoryType) {
        var stateOptions = '';
        for (var k = 1; k <= 4; k++) {
            stateOptions += '<option value="' + k + '"' + (state === k ? ' selected' : '') + '>' + (TARGET_STATES[k] || k) + '</option>';
        }
        var typeOptions = '';
        for (var t = 1; t <= 7; t++) {
            typeOptions += '<option value="' + t + '"' + (inventoryType === t ? ' selected' : '') + '>' + (INVENTORY_TYPES[t] || t) + '</option>';
        }

        return '<div class="mobile-form-field">' +
            '<label class="mobile-form-label">Target ID</label>' +
            '<input type="text" id="m-target-id" class="mobile-form-input" value="' + escapeHtml(targetId || '') + '"' + (currentIsEdit ? ' disabled' : '') + ' required>' +
            '</div>' +
            '<div class="mobile-form-field">' +
            '<label class="mobile-form-label">Links ID</label>' +
            '<input type="text" id="m-target-links-id" class="mobile-form-input" value="' + escapeHtml(linksId || '') + '">' +
            '</div>' +
            '<div class="mobile-form-field">' +
            '<label class="mobile-form-label">State</label>' +
            '<select id="m-target-state" class="mobile-form-input">' + stateOptions + '</select>' +
            '</div>' +
            '<div class="mobile-form-field">' +
            '<label class="mobile-form-label">Inventory Type</label>' +
            '<select id="m-target-inv-type" class="mobile-form-input">' + typeOptions + '</select>' +
            '</div>' +
            '<div class="mobile-form-field">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
            '<label class="mobile-form-label" style="margin-bottom:0;">Hosts</label>' +
            '<button type="button" class="btn" style="height:32px;padding:0 12px;font-size:12px;" data-action="add-host">Add Host</button>' +
            '</div>' +
            '<div id="m-target-hosts-container">' + generateHostsListHtml() + '</div>' +
            '</div>';
    }

    function getTargetFormValues() {
        var body = Layer8MPopup.getBody();
        if (!body) return {};
        return {
            targetId: (body.querySelector('#m-target-id') || {}).value || '',
            linksId: (body.querySelector('#m-target-links-id') || {}).value || '',
            state: parseInt((body.querySelector('#m-target-state') || {}).value, 10) || 1,
            inventoryType: parseInt((body.querySelector('#m-target-inv-type') || {}).value, 10) || 1
        };
    }

    function refreshTargetModal() {
        var body = Layer8MPopup.getBody();
        if (!body || !body.querySelector('#m-target-id')) return;
        var vals = getTargetFormValues();
        Layer8MPopup.updateContent(generateTargetFormHtml(vals.targetId, vals.linksId, vals.state, vals.inventoryType));
    }

    function attachTargetModalEvents(popup) {
        popup.body.addEventListener('click', function(e) {
            var btn = e.target.closest('[data-action]');
            if (!btn) return;
            var action = btn.dataset.action;
            var index = parseInt(btn.dataset.index, 10);

            if (action === 'add-host') {
                MobileTargetsHosts.openHostModal(tempHosts, null, refreshTargetModal);
            } else if (action === 'edit-host' && !isNaN(index)) {
                MobileTargetsHosts.openHostModal(tempHosts, index, refreshTargetModal);
            } else if (action === 'remove-host' && !isNaN(index)) {
                tempHosts.splice(index, 1);
                refreshTargetModal();
            }
        });
    }

    async function openAdd(service) {
        currentService = service;
        currentIsEdit = false;
        tempHosts = [];
        await MobileTargetsHosts.fetchCredentials();

        Layer8MPopup.show({
            title: 'Add Target',
            content: generateTargetFormHtml('', '', 1, 1),
            size: 'large',
            showFooter: true,
            saveButtonText: 'Save',
            onSave: function() { handleTargetSave(); },
            onShow: attachTargetModalEvents
        });
    }

    async function openEdit(service, targetId) {
        currentService = service;
        currentIsEdit = true;
        await MobileTargetsHosts.fetchCredentials();

        var target = null;
        try {
            var query = encodeURIComponent(JSON.stringify({ text: 'select * from L8PTarget where targetId=' + targetId }));
            var data = await Layer8MAuth.get(Layer8MConfig.resolveEndpoint(service.endpoint) + '?body=' + query);
            target = (data && data.list && data.list.length > 0) ? data.list[0] : null;
        } catch (e) {
            Layer8MUtils.showError('Failed to load target');
            return;
        }
        if (!target) { Layer8MUtils.showError('Target not found'); return; }

        tempHosts = hostsMapToArray(target.hosts);

        Layer8MPopup.show({
            title: 'Edit Target',
            content: generateTargetFormHtml(target.targetId, target.linksId, target.state, target.inventoryType),
            size: 'large',
            showFooter: true,
            saveButtonText: 'Save',
            onSave: function() { handleTargetSave(); },
            onShow: attachTargetModalEvents
        });
    }

    async function handleTargetSave() {
        var body = Layer8MPopup.getBody();
        if (!body) return;

        var targetId = ((body.querySelector('#m-target-id') || {}).value || '').trim();
        var linksId = ((body.querySelector('#m-target-links-id') || {}).value || '').trim();
        var state = parseInt((body.querySelector('#m-target-state') || {}).value, 10) || 1;
        var inventoryType = parseInt((body.querySelector('#m-target-inv-type') || {}).value, 10) || 1;

        if (!targetId) {
            Layer8MUtils.showError('Target ID is required');
            return;
        }

        var targetObj = {
            targetId: targetId,
            linksId: linksId,
            hosts: hostsArrayToMap(tempHosts),
            state: state,
            inventoryType: inventoryType
        };

        try {
            var endpoint = Layer8MConfig.resolveEndpoint(currentService.endpoint);
            if (currentIsEdit) {
                await Layer8MAuth.patch(endpoint, targetObj);
            } else {
                await Layer8MAuth.post(endpoint, targetObj);
            }
            Layer8MPopup.close();
            Layer8MUtils.showSuccess('Target saved');
            var activeTable = window._Layer8MNavActiveTable;
            if (activeTable) activeTable.refresh();
        } catch (e) {
            Layer8MUtils.showError('Error saving target: ' + (e.message || e));
        }
    }

    window.MobileTargetsCRUD = {
        openAdd: openAdd,
        openEdit: openEdit
    };
})();
