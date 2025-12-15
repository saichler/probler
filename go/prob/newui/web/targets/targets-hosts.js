// Layer 8 Ecosystem - Targets Host Management Functions

// State management for hosts and configs
let tempConfigs = [];
let editingHostIndex = -1;

// ============================================
// Hosts Table Functions
// ============================================

function hostsMapToArray(hostsMap) {
    if (!hostsMap) return [];
    return Object.entries(hostsMap).map(([hostId, hostObj]) => ({
        hostId: hostId,
        targetId: hostObj.targetId || '',
        configs: hostObj.configs || {},
        polls: hostObj.polls || {},
        groups: hostObj.groups || {}
    }));
}

function hostsArrayToMap(hostsArray) {
    const map = {};
    hostsArray.forEach(host => {
        if (host.hostId && host.hostId.trim()) {
            map[host.hostId.trim()] = {
                targetId: host.targetId || '',
                configs: host.configs || {},
                polls: host.polls || {},
                groups: host.groups || {}
            };
        }
    });
    return map;
}

function renderHostsTable() {
    const tbody = document.getElementById('hosts-tbody');
    tbody.innerHTML = '';

    if (tempHosts.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-nested-table">
                    No hosts configured. Click "+ Add Host" to add one.
                </td>
            </tr>
        `;
        return;
    }

    tempHosts.forEach((host, index) => {
        const configsCount = host.configs ? Object.keys(host.configs).length : 0;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${escapeHtml(host.hostId)}</td>
            <td><span class="tag">${configsCount} protocol${configsCount !== 1 ? 's' : ''}</span></td>
            <td class="action-btns">
                <button type="button" class="btn btn-small" onclick="editHost(${index})">Edit</button>
                <button type="button" class="btn btn-danger btn-small" onclick="removeHost(${index})">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function removeHost(index) {
    tempHosts.splice(index, 1);
    renderHostsTable();
}

// ============================================
// Host Modal Functions
// ============================================

function showHostModal(index) {
    const modal = document.getElementById('host-modal');
    const title = document.getElementById('host-modal-title');
    const editIndex = document.getElementById('host-edit-index');
    const hostIdInput = document.getElementById('host-id');

    if (index !== undefined && index >= 0 && tempHosts[index]) {
        title.textContent = 'Edit Host';
        editIndex.value = index;
        editingHostIndex = index;
        hostIdInput.value = tempHosts[index].hostId;
        hostIdInput.disabled = true;
        tempConfigs = configsMapToArray(tempHosts[index].configs);
    } else {
        title.textContent = 'Add Host';
        editIndex.value = -1;
        editingHostIndex = -1;
        hostIdInput.value = '';
        hostIdInput.disabled = false;
        tempConfigs = [];
    }

    renderConfigsTable();
    modal.classList.add('active');
}

function closeHostModal() {
    document.getElementById('host-modal').classList.remove('active');
    document.getElementById('host-form').reset();
    tempConfigs = [];
    editingHostIndex = -1;
}

function saveHost(event) {
    event.preventDefault();

    const editIndex = parseInt(document.getElementById('host-edit-index').value, 10);
    const hostId = document.getElementById('host-id').value.trim();

    if (!hostId) {
        showToast('Host ID is required', 'warning');
        return;
    }

    if (editIndex < 0) {
        const existingIndex = tempHosts.findIndex(h => h.hostId === hostId);
        if (existingIndex >= 0) {
            showToast('A host with this ID already exists', 'warning');
            return;
        }
    }

    const hostObj = {
        hostId: hostId,
        targetId: document.getElementById('target-id').value.trim(),
        configs: configsArrayToMap(tempConfigs),
        polls: {},
        groups: {}
    };

    if (editIndex >= 0) {
        tempHosts[editIndex] = hostObj;
    } else {
        tempHosts.push(hostObj);
    }

    closeHostModal();
    renderHostsTable();
}

function editHost(index) { showHostModal(index); }

// ============================================
// Protocol Configs Functions
// ============================================

function configsMapToArray(configsMap) {
    if (!configsMap) return [];
    return Object.entries(configsMap).map(([portKey, cfg]) => ({
        portKey: parseInt(portKey, 10),
        protocol: cfg.protocol || 0,
        addr: cfg.addr || '',
        port: cfg.port || 0,
        credId: cfg.credId || '',
        terminal: cfg.terminal || '',
        timeout: cfg.timeout || ''
    }));
}

function configsArrayToMap(configsArray) {
    const map = {};
    configsArray.forEach(cfg => {
        map[cfg.portKey] = {
            protocol: cfg.protocol,
            addr: cfg.addr,
            port: cfg.port,
            credId: cfg.credId,
            terminal: cfg.terminal,
            timeout: cfg.timeout
        };
    });
    return map;
}

function renderConfigsTable() {
    const tbody = document.getElementById('configs-tbody');
    tbody.innerHTML = '';

    if (tempConfigs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-nested-table">
                    No protocols configured. Click "+ Add Protocol" to add one.
                </td>
            </tr>
        `;
        return;
    }

    tempConfigs.forEach((cfg, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${PROTOCOLS[cfg.protocol] || 'Unknown'}</td>
            <td>${escapeHtml(cfg.addr)}</td>
            <td>${cfg.port}</td>
            <td>${escapeHtml(cfg.credId || '-')}</td>
            <td class="action-btns">
                <button type="button" class="btn btn-small" onclick="editConfig(${index})">Edit</button>
                <button type="button" class="btn btn-danger btn-small" onclick="removeConfig(${index})">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function removeConfig(index) {
    tempConfigs.splice(index, 1);
    renderConfigsTable();
}

// ============================================
// Protocol Config Modal
// ============================================

function populateCredentialsDropdown(selectedValue) {
    const select = document.getElementById('config-cred-id');
    select.innerHTML = '<option value="">-- Select Credential --</option>';

    const credList = Object.values(credentials);
    credList.forEach(cred => {
        const option = document.createElement('option');
        option.value = cred.id;
        option.textContent = cred.id + (cred.name ? ' (' + cred.name + ')' : '');
        if (cred.id === selectedValue) {
            option.selected = true;
        }
        select.appendChild(option);
    });
}

function showConfigModal(index) {
    const modal = document.getElementById('config-modal');
    const title = document.getElementById('config-modal-title');
    const editIndex = document.getElementById('config-edit-index');

    if (index !== undefined && index >= 0 && tempConfigs[index]) {
        title.textContent = 'Edit Protocol';
        editIndex.value = index;
        document.getElementById('config-protocol').value = tempConfigs[index].protocol;
        document.getElementById('config-addr').value = tempConfigs[index].addr;
        document.getElementById('config-port').value = tempConfigs[index].port;
        populateCredentialsDropdown(tempConfigs[index].credId);
    } else {
        title.textContent = 'Add Protocol';
        editIndex.value = -1;
        document.getElementById('config-protocol').value = 1;
        document.getElementById('config-addr').value = '';
        document.getElementById('config-port').value = 22;
        populateCredentialsDropdown('');
    }

    modal.classList.add('active');
}

function closeConfigModal() {
    document.getElementById('config-modal').classList.remove('active');
    document.getElementById('config-form').reset();
}

function saveConfig(event) {
    event.preventDefault();

    const editIndex = parseInt(document.getElementById('config-edit-index').value, 10);
    const protocol = parseInt(document.getElementById('config-protocol').value, 10);
    const addr = document.getElementById('config-addr').value.trim();
    const port = parseInt(document.getElementById('config-port').value, 10);
    const credId = document.getElementById('config-cred-id').value.trim();

    if (!addr) {
        showToast('Address is required', 'warning');
        return;
    }

    const configObj = {
        portKey: editIndex >= 0 ? tempConfigs[editIndex].portKey : Date.now(),
        protocol: protocol,
        addr: addr,
        port: port,
        credId: credId,
        terminal: editIndex >= 0 ? tempConfigs[editIndex].terminal : '',
        timeout: editIndex >= 0 ? tempConfigs[editIndex].timeout : ''
    };

    if (editIndex >= 0) {
        tempConfigs[editIndex] = configObj;
    } else {
        tempConfigs.push(configObj);
    }

    closeConfigModal();
    renderConfigsTable();
}

function editConfig(index) { showConfigModal(index); }
