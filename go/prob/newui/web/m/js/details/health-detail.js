/**
 * Health Detail Popup - Mobile v2
 * Desktop parity: 4 tabs (Overview, Network, Resources, Services) + pprof button
 */
(function() {
    'use strict';

    var D = ProblerDetail;
    var row = D.row;

    function downloadBinaryFile(base64Data, filename) {
        var binaryStr = atob(base64Data);
        var bytes = new Uint8Array(binaryStr.length);
        for (var i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
        }
        var blob = new Blob([bytes], { type: 'application/octet-stream' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    async function fetchPprofData(rawData) {
        var endpoint = Layer8MConfig.resolveEndpoint('/0/Health');
        var payload = { aUuid: rawData.aUuid, pprofCollect: true };
        var body = encodeURIComponent(JSON.stringify(payload));

        // Show countdown
        var countdownContent = '<div style="text-align:center;padding:24px;">' +
            '<div style="font-size:14px;color:var(--layer8d-text-medium);margin-bottom:16px;">Collecting CPU profile...</div>' +
            '<div id="pprof-countdown" style="font-size:48px;font-weight:bold;color:var(--layer8d-primary);">5</div>' +
            '<div style="font-size:12px;color:var(--layer8d-text-muted);margin-top:8px;">seconds remaining</div>' +
            '</div>';

        D.showTabbedPopup('CPU Profiling', [
            { id: 'countdown', label: 'Profiling', content: countdownContent }
        ]);

        var countdown = 5;
        var intervalId = setInterval(function() {
            countdown--;
            var el = document.getElementById('pprof-countdown');
            if (el) el.textContent = Math.max(0, countdown);
            if (countdown <= 0) clearInterval(intervalId);
        }, 1000);

        try {
            var response = await Layer8MAuth.makeAuthenticatedRequest(endpoint + '?body=' + body, { method: 'GET' });
            if (!response || !response.ok) throw new Error('Failed');
            var data = await response.json();
            var item = data && data.list && data.list[0];

            // Wait for countdown to finish
            await new Promise(function(resolve) {
                var check = setInterval(function() {
                    if (countdown <= 0) { clearInterval(check); resolve(); }
                }, 200);
            });

            if (typeof Layer8MPopup !== 'undefined') Layer8MPopup.close();

            var alias = rawData.alias || 'unknown';
            if (item && item.pprofMemory) downloadBinaryFile(item.pprofMemory, alias + '-memory.dat');
            if (item && item.pprofCpu) downloadBinaryFile(item.pprofCpu, alias + '-cpu.dat');
            if (!item || (!item.pprofMemory && !item.pprofCpu)) {
                alert('No pprof data returned for ' + alias);
            }
        } catch (err) {
            if (typeof Layer8MPopup !== 'undefined') Layer8MPopup.close();
            alert('Error fetching pprof data');
        }
    }

    window.showHealthDetail = function(rowData) {
        var rawData = MobileSystem.getHealthRawData(rowData.service);
        if (!rawData) return;

        var stats = rawData.stats || {};
        var services = rawData.services || {};
        var serviceToAreas = services.serviceToAreas || {};

        // Tab 1: Overview
        var overviewContent =
            '<div class="detail-section">' +
                '<div class="detail-section-title">Service Information</div>' +
                row('Service Name', rowData.service) +
                row('Alias', rawData.alias || 'N/A') +
                row('Start Time', rawData.startTime ? new Date(parseInt(rawData.startTime)).toLocaleString() : 'N/A') +
                row('Up Time', rowData.upTime) +
            '</div>' +
            '<div class="detail-section">' +
                '<div class="detail-section-title">Quick Stats</div>' +
                row('Memory Usage', rowData.memory) +
                row('CPU Usage', rowData.cpuPercent) +
                row('Last Pulse', rowData.lastPulse) +
            '</div>';

        // Tab 2: Network
        var networkContent =
            '<div class="detail-section">' +
                '<div class="detail-section-title">Receive Statistics</div>' +
                row('RX Messages', (rowData.rx || 0).toLocaleString()) +
                row('RX Data', rowData.rxData) +
                row('RX Data (bytes)', (stats.rxDataCont || 0).toLocaleString()) +
            '</div>' +
            '<div class="detail-section">' +
                '<div class="detail-section-title">Transmit Statistics</div>' +
                row('TX Messages', (rowData.tx || 0).toLocaleString()) +
                row('TX Data', rowData.txData) +
                row('TX Data (bytes)', (stats.txDataCount || 0).toLocaleString()) +
            '</div>' +
            '<div class="detail-section">' +
                '<div class="detail-section-title">Message Timing</div>' +
                row('Last Message', stats.lastMsgTime ? new Date(parseInt(stats.lastMsgTime)).toLocaleString() : 'N/A') +
                row('Time Since Last', rowData.lastPulse) +
            '</div>';

        // Tab 3: Resources
        var resourcesContent =
            '<div class="detail-section">' +
                '<div class="detail-section-title">Memory Usage</div>' +
                row('Formatted', rowData.memory) +
                row('Raw (bytes)', (stats.memoryUsage || 0).toLocaleString()) +
            '</div>' +
            '<div class="detail-section">' +
                '<div class="detail-section-title">CPU Usage</div>' +
                row('Percentage', rowData.cpuPercent) +
                row('Raw Value', stats.cpuUsage || 0) +
            '</div>' +
            '<div class="detail-section">' +
                '<div class="detail-section-title">Additional Details</div>' +
                row('Data Object', rawData.data || 'N/A') +
            '</div>';

        // Tab 4: Services
        var servicesContent = '<div class="detail-section">' +
            '<div class="detail-section-title">Registered Services</div>';
        var svcKeys = Object.keys(serviceToAreas);
        if (svcKeys.length > 0) {
            svcKeys.forEach(function(svcName) {
                var svcData = serviceToAreas[svcName];
                var areas = svcData.areas || {};
                var areasList = Object.keys(areas).filter(function(a) { return areas[a]; }).join(', ');
                servicesContent += row(svcName, 'Areas: ' + (areasList || 'None'));
            });
        } else {
            servicesContent += '<p style="color:var(--layer8d-text-muted);text-align:center;padding:20px;">No services available</p>';
        }
        servicesContent += '</div>';

        // Pprof button
        servicesContent += '<div style="text-align:center;padding:16px;">' +
            '<button id="health-pprof-btn" style="background:var(--layer8d-primary);color:#fff;border:none;' +
            'padding:10px 20px;border-radius:6px;font-size:14px;cursor:pointer;">Memory & CPU</button>' +
            '</div>';

        D.showTabbedPopup(rowData.service, [
            { id: 'overview', label: 'Overview', content: overviewContent },
            { id: 'network', label: 'Network', content: networkContent },
            { id: 'resources', label: 'Resources', content: resourcesContent },
            { id: 'services', label: 'Services', content: servicesContent }
        ]);

        // Wire up pprof button after popup renders
        setTimeout(function() {
            var btn = document.getElementById('health-pprof-btn');
            if (btn) {
                btn.addEventListener('click', function() {
                    fetchPprofData(rawData);
                });
            }
        }, 100);
    };

})();
