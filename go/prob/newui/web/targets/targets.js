// Layer 8 Ecosystem - Targets Management Application

// Data stores
let targets = {};
let credentials = {};

// State management
let pendingDelete = null;
let tempHosts = [];
let selectedInventoryType = 0;

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
    0: 'Network Device',
    1: 'GPUS',
    2: 'Hosts',
    3: 'Virtual Machine',
    4: 'K8s Cluster',
    5: 'Storage',
    6: 'Power'
};

// Authentication token
let bearerToken = localStorage.getItem('bearerToken') || null;

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
                render: (target) => L8Table.statusTag(target.state === 1)
            }
        ],
        onAdd: () => showTargetModal(),
        addButtonText: 'Add Target',
        onEdit: editTarget,
        onDelete: deleteTarget
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

function showTargetModal(targetId) {
    const modal = document.getElementById('target-modal');
    const title = document.getElementById('target-modal-title');
    const editMode = document.getElementById('target-edit-mode');
    const idInput = document.getElementById('target-id');
    const linksIdInput = document.getElementById('target-links-id');
    const stateSelect = document.getElementById('target-state');

    if (targetId && targets[targetId]) {
        title.textContent = 'Edit Target';
        editMode.value = targetId;
        idInput.value = targets[targetId].targetId;
        idInput.disabled = true;
        linksIdInput.value = targets[targetId].linksId || '';
        stateSelect.value = targets[targetId].state || 0;
        tempHosts = hostsMapToArray(targets[targetId].hosts);
    } else {
        title.textContent = 'Add Target';
        editMode.value = 'add';
        idInput.value = '';
        idInput.disabled = false;
        linksIdInput.value = '';
        stateSelect.value = 0;
        tempHosts = [];
    }

    renderHostsTable();
    modal.classList.add('active');
}

function closeTargetModal() {
    document.getElementById('target-modal').classList.remove('active');
    document.getElementById('target-form').reset();
    tempHosts = [];
}

async function saveTarget(event) {
    event.preventDefault();

    const editMode = document.getElementById('target-edit-mode').value;
    const targetId = document.getElementById('target-id').value.trim();
    const linksId = document.getElementById('target-links-id').value.trim();
    const state = parseInt(document.getElementById('target-state').value, 10);

    if (!targetId) {
        showToast('Target ID is required', 'warning');
        return;
    }

    if (editMode === 'add' && targets[targetId]) {
        showToast('Target ID already exists', 'warning');
        return;
    }

    const targetObj = {
        targetId: targetId,
        linksId: linksId,
        hosts: hostsArrayToMap(tempHosts),
        state: state
    };

    try {
        const method = editMode === 'add' ? 'POST' : 'PATCH';
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

function deleteTarget(targetId) {
    pendingDelete = targetId;
    document.getElementById('delete-message').textContent =
        'Are you sure you want to delete target "' + targetId + '"?';
    document.getElementById('delete-modal').classList.add('active');
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
        const response = await fetch(getTargetsEndpoint() + '/' + encodeURIComponent(pendingDelete), {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const errorMsg = await getApiErrorMessage(response, 'Failed to delete target');
            showToast(errorMsg, 'error');
            closeDeleteModal();
            return;
        }

        delete targets[pendingDelete];
        renderTargets();
        showToast('Target deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting target:', error);
        showToast('Error deleting target', 'error');
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
