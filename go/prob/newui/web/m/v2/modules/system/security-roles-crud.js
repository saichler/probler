/**
 * Mobile System Module - Security Roles CRUD
 * Desktop Equivalent: l8ui/sys/security/l8security-roles-crud.js
 * Handles nested rules map with stacked rule editor modal
 */
(function() {
    'use strict';

    var ACTION_NAMES = {};
    var tempRules = [];
    var currentEditingRuleIndex = null;
    var tempRuleActions = {};
    var tempRuleAttributes = {};
    var registryTypes = null;
    var currentService = null;
    var currentIsEdit = false;

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function escapeAttr(str) { return escapeHtml(str); }

    function initEnums() {
        if (window.MobileSecurityEnums) {
            ACTION_NAMES = MobileSecurityEnums.ACTION_NAMES;
        }
    }

    // Fetch registry types for Element Type dropdown
    async function fetchRegistryTypes() {
        if (registryTypes !== null) return registryTypes;
        try {
            var response = await Layer8MAuth.get('/registry');
            if (response && response.list) {
                var sorted = response.list.slice().sort(function(a, b) { return a.localeCompare(b); });
                registryTypes = ['*'].concat(sorted);
            } else {
                registryTypes = ['*'];
            }
        } catch (e) {
            registryTypes = ['*'];
        }
        return registryTypes;
    }

    // Generate rules list HTML
    function generateRulesListHtml() {
        if (tempRules.length === 0) {
            return '<p style="color:var(--layer8d-text-muted,#999);padding:10px;">No rules defined. Click "Add Rule" to create one.</p>';
        }
        return tempRules.map(function(rule, index) {
            var actionNames = Object.keys(rule.actions || {})
                .filter(function(k) { return rule.actions[k]; })
                .map(function(k) { return ACTION_NAMES[k] || k; })
                .join(', ');
            var allowClass = rule.allowed ? 'color:#22c55e;' : 'color:#ef4444;';
            return '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px;border:1px solid var(--layer8d-border,#e2e8f0);border-radius:6px;margin-bottom:6px;">' +
                '<div style="flex:1;">' +
                '<div style="font-weight:600;font-size:14px;">' + escapeHtml(rule.ruleId) + '</div>' +
                '<div style="font-size:12px;color:var(--layer8d-text-medium,#718096);margin-top:2px;">' +
                '<span style="' + allowClass + 'font-weight:600;">' + (rule.allowed ? 'Allow' : 'Deny') + '</span> ' +
                'Type: ' + escapeHtml(rule.elemType) + ' | Actions: ' + (actionNames || 'None') +
                '</div></div>' +
                '<div style="display:flex;gap:6px;">' +
                '<button type="button" class="btn" style="height:32px;padding:0 12px;font-size:12px;" data-action="edit-rule" data-index="' + index + '">Edit</button>' +
                '<button type="button" class="btn btn-danger" style="height:32px;padding:0 12px;font-size:12px;" data-action="remove-rule" data-index="' + index + '">Remove</button>' +
                '</div></div>';
        }).join('');
    }

    // Generate role form HTML
    function generateRoleFormHtml(roleId, roleName) {
        return '<div class="mobile-form-field">' +
            '<label class="mobile-form-label">Role ID</label>' +
            '<input type="text" id="m-sec-role-id" class="mobile-form-input" value="' + escapeAttr(roleId || '') + '"' + (currentIsEdit ? ' disabled' : '') + ' required>' +
            '</div>' +
            '<div class="mobile-form-field">' +
            '<label class="mobile-form-label">Role Name</label>' +
            '<input type="text" id="m-sec-role-name" class="mobile-form-input" value="' + escapeAttr(roleName || '') + '" required>' +
            '</div>' +
            '<div class="mobile-form-field">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
            '<label class="mobile-form-label" style="margin-bottom:0;">Rules</label>' +
            '<button type="button" class="btn" style="height:32px;padding:0 12px;font-size:12px;" data-action="add-rule">Add Rule</button>' +
            '</div>' +
            '<div id="m-sec-rules-container">' + generateRulesListHtml() + '</div>' +
            '</div>';
    }

    // Get current form values
    function getFormValues() {
        var body = Layer8MPopup.getBody();
        if (!body) return { roleId: '', roleName: '' };
        return {
            roleId: (body.querySelector('#m-sec-role-id') || {}).value || '',
            roleName: (body.querySelector('#m-sec-role-name') || {}).value || ''
        };
    }

    // Refresh role modal content
    function refreshRoleModal() {
        var body = Layer8MPopup.getBody();
        if (!body || !body.querySelector('#m-sec-role-id')) return;
        var vals = getFormValues();
        Layer8MPopup.updateContent(generateRoleFormHtml(vals.roleId, vals.roleName));
    }

    // Attach event delegation to role modal
    function attachRoleModalEvents(popup) {
        popup.body.addEventListener('click', function(e) {
            var btn = e.target.closest('[data-action]');
            if (!btn) return;
            var action = btn.dataset.action;
            var index = parseInt(btn.dataset.index, 10);

            if (action === 'add-rule') {
                openRuleModal(null);
            } else if (action === 'edit-rule' && !isNaN(index)) {
                openRuleModal(index);
            } else if (action === 'remove-rule' && !isNaN(index)) {
                tempRules.splice(index, 1);
                refreshRoleModal();
            }
        });
    }

    // Open Add Role modal
    async function openAdd(service) {
        initEnums();
        currentService = service;
        currentIsEdit = false;
        tempRules = [];

        Layer8MPopup.show({
            title: 'Add Role',
            content: generateRoleFormHtml('', ''),
            size: 'large',
            showFooter: true,
            saveButtonText: 'Save',
            onSave: function() { handleRoleSave(); },
            onShow: attachRoleModalEvents
        });
    }

    // Open Edit Role modal
    async function openEdit(service, roleId) {
        initEnums();
        currentService = service;
        currentIsEdit = true;

        var role = null;
        try {
            var query = encodeURIComponent(JSON.stringify({ text: 'select * from L8Role where roleId=' + roleId }));
            var data = await Layer8MAuth.get(Layer8MConfig.resolveEndpoint(service.endpoint) + '?body=' + query);
            role = (data && data.list && data.list.length > 0) ? data.list[0] : null;
        } catch (e) {
            Layer8MUtils.showError('Failed to load role');
            return;
        }
        if (!role) { Layer8MUtils.showError('Role not found'); return; }

        tempRules = role.rules ? JSON.parse(JSON.stringify(Object.values(role.rules))) : [];

        Layer8MPopup.show({
            title: 'Edit Role',
            content: generateRoleFormHtml(role.roleId, role.roleName),
            size: 'large',
            showFooter: true,
            saveButtonText: 'Save',
            onSave: function() { handleRoleSave(); },
            onShow: attachRoleModalEvents
        });
    }

    // Show role details (read-only)
    async function showDetails(service, item) {
        initEnums();
        currentService = service;
        currentIsEdit = true;

        var role = null;
        try {
            var query = encodeURIComponent(JSON.stringify({ text: 'select * from L8Role where roleId=' + item.roleId }));
            var data = await Layer8MAuth.get(Layer8MConfig.resolveEndpoint(service.endpoint) + '?body=' + query);
            role = (data && data.list && data.list.length > 0) ? data.list[0] : null;
        } catch (e) { /* fallback */ }
        if (!role) role = item;

        tempRules = role.rules ? JSON.parse(JSON.stringify(Object.values(role.rules))) : [];

        Layer8MPopup.show({
            title: 'Role Details',
            content: generateRoleFormHtml(role.roleId, role.roleName),
            size: 'large',
            showFooter: true,
            saveButtonText: 'Edit',
            showCancelButton: true,
            cancelButtonText: 'Close',
            onShow: function(popup) {
                popup.body.querySelectorAll('input, select, textarea, button[data-action]').forEach(function(el) { el.disabled = true; });
            },
            onSave: function() {
                Layer8MPopup.close();
                openEdit(service, item.roleId);
            }
        });
    }

    // Handle role save
    async function handleRoleSave() {
        var body = Layer8MPopup.getBody();
        if (!body) return;

        var roleId = (body.querySelector('#m-sec-role-id') || {}).value || '';
        var roleName = (body.querySelector('#m-sec-role-name') || {}).value || '';
        roleId = roleId.trim();
        roleName = roleName.trim();

        if (!roleId || !roleName) {
            Layer8MUtils.showError('Please fill in Role ID and Role Name');
            return;
        }

        var rulesMap = {};
        tempRules.forEach(function(rule) { rulesMap[rule.ruleId] = rule; });

        var roleData = { roleId: roleId, roleName: roleName, rules: rulesMap };

        try {
            var endpoint = Layer8MConfig.resolveEndpoint(currentService.endpoint);
            if (currentIsEdit) {
                await Layer8MAuth.put(endpoint, roleData);
            } else {
                await Layer8MAuth.post(endpoint, roleData);
            }
            Layer8MPopup.close();
            Layer8MUtils.showSuccess('Role saved');
            var activeTable = window._Layer8MNavActiveTable;
            if (activeTable) activeTable.refresh();
        } catch (e) {
            Layer8MUtils.showError('Error saving role: ' + (e.message || e));
        }
    }

    // ===== Rule Modal (stacked) =====

    function generateActionsHtml() {
        var keys = Object.keys(tempRuleActions);
        if (keys.length === 0) return '';
        return keys.map(function(action) {
            if (!tempRuleActions[action]) return '';
            var options = Object.entries(ACTION_NAMES).map(function(entry) {
                return '<option value="' + escapeAttr(entry[0]) + '"' + (action === entry[0] ? ' selected' : '') + '>' + entry[1] + '</option>';
            }).join('');
            return '<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;">' +
                '<select name="m-sec-action-' + escapeAttr(action) + '" class="mobile-form-input" style="flex:1;">' +
                '<option value="">Select Action</option>' + options + '</select>' +
                '<button type="button" class="btn btn-danger" style="height:32px;padding:0 12px;font-size:12px;" data-action="remove-action" data-key="' + escapeAttr(action) + '">X</button>' +
                '</div>';
        }).join('');
    }

    function generateAttributesHtml() {
        var keys = Object.keys(tempRuleAttributes);
        if (keys.length === 0) return '';
        return keys.map(function(key, idx) {
            return '<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;">' +
                '<input type="text" name="m-sec-attr-key-' + idx + '" class="mobile-form-input" placeholder="Key" value="' + escapeAttr(key) + '" style="flex:1;">' +
                '<input type="text" name="m-sec-attr-val-' + idx + '" class="mobile-form-input" placeholder="Value" value="' + escapeAttr(tempRuleAttributes[key]) + '" style="flex:1;">' +
                '<button type="button" class="btn btn-danger" style="height:32px;padding:0 12px;font-size:12px;" data-action="remove-attr" data-key="' + escapeAttr(key) + '">X</button>' +
                '</div>';
        }).join('');
    }

    async function generateRuleFormHtml(rule) {
        var ruleId = rule ? rule.ruleId || '' : '';
        var elemType = rule ? rule.elemType || '*' : '*';
        var allowed = rule ? rule.allowed !== false : true;

        var types = await fetchRegistryTypes();
        var elemTypeOptions = types.map(function(type) {
            var selected = elemType === type ? ' selected' : '';
            return '<option value="' + escapeAttr(type) + '"' + selected + '>' + (type === '*' ? '* (Wildcard)' : escapeHtml(type)) + '</option>';
        }).join('');

        return '<div class="mobile-form-field">' +
            '<label class="mobile-form-label">Rule ID</label>' +
            '<input type="text" id="m-sec-rule-id" class="mobile-form-input" value="' + escapeAttr(ruleId) + '" required>' +
            '</div>' +
            '<div class="mobile-form-field">' +
            '<label class="mobile-form-label">Element Type</label>' +
            '<select id="m-sec-rule-elem-type" class="mobile-form-input">' + elemTypeOptions + '</select>' +
            '</div>' +
            '<div class="mobile-form-field">' +
            '<label class="mobile-form-label">Rule Type</label>' +
            '<select id="m-sec-rule-allowed" class="mobile-form-input">' +
            '<option value="true"' + (allowed ? ' selected' : '') + '>Allow</option>' +
            '<option value="false"' + (!allowed ? ' selected' : '') + '>Deny</option>' +
            '</select></div>' +
            '<div class="mobile-form-field">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
            '<label class="mobile-form-label" style="margin-bottom:0;">Actions</label>' +
            '<button type="button" class="btn" style="height:32px;padding:0 12px;font-size:12px;" data-action="add-action">Add</button>' +
            '</div><div id="m-sec-actions-container">' + generateActionsHtml() + '</div></div>' +
            '<div class="mobile-form-field">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
            '<label class="mobile-form-label" style="margin-bottom:0;">Attributes</label>' +
            '<button type="button" class="btn" style="height:32px;padding:0 12px;font-size:12px;" data-action="add-attr">Add</button>' +
            '</div><div id="m-sec-attrs-container">' + generateAttributesHtml() + '</div></div>';
    }

    function getRuleFormValues() {
        var body = Layer8MPopup.getBody();
        if (!body) return null;
        return {
            ruleId: (body.querySelector('#m-sec-rule-id') || {}).value || '',
            elemType: (body.querySelector('#m-sec-rule-elem-type') || {}).value || '*',
            allowed: ((body.querySelector('#m-sec-rule-allowed') || {}).value || 'true') === 'true'
        };
    }

    async function refreshRuleModal() {
        var vals = getRuleFormValues();
        Layer8MPopup.updateContent(await generateRuleFormHtml(vals));
    }

    function attachRuleModalEvents(popup) {
        popup.body.addEventListener('click', function(e) {
            var btn = e.target.closest('[data-action]');
            if (!btn) return;
            var action = btn.dataset.action;
            var key = btn.dataset.key;

            if (action === 'add-action') {
                tempRuleActions['_new_' + Date.now()] = true;
                refreshRuleModal();
            } else if (action === 'remove-action' && key) {
                delete tempRuleActions[key];
                refreshRuleModal();
            } else if (action === 'add-attr') {
                tempRuleAttributes['_new_attr_' + Date.now()] = '';
                refreshRuleModal();
            } else if (action === 'remove-attr' && key) {
                delete tempRuleAttributes[key];
                refreshRuleModal();
            }
        });
    }

    async function openRuleModal(index) {
        currentEditingRuleIndex = index;

        if (index !== null && index !== undefined && tempRules[index]) {
            var rule = tempRules[index];
            tempRuleActions = JSON.parse(JSON.stringify(rule.actions || {}));
            tempRuleAttributes = JSON.parse(JSON.stringify(rule.attributes || {}));
        } else {
            tempRuleActions = {};
            tempRuleAttributes = {};
        }

        var ruleData = (index !== null && index !== undefined && tempRules[index]) ? tempRules[index] : null;
        var formHtml = await generateRuleFormHtml(ruleData);

        Layer8MPopup.show({
            title: (index !== null && index !== undefined) ? 'Edit Rule' : 'Add Rule',
            content: formHtml,
            size: 'large',
            showFooter: true,
            saveButtonText: 'Save Rule',
            onSave: function() { handleRuleSave(); },
            onShow: attachRuleModalEvents
        });
    }

    function handleRuleSave() {
        var body = Layer8MPopup.getBody();
        if (!body) return;

        var ruleId = (body.querySelector('#m-sec-rule-id') || {}).value || '';
        var elemType = (body.querySelector('#m-sec-rule-elem-type') || {}).value || '*';
        var allowed = ((body.querySelector('#m-sec-rule-allowed') || {}).value || 'true') === 'true';
        ruleId = ruleId.trim();
        elemType = elemType.trim();

        if (!ruleId || !elemType) {
            Layer8MUtils.showError('Please fill in Rule ID and Element Type');
            return;
        }

        // Collect actions from selects
        var actions = {};
        body.querySelectorAll('select[name^="m-sec-action-"]').forEach(function(sel) {
            if (sel.value) actions[sel.value] = true;
        });

        // Collect attributes
        var attributes = {};
        body.querySelectorAll('input[name^="m-sec-attr-key-"]').forEach(function(keyInput) {
            var idx = keyInput.name.replace('m-sec-attr-key-', '');
            var valInput = body.querySelector('input[name="m-sec-attr-val-' + idx + '"]');
            var k = keyInput.value.trim();
            if (k && !k.startsWith('_new_attr_')) {
                attributes[k] = valInput ? valInput.value : '';
            }
        });

        var rule = { ruleId: ruleId, elemType: elemType, allowed: allowed, actions: actions, attributes: attributes };

        if (currentEditingRuleIndex !== null && currentEditingRuleIndex !== undefined) {
            tempRules[currentEditingRuleIndex] = rule;
        } else {
            if (tempRules.findIndex(function(r) { return r.ruleId === ruleId; }) >= 0) {
                Layer8MUtils.showError('Rule ID already exists in this role');
                return;
            }
            tempRules.push(rule);
        }

        currentEditingRuleIndex = null;
        Layer8MPopup.close();
        setTimeout(function() { refreshRoleModal(); }, 250);
    }

    // Confirm delete
    async function confirmDelete(service, roleId) {
        var confirmed = await Layer8MConfirm.confirmDelete('role "' + roleId + '"');
        if (confirmed) {
            try {
                var query = { text: 'select * from L8Role where roleId=' + roleId };
                await Layer8MAuth.delete(Layer8MConfig.resolveEndpoint(service.endpoint), query);
                Layer8MUtils.showSuccess('Role deleted');
                var activeTable = window._Layer8MNavActiveTable;
                if (activeTable) activeTable.refresh();
            } catch (e) {
                Layer8MUtils.showError('Failed to delete role: ' + (e.message || e));
            }
        }
    }

    window.MobileSecurityRolesCRUD = {
        openAdd: openAdd,
        openEdit: openEdit,
        showDetails: showDetails,
        confirmDelete: confirmDelete
    };
})();
