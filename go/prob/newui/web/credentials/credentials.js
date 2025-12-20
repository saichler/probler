// Layer 8 Ecosystem - Credentials Management Application

// Data stores
let credentials = {};

// State management
let pendingDelete = null;
let tempCredItems = [];
let currentEditMode = 'add';
let currentEditCredId = null;
let currentCredItemEditIndex = -1;

// Table instance
let credentialsTable = null;

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
    if (modalId === 'credentials-modal') {
        handleCredentialsSave(formData);
    } else if (modalId === 'cred-item-modal') {
        handleCredItemSave(formData);
    } else if (modalId === 'delete-confirm') {
        confirmDelete();
    }
}

// Flag to track if we need to refresh credentials popup after cred-item modal closes
let pendingCredentialsRefresh = false;

// Handle popup closed
function handlePopupClosed(modalId) {
    if (modalId === 'credentials-modal') {
        currentEditMode = 'add';
        currentEditCredId = null;
        tempCredItems = [];
    } else if (modalId === 'cred-item-modal') {
        currentCredItemEditIndex = -1;
        // Refresh credentials popup after cred-item modal is fully closed
        if (pendingCredentialsRefresh) {
            pendingCredentialsRefresh = false;
            refreshCredentialsPopupContent();
        }
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

// Generate credentials items table HTML for popup
function generateCredItemsTableHtml() {
    if (tempCredItems.length === 0) {
        return `
            <tr>
                <td colspan="5" class="empty-nested-table">
                    No credential items. Click "+ Add Item" to add one.
                </td>
            </tr>
        `;
    }

    return tempCredItems.map((item, index) => `
        <tr>
            <td>${escapeHtml(item.key)}</td>
            <td class="masked-value">${maskValue(item.aside)}</td>
            <td class="masked-value">${maskValue(item.yside)}</td>
            <td class="masked-value">${maskValue(item.zside)}</td>
            <td class="action-btns">
                <button type="button" class="btn btn-small" onclick="document.getElementById('credentials-iframe').contentWindow.editCredItem(${index})">
                    Edit
                </button>
                <button type="button" class="btn btn-danger btn-small" onclick="document.getElementById('credentials-iframe').contentWindow.removeCredItemAndRefresh(${index})">
                    Delete
                </button>
            </td>
        </tr>
    `).join('');
}

// Generate credentials form HTML for popup
function generateCredentialsFormHtml(credIdOrData) {
    const isEditMode = currentEditMode !== 'add';
    let credId = '';
    let credName = '';

    if (typeof credIdOrData === 'object' && credIdOrData !== null) {
        // Form data passed (preserved values)
        credId = credIdOrData.id || '';
        credName = credIdOrData.name || '';
    } else if (credIdOrData && credentials[credIdOrData]) {
        // Credential ID passed
        credId = credentials[credIdOrData].id || '';
        credName = credentials[credIdOrData].name || '';
    }

    const itemsTableHtml = generateCredItemsTableHtml();

    return `
        <div class="form-group">
            <label for="creds-id">ID</label>
            <input type="text" id="creds-id" name="creds-id" value="${escapeHtml(credId)}" ${isEditMode ? 'disabled' : ''} required>
        </div>
        <div class="form-group">
            <label for="creds-name">Name</label>
            <input type="text" id="creds-name" name="creds-name" value="${escapeHtml(credName)}" required>
        </div>
        <div class="form-group">
            <label>Credential Items</label>
            <div class="nested-table-container">
                <div class="nested-table-header">
                    <span>Individual Credentials</span>
                    <button type="button" class="btn btn-small" onclick="document.getElementById('credentials-iframe').contentWindow.showCredItemModal()">
                        + Add Item
                    </button>
                </div>
                <table class="nested-items-table">
                    <thead>
                        <tr>
                            <th>Key</th>
                            <th>A-Side</th>
                            <th>Y-Side</th>
                            <th>Z-Side</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="cred-items-tbody">
                        ${itemsTableHtml}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function showCredentialsModal(credId) {
    const isEdit = credId && credentials[credId];

    if (isEdit) {
        currentEditMode = credId;
        currentEditCredId = credId;
        tempCredItems = credsMapToArray(credentials[credId].creds);
    } else {
        currentEditMode = 'add';
        currentEditCredId = null;
        tempCredItems = [];
    }

    const formHtml = generateCredentialsFormHtml(credId);

    if (window.parent !== window) {
        window.parent.postMessage({
            type: 'probler-popup-show',
            config: {
                id: 'credentials-modal',
                title: isEdit ? 'Edit Credentials' : 'Add Credentials',
                size: 'large',
                content: formHtml,
                iframeId: 'credentials-iframe',
                saveButtonText: 'Save'
            }
        }, '*');
    }
}

function closeCredentialsModal() {
    currentEditMode = 'add';
    currentEditCredId = null;
    tempCredItems = [];
    if (window.parent !== window) {
        window.parent.postMessage({ type: 'probler-popup-close' }, '*');
    }
}

// Refresh the credentials popup content after item changes
function refreshCredentialsPopupContent() {
    // Preserve current form values from the parent popup before regenerating
    let currentFormValues = null;
    if (window.parent !== window) {
        const idInput = window.parent.document.getElementById('creds-id');
        const nameInput = window.parent.document.getElementById('creds-name');
        if (idInput || nameInput) {
            currentFormValues = {
                id: idInput ? idInput.value : '',
                name: nameInput ? nameInput.value : ''
            };
        }
    }

    // Use preserved form values if available, otherwise use original credential ID
    const formHtml = generateCredentialsFormHtml(currentFormValues || currentEditCredId);
    if (window.parent !== window) {
        window.parent.postMessage({
            type: 'probler-popup-update',
            content: formHtml
        }, '*');
    }
}

// Remove credential item and refresh popup
function removeCredItemAndRefresh(index) {
    tempCredItems.splice(index, 1);
    refreshCredentialsPopupContent();
}

// Handle credentials save from popup
async function handleCredentialsSave(formData) {
    const id = formData['creds-id'] ? formData['creds-id'].trim() : '';
    const name = formData['creds-name'] ? formData['creds-name'].trim() : '';

    if (!id || !name) {
        showToast('Please fill in all required fields', 'warning');
        return;
    }

    if (currentEditMode === 'add' && credentials[id]) {
        showToast('Credentials ID already exists', 'warning');
        return;
    }

    const credObj = {
        id: id,
        name: name,
        creds: credsArrayToMap(tempCredItems)
    };

    try {
        const method = currentEditMode === 'add' ? 'POST' : 'PATCH';
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

    if (window.parent !== window) {
        window.parent.postMessage({
            type: 'probler-popup-show',
            config: {
                id: 'delete-confirm',
                title: 'Confirm Delete',
                size: 'small',
                content: '<p class="delete-message">Are you sure you want to delete credentials "' + escapeHtml(credId) + '"?</p>',
                iframeId: 'credentials-iframe',
                saveButtonText: 'Delete'
            }
        }, '*');
    }
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

function maskValue(value) {
    if (!value) return '<span class="empty-value">-</span>';
    return '********';
}

// ============================================
// Credential Item Modal Functions (Individual)
// ============================================

// Generate credential item form HTML for popup
function generateCredItemFormHtml(index) {
    const isEdit = index !== undefined && index >= 0 && tempCredItems[index];
    const item = isEdit ? tempCredItems[index] : null;

    return `
        <div class="form-group">
            <label for="cred-item-key">Key</label>
            <input type="text" id="cred-item-key" name="cred-item-key" value="${isEdit ? escapeHtml(item.key) : ''}" placeholder="e.g., db, api, ssh" ${isEdit ? 'disabled' : ''} required>
        </div>
        <div class="form-group">
            <label for="cred-item-aside">A-Side</label>
            <div class="input-with-toggle">
                <input type="password" id="cred-item-aside" name="cred-item-aside" value="${isEdit ? escapeAttr(item.aside) : ''}" placeholder="Enter value">
                <button type="button" class="toggle-btn" onclick="document.getElementById('credentials-iframe').contentWindow.toggleFieldVisibilityInPopup('cred-item-aside', this)">
                    Show
                </button>
            </div>
        </div>
        <div class="form-group">
            <label for="cred-item-yside">Y-Side</label>
            <div class="input-with-toggle">
                <input type="password" id="cred-item-yside" name="cred-item-yside" value="${isEdit ? escapeAttr(item.yside) : ''}" placeholder="Enter value">
                <button type="button" class="toggle-btn" onclick="document.getElementById('credentials-iframe').contentWindow.toggleFieldVisibilityInPopup('cred-item-yside', this)">
                    Show
                </button>
            </div>
        </div>
        <div class="form-group">
            <label for="cred-item-zside">Z-Side</label>
            <div class="input-with-toggle">
                <input type="password" id="cred-item-zside" name="cred-item-zside" value="${isEdit ? escapeAttr(item.zside) : ''}" placeholder="Enter value">
                <button type="button" class="toggle-btn" onclick="document.getElementById('credentials-iframe').contentWindow.toggleFieldVisibilityInPopup('cred-item-zside', this)">
                    Show
                </button>
            </div>
        </div>
    `;
}

function showCredItemModal(index) {
    const isEdit = index !== undefined && index >= 0 && tempCredItems[index];
    currentCredItemEditIndex = isEdit ? index : -1;

    const formHtml = generateCredItemFormHtml(index);

    if (window.parent !== window) {
        window.parent.postMessage({
            type: 'probler-popup-show',
            config: {
                id: 'cred-item-modal',
                title: isEdit ? 'Edit Credential Item' : 'Add Credential Item',
                size: 'medium',
                content: formHtml,
                iframeId: 'credentials-iframe',
                saveButtonText: 'Save Item'
            }
        }, '*');
    }
}

function closeCredItemModal() {
    currentCredItemEditIndex = -1;
    if (window.parent !== window) {
        window.parent.postMessage({ type: 'probler-popup-close' }, '*');
    }
}

// Handle credential item save from popup
function handleCredItemSave(formData) {
    const key = formData['cred-item-key'] ? formData['cred-item-key'].trim() : '';
    const aside = formData['cred-item-aside'] || '';
    const yside = formData['cred-item-yside'] || '';
    const zside = formData['cred-item-zside'] || '';

    if (!key) {
        showToast('Key is required', 'warning');
        return;
    }

    // Check for duplicate key (only for new items)
    if (currentCredItemEditIndex < 0) {
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

    if (currentCredItemEditIndex >= 0) {
        tempCredItems[currentCredItemEditIndex] = credItem;
    } else {
        tempCredItems.push(credItem);
    }

    // Set flag to refresh credentials popup after cred-item modal closes
    pendingCredentialsRefresh = true;
    closeCredItemModal();
    // Don't refresh immediately - wait for probler-popup-closed message
}

function editCredItem(index) {
    showCredItemModal(index);
}

// Toggle field visibility in popup (called from parent window)
function toggleFieldVisibilityInPopup(fieldId, btn) {
    // The input is in the parent window's popup, so we need to access it there
    const popup = window.parent.document.querySelector('.probler-popup-body');
    if (popup) {
        const input = popup.querySelector('#' + fieldId);
        if (input) {
            if (input.type === 'password') {
                input.type = 'text';
                btn.textContent = 'Hide';
            } else {
                input.type = 'password';
                btn.textContent = 'Show';
            }
        }
    }
}

// ============================================
// Delete Modal Functions
// ============================================

function closeDeleteModal() {
    pendingDelete = null;
    if (window.parent !== window) {
        window.parent.postMessage({ type: 'probler-popup-close' }, '*');
    }
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
        closeDeleteModal();
        renderCredentials();
        showToast('Credentials deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting credentials:', error);
        showToast('Error deleting credentials', 'error');
        closeDeleteModal();
    }
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
