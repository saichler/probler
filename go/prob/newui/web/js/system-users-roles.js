// System Users & Roles Management
// Uses makeAuthenticatedRequest from app.js

let urUsers = {};
let urRoles = {};
let urTempRules = [];
let urCurrentRuleIndex = null;
let urPendingDelete = { type: null, id: null };
let urRegistryTypes = null;

const UR_ACTION_NAMES = {
    '-999': 'ALL', '1': 'POST', '2': 'PUT', '3': 'PATCH', '4': 'DELETE', '5': 'GET'
};
const UR_ACTION_CODES = {
    'ALL': '-999', 'POST': '1', 'PUT': '2', 'PATCH': '3', 'DELETE': '4', 'GET': '5'
};

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

// Fetch users data
async function fetchUsersData() {
    try {
        const body = encodeURIComponent('{"text":"select * from L8User"}');
        const response = await makeAuthenticatedRequest(`/probler/73/users?body=${body}`, { method: 'GET' });
        if (response && response.ok) {
            const data = await response.json();
            urUsers = {};
            if (data && data.list) {
                data.list.forEach(u => { urUsers[u.userId] = u; });
            }
        }
    } catch (e) { console.error('Error fetching users:', e); }
}

// Fetch roles data
async function fetchRolesData() {
    try {
        const body = encodeURIComponent('{"text":"select * from L8Role"}');
        const response = await makeAuthenticatedRequest(`/probler/74/roles?body=${body}`, { method: 'GET' });
        if (response && response.ok) {
            const data = await response.json();
            urRoles = {};
            if (data && data.list) {
                data.list.forEach(r => { urRoles[r.roleId] = r; });
            }
        }
    } catch (e) { console.error('Error fetching roles:', e); }
}

// Refresh iframe after changes
function refreshUsersIframe() {
    const iframe = document.getElementById('users-iframe');
    if (iframe && iframe.src) iframe.src = iframe.src;
}
function refreshRolesIframe() {
    const iframe = document.getElementById('roles-iframe');
    if (iframe && iframe.src) iframe.src = iframe.src;
}

// === USER MODAL ===
async function showUserModal(userId) {
    await fetchRolesData();
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
    if (!userId || !fullName) return alert('Please fill in all required fields');

    const selectedRoles = {};
    document.querySelectorAll('#user-roles-list input:checked').forEach(cb => {
        selectedRoles[cb.value] = true;
    });

    let user;
    if (editMode === 'add') {
        const password = document.getElementById('user-password').value;
        if (!password) return alert('Password is required');
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
            refreshUsersIframe();
        } else {
            alert('Failed to save user');
        }
    } catch (e) { console.error('Error saving user:', e); alert('Error saving user'); }
}

function editUser(userId) {
    urUsers[userId] && showUserModal(userId);
}

function deleteUser(userId) {
    urPendingDelete = { type: 'user', id: userId };
    document.getElementById('delete-message').textContent = `Delete user "${userId}"?`;
    document.getElementById('delete-modal').classList.add('active');
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
    if (!roleId || !roleName) return alert('Please fill in all required fields');

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
            refreshRolesIframe();
            refreshUsersIframe();
        } else {
            alert('Failed to save role');
        }
    } catch (e) { console.error('Error saving role:', e); alert('Error saving role'); }
}

function editRole(roleId) {
    urRoles[roleId] && showRoleModal(roleId);
}

function deleteRole(roleId) {
    urPendingDelete = { type: 'role', id: roleId };
    document.getElementById('delete-message').textContent = `Delete role "${roleId}"?`;
    document.getElementById('delete-modal').classList.add('active');
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

// === DELETE MODAL ===
function closeDeleteModal() {
    document.getElementById('delete-modal').classList.remove('active');
    urPendingDelete = { type: null, id: null };
}

async function confirmDelete() {
    const { type, id } = urPendingDelete;
    try {
        if (type === 'user') {
            const response = await makeAuthenticatedRequest(`/probler/73/users/${id}`, { method: 'DELETE' });
            if (response && response.ok) refreshUsersIframe();
        } else if (type === 'role') {
            const response = await makeAuthenticatedRequest(`/probler/74/roles/${id}`, { method: 'DELETE' });
            if (response && response.ok) { refreshRolesIframe(); refreshUsersIframe(); }
        }
    } catch (e) { console.error('Error deleting:', e); }
    closeDeleteModal();
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
    if (newPwd !== confirmPwd) return alert('Passwords do not match');

    const userId = document.getElementById('user-edit-mode').value;
    try {
        const response = await makeAuthenticatedRequest('/probler/73/users', {
            method: 'PATCH',
            body: JSON.stringify({ userId, password: { hash: oldPwd }, newPassword: newPwd })
        });
        if (response && response.ok) {
            closeChangePasswordModal();
            alert('Password changed');
        } else {
            alert('Failed to change password');
        }
    } catch (e) { console.error('Error changing password:', e); }
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

// Initialize data when system section loads
async function initUsersRolesData() {
    await fetchUsersData();
    await fetchRolesData();
}
