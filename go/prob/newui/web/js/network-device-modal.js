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

    // Initialize physical inventory tree and performance charts after popup renders
    initializeDeviceTree(device);
    initializePerformanceCharts(device);
}

// Initialize device physical inventory tree
function initializeDeviceTree(deviceData) {
    setTimeout(function() {
        const treeContainer = document.getElementById('physical-inventory-tree');
        if (!treeContainer) return;

        if (deviceData.physicals && Object.keys(deviceData.physicals).length > 0 && typeof ProblerTree !== 'undefined') {
            // Clone physicals and strip performance data (shown in Performance tab instead)
            var treeData = JSON.parse(JSON.stringify(deviceData.physicals));
            Object.keys(treeData).forEach(function(key) {
                if (treeData[key] && treeData[key].performance) {
                    delete treeData[key].performance;
                }
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
    return '<div class="probler-popup-tabs">' +
        '<div class="probler-popup-tab active" data-tab="overview">Overview</div>' +
        '<div class="probler-popup-tab" data-tab="equipment">Equipment</div>' +
        '<div class="probler-popup-tab" data-tab="physical">Physical Inventory</div>' +
        '<div class="probler-popup-tab" data-tab="performance">Performance</div>' +
    '</div>' +
    '<div class="probler-popup-tab-content">' +
        buildOverviewTab(device, statusClass, esc) +
        buildEquipmentTab(device, esc) +
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

// Find performance data from the first physical entry that has it
function findPerformanceData(device) {
    if (!device.physicals) return null;
    var keys = Object.keys(device.physicals);
    for (var i = 0; i < keys.length; i++) {
        var phys = device.physicals[keys[i]];
        if (phys && phys.performance) return phys.performance;
    }
    return null;
}

// Build Performance tab content
function buildPerformanceTab(device) {
    var perf = findPerformanceData(device);
    if (!perf) {
        return '<div class="probler-popup-tab-pane" data-pane="performance">' +
            '<p style="color: var(--layer8d-text-muted, #718096); text-align: center; padding: 40px;">' +
            'No performance data available</p></div>';
    }
    var esc = Layer8DUtils.escapeHtml;
    return '<div class="probler-popup-tab-pane" data-pane="performance">' +
        '<div class="detail-grid">' +
            '<div class="detail-section">' +
                '<div class="detail-section-title">Summary</div>' +
                '<div class="detail-row">' +
                    '<span class="detail-label">Uptime</span>' +
                    '<span class="detail-value">' + esc(perf.uptime || '-') + '</span>' +
                '</div>' +
                '<div class="detail-row">' +
                    '<span class="detail-label">Load Average</span>' +
                    '<span class="detail-value">' + (perf.loadAverage || 0) + '</span>' +
                '</div>' +
                '<div class="detail-row">' +
                    '<span class="detail-label">Active Connections</span>' +
                    '<span class="detail-value">' + (perf.activeConnections || 0) + '</span>' +
                '</div>' +
            '</div>' +
        '</div>' +
        '<div id="perf-cpu-chart" style="margin-top:16px;min-height:200px;"></div>' +
        '<div id="perf-memory-chart" style="margin-top:16px;min-height:200px;"></div>' +
        '<div id="perf-temp-chart" style="margin-top:16px;min-height:200px;"></div>' +
    '</div>';
}

// Format a Unix-seconds timestamp for chart X-axis labels
function formatChartTimestamp(stamp, spanHours) {
    var d = new Date(stamp * 1000);
    var hh = String(d.getHours()).padStart(2, '0');
    var mm = String(d.getMinutes()).padStart(2, '0');
    if (spanHours <= 24) return hh + ':' + mm;
    var mon = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return mon + '/' + day + ' ' + hh + ':' + mm;
}

// Initialize performance charts after popup renders
function initializePerformanceCharts(device) {
    if (typeof Layer8DChart === 'undefined') return;
    var perf = findPerformanceData(device);
    if (!perf) return;

    setTimeout(function() {
        var metrics = [
            { field: 'cpuUsagePercent',    containerId: 'perf-cpu-chart',    title: 'CPU Usage %' },
            { field: 'memoryUsagePercent', containerId: 'perf-memory-chart', title: 'Memory Usage %' },
            { field: 'temperatureCelsius', containerId: 'perf-temp-chart',   title: 'Temperature (C)' }
        ];

        metrics.forEach(function(m) {
            var series = perf[m.field];
            if (!series || !series.length) return;
            if (!document.getElementById(m.containerId)) return;

            // Determine time span for label formatting
            var firstStamp = series[0].stamp || 0;
            var lastStamp = series[series.length - 1].stamp || 0;
            var spanHours = (lastStamp - firstStamp) / 3600;

            var chartData = series.map(function(pt) {
                return {
                    label: formatChartTimestamp(pt.stamp, spanHours),
                    value: pt.value
                };
            });

            var chart = new Layer8DChart({
                containerId: m.containerId,
                viewConfig: {
                    chartType: 'line',
                    title: m.title,
                    categoryField: 'label',
                    valueField: 'value',
                    aggregation: 'avg'
                }
            });
            chart.init();
            chart.setData(chartData, chartData.length);
        });
    }, 100);
}

