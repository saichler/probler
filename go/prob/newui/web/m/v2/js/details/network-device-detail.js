/**
 * Network Device Detail Popup - Mobile v2
 * Adapted from m/app/js/network-device-detail.js to use Layer8MPopup
 */
(function() {
    'use strict';

    var D = ProblerDetail;
    var row = D.row;

    var BGP_PEER_STATE = {
        0: 'Unknown', 1: 'Idle', 2: 'Connect', 3: 'Active',
        4: 'OpenSent', 5: 'OpenConfirm', 6: 'Established'
    };
    var BGP_PEER_TYPE = { 0: '', 1: 'iBGP', 2: 'eBGP' };
    var OSPF_NEIGHBOR_STATE = {
        0: 'Unknown', 1: 'Down', 2: 'Attempt', 3: 'Init', 4: '2-Way',
        5: 'ExStart', 6: 'Exchange', 7: 'Loading', 8: 'Full'
    };
    var VRF_STATUS = { 0: 'Unknown', 1: 'Active', 2: 'Inactive', 3: 'Admin Down' };

    var INTERFACE_TYPE_NAMES = {
        0: '', 1: 'Ethernet', 2: 'Fast Ethernet', 3: 'GigE',
        4: '10GigE', 5: '25GigE', 6: '40GigE', 7: '100GigE',
        8: 'Serial', 9: 'ATM', 10: 'Frame Relay', 11: 'Loopback',
        12: 'Management', 13: 'Tunnel', 14: 'VLAN', 15: 'Bridge'
    };

    function formatMfgDate(hex) {
        if (!hex || hex.length < 8) return hex || '--';
        var year = parseInt(hex.substring(0, 4), 16);
        var month = parseInt(hex.substring(4, 6), 16);
        var day = parseInt(hex.substring(6, 8), 16);
        if (isNaN(year) || isNaN(month) || isNaN(day)) return hex;
        return year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
    }

    function formatPackets(pkts) {
        if (!pkts) return '';
        var n = Number(pkts);
        if (isNaN(n)) return '';
        return n.toLocaleString();
    }

    function collectInterfaces(raw) {
        var byName = {};
        if (raw.physicals) {
            Object.keys(raw.physicals).forEach(function(key) {
                var phys = raw.physicals[key];
                if (phys && phys.ports) {
                    phys.ports.forEach(function(port) {
                        if (port && port.interfaces) {
                            port.interfaces.forEach(function(iface) {
                                if (iface && (iface.name || iface.id)) {
                                    byName[iface.name || iface.id] = iface;
                                }
                            });
                        }
                    });
                }
            });
        }
        if (raw.logicals) {
            Object.keys(raw.logicals).forEach(function(key) {
                var logical = raw.logicals[key];
                if (logical && logical.interfaces) {
                    logical.interfaces.forEach(function(iface) {
                        if (iface && (iface.name || iface.id)) {
                            var k = iface.name || iface.id;
                            if (!byName[k]) byName[k] = iface;
                        }
                    });
                }
            });
        }
        return Object.values(byName);
    }

    function collectVrfs(raw) {
        var vrfs = [];
        if (!raw.logicals) return vrfs;
        Object.keys(raw.logicals).forEach(function(key) {
            var logical = raw.logicals[key];
            if (logical && logical.vrfs) {
                logical.vrfs.forEach(function(vrf) {
                    if (vrf && vrf.vrfName) vrfs.push(vrf);
                });
            }
        });
        return vrfs;
    }

    function findPerformanceData(raw) {
        if (!raw.physicals) return null;
        var keys = Object.keys(raw.physicals);
        for (var i = 0; i < keys.length; i++) {
            var phys = raw.physicals[keys[i]];
            if (phys && phys.performance) return phys.performance;
        }
        return null;
    }

    function buildOverviewTab(device, statusClass) {
        var coords = '';
        if (device.latitude && device.longitude) {
            coords = Number(device.latitude).toFixed(4) + ', ' + Number(device.longitude).toFixed(4);
        }
        return '<div class="detail-section">' +
            '<div style="text-align: center; padding: 12px;">' +
                '<span class="status-badge ' + statusClass + '" style="font-size: 0.9rem; padding: 8px 16px;">' +
                device.status.toUpperCase() + '</span>' +
            '</div></div>' +
            '<div class="detail-section">' +
                '<div class="detail-section-title">Device Information</div>' +
                row('Device Name', device.name) +
                row('System Name', device.sysName) +
                row('IP Address', device.ip) +
                row('Device Type', device.type.icon + ' ' + device.type.name) +
                row('Last Seen', device.lastSeen) +
            '</div>' +
            '<div class="detail-section">' +
                '<div class="detail-section-title">Location & Network</div>' +
                row('Location', device.location) +
                row('Coordinates', coords) +
                row('Uptime', device.uptime) +
                row('Interfaces', device.interfaces) +
            '</div>';
    }

    function buildEquipmentTab(device) {
        var info = device.raw.equipmentinfo || {};
        var html = '<div class="detail-section">' +
            '<div class="detail-section-title">Hardware</div>' +
            row('Vendor', info.vendor) +
            row('Model', info.model) +
            row('Series', info.series) +
            row('Family', info.family) +
            row('Serial Number', info.serialNumber) +
            row('Interfaces', device.interfaces) +
        '</div>' +
        '<div class="detail-section">' +
            '<div class="detail-section-title">Software & Configuration</div>' +
            row('Software', info.software, true) +
            row('Hardware', info.hardware, true) +
            row('Version', info.version) +
            row('Firmware', info.firmwareVersion || info.version) +
            row('System OID', info.sysOid, true) +
            row('Device Type', device.type.name) +
            row('Management IP', device.ip) +
        '</div>';
        if (info.manufacturerName || info.manufacturingDate || info.assetId ||
            info.physicalAlias || info.vendorTypeOid || info.identificationUris || info.isFru) {
            html += '<div class="detail-section">' +
                '<div class="detail-section-title">Asset Information</div>' +
                row('Manufacturer', info.manufacturerName) +
                row('Mfg Date', formatMfgDate(info.manufacturingDate)) +
                row('Asset ID', info.assetId) +
                row('Physical Alias', info.physicalAlias) +
                row('Field Replaceable', info.isFru ? 'Yes' : 'No') +
            '</div>' +
            '<div class="detail-section">' +
                '<div class="detail-section-title">Entity MIB Details</div>' +
                row('Vendor Type OID', info.vendorTypeOid) +
                row('Identification URIs', info.identificationUris) +
            '</div>';
        }
        return html;
    }

    function buildInterfacesTab(raw) {
        var interfaces = collectInterfaces(raw);
        if (interfaces.length === 0) {
            return '<p style="color: var(--layer8d-text-muted); text-align: center; padding: 40px;">No interface data available</p>';
        }
        var hasStats = interfaces.some(function(i) { return i.statistics; });
        var html = '<div style="overflow-x: auto; -webkit-overflow-scrolling: touch;">' +
            '<table class="net-detail-table">' +
            '<thead><tr><th>Name</th><th>Status</th><th>Admin</th><th>Type</th>' +
            '<th>IP</th><th>MAC</th><th>Speed</th><th>MTU</th>' +
            (hasStats ? '<th>RX</th><th>TX</th><th>RX Pkts</th><th>TX Pkts</th>' : '') +
            '</tr></thead><tbody>';
        interfaces.forEach(function(iface) {
            var operStatus = D.esc(iface.status || '');
            var operClass = operStatus.toLowerCase() === 'up' ? 'status-up' :
                            operStatus.toLowerCase() === 'down' ? 'status-down' : '';
            var adminLabel = iface.adminStatus ? 'Up' : 'Down';
            var adminClass = iface.adminStatus ? 'status-up' : 'status-down';
            var stats = iface.statistics || {};
            html += '<tr>' +
                '<td class="iface-name">' + D.esc(iface.name || iface.id || '') + '</td>' +
                '<td><span class="' + operClass + '">' + operStatus + '</span></td>' +
                '<td><span class="' + adminClass + '">' + adminLabel + '</span></td>' +
                '<td>' + D.esc(INTERFACE_TYPE_NAMES[iface.interfaceType] || '') + '</td>' +
                '<td>' + D.esc(iface.ipAddress || '') + '</td>' +
                '<td class="mono" style="font-size: 0.7rem;">' + D.esc(iface.macAddress || '') + '</td>' +
                '<td>' + D.formatIfSpeed(iface.speed) + '</td>' +
                '<td>' + (iface.mtu || '') + '</td>' +
                (hasStats ? '<td class="num">' + D.formatBytes(stats.rxBytes) + '</td>' +
                    '<td class="num">' + D.formatBytes(stats.txBytes) + '</td>' +
                    '<td class="num">' + formatPackets(stats.rxPackets) + '</td>' +
                    '<td class="num">' + formatPackets(stats.txPackets) + '</td>' : '') +
            '</tr>';
        });
        html += '</tbody></table></div>';
        return html;
    }

    function buildRoutingTab(raw) {
        var vrfs = collectVrfs(raw);
        if (vrfs.length === 0) {
            return '<p style="color: var(--layer8d-text-muted); text-align: center; padding: 40px;">No routing data available</p>';
        }
        var html = '';
        vrfs.forEach(function(vrf, i) {
            if (i > 0) html += '<hr style="border: none; border-top: 1px solid var(--layer8d-border); margin: 16px 0;">';
            html += '<div class="detail-section">' +
                '<div class="detail-section-title">VRF: ' + D.esc(vrf.vrfName) + '</div>' +
                row('Status', VRF_STATUS[vrf.status] || '') +
                (vrf.routeDistinguisher ? row('Route Distinguisher', vrf.routeDistinguisher) : '') +
            '</div>';
            if (vrf.bgpInfo && vrf.bgpInfo.bgpEnabled) {
                html += buildBgpSection(vrf.bgpInfo);
            }
            if (vrf.ospfInfo && vrf.ospfInfo.ospfEnabled) {
                html += buildOspfSection(vrf.ospfInfo);
            }
        });
        return html;
    }

    function buildBgpSection(bgp) {
        var html = '<div class="detail-section">' +
            '<div class="detail-section-title">BGP &mdash; AS ' + (bgp.asNumber || '') + '</div>';
        if (!bgp.peers || bgp.peers.length === 0) {
            return html + '<p style="color: var(--layer8d-text-muted); padding: 8px;">No BGP peers</p></div>';
        }
        html += '<div style="overflow-x: auto; -webkit-overflow-scrolling: touch;">' +
            '<table class="net-detail-table">' +
            '<thead><tr><th>Peer IP</th><th>AS</th><th>Type</th><th>State</th><th>Routes</th></tr></thead><tbody>';
        bgp.peers.forEach(function(peer) {
            var stateText = BGP_PEER_STATE[peer.state] || String(peer.state);
            var stClass = peer.state === 6 ? 'status-up' : 'status-down';
            html += '<tr>' +
                '<td class="mono">' + D.esc(peer.peerIp) + '</td>' +
                '<td>' + (peer.peerAs || '') + '</td>' +
                '<td>' + (BGP_PEER_TYPE[peer.peerType] || '') + '</td>' +
                '<td><span class="' + stClass + '">' + stateText + '</span></td>' +
                '<td class="num">' + (peer.routesReceived || 0) + '</td>' +
            '</tr>';
        });
        html += '</tbody></table></div></div>';
        return html;
    }

    function buildOspfSection(ospf) {
        var html = '<div class="detail-section">' +
            '<div class="detail-section-title">OSPF &mdash; Router ' + D.esc(ospf.routerId) + '</div>' +
            row('Area ID', ospf.areaId) +
            row('Cost', ospf.cost) +
            row('Priority', ospf.priority) +
            row('Retransmit Interval', (ospf.retransmitInterval || '') + 's');
        if (!ospf.neighbors || ospf.neighbors.length === 0) {
            return html + '<p style="color: var(--layer8d-text-muted); padding: 8px;">No OSPF neighbors</p></div>';
        }
        html += '<div style="overflow-x: auto; -webkit-overflow-scrolling: touch; margin-top: 8px;">' +
            '<table class="net-detail-table">' +
            '<thead><tr><th>Neighbor ID</th><th>Neighbor IP</th><th>State</th></tr></thead><tbody>';
        ospf.neighbors.forEach(function(nbr) {
            var stateText = OSPF_NEIGHBOR_STATE[nbr.state] || String(nbr.state);
            var stClass = nbr.state === 8 ? 'status-up' : 'status-down';
            html += '<tr>' +
                '<td class="mono">' + D.esc(nbr.neighborId) + '</td>' +
                '<td class="mono">' + D.esc(nbr.neighborIp) + '</td>' +
                '<td><span class="' + stClass + '">' + stateText + '</span></td>' +
            '</tr>';
        });
        html += '</tbody></table></div></div>';
        return html;
    }

    function collectComponentTemperatures(obj, prefix) {
        var results = [];
        if (!obj || typeof obj !== 'object') return results;
        var keys = Object.keys(obj);
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var val = obj[key];
            if (!val || typeof val !== 'object') continue;
            var label = prefix ? prefix + ' > ' + key : key;
            if (val.temperature && Array.isArray(val.temperature) && val.temperature.length > 0) {
                results.push({ name: label, data: val.temperature });
            }
            var nested = collectComponentTemperatures(val, label);
            for (var j = 0; j < nested.length; j++) results.push(nested[j]);
        }
        return results;
    }

    function formatTimestamp(stamp) {
        var d = new Date(stamp * 1000);
        return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
    }

    function renderTimeSeriesChart(containerId, series, title, valueTransform) {
        var container = document.getElementById(containerId);
        if (!container || !series || series.length === 0) return;
        var chartData = [];
        for (var i = 0; i < series.length; i++) {
            var pt = series[i];
            chartData.push({
                label: formatTimestamp(pt.stamp),
                value: valueTransform ? valueTransform(pt.value) : pt.value
            });
        }
        container.style.height = '200px';
        if (typeof Layer8DChart !== 'undefined') {
            new Layer8DChart(containerId, chartData, {
                chartType: 'line',
                categoryField: 'label',
                valueField: 'value',
                title: title,
                aggregation: 'avg'
            });
        }
    }

    function buildPerformanceTab(raw, device) {
        var perf = findPerformanceData(raw);
        if (!perf) {
            return '<p style="color: var(--layer8d-text-muted); text-align: center; padding: 40px;">No performance data available</p>';
        }
        var cpu = perf.cpuUsagePercent;
        var mem = perf.memoryUsagePercent;
        var temp = perf.temperatureCelsius;
        var cpuVal = (cpu && cpu.length > 0) ? cpu[cpu.length - 1].value : null;
        var memVal = (mem && mem.length > 0) ? mem[mem.length - 1].value : null;
        var tempVal = (temp && temp.length > 0) ? temp[temp.length - 1].value : null;
        var isAbsMem = memVal !== null && memVal > 100;

        var html = '<div class="detail-section">' +
            '<div class="detail-section-title">Current Metrics</div>';
        if (cpuVal !== null) html += D.perfBar('CPU', cpuVal, '%');
        if (memVal !== null && !isAbsMem) html += D.perfBar('Memory', memVal, '%');
        if (memVal !== null && isAbsMem) html += row('Memory Usage', D.formatMemKB(memVal));
        if (tempVal) html += row('Temperature', tempVal + ' \u00B0C');
        html += '</div>';
        html += '<div class="detail-section">' +
            '<div class="detail-section-title">Summary</div>' +
            row('Uptime', device.uptime);
        if (perf.loadAverage) html += row('Load Average', perf.loadAverage);
        if (perf.activeConnections) html += row('Active Connections', Number(perf.activeConnections).toLocaleString());
        if (perf.runningProcesses) html += row('Running Processes', Number(perf.runningProcesses).toLocaleString());
        html += '</div>';
        // Chart containers (rendered after popup is shown)
        if (cpu && cpu.length > 0) {
            html += '<div class="detail-section"><div class="detail-section-title">CPU Usage</div>' +
                '<div id="perf-chart-cpu"></div></div>';
        }
        if (mem && mem.length > 0) {
            var memTitle = isAbsMem ? 'Memory Usage (MB)' : 'Memory Usage %';
            html += '<div class="detail-section"><div class="detail-section-title">' + memTitle + '</div>' +
                '<div id="perf-chart-memory"></div></div>';
        }
        return html;
    }

    function initPerformanceCharts(raw) {
        var perf = findPerformanceData(raw);
        if (!perf) return;
        if (perf.cpuUsagePercent && perf.cpuUsagePercent.length > 0) {
            renderTimeSeriesChart('perf-chart-cpu', perf.cpuUsagePercent, 'CPU Usage %');
        }
        if (perf.memoryUsagePercent && perf.memoryUsagePercent.length > 0) {
            var maxMem = 0;
            for (var i = 0; i < perf.memoryUsagePercent.length; i++) {
                if (perf.memoryUsagePercent[i].value > maxMem) maxMem = perf.memoryUsagePercent[i].value;
            }
            if (maxMem > 100) {
                renderTimeSeriesChart('perf-chart-memory', perf.memoryUsagePercent, 'Memory Usage (MB)', function(v) { return (v / 1024).toFixed(1); });
            } else {
                renderTimeSeriesChart('perf-chart-memory', perf.memoryUsagePercent, 'Memory Usage %');
            }
        }
        // Temperature charts per component
        var temps = collectComponentTemperatures(raw.physicals, '');
        for (var t = 0; t < temps.length; t++) {
            var cId = 'perf-chart-temp-' + t;
            var el = document.getElementById(cId);
            if (el) renderTimeSeriesChart(cId, temps[t].data, temps[t].name + ' Temperature (\u00B0C)');
        }
    }

    function buildPhysicalTab(raw) {
        if (!raw.physicals || Object.keys(raw.physicals).length === 0) {
            return '<p style="color: var(--layer8d-text-muted); text-align: center; padding: 40px;">No physical inventory data available</p>';
        }
        return '<div id="physical-inventory-tree"></div>';
    }

    function initPhysicalTree(raw) {
        if (!raw.physicals || typeof ProblerTree === 'undefined') return;
        // Deep clone and strip performance/temperature to avoid clutter
        var data = JSON.parse(JSON.stringify(raw.physicals));
        stripPerfFields(data);
        new ProblerTree('physical-inventory-tree', {
            data: data,
            expandAll: true,
            maxHeight: '500px'
        });
    }

    function stripPerfFields(obj) {
        if (!obj || typeof obj !== 'object') return;
        if (Array.isArray(obj)) {
            for (var i = 0; i < obj.length; i++) stripPerfFields(obj[i]);
            return;
        }
        delete obj.performance;
        delete obj.temperature;
        var keys = Object.keys(obj);
        for (var k = 0; k < keys.length; k++) stripPerfFields(obj[keys[k]]);
    }

    window.showNetworkDeviceDetail = function(device) {
        var raw = device.raw;
        var info = raw.equipmentinfo || {};
        device.interfaces = info.interfaceCount || 0;
        device.sysName = info.sysName || '';
        device.lastSeen = new Date().toISOString();
        device.latitude = info.latitude;
        device.longitude = info.longitude;

        // Resolve enum integers to display strings
        var STATUS_LABELS = { 0: 'unknown', 1: 'online', 2: 'offline', 3: 'warning', 4: 'critical', 5: 'maintenance', 6: 'partial' };
        var STATUS_CLASSES = { 'online': 'status-active', 'offline': 'status-inactive', 'warning': 'status-pending', 'critical': 'status-terminated', 'maintenance': 'status-inactive', 'partial': 'status-pending', 'unknown': 'status-offline' };
        var TYPE_LABELS = { 0: 'Unknown', 1: 'Router', 2: 'Switch', 3: 'Firewall', 4: 'Server', 5: 'Access Point', 6: 'Server' };
        var TYPE_ICONS = { 0: '', 1: '\uD83C\uDF10', 2: '\uD83D\uDD00', 3: '\uD83D\uDEE1\uFE0F', 4: '\uD83D\uDDA5\uFE0F', 5: '\uD83D\uDCF6', 6: '\uD83D\uDDA5\uFE0F' };
        var statusLabel = STATUS_LABELS[device.status] || 'unknown';
        var statusClass = STATUS_CLASSES[statusLabel] || 'status-offline';
        device.status = statusLabel;
        device.ip = device.ipAddress || '';
        var typeVal = device.deviceType || 0;
        device.type = { name: TYPE_LABELS[typeVal] || 'Unknown', icon: TYPE_ICONS[typeVal] || '' };

        var tabs = [
            { id: 'overview', label: 'Overview', content: buildOverviewTab(device, statusClass) },
            { id: 'equipment', label: 'Equipment', content: buildEquipmentTab(device) }
        ];

        if (collectInterfaces(raw).length > 0) {
            tabs.push({ id: 'interfaces', label: 'Interfaces', content: buildInterfacesTab(raw) });
        }
        if (collectVrfs(raw).length > 0) {
            tabs.push({ id: 'routing', label: 'Routing', content: buildRoutingTab(raw) });
        }

        var hasPhysicals = raw.physicals && Object.keys(raw.physicals).length > 0;
        if (hasPhysicals) {
            tabs.push({ id: 'physical', label: 'Physical', content: buildPhysicalTab(raw) });
        }

        var hasPerf = !!findPerformanceData(raw);
        if (hasPerf) {
            // Build performance tab content including temperature chart placeholders
            var perfContent = buildPerformanceTab(raw, device);
            var temps = collectComponentTemperatures(raw.physicals, '');
            for (var t = 0; t < temps.length; t++) {
                perfContent += '<div class="detail-section"><div class="detail-section-title">' +
                    D.esc(temps[t].name) + ' Temperature</div>' +
                    '<div id="perf-chart-temp-' + t + '"></div></div>';
            }
            tabs.push({ id: 'performance', label: 'Performance', content: perfContent });
        }

        var needsDeferred = hasPhysicals || hasPerf;
        D.showTabbedPopup(device.name, tabs, needsDeferred ? function() {
            if (hasPhysicals) initPhysicalTree(raw);
            if (hasPerf) initPerformanceCharts(raw);
        } : null);
    };

})();
