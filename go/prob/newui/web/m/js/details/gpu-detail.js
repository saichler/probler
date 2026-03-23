/**
 * GPU Device Detail Popup - Mobile
 * Desktop parity: gpu-modal.js
 * Data model: receives transformed device from MobileGpus.transforms.GpuDevice
 * Fields: {id, hostname, ipAddress, gpuModel, gpuCount, driverVersion, cudaVersion,
 *          dcgmVersion, status, vendor, serialNumber, location, osVersion, kernelVersion,
 *          uptime, lastSeen, gpus: [Gpu], system, health}
 * Each Gpu has: deviceName, deviceUuid, pciBusId, serialNumber, computeCapability,
 *   persistenceMode, numaNode, vramTotalMib, vramUsedMib[], gpuUtilizationPercent[],
 *   memoryUtilizationPercent[], temperatureCelsius[], powerDrawWatts[], fanSpeedPercent[],
 *   smClockMhz[], memClockMhz[], health: {pcieStatus, memoryStatus, thermalStatus,
 *   powerStatus, nvlinkStatus, inforomStatus}, processes[], eccCorrectedCount, eccUncorrectedCount,
 *   shutdownTemperature, slowdownTemperature, powerLimitWatts, smClockBaseMhz, memClockBaseMhz
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

    /** Build GPU selector pill bar */
    function gpuSelector(gpus, prefix) {
        if (gpus.length <= 1) return '';
        var html = '<div style="display:flex;gap:8px;margin-bottom:12px;overflow-x:auto;padding-bottom:4px;">';
        gpus.forEach(function(gpu, i) {
            var name = strip(gpu.deviceName) || ('GPU ' + i);
            var active = i === 0 ? 'background:var(--layer8d-primary,#0ea5e9);color:#fff;' : 'background:var(--bg-tertiary);color:var(--text-secondary);';
            html += '<button class="gpu-sel-btn" data-gpu-idx="' + i + '" data-prefix="' + prefix + '" ' +
                'style="' + active + 'border:none;padding:6px 12px;border-radius:16px;font-size:12px;font-weight:600;white-space:nowrap;cursor:pointer;">' +
                name + '</button>';
        });
        html += '</div>';
        return html;
    }

    // --- Tab builders ---

    function buildOverviewTab(device) {
        var sys = device.system || {};
        return '<div class="detail-section">' +
            '<div class="detail-section-title">Server</div>' +
            row('Hostname', device.hostname) +
            row('IP Address', device.ipAddress) +
            row('Vendor', device.vendor) +
            row('Serial Number', device.serialNumber) +
            row('Location', device.location) +
            rowHtml('Status', '<span class="status-badge status-' + (device.status || 'unknown') + '">' + esc(device.status || 'Unknown') + '</span>') +
        '</div>' +
        '<div class="detail-section">' +
            '<div class="detail-section-title">GPU Summary</div>' +
            row('GPU Count', device.gpuCount) +
            row('GPU Model', device.gpuModel) +
            (sys.cpuSockets ? row('CPU Sockets', sys.cpuSockets) : '') +
            (sys.cpuCoresTotal ? row('CPU Cores', sys.cpuCoresTotal) : '') +
            row('Uptime', device.uptime) +
            row('Last Seen', device.lastSeen) +
        '</div>';
    }

    function buildGpusTab(gpus) {
        if (!gpus || gpus.length === 0) {
            return '<p style="color:var(--text-muted);text-align:center;padding:40px;">No GPU data</p>';
        }
        var html = '';
        gpus.forEach(function(gpu, i) {
            var name = strip(gpu.deviceName) || ('GPU ' + i);
            var health = gpu.health || {};
            var vramUsed = latest(gpu.vramUsedMib);
            var gpuUtil = latest(gpu.gpuUtilizationPercent);
            var temp = latest(gpu.temperatureCelsius);
            var power = latest(gpu.powerDrawWatts);

            html += '<div class="detail-section">' +
                '<div class="detail-section-title">GPU ' + (gpu.gpuIndex !== undefined ? gpu.gpuIndex : i) + ' — ' + esc(name) + '</div>' +
                row('UUID', strip(gpu.deviceUuid), true) +
                row('PCI Bus ID', strip(gpu.pciBusId)) +
                row('Serial Number', strip(gpu.serialNumber)) +
                row('Compute Capability', gpu.computeCapability) +
                row('NUMA Node', gpu.numaNode !== undefined ? gpu.numaNode : '') +
                row('Persistence Mode', gpu.persistenceMode ? 'Enabled' : 'Disabled') +
                row('VRAM Total', fmtMiB(gpu.vramTotalMib)) +
                (vramUsed !== null ? row('VRAM Used', fmtMiB(vramUsed)) : '') +
                (gpuUtil !== null ? row('GPU Utilization', gpuUtil.toFixed(1) + '%') : '') +
                (temp !== null ? row('Temperature', temp.toFixed(0) + '\u00B0C') : '') +
                (power !== null ? row('Power Draw', power.toFixed(0) + 'W') : '') +
                '<div style="margin-top:8px;text-align:right;">' +
                    '<button class="gpu-detail-btn" data-gpu-idx="' + i + '" ' +
                        'style="background:none;border:1px solid var(--layer8d-primary,#0ea5e9);color:var(--layer8d-primary,#0ea5e9);' +
                        'padding:6px 14px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">' +
                        'View Details \u203A</button>' +
                '</div>' +
            '</div>';

            // Health indicators
            html += '<div class="detail-section">' +
                '<div class="detail-section-title">Health</div>' +
                rowHtml('PCIe', healthBadge(health.pcieStatus)) +
                rowHtml('Memory', healthBadge(health.memoryStatus)) +
                rowHtml('Thermal', healthBadge(health.thermalStatus)) +
                rowHtml('Power', healthBadge(health.powerStatus)) +
                rowHtml('NVLink', healthBadge(health.nvlinkStatus)) +
                rowHtml('InfoROM', healthBadge(health.inforomStatus)) +
            '</div>';

            // Thresholds & ECC
            html += '<div class="detail-section">' +
                '<div class="detail-section-title">Thresholds & ECC</div>' +
                row('Shutdown Temp', gpu.shutdownTemperature ? gpu.shutdownTemperature + '\u00B0C' : '') +
                row('Slowdown Temp', gpu.slowdownTemperature ? gpu.slowdownTemperature + '\u00B0C' : '') +
                row('Power Limit', gpu.powerLimitWatts ? gpu.powerLimitWatts + 'W' : '') +
                row('SM Clock Base', gpu.smClockBaseMhz ? gpu.smClockBaseMhz + ' MHz' : '') +
                row('Mem Clock Base', gpu.memClockBaseMhz ? gpu.memClockBaseMhz + ' MHz' : '') +
                row('ECC Corrected', gpu.eccCorrectedCount || 0) +
                row('ECC Uncorrected', gpu.eccUncorrectedCount || 0) +
            '</div>';
        });
        return html;
    }

    function buildPerfTab(gpus) {
        if (!gpus || gpus.length === 0) return '<p style="color:var(--text-muted);text-align:center;padding:40px;">No GPU data</p>';
        var html = gpuSelector(gpus, 'perf');
        gpus.forEach(function(gpu, i) {
            var display = i === 0 ? '' : 'display:none;';
            var sp = 'min-height:200px;margin-top:12px;';
            html += '<div class="gpu-perf-panel" data-gpu-idx="' + i + '" style="' + display + '">' +
                // Utilization (4 charts — matches desktop Utilization tab)
                '<div id="gpu-perf-util-' + i + '" style="min-height:200px;"></div>' +
                '<div id="gpu-perf-memutil-' + i + '" style="' + sp + '"></div>' +
                '<div id="gpu-perf-enc-' + i + '" style="' + sp + '"></div>' +
                '<div id="gpu-perf-dec-' + i + '" style="' + sp + '"></div>' +
                // Thermal & Power (4 charts — matches desktop Thermal & Power tab)
                '<div id="gpu-perf-temp-' + i + '" style="' + sp + '"></div>' +
                '<div id="gpu-perf-memtemp-' + i + '" style="' + sp + '"></div>' +
                '<div id="gpu-perf-power-' + i + '" style="' + sp + '"></div>' +
                '<div id="gpu-perf-fan-' + i + '" style="' + sp + '"></div>' +
                // Memory (1 chart — matches desktop Memory tab)
                '<div id="gpu-perf-vram-' + i + '" style="' + sp + '"></div>' +
                // Clocks (2 charts — matches desktop Clocks tab)
                '<div id="gpu-perf-smclk-' + i + '" style="' + sp + '"></div>' +
                '<div id="gpu-perf-memclk-' + i + '" style="' + sp + '"></div>' +
            '</div>';
        });
        return html;
    }

    function buildSoftwareTab(device) {
        return '<div class="detail-section">' +
            '<div class="detail-section-title">Driver & CUDA</div>' +
            row('Driver Version', device.driverVersion) +
            row('CUDA Version', device.cudaVersion) +
            row('DCGM Version', device.dcgmVersion) +
        '</div>' +
        '<div class="detail-section">' +
            '<div class="detail-section-title">Operating System</div>' +
            row('OS Version', device.osVersion) +
            row('Kernel Version', device.kernelVersion) +
        '</div>';
    }

    function buildProcessesTab(gpus) {
        if (!gpus || gpus.length === 0) return '<p style="color:var(--text-muted);text-align:center;padding:40px;">No GPU data</p>';
        var html = gpuSelector(gpus, 'proc');
        gpus.forEach(function(gpu, i) {
            var display = i === 0 ? '' : 'display:none;';
            var procs = gpu.processes || [];
            html += '<div class="gpu-proc-panel" data-gpu-idx="' + i + '" style="' + display + '">';
            if (procs.length > 0) {
                html += '<div class="detail-section">' +
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
            } else {
                html += '<p style="color:var(--text-muted);text-align:center;padding:40px;">No active processes</p>';
            }
            html += '</div>';
        });
        return html;
    }

    // --- Chart rendering (deferred until tab activation) ---

    function renderPerfCharts(gpus, gpuIdx) {
        var gpu = gpus[gpuIdx];
        if (!gpu) return;
        // Utilization (4 — matches desktop gpu-modal.js Utilization tab)
        chart('gpu-perf-util-' + gpuIdx, gpu.gpuUtilizationPercent, 'GPU Utilization %');
        chart('gpu-perf-memutil-' + gpuIdx, gpu.memoryUtilizationPercent, 'Memory Utilization %');
        chart('gpu-perf-enc-' + gpuIdx, gpu.encoderUtilizationPercent, 'Encoder Utilization %');
        chart('gpu-perf-dec-' + gpuIdx, gpu.decoderUtilizationPercent, 'Decoder Utilization %');
        // Thermal & Power (4 — matches desktop Thermal & Power tab)
        chart('gpu-perf-temp-' + gpuIdx, gpu.temperatureCelsius, 'GPU Temperature (\u00B0C)');
        chart('gpu-perf-memtemp-' + gpuIdx, gpu.memoryTemperatureCelsius, 'Memory Temperature (\u00B0C)');
        chart('gpu-perf-power-' + gpuIdx, gpu.powerDrawWatts, 'Power Draw (W)');
        chart('gpu-perf-fan-' + gpuIdx, gpu.fanSpeedPercent, 'Fan Speed %');
        // Memory (1 — matches desktop Memory tab)
        chart('gpu-perf-vram-' + gpuIdx, gpu.vramUsedMib, 'VRAM Used (MiB)');
        // Clocks (2 — matches desktop Clocks tab)
        chart('gpu-perf-smclk-' + gpuIdx, gpu.smClockMhz, 'SM Clock (MHz)');
        chart('gpu-perf-memclk-' + gpuIdx, gpu.memClockMhz, 'Memory Clock (MHz)');
    }

    // --- GPU selector click handler ---

    function initGpuSelectors(popup) {
        if (!popup) return;
        var body = popup.body || popup;
        body.addEventListener('click', function(e) {
            // GPU detail button — open single-GPU popup
            var detailBtn = e.target.closest('.gpu-detail-btn');
            if (detailBtn) {
                var gi = parseInt(detailBtn.dataset.gpuIdx);
                if (window._gpuDetailGpus && window._gpuDetailGpus[gi] && typeof showSingleGpuDetail === 'function') {
                    showSingleGpuDetail(window._gpuDetailGpus[gi], gi);
                }
                return;
            }

            // GPU selector pill — switch panels
            var btn = e.target.closest('.gpu-sel-btn');
            if (!btn) return;
            var idx = parseInt(btn.dataset.gpuIdx);
            var prefix = btn.dataset.prefix;

            // Update button styles
            var siblings = btn.parentElement.querySelectorAll('.gpu-sel-btn');
            siblings.forEach(function(b) {
                b.style.background = 'var(--bg-tertiary)';
                b.style.color = 'var(--text-secondary)';
            });
            btn.style.background = 'var(--layer8d-primary, #0ea5e9)';
            btn.style.color = '#fff';

            // Show/hide panels
            var panelClass = prefix === 'perf' ? '.gpu-perf-panel' : '.gpu-proc-panel';
            body.querySelectorAll(panelClass).forEach(function(p) {
                p.style.display = parseInt(p.dataset.gpuIdx) === idx ? '' : 'none';
            });

            // Render charts if switching to perf panel
            if (prefix === 'perf' && window._gpuDetailGpus) {
                renderPerfCharts(window._gpuDetailGpus, idx);
            }
        });
    }

    // --- Main entry point ---

    window.showGpuDetail = function(device) {
        var gpus = device.gpus || [];
        window._gpuDetailGpus = gpus;
        var perfRendered = {};

        var tabs = [
            { id: 'overview', label: 'Overview', content: buildOverviewTab(device) },
            { id: 'gpus', label: 'GPUs (' + gpus.length + ')', content: buildGpusTab(gpus) },
            { id: 'performance', label: 'Performance', content: buildPerfTab(gpus) },
            { id: 'software', label: 'Software', content: buildSoftwareTab(device) },
            { id: 'processes', label: 'Processes', content: buildProcessesTab(gpus) }
        ];

        D.showTabbedPopup(
            device.hostname || device.id,
            tabs,
            function(popup) {
                initGpuSelectors(popup);
            },
            function(tabId, popup) {
                if (tabId === 'performance' && !perfRendered[0]) {
                    perfRendered[0] = true;
                    setTimeout(function() { renderPerfCharts(gpus, 0); }, 50);
                }
            }
        );
    };

})();
