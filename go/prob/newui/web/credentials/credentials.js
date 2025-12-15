// Layer 8 Ecosystem - Credentials Management Application

// Data stores
let credentials = {};

// State management
let pendingDelete = null;
let tempCredItems = [];

// Table instance
let credentialsTable = null;

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
    await loadConfig();

    // Initialize the table
    initCredentialsTable();

    if (window.parent !== window && window.parent.bearerToken) {
        bearerToken = window.parent.bearerToken;
    }

    if (bearerToken) {
        await fetchCredentials();
    } else {
        renderCredentials();
    }
});

// Initialize the credentials table
function initCredentialsTable() {
    credentialsTable = new L8Table({
        containerId: 'credentials-table-container',
        tableId: 'credentials-table',
        pageSize: 10,
        emptyMessage: 'No credentials found. Click "Add Credentials" to create one.',
        columns: [
            { label: 'ID', key: 'id' },
            { label: 'Name', key: 'name' },
            {
                label: 'Credentials Count',
                render: (cred) => {
                    const count = cred.creds ? Object.keys(cred.creds).length : 0;
                    return L8Table.countBadge(count, 'item');
                }
            }
        ],
        onAdd: () => showCredentialsModal(),
        addButtonText: 'Add Credentials',
        onEdit: editCredentials,
        onDelete: deleteCredentials
    });
    credentialsTable.init();
}

// Get API endpoint URL
function getCredsEndpoint() {
    return CREDENTIALS_CONFIG.apiPrefix + CREDENTIALS_CONFIG.credsPath;
}

// Fetch credentials from the API
async function fetchCredentials() {
    try {
        const body = encodeURIComponent('{"text":"select * from L8Credentials"}');
        const response = await fetch(getCredsEndpoint() + '?body=' + body, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const errorMsg = await getApiErrorMessage(response, 'Failed to fetch credentials');
            console.error('Failed to fetch credentials:', response.status, errorMsg);
            showToast(errorMsg, 'error');
            return;
        }

        const data = await response.json();
        if (data && data.list) {
            credentials = {};
            data.list.forEach(cred => {
                credentials[cred.id] = cred;
            });
        }
        renderCredentials();
    } catch (error) {
        console.error('Error fetching credentials:', error);
    }
}

// Render credentials table
function renderCredentials() {
    if (credentialsTable) {
        credentialsTable.setData(credentials);
    }
}

// ============================================
// Credentials Modal Functions (L8Credentials)
// ============================================

function showCredentialsModal(credId) {
    const modal = document.getElementById('credentials-modal');
    const title = document.getElementById('credentials-modal-title');
    const editMode = document.getElementById('creds-edit-mode');
    const idInput = document.getElementById('creds-id');
    const nameInput = document.getElementById('creds-name');

    if (credId && credentials[credId]) {
        title.textContent = 'Edit Credentials';
        editMode.value = credId;
        idInput.value = credentials[credId].id;
        idInput.disabled = true;
        nameInput.value = credentials[credId].name || '';
        tempCredItems = credsMapToArray(credentials[credId].creds);
    } else {
        title.textContent = 'Add Credentials';
        editMode.value = 'add';
        idInput.value = '';
        idInput.disabled = false;
        nameInput.value = '';
        tempCredItems = [];
    }

    renderCredItemsTable();
    modal.classList.add('active');
}

function closeCredentialsModal() {
    document.getElementById('credentials-modal').classList.remove('active');
    document.getElementById('credentials-form').reset();
    tempCredItems = [];
}

async function saveCredentials(event) {
    event.preventDefault();

    const editMode = document.getElementById('creds-edit-mode').value;
    const id = document.getElementById('creds-id').value.trim();
    const name = document.getElementById('creds-name').value.trim();

    if (!id || !name) {
        showToast('Please fill in all required fields', 'warning');
        return;
    }

    if (editMode === 'add' && credentials[id]) {
        showToast('Credentials ID already exists', 'warning');
        return;
    }

    const credObj = {
        id: id,
        name: name,
        creds: credsArrayToMap(tempCredItems)
    };

    try {
        const method = editMode === 'add' ? 'POST' : 'PATCH';
        const response = await fetch(getCredsEndpoint(), {
            method: method,
            headers: getAuthHeaders(),
            body: JSON.stringify(credObj)
        });

        if (!response.ok) {
            const errorMsg = await getApiErrorMessage(response, 'Failed to save credentials');
            console.error('Failed to save credentials:', response.status, errorMsg);
            showToast(errorMsg, 'error');
            return;
        }

        credentials[id] = credObj;
        closeCredentialsModal();
        renderCredentials();
        showToast('Credentials saved successfully', 'success');
    } catch (error) {
        console.error('Error saving credentials:', error);
        showToast('Error saving credentials', 'error');
    }
}

function editCredentials(credId) {
    showCredentialsModal(credId);
}

function deleteCredentials(credId) {
    pendingDelete = credId;
    document.getElementById('delete-message').textContent =
        'Are you sure you want to delete credentials "' + credId + '"?';
    document.getElementById('delete-modal').classList.add('active');
}

// ============================================
// Credential Items Table Functions
// ============================================

function credsMapToArray(credsMap) {
    if (!credsMap) return [];
    return Object.entries(credsMap).map(([key, credObj]) => ({
        key: key,
        aside: credObj.aside || '',
        yside: credObj.yside || '',
        zside: credObj.zside || ''
    }));
}

function credsArrayToMap(credsArray) {
    const map = {};
    credsArray.forEach(item => {
        if (item.key && item.key.trim()) {
            map[item.key.trim()] = {
                aside: item.aside || '',
                yside: item.yside || '',
                zside: item.zside || ''
            };
        }
    });
    return map;
}

function renderCredItemsTable() {
    const tbody = document.getElementById('cred-items-tbody');
    tbody.innerHTML = '';

    if (tempCredItems.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-creds-table">
                    No credential items. Click "+ Add Item" to add one.
                </td>
            </tr>
        `;
        return;
    }

    tempCredItems.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${escapeHtml(item.key)}</td>
            <td class="masked-value">${maskValue(item.aside)}</td>
            <td class="masked-value">${maskValue(item.yside)}</td>
            <td class="masked-value">${maskValue(item.zside)}</td>
            <td class="action-btns">
                <button type="button" class="btn btn-small" onclick="editCredItem(${index})">
                    Edit
                </button>
                <button type="button" class="btn btn-danger btn-small" onclick="removeCredItem(${index})">
                    Delete
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function maskValue(value) {
    if (!value) return '<span class="empty-value">-</span>';
    return '********';
}

function removeCredItem(index) {
    tempCredItems.splice(index, 1);
    renderCredItemsTable();
}

// ============================================
// Credential Item Modal Functions (Individual)
// ============================================

function showCredItemModal(index) {
    const modal = document.getElementById('cred-item-modal');
    const title = document.getElementById('cred-item-modal-title');
    const editIndex = document.getElementById('cred-item-edit-index');
    const keyInput = document.getElementById('cred-item-key');
    const asideInput = document.getElementById('cred-item-aside');
    const ysideInput = document.getElementById('cred-item-yside');
    const zsideInput = document.getElementById('cred-item-zside');

    // Reset all fields to password type
    asideInput.type = 'password';
    ysideInput.type = 'password';
    zsideInput.type = 'password';
    updateToggleButtons();

    if (index !== undefined && index >= 0 && tempCredItems[index]) {
        title.textContent = 'Edit Credential Item';
        editIndex.value = index;
        keyInput.value = tempCredItems[index].key;
        keyInput.disabled = true;
        asideInput.value = tempCredItems[index].aside;
        ysideInput.value = tempCredItems[index].yside;
        zsideInput.value = tempCredItems[index].zside;
    } else {
        title.textContent = 'Add Credential Item';
        editIndex.value = -1;
        keyInput.value = '';
        keyInput.disabled = false;
        asideInput.value = '';
        ysideInput.value = '';
        zsideInput.value = '';
    }

    modal.classList.add('active');
}

function closeCredItemModal() {
    document.getElementById('cred-item-modal').classList.remove('active');
    document.getElementById('cred-item-form').reset();
}

function saveCredItem(event) {
    event.preventDefault();

    const editIndex = parseInt(document.getElementById('cred-item-edit-index').value, 10);
    const key = document.getElementById('cred-item-key').value.trim();
    const aside = document.getElementById('cred-item-aside').value;
    const yside = document.getElementById('cred-item-yside').value;
    const zside = document.getElementById('cred-item-zside').value;

    if (!key) {
        showToast('Key is required', 'warning');
        return;
    }

    // Check for duplicate key (only for new items)
    if (editIndex < 0) {
        const existingIndex = tempCredItems.findIndex(item => item.key === key);
        if (existingIndex >= 0) {
            showToast('A credential with this key already exists', 'warning');
            return;
        }
    }

    const credItem = {
        key: key,
        aside: aside,
        yside: yside,
        zside: zside
    };

    if (editIndex >= 0) {
        tempCredItems[editIndex] = credItem;
    } else {
        tempCredItems.push(credItem);
    }

    closeCredItemModal();
    renderCredItemsTable();
}

function editCredItem(index) {
    showCredItemModal(index);
}

function toggleFieldVisibility(fieldId) {
    const input = document.getElementById(fieldId);
    if (input.type === 'password') {
        input.type = 'text';
    } else {
        input.type = 'password';
    }
    updateToggleButtons();
}

function updateToggleButtons() {
    const fields = ['cred-item-aside', 'cred-item-yside', 'cred-item-zside'];
    fields.forEach(fieldId => {
        const input = document.getElementById(fieldId);
        const btn = input.parentElement.querySelector('.toggle-btn');
        if (btn) {
            btn.textContent = input.type === 'password' ? 'Show' : 'Hide';
        }
    });
}

// ============================================
// Delete Modal Functions
// ============================================

function closeDeleteModal() {
    document.getElementById('delete-modal').classList.remove('active');
    pendingDelete = null;
}

async function confirmDelete() {
    if (!pendingDelete) return;

    try {
        const response = await fetch(getCredsEndpoint() + '/' + encodeURIComponent(pendingDelete), {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const errorMsg = await getApiErrorMessage(response, 'Failed to delete credentials');
            showToast(errorMsg, 'error');
            closeDeleteModal();
            return;
        }

        delete credentials[pendingDelete];
        renderCredentials();
        showToast('Credentials deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting credentials:', error);
        showToast('Error deleting credentials', 'error');
    }

    closeDeleteModal();
}

// ============================================
// Toast Notifications
// ============================================

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

// ============================================
// Utility Functions
// ============================================

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

function escapeAttr(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// Refresh data (can be called from parent)
async function refreshData() {
    // Ensure config is loaded
    if (!CREDENTIALS_CONFIG) {
        await loadConfig();
    }
    await fetchCredentials();
}

// Export for use by parent window
if (typeof window !== 'undefined') {
    window.CredentialsApp = {
        setBearerToken: setBearerToken,
        refreshData: refreshData,
        getCredentials: function() { return credentials; }
    };
}
