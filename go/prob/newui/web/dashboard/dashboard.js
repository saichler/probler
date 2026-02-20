// Dashboard App - Standalone Module

// Authentication token
let bearerToken = localStorage.getItem('bearerToken') || null;

// Global table instance
let alarmsTable = null;

// Get auth headers
function getAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (bearerToken) {
        headers['Authorization'] = 'Bearer ' + bearerToken;
    }
    return headers;
}

// Fetch network device stats from API
async function fetchNetworkDeviceStats() {
    if (!DASHBOARD_CONFIG) return null;

    try {
        const url = DASHBOARD_CONFIG.apiPrefix + DASHBOARD_CONFIG.cachePath +
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

// Update Network Devices card with actual data
async function updateNetworkDevicesCard() {
    const stats = await fetchNetworkDeviceStats();

    // Get the card elements
    const cardValue = document.querySelector('.metric-card .metric-card-value');
    const cardDetails = document.querySelector('.metric-card .metric-card-details');

    if (stats) {
        const totalDevices = stats.Total || 0;
        const onlineDevices = stats.Online || 0;
        const offlineDevices = totalDevices - onlineDevices;

        // Update the card value (total)
        if (cardValue) {
            cardValue.textContent = totalDevices.toLocaleString();
        }

        // Update the card details (online, offline)
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
        // API call failed - clear mock data and show unavailable state
        if (cardValue) {
            cardValue.textContent = '--';
        }
        if (cardDetails) {
            cardDetails.innerHTML = '<span class="metric-status unavailable">Data unavailable</span>';
        }
    }
}

// Initialize parallax scrolling effect
function initializeParallax() {
    const container = document.querySelector('.container');
    const heroBackground = document.querySelector('.hero-background');
    const heroContent = document.querySelector('.hero-content');

    if (container && heroBackground && heroContent) {
        container.addEventListener('scroll', function() {
            const scrollPosition = this.scrollTop;

            // Parallax effect on hero background (slower scroll)
            const scale = 1 + (scrollPosition * 0.0005);
            heroBackground.style.transform = 'translateY(' + (scrollPosition * 0.5) + 'px) scale(' + scale + ')';

            // Fade out hero content as user scrolls
            const opacity = Math.max(0, 1 - (scrollPosition / 200));
            heroContent.style.opacity = opacity;
        });
    }
}

// Initialize alarms table
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

// Initialize Dashboard
async function initializeDashboard() {
    // Load configuration
    await loadConfig();

    // Update Network Devices card with actual data
    await updateNetworkDevicesCard();

    // Initialize parallax effect
    initializeParallax();

    // Initialize the alarms table
    initializeAlarmsTable();
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeDashboard);
