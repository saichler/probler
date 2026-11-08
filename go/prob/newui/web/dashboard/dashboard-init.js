// Dashboard Direct Integration - Initialization
// Extracted from iframe dashboard.js for direct app.html integration

let alarmsTable = null;

// Live slot: all of the dashboard's KPI queries share one slot ('dashboard').
// The owner is stable for the page's life: a NEW owner per entry would make
// layer8d-websocket.js treat re-entry as a takeover and send an UNREGISTER for
// the previous KPI queries on the other endpoints -- racing the re-registration
// that follows immediately. Re-entry instead drops the previous entry's
// listeners itself (listen() returns their unsubscribe functions).
var DashboardLive = { id: 'dashboard', owner: {}, unlisten: [] };

function dashboardQueryUrl(path, text) {
    const endpoint = Layer8DConfig.resolveEndpoint(path);
    const body = Layer8DWebSocket.registerQuery(DashboardLive.id, DashboardLive.owner, endpoint, text,
        { onReconnect: refreshDashboardCards });
    return endpoint + '?body=' + encodeURIComponent(JSON.stringify(body));
}

function refreshDashboardCards() {
    return Promise.all([updateNetworkDevicesCard(), updateK8sCard(), updateGpuCard()]);
}

function getAuthHeaders() {
    const bearerToken = sessionStorage.getItem('bearerToken');
    const headers = { 'Content-Type': 'application/json' };
    if (bearerToken) {
        headers['Authorization'] = 'Bearer ' + bearerToken;
    }
    return headers;
}

async function fetchNetworkDeviceStats() {
    try {
        const url = dashboardQueryUrl('/0/NCache', 'select * from NetworkDevice where Id=* limit 1 page 0');

        const response = await fetch(url, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (!response || !response.ok) {
            return null;
        }

        const data = await response.json();
        return data.metadata?.keyCount?.counts || null;
    } catch (error) {
        console.error('Error fetching network device stats:', error);
        return null;
    }
}

async function updateNetworkDevicesCard() {
    const stats = await fetchNetworkDeviceStats();

    var card = document.getElementById('dashboard-card-network');
    if (!card) return;
    const cardValue = card.querySelector('.metric-card-value');
    const cardDetails = card.querySelector('.metric-card-details');

    if (stats) {
        const totalDevices = stats.Total || 0;
        const onlineDevices = stats.Online || 0;
        const offlineDevices = totalDevices - onlineDevices;

        if (cardValue) {
            cardValue.textContent = totalDevices.toLocaleString();
        }

        if (cardDetails) {
            cardDetails.innerHTML =
                '<span class="metric-status">' +
                    '<span class="status-indicator status-operational"></span>' +
                    '<span>' + onlineDevices.toLocaleString() + ' Online</span>' +
                '</span>' +
                '<span class="metric-status">' +
                    '<span class="status-indicator status-offline"></span>' +
                    '<span>' + offlineDevices.toLocaleString() + ' Offline</span>' +
                '</span>';
        }
    } else {
        if (cardValue) {
            cardValue.textContent = '--';
        }
        if (cardDetails) {
            cardDetails.innerHTML = '<span class="metric-status unavailable">Data unavailable</span>';
        }
    }
}

function initializeAlarmsTable() {
    const alarmsData = [];

    alarmsTable = new Layer8DTable({
        containerId: 'alarms-table',
        columns: [
            { key: 'timestamp', label: 'Timestamp' },
            { key: 'severity', label: 'Severity' },
            { key: 'device', label: 'Device' },
            { key: 'type', label: 'Type' },
            { key: 'message', label: 'Message' },
            { key: 'location', label: 'Location' }
        ],
        data: alarmsData,
        pageSize: 15,
        sortable: true,
        filterable: true,
        statusColumn: 'severity'
    });
    alarmsTable.init();
}

async function fetchK8sStats() {
    try {
        const url = dashboardQueryUrl('/10/KCluster', 'select * from K8SCluster');

        const response = await fetch(url, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (!response || !response.ok) {
            return null;
        }

        const data = await response.json();
        var clusters = data.list || [];
        var totalNodes = 0;
        var totalPods = 0;
        // The K8SCluster proto carries counts in its `summary` sub-object
        // (totalNodes / totalPods on K8SClusterSummary). Earlier dashboard
        // code looked for `c.nodes` / `c.pods` as nested maps, which the
        // current proto doesn't have — the always-zero result was the
        // symptom. Read the correct fields and fall back to 0 when a
        // cluster has no summary attached yet.
        clusters.forEach(function(c) {
            var s = c && c.summary;
            if (!s) return;
            totalNodes += (typeof s.totalNodes === 'number' ? s.totalNodes : Number(s.totalNodes) || 0);
            totalPods  += (typeof s.totalPods  === 'number' ? s.totalPods  : Number(s.totalPods)  || 0);
        });
        return { clusters: clusters.length, nodes: totalNodes, pods: totalPods };
    } catch (error) {
        console.error('Error fetching K8s stats:', error);
        return null;
    }
}

async function updateK8sCard() {
    var card = document.getElementById('dashboard-card-k8s');
    if (!card) return;

    var cardValue = card.querySelector('.metric-card-value');
    var cardDetails = card.querySelector('.metric-card-details');

    var stats = await fetchK8sStats();
    if (stats) {
        if (cardValue) {
            cardValue.textContent = stats.clusters;
        }
        if (cardDetails) {
            cardDetails.innerHTML =
                '<span class="metric-status">' +
                    '<span class="status-indicator status-operational"></span>' +
                    '<span>' + stats.nodes + ' Nodes</span>' +
                '</span>' +
                '<span class="metric-status">' +
                    '<span class="status-indicator status-operational"></span>' +
                    '<span>' + stats.pods + ' Pods</span>' +
                '</span>';
        }
    } else {
        if (cardValue) cardValue.textContent = '--';
        if (cardDetails) {
            cardDetails.innerHTML = '<span class="metric-status unavailable">Data unavailable</span>';
        }
    }
}

async function fetchGpuStats() {
    try {
        const url = dashboardQueryUrl('/2/GCache', 'select * from GpuDevice where Id=* limit 1 page 0');

        const response = await fetch(url, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (!response || !response.ok) {
            return null;
        }

        const data = await response.json();
        return data.metadata?.keyCount?.counts || null;
    } catch (error) {
        console.error('Error fetching GPU stats:', error);
        return null;
    }
}

async function updateGpuCard() {
    var card = document.getElementById('dashboard-card-gpus');
    if (!card) return;

    var cardValue = card.querySelector('.metric-card-value');
    var cardDetails = card.querySelector('.metric-card-details');

    var stats = await fetchGpuStats();
    if (stats) {
        var totalDevices = stats.Total || 0;
        var onlineDevices = stats.Online || 0;
        var offlineDevices = totalDevices - onlineDevices;

        if (cardValue) {
            cardValue.textContent = totalDevices.toLocaleString();
        }
        if (cardDetails) {
            cardDetails.innerHTML =
                '<span class="metric-status">' +
                    '<span class="status-indicator status-operational"></span>' +
                    '<span>' + onlineDevices.toLocaleString() + ' Online</span>' +
                '</span>' +
                '<span class="metric-status">' +
                    '<span class="status-indicator status-offline"></span>' +
                    '<span>' + offlineDevices.toLocaleString() + ' Offline</span>' +
                '</span>';
        }
    } else {
        if (cardValue) cardValue.textContent = '--';
        if (cardDetails) {
            cardDetails.innerHTML = '<span class="metric-status unavailable">Data unavailable</span>';
        }
    }
}

function initializeDashboardCardNavigation() {
    document.querySelectorAll('.dashboard-section .metric-card[data-section]').forEach(function(card) {
        card.style.cursor = 'pointer';
        card.addEventListener('click', function() {
            var section = this.getAttribute('data-section');
            if (section && typeof loadSection === 'function') {
                loadSection(section);
            }
        });
    });
}

var _dashboardRefreshTimers = {};
function debouncedCardRefresh(modelType, refreshFn) {
    if (_dashboardRefreshTimers[modelType]) return;
    _dashboardRefreshTimers[modelType] = setTimeout(function() {
        _dashboardRefreshTimers[modelType] = null;
        refreshFn();
    }, 1000);
}

async function initializeDashboard() {
    DashboardLive.unlisten.forEach(function(off) { off(); });
    DashboardLive.unlisten = [];
    initializeDashboardCardNavigation();
    await refreshDashboardCards();
    initializeAlarmsTable();

    const owner = DashboardLive.owner;
    DashboardLive.unlisten.push(
        Layer8DWebSocket.listen(DashboardLive.id, owner, 'NetworkDevice', function() {
            debouncedCardRefresh('NetworkDevice', updateNetworkDevicesCard);
        }),
        Layer8DWebSocket.listen(DashboardLive.id, owner, 'GpuDevice', function() {
            debouncedCardRefresh('GpuDevice', updateGpuCard);
        }),
        Layer8DWebSocket.listen(DashboardLive.id, owner, 'K8SCluster', function() {
            debouncedCardRefresh('K8SCluster', updateK8sCard);
        })
    );
}
