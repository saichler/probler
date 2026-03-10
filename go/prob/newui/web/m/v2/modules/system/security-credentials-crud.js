/**
 * Mobile System Module - Security Credentials CRUD
 * Desktop Equivalent: l8ui/sys/security/l8security-credentials-crud.js
 * Handles nested creds map with stacked credential item editor modal
 */
(function() {
    'use strict';

    var tempCredItems = [];
    var currentCredItemEditIndex = -1;
    var currentService = null;
    var currentIsEdit = false;

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function escapeAttr(str) { return escapeHtml(str); }

    // Convert creds map to array
    function credsMapToArray(credsMap) {
        if (!credsMap) return [];
        return Object.entries(credsMap).map(function(entry) {
            return { key: entry[0], aside: entry[1].aside || '', yside: entry[1].yside || '', zside: entry[1].zside || '' };
        });
    }

    // Convert creds array to map
    function credsArrayToMap(credsArray) {
        var map = {};
        credsArray.forEach(function(item) {
            if (item.key && item.key.trim()) {
                map[item.key.trim()] = { aside: item.aside || '', yside: item.yside || '', zside: item.zside || '' };
            }
        });
        return map;
    }

    function maskValue(value) {
        return value ? '********' : '<span style="color:var(--layer8d-text-muted,#999);">-</span>';
    }

    // Generate credential items table HTML
    function generateCredItemsHtml() {
        if (tempCredItems.length === 0) {
            return '<p style="color:var(--layer8d-text-muted,#999);padding:10px;text-align:center;">No credential items. Click "Add Item" to add one.</p>';
        }
        return tempCredItems.map(function(item, index) {
            return '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px;border:1px solid var(--layer8d-border,#e2e8f0);border-radius:6px;margin-bottom:6px;">' +
                '<div style="flex:1;">' +
                '<div style="font-weight:600;font-size:14px;">' + escapeHtml(item.key) + '</div>' +
                '<div style="font-size:12px;color:var(--layer8d-text-medium,#718096);margin-top:2px;">' +
                'A: ' + maskValue(item.aside) + ' | Y: ' + maskValue(item.yside) + ' | Z: ' + maskValue(item.zside) +
                '</div></div>' +
                '<div style="display:flex;gap:6px;">' +
                '<button type="button" class="btn" style="height:32px;padding:0 12px;font-size:12px;" data-action="edit-item" data-index="' + index + '">Edit</button>' +
                '<button type="button" class="btn btn-danger" style="height:32px;padding:0 12px;font-size:12px;" data-action="remove-item" data-index="' + index + '">Delete</button>' +
                '</div></div>';
        }).join('');
    }

    // Generate credentials form HTML
    function generateCredentialsFormHtml(credId, credName) {
        return '<div class="mobile-form-field">' +
            '<label class="mobile-form-label">ID</label>' +
            '<input type="text" id="m-sec-cred-id" class="mobile-form-input" value="' + escapeAttr(credId || '') + '"' + (currentIsEdit ? ' disabled' : '') + ' required>' +
            '</div>' +
            '<div class="mobile-form-field">' +
            '<label class="mobile-form-label">Name</label>' +
            '<input type="text" id="m-sec-cred-name" class="mobile-form-input" value="' + escapeAttr(credName || '') + '" required>' +
            '</div>' +
            '<div class="mobile-form-field">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
            '<label class="mobile-form-label" style="margin-bottom:0;">Credential Items</label>' +
            '<button type="button" class="btn" style="height:32px;padding:0 12px;font-size:12px;" data-action="add-item">Add Item</button>' +
            '</div>' +
            '<div id="m-sec-cred-items-container">' + generateCredItemsHtml() + '</div>' +
            '</div>';
    }

    function getFormValues() {
        var body = Layer8MPopup.getBody();
        if (!body) return { id: '', name: '' };
        return {
            id: (body.querySelector('#m-sec-cred-id') || {}).value || '',
            name: (body.querySelector('#m-sec-cred-name') || {}).value || ''
        };
    }

    function refreshCredModal() {
        var body = Layer8MPopup.getBody();
        if (!body || !body.querySelector('#m-sec-cred-id')) return;
        var vals = getFormValues();
        Layer8MPopup.updateContent(generateCredentialsFormHtml(vals.id, vals.name));
    }

    function attachCredModalEvents(popup) {
        popup.body.addEventListener('click', function(e) {
            var btn = e.target.closest('[data-action]');
            if (!btn) return;
            var action = btn.dataset.action;
            var index = parseInt(btn.dataset.index, 10);

            if (action === 'add-item') {
                openCredItemModal(null);
            } else if (action === 'edit-item' && !isNaN(index)) {
                openCredItemModal(index);
            } else if (action === 'remove-item' && !isNaN(index)) {
                tempCredItems.splice(index, 1);
                refreshCredModal();
            }
        });
    }

    // Open Add Credentials modal
    async function openAdd(service) {
        currentService = service;
        currentIsEdit = false;
        tempCredItems = [];

        Layer8MPopup.show({
            title: 'Add Credentials',
            content: generateCredentialsFormHtml('', ''),
            size: 'large',
            showFooter: true,
            saveButtonText: 'Save',
            onSave: function() { handleCredSave(); },
            onShow: attachCredModalEvents
        });
    }

    // Open Edit Credentials modal
    async function openEdit(service, credId) {
        currentService = service;
        currentIsEdit = true;

        var cred = null;
        try {
            var query = encodeURIComponent(JSON.stringify({ text: 'select * from L8Credentials where id=' + credId }));
            var data = await Layer8MAuth.get(Layer8MConfig.resolveEndpoint(service.endpoint) + '?body=' + query);
            cred = (data && data.list && data.list.length > 0) ? data.list[0] : null;
        } catch (e) {
            Layer8MUtils.showError('Failed to load credentials');
            return;
        }
        if (!cred) { Layer8MUtils.showError('Credentials not found'); return; }

        tempCredItems = credsMapToArray(cred.creds);

        Layer8MPopup.show({
            title: 'Edit Credentials',
            content: generateCredentialsFormHtml(cred.id, cred.name),
            size: 'large',
            showFooter: true,
            saveButtonText: 'Save',
            onSave: function() { handleCredSave(); },
            onShow: attachCredModalEvents
        });
    }

    // Show credentials details (read-only)
    async function showDetails(service, item) {
        currentService = service;
        currentIsEdit = true;

        var cred = null;
        try {
            var query = encodeURIComponent(JSON.stringify({ text: 'select * from L8Credentials where id=' + item.id }));
            var data = await Layer8MAuth.get(Layer8MConfig.resolveEndpoint(service.endpoint) + '?body=' + query);
            cred = (data && data.list && data.list.length > 0) ? data.list[0] : null;
        } catch (e) { /* fallback */ }
        if (!cred) cred = item;

        tempCredItems = credsMapToArray(cred.creds);

        Layer8MPopup.show({
            title: 'Credentials Details',
            content: generateCredentialsFormHtml(cred.id, cred.name),
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
                openEdit(service, item.id);
            }
        });
    }

    // Handle credentials save
    async function handleCredSave() {
        var body = Layer8MPopup.getBody();
        if (!body) return;

        var id = (body.querySelector('#m-sec-cred-id') || {}).value || '';
        var name = (body.querySelector('#m-sec-cred-name') || {}).value || '';
        id = id.trim();
        name = name.trim();

        if (!id || !name) {
            Layer8MUtils.showError('Please fill in ID and Name');
            return;
        }

        var credData = { id: id, name: name, creds: credsArrayToMap(tempCredItems) };

        try {
            var endpoint = Layer8MConfig.resolveEndpoint(currentService.endpoint);
            if (currentIsEdit) {
                await Layer8MAuth.put(endpoint, credData);
            } else {
                await Layer8MAuth.post(endpoint, credData);
            }
            Layer8MPopup.close();
            Layer8MUtils.showSuccess('Credentials saved');
            var activeTable = window._Layer8MNavActiveTable;
            if (activeTable) activeTable.refresh();
        } catch (e) {
            Layer8MUtils.showError('Error saving credentials: ' + (e.message || e));
        }
    }

    // ===== Credential Item Modal (stacked) =====

    function generateCredItemFormHtml(item) {
        var isEdit = item !== null;
        return '<div class="mobile-form-field">' +
            '<label class="mobile-form-label">Key</label>' +
            '<input type="text" id="m-sec-cred-item-key" class="mobile-form-input" value="' + escapeAttr(isEdit ? item.key : '') + '"' + (isEdit ? ' disabled' : '') + ' placeholder="e.g., db, api, ssh" required>' +
            '</div>' +
            '<div class="mobile-form-field">' +
            '<label class="mobile-form-label">A-Side</label>' +
            '<div style="display:flex;gap:6px;">' +
            '<input type="password" id="m-sec-cred-item-aside" class="mobile-form-input" value="' + escapeAttr(isEdit ? item.aside : '') + '" placeholder="Enter value" style="flex:1;">' +
            '<button type="button" class="btn" style="height:32px;padding:0 12px;font-size:12px;" data-action="toggle-vis" data-field="m-sec-cred-item-aside">Show</button>' +
            '</div></div>' +
            '<div class="mobile-form-field">' +
            '<label class="mobile-form-label">Y-Side</label>' +
            '<div style="display:flex;gap:6px;">' +
            '<input type="password" id="m-sec-cred-item-yside" class="mobile-form-input" value="' + escapeAttr(isEdit ? item.yside : '') + '" placeholder="Enter value" style="flex:1;">' +
            '<button type="button" class="btn" style="height:32px;padding:0 12px;font-size:12px;" data-action="toggle-vis" data-field="m-sec-cred-item-yside">Show</button>' +
            '</div></div>' +
            '<div class="mobile-form-field">' +
            '<label class="mobile-form-label">Z-Side</label>' +
            '<div style="display:flex;gap:6px;">' +
            '<input type="password" id="m-sec-cred-item-zside" class="mobile-form-input" value="' + escapeAttr(isEdit ? item.zside : '') + '" placeholder="Enter value" style="flex:1;">' +
            '<button type="button" class="btn" style="height:32px;padding:0 12px;font-size:12px;" data-action="toggle-vis" data-field="m-sec-cred-item-zside">Show</button>' +
            '</div></div>';
    }

    function attachCredItemModalEvents(popup) {
        popup.body.addEventListener('click', function(e) {
            var btn = e.target.closest('[data-action="toggle-vis"]');
            if (!btn) return;
            var input = popup.body.querySelector('#' + btn.dataset.field);
            if (input) {
                if (input.type === 'password') {
                    input.type = 'text';
                    btn.textContent = 'Hide';
                } else {
                    input.type = 'password';
                    btn.textContent = 'Show';
                }
            }
        });
    }

    function openCredItemModal(index) {
        currentCredItemEditIndex = (index !== null && index !== undefined) ? index : -1;
        var item = currentCredItemEditIndex >= 0 ? tempCredItems[currentCredItemEditIndex] : null;

        Layer8MPopup.show({
            title: item ? 'Edit Credential Item' : 'Add Credential Item',
            content: generateCredItemFormHtml(item),
            size: 'large',
            showFooter: true,
            saveButtonText: 'Save Item',
            onSave: function() { handleCredItemSave(); },
            onShow: attachCredItemModalEvents
        });
    }

    function handleCredItemSave() {
        var body = Layer8MPopup.getBody();
        if (!body) return;

        var key = (body.querySelector('#m-sec-cred-item-key') || {}).value || '';
        var aside = (body.querySelector('#m-sec-cred-item-aside') || {}).value || '';
        var yside = (body.querySelector('#m-sec-cred-item-yside') || {}).value || '';
        var zside = (body.querySelector('#m-sec-cred-item-zside') || {}).value || '';
        key = key.trim();

        if (!key) {
            Layer8MUtils.showError('Key is required');
            return;
        }

        if (currentCredItemEditIndex < 0) {
            if (tempCredItems.findIndex(function(i) { return i.key === key; }) >= 0) {
                Layer8MUtils.showError('A credential with this key already exists');
                return;
            }
        }

        var credItem = { key: key, aside: aside, yside: yside, zside: zside };
        if (currentCredItemEditIndex >= 0) {
            tempCredItems[currentCredItemEditIndex] = credItem;
        } else {
            tempCredItems.push(credItem);
        }

        currentCredItemEditIndex = -1;
        Layer8MPopup.close();
        setTimeout(function() { refreshCredModal(); }, 250);
    }

    // Confirm delete
    async function confirmDelete(service, credId) {
        var confirmed = await Layer8MConfirm.confirmDelete('credentials "' + credId + '"');
        if (confirmed) {
            try {
                var query = { text: 'select * from L8Credentials where id=' + credId };
                await Layer8MAuth.delete(Layer8MConfig.resolveEndpoint(service.endpoint), query);
                Layer8MUtils.showSuccess('Credentials deleted');
                var activeTable = window._Layer8MNavActiveTable;
                if (activeTable) activeTable.refresh();
            } catch (e) {
                Layer8MUtils.showError('Failed to delete credentials: ' + (e.message || e));
            }
        }
    }

    window.MobileSecurityCredentialsCRUD = {
        openAdd: openAdd,
        openEdit: openEdit,
        showDetails: showDetails,
        confirmDelete: confirmDelete
    };
})();
