/**
 * Mobile System Module - Security Users CRUD
 * Desktop Equivalent: l8ui/sys/security/l8security-users-crud.js
 * Handles nested roles map in L8User via checkbox assignment
 */
(function() {
    'use strict';

    var allRoles = {};

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function escapeAttr(str) {
        return escapeHtml(str);
    }

    // Fetch all roles for checkbox display
    async function fetchAllRoles() {
        try {
            var query = encodeURIComponent(JSON.stringify({ text: 'select * from L8Role' }));
            var response = await Layer8MAuth.get(Layer8MConfig.resolveEndpoint('/74/roles') + '?body=' + query);
            allRoles = {};
            if (response && response.list) {
                response.list.forEach(function(role) {
                    allRoles[role.roleId] = role;
                });
            }
        } catch (e) {
            console.error('Error fetching roles:', e);
        }
    }

    // Generate role checkboxes HTML
    function generateRoleCheckboxes(userRoles) {
        var roleKeys = Object.keys(allRoles);
        if (roleKeys.length === 0) {
            return '<p style="color:var(--layer8d-text-muted,#999);padding:10px;">No roles available. Create roles first.</p>';
        }
        return '<div style="display:flex;flex-direction:column;gap:8px;">' +
            roleKeys.map(function(roleId) {
                var role = allRoles[roleId];
                var checked = userRoles[roleId] === true ? ' checked' : '';
                return '<label style="display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer;">' +
                    '<input type="checkbox" name="role-' + escapeAttr(roleId) + '"' + checked + ' style="width:18px;height:18px;">' +
                    '<span>' + escapeHtml(role.roleName) + ' (' + escapeHtml(roleId) + ')</span></label>';
            }).join('') + '</div>';
    }

    // Generate user form HTML
    function generateUserFormHtml(user, isEdit) {
        var userId = user ? user.userId || '' : '';
        var fullName = user ? user.fullName || '' : '';
        var userRoles = user ? user.roles || {} : {};

        var passwordSection = isEdit ? '' :
            '<div class="mobile-form-field">' +
            '<label class="mobile-form-label">Password</label>' +
            '<input type="password" id="m-sec-user-password" class="mobile-form-input" placeholder="Enter password" required>' +
            '</div>';

        return '<div class="mobile-form-field">' +
            '<label class="mobile-form-label">User ID</label>' +
            '<input type="text" id="m-sec-user-id" class="mobile-form-input" value="' + escapeAttr(userId) + '"' + (isEdit ? ' disabled' : '') + ' required>' +
            '</div>' +
            '<div class="mobile-form-field">' +
            '<label class="mobile-form-label">Full Name</label>' +
            '<input type="text" id="m-sec-user-fullname" class="mobile-form-input" value="' + escapeAttr(fullName) + '" required>' +
            '</div>' +
            passwordSection +
            '<div class="mobile-form-field">' +
            '<label class="mobile-form-label">Assigned Roles</label>' +
            generateRoleCheckboxes(userRoles) +
            '</div>';
    }

    // Collect selected roles from popup body
    function collectSelectedRoles(body) {
        var selectedRoles = {};
        body.querySelectorAll('input[type="checkbox"]').forEach(function(cb) {
            if (cb.name && cb.name.startsWith('role-') && cb.checked) {
                selectedRoles[cb.name.replace('role-', '')] = true;
            }
        });
        return selectedRoles;
    }

    // Handle save
    async function handleSave(service, isEdit, existingUserId) {
        var body = Layer8MPopup.getBody();
        if (!body) return;

        var userId = (body.querySelector('#m-sec-user-id') || {}).value || '';
        var fullName = (body.querySelector('#m-sec-user-fullname') || {}).value || '';
        userId = userId.trim();
        fullName = fullName.trim();

        if (!userId || !fullName) {
            Layer8MUtils.showError('Please fill in User ID and Full Name');
            return;
        }

        var selectedRoles = collectSelectedRoles(body);
        var userData;

        if (isEdit) {
            userData = { userId: existingUserId, fullName: fullName, roles: selectedRoles };
        } else {
            var password = (body.querySelector('#m-sec-user-password') || {}).value || '';
            if (!password) {
                Layer8MUtils.showError('Password is required for new users');
                return;
            }
            userData = { userId: userId, fullName: fullName, password: { hash: password }, roles: selectedRoles };
        }

        try {
            var endpoint = Layer8MConfig.resolveEndpoint(service.endpoint);
            if (isEdit) {
                await Layer8MAuth.put(endpoint, userData);
            } else {
                await Layer8MAuth.post(endpoint, userData);
            }
            Layer8MPopup.close();
            Layer8MUtils.showSuccess('User saved');
            var activeTable = window._Layer8MNavActiveTable;
            if (activeTable) activeTable.refresh();
        } catch (e) {
            Layer8MUtils.showError('Error saving user: ' + (e.message || e));
        }
    }

    // Open Add User modal
    async function openAdd(service) {
        await fetchAllRoles();
        Layer8MPopup.show({
            title: 'Add User',
            content: generateUserFormHtml(null, false),
            size: 'large',
            showFooter: true,
            saveButtonText: 'Save',
            onSave: function() { handleSave(service, false); }
        });
    }

    // Open Edit User modal
    async function openEdit(service, userId) {
        await fetchAllRoles();

        var user = null;
        try {
            var query = encodeURIComponent(JSON.stringify({ text: 'select * from L8User where userId=' + userId }));
            var data = await Layer8MAuth.get(Layer8MConfig.resolveEndpoint(service.endpoint) + '?body=' + query);
            user = (data && data.list && data.list.length > 0) ? data.list[0] : null;
        } catch (e) {
            Layer8MUtils.showError('Failed to load user');
            return;
        }
        if (!user) { Layer8MUtils.showError('User not found'); return; }

        Layer8MPopup.show({
            title: 'Edit User',
            content: generateUserFormHtml(user, true),
            size: 'large',
            showFooter: true,
            saveButtonText: 'Save',
            onSave: function() { handleSave(service, true, userId); }
        });
    }

    // Show user details (read-only)
    async function showDetails(service, item) {
        await fetchAllRoles();
        var userId = item.userId;

        var user = null;
        try {
            var query = encodeURIComponent(JSON.stringify({ text: 'select * from L8User where userId=' + userId }));
            var data = await Layer8MAuth.get(Layer8MConfig.resolveEndpoint(service.endpoint) + '?body=' + query);
            user = (data && data.list && data.list.length > 0) ? data.list[0] : null;
        } catch (e) { /* use item as fallback */ }
        if (!user) user = item;

        Layer8MPopup.show({
            title: 'User Details',
            content: generateUserFormHtml(user, true),
            size: 'large',
            showFooter: true,
            saveButtonText: 'Edit',
            showCancelButton: true,
            cancelButtonText: 'Close',
            onShow: function(popup) {
                popup.body.querySelectorAll('input, select, textarea').forEach(function(el) { el.disabled = true; });
            },
            onSave: function() {
                Layer8MPopup.close();
                openEdit(service, userId);
            }
        });
    }

    // Confirm delete
    async function confirmDelete(service, id) {
        var confirmed = await Layer8MConfirm.confirmDelete('user "' + id + '"');
        if (confirmed) {
            try {
                var query = { text: 'select * from L8User where userId=' + id };
                await Layer8MAuth.delete(Layer8MConfig.resolveEndpoint(service.endpoint), query);
                Layer8MUtils.showSuccess('User deleted');
                var activeTable = window._Layer8MNavActiveTable;
                if (activeTable) activeTable.refresh();
            } catch (e) {
                Layer8MUtils.showError('Failed to delete user: ' + (e.message || e));
            }
        }
    }

    window.MobileSecurityUsersCRUD = {
        openAdd: openAdd,
        openEdit: openEdit,
        showDetails: showDetails,
        confirmDelete: confirmDelete
    };
})();
