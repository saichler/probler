// Layer 8 Ecosystem - Targets Host Management Functions

// State management for hosts and configs
let tempConfigs = [];
let editingHostIndex = -1;
let editingConfigIndex = -1;

// ============================================
// Hosts Table Functions
// ============================================

function hostsMapToArray(hostsMap) {
    if (!hostsMap) return [];
    return Object.entries(hostsMap).map(([hostId, hostObj]) => ({
        hostId: hostObj.hostId || hostId,
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
                hostId: host.hostId.trim(),
                configs: host.configs || {},
                polls: host.polls || {},
                groups: host.groups || {}
            };
        }
    });
    return map;
}

// ============================================
// Host Modal Functions
// ============================================

function generateHostFormHtml(host) {
    const isEdit = !!host;
    const hostId = isEdit ? escapeAttr(host.hostId) : '';

    return `
        <div class="form-group">
            <label for="host-id">Host ID</label>
            <input type="text" id="host-id" name="host-id" value="${hostId}" placeholder="e.g., router1, switch-core" ${isEdit ? 'disabled' : ''} required>
        </div>
        <div class="form-group">
            <label>Protocol Configurations</label>
            <div class="nested-table-container">
                <div class="nested-table-header">
                    <span>Protocols</span>
                    <button type="button" class="btn btn-small" onclick="document.getElementById('targets-iframe').contentWindow.showConfigModal()">
                        + Add Protocol
                    </button>
                </div>
                <table class="nested-items-table">
                    <thead>
                        <tr>
                            <th>Protocol</th>
                            <th>Address</th>
                            <th>Port</th>
                            <th>Credential ID</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="configs-tbody">${generateConfigsTableRows()}</tbody>
                </table>
            </div>
        </div>
    `;
}

function generateConfigsTableRows() {
    if (tempConfigs.length === 0) {
        return `
            <tr>
                <td colspan="5" class="empty-nested-table">
                    No protocols configured. Click "+ Add Protocol" to add one.
                </td>
            </tr>
        `;
    }

    return tempConfigs.map((cfg, index) => {
        return `
            <tr>
                <td>${PROTOCOLS[cfg.protocol] || 'Unknown'}</td>
                <td>${escapeHtml(cfg.addr)}</td>
                <td>${cfg.port}</td>
                <td>${escapeHtml(cfg.credId || '-')}</td>
                <td class="action-btns">
                    <button type="button" class="btn btn-small" onclick="document.getElementById('targets-iframe').contentWindow.editConfig(${index})">Edit</button>
                    <button type="button" class="btn btn-danger btn-small" onclick="document.getElementById('targets-iframe').contentWindow.removeConfigAndRefresh(${index})">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

function showHostModal(index) {
    const isEdit = index !== undefined && index >= 0 && tempHosts[index];

    if (isEdit) {
        editingHostIndex = index;
        tempConfigs = configsMapToArray(tempHosts[index].configs);
    } else {
        editingHostIndex = -1;
        tempConfigs = [];
    }

    const formHtml = generateHostFormHtml(isEdit ? tempHosts[index] : null);

    if (window.parent !== window) {
        window.parent.postMessage({
            type: 'probler-popup-show',
            config: {
                id: 'host-modal',
                title: isEdit ? 'Edit Host' : 'Add Host',
                size: 'large',
                content: formHtml,
                iframeId: 'targets-iframe',
                saveButtonText: 'Save Host'
            }
        }, '*');
    }
}

function closeHostModal() {
    tempConfigs = [];
    editingHostIndex = -1;
    if (window.parent !== window) {
        window.parent.postMessage({ type: 'probler-popup-close' }, '*');
    }
}

function refreshHostPopupContent() {
    const host = editingHostIndex >= 0 ? tempHosts[editingHostIndex] : null;
    const formHtml = generateHostFormHtml(host);
    if (window.parent !== window) {
        window.parent.postMessage({
            type: 'probler-popup-update',
            content: formHtml
        }, '*');
    }
}

function removeConfigAndRefresh(index) {
    tempConfigs.splice(index, 1);
    refreshHostPopupContent();
}

function handleHostSave(formData) {
    const hostId = formData['host-id'] ? formData['host-id'].trim() : '';

    if (!hostId) {
        showToast('Host ID is required', 'warning');
        return;
    }

    if (editingHostIndex < 0) {
        const existingIndex = tempHosts.findIndex(h => h.hostId === hostId);
        if (existingIndex >= 0) {
            showToast('A host with this ID already exists', 'warning');
            return;
        }
    }

    const hostObj = {
        hostId: hostId,
        configs: configsArrayToMap(tempConfigs),
        polls: {},
        groups: {}
    };

    if (editingHostIndex >= 0) {
        tempHosts[editingHostIndex] = hostObj;
    } else {
        tempHosts.push(hostObj);
    }

    closeHostModal();
    refreshTargetPopupContent();
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

// ============================================
// Protocol Config Modal
// ============================================

function generateCredentialsOptions(selectedValue) {
    let options = '<option value="">-- Select Credential --</option>';
    const credList = Object.values(credentials);
    credList.forEach(cred => {
        const selected = cred.id === selectedValue ? 'selected' : '';
        const label = cred.id + (cred.name ? ' (' + cred.name + ')' : '');
        options += `<option value="${escapeAttr(cred.id)}" ${selected}>${escapeHtml(label)}</option>`;
    });
    return options;
}

function generateConfigFormHtml(cfg) {
    const isEdit = !!cfg;
    const protocol = isEdit ? cfg.protocol : 1;
    const addr = isEdit ? escapeAttr(cfg.addr) : '';
    const port = isEdit ? cfg.port : 22;
    const credId = isEdit ? cfg.credId : '';

    return `
        <div class="form-group">
            <label for="config-protocol">Protocol</label>
            <select id="config-protocol" name="config-protocol">
                <option value="1" ${protocol === 1 ? 'selected' : ''}>SSH</option>
                <option value="2" ${protocol === 2 ? 'selected' : ''}>SNMPV2</option>
                <option value="3" ${protocol === 3 ? 'selected' : ''}>SNMPV3</option>
                <option value="4" ${protocol === 4 ? 'selected' : ''}>RESTCONF</option>
                <option value="5" ${protocol === 5 ? 'selected' : ''}>NETCONF</option>
                <option value="6" ${protocol === 6 ? 'selected' : ''}>GRPC</option>
                <option value="7" ${protocol === 7 ? 'selected' : ''}>Kubectl</option>
                <option value="8" ${protocol === 8 ? 'selected' : ''}>GraphQL</option>
            </select>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label for="config-addr">Address</label>
                <input type="text" id="config-addr" name="config-addr" value="${addr}" placeholder="e.g., 192.168.1.1" required>
            </div>
            <div class="form-group">
                <label for="config-port">Port</label>
                <input type="number" id="config-port" name="config-port" value="${port}" min="1" max="65535">
            </div>
        </div>
        <div class="form-group">
            <label for="config-cred-id">Credential ID</label>
            <select id="config-cred-id" name="config-cred-id">
                ${generateCredentialsOptions(credId)}
            </select>
        </div>
    `;
}

function showConfigModal(index) {
    const isEdit = index !== undefined && index >= 0 && tempConfigs[index];

    if (isEdit) {
        editingConfigIndex = index;
    } else {
        editingConfigIndex = -1;
    }

    const formHtml = generateConfigFormHtml(isEdit ? tempConfigs[index] : null);

    if (window.parent !== window) {
        window.parent.postMessage({
            type: 'probler-popup-show',
            config: {
                id: 'config-modal',
                title: isEdit ? 'Edit Protocol' : 'Add Protocol',
                size: 'medium',
                content: formHtml,
                iframeId: 'targets-iframe',
                saveButtonText: 'Save Protocol'
            }
        }, '*');
    }
}

function closeConfigModal() {
    editingConfigIndex = -1;
    if (window.parent !== window) {
        window.parent.postMessage({ type: 'probler-popup-close' }, '*');
    }
}

function handleConfigSave(formData) {
    const protocol = parseInt(formData['config-protocol'], 10);
    const addr = formData['config-addr'] ? formData['config-addr'].trim() : '';
    const port = parseInt(formData['config-port'], 10);
    const credId = formData['config-cred-id'] ? formData['config-cred-id'].trim() : '';

    if (!addr) {
        showToast('Address is required', 'warning');
        return;
    }

    const configObj = {
        portKey: editingConfigIndex >= 0 ? tempConfigs[editingConfigIndex].portKey : Date.now(),
        protocol: protocol,
        addr: addr,
        port: port,
        credId: credId,
        terminal: editingConfigIndex >= 0 ? tempConfigs[editingConfigIndex].terminal : '',
        timeout: editingConfigIndex >= 0 ? tempConfigs[editingConfigIndex].timeout : ''
    };

    if (editingConfigIndex >= 0) {
        tempConfigs[editingConfigIndex] = configObj;
    } else {
        tempConfigs.push(configObj);
    }

    closeConfigModal();
    refreshHostPopupContent();
}

function editConfig(index) { showConfigModal(index); }
