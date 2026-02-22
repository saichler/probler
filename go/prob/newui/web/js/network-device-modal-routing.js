// Network Device Detail Modal - Routing Tab (VRF, BGP, OSPF)

var BGP_PEER_STATE = {
    0: 'Unknown', 1: 'Idle', 2: 'Connect', 3: 'Active',
    4: 'OpenSent', 5: 'OpenConfirm', 6: 'Established'
};

var BGP_PEER_STATE_CLASS = {
    6: 'status-online', 1: 'status-offline', 0: 'status-offline'
};

var BGP_PEER_TYPE = { 0: '', 1: 'iBGP', 2: 'eBGP' };

var OSPF_NEIGHBOR_STATE = {
    0: 'Unknown', 1: 'Down', 2: 'Attempt', 3: 'Init', 4: '2-Way',
    5: 'ExStart', 6: 'Exchange', 7: 'Loading', 8: 'Full'
};

var OSPF_NEIGHBOR_STATE_CLASS = {
    8: 'status-online', 1: 'status-offline', 0: 'status-offline'
};

var VRF_STATUS = { 0: 'Unknown', 1: 'Active', 2: 'Inactive', 3: 'Admin Down' };

// Collect all non-empty VRFs from all logical instances
function collectVrfs(device) {
    var vrfs = [];
    if (!device.logicals) return vrfs;
    Object.keys(device.logicals).forEach(function(key) {
        var logical = device.logicals[key];
        if (logical && logical.vrfs) {
            logical.vrfs.forEach(function(vrf) {
                if (vrf && vrf.vrfName) vrfs.push(vrf);
            });
        }
    });
    return vrfs;
}

// Check if device has any routing data
function hasRoutingData(device) {
    return collectVrfs(device).length > 0;
}

// Build BGP peers table for a VRF
function buildBgpSection(bgp, esc) {
    if (!bgp || !bgp.bgpEnabled) return '';
    var html = '<div class="detail-section detail-full-width" style="margin-top: 12px;">' +
        '<div class="detail-section-title">BGP &mdash; AS ' + (bgp.asNumber || '') + '</div>';
    if (!bgp.peers || bgp.peers.length === 0) {
        html += '<p style="color: var(--layer8d-text-muted); padding: 8px;">No BGP peers</p>';
        return html + '</div>';
    }
    html += '<div style="overflow-x: auto;">' +
        '<table class="layer8d-tree-grid-table" style="width: 100%; font-size: 12px;">' +
        '<thead><tr>' +
            '<th>Peer ID</th><th>Peer IP</th><th>Peer AS</th>' +
            '<th>Type</th><th>State</th><th>Routes Received</th>' +
        '</tr></thead><tbody>';
    bgp.peers.forEach(function(peer) {
        var stateText = BGP_PEER_STATE[peer.state] || String(peer.state);
        var stateClass = BGP_PEER_STATE_CLASS[peer.state] || '';
        html += '<tr>' +
            '<td style="font-family: monospace;">' + esc(peer.peerId || '') + '</td>' +
            '<td style="font-family: monospace;">' + esc(peer.peerIp || '') + '</td>' +
            '<td>' + (peer.peerAs || '') + '</td>' +
            '<td>' + (BGP_PEER_TYPE[peer.peerType] || '') + '</td>' +
            '<td><span class="' + stateClass + '">' + stateText + '</span></td>' +
            '<td style="text-align: right;">' + (peer.routesReceived || 0) + '</td>' +
        '</tr>';
    });
    html += '</tbody></table></div></div>';
    return html;
}

// Build OSPF neighbors table for a VRF
function buildOspfSection(ospf, esc) {
    if (!ospf || !ospf.ospfEnabled) return '';
    var html = '<div class="detail-section detail-full-width" style="margin-top: 12px;">' +
        '<div class="detail-section-title">OSPF &mdash; Router ID ' + esc(ospf.routerId || '') + '</div>' +
        '<div class="detail-grid">' +
            '<div class="detail-section">' +
                '<div class="detail-row">' +
                    '<span class="detail-label">Area ID</span>' +
                    '<span class="detail-value">' + esc(ospf.areaId || '') + '</span>' +
                '</div>' +
                '<div class="detail-row">' +
                    '<span class="detail-label">Cost</span>' +
                    '<span class="detail-value">' + (ospf.cost || '') + '</span>' +
                '</div>' +
            '</div>' +
            '<div class="detail-section">' +
                '<div class="detail-row">' +
                    '<span class="detail-label">Priority</span>' +
                    '<span class="detail-value">' + (ospf.priority || '') + '</span>' +
                '</div>' +
                '<div class="detail-row">' +
                    '<span class="detail-label">Retransmit Interval</span>' +
                    '<span class="detail-value">' + (ospf.retransmitInterval || '') + 's</span>' +
                '</div>' +
            '</div>' +
        '</div>';
    if (!ospf.neighbors || ospf.neighbors.length === 0) {
        html += '<p style="color: var(--layer8d-text-muted); padding: 8px;">No OSPF neighbors</p>';
        return html + '</div>';
    }
    html += '<div style="overflow-x: auto; margin-top: 8px;">' +
        '<table class="layer8d-tree-grid-table" style="width: 100%; font-size: 12px;">' +
        '<thead><tr>' +
            '<th>Neighbor ID</th><th>Neighbor IP</th><th>State</th>' +
        '</tr></thead><tbody>';
    ospf.neighbors.forEach(function(nbr) {
        var stateText = OSPF_NEIGHBOR_STATE[nbr.state] || String(nbr.state);
        var stateClass = OSPF_NEIGHBOR_STATE_CLASS[nbr.state] || '';
        html += '<tr>' +
            '<td style="font-family: monospace;">' + esc(nbr.neighborId || '') + '</td>' +
            '<td style="font-family: monospace;">' + esc(nbr.neighborIp || '') + '</td>' +
            '<td><span class="' + stateClass + '">' + stateText + '</span></td>' +
        '</tr>';
    });
    html += '</tbody></table></div></div>';
    return html;
}

// Build the full Routing tab content
function buildRoutingTab(device, esc) {
    var vrfs = collectVrfs(device);
    if (vrfs.length === 0) {
        return '<div class="probler-popup-tab-pane" data-pane="routing">' +
            '<p style="color: var(--layer8d-text-muted); text-align: center; padding: 40px;">' +
            'No routing data available</p></div>';
    }
    var html = '<div class="probler-popup-tab-pane" data-pane="routing">';
    vrfs.forEach(function(vrf, i) {
        if (i > 0) html += '<hr style="border: none; border-top: 1px solid var(--layer8d-border); margin: 16px 0;">';
        var statusText = VRF_STATUS[vrf.status] || '';
        var statusClass = vrf.status === 1 ? 'status-online' : vrf.status === 2 ? 'status-offline' : '';
        html += '<div class="detail-grid">' +
            '<div class="detail-section">' +
                '<div class="detail-section-title">VRF: ' + esc(vrf.vrfName || '') + '</div>' +
                '<div class="detail-row">' +
                    '<span class="detail-label">Status</span>' +
                    '<span class="detail-value ' + statusClass + '">' + statusText + '</span>' +
                '</div>' +
                (vrf.routeDistinguisher ? '<div class="detail-row">' +
                    '<span class="detail-label">Route Distinguisher</span>' +
                    '<span class="detail-value">' + esc(vrf.routeDistinguisher) + '</span>' +
                '</div>' : '') +
            '</div>' +
        '</div>';
        html += buildBgpSection(vrf.bgpInfo, esc);
        html += buildOspfSection(vrf.ospfInfo, esc);
    });
    html += '</div>';
    return html;
}
