// Layer 8 Ecosystem - Roles Management Application

// Data stores
let roles = {};

// Table instance
let rolesTable = null;

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

// State management
let currentEditingRuleIndex = null;
let pendingDelete = null;
let tempRules = [];

// Cached registry types for Element Type dropdown
let registryTypes = null;

// Authentication token (from localStorage or parent window)
let bearerToken = localStorage.getItem('bearerToken') || null;

// Callback for when roles change (can be set by parent)
let onRolesChanged = null;

// Set bearer token for API authentication
function setBearerToken(token) {
    bearerToken = token;
    if (token) {
        localStorage.setItem('bearerToken', token);
    } else {
        localStorage.removeItem('bearerToken');
    }
}

// Get authorization headers for API calls
function getAuthHeaders() {
    const headers = {
        'Content-Type': 'application/json'
    };
    if (bearerToken) {
        headers['Authorization'] = 'Bearer ' + bearerToken;
    }
    return headers;
}

// Extract error message from API response
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

// Get API endpoint URLs
function getRolesEndpoint() {
    return ROLES_CONFIG.apiPrefix + ROLES_CONFIG.rolesPath;
}

function getRegistryEndpoint() {
    return ROLES_CONFIG.registryPath;
}

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    // Load configuration first
    await loadConfig();

    // Initialize the table
    initRolesTable();

    // Check for token from parent window (if embedded)
    if (window.parent !== window && window.parent.bearerToken) {
        bearerToken = window.parent.bearerToken;
    }

    if (bearerToken) {
        await fetchRoles();
    } else {
        renderRoles();
    }
});

// Initialize the roles table
function initRolesTable() {
    rolesTable = new L8Table({
        containerId: 'roles-table-container',
        tableId: 'roles-table',
        pageSize: 10,
        emptyMessage: 'No roles found. Click "Add Role" to create one.',
        columns: [
            { label: 'Role ID', key: 'roleId' },
            { label: 'Role Name', key: 'roleName' },
            {
                label: 'Rules Count',
                render: (role) => {
                    const count = Object.keys(role.rules || {}).length;
                    return String(count);
                }
            }
        ],
        onAdd: () => showRoleModal(),
        addButtonText: 'Add Role',
        onEdit: editRole,
        onDelete: deleteRole
    });
    rolesTable.init();
}

// Fetch roles from the API
async function fetchRoles() {
    try {
        const body = encodeURIComponent('{"text":"select * from L8Role"}');
        const response = await fetch(getRolesEndpoint() + '?body=' + body, {
            method: 'GET',
            headers: getAuthHeaders()
        });

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

// Fetch registry types from the API
async function fetchRegistryTypes() {
    if (registryTypes !== null) {
        return registryTypes;
    }

    try {
        const response = await fetch(getRegistryEndpoint(), {
            method: 'GET',
            headers: getAuthHeaders()
        });

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
async function populateElementTypeDropdown(selectedValue) {
    if (selectedValue === undefined) selectedValue = '';
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

// Render roles table
function renderRoles() {
    if (rolesTable) {
        rolesTable.setData(roles);
    }
}

// Role Modal Functions
function showRoleModal(roleId) {
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
        const response = await fetch(getRolesEndpoint(), {
            method: method,
            headers: getAuthHeaders(),
            body: JSON.stringify(role)
        });

        if (!response.ok) {
            const errorMsg = await getApiErrorMessage(response, 'Failed to save role');
            console.error('Failed to save role:', response.status, errorMsg);
            showToast(errorMsg, 'error');
            return;
        }

        roles[roleId] = role;
        closeRoleModal();
        renderRoles();
        showToast('Role saved successfully', 'success');

        // Notify parent of changes
        notifyRolesChanged();
    } catch (error) {
        console.error('Error saving role:', error);
        showToast('Error saving role', 'error');
    }
}

function editRole(roleId) {
    showRoleModal(roleId);
}

function deleteRole(roleId) {
    pendingDelete = roleId;
    document.getElementById('delete-message').textContent =
        'Are you sure you want to delete role "' + roleId + '"? Users with this role will lose these permissions.';
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
        .map(([code, name]) => '<option value="' + code + '"' + (action === code ? ' selected' : '') + '>' + name + '</option>')
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
    pendingDelete = null;
}

async function confirmDelete() {
    if (!pendingDelete) return;

    try {
        const response = await fetch(getRolesEndpoint() + '/' + encodeURIComponent(pendingDelete), {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const errorMsg = await getApiErrorMessage(response, 'Failed to delete role');
            showToast(errorMsg, 'error');
            closeDeleteModal();
            return;
        }

        delete roles[pendingDelete];
        renderRoles();
        showToast('Role deleted successfully', 'success');

        // Notify parent of changes
        notifyRolesChanged();
    } catch (error) {
        console.error('Error deleting role:', error);
        showToast('Error deleting role', 'error');
    }

    closeDeleteModal();
}

// Notify parent that roles have changed
function notifyRolesChanged() {
    if (onRolesChanged) {
        onRolesChanged(roles);
    }
    // Also try to notify parent window
    if (window.parent !== window && window.parent.onRolesChanged) {
        window.parent.onRolesChanged(roles);
    }
}

// Toast notification system
function showToast(message, type, duration) {
    if (type === undefined) type = 'error';
    if (duration === undefined) duration = 5000;

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
    toast.className = 'toast toast-' + type;
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
        setTimeout(function() { dismissToast(toast); }, duration);
    }

    return toast;
}

function dismissToast(toast) {
    if (!toast || toast.classList.contains('removing')) return;
    toast.classList.add('removing');
    setTimeout(function() { toast.remove(); }, 300);
}

// Utility function to escape HTML
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

// Refresh data (can be called from parent)
async function refreshData() {
    // Ensure config is loaded
    if (!ROLES_CONFIG) {
        await loadConfig();
    }
    await fetchRoles();
}

// Export for use by parent window
if (typeof window !== 'undefined') {
    window.RolesApp = {
        setBearerToken: setBearerToken,
        refreshData: refreshData,
        getRoles: function() { return roles; },
        setOnRolesChanged: function(callback) { onRolesChanged = callback; }
    };
}
