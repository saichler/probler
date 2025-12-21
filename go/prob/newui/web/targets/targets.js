// Layer 8 Ecosystem - Targets Management Application

// Data stores
let targets = {};
let credentials = {};

// State management
let tempHosts = [];
let selectedInventoryType = 1;

// Table instance
let targetsTable = null;

// Protocol enum mapping
const PROTOCOLS = {
    0: 'Invalid',
    1: 'SSH',
    2: 'SNMPV2',
    3: 'SNMPV3',
    4: 'RESTCONF',
    5: 'NETCONF',
    6: 'GRPC',
    7: 'Kubectl',
    8: 'GraphQL'
};

// Inventory type enum mapping (L8PTargetType)
const INVENTORY_TYPES = {
    0: 'Invalid',
    1: 'Network Device',
    2: 'GPUS',
    3: 'Hosts',
    4: 'Virtual Machine',
    5: 'K8s Cluster',
    6: 'Storage',
    7: 'Power'
};

// Target state enum mapping (L8PTargetState)
const TARGET_STATES = {
    0: 'Invalid',
    1: 'Down',
    2: 'Up',
    3: 'Maintenance',
    4: 'Offline'
};

// Authentication token
let bearerToken = localStorage.getItem('bearerToken') || null;

// Current editing state for popup
let currentEditMode = 'add';
let currentEditTargetId = null;

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

    if (id && id.startsWith('delete-target-')) {
        const targetId = id.replace('delete-target-', '');
        performDeleteTarget(targetId);
    } else if (id && id.startsWith('bulk-action-')) {
        const parts = id.split('-');
        const state = parseInt(parts[2], 10);
        performBulkStateChange(state);
    }
}

// Handle save from popup
function handlePopupSave(modalId, formData) {
    if (modalId === 'target-modal') {
        handleTargetSave(formData);
    } else if (modalId === 'host-modal') {
        handleHostSave(formData);
    } else if (modalId === 'config-modal') {
        handleConfigSave(formData);
    }
}

// Handle popup closed
function handlePopupClosed(modalId) {
    if (modalId === 'target-modal') {
        tempHosts = [];
        currentEditMode = 'add';
        currentEditTargetId = null;
    } else if (modalId === 'host-modal') {
        onHostModalClosed();
    } else if (modalId === 'config-modal') {
        onConfigModalClosed();
    }
}

function setBearerToken(token) {
    bearerToken = token;
    if (token) {
        localStorage.setItem('bearerToken', token);
    } else {
        localStorage.removeItem('bearerToken');
    }
}

function getAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (bearerToken) {
        headers['Authorization'] = `Bearer ${bearerToken}`;
    }
    return headers;
}

async function getApiErrorMessage(response, defaultMessage) {
    if (response.status === 400 || response.status === 401) {
        try {
            const text = await response.text();
            if (text) return text;
        } catch (e) {
            console.error('Error reading response body:', e);
        }
    }
    return defaultMessage;
}

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    await loadConfig();

    // Initialize inventory type dropdown
    initInventoryTypeFilter();

    // Initialize the table
    initTargetsTable();

    // Initialize bulk action buttons
    document.getElementById('start-all-btn').addEventListener('click', () => setAllTargetsState(2));
    document.getElementById('stop-all-btn').addEventListener('click', () => setAllTargetsState(1));

    if (window.parent !== window && window.parent.bearerToken) {
        bearerToken = window.parent.bearerToken;
    }
    if (bearerToken) {
        await Promise.all([fetchTargets(), fetchCredentials()]);
    } else {
        renderTargets();
    }
});

// Initialize inventory type dropdown with enum values
function initInventoryTypeFilter() {
    const select = document.getElementById('inventory-type-filter');
    if (!select) return;

    select.innerHTML = '';
    for (const [value, label] of Object.entries(INVENTORY_TYPES)) {
        // Skip invalid type (0)
        if (parseInt(value, 10) === 0) continue;
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        if (parseInt(value, 10) === selectedInventoryType) {
            option.selected = true;
        }
        select.appendChild(option);
    }
}

// Handle inventory type filter change
function onInventoryTypeChange(value) {
    selectedInventoryType = parseInt(value, 10);
    // Update empty message for new inventory type
    if (targetsTable) {
        targetsTable.emptyMessage = getEmptyMessage();
        targetsTable.currentPage = 1;
    }
    fetchTargets(1, targetsTable ? targetsTable.pageSize : 20);
}

// Get empty message based on selected inventory type
function getEmptyMessage() {
    const typeName = INVENTORY_TYPES[selectedInventoryType] || 'targets';
    return `No ${typeName} found. Click "Add Target" to create one.`;
}

// Initialize the targets table with server-side pagination
function initTargetsTable() {
    targetsTable = new L8Table({
        containerId: 'targets-table-container',
        tableId: 'targets-table',
        pageSize: 20,
        pageSizeOptions: [10, 20, 50, 100],
        emptyMessage: getEmptyMessage(),
        serverSide: true,
        onPageChange: handlePageChange,
        columns: [
            { label: 'Target ID', key: 'targetId' },
            {
                label: 'Addresses',
                render: (target) => getTargetAddresses(target) || '-'
            },
            {
                label: 'Links ID',
                render: (target) => escapeHtml(target.linksId || '-')
            },
            {
                label: 'Hosts',
                render: (target) => {
                    const count = target.hosts ? Object.keys(target.hosts).length : 0;
                    return L8Table.countBadge(count, 'host');
                }
            },
            {
                label: 'State',
                render: (target) => L8Table.statusTag(target.state === 2)
            }
        ],
        onAdd: () => showTargetModal(),
        addButtonText: 'Add Target',
        onEdit: editTarget,
        onDelete: deleteTarget,
        onToggleState: toggleTargetState,
        getItemState: (target) => target.state === 2
    });
    targetsTable.init();
}

// Handle page change for server-side pagination
function handlePageChange(page, pageSize) {
    fetchTargets(page, pageSize);
}

function getTargetsEndpoint() {
    return TARGETS_CONFIG.apiPrefix + TARGETS_CONFIG.targetsPath;
}

function getCredsEndpoint() {
    return TARGETS_CONFIG.apiPrefix + TARGETS_CONFIG.credsPath;
}

async function fetchTargets(page, pageSize) {
    // Default to page 1 and table's page size if not provided
    if (!page) page = 1;
    if (!pageSize) pageSize = targetsTable ? targetsTable.pageSize : 20;

    // Server uses 0-based page index
    const pageIndex = page - 1;

    try {
        const query = `select * from L8PTarget where inventoryType=${selectedInventoryType} limit ${pageSize} page ${pageIndex}`;
        const body = encodeURIComponent(JSON.stringify({ text: query }));
        const response = await fetch(getTargetsEndpoint() + '?body=' + body, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const errorMsg = await getApiErrorMessage(response, 'Failed to fetch targets');
            console.error('Failed to fetch targets:', response.status, errorMsg);
            showToast(errorMsg, 'error');
            return;
        }

        const data = await response.json();

        // Extract total count from metadata
        let totalItems = 0;
        if (data && data.metadata && data.metadata.keyCount && data.metadata.keyCount.counts) {
            totalItems = data.metadata.keyCount.counts.Total || 0;
        }

        // Store targets in local cache
        if (data && data.list) {
            targets = {};
            data.list.forEach(target => {
                targets[target.targetId] = target;
            });
        }

        // Update table with server data
        if (targetsTable) {
            targetsTable.setServerData(data.list || [], totalItems);
        }
    } catch (error) {
        console.error('Error fetching targets:', error);
    }
}

async function fetchCredentials() {
    try {
        const body = encodeURIComponent('{"text":"select * from L8Credentials"}');
        const response = await fetch(getCredsEndpoint() + '?body=' + body, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            console.error('Failed to fetch credentials:', response.status);
            return;
        }

        const data = await response.json();
        if (data && data.list) {
            credentials = {};
            data.list.forEach(cred => {
                credentials[cred.id] = cred;
            });
        }
    } catch (error) {
        console.error('Error fetching credentials:', error);
    }
}

// Set state for all targets of the current inventory type
function setAllTargetsState(state) {
    const action = state === 2 ? 'start' : 'stop';
    const typeName = INVENTORY_TYPES[selectedInventoryType] || 'targets';

    if (window.parent !== window) {
        window.parent.postMessage({
            type: 'probler-confirm-show',
            config: {
                type: 'warning',
                title: state === 2 ? 'Start All Targets' : 'Stop All Targets',
                message: `Are you sure you want to ${action} all ${typeName}?`,
                confirmText: action.charAt(0).toUpperCase() + action.slice(1),
                id: `bulk-action-${state}`
            }
        }, '*');
    }
}

// Perform the bulk state change after confirmation
async function performBulkStateChange(state) {
    const typeName = INVENTORY_TYPES[selectedInventoryType] || 'targets';

    const payload = {
        actionType: selectedInventoryType,
        actionState: state
    };

    try {
        const response = await fetch(getTargetsEndpoint(), {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorMsg = await getApiErrorMessage(response, 'Failed to update targets state');
            showToast(errorMsg, 'error');
            return;
        }

        showToast(`All ${typeName} ${state === 2 ? 'started' : 'stopped'} successfully`, 'success');
        await fetchTargets();
    } catch (error) {
        showToast('Network error: ' + error.message, 'error');
    }
}

function getTargetAddresses(target) {
    if (!target.hosts) return '';
    const addressSet = new Set();
    Object.values(target.hosts).forEach(host => {
        if (host.configs) {
            Object.values(host.configs).forEach(cfg => {
                if (cfg.addr) {
                    addressSet.add(cfg.addr);
                }
            });
        }
    });
    const addresses = Array.from(addressSet);
    if (addresses.length === 0) return '';
    return addresses.map(addr => escapeHtml(addr)).join(', ');
}

function renderTargets() {
    // For server-side pagination, fetch data from server
    if (targetsTable && targetsTable.serverSide) {
        fetchTargets(targetsTable.currentPage, targetsTable.pageSize);
    } else if (targetsTable) {
        targetsTable.setData(targets);
    }
}

// ============================================
// Target Modal Functions
// ============================================

function generateTargetFormHtml(target) {
    const hasData = !!target;
    const isEditMode = currentEditMode !== 'add';
    const targetId = hasData ? escapeAttr(target.targetId) : '';
    const linksId = hasData ? escapeAttr(target.linksId || '') : '';
    const state = hasData ? target.state : 1;

    return `
        <div class="form-row">
            <div class="form-group">
                <label for="target-id">Target ID</label>
                <input type="text" id="target-id" name="target-id" value="${targetId}" ${isEditMode ? 'disabled' : ''} required>
            </div>
            <div class="form-group">
                <label for="target-links-id">Links ID</label>
                <input type="text" id="target-links-id" name="target-links-id" value="${linksId}">
            </div>
        </div>
        <div class="form-group">
            <label for="target-state">State</label>
            <select id="target-state" name="target-state">
                <option value="1" ${state === 1 ? 'selected' : ''}>Down</option>
                <option value="2" ${state === 2 ? 'selected' : ''}>Up</option>
                <option value="3" ${state === 3 ? 'selected' : ''}>Maintenance</option>
                <option value="4" ${state === 4 ? 'selected' : ''}>Offline</option>
            </select>
        </div>
        <div class="form-group">
            <label>Hosts</label>
            <div class="nested-table-container">
                <div class="nested-table-header">
                    <span>Configured Hosts</span>
                    <button type="button" class="btn btn-small" onclick="document.getElementById('targets-iframe').contentWindow.showHostModal()">
                        + Add Host
                    </button>
                </div>
                <table class="nested-items-table">
                    <thead>
                        <tr>
                            <th>Host ID</th>
                            <th>Protocols</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="hosts-tbody">${generateHostsTableRows()}</tbody>
                </table>
            </div>
        </div>
    `;
}

function generateHostsTableRows() {
    if (tempHosts.length === 0) {
        return `
            <tr>
                <td colspan="3" class="empty-nested-table">
                    No hosts configured. Click "+ Add Host" to add one.
                </td>
            </tr>
        `;
    }

    return tempHosts.map((host, index) => {
        const configsCount = host.configs ? Object.keys(host.configs).length : 0;
        return `
            <tr>
                <td>${escapeHtml(host.hostId)}</td>
                <td><span class="tag">${configsCount} protocol${configsCount !== 1 ? 's' : ''}</span></td>
                <td class="action-btns">
                    <button type="button" class="btn btn-small" onclick="document.getElementById('targets-iframe').contentWindow.editHost(${index})">Edit</button>
                    <button type="button" class="btn btn-danger btn-small" onclick="document.getElementById('targets-iframe').contentWindow.removeHostAndRefresh(${index})">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

function showTargetModal(targetId) {
    const isEdit = targetId && targets[targetId];

    if (isEdit) {
        currentEditMode = targetId;
        currentEditTargetId = targetId;
        tempHosts = hostsMapToArray(targets[targetId].hosts);
    } else {
        currentEditMode = 'add';
        currentEditTargetId = null;
        tempHosts = [];
    }

    const formHtml = generateTargetFormHtml(isEdit ? targets[targetId] : null);

    if (window.parent !== window) {
        window.parent.postMessage({
            type: 'probler-popup-show',
            config: {
                id: 'target-modal',
                title: isEdit ? 'Edit Target' : 'Add Target',
                size: 'large',
                content: formHtml,
                iframeId: 'targets-iframe',
                saveButtonText: 'Save'
            }
        }, '*');
    }
}

function closeTargetModal() {
    tempHosts = [];
    currentEditMode = 'add';
    currentEditTargetId = null;
    if (window.parent !== window) {
        window.parent.postMessage({ type: 'probler-popup-close' }, '*');
    }
}

function refreshTargetPopupContent() {
    // Preserve current form values from the parent popup before regenerating
    let currentFormValues = null;
    if (window.parent !== window) {
        const targetIdInput = window.parent.document.getElementById('target-id');
        const linksIdInput = window.parent.document.getElementById('target-links-id');
        const stateSelect = window.parent.document.getElementById('target-state');

        if (targetIdInput || linksIdInput || stateSelect) {
            currentFormValues = {
                targetId: targetIdInput ? targetIdInput.value : '',
                linksId: linksIdInput ? linksIdInput.value : '',
                state: stateSelect ? parseInt(stateSelect.value, 10) : 1
            };
        }
    }

    // Use preserved form values if available, otherwise use original target data
    const formHtml = generateTargetFormHtml(
        currentFormValues || (currentEditTargetId ? targets[currentEditTargetId] : null)
    );
    if (window.parent !== window) {
        window.parent.postMessage({
            type: 'probler-popup-update',
            content: formHtml
        }, '*');
    }
}

function removeHostAndRefresh(index) {
    tempHosts.splice(index, 1);
    refreshTargetPopupContent();
}

async function handleTargetSave(formData) {
    const targetId = formData['target-id'] ? formData['target-id'].trim() : '';
    const linksId = formData['target-links-id'] ? formData['target-links-id'].trim() : '';
    const state = parseInt(formData['target-state'], 10);

    if (!targetId) {
        showToast('Target ID is required', 'warning');
        return;
    }

    if (currentEditMode === 'add' && targets[targetId]) {
        showToast('Target ID already exists', 'warning');
        return;
    }

    const targetObj = {
        targetId: targetId,
        linksId: linksId,
        hosts: hostsArrayToMap(tempHosts),
        state: state,
        inventoryType: selectedInventoryType
    };

    try {
        const method = currentEditMode === 'add' ? 'POST' : 'PATCH';
        const response = await fetch(getTargetsEndpoint(), {
            method: method,
            headers: getAuthHeaders(),
            body: JSON.stringify(targetObj)
        });

        if (!response.ok) {
            const errorMsg = await getApiErrorMessage(response, 'Failed to save target');
            console.error('Failed to save target:', response.status, errorMsg);
            showToast(errorMsg, 'error');
            return;
        }

        targets[targetId] = targetObj;
        closeTargetModal();
        renderTargets();
        showToast('Target saved successfully', 'success');
    } catch (error) {
        console.error('Error saving target:', error);
        showToast('Error saving target', 'error');
    }
}

function editTarget(targetId) { showTargetModal(targetId); }

async function toggleTargetState(targetId) {
    const target = targets[targetId];
    if (!target) return;

    // Toggle: Down(1) -> Up(2), Up(2) -> Down(1)
    const newState = target.state === 2 ? 1 : 2;

    const targetObj = {
        targetId: target.targetId,
        linksId: target.linksId || '',
        hosts: target.hosts || {},
        state: newState,
        inventoryType: target.inventoryType || selectedInventoryType
    };

    try {
        const response = await fetch(getTargetsEndpoint(), {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify(targetObj)
        });

        if (!response.ok) {
            const errorMsg = await getApiErrorMessage(response, 'Failed to toggle state');
            showToast(errorMsg, 'error');
            return;
        }

        targets[targetId].state = newState;
        renderTargets();
        showToast(`Target ${newState === 2 ? 'started' : 'stopped'} successfully`, 'success');
    } catch (error) {
        console.error('Error toggling target state:', error);
        showToast('Error toggling target state', 'error');
    }
}

function deleteTarget(targetId) {
    if (window.parent !== window) {
        window.parent.postMessage({
            type: 'probler-confirm-show',
            config: {
                type: 'danger',
                title: 'Delete Target',
                message: `Are you sure you want to delete target "${targetId}"?`,
                confirmText: 'Delete',
                id: `delete-target-${targetId}`
            }
        }, '*');
    }
}

// Perform the actual delete after confirmation
async function performDeleteTarget(targetId) {
    try {
        const query = { text: `select * from L8PTarget where targetId=${targetId}` };
        const response = await fetch(getTargetsEndpoint(), {
            method: 'DELETE',
            headers: getAuthHeaders(),
            body: JSON.stringify(query)
        });

        if (!response.ok) {
            const errorMsg = await getApiErrorMessage(response, 'Failed to delete target');
            showToast(errorMsg, 'error');
            return;
        }

        delete targets[targetId];
        renderTargets();
        showToast('Target deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting target:', error);
        showToast('Error deleting target', 'error');
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

    const icons = { error: '!', success: '\u2713', warning: '\u26A0' };
    const titles = { error: 'Error', success: 'Success', warning: 'Warning' };

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

async function refreshData() {
    // Ensure config is loaded
    if (!TARGETS_CONFIG) {
        await loadConfig();
    }
    await Promise.all([fetchTargets(), fetchCredentials()]);
}

if (typeof window !== 'undefined') {
    window.TargetsApp = {
        setBearerToken: setBearerToken,
        refreshData: refreshData,
        getTargets: function() { return targets; }
    };
}
