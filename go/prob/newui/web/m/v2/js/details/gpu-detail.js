/**
 * GPU Detail Popup - Mobile v2
 * Desktop parity: Overview, Hardware, Performance, Processes tabs
 */
(function() {
    'use strict';

    var D = ProblerDetail;
    var row = D.row;

    function getBarLevel(pct) {
        if (pct > 80) return 'high';
        if (pct > 60) return 'medium';
        return 'low';
    }

    function perfBarHtml(label, value, pct) {
        var level = getBarLevel(pct);
        return '<div class="detail-row"><span class="detail-label">' + label +
            '</span><span class="detail-value">' + value + '</span></div>' +
            '<div class="perf-bar"><div class="perf-bar-fill ' + level + '" style="width:' + pct + '%"></div></div>';
    }

    window.showGpuDetail = function(gpu) {
        var memPercent = gpu.memoryTotal > 0 ? Math.round((gpu.memoryUsed / gpu.memoryTotal) * 100) : 0;
        var powerPercent = gpu.powerLimit > 0 ? Math.round((gpu.powerDraw / gpu.powerLimit) * 100) : 0;
        var clockPercent = gpu.clockSpeedMax > 0 ? Math.round((gpu.clockSpeed / gpu.clockSpeedMax) * 100) : 0;

        // Overview tab — matches desktop Overview
        var overviewContent =
            '<div class="detail-section">' +
                '<div class="detail-section-title">GPU Information</div>' +
                row('Name', gpu.name) +
                row('Model', gpu.model) +
                row('Vendor', gpu.vendor) +
                row('Architecture', gpu.architecture) +
                row('Status', gpu.status) +
                row('Bus ID', gpu.busId) +
            '</div>' +
            '<div class="detail-section">' +
                '<div class="detail-section-title">Host & Location</div>' +
                row('Host Name', gpu.hostName) +
                row('Serial Number', gpu.serialNumber) +
                row('Last Seen', gpu.lastSeen) +
                row('Compute Mode', gpu.computeMode) +
                row('ECC Enabled', gpu.eccEnabled ? 'Yes' : 'No') +
            '</div>';

        // Hardware tab — matches desktop Hardware (4 sections)
        var hwContent =
            '<div class="detail-section">' +
                '<div class="detail-section-title">Core Specifications</div>' +
                row('CUDA Cores', (gpu.cudaCores || 0).toLocaleString()) +
                row('Tensor Cores', gpu.tensorCores) +
                (gpu.rtCores > 0 ? row('RT Cores', gpu.rtCores) : '') +
                row('Clock Speed', gpu.clockSpeed + ' MHz (Max: ' + gpu.clockSpeedMax + ' MHz)') +
                row('Architecture', gpu.architecture) +
            '</div>' +
            '<div class="detail-section">' +
                '<div class="detail-section-title">Memory & Interface</div>' +
                row('Total Memory', gpu.memoryTotal + ' GB ' + (gpu.vramType || '')) +
                row('Memory Type', gpu.vramType) +
                row('PCIe Generation', 'Gen ' + gpu.pcieGen) +
                row('PCIe Lanes', 'x' + gpu.pcieLanes) +
                row('Bus ID', gpu.busId) +
            '</div>' +
            '<div class="detail-section">' +
                '<div class="detail-section-title">Firmware & Drivers</div>' +
                row('Driver Version', gpu.driverVersion) +
                row('CUDA Version', gpu.cudaVersion) +
                row('VBIOS Version', gpu.vbios) +
                row('Serial Number', gpu.serialNumber) +
            '</div>' +
            '<div class="detail-section">' +
                '<div class="detail-section-title">Configuration</div>' +
                row('Compute Mode', gpu.computeMode) +
                row('ECC Support', gpu.eccEnabled ? 'Enabled' : 'Disabled') +
                row('Power Limit', gpu.powerLimit + ' W') +
                row('Fan Speed', gpu.fanSpeed + '%') +
            '</div>';

        // Performance tab — matches desktop Performance
        var perfContent =
            '<div class="detail-section">' +
                '<div class="detail-section-title">Utilization</div>' +
                perfBarHtml('GPU Usage', gpu.utilization + '%', gpu.utilization) +
                perfBarHtml('Memory', gpu.memoryUsed + ' / ' + gpu.memoryTotal + ' GB (' + memPercent + '%)', memPercent) +
            '</div>' +
            '<div class="detail-section">' +
                '<div class="detail-section-title">Thermal & Power</div>' +
                row('Temperature', gpu.temperature + '\u00B0C') +
                perfBarHtml('Power Draw', gpu.powerDraw + ' / ' + gpu.powerLimit + ' W (' + powerPercent + '%)', powerPercent) +
                perfBarHtml('Clock Speed', gpu.clockSpeed + ' / ' + gpu.clockSpeedMax + ' MHz', clockPercent) +
                row('Fan Speed', gpu.fanSpeed + '%') +
            '</div>';

        // Processes tab — matches desktop Processes
        var procs = gpu.processes || [];
        var processesHtml = '';
        if (procs.length > 0) {
            processesHtml = '<div class="detail-section">' +
                '<div class="detail-section-title">Active Processes (' + procs.length + ')</div>';
            procs.forEach(function(proc) {
                var memGB = proc.memoryUsage ? (proc.memoryUsage / 1024).toFixed(2) + ' GB' : '--';
                processesHtml += '<div class="detail-row">' +
                    '<span class="detail-label">PID ' + (proc.pid || '') + '</span>' +
                    '<span class="detail-value">' + D.esc(proc.name || '') + ' (' + memGB + ')</span>' +
                '</div>';
            });
            processesHtml += '</div>';
        } else {
            processesHtml = '<p style="color: var(--layer8d-text-muted); text-align: center; padding: 40px;">No active processes</p>';
        }

        D.showTabbedPopup(gpu.name, [
            { id: 'overview', label: 'Overview', content: overviewContent },
            { id: 'hardware', label: 'Hardware', content: hwContent },
            { id: 'performance', label: 'Performance', content: perfContent },
            { id: 'processes', label: 'Processes', content: processesHtml }
        ]);
    };

})();
