// GPU Device Detail Modal - Direct Layer8DPopup integration

// Strip extra embedded quotes from protobuf string values
function gpuStripQuotes(str) {
    if (!str) return '';
    return str.replace(/^"+|"+$/g, '');
}

// Get the latest value from a time-series array (L8TimeSeriesPoint)
function gpuLatestValue(timeSeries) {
    if (!timeSeries || !Array.isArray(timeSeries) || timeSeries.length === 0) return null;
    var last = timeSeries[timeSeries.length - 1];
    return last ? (last.value !== undefined ? last.value : null) : null;
}

// Format MiB to human-readable
function formatMiB(mib) {
    if (!mib && mib !== 0) return '';
    if (mib >= 1024) return (mib / 1024).toFixed(1) + ' GiB';
    return mib + ' MiB';
}

// Show GPU device detail modal
function showGPUDetailModal(device) {
    var statusClass = 'status-' + (device.status || 'unknown');
    var esc = Layer8DUtils.escapeHtml;

    var titleHtml = '<div class="probler-popup-title-wrapper">' +
        '<h3 class="probler-popup-title">GPU Server - ' + esc(device.hostname || device.id) + '</h3>' +
        '<span class="probler-popup-status-badge ' + statusClass + '">' +
        (device.status ? device.status.toUpperCase() : 'UNKNOWN') + '</span>' +
        '</div>';

    var content = buildGpuDeviceContent(device, esc);

    Layer8DPopup.show({
        titleHtml: titleHtml,
        content: content,
        size: 'xlarge',
        showFooter: false,
        id: 'gpu-device-detail-' + device.id
    });
}

// Build the full popup content with tabs
function buildGpuDeviceContent(device, esc) {
    var gpus = device.gpus || [];
    var hasGpus = gpus.length > 0;

    return '<div class="probler-popup-tabs">' +
        '<div class="probler-popup-tab active" data-tab="overview">Overview</div>' +
        (hasGpus ? '<div class="probler-popup-tab" data-tab="gpus">GPUs (' + gpus.length + ')</div>' : '') +
        '<div class="probler-popup-tab" data-tab="software">Software</div>' +
    '</div>' +
    '<div class="probler-popup-tab-content">' +
        buildGpuOverviewTab(device, esc) +
        (hasGpus ? buildGpuListTab(device, esc) : '') +
        buildGpuSoftwareTab(device, esc) +
    '</div>';
}

// Build Overview tab
function buildGpuOverviewTab(device, esc) {
    var sys = device.system || {};
    return '<div class="probler-popup-tab-pane active" data-pane="overview">' +
        '<div class="detail-grid">' +
            '<div class="detail-section">' +
                '<div class="detail-section-title">Server Information</div>' +
                buildDetailRow('Hostname', esc(device.hostname || '')) +
                buildDetailRow('IP Address', esc(device.ipAddress || device.id || '')) +
                buildDetailRow('Vendor', esc(device.vendor || '')) +
                buildDetailRow('Serial Number', esc(device.serialNumber || '')) +
                buildDetailRow('Location', esc(device.location || '')) +
                buildDetailRow('Status', '<span class="status-' + (device.status || 'unknown') + '">' +
                    (device.status ? device.status.toUpperCase() : 'UNKNOWN') + '</span>') +
            '</div>' +
            '<div class="detail-section">' +
                '<div class="detail-section-title">GPU Summary</div>' +
                buildDetailRow('GPU Count', device.gpuCount || 0) +
                buildDetailRow('GPU Model', esc(device.gpuModel || '')) +
                (sys.cpuSockets ? buildDetailRow('CPU Sockets', sys.cpuSockets) : '') +
                (sys.cpuCoresTotal ? buildDetailRow('CPU Cores', sys.cpuCoresTotal) : '') +
                buildDetailRow('Uptime', esc(device.uptime || '')) +
                buildDetailRow('Last Seen', esc(device.lastSeen || '')) +
            '</div>' +
        '</div>' +
    '</div>';
}

// Build GPU list tab with per-GPU details
function buildGpuListTab(device, esc) {
    var gpus = device.gpus || [];
    var html = '<div class="probler-popup-tab-pane" data-pane="gpus">' +
        '<div style="overflow-x: auto;">' +
        '<table class="layer8d-tree-grid-table" style="width: 100%; font-size: 12px;">' +
        '<thead><tr>' +
            '<th>#</th>' +
            '<th>Device Name</th>' +
            '<th>UUID</th>' +
            '<th>PCI Bus ID</th>' +
            '<th>Serial Number</th>' +
            '<th>VRAM Total</th>' +
            '<th>Power Limit</th>' +
            '<th>Compute Cap.</th>' +
        '</tr></thead><tbody>';

    gpus.forEach(function(gpu, index) {
        html += '<tr>' +
            '<td>' + (gpu.gpuIndex !== undefined ? gpu.gpuIndex : index) + '</td>' +
            '<td style="font-weight: 500;">' + esc(gpuStripQuotes(gpu.deviceName)) + '</td>' +
            '<td style="font-family: monospace; font-size: 11px;">' + esc(gpuStripQuotes(gpu.deviceUuid)) + '</td>' +
            '<td style="font-family: monospace;">' + esc(gpuStripQuotes(gpu.pciBusId)) + '</td>' +
            '<td>' + esc(gpuStripQuotes(gpu.serialNumber)) + '</td>' +
            '<td>' + formatMiB(gpu.vramTotalMib) + '</td>' +
            '<td>' + (gpu.powerLimitWatts ? gpu.powerLimitWatts + 'W' : '') + '</td>' +
            '<td>' + esc(gpu.computeCapability || '') + '</td>' +
        '</tr>';
    });

    html += '</tbody></table></div></div>';
    return html;
}

// Build Software tab
function buildGpuSoftwareTab(device, esc) {
    return '<div class="probler-popup-tab-pane" data-pane="software">' +
        '<div class="detail-grid">' +
            '<div class="detail-section">' +
                '<div class="detail-section-title">Driver & CUDA</div>' +
                buildDetailRow('Driver Version', esc(device.driverVersion || '')) +
                buildDetailRow('CUDA Version', esc(device.cudaVersion || '')) +
                buildDetailRow('DCGM Version', esc(device.dcgmVersion || '')) +
            '</div>' +
            '<div class="detail-section">' +
                '<div class="detail-section-title">Operating System</div>' +
                buildDetailRow('OS Version', esc(device.osVersion || '')) +
                buildDetailRow('Kernel Version', esc(device.kernelVersion || '')) +
            '</div>' +
        '</div>' +
    '</div>';
}

// Helper to build a detail row
function buildDetailRow(label, value) {
    return '<div class="detail-row">' +
        '<span class="detail-label">' + label + '</span>' +
        '<span class="detail-value">' + (value || '') + '</span>' +
    '</div>';
}
