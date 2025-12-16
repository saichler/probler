// Device Detail Modal Module - Uses ProblerPopup via postMessage

// Show device detail modal using ProblerPopup
function showDeviceDetailModal(device) {
    // Determine status class and performance levels
    const statusClass = 'status-' + device.status;
    const cpuClass = device.cpuUsage < 50 ? 'low' : device.cpuUsage < 80 ? 'medium' : 'high';
    const memClass = device.memoryUsage < 50 ? 'low' : device.memoryUsage < 80 ? 'medium' : 'high';
    const tempClass = device.temperature < 40 ? 'low' : device.temperature < 55 ? 'medium' : 'high';

    // Build custom title HTML with status badge
    const titleHtml = '<div class="probler-popup-title-wrapper">' +
        '<h3 class="probler-popup-title">Device Details - ' + escapeHtml(device.name) + '</h3>' +
        '<span class="probler-popup-status-badge ' + statusClass + '">' +
        (device.status ? device.status.toUpperCase() : '') + '</span>' +
        '</div>';

    // Build the popup content with tabs
    const content = buildDeviceContent(device, statusClass, cpuClass, memClass, tempClass);

    // Send message to parent to show popup
    window.parent.postMessage({
        type: 'probler-popup-show',
        config: {
            titleHtml: titleHtml,
            content: content,
            size: 'xlarge',
            showFooter: false,
            noPadding: true,
            iframeId: 'network-devices-iframe',
            id: 'device-detail-' + device.id
        },
        deviceData: device
    }, '*');
}

// Build the device detail content HTML
function buildDeviceContent(device, statusClass, cpuClass, memClass, tempClass) {
    return '<div class="probler-popup-tabs">' +
        '<div class="probler-popup-tab active" data-tab="overview">Overview</div>' +
        '<div class="probler-popup-tab" data-tab="equipment">Equipment</div>' +
        '<div class="probler-popup-tab" data-tab="physical">Physical Inventory</div>' +
        '<div class="probler-popup-tab" data-tab="performance">Performance</div>' +
    '</div>' +
    '<div class="probler-popup-tab-content">' +
        buildOverviewTab(device, statusClass) +
        buildEquipmentTab(device) +
        buildPhysicalTab() +
        buildPerformanceTab(device, cpuClass, memClass, tempClass) +
    '</div>';
}

// Build Overview tab content
function buildOverviewTab(device, statusClass) {
    return '<div class="probler-popup-tab-pane active" data-pane="overview">' +
        '<div class="detail-grid">' +
            '<div class="detail-section">' +
                '<div class="detail-section-title">Device Information</div>' +
                '<div class="detail-row">' +
                    '<span class="detail-label">Device Name</span>' +
                    '<span class="detail-value">' + escapeHtml(device.name || '') + '</span>' +
                '</div>' +
                '<div class="detail-row">' +
                    '<span class="detail-label">System Name</span>' +
                    '<span class="detail-value">' + escapeHtml(device.sysName || '') + '</span>' +
                '</div>' +
                '<div class="detail-row">' +
                    '<span class="detail-label">IP Address</span>' +
                    '<span class="detail-value">' + escapeHtml(device.ipAddress || '') + '</span>' +
                '</div>' +
                '<div class="detail-row">' +
                    '<span class="detail-label">Device Type</span>' +
                    '<span class="detail-value">' + escapeHtml(device.deviceType || '') + '</span>' +
                '</div>' +
                '<div class="detail-row">' +
                    '<span class="detail-label">Status</span>' +
                    '<span class="detail-value ' + statusClass + '">' +
                    (device.status ? device.status.toUpperCase() : '') + '</span>' +
                '</div>' +
                '<div class="detail-row">' +
                    '<span class="detail-label">Last Seen</span>' +
                    '<span class="detail-value">' + escapeHtml(device.lastSeen || '') + '</span>' +
                '</div>' +
            '</div>' +
            '<div class="detail-section">' +
                '<div class="detail-section-title">Location & Network</div>' +
                '<div class="detail-row">' +
                    '<span class="detail-label">Location</span>' +
                    '<span class="detail-value">' + escapeHtml(device.location || '') + '</span>' +
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
                    '<span class="detail-value">' + escapeHtml(device.uptime || '') + '</span>' +
                '</div>' +
                '<div class="detail-row">' +
                    '<span class="detail-label">Interfaces</span>' +
                    '<span class="detail-value">' + escapeHtml(device.interfaces || '') + '</span>' +
                '</div>' +
            '</div>' +
        '</div>' +
    '</div>';
}

// Build Equipment tab content
function buildEquipmentTab(device) {
    return '<div class="probler-popup-tab-pane" data-pane="equipment">' +
        '<div class="detail-grid">' +
            '<div class="detail-section">' +
                '<div class="detail-section-title">Hardware Information</div>' +
                '<div class="detail-row">' +
                    '<span class="detail-label">Vendor</span>' +
                    '<span class="detail-value">' + escapeHtml(device.vendor || '') + '</span>' +
                '</div>' +
                '<div class="detail-row">' +
                    '<span class="detail-label">Model</span>' +
                    '<span class="detail-value">' + escapeHtml(device.model || '') + '</span>' +
                '</div>' +
                '<div class="detail-row">' +
                    '<span class="detail-label">Series</span>' +
                    '<span class="detail-value">' + escapeHtml(device.series || '') + '</span>' +
                '</div>' +
                '<div class="detail-row">' +
                    '<span class="detail-label">Family</span>' +
                    '<span class="detail-value">' + escapeHtml(device.family || '') + '</span>' +
                '</div>' +
                '<div class="detail-row">' +
                    '<span class="detail-label">Serial Number</span>' +
                    '<span class="detail-value">' + escapeHtml(device.serialNumber || '') + '</span>' +
                '</div>' +
                '<div class="detail-row">' +
                    '<span class="detail-label">Interfaces</span>' +
                    '<span class="detail-value">' + escapeHtml(device.interfaces || '') + '</span>' +
                '</div>' +
            '</div>' +
            '<div class="detail-section">' +
                '<div class="detail-section-title">Software & Configuration</div>' +
                '<div class="detail-row">' +
                    '<span class="detail-label">Software</span>' +
                    '<span class="detail-value">' + escapeHtml(device.software || '') + '</span>' +
                '</div>' +
                '<div class="detail-row">' +
                    '<span class="detail-label">Firmware Version</span>' +
                    '<span class="detail-value">' + escapeHtml(device.firmware || '') + '</span>' +
                '</div>' +
                '<div class="detail-row">' +
                    '<span class="detail-label">Device Type</span>' +
                    '<span class="detail-value">' + escapeHtml(device.deviceType || '') + '</span>' +
                '</div>' +
                '<div class="detail-row">' +
                    '<span class="detail-label">Management IP</span>' +
                    '<span class="detail-value">' + escapeHtml(device.ipAddress || '') + '</span>' +
                '</div>' +
                '<div class="detail-row">' +
                    '<span class="detail-label">Temperature</span>' +
                    '<span class="detail-value">' +
                    (device.temperature ? device.temperature + '°C' : '') + '</span>' +
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

// Build Performance tab content
function buildPerformanceTab(device, cpuClass, memClass, tempClass) {
    return '<div class="probler-popup-tab-pane" data-pane="performance">' +
        '<div class="detail-section detail-full-width">' +
            '<div class="detail-section-title">Performance Metrics</div>' +
            '<div class="detail-row">' +
                '<span class="detail-label">CPU Usage</span>' +
                '<span class="detail-value">' + device.cpuUsage + '%</span>' +
            '</div>' +
            '<div class="performance-bar">' +
                '<div class="performance-bar-fill ' + cpuClass + '" style="width: ' + device.cpuUsage + '%"></div>' +
            '</div>' +
            '<div class="detail-row" style="margin-top: 15px;">' +
                '<span class="detail-label">Memory Usage</span>' +
                '<span class="detail-value">' + device.memoryUsage + '%</span>' +
            '</div>' +
            '<div class="performance-bar">' +
                '<div class="performance-bar-fill ' + memClass + '" style="width: ' + device.memoryUsage + '%"></div>' +
            '</div>' +
            '<div class="detail-row" style="margin-top: 15px;">' +
                '<span class="detail-label">Temperature</span>' +
                '<span class="detail-value">' + device.temperature + '°C</span>' +
            '</div>' +
            '<div class="performance-bar">' +
                '<div class="performance-bar-fill ' + tempClass + '" style="width: ' + Math.min(device.temperature, 100) + '%"></div>' +
            '</div>' +
        '</div>' +
    '</div>';
}

// Close device detail modal
function closeDeviceDetailModal() {
    window.parent.postMessage({
        type: 'probler-popup-close'
    }, '*');
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}
