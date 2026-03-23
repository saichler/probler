/**
 * Single GPU Detail Popup - Mobile
 * Desktop parity: gpu-modal.js showGpuDetailPopup() (level 2 stacked popup)
 * Mobile equivalent: opens a new tabbed popup for a single GPU.
 * 6 tabs: Info, Utilization, Thermal & Power, Memory, Clocks, Processes
 * All field names verified against gpu.pb.go protobuf definitions.
 */
(function() {
    'use strict';

    var D = ProblerDetail;
    var row = D.row;
    var rowHtml = D.rowHtml;
    var esc = D.esc;
    var strip = D.stripQuotes;
    var latest = D.latestValue;
    var fmtMiB = D.formatMiB;
    var chart = D.renderTimeSeriesChart;
    var mapH = MobileGpus.enums.mapHealthStatus;

    function healthBadge(status) {
        var label = mapH(status);
        var cls = label === 'healthy' ? 'status-up' :
                  label === 'critical' ? 'status-down' : '';
        return '<span class="' + cls + '">' + label + '</span>';
    }

    // --- Tab builders (match desktop buildGpuInfoPane, buildGpu*Pane) ---

    function buildInfoTab(gpu) {
        var health = gpu.health || {};
        return '<div class="detail-section">' +
            '<div class="detail-section-title">Hardware</div>' +
            row('Device Name', strip(gpu.deviceName)) +
            row('UUID', strip(gpu.deviceUuid), true) +
            row('PCI Bus ID', strip(gpu.pciBusId)) +
            row('Serial Number', strip(gpu.serialNumber)) +
            row('Compute Capability', gpu.computeCapability) +
            row('NUMA Node', gpu.numaNode !== undefined ? gpu.numaNode : '') +
            row('Persistence Mode', gpu.persistenceMode ? 'Enabled' : 'Disabled') +
            row('VRAM Total', fmtMiB(gpu.vramTotalMib)) +
        '</div>' +
        '<div class="detail-section">' +
            '<div class="detail-section-title">Health</div>' +
            rowHtml('PCIe', healthBadge(health.pcieStatus)) +
            rowHtml('Memory', healthBadge(health.memoryStatus)) +
            rowHtml('Thermal', healthBadge(health.thermalStatus)) +
            rowHtml('Power', healthBadge(health.powerStatus)) +
            rowHtml('NVLink', healthBadge(health.nvlinkStatus)) +
            rowHtml('InfoROM', healthBadge(health.inforomStatus)) +
        '</div>' +
        '<div class="detail-section">' +
            '<div class="detail-section-title">Thresholds & ECC</div>' +
            row('Shutdown Temp', gpu.shutdownTemperature ? gpu.shutdownTemperature + '\u00B0C' : '') +
            row('Slowdown Temp', gpu.slowdownTemperature ? gpu.slowdownTemperature + '\u00B0C' : '') +
            row('Power Limit', gpu.powerLimitWatts ? gpu.powerLimitWatts + 'W' : '') +
            row('SM Clock Base', gpu.smClockBaseMhz ? gpu.smClockBaseMhz + ' MHz' : '') +
            row('Mem Clock Base', gpu.memClockBaseMhz ? gpu.memClockBaseMhz + ' MHz' : '') +
            row('ECC Corrected', gpu.eccCorrectedCount || 0) +
            row('ECC Uncorrected', gpu.eccUncorrectedCount || 0) +
        '</div>';
    }

    function buildUtilizationTab() {
        var sp = 'min-height:200px;margin-top:12px;';
        return '<div id="sgpu-util" style="min-height:200px;"></div>' +
            '<div id="sgpu-memutil" style="' + sp + '"></div>' +
            '<div id="sgpu-enc" style="' + sp + '"></div>' +
            '<div id="sgpu-dec" style="' + sp + '"></div>';
    }

    function buildThermalTab() {
        var sp = 'min-height:200px;margin-top:12px;';
        return '<div id="sgpu-temp" style="min-height:200px;"></div>' +
            '<div id="sgpu-memtemp" style="' + sp + '"></div>' +
            '<div id="sgpu-power" style="' + sp + '"></div>' +
            '<div id="sgpu-fan" style="' + sp + '"></div>';
    }

    function buildMemoryTab() {
        return '<div id="sgpu-vram" style="min-height:200px;"></div>';
    }

    function buildClocksTab() {
        return '<div id="sgpu-smclk" style="min-height:200px;"></div>' +
            '<div id="sgpu-memclk" style="min-height:200px;margin-top:12px;"></div>';
    }

    function buildProcessesTab(gpu) {
        var procs = gpu.processes || [];
        if (procs.length === 0) {
            return '<p style="color:var(--text-muted);text-align:center;padding:40px;">No running processes</p>';
        }
        var html = '<div class="detail-section">' +
            '<div class="detail-section-title">Active Processes (' + procs.length + ')</div>' +
            '<table class="net-detail-table"><thead><tr>' +
            '<th>PID</th><th>Name</th><th>Type</th><th>Memory</th>' +
            '</tr></thead><tbody>';
        procs.forEach(function(p) {
            html += '<tr>' +
                '<td class="mono">' + (p.pid || '') + '</td>' +
                '<td>' + esc(p.name || '') + '</td>' +
                '<td>' + esc(p.type || '') + '</td>' +
                '<td class="num">' + fmtMiB(p.usedMemoryMib) + '</td>' +
            '</tr>';
        });
        html += '</tbody></table></div>';
        return html;
    }

    // --- Chart rendering (deferred per tab, matches desktop initGpuCharts) ---

    function renderCharts(gpu, tabId) {
        if (tabId === 'sgpu-utilization') {
            chart('sgpu-util', gpu.gpuUtilizationPercent, 'GPU Utilization %');
            chart('sgpu-memutil', gpu.memoryUtilizationPercent, 'Memory Utilization %');
            chart('sgpu-enc', gpu.encoderUtilizationPercent, 'Encoder Utilization %');
            chart('sgpu-dec', gpu.decoderUtilizationPercent, 'Decoder Utilization %');
        } else if (tabId === 'sgpu-thermal') {
            chart('sgpu-temp', gpu.temperatureCelsius, 'GPU Temperature (\u00B0C)');
            chart('sgpu-memtemp', gpu.memoryTemperatureCelsius, 'Memory Temperature (\u00B0C)');
            chart('sgpu-power', gpu.powerDrawWatts, 'Power Draw (W)');
            chart('sgpu-fan', gpu.fanSpeedPercent, 'Fan Speed %');
        } else if (tabId === 'sgpu-memory') {
            chart('sgpu-vram', gpu.vramUsedMib, 'VRAM Used (MiB)');
        } else if (tabId === 'sgpu-clocks') {
            chart('sgpu-smclk', gpu.smClockMhz, 'SM Clock (MHz)');
            chart('sgpu-memclk', gpu.memClockMhz, 'Memory Clock (MHz)');
        }
    }

    // --- Main entry point ---

    window.showSingleGpuDetail = function(gpu, gpuIndex) {
        var name = strip(gpu.deviceName) || ('GPU ' + gpuIndex);
        var idx = gpu.gpuIndex !== undefined ? gpu.gpuIndex : gpuIndex;
        var rendered = {};

        var tabs = [
            { id: 'sgpu-info', label: 'Info', content: buildInfoTab(gpu) },
            { id: 'sgpu-utilization', label: 'Utilization', content: buildUtilizationTab() },
            { id: 'sgpu-thermal', label: 'Thermal & Power', content: buildThermalTab() },
            { id: 'sgpu-memory', label: 'Memory', content: buildMemoryTab() },
            { id: 'sgpu-clocks', label: 'Clocks', content: buildClocksTab() }
        ];

        var procs = gpu.processes || [];
        if (procs.length > 0) {
            tabs.push({ id: 'sgpu-procs', label: 'Processes', content: buildProcessesTab(gpu) });
        }

        D.showTabbedPopup(
            'GPU ' + idx + ' \u00B7 ' + name,
            tabs,
            null,
            function(tabId) {
                if (!rendered[tabId]) {
                    rendered[tabId] = true;
                    setTimeout(function() { renderCharts(gpu, tabId); }, 50);
                }
            }
        );
    };

})();
