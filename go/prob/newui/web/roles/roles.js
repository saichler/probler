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
let tempRules = [];
let currentEditMode = 'add';
let currentEditRoleId = null;

// Temporary storage for rule modal (actions and attributes)
let tempRuleActions = {};
let tempRuleAttributes = {};

// Cached registry types for Element Type dropdown
let registryTypes = null;

// Authentication token (from localStorage or parent window)
let bearerToken = localStorage.getItem('bearerToken') || null;

// Callback for when roles change (can be set by parent)
let onRolesChanged = null;

// Listen for messages from parent popup
window.addEventListener('message', function(event) {
    if (!event.data || !event.data.type) return;

    switch (event.data.type) {
        case 'probler-popup-save':
            handlePopupSave(event.data.id, event.data.formData);
            break;
        case 'probler-popup-closed':
            handlePopupClosed(event.data.id);
            break;
        case 'probler-confirm-result':
            handleConfirmResult(event.data.id, event.data.confirmed);
            break;
    }
});

// Handle confirmation results from ProblerConfirm
function handleConfirmResult(id, confirmed) {
    if (!confirmed) return;

    if (id && id.startsWith('delete-role-')) {
        const roleId = id.replace('delete-role-', '');
        performDeleteRole(roleId);
    }
}

// Handle save from popup
function handlePopupSave(modalId, formData) {
    if (modalId === 'role-modal') {
        handleRoleSave(formData);
    } else if (modalId === 'rule-modal') {
        handleRuleSave(formData);
    }
}

// Flag to track if we need to refresh role popup after rule modal closes
let pendingRoleRefresh = false;

// Handle popup closed
function handlePopupClosed(modalId) {
    if (modalId === 'role-modal') {
        currentEditMode = 'add';
        currentEditRoleId = null;
        tempRules = [];
    } else if (modalId === 'rule-modal') {
        currentEditingRuleIndex = null;
        // Refresh role popup after rule modal is fully closed
        if (pendingRoleRefresh) {
            pendingRoleRefresh = false;
            refreshRolePopupContent();
        }
        tempRuleActions = {};
        tempRuleAttributes = {};
    }
}

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

// Generate rules table HTML for popup
function generateRulesTableHtml() {
    if (tempRules.length === 0) {
        return '<p style="color: #999; padding: 10px;">No rules defined. Click "Add Rule" to create one.</p>';
    }

    return tempRules.map((rule, index) => {
        const actionNames = Object.keys(rule.actions || {})
            .filter(k => rule.actions[k])
            .map(k => ACTION_NAMES[k] || k)
            .join(', ');
        return `
            <div class="rule-row">
                <div class="rule-info">
                    <div class="rule-id">${escapeHtml(rule.ruleId)}</div>
                    <div class="rule-details">
                        <span class="tag ${rule.allowed ? 'allow' : 'deny'}">${rule.allowed ? 'Allow' : 'Deny'}</span>
                        Type: ${escapeHtml(rule.elemType)} |
                        Actions: ${actionNames || 'None'}
                    </div>
                </div>
                <button type="button" class="btn btn-small" onclick="document.getElementById('roles-iframe').contentWindow.editRuleAtIndex(${index})">Edit</button>
                <button type="button" class="btn btn-danger btn-small" onclick="document.getElementById('roles-iframe').contentWindow.removeRuleAndRefresh(${index})">Remove</button>
            </div>
        `;
    }).join('');
}

// Generate role form HTML for popup
function generateRoleFormHtml(roleIdOrData) {
    const isEditMode = currentEditMode !== 'add';
    let roleId = '';
    let roleName = '';

    if (typeof roleIdOrData === 'object' && roleIdOrData !== null) {
        // Form data passed (preserved values)
        roleId = roleIdOrData.roleId || '';
        roleName = roleIdOrData.roleName || '';
    } else if (roleIdOrData && roles[roleIdOrData]) {
        // Role ID passed
        roleId = roles[roleIdOrData].roleId || '';
        roleName = roles[roleIdOrData].roleName || '';
    }

    const rulesHtml = generateRulesTableHtml();

    return `
        <div class="form-row">
            <div class="form-group">
                <label for="role-id">Role ID</label>
                <input type="text" id="role-id" name="role-id" value="${escapeHtml(roleId)}" ${isEditMode ? 'disabled' : ''} required>
            </div>
            <div class="form-group">
                <label for="role-name">Role Name</label>
                <input type="text" id="role-name" name="role-name" value="${escapeHtml(roleName)}" required>
            </div>
        </div>
        <div class="form-group">
            <label>Rules</label>
            <button type="button" class="btn btn-small" onclick="document.getElementById('roles-iframe').contentWindow.addRuleRow()">Add Rule</button>
            <div id="rules-container" class="rules-container">
                ${rulesHtml}
            </div>
        </div>
    `;
}

// Role Modal Functions
function showRoleModal(roleId) {
    const isEdit = roleId && roles[roleId];

    if (isEdit) {
        currentEditMode = roleId;
        currentEditRoleId = roleId;
        tempRules = JSON.parse(JSON.stringify(Object.values(roles[roleId].rules || {})));
    } else {
        currentEditMode = 'add';
        currentEditRoleId = null;
        tempRules = [];
    }

    const formHtml = generateRoleFormHtml(roleId);

    if (window.parent !== window) {
        window.parent.postMessage({
            type: 'probler-popup-show',
            config: {
                id: 'role-modal',
                title: isEdit ? 'Edit Role' : 'Add Role',
                size: 'large',
                content: formHtml,
                iframeId: 'roles-iframe',
                saveButtonText: 'Save'
            }
        }, '*');
    }
}

function closeRoleModal() {
    currentEditMode = 'add';
    currentEditRoleId = null;
    tempRules = [];
    if (window.parent !== window) {
        window.parent.postMessage({ type: 'probler-popup-close' }, '*');
    }
}

// Refresh the role popup content after rule changes
function refreshRolePopupContent() {
    // Preserve current form values from the parent popup before regenerating
    let currentFormValues = null;
    if (window.parent !== window) {
        const roleIdInput = window.parent.document.getElementById('role-id');
        const roleNameInput = window.parent.document.getElementById('role-name');
        if (roleIdInput || roleNameInput) {
            currentFormValues = {
                roleId: roleIdInput ? roleIdInput.value : '',
                roleName: roleNameInput ? roleNameInput.value : ''
            };
        }
    }

    // Use preserved form values if available, otherwise use original role ID
    const formHtml = generateRoleFormHtml(currentFormValues || currentEditRoleId);
    if (window.parent !== window) {
        window.parent.postMessage({
            type: 'probler-popup-update',
            content: formHtml
        }, '*');
    }
}

// Remove rule and refresh popup
function removeRuleAndRefresh(index) {
    tempRules.splice(index, 1);
    refreshRolePopupContent();
}

// Handle role save from popup
async function handleRoleSave(formData) {
    const roleId = formData['role-id'] ? formData['role-id'].trim() : '';
    const roleName = formData['role-name'] ? formData['role-name'].trim() : '';

    if (!roleId || !roleName) {
        showToast('Please fill in all required fields', 'warning');
        return;
    }

    if (currentEditMode === 'add' && roles[roleId]) {
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
        const method = currentEditMode === 'add' ? 'POST' : 'PATCH';
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
    if (window.parent !== window) {
        window.parent.postMessage({
            type: 'probler-confirm-show',
            config: {
                type: 'danger',
                title: 'Delete Role',
                message: `Are you sure you want to delete role "${roleId}"?`,
                detail: 'Users with this role will lose these permissions.',
                confirmText: 'Delete',
                id: `delete-role-${roleId}`
            }
        }, '*');
    }
}

// Generate actions HTML for rule form
function generateActionsHtml() {
    if (Object.keys(tempRuleActions).length === 0) {
        return '';
    }

    return Object.entries(tempRuleActions).map(([action, enabled], index) => {
        if (!enabled) return '';
        const options = Object.entries(ACTION_NAMES)
            .map(([code, name]) => '<option value="' + code + '"' + (action === code ? ' selected' : '') + '>' + name + '</option>')
            .join('');
        return `
            <div class="kv-row" data-action-index="${index}">
                <select class="action-code" name="action-${index}">
                    <option value="">Select Action</option>
                    ${options}
                </select>
                <button type="button" class="remove-btn" onclick="document.getElementById('roles-iframe').contentWindow.removeActionAndRefresh('${action}')">X</button>
            </div>
        `;
    }).join('');
}

// Generate attributes HTML for rule form
function generateAttributesHtml() {
    if (Object.keys(tempRuleAttributes).length === 0) {
        return '';
    }

    return Object.entries(tempRuleAttributes).map(([key, value], index) => {
        return `
            <div class="kv-row" data-attr-index="${index}">
                <input type="text" class="attr-key" name="attr-key-${index}" placeholder="Key" value="${escapeHtml(key)}">
                <input type="text" class="attr-value" name="attr-value-${index}" placeholder="Value" value="${escapeHtml(value)}">
                <button type="button" class="remove-btn" onclick="document.getElementById('roles-iframe').contentWindow.removeAttributeAndRefresh('${escapeHtml(key)}')">X</button>
            </div>
        `;
    }).join('');
}

// Generate rule form HTML for popup
async function generateRuleFormHtml(indexOrData) {
    let ruleId = '';
    let elemType = '*';
    let allowed = true;

    if (typeof indexOrData === 'object' && indexOrData !== null) {
        // Form data passed (preserved values)
        ruleId = indexOrData.ruleId || '';
        elemType = indexOrData.elemType || '*';
        allowed = indexOrData.allowed;
    } else if (indexOrData !== undefined && indexOrData >= 0 && tempRules[indexOrData]) {
        // Index passed
        const rule = tempRules[indexOrData];
        ruleId = rule.ruleId || '';
        elemType = rule.elemType || '*';
        allowed = rule.allowed !== false;
    }

    // Build element type options
    const types = await fetchRegistryTypes();
    const elemTypeOptions = types.map(type => {
        const selected = elemType === type ? ' selected' : '';
        return `<option value="${type}"${selected}>${type === '*' ? '* (Wildcard)' : type}</option>`;
    }).join('');

    const actionsHtml = generateActionsHtml();
    const attributesHtml = generateAttributesHtml();

    return `
        <div class="form-group">
            <label for="rule-id">Rule ID</label>
            <input type="text" id="rule-id" name="rule-id" value="${escapeHtml(ruleId)}" required>
        </div>
        <div class="form-group">
            <label for="rule-elem-type">Element Type</label>
            <select id="rule-elem-type" name="rule-elem-type" required>
                ${elemTypeOptions}
            </select>
        </div>
        <div class="form-group">
            <label for="rule-allowed">Rule Type</label>
            <select id="rule-allowed" name="rule-allowed">
                <option value="true"${allowed ? ' selected' : ''}>Allow</option>
                <option value="false"${!allowed ? ' selected' : ''}>Deny</option>
            </select>
        </div>
        <div class="form-group">
            <label>Actions (action code : enabled)</label>
            <button type="button" class="btn btn-small" onclick="document.getElementById('roles-iframe').contentWindow.addActionAndRefresh()">Add Action</button>
            <div id="actions-container" class="kv-container">
                ${actionsHtml}
            </div>
        </div>
        <div class="form-group">
            <label>Attributes (key : value)</label>
            <button type="button" class="btn btn-small" onclick="document.getElementById('roles-iframe').contentWindow.addAttributeAndRefresh()">Add Attribute</button>
            <div id="attributes-container" class="kv-container">
                ${attributesHtml}
            </div>
        </div>
    `;
}

// Rule Modal Functions
async function addRuleRow() {
    currentEditingRuleIndex = null;
    tempRuleActions = {};
    tempRuleAttributes = {};

    const formHtml = await generateRuleFormHtml();

    if (window.parent !== window) {
        window.parent.postMessage({
            type: 'probler-popup-show',
            config: {
                id: 'rule-modal',
                title: 'Add Rule',
                size: 'medium',
                content: formHtml,
                iframeId: 'roles-iframe',
                saveButtonText: 'Save Rule'
            }
        }, '*');
    }
}

async function editRuleAtIndex(index) {
    currentEditingRuleIndex = index;
    const rule = tempRules[index];

    // Copy actions and attributes to temp storage
    tempRuleActions = JSON.parse(JSON.stringify(rule.actions || {}));
    tempRuleAttributes = JSON.parse(JSON.stringify(rule.attributes || {}));

    const formHtml = await generateRuleFormHtml(index);

    if (window.parent !== window) {
        window.parent.postMessage({
            type: 'probler-popup-show',
            config: {
                id: 'rule-modal',
                title: 'Edit Rule',
                size: 'medium',
                content: formHtml,
                iframeId: 'roles-iframe',
                saveButtonText: 'Save Rule'
            }
        }, '*');
    }
}

function closeRuleModal() {
    currentEditingRuleIndex = null;
    tempRuleActions = {};
    tempRuleAttributes = {};
    if (window.parent !== window) {
        window.parent.postMessage({ type: 'probler-popup-close' }, '*');
    }
}

// Refresh rule modal content
async function refreshRuleModalContent() {
    // Preserve current form values from the parent popup before regenerating
    let currentFormValues = null;
    if (window.parent !== window) {
        const ruleIdInput = window.parent.document.getElementById('rule-id');
        const elemTypeSelect = window.parent.document.getElementById('rule-elem-type');
        const allowedSelect = window.parent.document.getElementById('rule-allowed');
        if (ruleIdInput || elemTypeSelect || allowedSelect) {
            currentFormValues = {
                ruleId: ruleIdInput ? ruleIdInput.value : '',
                elemType: elemTypeSelect ? elemTypeSelect.value : '*',
                allowed: allowedSelect ? allowedSelect.value === 'true' : true
            };
        }
    }

    // Use preserved form values if available, otherwise use original rule index
    const formHtml = await generateRuleFormHtml(currentFormValues || currentEditingRuleIndex);
    if (window.parent !== window) {
        window.parent.postMessage({
            type: 'probler-popup-update',
            content: formHtml
        }, '*');
    }
}

// Add action and refresh
function addActionAndRefresh() {
    // Add a placeholder action with empty key
    const newKey = '_new_' + Date.now();
    tempRuleActions[newKey] = true;
    refreshRuleModalContent();
}

// Remove action and refresh
function removeActionAndRefresh(actionKey) {
    delete tempRuleActions[actionKey];
    refreshRuleModalContent();
}

// Add attribute and refresh
function addAttributeAndRefresh() {
    // Add a placeholder attribute with empty key
    const newKey = '_new_attr_' + Date.now();
    tempRuleAttributes[newKey] = '';
    refreshRuleModalContent();
}

// Remove attribute and refresh
function removeAttributeAndRefresh(attrKey) {
    delete tempRuleAttributes[attrKey];
    refreshRuleModalContent();
}

// Handle rule save from popup
function handleRuleSave(formData) {
    const ruleId = formData['rule-id'] ? formData['rule-id'].trim() : '';
    const elemType = formData['rule-elem-type'] ? formData['rule-elem-type'].trim() : '';
    const allowed = formData['rule-allowed'] === 'true';

    if (!ruleId || !elemType) {
        showToast('Please fill in Rule ID and Element Type', 'warning');
        return;
    }

    // Collect actions from form data
    const actions = {};
    Object.keys(formData).forEach(key => {
        if (key.startsWith('action-')) {
            const actionCode = formData[key];
            if (actionCode) {
                actions[actionCode] = true;
            }
        }
    });

    // Collect attributes from form data
    const attributes = {};
    Object.keys(formData).forEach(key => {
        if (key.startsWith('attr-key-')) {
            const index = key.replace('attr-key-', '');
            const attrKey = formData[key];
            const attrValue = formData['attr-value-' + index] || '';
            if (attrKey && !attrKey.startsWith('_new_attr_')) {
                attributes[attrKey] = attrValue;
            }
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

    // Set flag to refresh role popup after rule modal closes
    pendingRoleRefresh = true;
    closeRuleModal();
    // Don't refresh immediately - wait for probler-popup-closed message
}

// Perform the actual delete after confirmation
async function performDeleteRole(roleId) {
    try {
        const response = await fetch(getRolesEndpoint() + '/' + encodeURIComponent(roleId), {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const errorMsg = await getApiErrorMessage(response, 'Failed to delete role');
            showToast(errorMsg, 'error');
            return;
        }

        delete roles[roleId];
        renderRoles();
        showToast('Role deleted successfully', 'success');

        // Notify parent of changes
        notifyRolesChanged();
    } catch (error) {
        console.error('Error deleting role:', error);
        showToast('Error deleting role', 'error');
    }
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
