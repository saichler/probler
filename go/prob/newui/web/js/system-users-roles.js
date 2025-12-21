// System Users & Roles Management
// Uses makeAuthenticatedRequest from app.js

let urUsers = {};
let urRoles = {};
let urTempRules = [];
let urCurrentRuleIndex = null;
let urRegistryTypes = null;
let usersTable = null;
let rolesTable = null;

const UR_ACTION_NAMES = {
    '-999': 'ALL', '1': 'POST', '2': 'PUT', '3': 'PATCH', '4': 'DELETE', '5': 'GET'
};
const UR_ACTION_CODES = {
    'ALL': '-999', 'POST': '1', 'PUT': '2', 'PATCH': '3', 'DELETE': '4', 'GET': '5'
};

// === TOAST NOTIFICATION SYSTEM ===
function showUrToast(message, type = 'error', duration = 5000) {
    // Remove existing toast if any
    const existingToast = document.querySelector('.ur-toast');
    if (existingToast) existingToast.remove();

    const icons = { error: '✕', success: '✓', warning: '⚠' };
    const titles = { error: 'Error', success: 'Success', warning: 'Warning' };

    const toast = document.createElement('div');
    toast.className = `ur-toast ur-toast-${type}`;
    toast.innerHTML = `
        <div class="ur-toast-icon">${icons[type] || icons.error}</div>
        <div class="ur-toast-content">
            <div class="ur-toast-title">${titles[type] || titles.error}</div>
            <div class="ur-toast-message">${escapeHtml(message)}</div>
        </div>
        <button class="ur-toast-close" onclick="this.parentElement.remove()">×</button>
    `;

    document.body.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('ur-toast-show'), 10);

    if (duration > 0) {
        setTimeout(() => {
            toast.classList.remove('ur-toast-show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
}

// Extract error message from API response
async function getApiErrorMessage(response, defaultMessage) {
    try {
        const text = await response.text();
        if (text && text.trim()) {
            return text.trim();
        }
    } catch (e) {
        console.error('Error reading response body:', e);
    }
    return defaultMessage;
}

// Fetch registry types
async function fetchRegistryTypes() {
    if (urRegistryTypes) return urRegistryTypes;
    try {
        const response = await makeAuthenticatedRequest('/registry', { method: 'GET' });
        if (response && response.ok) {
            const data = await response.json();
            if (data && data.list) {
                urRegistryTypes = ['*', ...data.list.sort()];
            }
        }
    } catch (e) { console.error('Error fetching registry types:', e); }
    return urRegistryTypes || ['*'];
}

// === USERS TABLE ===
async function fetchUsersData() {
    try {
        const bodyParam = JSON.stringify({ text: 'select * from L8User' });
        const url = `/probler/73/users?body=${encodeURIComponent(bodyParam)}`;
        const response = await makeAuthenticatedRequest(url, { method: 'GET' });

        if (!response || !response.ok) {
            throw new Error(`HTTP error! status: ${response ? response.status : 'unknown'}`);
        }

        const data = await response.json();
        processUsersData(data);
    } catch (error) {
        console.error('Error fetching users data:', error);
        displayUsersError('Failed to load users data.');
    }
}

function processUsersData(data) {
    if (!data || !data.list) {
        displayUsersError('No users data available.');
        return;
    }

    urUsers = {};
    data.list.forEach(user => { urUsers[user.userId] = user; });
    window.urUsers = urUsers;

    const tableData = data.list.map(user => {
        const roleNames = Object.keys(user.roles || {})
            .filter(r => user.roles[r])
            .map(r => urRoles[r] ? urRoles[r].roleName : r);

        return {
            userId: user.userId,
            fullName: user.fullName || '',
            roles: roleNames.join(', ') || '-',
            actions: `<button class="ur-btn ur-btn-small" onclick="editUser('${escapeHtml(user.userId)}')">Edit</button>
                      <button class="ur-btn ur-btn-small ur-btn-danger" onclick="deleteUser('${escapeHtml(user.userId)}')">Delete</button>`
        };
    });

    renderUsersTable(tableData);
}

function renderUsersTable(data) {
    const columns = [
        { key: 'userId', label: 'User ID' },
        { key: 'fullName', label: 'Full Name' },
        { key: 'roles', label: 'Roles' },
        { key: 'actions', label: 'Actions', sortable: false }
    ];

    usersTable = new ProblerTable('users-table', {
        columns: columns,
        data: data,
        rowsPerPage: 15,
        sortable: true,
        filterable: true,
        statusColumn: null,
        onRowClick: (rowData) => {
            editUser(rowData.userId);
        }
    });
}

function displayUsersError(message) {
    const container = document.getElementById('users-table');
    if (container) {
        container.innerHTML = `<div class="error-message">
            <div class="error-icon">⚠️</div>
            <div class="error-text">${message}</div>
        </div>`;
    }
}

// === ROLES TABLE ===
async function fetchRolesData() {
    try {
        const bodyParam = JSON.stringify({ text: 'select * from L8Role' });
        const url = `/probler/74/roles?body=${encodeURIComponent(bodyParam)}`;
        const response = await makeAuthenticatedRequest(url, { method: 'GET' });

        if (!response || !response.ok) {
            throw new Error(`HTTP error! status: ${response ? response.status : 'unknown'}`);
        }

        const data = await response.json();
        processRolesData(data);
    } catch (error) {
        console.error('Error fetching roles data:', error);
        displayRolesError('Failed to load roles data.');
    }
}

function processRolesData(data) {
    if (!data || !data.list) {
        displayRolesError('No roles data available.');
        return;
    }

    urRoles = {};
    data.list.forEach(role => { urRoles[role.roleId] = role; });
    window.urRoles = urRoles;

    const tableData = data.list.map(role => {
        const rulesCount = Object.keys(role.rules || {}).length;
        return {
            roleId: role.roleId,
            roleName: role.roleName || '',
            rulesCount: rulesCount,
            actions: `<button class="ur-btn ur-btn-small" onclick="editRole('${escapeHtml(role.roleId)}')">Edit</button>
                      <button class="ur-btn ur-btn-small ur-btn-danger" onclick="deleteRole('${escapeHtml(role.roleId)}')">Delete</button>`
        };
    });

    renderRolesTable(tableData);
}

function renderRolesTable(data) {
    const columns = [
        { key: 'roleId', label: 'Role ID' },
        { key: 'roleName', label: 'Role Name' },
        { key: 'rulesCount', label: 'Rules' },
        { key: 'actions', label: 'Actions', sortable: false }
    ];

    rolesTable = new ProblerTable('roles-table', {
        columns: columns,
        data: data,
        rowsPerPage: 15,
        sortable: true,
        filterable: true,
        statusColumn: null,
        onRowClick: (rowData) => {
            editRole(rowData.roleId);
        }
    });
}

function displayRolesError(message) {
    const container = document.getElementById('roles-table');
    if (container) {
        container.innerHTML = `<div class="error-message">
            <div class="error-icon">⚠️</div>
            <div class="error-text">${message}</div>
        </div>`;
    }
}

// === USER MODAL ===
async function showUserModal(userId) {
    if (Object.keys(urRoles).length === 0) {
        await fetchRolesData();
    }
    const modal = document.getElementById('user-modal');
    const title = document.getElementById('user-modal-title');
    const editMode = document.getElementById('user-edit-mode');
    const userIdInput = document.getElementById('user-id');
    const fullNameInput = document.getElementById('user-fullname');
    const passwordInput = document.getElementById('user-password');
    const pwdAddSection = document.getElementById('password-add-section');
    const pwdEditSection = document.getElementById('password-edit-section');

    if (userId && urUsers[userId]) {
        title.textContent = 'Edit User';
        editMode.value = userId;
        userIdInput.value = userId;
        userIdInput.disabled = true;
        fullNameInput.value = urUsers[userId].fullName || '';
        pwdAddSection.style.display = 'none';
        pwdEditSection.style.display = 'block';
    } else {
        title.textContent = 'Add User';
        editMode.value = 'add';
        userIdInput.value = '';
        userIdInput.disabled = false;
        fullNameInput.value = '';
        if (passwordInput) passwordInput.value = '';
        pwdAddSection.style.display = 'block';
        pwdEditSection.style.display = 'none';
    }
    renderUserRolesList(userId);
    modal.classList.add('active');
}

function renderUserRolesList(userId) {
    const container = document.getElementById('user-roles-list');
    container.innerHTML = '';
    const userRoles = userId && urUsers[userId] ? urUsers[userId].roles || {} : {};
    Object.values(urRoles).forEach(role => {
        const checked = userRoles[role.roleId] === true;
        const div = document.createElement('div');
        div.className = 'ur-checkbox-item';
        div.innerHTML = `<input type="checkbox" id="ur-role-${role.roleId}" value="${role.roleId}" ${checked ? 'checked' : ''}>
            <label for="ur-role-${role.roleId}">${escapeHtml(role.roleName)} (${escapeHtml(role.roleId)})</label>`;
        container.appendChild(div);
    });
    if (!Object.keys(urRoles).length) {
        container.innerHTML = '<p style="color:#999;padding:10px;">No roles available.</p>';
    }
}

function closeUserModal() {
    document.getElementById('user-modal').classList.remove('active');
    document.getElementById('user-form').reset();
}

async function saveUser(event) {
    event.preventDefault();
    const editMode = document.getElementById('user-edit-mode').value;
    const userId = document.getElementById('user-id').value.trim();
    const fullName = document.getElementById('user-fullname').value.trim();
    if (!userId || !fullName) {
        showUrToast('Please fill in all required fields', 'warning');
        return;
    }

    const selectedRoles = {};
    document.querySelectorAll('#user-roles-list input:checked').forEach(cb => {
        selectedRoles[cb.value] = true;
    });

    let user;
    if (editMode === 'add') {
        const password = document.getElementById('user-password').value;
        if (!password) {
            showUrToast('Password is required for new users', 'warning');
            return;
        }
        user = { userId, fullName, password: { hash: password }, roles: selectedRoles };
    } else {
        user = { ...urUsers[editMode], fullName, roles: selectedRoles };
    }

    try {
        const method = editMode === 'add' ? 'POST' : 'PATCH';
        const response = await makeAuthenticatedRequest('/probler/73/users', {
            method, body: JSON.stringify(user)
        });
        if (response && response.ok) {
            closeUserModal();
            fetchUsersData();
            showUrToast('User saved successfully', 'success');
        } else {
            const errorMsg = await getApiErrorMessage(response, 'Failed to save user');
            showUrToast(errorMsg, 'error');
        }
    } catch (e) {
        console.error('Error saving user:', e);
        showUrToast('Error saving user: ' + e.message, 'error');
    }
}

function editUser(userId) {
    urUsers[userId] && showUserModal(userId);
}

function deleteUser(userId) {
    if (typeof ProblerConfirm !== 'undefined') {
        ProblerConfirm.show({
            type: 'danger',
            title: 'Delete User',
            message: `Are you sure you want to delete user "${userId}"?`,
            confirmText: 'Delete',
            onConfirm: function() {
                performDeleteUser(userId);
            }
        });
    }
}

// === ROLE MODAL ===
async function showRoleModal(roleId) {
    const modal = document.getElementById('role-modal');
    const title = document.getElementById('role-modal-title');
    const editMode = document.getElementById('role-edit-mode');
    const roleIdInput = document.getElementById('role-id');
    const roleNameInput = document.getElementById('role-name');

    if (roleId && urRoles[roleId]) {
        title.textContent = 'Edit Role';
        editMode.value = roleId;
        roleIdInput.value = roleId;
        roleIdInput.disabled = true;
        roleNameInput.value = urRoles[roleId].roleName || '';
        urTempRules = JSON.parse(JSON.stringify(Object.values(urRoles[roleId].rules || {})));
    } else {
        title.textContent = 'Add Role';
        editMode.value = 'add';
        roleIdInput.value = '';
        roleIdInput.disabled = false;
        roleNameInput.value = '';
        urTempRules = [];
    }
    renderRulesContainer();
    modal.classList.add('active');
}

function renderRulesContainer() {
    const container = document.getElementById('rules-container');
    container.innerHTML = '';
    if (!urTempRules.length) {
        container.innerHTML = '<p style="color:#999;padding:10px;">No rules. Click "Add Rule".</p>';
        return;
    }
    urTempRules.forEach((rule, i) => {
        const actions = Object.keys(rule.actions || {}).filter(k => rule.actions[k]).map(k => UR_ACTION_NAMES[k] || k).join(', ');
        const div = document.createElement('div');
        div.className = 'ur-rule-row';
        div.innerHTML = `<div class="ur-rule-info"><strong>${escapeHtml(rule.ruleId)}</strong>
            <span class="ur-tag ${rule.allowed ? 'allow' : 'deny'}">${rule.allowed ? 'Allow' : 'Deny'}</span>
            Type: ${escapeHtml(rule.elemType)} | Actions: ${actions || 'None'}</div>
            <button type="button" class="ur-btn ur-btn-small" onclick="editRuleAtIndex(${i})">Edit</button>
            <button type="button" class="ur-btn ur-btn-small ur-btn-danger" onclick="removeRuleAtIndex(${i})">Remove</button>`;
        container.appendChild(div);
    });
}

function closeRoleModal() {
    document.getElementById('role-modal').classList.remove('active');
    document.getElementById('role-form').reset();
    urTempRules = [];
}

async function saveRole(event) {
    event.preventDefault();
    const editMode = document.getElementById('role-edit-mode').value;
    const roleId = document.getElementById('role-id').value.trim();
    const roleName = document.getElementById('role-name').value.trim();
    if (!roleId || !roleName) {
        showUrToast('Please fill in all required fields', 'warning');
        return;
    }

    const rulesMap = {};
    urTempRules.forEach(r => { rulesMap[r.ruleId] = r; });
    const role = { roleId, roleName, rules: rulesMap };

    try {
        const method = editMode === 'add' ? 'POST' : 'PATCH';
        const response = await makeAuthenticatedRequest('/probler/74/roles', {
            method, body: JSON.stringify(role)
        });
        if (response && response.ok) {
            closeRoleModal();
            fetchRolesData();
            fetchUsersData();
            showUrToast('Role saved successfully', 'success');
        } else {
            const errorMsg = await getApiErrorMessage(response, 'Failed to save role');
            showUrToast(errorMsg, 'error');
        }
    } catch (e) {
        console.error('Error saving role:', e);
        showUrToast('Error saving role: ' + e.message, 'error');
    }
}

function editRole(roleId) {
    urRoles[roleId] && showRoleModal(roleId);
}

function deleteRole(roleId) {
    if (typeof ProblerConfirm !== 'undefined') {
        ProblerConfirm.show({
            type: 'danger',
            title: 'Delete Role',
            message: `Are you sure you want to delete role "${roleId}"?`,
            detail: 'Users with this role will lose these permissions.',
            confirmText: 'Delete',
            onConfirm: function() {
                performDeleteRole(roleId);
            }
        });
    }
}

// === RULE MODAL ===
async function addRuleRow() {
    urCurrentRuleIndex = null;
    document.getElementById('rule-index').value = '';
    document.getElementById('rule-id').value = '';
    document.getElementById('rule-allowed').value = 'true';
    document.getElementById('actions-container').innerHTML = '';
    document.getElementById('attributes-container').innerHTML = '';
    await populateElemTypeDropdown('*');
    document.getElementById('rule-modal').classList.add('active');
}

async function editRuleAtIndex(index) {
    urCurrentRuleIndex = index;
    const rule = urTempRules[index];
    document.getElementById('rule-index').value = index;
    document.getElementById('rule-id').value = rule.ruleId;
    document.getElementById('rule-allowed').value = rule.allowed ? 'true' : 'false';

    const actionsContainer = document.getElementById('actions-container');
    actionsContainer.innerHTML = '';
    Object.entries(rule.actions || {}).forEach(([code, enabled]) => {
        if (enabled) addActionRowWithValue(code);
    });

    const attrsContainer = document.getElementById('attributes-container');
    attrsContainer.innerHTML = '';
    Object.entries(rule.attributes || {}).forEach(([k, v]) => {
        addAttributeRowWithValues(k, v);
    });

    await populateElemTypeDropdown(rule.elemType);
    document.getElementById('rule-modal').classList.add('active');
}

function removeRuleAtIndex(index) {
    urTempRules.splice(index, 1);
    renderRulesContainer();
}

async function populateElemTypeDropdown(selected) {
    const types = await fetchRegistryTypes();
    const select = document.getElementById('rule-elem-type');
    select.innerHTML = types.map(t => `<option value="${t}" ${t === selected ? 'selected' : ''}>${t === '*' ? '* (All)' : t}</option>`).join('');
}

function closeRuleModal() {
    document.getElementById('rule-modal').classList.remove('active');
    document.getElementById('rule-form').reset();
}

function saveRuleForm(event) {
    event.preventDefault();
    const ruleId = document.getElementById('rule-id').value.trim();
    const elemType = document.getElementById('rule-elem-type').value;
    const allowed = document.getElementById('rule-allowed').value === 'true';
    if (!ruleId || !elemType) return alert('Rule ID and Element Type required');

    const actions = {};
    document.querySelectorAll('#actions-container .ur-kv-row select').forEach(sel => {
        if (sel.value) actions[sel.value] = true;
    });

    const attributes = {};
    document.querySelectorAll('#attributes-container .ur-kv-row').forEach(row => {
        const k = row.querySelector('.attr-key').value.trim();
        const v = row.querySelector('.attr-value').value.trim();
        if (k) attributes[k] = v;
    });

    const rule = { ruleId, elemType, allowed, actions, attributes };

    if (urCurrentRuleIndex !== null) {
        urTempRules[urCurrentRuleIndex] = rule;
    } else {
        if (urTempRules.find(r => r.ruleId === ruleId)) return alert('Rule ID already exists');
        urTempRules.push(rule);
    }
    closeRuleModal();
    renderRulesContainer();
}

function addActionRow() { addActionRowWithValue(''); }
function addActionRowWithValue(code) {
    const container = document.getElementById('actions-container');
    const div = document.createElement('div');
    div.className = 'ur-kv-row';
    const opts = Object.entries(UR_ACTION_NAMES).map(([c, n]) => `<option value="${c}" ${c === code ? 'selected' : ''}>${n}</option>`).join('');
    div.innerHTML = `<select class="ur-form-input"><option value="">Select...</option>${opts}</select>
        <button type="button" class="ur-btn ur-btn-small ur-btn-danger" onclick="this.parentElement.remove()">X</button>`;
    container.appendChild(div);
}

function addAttributeRow() { addAttributeRowWithValues('', ''); }
function addAttributeRowWithValues(k, v) {
    const container = document.getElementById('attributes-container');
    const div = document.createElement('div');
    div.className = 'ur-kv-row';
    div.innerHTML = `<input type="text" class="ur-form-input attr-key" placeholder="Key" value="${escapeHtml(k)}">
        <input type="text" class="ur-form-input attr-value" placeholder="Value" value="${escapeHtml(v)}">
        <button type="button" class="ur-btn ur-btn-small ur-btn-danger" onclick="this.parentElement.remove()">X</button>`;
    container.appendChild(div);
}

// Perform user delete after confirmation
async function performDeleteUser(userId) {
    try {
        const response = await makeAuthenticatedRequest(`/probler/73/users/${userId}`, { method: 'DELETE' });
        if (response && response.ok) {
            fetchUsersData();
            showUrToast('User deleted successfully', 'success');
        } else {
            const errorMsg = await getApiErrorMessage(response, 'Failed to delete user');
            showUrToast(errorMsg, 'error');
        }
    } catch (e) {
        console.error('Error deleting user:', e);
        showUrToast('Error deleting user: ' + e.message, 'error');
    }
}

// Perform role delete after confirmation
async function performDeleteRole(roleId) {
    try {
        const response = await makeAuthenticatedRequest(`/probler/74/roles/${roleId}`, { method: 'DELETE' });
        if (response && response.ok) {
            fetchRolesData();
            fetchUsersData();
            showUrToast('Role deleted successfully', 'success');
        } else {
            const errorMsg = await getApiErrorMessage(response, 'Failed to delete role');
            showUrToast(errorMsg, 'error');
        }
    } catch (e) {
        console.error('Error deleting role:', e);
        showUrToast('Error deleting role: ' + e.message, 'error');
    }
}

// === PASSWORD MODAL ===
function showChangePasswordModal() {
    document.getElementById('user-old-password').value = '';
    document.getElementById('user-new-password').value = '';
    document.getElementById('user-confirm-password').value = '';
    document.getElementById('password-modal').classList.add('active');
}

function closeChangePasswordModal() {
    document.getElementById('password-modal').classList.remove('active');
}

async function savePassword(event) {
    event.preventDefault();
    const oldPwd = document.getElementById('user-old-password').value;
    const newPwd = document.getElementById('user-new-password').value;
    const confirmPwd = document.getElementById('user-confirm-password').value;
    if (newPwd !== confirmPwd) {
        showUrToast('Passwords do not match', 'warning');
        return;
    }

    const userId = document.getElementById('user-edit-mode').value;
    try {
        const response = await makeAuthenticatedRequest('/probler/73/users', {
            method: 'PATCH',
            body: JSON.stringify({ userId, password: { hash: oldPwd }, newPassword: newPwd })
        });
        if (response && response.ok) {
            closeChangePasswordModal();
            showUrToast('Password changed successfully', 'success');
        } else {
            const errorMsg = await getApiErrorMessage(response, 'Failed to change password');
            showUrToast(errorMsg, 'error');
        }
    } catch (e) {
        console.error('Error changing password:', e);
        showUrToast('Error changing password: ' + e.message, 'error');
    }
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

// Export functions and variables for tab switching
window.fetchUsersData = fetchUsersData;
window.fetchRolesData = fetchRolesData;
window.urRoles = urRoles;
window.urUsers = urUsers;
