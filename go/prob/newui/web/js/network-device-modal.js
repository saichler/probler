// Network Device Detail Modal - Direct Layer8DPopup integration

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

    // Initialize physical inventory tree after popup renders
    initializeDeviceTree(device);
}

// Initialize device physical inventory tree
function initializeDeviceTree(deviceData) {
    setTimeout(function() {
        const treeContainer = document.getElementById('physical-inventory-tree');
        if (!treeContainer) return;

        if (deviceData.physicals && Object.keys(deviceData.physicals).length > 0 && typeof ProblerTree !== 'undefined') {
            new ProblerTree('physical-inventory-tree', {
                data: deviceData.physicals,
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
    return '<div class="probler-popup-tabs">' +
        '<div class="probler-popup-tab active" data-tab="overview">Overview</div>' +
        '<div class="probler-popup-tab" data-tab="equipment">Equipment</div>' +
        '<div class="probler-popup-tab" data-tab="physical">Physical Inventory</div>' +
    '</div>' +
    '<div class="probler-popup-tab-content">' +
        buildOverviewTab(device, statusClass, esc) +
        buildEquipmentTab(device, esc) +
        buildPhysicalTab() +
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
                    '<span class="detail-label">Firmware Version</span>' +
                    '<span class="detail-value">' + esc(device.firmware || '') + '</span>' +
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
    '</div>';
}

// Build Physical Inventory tab content
function buildPhysicalTab() {
    return '<div class="probler-popup-tab-pane" data-pane="physical">' +
        '<div id="physical-inventory-tree"></div>' +
    '</div>';
}

