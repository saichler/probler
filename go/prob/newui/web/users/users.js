// Layer 8 Ecosystem - Users Management Application

// Data stores
let users = {};
let roles = {};

// State management
let pendingDelete = null;

// Authentication token (from localStorage or parent window)
let bearerToken = localStorage.getItem('bearerToken') || null;

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
            <td>${roleNames.map(r => '<span class="tag">' + escapeHtml(r) + '</span>').join(' ') || '-'}</td>
            <td class="action-btns">
                <button class="btn btn-small" onclick="editUser('${escapeHtml(user.userId)}')">Edit</button>
                <button class="btn btn-danger btn-small" onclick="deleteUser('${escapeHtml(user.userId)}')">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// User Modal Functions
function showUserModal(userId) {
    const modal = document.getElementById('user-modal');
    const title = document.getElementById('user-modal-title');
    const editMode = document.getElementById('user-edit-mode');
    const userIdInput = document.getElementById('user-id');
    const fullNameInput = document.getElementById('user-fullname');
    const passwordInput = document.getElementById('user-password');
    const passwordAddSection = document.getElementById('password-add-section');

    if (userId && users[userId]) {
        title.textContent = 'Edit User';
        editMode.value = userId;
        userIdInput.value = users[userId].userId;
        userIdInput.disabled = true;
        fullNameInput.value = users[userId].fullName || '';
        passwordAddSection.style.display = 'none';
    } else {
        title.textContent = 'Add User';
        editMode.value = 'add';
        userIdInput.value = '';
        userIdInput.disabled = false;
        fullNameInput.value = '';
        passwordInput.value = '';
        passwordAddSection.style.display = 'block';
    }

    renderUserRolesList(userId);
    modal.classList.add('active');
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
        user.roles = selectedRoles;
    }

    try {
        const method = editMode === 'add' ? 'POST' : 'PATCH';
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
    document.getElementById('delete-message').textContent =
        'Are you sure you want to delete user "' + userId + '"?';
    document.getElementById('delete-modal').classList.add('active');
}

// Delete Modal Functions
function closeDeleteModal() {
    document.getElementById('delete-modal').classList.remove('active');
    pendingDelete = null;
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
        renderUsers();
        showToast('User deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting user:', error);
        showToast('Error deleting user', 'error');
    }

    closeDeleteModal();
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
