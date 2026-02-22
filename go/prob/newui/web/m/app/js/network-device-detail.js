// Network Device Detail Popup - Mobile
// Provides showNetworkDeviceDetail() called by network.html

(function() {
    'use strict';

    // --- Enum Maps ---

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

    // --- Helpers ---

    function esc(text) {
        if (text == null || text === '' || text === '--') return '--';
        var div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    function formatMfgDate(hex) {
        if (!hex || hex.length < 8) return hex || '--';
        var year = parseInt(hex.substring(0, 4), 16);
        var month = parseInt(hex.substring(4, 6), 16);
        var day = parseInt(hex.substring(6, 8), 16);
        if (isNaN(year) || isNaN(month) || isNaN(day)) return hex;
        return year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
    }

    function formatIfSpeed(bps) {
        if (!bps || bps === 0) return '--';
        var n = Number(bps);
        if (n >= 1000000000) return (n / 1000000000) + ' Gbps';
        if (n >= 1000000) return (n / 1000000) + ' Mbps';
        if (n >= 1000) return (n / 1000) + ' Kbps';
        return n + ' bps';
    }

    function formatBytes(bytes) {
        if (!bytes) return '';
        var n = Number(bytes);
        if (isNaN(n) || n === 0) return '0';
        if (n >= 1073741824) return (n / 1073741824).toFixed(2) + ' GB';
        if (n >= 1048576) return (n / 1048576).toFixed(1) + ' MB';
        if (n >= 1024) return (n / 1024).toFixed(0) + ' KB';
        return n + ' B';
    }

    function formatUptime(centiseconds) {
        if (!centiseconds) return '--';
        var s = Math.floor(parseInt(centiseconds) / 100);
        var d = Math.floor(s / 86400);
        var h = Math.floor((s % 86400) / 3600);
        var m = Math.floor((s % 3600) / 60);
        if (d > 0) return d + 'd ' + h + 'h';
        if (h > 0) return h + 'h ' + m + 'm';
        return m + 'm';
    }

    // --- Data Collection ---

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

    // --- Tab Builders ---

    function buildOverviewTab(device, statusClass) {
        return '<div class="detail-section">' +
            '<div style="text-align: center; padding: 12px;">' +
                '<span class="mobile-table-status ' + statusClass + '" style="font-size: 0.9rem; padding: 8px 16px;">' +
                '<span class="mobile-table-status-indicator"></span>' +
                device.status.toUpperCase() + '</span>' +
            '</div></div>' +
            '<div class="detail-section">' +
                '<div class="detail-section-title">Device Information</div>' +
                row('Device Name', device.name) +
                row('IP Address', device.ip) +
                row('Device Type', device.type.icon + ' ' + device.type.name) +
                row('Location', device.location) +
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
        '</div>' +
        '<div class="detail-section">' +
            '<div class="detail-section-title">Software</div>' +
            row('Software', info.software, true) +
            row('Hardware', info.hardware, true) +
            row('Version', info.version) +
            row('Firmware', info.firmwareVersion || info.version) +
            row('System OID', info.sysOid, true) +
        '</div>';
        // Asset / Entity MIB info
        if (info.manufacturerName || info.manufacturingDate || info.assetId ||
            info.physicalAlias || info.vendorTypeOid || info.identificationUris || info.isFru) {
            html += '<div class="detail-section">' +
                '<div class="detail-section-title">Asset Information</div>' +
                row('Manufacturer', info.manufacturerName) +
                row('Mfg Date', formatMfgDate(info.manufacturingDate)) +
                row('Asset ID', info.assetId) +
                row('Physical Alias', info.physicalAlias) +
                row('Vendor Type OID', info.vendorTypeOid, true) +
                row('Field Replaceable', info.isFru ? 'Yes' : 'No') +
                row('Identification URIs', info.identificationUris, true) +
            '</div>';
        }
        return html;
    }

    function buildInterfacesTab(raw) {
        var interfaces = collectInterfaces(raw);
        if (interfaces.length === 0) {
            return '<p style="color: var(--text-muted); text-align: center; padding: 40px;">No interface data available</p>';
        }
        var hasStats = interfaces.some(function(i) { return i.statistics; });
        var html = '<div style="overflow-x: auto; -webkit-overflow-scrolling: touch;">' +
            '<table class="net-detail-table">' +
            '<thead><tr><th>Name</th><th>Status</th><th>Speed</th><th>MTU</th>' +
            (hasStats ? '<th>RX</th><th>TX</th>' : '') +
            '</tr></thead><tbody>';
        interfaces.forEach(function(iface) {
            var st = iface.adminStatus ? 'Up' : 'Down';
            var stClass = iface.adminStatus ? 'status-up' : 'status-down';
            var stats = iface.statistics || {};
            html += '<tr>' +
                '<td class="iface-name">' + esc(iface.name || iface.id || '') + '</td>' +
                '<td><span class="' + stClass + '">' + st + '</span></td>' +
                '<td>' + formatIfSpeed(iface.speed) + '</td>' +
                '<td>' + (iface.mtu || '') + '</td>' +
                (hasStats ? '<td class="num">' + formatBytes(stats.rxBytes) + '</td>' +
                    '<td class="num">' + formatBytes(stats.txBytes) + '</td>' : '') +
            '</tr>';
        });
        html += '</tbody></table></div>';
        return html;
    }

    function buildRoutingTab(raw) {
        var vrfs = collectVrfs(raw);
        if (vrfs.length === 0) {
            return '<p style="color: var(--text-muted); text-align: center; padding: 40px;">No routing data available</p>';
        }
        var html = '';
        vrfs.forEach(function(vrf, i) {
            if (i > 0) html += '<hr style="border: none; border-top: 1px solid var(--border-light); margin: 16px 0;">';
            var statusText = VRF_STATUS[vrf.status] || '';
            html += '<div class="detail-section">' +
                '<div class="detail-section-title">VRF: ' + esc(vrf.vrfName) + '</div>' +
                row('Status', statusText) +
                (vrf.routeDistinguisher ? row('Route Distinguisher', vrf.routeDistinguisher) : '') +
            '</div>';
            // BGP
            if (vrf.bgpInfo && vrf.bgpInfo.bgpEnabled) {
                html += buildBgpSection(vrf.bgpInfo);
            }
            // OSPF
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
            return html + '<p style="color: var(--text-muted); padding: 8px;">No BGP peers</p></div>';
        }
        html += '<div style="overflow-x: auto; -webkit-overflow-scrolling: touch;">' +
            '<table class="net-detail-table">' +
            '<thead><tr><th>Peer IP</th><th>AS</th><th>Type</th><th>State</th><th>Routes</th></tr></thead><tbody>';
        bgp.peers.forEach(function(peer) {
            var stateText = BGP_PEER_STATE[peer.state] || String(peer.state);
            var stClass = peer.state === 6 ? 'status-up' : 'status-down';
            html += '<tr>' +
                '<td class="mono">' + esc(peer.peerIp) + '</td>' +
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
            '<div class="detail-section-title">OSPF &mdash; Router ' + esc(ospf.routerId) + '</div>' +
            row('Area ID', ospf.areaId) +
            row('Cost', ospf.cost) +
            row('Priority', ospf.priority) +
            row('Retransmit Interval', (ospf.retransmitInterval || '') + 's');
        if (!ospf.neighbors || ospf.neighbors.length === 0) {
            return html + '<p style="color: var(--text-muted); padding: 8px;">No OSPF neighbors</p></div>';
        }
        html += '<div style="overflow-x: auto; -webkit-overflow-scrolling: touch; margin-top: 8px;">' +
            '<table class="net-detail-table">' +
            '<thead><tr><th>Neighbor ID</th><th>Neighbor IP</th><th>State</th></tr></thead><tbody>';
        ospf.neighbors.forEach(function(nbr) {
            var stateText = OSPF_NEIGHBOR_STATE[nbr.state] || String(nbr.state);
            var stClass = nbr.state === 8 ? 'status-up' : 'status-down';
            html += '<tr>' +
                '<td class="mono">' + esc(nbr.neighborId) + '</td>' +
                '<td class="mono">' + esc(nbr.neighborIp) + '</td>' +
                '<td><span class="' + stClass + '">' + stateText + '</span></td>' +
            '</tr>';
        });
        html += '</tbody></table></div></div>';
        return html;
    }

    function buildPerformanceTab(raw, device) {
        var perf = findPerformanceData(raw);
        if (!perf) {
            return '<p style="color: var(--text-muted); text-align: center; padding: 40px;">No performance data available</p>';
        }
        var cpu = perf.cpuUsagePercent;
        var mem = perf.memoryUsagePercent;
        var temp = perf.temperatureCelsius;
        var cpuVal = (cpu && cpu.length > 0) ? cpu[cpu.length - 1].value : null;
        var memVal = (mem && mem.length > 0) ? mem[mem.length - 1].value : null;
        var tempVal = (temp && temp.length > 0) ? temp[temp.length - 1].value : null;
        var isAbsMem = memVal !== null && memVal > 100;
        var memDisplay = memVal !== null ? (isAbsMem ? formatMemKB(memVal) : memVal + '%') : '--';
        var processCount = (perf.processes && perf.processes.length > 0) ? perf.processes[0].status : '';

        var html = '<div class="detail-section">' +
            '<div class="detail-section-title">Current Metrics</div>';
        if (cpuVal !== null) html += perfBar('CPU', cpuVal, '%');
        if (memVal !== null && !isAbsMem) html += perfBar('Memory', memVal, '%');
        if (memVal !== null && isAbsMem) html += row('Memory Usage', memDisplay);
        if (tempVal) html += row('Temperature', tempVal + ' \u00B0C');
        html += row('Uptime', device.uptime);
        if (perf.activeConnections) html += row('Active Connections', Number(perf.activeConnections).toLocaleString());
        if (processCount) html += row('Running Processes', Number(processCount).toLocaleString());
        html += '</div>';
        return html;
    }

    // --- Shared Rendering Helpers ---

    function row(label, value, small) {
        var v = (value == null || value === '' || value === '--') ? '--' : esc(String(value));
        var style = small ? ' style="font-size: 0.75rem;"' : '';
        return '<div class="detail-row">' +
            '<span class="detail-label">' + label + '</span>' +
            '<span class="detail-value"' + style + '>' + v + '</span></div>';
    }

    function perfBar(label, pct, unit) {
        var color = pct > 80 ? 'var(--status-critical, #e53e3e)' :
                    pct > 60 ? 'var(--status-warning, #dd6b20)' :
                               'var(--status-online, #38a169)';
        return '<div style="margin-bottom: 12px;">' +
            '<div style="display: flex; justify-content: space-between; margin-bottom: 4px;">' +
                '<span class="detail-label">' + label + '</span>' +
                '<span class="detail-value">' + pct + (unit || '') + '</span>' +
            '</div>' +
            '<div style="height: 8px; background: var(--border-light, #e2e8f0); border-radius: 4px; overflow: hidden;">' +
                '<div style="height: 100%; width: ' + Math.min(pct, 100) + '%; background: ' + color + '; border-radius: 4px;"></div>' +
            '</div></div>';
    }

    function formatMemKB(kb) {
        if (kb < 1024) return kb + ' KB';
        if (kb < 1048576) return (kb / 1024).toFixed(1) + ' MB';
        return (kb / 1048576).toFixed(2) + ' GB';
    }

    // --- Main Entry Point ---

    window.showNetworkDeviceDetail = function(device, statusClass) {
        var raw = device.raw;
        var info = raw.equipmentinfo || {};
        // Augment device with fields needed by tabs
        device.interfaces = info.interfaceCount || 0;

        var tabs = [
            { id: 'overview', label: 'Overview', content: buildOverviewTab(device, statusClass) },
            { id: 'equipment', label: 'Equipment', content: buildEquipmentTab(device) }
        ];

        var interfaces = collectInterfaces(raw);
        if (interfaces.length > 0) {
            tabs.push({ id: 'interfaces', label: 'Interfaces', content: buildInterfacesTab(raw) });
        }

        var vrfs = collectVrfs(raw);
        if (vrfs.length > 0) {
            tabs.push({ id: 'routing', label: 'Routing', content: buildRoutingTab(raw) });
        }

        var perf = findPerformanceData(raw);
        if (perf) {
            tabs.push({ id: 'performance', label: 'Performance', content: buildPerformanceTab(raw, device) });
        }

        MobilePopup.show({
            title: device.name,
            size: 'large',
            showFooter: false,
            tabs: tabs
        });
    };

})();
