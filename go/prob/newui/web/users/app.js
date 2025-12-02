// Data stores (in-memory, would connect to API in production)
let users = {};
let roles = {};

// Action enum mapping
const ACTION_NAMES = {
    '-999': 'ALL',
    '1': 'POST',
    '2': 'PUT',
    '3': 'PATCH',
    '4': 'DELETE',
    '5': 'GET'
};

const ACTION_CODES = {
    'ALL': '-999',
    'POST': '1',
    'PUT': '2',
    'PATCH': '3',
    'DELETE': '4',
    'GET': '5'
};

// Current editing state
let currentEditingRuleIndex = null;
let pendingDelete = { type: null, id: null };
let tempRules = [];
let pendingPasswordChange = null;

// Cached registry types for Element Type dropdown
let registryTypes = null;

// Fetch registry types from the API
async function fetchRegistryTypes() {
    if (registryTypes !== null) {
        return registryTypes;
    }

    try {
        const response = await fetch('/registry', {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (response.status === 401) {
            handleUnauthorized();
            return ['*'];
        }

        if (!response.ok) {
            const errorMsg = await getApiErrorMessage(response, 'Failed to fetch registry types');
            console.error('Failed to fetch registry types:', response.status, errorMsg);
            showToast(errorMsg, 'error');
            return ['*'];
        }

        const data = await response.json();
        if (data && data.list) {
            const sortedList = [...data.list].sort((a, b) => a.localeCompare(b));
            registryTypes = ['*', ...sortedList];
        } else {
            registryTypes = ['*'];
        }
        return registryTypes;
    } catch (error) {
        console.error('Error fetching registry types:', error);
        return ['*'];
    }
}

// Populate the Element Type dropdown
async function populateElementTypeDropdown(selectedValue = '') {
    const select = document.getElementById('rule-elem-type');
    const types = await fetchRegistryTypes();

    select.innerHTML = '';
    types.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type === '*' ? '* (Wildcard)' : type;
        if (type === selectedValue) {
            option.selected = true;
        }
        select.appendChild(option);
    });
}

// Get authorization headers for API calls using system bearer token from sessionStorage
function getAuthHeaders() {
    const bearerToken = sessionStorage.getItem('bearerToken');
    const headers = {
        'Content-Type': 'application/json'
    };
    if (bearerToken) {
        headers['Authorization'] = `Bearer ${bearerToken}`;
    }
    return headers;
}

// Handle unauthorized response - redirect to login
function handleUnauthorized() {
    sessionStorage.clear();
    window.location.href = '/login.html';
}

// Extract error message from API response (for 400/401 errors)
async function getApiErrorMessage(response, defaultMessage) {
    if (response.status === 400 || response.status === 401) {
        try {
            const text = await response.text();
            if (text) {
                return text;
            }
        } catch (e) {
            console.error('Error reading response body:', e);
        }
    }
    return defaultMessage;
}

// Toast notification system
function showToast(message, type = 'error', duration = 5000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = {
        error: '!',
        success: '\u2713',
        warning: '\u26A0'
    };

    const titles = {
        error: 'Error',
        success: 'Success',
        warning: 'Warning'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || icons.error}</div>
        <div class="toast-content">
            <div class="toast-title">${titles[type] || titles.error}</div>
            <div class="toast-message">${escapeHtml(message)}</div>
        </div>
        <button class="toast-close" onclick="dismissToast(this.parentElement)">&times;</button>
    `;

    container.appendChild(toast);

    if (duration > 0) {
        setTimeout(() => dismissToast(toast), duration);
    }

    return toast;
}

function dismissToast(toast) {
    if (!toast || toast.classList.contains('removing')) return;
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
}

// Fetch users from the API
async function fetchUsers() {
    try {
        const body = encodeURIComponent('{"text":"select * from L8User"}');
        const response = await fetch(`/probler/73/users?body=${body}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (response.status === 401) {
            handleUnauthorized();
            return;
        }

        if (!response.ok) {
            const errorMsg = await getApiErrorMessage(response, 'Failed to fetch users');
            console.error('Failed to fetch users:', response.status, errorMsg);
            showToast(errorMsg, 'error');
            return;
        }

        const data = await response.json();
        if (data && data.list) {
            users = {};
            data.list.forEach(user => {
                users[user.userId] = user;
            });
        }
        renderUsers();
    } catch (error) {
        console.error('Error fetching users:', error);
    }
}

// Fetch roles from the API
async function fetchRoles() {
    try {
        const body = encodeURIComponent('{"text":"select * from L8Role"}');
        const response = await fetch(`/probler/74/roles?body=${body}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (response.status === 401) {
            handleUnauthorized();
            return;
        }

        if (!response.ok) {
            const errorMsg = await getApiErrorMessage(response, 'Failed to fetch roles');
            console.error('Failed to fetch roles:', response.status, errorMsg);
            showToast(errorMsg, 'error');
            return;
        }

        const data = await response.json();
        if (data && data.list) {
            roles = {};
            data.list.forEach(role => {
                roles[role.roleId] = role;
            });
        }
        renderRoles();
    } catch (error) {
        console.error('Error fetching roles:', error);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    // Check if bearer token exists in sessionStorage
    const bearerToken = sessionStorage.getItem('bearerToken');
    if (!bearerToken) {
        // No token, redirect to login
        window.location.href = '/login.html';
        return;
    }

    initTabs();
    await fetchRoles();
    await fetchUsers();
});

// Tab switching
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(tabId).classList.add('active');
        });
    });
}


// Render users table
function renderUsers() {
    const tbody = document.querySelector('#users-table tbody');
    tbody.innerHTML = '';

    const userList = Object.values(users);
    if (userList.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-state">
                    <p>No users found. Click "Add User" to create one.</p>
                </td>
            </tr>
        `;
        return;
    }

    userList.forEach(user => {
        const roleNames = Object.keys(user.roles || {})
            .filter(r => user.roles[r])
            .map(r => roles[r] ? roles[r].roleName : r);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${escapeHtml(user.userId)}</td>
            <td>${escapeHtml(user.fullName)}</td>
            <td>${roleNames.map(r => `<span class="tag">${escapeHtml(r)}</span>`).join(' ') || '-'}</td>
            <td class="action-btns">
                <button class="btn btn-small" onclick="editUser('${escapeHtml(user.userId)}')">Edit</button>
                <button class="btn btn-danger btn-small" onclick="deleteUser('${escapeHtml(user.userId)}')">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Render roles table
function renderRoles() {
    const tbody = document.querySelector('#roles-table tbody');
    tbody.innerHTML = '';

    const roleList = Object.values(roles);
    if (roleList.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-state">
                    <p>No roles found. Click "Add Role" to create one.</p>
                </td>
            </tr>
        `;
        return;
    }

    roleList.forEach(role => {
        const rulesCount = Object.keys(role.rules || {}).length;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${escapeHtml(role.roleId)}</td>
            <td>${escapeHtml(role.roleName)}</td>
            <td>${rulesCount}</td>
            <td class="action-btns">
                <button class="btn btn-small" onclick="editRole('${escapeHtml(role.roleId)}')">Edit</button>
                <button class="btn btn-danger btn-small" onclick="deleteRole('${escapeHtml(role.roleId)}')">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// User Modal Functions
function showUserModal(userId = null) {
    const modal = document.getElementById('user-modal');
    const title = document.getElementById('user-modal-title');
    const editMode = document.getElementById('user-edit-mode');
    const userIdInput = document.getElementById('user-id');
    const fullNameInput = document.getElementById('user-fullname');
    const passwordInput = document.getElementById('user-password');
    const passwordAddSection = document.getElementById('password-add-section');
    const passwordEditSection = document.getElementById('password-edit-section');

    pendingPasswordChange = null;

    if (userId && users[userId]) {
        title.textContent = 'Edit User';
        editMode.value = userId;
        userIdInput.value = users[userId].userId;
        userIdInput.disabled = true;
        fullNameInput.value = users[userId].fullName || '';
        passwordAddSection.style.display = 'none';
        passwordEditSection.style.display = 'block';
    } else {
        title.textContent = 'Add User';
        editMode.value = 'add';
        userIdInput.value = '';
        userIdInput.disabled = false;
        fullNameInput.value = '';
        passwordInput.value = '';
        passwordAddSection.style.display = 'block';
        passwordEditSection.style.display = 'none';
    }

    renderUserRolesList(userId);
    modal.classList.add('active');
}

function showChangePasswordModal() {
    document.getElementById('user-old-password').value = '';
    document.getElementById('user-new-password').value = '';
    document.getElementById('user-confirm-password').value = '';
    document.getElementById('password-modal').classList.add('active');
}

function closeChangePasswordModal() {
    document.getElementById('password-modal').classList.remove('active');
    document.getElementById('password-form').reset();
}

async function confirmChangePassword(event) {
    event.preventDefault();
    const oldPassword = document.getElementById('user-old-password').value;
    const newPassword = document.getElementById('user-new-password').value;
    const confirmPassword = document.getElementById('user-confirm-password').value;

    if (newPassword !== confirmPassword) {
        showToast('Passwords do not match', 'warning');
        return;
    }

    const userId = document.getElementById('user-edit-mode').value;
    const user = {
        userId: userId,
        password: { hash: oldPassword },
        newPassword: newPassword
    };

    try {
        const response = await fetch('/probler/73/users', {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify(user)
        });

        if (response.status === 401) {
            handleUnauthorized();
            return;
        }

        if (!response.ok) {
            const errorMsg = await getApiErrorMessage(response, 'Failed to change password');
            console.error('Failed to change password:', response.status, errorMsg);
            showToast(errorMsg, 'error');
            return;
        }

        closeChangePasswordModal();
        showToast('Password changed successfully', 'success');
    } catch (error) {
        console.error('Error changing password:', error);
        showToast('Error changing password', 'error');
    }
}

function renderUserRolesList(userId) {
    const container = document.getElementById('user-roles-list');
    container.innerHTML = '';

    const userRoles = userId && users[userId] ? users[userId].roles : {};

    Object.values(roles).forEach(role => {
        const isChecked = userRoles[role.roleId] === true;
        const div = document.createElement('div');
        div.className = 'checkbox-item';
        div.innerHTML = `
            <input type="checkbox" id="role-${role.roleId}" value="${role.roleId}" ${isChecked ? 'checked' : ''}>
            <label for="role-${role.roleId}">${escapeHtml(role.roleName)} (${escapeHtml(role.roleId)})</label>
        `;
        container.appendChild(div);
    });

    if (Object.keys(roles).length === 0) {
        container.innerHTML = '<p style="color: #999; padding: 10px;">No roles available. Create roles first.</p>';
    }
}

function closeUserModal() {
    document.getElementById('user-modal').classList.remove('active');
    document.getElementById('user-form').reset();
    pendingPasswordChange = null;
}

async function saveUser(event) {
    event.preventDefault();

    const editMode = document.getElementById('user-edit-mode').value;
    const userId = document.getElementById('user-id').value.trim();
    const fullName = document.getElementById('user-fullname').value.trim();

    if (!userId || !fullName) {
        showToast('Please fill in all required fields', 'warning');
        return;
    }

    if (editMode === 'add' && users[userId]) {
        showToast('User ID already exists', 'warning');
        return;
    }

    const selectedRoles = {};
    document.querySelectorAll('#user-roles-list input[type="checkbox"]:checked').forEach(cb => {
        selectedRoles[cb.value] = true;
    });

    let user;
    if (editMode === 'add') {
        const password = document.getElementById('user-password').value;
        if (!password) {
            showToast('Password is required for new users', 'warning');
            return;
        }
        user = {
            userId: userId,
            fullName: fullName,
            password: { hash: password },
            roles: selectedRoles
        };
    } else {
        user = { ...users[editMode] };
        user.fullName = fullName;
        if (pendingPasswordChange) {
            user.password = { hash: pendingPasswordChange };
        }
        user.roles = selectedRoles;
    }

    try {
        const method = editMode === 'add' ? 'POST' : 'PATCH';
        const response = await fetch('/probler/73/users', {
            method: method,
            headers: getAuthHeaders(),
            body: JSON.stringify(user)
        });

        if (response.status === 401) {
            handleUnauthorized();
            return;
        }

        if (!response.ok) {
            const errorMsg = await getApiErrorMessage(response, 'Failed to save user');
            console.error('Failed to save user:', response.status, errorMsg);
            showToast(errorMsg, 'error');
            return;
        }

        users[userId] = user;
        closeUserModal();
        renderUsers();
    } catch (error) {
        console.error('Error saving user:', error);
        showToast('Error saving user', 'error');
    }
}

function editUser(userId) {
    showUserModal(userId);
}

function deleteUser(userId) {
    pendingDelete = { type: 'user', id: userId };
    document.getElementById('delete-message').textContent =
        `Are you sure you want to delete user "${userId}"?`;
    document.getElementById('delete-modal').classList.add('active');
}

// Role Modal Functions
function showRoleModal(roleId = null) {
    const modal = document.getElementById('role-modal');
    const title = document.getElementById('role-modal-title');
    const editMode = document.getElementById('role-edit-mode');
    const roleIdInput = document.getElementById('role-id');
    const roleNameInput = document.getElementById('role-name');

    if (roleId && roles[roleId]) {
        title.textContent = 'Edit Role';
        editMode.value = roleId;
        roleIdInput.value = roles[roleId].roleId;
        roleIdInput.disabled = true;
        roleNameInput.value = roles[roleId].roleName;
        tempRules = JSON.parse(JSON.stringify(Object.values(roles[roleId].rules || {})));
    } else {
        title.textContent = 'Add Role';
        editMode.value = 'add';
        roleIdInput.value = '';
        roleIdInput.disabled = false;
        roleNameInput.value = '';
        tempRules = [];
    }

    renderRulesContainer();
    modal.classList.add('active');
}

function renderRulesContainer() {
    const container = document.getElementById('rules-container');
    container.innerHTML = '';

    if (tempRules.length === 0) {
        container.innerHTML = '<p style="color: #999; padding: 10px;">No rules defined. Click "Add Rule" to create one.</p>';
        return;
    }

    tempRules.forEach((rule, index) => {
        const actionNames = Object.keys(rule.actions || {})
            .filter(k => rule.actions[k])
            .map(k => ACTION_NAMES[k] || k)
            .join(', ');
        const div = document.createElement('div');
        div.className = 'rule-row';
        div.innerHTML = `
            <div class="rule-info">
                <div class="rule-id">${escapeHtml(rule.ruleId)}</div>
                <div class="rule-details">
                    <span class="tag ${rule.allowed ? 'allow' : 'deny'}">${rule.allowed ? 'Allow' : 'Deny'}</span>
                    Type: ${escapeHtml(rule.elemType)} |
                    Actions: ${actionNames || 'None'}
                </div>
            </div>
            <button type="button" class="btn btn-small" onclick="editRuleAtIndex(${index})">Edit</button>
            <button type="button" class="btn btn-danger btn-small" onclick="removeRuleAtIndex(${index})">Remove</button>
        `;
        container.appendChild(div);
    });
}

function closeRoleModal() {
    document.getElementById('role-modal').classList.remove('active');
    document.getElementById('role-form').reset();
    tempRules = [];
}

async function saveRole(event) {
    event.preventDefault();

    const editMode = document.getElementById('role-edit-mode').value;
    const roleId = document.getElementById('role-id').value.trim();
    const roleName = document.getElementById('role-name').value.trim();

    if (!roleId || !roleName) {
        showToast('Please fill in all required fields', 'warning');
        return;
    }

    if (editMode === 'add' && roles[roleId]) {
        showToast('Role ID already exists', 'warning');
        return;
    }

    const rulesMap = {};
    tempRules.forEach(rule => {
        rulesMap[rule.ruleId] = rule;
    });

    const role = {
        roleId: roleId,
        roleName: roleName,
        rules: rulesMap
    };

    try {
        const method = editMode === 'add' ? 'POST' : 'PATCH';
        const response = await fetch('/probler/74/roles', {
            method: method,
            headers: getAuthHeaders(),
            body: JSON.stringify(role)
        });

        if (response.status === 401) {
            handleUnauthorized();
            return;
        }

        if (!response.ok) {
            const errorMsg = await getApiErrorMessage(response, 'Failed to save role');
            console.error('Failed to save role:', response.status, errorMsg);
            showToast(errorMsg, 'error');
            return;
        }

        // Update local state after successful API call
        roles[roleId] = role;

        closeRoleModal();
        renderRoles();
        renderUsers();
    } catch (error) {
        console.error('Error saving role:', error);
        showToast('Error saving role', 'error');
    }
}

function editRole(roleId) {
    showRoleModal(roleId);
}

function deleteRole(roleId) {
    pendingDelete = { type: 'role', id: roleId };
    document.getElementById('delete-message').textContent =
        `Are you sure you want to delete role "${roleId}"? Users with this role will lose these permissions.`;
    document.getElementById('delete-modal').classList.add('active');
}

// Rule Modal Functions
async function addRuleRow() {
    currentEditingRuleIndex = null;
    document.getElementById('rule-index').value = '';
    document.getElementById('rule-id').value = '';
    document.getElementById('rule-allowed').value = 'true';
    document.getElementById('actions-container').innerHTML = '';
    document.getElementById('attributes-container').innerHTML = '';
    await populateElementTypeDropdown('*');
    document.getElementById('rule-modal').classList.add('active');
}

async function editRuleAtIndex(index) {
    currentEditingRuleIndex = index;
    const rule = tempRules[index];

    document.getElementById('rule-index').value = index;
    document.getElementById('rule-id').value = rule.ruleId;
    document.getElementById('rule-allowed').value = rule.allowed ? 'true' : 'false';

    const actionsContainer = document.getElementById('actions-container');
    actionsContainer.innerHTML = '';
    Object.entries(rule.actions || {}).forEach(([action, enabled]) => {
        if (enabled) {
            addActionRowWithValues(action, enabled);
        }
    });

    const attrsContainer = document.getElementById('attributes-container');
    attrsContainer.innerHTML = '';
    Object.entries(rule.attributes || {}).forEach(([key, value]) => {
        addAttributeRowWithValues(key, value);
    });

    await populateElementTypeDropdown(rule.elemType);
    document.getElementById('rule-modal').classList.add('active');
}

function removeRuleAtIndex(index) {
    tempRules.splice(index, 1);
    renderRulesContainer();
}

function closeRuleModal() {
    document.getElementById('rule-modal').classList.remove('active');
    document.getElementById('rule-form').reset();
    currentEditingRuleIndex = null;
}

function saveRule(event) {
    event.preventDefault();

    const ruleId = document.getElementById('rule-id').value.trim();
    const elemType = document.getElementById('rule-elem-type').value.trim();
    const allowed = document.getElementById('rule-allowed').value === 'true';

    if (!ruleId || !elemType) {
        showToast('Please fill in Rule ID and Element Type', 'warning');
        return;
    }

    const actions = {};
    document.querySelectorAll('#actions-container .kv-row').forEach(row => {
        const actionCode = row.querySelector('.action-code').value.trim();
        if (actionCode) {
            actions[actionCode] = true;
        }
    });

    const attributes = {};
    document.querySelectorAll('#attributes-container .kv-row').forEach(row => {
        const key = row.querySelector('.attr-key').value.trim();
        const value = row.querySelector('.attr-value').value.trim();
        if (key) {
            attributes[key] = value;
        }
    });

    const rule = {
        ruleId: ruleId,
        elemType: elemType,
        allowed: allowed,
        actions: actions,
        attributes: attributes
    };

    if (currentEditingRuleIndex !== null) {
        tempRules[currentEditingRuleIndex] = rule;
    } else {
        const existingIndex = tempRules.findIndex(r => r.ruleId === ruleId);
        if (existingIndex >= 0) {
            showToast('Rule ID already exists in this role', 'warning');
            return;
        }
        tempRules.push(rule);
    }

    closeRuleModal();
    renderRulesContainer();
}

function addActionRow() {
    addActionRowWithValues('', true);
}

function addActionRowWithValues(action, enabled) {
    const container = document.getElementById('actions-container');
    const div = document.createElement('div');
    div.className = 'kv-row';
    const options = Object.entries(ACTION_NAMES)
        .map(([code, name]) => `<option value="${code}" ${action === code ? 'selected' : ''}>${name}</option>`)
        .join('');
    div.innerHTML = `
        <select class="action-code">
            <option value="">Select Action</option>
            ${options}
        </select>
        <button type="button" class="remove-btn" onclick="this.parentElement.remove()">X</button>
    `;
    container.appendChild(div);
}

function addAttributeRow() {
    addAttributeRowWithValues('', '');
}

function addAttributeRowWithValues(key, value) {
    const container = document.getElementById('attributes-container');
    const div = document.createElement('div');
    div.className = 'kv-row';
    div.innerHTML = `
        <input type="text" class="attr-key" placeholder="Key" value="${escapeHtml(key)}">
        <input type="text" class="attr-value" placeholder="Value" value="${escapeHtml(value)}">
        <button type="button" class="remove-btn" onclick="this.parentElement.remove()">X</button>
    `;
    container.appendChild(div);
}

// Delete Modal Functions
function closeDeleteModal() {
    document.getElementById('delete-modal').classList.remove('active');
    pendingDelete = { type: null, id: null };
}

function confirmDelete() {
    if (pendingDelete.type === 'user') {
        delete users[pendingDelete.id];
        renderUsers();
    } else if (pendingDelete.type === 'role') {
        delete roles[pendingDelete.id];
        Object.values(users).forEach(user => {
            if (user.roles && user.roles[pendingDelete.id]) {
                delete user.roles[pendingDelete.id];
            }
        });
        renderRoles();
        renderUsers();
    }
    closeDeleteModal();
}

// Utility function to escape HTML
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

// Export data (for debugging/API integration)
function exportData() {
    return {
        users: users,
        roles: roles
    };
}

// Import data (for API integration)
function importData(data) {
    if (data.users) users = data.users;
    if (data.roles) roles = data.roles;
    renderUsers();
    renderRoles();
}
