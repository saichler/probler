// Layer 8 Ecosystem - Users Management Application

// Data stores
let users = {};
let roles = {};

// State management
let pendingDelete = null;
let currentEditMode = 'add';
let currentEditUserId = null;

// Table instance
let usersTable = null;

// Authentication token (from localStorage or parent window)
let bearerToken = localStorage.getItem('bearerToken') || null;

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
    }
});

// Handle save from popup
function handlePopupSave(modalId, formData) {
    if (modalId === 'user-modal') {
        handleUserSave(formData);
    } else if (modalId === 'delete-confirm') {
        confirmDelete();
    }
}

// Handle popup closed
function handlePopupClosed(modalId) {
    if (modalId === 'user-modal') {
        currentEditMode = 'add';
        currentEditUserId = null;
    } else if (modalId === 'delete-confirm') {
        pendingDelete = null;
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
        headers['Authorization'] = `Bearer ${bearerToken}`;
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

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    // Load configuration first
    await loadConfig();

    // Initialize the table
    initUsersTable();

    // Check for token from parent window (if embedded)
    if (window.parent !== window && window.parent.bearerToken) {
        bearerToken = window.parent.bearerToken;
    }

    if (bearerToken) {
        await fetchRoles();
        await fetchUsers();
    } else {
        renderUsers();
    }
});

// Initialize the users table
function initUsersTable() {
    usersTable = new L8Table({
        containerId: 'users-table-container',
        tableId: 'users-table',
        pageSize: 10,
        emptyMessage: 'No users found. Click "Add User" to create one.',
        columns: [
            { label: 'User ID', key: 'userId' },
            { label: 'Full Name', key: 'fullName' },
            {
                label: 'Assigned Roles',
                render: (user) => {
                    const roleNames = Object.keys(user.roles || {})
                        .filter(r => user.roles[r])
                        .map(r => roles[r] ? roles[r].roleName : r);
                    return roleNames.length > 0 ? L8Table.tags(roleNames) : '-';
                }
            }
        ],
        onAdd: () => showUserModal(),
        addButtonText: 'Add User',
        onEdit: editUser,
        onDelete: deleteUser
    });
    usersTable.init();
}

// Get API endpoint URLs
function getUsersEndpoint() {
    return USERS_CONFIG.apiPrefix + USERS_CONFIG.usersPath;
}

function getRolesEndpoint() {
    return USERS_CONFIG.apiPrefix + USERS_CONFIG.rolesPath;
}

// Fetch users from the API
async function fetchUsers() {
    try {
        const body = encodeURIComponent('{"text":"select * from L8User"}');
        const response = await fetch(getUsersEndpoint() + '?body=' + body, {
            method: 'GET',
            headers: getAuthHeaders()
        });

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

// Fetch roles from the API (needed for role assignment)
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
            return;
        }

        const data = await response.json();
        if (data && data.list) {
            roles = {};
            data.list.forEach(role => {
                roles[role.roleId] = role;
            });
        }
    } catch (error) {
        console.error('Error fetching roles:', error);
    }
}

// Render users table
function renderUsers() {
    if (usersTable) {
        usersTable.setData(users);
    }
}

// Generate user form HTML for popup
function generateUserFormHtml(userId) {
    const isEdit = userId && users[userId];
    const user = isEdit ? users[userId] : null;
    const userRoles = user ? user.roles : {};

    // Build roles checkboxes HTML
    let rolesHtml = '';
    if (Object.keys(roles).length === 0) {
        rolesHtml = '<p style="color: #999; padding: 10px;">No roles available. Create roles first.</p>';
    } else {
        Object.values(roles).forEach(role => {
            const isChecked = userRoles[role.roleId] === true;
            rolesHtml += `
                <div class="checkbox-item">
                    <input type="checkbox" id="role-${role.roleId}" name="role-${role.roleId}" value="${role.roleId}" ${isChecked ? 'checked' : ''}>
                    <label for="role-${role.roleId}">${escapeHtml(role.roleName)} (${escapeHtml(role.roleId)})</label>
                </div>
            `;
        });
    }

    // Build password section (only for add mode)
    const passwordSection = isEdit ? '' : `
        <div class="form-group">
            <label for="user-password">Password</label>
            <input type="password" id="user-password" name="user-password" placeholder="Enter password">
        </div>
    `;

    return `
        <div class="form-group">
            <label for="user-id">User ID</label>
            <input type="text" id="user-id" name="user-id" value="${isEdit ? escapeHtml(user.userId) : ''}" ${isEdit ? 'disabled' : ''} required>
        </div>
        <div class="form-group">
            <label for="user-fullname">Full Name</label>
            <input type="text" id="user-fullname" name="user-fullname" value="${isEdit ? escapeHtml(user.fullName || '') : ''}" required>
        </div>
        ${passwordSection}
        <div class="form-group">
            <label>Assigned Roles</label>
            <div class="checkbox-list">
                ${rolesHtml}
            </div>
        </div>
    `;
}

// User Modal Functions
function showUserModal(userId) {
    const isEdit = userId && users[userId];

    if (isEdit) {
        currentEditMode = userId;
        currentEditUserId = userId;
    } else {
        currentEditMode = 'add';
        currentEditUserId = null;
    }

    const formHtml = generateUserFormHtml(userId);

    if (window.parent !== window) {
        window.parent.postMessage({
            type: 'probler-popup-show',
            config: {
                id: 'user-modal',
                title: isEdit ? 'Edit User' : 'Add User',
                size: 'medium',
                content: formHtml,
                iframeId: 'users-iframe',
                saveButtonText: 'Save'
            }
        }, '*');
    }
}

function closeUserModal() {
    currentEditMode = 'add';
    currentEditUserId = null;
    if (window.parent !== window) {
        window.parent.postMessage({ type: 'probler-popup-close' }, '*');
    }
}

// Handle user save from popup
async function handleUserSave(formData) {
    const userId = formData['user-id'] ? formData['user-id'].trim() : '';
    const fullName = formData['user-fullname'] ? formData['user-fullname'].trim() : '';

    if (!userId || !fullName) {
        showToast('Please fill in all required fields', 'warning');
        return;
    }

    if (currentEditMode === 'add' && users[userId]) {
        showToast('User ID already exists', 'warning');
        return;
    }

    // Collect selected roles from formData
    const selectedRoles = {};
    Object.keys(formData).forEach(key => {
        if (key.startsWith('role-') && formData[key]) {
            const roleId = key.replace('role-', '');
            selectedRoles[roleId] = true;
        }
    });

    let user;
    if (currentEditMode === 'add') {
        const password = formData['user-password'] || '';
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
        user = { ...users[currentEditMode] };
        user.fullName = fullName;
        user.roles = selectedRoles;
    }

    try {
        const method = currentEditMode === 'add' ? 'POST' : 'PATCH';
        const response = await fetch(getUsersEndpoint(), {
            method: method,
            headers: getAuthHeaders(),
            body: JSON.stringify(user)
        });

        if (!response.ok) {
            const errorMsg = await getApiErrorMessage(response, 'Failed to save user');
            console.error('Failed to save user:', response.status, errorMsg);
            showToast(errorMsg, 'error');
            return;
        }

        users[userId] = user;
        closeUserModal();
        renderUsers();
        showToast('User saved successfully', 'success');
    } catch (error) {
        console.error('Error saving user:', error);
        showToast('Error saving user', 'error');
    }
}

function editUser(userId) {
    showUserModal(userId);
}

function deleteUser(userId) {
    pendingDelete = userId;

    if (window.parent !== window) {
        window.parent.postMessage({
            type: 'probler-popup-show',
            config: {
                id: 'delete-confirm',
                title: 'Confirm Delete',
                size: 'small',
                content: '<p class="delete-message">Are you sure you want to delete user "' + escapeHtml(userId) + '"?</p>',
                iframeId: 'users-iframe',
                saveButtonText: 'Delete'
            }
        }, '*');
    }
}

// Close delete confirmation popup
function closeDeleteModal() {
    pendingDelete = null;
    if (window.parent !== window) {
        window.parent.postMessage({ type: 'probler-popup-close' }, '*');
    }
}

async function confirmDelete() {
    if (!pendingDelete) return;

    try {
        const response = await fetch(getUsersEndpoint() + '/' + encodeURIComponent(pendingDelete), {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const errorMsg = await getApiErrorMessage(response, 'Failed to delete user');
            showToast(errorMsg, 'error');
            closeDeleteModal();
            return;
        }

        delete users[pendingDelete];
        closeDeleteModal();
        renderUsers();
        showToast('User deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting user:', error);
        showToast('Error deleting user', 'error');
        closeDeleteModal();
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
    if (!USERS_CONFIG) {
        await loadConfig();
    }
    await fetchRoles();
    await fetchUsers();
}

// Export for use by parent window
if (typeof window !== 'undefined') {
    window.UsersApp = {
        setBearerToken: setBearerToken,
        refreshData: refreshData,
        getUsers: function() { return users; },
        getRoles: function() { return roles; }
    };
}
