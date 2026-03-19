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
    var gpus = Array.isArray(device.gpus) ? device.gpus : Object.values(device.gpus || {});
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

// Build GPU list tab with per-GPU details (clickable rows)
function buildGpuListTab(device, esc) {
    var gpus = Array.isArray(device.gpus) ? device.gpus : Object.values(device.gpus || {});
    // Store gpus on window for click handler access
    window._gpuDetailList = gpus;

    var html = '<div class="probler-popup-tab-pane" data-pane="gpus">' +
        '<div style="overflow-x: auto;">' +
        '<table class="layer8d-tree-grid-table" style="width: 100%; font-size: 12px;">' +
        '<thead><tr>' +
            '<th>#</th>' +
            '<th>Device Name</th>' +
            '<th>UUID</th>' +
            '<th>PCI Bus ID</th>' +
            '<th>VRAM Total</th>' +
            '<th>VRAM Used</th>' +
            '<th>GPU Util</th>' +
            '<th>Temp</th>' +
            '<th>Power</th>' +
            '<th>Health</th>' +
        '</tr></thead><tbody>';

    gpus.forEach(function(gpu, index) {
        var gpuIdx = gpu.gpuIndex !== undefined ? gpu.gpuIndex : index;
        var vramUsed = gpuLatestValue(gpu.vramUsedMib);
        var gpuUtil = gpuLatestValue(gpu.gpuUtilizationPercent);
        var temp = gpuLatestValue(gpu.temperatureCelsius);
        var power = gpuLatestValue(gpu.powerDrawWatts);
        var healthStatus = gpu.health ? ProblerGpus.enums.mapHealthStatus(gpu.health.thermalStatus) : 'unknown';

        html += '<tr style="cursor: pointer;" onclick="showGpuDetailPopup(' + index + ')">' +
            '<td>' + gpuIdx + '</td>' +
            '<td style="font-weight: 500;">' + esc(gpuStripQuotes(gpu.deviceName)) + '</td>' +
            '<td style="font-family: monospace; font-size: 11px;">' + esc(gpuStripQuotes(gpu.deviceUuid)) + '</td>' +
            '<td style="font-family: monospace;">' + esc(gpuStripQuotes(gpu.pciBusId)) + '</td>' +
            '<td>' + formatMiB(gpu.vramTotalMib) + '</td>' +
            '<td>' + (vramUsed !== null ? formatMiB(vramUsed) : '') + '</td>' +
            '<td>' + (gpuUtil !== null ? gpuUtil.toFixed(1) + '%' : '') + '</td>' +
            '<td>' + (temp !== null ? temp.toFixed(0) + '\u00B0C' : '') + '</td>' +
            '<td>' + (power !== null ? power.toFixed(0) + 'W' : '') + '</td>' +
            '<td><span class="status-' + healthStatus + '">' + healthStatus.toUpperCase() + '</span></td>' +
        '</tr>';
    });

    html += '</tbody></table></div></div>';
    return html;
}

// Show individual GPU detail popup (stacked on top of device popup)
function showGpuDetailPopup(gpuIndex) {
    var gpus = window._gpuDetailList;
    if (!gpus || !gpus[gpuIndex]) return;
    var gpu = gpus[gpuIndex];
    var esc = Layer8DUtils.escapeHtml;
    var gpuName = gpuStripQuotes(gpu.deviceName) || 'GPU ' + gpuIndex;

    var healthStatus = gpu.health ? ProblerGpus.enums.mapHealthStatus(gpu.health.thermalStatus) : 'unknown';
    var titleHtml = '<div class="probler-popup-title-wrapper">' +
        '<h3 class="probler-popup-title">GPU #' + (gpu.gpuIndex !== undefined ? gpu.gpuIndex : gpuIndex) +
        ' - ' + esc(gpuName) + '</h3>' +
        '<span class="probler-popup-status-badge status-' + healthStatus + '">' +
        healthStatus.toUpperCase() + '</span></div>';

    var content = buildSingleGpuContent(gpu, esc);

    Layer8DPopup.show({
        titleHtml: titleHtml,
        content: content,
        size: 'xlarge',
        showFooter: false,
        onShow: function() {
            initGpuCharts(gpu);
        }
    });
}

// Build content for individual GPU detail popup
function buildSingleGpuContent(gpu, esc) {
    return '<div class="probler-popup-tabs">' +
        '<div class="probler-popup-tab active" data-tab="gpu-info">Info</div>' +
        '<div class="probler-popup-tab" data-tab="gpu-utilization">Utilization</div>' +
        '<div class="probler-popup-tab" data-tab="gpu-thermal">Thermal & Power</div>' +
        '<div class="probler-popup-tab" data-tab="gpu-memory">Memory</div>' +
        '<div class="probler-popup-tab" data-tab="gpu-clocks">Clocks</div>' +
        (gpu.processes && gpu.processes.length > 0 ?
            '<div class="probler-popup-tab" data-tab="gpu-procs">Processes</div>' : '') +
    '</div>' +
    '<div class="probler-popup-tab-content">' +
        buildGpuInfoPane(gpu, esc) +
        buildGpuUtilizationPane(gpu) +
        buildGpuThermalPane(gpu) +
        buildGpuMemoryPane(gpu) +
        buildGpuClocksPane(gpu) +
        buildGpuProcessesPane(gpu, esc) +
    '</div>';
}

// Info pane - static GPU hardware details + health
function buildGpuInfoPane(gpu, esc) {
    var health = gpu.health || {};
    var mapH = ProblerGpus.enums.mapHealthStatus;
    return '<div class="probler-popup-tab-pane active" data-pane="gpu-info">' +
        '<div class="detail-grid">' +
            '<div class="detail-section">' +
                '<div class="detail-section-title">Hardware</div>' +
                buildDetailRow('Device Name', esc(gpuStripQuotes(gpu.deviceName))) +
                buildDetailRow('UUID', esc(gpuStripQuotes(gpu.deviceUuid))) +
                buildDetailRow('PCI Bus ID', esc(gpuStripQuotes(gpu.pciBusId))) +
                buildDetailRow('Serial Number', esc(gpuStripQuotes(gpu.serialNumber))) +
                buildDetailRow('Compute Capability', esc(gpu.computeCapability || '')) +
                buildDetailRow('NUMA Node', gpu.numaNode !== undefined ? gpu.numaNode : '') +
                buildDetailRow('Persistence Mode', gpu.persistenceMode ? 'Enabled' : 'Disabled') +
                buildDetailRow('VRAM Total', formatMiB(gpu.vramTotalMib)) +
            '</div>' +
            '<div class="detail-section">' +
                '<div class="detail-section-title">Component Health</div>' +
                buildHealthRow('PCIe', mapH(health.pcieStatus)) +
                buildHealthRow('Memory', mapH(health.memoryStatus)) +
                buildHealthRow('Thermal', mapH(health.thermalStatus)) +
                buildHealthRow('Power', mapH(health.powerStatus)) +
                buildHealthRow('NVLink', mapH(health.nvlinkStatus)) +
                buildHealthRow('InfoROM', mapH(health.inforomStatus)) +
            '</div>' +
            '<div class="detail-section">' +
                '<div class="detail-section-title">Thresholds</div>' +
                buildDetailRow('Shutdown Temp', gpu.shutdownTemperature ? gpu.shutdownTemperature + '\u00B0C' : '') +
                buildDetailRow('Slowdown Temp', gpu.slowdownTemperature ? gpu.slowdownTemperature + '\u00B0C' : '') +
                buildDetailRow('Power Limit', gpu.powerLimitWatts ? gpu.powerLimitWatts + 'W' : '') +
                buildDetailRow('SM Clock Base', gpu.smClockBaseMhz ? gpu.smClockBaseMhz + ' MHz' : '') +
                buildDetailRow('Mem Clock Base', gpu.memClockBaseMhz ? gpu.memClockBaseMhz + ' MHz' : '') +
                buildDetailRow('ECC Corrected', gpu.eccCorrectedCount || 0) +
                buildDetailRow('ECC Uncorrected', gpu.eccUncorrectedCount || 0) +
            '</div>' +
        '</div>' +
    '</div>';
}

function buildHealthRow(label, status) {
    return '<div class="detail-row">' +
        '<span class="detail-label">' + label + '</span>' +
        '<span class="detail-value"><span class="status-' + status + '">' +
        status.toUpperCase() + '</span></span></div>';
}

// Utilization pane - GPU/Memory/Encoder/Decoder utilization charts
function buildGpuUtilizationPane(gpu) {
    return '<div class="probler-popup-tab-pane" data-pane="gpu-utilization">' +
        '<div id="gpu-chart-gpu-util" style="min-height:200px;"></div>' +
        '<div id="gpu-chart-mem-util" style="min-height:200px; margin-top:16px;"></div>' +
        '<div id="gpu-chart-enc-util" style="min-height:200px; margin-top:16px;"></div>' +
        '<div id="gpu-chart-dec-util" style="min-height:200px; margin-top:16px;"></div>' +
    '</div>';
}

// Thermal & Power pane
function buildGpuThermalPane(gpu) {
    return '<div class="probler-popup-tab-pane" data-pane="gpu-thermal">' +
        '<div id="gpu-chart-temp" style="min-height:200px;"></div>' +
        '<div id="gpu-chart-mem-temp" style="min-height:200px; margin-top:16px;"></div>' +
        '<div id="gpu-chart-power" style="min-height:200px; margin-top:16px;"></div>' +
        '<div id="gpu-chart-fan" style="min-height:200px; margin-top:16px;"></div>' +
    '</div>';
}

// Memory pane - VRAM usage chart
function buildGpuMemoryPane(gpu) {
    return '<div class="probler-popup-tab-pane" data-pane="gpu-memory">' +
        '<div id="gpu-chart-vram" style="min-height:200px;"></div>' +
    '</div>';
}

// Clocks pane - SM and Memory clock charts
function buildGpuClocksPane(gpu) {
    return '<div class="probler-popup-tab-pane" data-pane="gpu-clocks">' +
        '<div id="gpu-chart-sm-clock" style="min-height:200px;"></div>' +
        '<div id="gpu-chart-mem-clock" style="min-height:200px; margin-top:16px;"></div>' +
    '</div>';
}

// Processes pane - table of running GPU processes
function buildGpuProcessesPane(gpu, esc) {
    var procs = gpu.processes;
    if (!procs || procs.length === 0) {
        return '<div class="probler-popup-tab-pane" data-pane="gpu-procs">' +
            '<p style="color: var(--layer8d-text-muted, #718096); text-align: center; padding: 40px;">' +
            'No running processes</p></div>';
    }
    var html = '<div class="probler-popup-tab-pane" data-pane="gpu-procs">' +
        '<div style="overflow-x: auto;">' +
        '<table class="layer8d-tree-grid-table" style="width: 100%; font-size: 12px;">' +
        '<thead><tr><th>PID</th><th>Name</th><th>Type</th><th>Memory Used</th></tr></thead><tbody>';
    procs.forEach(function(p) {
        html += '<tr>' +
            '<td>' + (p.pid || '') + '</td>' +
            '<td>' + esc(p.name || '') + '</td>' +
            '<td>' + esc(p.type || '') + '</td>' +
            '<td>' + formatMiB(p.usedMemoryMib) + '</td>' +
        '</tr>';
    });
    html += '</tbody></table></div></div>';
    return html;
}

// Initialize charts for individual GPU detail popup (lazy per tab)
function initGpuCharts(gpu) {
    var rendered = {};

    function renderTab(tabId) {
        if (rendered[tabId]) return;
        rendered[tabId] = true;
        if (typeof renderTimeSeriesChart === 'undefined') return;

        if (tabId === 'gpu-utilization') {
            renderTimeSeriesChart('gpu-chart-gpu-util', gpu.gpuUtilizationPercent, 'GPU Utilization %');
            renderTimeSeriesChart('gpu-chart-mem-util', gpu.memoryUtilizationPercent, 'Memory Utilization %');
            renderTimeSeriesChart('gpu-chart-enc-util', gpu.encoderUtilizationPercent, 'Encoder Utilization %');
            renderTimeSeriesChart('gpu-chart-dec-util', gpu.decoderUtilizationPercent, 'Decoder Utilization %');
        } else if (tabId === 'gpu-thermal') {
            renderTimeSeriesChart('gpu-chart-temp', gpu.temperatureCelsius, 'GPU Temperature (\u00B0C)');
            renderTimeSeriesChart('gpu-chart-mem-temp', gpu.memoryTemperatureCelsius, 'Memory Temperature (\u00B0C)');
            renderTimeSeriesChart('gpu-chart-power', gpu.powerDrawWatts, 'Power Draw (W)');
            renderTimeSeriesChart('gpu-chart-fan', gpu.fanSpeedPercent, 'Fan Speed %');
        } else if (tabId === 'gpu-memory') {
            renderTimeSeriesChart('gpu-chart-vram', gpu.vramUsedMib, 'VRAM Used (MiB)');
        } else if (tabId === 'gpu-clocks') {
            renderTimeSeriesChart('gpu-chart-sm-clock', gpu.smClockMhz, 'SM Clock (MHz)');
            renderTimeSeriesChart('gpu-chart-mem-clock', gpu.memClockMhz, 'Memory Clock (MHz)');
        }
    }

    // Listen for tab switches in the stacked popup
    setTimeout(function() {
        var body = Layer8DPopup.getBody();
        if (!body) return;
        body.addEventListener('click', function(e) {
            var tab = e.target.closest('.probler-popup-tab');
            if (!tab) return;
            var tabId = tab.dataset.tab;
            if (tabId) setTimeout(function() { renderTab(tabId); }, 50);
        });
    }, 100);
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
