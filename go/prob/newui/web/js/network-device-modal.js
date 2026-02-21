// Network Device Detail Modal - Direct Layer8DPopup integration
// Performance tab & charts: network-device-modal-perf.js

// Decode SNMP DateAndTime hex string (e.g., "07E5010F000000" → "2021-01-15")
function formatMfgDate(hex) {
    if (!hex || hex.length < 8) return hex || '';
    var year = parseInt(hex.substring(0, 4), 16);
    var month = parseInt(hex.substring(4, 6), 16);
    var day = parseInt(hex.substring(6, 8), 16);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return hex;
    return year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
}

// Show device detail modal
function showDeviceDetailModal(device) {
    const statusClass = 'status-' + device.status;

    const esc = Layer8DUtils.escapeHtml;

    // Build custom title HTML with status badge
    const titleHtml = '<div class="probler-popup-title-wrapper">' +
        '<h3 class="probler-popup-title">Device Details - ' + esc(device.name) + '</h3>' +
        '<span class="probler-popup-status-badge ' + statusClass + '">' +
        (device.status ? device.status.toUpperCase() : '') + '</span>' +
        '</div>';

    // Build the popup content with tabs
    const content = buildDeviceContent(device, statusClass, esc);

    // Show popup directly
    Layer8DPopup.show({
        titleHtml: titleHtml,
        content: content,
        size: 'xlarge',
        showFooter: false,
        id: 'device-detail-' + device.id
    });

    // Initialize physical inventory tree and performance charts after popup renders
    initializeDeviceTree(device);
    initializePerformanceCharts(device);
}

// Recursively strip a key from all nested objects/arrays
function stripKeyRecursive(obj, keyToStrip) {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) {
        obj.forEach(function(item) { stripKeyRecursive(item, keyToStrip); });
        return;
    }
    delete obj[keyToStrip];
    Object.keys(obj).forEach(function(k) { stripKeyRecursive(obj[k], keyToStrip); });
}

// Initialize device physical inventory tree
function initializeDeviceTree(deviceData) {
    setTimeout(function() {
        const treeContainer = document.getElementById('physical-inventory-tree');
        if (!treeContainer) return;

        if (deviceData.physicals && Object.keys(deviceData.physicals).length > 0 && typeof ProblerTree !== 'undefined') {
            // Clone physicals and strip performance + temperature data (shown in Performance tab)
            var treeData = JSON.parse(JSON.stringify(deviceData.physicals));
            Object.keys(treeData).forEach(function(key) {
                if (treeData[key] && treeData[key].performance) {
                    delete treeData[key].performance;
                }
                stripKeyRecursive(treeData[key], 'temperature');
            });
            new ProblerTree('physical-inventory-tree', {
                data: treeData,
                expandAll: true,
                maxHeight: '600px'
            });
        } else {
            treeContainer.innerHTML = '<div class="detail-section detail-full-width">' +
                '<p style="color: #718096; text-align: center; padding: 20px;">' +
                'No physical inventory data available</p></div>';
        }
    }, 100);
}

// Build the device detail content HTML
function buildDeviceContent(device, statusClass, esc) {
    var hasInterfaces = device.logicals && Object.keys(device.logicals).length > 0;
    return '<div class="probler-popup-tabs">' +
        '<div class="probler-popup-tab active" data-tab="overview">Overview</div>' +
        '<div class="probler-popup-tab" data-tab="equipment">Equipment</div>' +
        (hasInterfaces ? '<div class="probler-popup-tab" data-tab="interfaces">Interfaces</div>' : '') +
        '<div class="probler-popup-tab" data-tab="physical">Physical Inventory</div>' +
        '<div class="probler-popup-tab" data-tab="performance">Performance</div>' +
    '</div>' +
    '<div class="probler-popup-tab-content">' +
        buildOverviewTab(device, statusClass, esc) +
        buildEquipmentTab(device, esc) +
        (hasInterfaces ? buildInterfacesTab(device, esc) : '') +
        buildPhysicalTab() +
        buildPerformanceTab(device) +
    '</div>';
}

// Build Overview tab content
function buildOverviewTab(device, statusClass, esc) {
    return '<div class="probler-popup-tab-pane active" data-pane="overview">' +
        '<div class="detail-grid">' +
            '<div class="detail-section">' +
                '<div class="detail-section-title">Device Information</div>' +
                '<div class="detail-row">' +
                    '<span class="detail-label">Device Name</span>' +
                    '<span class="detail-value">' + esc(device.name || '') + '</span>' +
                '</div>' +
                '<div class="detail-row">' +
                    '<span class="detail-label">System Name</span>' +
                    '<span class="detail-value">' + esc(device.sysName || '') + '</span>' +
                '</div>' +
                '<div class="detail-row">' +
                    '<span class="detail-label">IP Address</span>' +
                    '<span class="detail-value">' + esc(device.ipAddress || '') + '</span>' +
                '</div>' +
                '<div class="detail-row">' +
                    '<span class="detail-label">Device Type</span>' +
                    '<span class="detail-value">' + esc(device.deviceType || '') + '</span>' +
                '</div>' +
                '<div class="detail-row">' +
                    '<span class="detail-label">Status</span>' +
                    '<span class="detail-value ' + statusClass + '">' +
                    (device.status ? device.status.toUpperCase() : '') + '</span>' +
                '</div>' +
                '<div class="detail-row">' +
                    '<span class="detail-label">Last Seen</span>' +
                    '<span class="detail-value">' + esc(device.lastSeen || '') + '</span>' +
                '</div>' +
            '</div>' +
            '<div class="detail-section">' +
                '<div class="detail-section-title">Location & Network</div>' +
                '<div class="detail-row">' +
                    '<span class="detail-label">Location</span>' +
                    '<span class="detail-value">' + esc(device.location || '') + '</span>' +
                '</div>' +
                '<div class="detail-row">' +
                    '<span class="detail-label">Coordinates</span>' +
                    '<span class="detail-value">' +
                    (device.latitude && device.longitude ?
                        device.latitude.toFixed(4) + ', ' + device.longitude.toFixed(4) : '') +
                    '</span>' +
                '</div>' +
                '<div class="detail-row">' +
                    '<span class="detail-label">Uptime</span>' +
                    '<span class="detail-value">' + esc(device.uptime || '') + '</span>' +
                '</div>' +
                '<div class="detail-row">' +
                    '<span class="detail-label">Interfaces</span>' +
                    '<span class="detail-value">' + esc(device.interfaces || '') + '</span>' +
                '</div>' +
            '</div>' +
        '</div>' +
    '</div>';
}

// Build Equipment tab content
function buildEquipmentTab(device, esc) {
    return '<div class="probler-popup-tab-pane" data-pane="equipment">' +
        '<div class="detail-grid">' +
            '<div class="detail-section">' +
                '<div class="detail-section-title">Hardware Information</div>' +
                '<div class="detail-row">' +
                    '<span class="detail-label">Vendor</span>' +
                    '<span class="detail-value">' + esc(device.vendor || '') + '</span>' +
                '</div>' +
                '<div class="detail-row">' +
                    '<span class="detail-label">Model</span>' +
                    '<span class="detail-value">' + esc(device.model || '') + '</span>' +
                '</div>' +
                '<div class="detail-row">' +
                    '<span class="detail-label">Series</span>' +
                    '<span class="detail-value">' + esc(device.series || '') + '</span>' +
                '</div>' +
                '<div class="detail-row">' +
                    '<span class="detail-label">Family</span>' +
                    '<span class="detail-value">' + esc(device.family || '') + '</span>' +
                '</div>' +
                '<div class="detail-row">' +
                    '<span class="detail-label">Serial Number</span>' +
                    '<span class="detail-value">' + esc(device.serialNumber || '') + '</span>' +
                '</div>' +
                '<div class="detail-row">' +
                    '<span class="detail-label">Interfaces</span>' +
                    '<span class="detail-value">' + esc(device.interfaces || '') + '</span>' +
                '</div>' +
            '</div>' +
            '<div class="detail-section">' +
                '<div class="detail-section-title">Software & Configuration</div>' +
                '<div class="detail-row">' +
                    '<span class="detail-label">Software</span>' +
                    '<span class="detail-value">' + esc(device.software || '') + '</span>' +
                '</div>' +
                '<div class="detail-row">' +
                    '<span class="detail-label">Hardware</span>' +
                    '<span class="detail-value">' + esc(device.hardware || '') + '</span>' +
                '</div>' +
                '<div class="detail-row">' +
                    '<span class="detail-label">Version</span>' +
                    '<span class="detail-value">' + esc(device.version || '') + '</span>' +
                '</div>' +
                '<div class="detail-row">' +
                    '<span class="detail-label">Firmware Version</span>' +
                    '<span class="detail-value">' + esc(device.firmware || '') + '</span>' +
                '</div>' +
                '<div class="detail-row">' +
                    '<span class="detail-label">System OID</span>' +
                    '<span class="detail-value">' + esc(device.sysOid || '') + '</span>' +
                '</div>' +
                '<div class="detail-row">' +
                    '<span class="detail-label">Device Type</span>' +
                    '<span class="detail-value">' + esc(device.deviceType || '') + '</span>' +
                '</div>' +
                '<div class="detail-row">' +
                    '<span class="detail-label">Management IP</span>' +
                    '<span class="detail-value">' + esc(device.ipAddress || '') + '</span>' +
                '</div>' +
            '</div>' +
        '</div>' +
        buildEntityMibSection(device, esc) +
    '</div>';
}

// Build Entity MIB / Asset Information section (RFC 4133)
function buildEntityMibSection(device, esc) {
    // Only show if any Entity MIB field is populated
    if (!device.manufacturerName && !device.manufacturingDate && !device.assetId &&
        !device.physicalAlias && !device.vendorTypeOid && !device.identificationUris &&
        !device.isFru) {
        return '';
    }
    return '<div class="detail-grid" style="margin-top: 12px;">' +
        '<div class="detail-section">' +
            '<div class="detail-section-title">Asset Information</div>' +
            '<div class="detail-row">' +
                '<span class="detail-label">Manufacturer</span>' +
                '<span class="detail-value">' + esc(device.manufacturerName || '') + '</span>' +
            '</div>' +
            '<div class="detail-row">' +
                '<span class="detail-label">Manufacturing Date</span>' +
                '<span class="detail-value">' + esc(formatMfgDate(device.manufacturingDate)) + '</span>' +
            '</div>' +
            '<div class="detail-row">' +
                '<span class="detail-label">Asset ID</span>' +
                '<span class="detail-value">' + esc(device.assetId || '') + '</span>' +
            '</div>' +
            '<div class="detail-row">' +
                '<span class="detail-label">Physical Alias</span>' +
                '<span class="detail-value">' + esc(device.physicalAlias || '') + '</span>' +
            '</div>' +
        '</div>' +
        '<div class="detail-section">' +
            '<div class="detail-section-title">Entity MIB Details</div>' +
            '<div class="detail-row">' +
                '<span class="detail-label">Vendor Type OID</span>' +
                '<span class="detail-value">' + esc(device.vendorTypeOid || '') + '</span>' +
            '</div>' +
            '<div class="detail-row">' +
                '<span class="detail-label">Field Replaceable</span>' +
                '<span class="detail-value">' + (device.isFru ? 'Yes' : 'No') + '</span>' +
            '</div>' +
            '<div class="detail-row">' +
                '<span class="detail-label">Identification URIs</span>' +
                '<span class="detail-value">' + esc(device.identificationUris || '') + '</span>' +
            '</div>' +
        '</div>' +
    '</div>';
}

// Build Physical Inventory tab content
function buildPhysicalTab() {
    return '<div class="probler-popup-tab-pane" data-pane="physical">' +
        '<div id="physical-inventory-tree"></div>' +
    '</div>';
}

// Format interface speed (bps) to human-readable
function formatIfSpeed(bps) {
    if (!bps || bps === 0) return '';
    if (bps >= 1000000000) return (bps / 1000000000) + ' Gbps';
    if (bps >= 1000000) return (bps / 1000000) + ' Mbps';
    if (bps >= 1000) return (bps / 1000) + ' Kbps';
    return bps + ' bps';
}

// Map InterfaceType enum to display string
var INTERFACE_TYPE_NAMES = {
    0: '', 1: 'Ethernet', 2: 'Fast Ethernet', 3: 'GigE',
    4: '10GigE', 5: '25GigE', 6: '40GigE', 7: '100GigE',
    8: 'Serial', 9: 'ATM', 10: 'Frame Relay', 11: 'Loopback',
    12: 'Management', 13: 'Tunnel', 14: 'VLAN', 15: 'Bridge'
};

// Collect all interfaces from logicals map into a flat array
function collectInterfaces(logicals) {
    var all = [];
    Object.keys(logicals).forEach(function(key) {
        var logical = logicals[key];
        if (logical && logical.interfaces) {
            logical.interfaces.forEach(function(iface) {
                all.push(iface);
            });
        }
    });
    return all;
}

// Build Interfaces tab content
function buildInterfacesTab(device, esc) {
    var interfaces = collectInterfaces(device.logicals);
    if (interfaces.length === 0) {
        return '<div class="probler-popup-tab-pane" data-pane="interfaces">' +
            '<p style="color: var(--layer8d-text-muted); text-align: center; padding: 40px;">' +
            'No interface data available</p></div>';
    }
    var html = '<div class="probler-popup-tab-pane" data-pane="interfaces">' +
        '<div style="overflow-x: auto;">' +
        '<table class="layer8d-tree-grid-table" style="width: 100%; font-size: 12px;">' +
        '<thead><tr>' +
            '<th>Name</th>' +
            '<th>Status</th>' +
            '<th>Admin</th>' +
            '<th>Type</th>' +
            '<th>IP Address</th>' +
            '<th>MAC Address</th>' +
            '<th>Speed</th>' +
            '<th>MTU</th>' +
            '<th>Description</th>' +
        '</tr></thead><tbody>';
    interfaces.forEach(function(iface) {
        var operStatus = esc(iface.status || '');
        var operClass = operStatus.toLowerCase() === 'up' ? 'status-online' :
                        operStatus.toLowerCase() === 'down' ? 'status-offline' : '';
        var adminLabel = iface.adminStatus ? 'Up' : 'Down';
        var adminClass = iface.adminStatus ? 'status-online' : 'status-offline';
        html += '<tr>' +
            '<td style="font-weight: 500;">' + esc(iface.name || iface.id || '') + '</td>' +
            '<td><span class="' + operClass + '">' + operStatus + '</span></td>' +
            '<td><span class="' + adminClass + '">' + adminLabel + '</span></td>' +
            '<td>' + esc(INTERFACE_TYPE_NAMES[iface.interfaceType] || '') + '</td>' +
            '<td>' + esc(iface.ipAddress || '') + '</td>' +
            '<td style="font-family: monospace; font-size: 11px;">' + esc(iface.macAddress || '') + '</td>' +
            '<td>' + formatIfSpeed(iface.speed) + '</td>' +
            '<td>' + (iface.mtu || '') + '</td>' +
            '<td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' +
                esc(iface.description || '') + '</td>' +
        '</tr>';
    });
    html += '</tbody></table></div></div>';
    return html;
}


