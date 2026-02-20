// Dashboard Direct Integration - Initialization
// Extracted from iframe dashboard.js for direct app.html integration

let alarmsTable = null;

function getAuthHeaders() {
    const bearerToken = localStorage.getItem('bearerToken') || null;
    const headers = { 'Content-Type': 'application/json' };
    if (bearerToken) {
        headers['Authorization'] = 'Bearer ' + bearerToken;
    }
    return headers;
}

async function fetchNetworkDeviceStats() {
    try {
        const endpoint = Layer8DConfig.resolveEndpoint('/0/NCache');
        const url = endpoint +
            '?body=' + encodeURIComponent(JSON.stringify({
                text: 'select * from NetworkDevice where Id=* limit 1 page 0'
            }));

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

    const cardValue = document.querySelector('.dashboard-section .metric-card .metric-card-value');
    const cardDetails = document.querySelector('.dashboard-section .metric-card .metric-card-details');

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

async function initializeDashboard() {
    await updateNetworkDevicesCard();
    initializeAlarmsTable();
}
