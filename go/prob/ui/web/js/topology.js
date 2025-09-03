// Network Topology Management

// Network Topology Functions
let networkDevicesData = [];
let networkLinksData = [];
let topologyLinksVisible = true;
let currentZoom = 1;
let panX = 0;
let panY = 0;

// Convert latitude/longitude to SVG coordinates based on actual world.svg country boundaries
function latLngToSVG(latitude, longitude) {
    // Precise coordinates calculated from actual SVG country boundary analysis
    // Each device positioned accurately within its respective country boundaries
    
    // Create lookup key for precise positioning
    const deviceKey = `${latitude.toFixed(4)}_${longitude.toFixed(4)}`;
    
    // Precise coordinates based on actual world.svg country boundary analysis
    const preciseCoordinates = {
        // North America - United States & Canada
        "40.7128_-74.0060": { x: 304.1, y: 139.8 }, // New York, USA
        "34.0522_-118.2426": { x: 186.3, y: 163.9 }, // Los Angeles, USA  
        "41.8781_-87.6298": { x: 267.8, y: 135.6 }, // Chicago, USA
        "43.6532_-79.3832": { x: 303.5, y: 130.6 }, // Toronto, Canada
        
        // Europe - UK, France, Germany, Netherlands
        "51.5074_-0.1278": { x: 493.7, y: 100.9 }, // London, UK
        "48.8566_2.3522": { x: 497.8, y: 109.5 }, // Paris, France
        "50.1109_8.6821": { x: 514.5, y: 106.0 }, // Frankfurt, Germany
        "52.3676_4.9041": { x: 504.8, y: 97.8 }, // Amsterdam, Netherlands
        
        // Asia - Japan, Singapore, India, South Korea
        "35.6762_139.6503": { x: 855.7, y: 155.9 }, // Tokyo, Japan
        "1.3521_103.8198": { x: 812.9, y: 289.8 }, // Singapore
        "19.0760_72.8777": { x: 694.7, y: 218.7 }, // Mumbai, India
        "37.5665_126.9780": { x: 830.6, y: 151.2 }, // Seoul, South Korea
        
        // Oceania - Australia
        "-33.8688_151.2093": { x: 895.2, y: 407.6 }, // Sydney, Australia
        "-37.8136_144.9631": { x: 880.0, y: 420.3 }, // Melbourne, Australia
        
        // South America - Brazil, Colombia
        "-23.5505_-46.6333": { x: 361.5, y: 381.1 }, // São Paulo, Brazil
        "4.7110_-74.0721": { x: 287.0, y: 280.5 }, // Bogotá, Colombia
        
        // Africa - Egypt, South Africa
        "30.0444_31.2357": { x: 579.9, y: 180.5 }, // Cairo, Egypt
        "-33.9249_18.4241": { x: 543.6, y: 419.8 } // Cape Town, South Africa
    };
    
    // Return precise coordinates if available
    if (preciseCoordinates[deviceKey]) {
        return preciseCoordinates[deviceKey];
    }
    
    // Fallback to generic Web Mercator projection for unlisted coordinates
    const x = ((longitude + 180) / 360) * 1000;
    const latRad = latitude * Math.PI / 180;
    const mercatorY = Math.log(Math.tan((Math.PI / 4) + (latRad / 2)));
    const y = 500 - ((mercatorY + Math.PI) / (2 * Math.PI)) * 500;
    
    return { x: Math.round(x), y: Math.round(y) };
}

function initializeTopology() {
    // Network devices with coordinates calculated from their actual latitude/longitude
    const deviceLocations = [
        // North America
        { id: 'ny-core-01', name: 'NY-CORE-01', type: 'router', status: 'online', location: 'New York, USA', latitude: 40.7128, longitude: -74.0060 },
        { id: 'la-core-02', name: 'LA-CORE-02', type: 'router', status: 'online', location: 'Los Angeles, USA', latitude: 34.0522, longitude: -118.2426 },
        { id: 'chicago-sw-01', name: 'CHI-SW-01', type: 'switch', status: 'online', location: 'Chicago, USA', latitude: 41.8781, longitude: -87.6298 },
        { id: 'toronto-fw-01', name: 'TOR-FW-01', type: 'firewall', status: 'warning', location: 'Toronto, Canada', latitude: 43.6532, longitude: -79.3832 },
        
        // Europe
        { id: 'london-core-01', name: 'LON-CORE-01', type: 'router', status: 'online', location: 'London, UK', latitude: 51.5074, longitude: -0.1278 },
        { id: 'paris-sw-01', name: 'PAR-SW-01', type: 'switch', status: 'online', location: 'Paris, France', latitude: 48.8566, longitude: 2.3522 },
        { id: 'frankfurt-core-02', name: 'FRA-CORE-02', type: 'router', status: 'online', location: 'Frankfurt, Germany', latitude: 50.1109, longitude: 8.6821 },
        { id: 'amsterdam-srv-01', name: 'AMS-SRV-01', type: 'server', status: 'online', location: 'Amsterdam, Netherlands', latitude: 52.3676, longitude: 4.9041 },
        
        // Asia
        { id: 'tokyo-core-01', name: 'TYO-CORE-01', type: 'router', status: 'online', location: 'Tokyo, Japan', latitude: 35.6762, longitude: 139.6503 },
        { id: 'singapore-sw-01', name: 'SIN-SW-01', type: 'switch', status: 'online', location: 'Singapore', latitude: 1.3521, longitude: 103.8198 },
        { id: 'mumbai-fw-01', name: 'MUM-FW-01', type: 'firewall', status: 'offline', location: 'Mumbai, India', latitude: 19.0760, longitude: 72.8777 },
        { id: 'seoul-srv-01', name: 'SEO-SRV-01', type: 'server', status: 'warning', location: 'Seoul, South Korea', latitude: 37.5665, longitude: 126.9780 },
        
        // Australia
        { id: 'sydney-core-01', name: 'SYD-CORE-01', type: 'router', status: 'online', location: 'Sydney, Australia', latitude: -33.8688, longitude: 151.2093 },
        { id: 'melbourne-sw-01', name: 'MEL-SW-01', type: 'switch', status: 'online', location: 'Melbourne, Australia', latitude: -37.8136, longitude: 144.9631 },
        
        // South America
        { id: 'saopaulo-core-01', name: 'SAO-CORE-01', type: 'router', status: 'online', location: 'São Paulo, Brazil', latitude: -23.5505, longitude: -46.6333 },
        { id: 'bogota-fw-01', name: 'BOG-FW-01', type: 'firewall', status: 'warning', location: 'Bogotá, Colombia', latitude: 4.7110, longitude: -74.0721 },
        
        // Africa
        { id: 'cairo-sw-01', name: 'CAI-SW-01', type: 'switch', status: 'online', location: 'Cairo, Egypt', latitude: 30.0444, longitude: 31.2357 },
        { id: 'capetown-srv-01', name: 'CPT-SRV-01', type: 'server', status: 'online', location: 'Cape Town, South Africa', latitude: -33.9249, longitude: 18.4241 }
    ];
    
    // Convert lat/lng to SVG coordinates
    networkDevicesData = deviceLocations.map(device => {
        const coords = latLngToSVG(device.latitude, device.longitude);
        return {
            ...device,
            x: coords.x,
            y: coords.y
        };
    });

    // Network links between devices
    networkLinksData = [
        // Trans-Atlantic
        { from: 'ny-core-01', to: 'london-core-01', status: 'active', bandwidth: '100Gbps' },
        { from: 'ny-core-01', to: 'frankfurt-core-02', status: 'active', bandwidth: '100Gbps' },
        
        // Trans-Pacific
        { from: 'la-core-02', to: 'tokyo-core-01', status: 'active', bandwidth: '100Gbps' },
        { from: 'la-core-02', to: 'sydney-core-01', status: 'active', bandwidth: '40Gbps' },
        
        // European backbone
        { from: 'london-core-01', to: 'frankfurt-core-02', status: 'active', bandwidth: '100Gbps' },
        { from: 'london-core-01', to: 'paris-sw-01', status: 'active', bandwidth: '40Gbps' },
        { from: 'frankfurt-core-02', to: 'amsterdam-srv-01', status: 'active', bandwidth: '40Gbps' },
        
        // Asian routes
        { from: 'tokyo-core-01', to: 'singapore-sw-01', status: 'active', bandwidth: '40Gbps' },
        { from: 'tokyo-core-01', to: 'seoul-srv-01', status: 'warning', bandwidth: '10Gbps' },
        { from: 'singapore-sw-01', to: 'mumbai-fw-01', status: 'inactive', bandwidth: '10Gbps' },
        
        // North American backbone  
        { from: 'ny-core-01', to: 'chicago-sw-01', status: 'active', bandwidth: '40Gbps' },
        { from: 'chicago-sw-01', to: 'la-core-02', status: 'active', bandwidth: '40Gbps' },
        { from: 'toronto-fw-01', to: 'ny-core-01', status: 'warning', bandwidth: '10Gbps' },
        
        // Regional connections
        { from: 'sydney-core-01', to: 'melbourne-sw-01', status: 'active', bandwidth: '40Gbps' },
        { from: 'saopaulo-core-01', to: 'bogota-fw-01', status: 'warning', bandwidth: '10Gbps' },
        { from: 'cairo-sw-01', to: 'london-core-01', status: 'active', bandwidth: '10Gbps' },
        { from: 'capetown-srv-01', to: 'cairo-sw-01', status: 'active', bandwidth: '10Gbps' },
        
        // Cross-continental
        { from: 'singapore-sw-01', to: 'sydney-core-01', status: 'active', bandwidth: '40Gbps' },
        { from: 'frankfurt-core-02', to: 'cairo-sw-01', status: 'active', bandwidth: '10Gbps' }
    ];

    renderTopology();
}

function renderTopology() {
    renderNetworkDevices();
    renderNetworkLinks();
    // Small delay to ensure DOM elements are ready
    setTimeout(() => {
        updateTopologyStats();
    }, 100);
}

function renderNetworkDevices() {
    const devicesContainer = document.getElementById('networkDevices');
    if (!devicesContainer) return;
    
    devicesContainer.innerHTML = '';

    networkDevicesData.forEach(device => {
        const deviceElement = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        deviceElement.setAttribute('cx', device.x);
        deviceElement.setAttribute('cy', device.y);
        deviceElement.setAttribute('r', 8);
        deviceElement.setAttribute('class', `network-device device-${device.type} device-status-${device.status}`);
        deviceElement.setAttribute('data-device-id', device.id);

        // Add hover and click events
        deviceElement.addEventListener('mouseenter', (e) => showDeviceHover(e, device));
        deviceElement.addEventListener('mouseleave', hideDeviceHover);
        deviceElement.addEventListener('click', (e) => {
            // Prevent device details from opening during drag operations
            if (!isDragging) {
                showTopologyDeviceDetails(device);
            }
        });

        devicesContainer.appendChild(deviceElement);
    });
}

function renderNetworkLinks() {
    const linksContainer = document.getElementById('networkLinks');
    if (!linksContainer) return;
    
    linksContainer.innerHTML = '';

    if (!topologyLinksVisible) return;

    networkLinksData.forEach(link => {
        const fromDevice = networkDevicesData.find(d => d.id === link.from);
        const toDevice = networkDevicesData.find(d => d.id === link.to);

        if (fromDevice && toDevice) {
            const linkElement = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            linkElement.setAttribute('x1', fromDevice.x);
            linkElement.setAttribute('y1', fromDevice.y);
            linkElement.setAttribute('x2', toDevice.x);
            linkElement.setAttribute('y2', toDevice.y);
            linkElement.setAttribute('class', `network-link ${link.status}`);
            linkElement.setAttribute('data-from', link.from);
            linkElement.setAttribute('data-to', link.to);

            // Add hover and click events
            linkElement.addEventListener('mouseenter', (e) => showLinkHover(e, link, fromDevice, toDevice));
            linkElement.addEventListener('mouseleave', hideDeviceHover);
            linkElement.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                showLinkDetails(link, fromDevice, toDevice);
            });

            linksContainer.appendChild(linkElement);
        }
    });
}

function showDeviceHover(event, device) {
    const hoverInfo = document.getElementById('hoverInfo');
    const hoverText = document.getElementById('hoverText');
    
    if (hoverInfo && hoverText) {
        hoverText.innerHTML = `
            <tspan x="10" y="20" font-weight="bold">${device.name}</tspan>
            <tspan x="10" y="35">Type: ${device.type.toUpperCase()}</tspan>
            <tspan x="10" y="50">Status: ${device.status.toUpperCase()}</tspan>
            <tspan x="10" y="65">Location: ${device.location}</tspan>
            <tspan x="10" y="80">Coordinates: ${device.latitude}°, ${device.longitude}°</tspan>
        `;
        
        hoverInfo.setAttribute('transform', `translate(${event.target.getAttribute('cx') - 100}, ${event.target.getAttribute('cy') - 120})`);
        hoverInfo.style.display = 'block';
    }
}

function showLinkHover(event, link, fromDevice, toDevice) {
    const hoverInfo = document.getElementById('hoverInfo');
    const hoverText = document.getElementById('hoverText');
    
    if (hoverInfo && hoverText) {
        hoverText.innerHTML = `
            <tspan x="10" y="20" font-weight="bold">Network Link</tspan>
            <tspan x="10" y="35">From: ${fromDevice.name}</tspan>
            <tspan x="10" y="50">To: ${toDevice.name}</tspan>
            <tspan x="10" y="65">Bandwidth: ${link.bandwidth}</tspan>
            <tspan x="10" y="80">Status: ${link.status.toUpperCase()}</tspan>
        `;
        
        const x = (parseFloat(event.target.getAttribute('x1')) + parseFloat(event.target.getAttribute('x2'))) / 2;
        const y = (parseFloat(event.target.getAttribute('y1')) + parseFloat(event.target.getAttribute('y2'))) / 2;
        
        hoverInfo.setAttribute('transform', `translate(${x - 100}, ${y - 120})`);
        hoverInfo.style.display = 'block';
    }
}

function hideDeviceHover() {
    const hoverInfo = document.getElementById('hoverInfo');
    if (hoverInfo) {
        hoverInfo.style.display = 'none';
    }
}

function showTopologyDeviceDetails(device) {
    // Reuse the main device modal infrastructure for consistent styling
    document.getElementById('modalDeviceName').textContent = device.name;
    
    // Update modal header with status badge
    const modalHeader = document.querySelector('#deviceModal .modal-header');
    const existingBadge = modalHeader.querySelector('.device-status-badge');
    if (existingBadge) {
        existingBadge.remove();
    }
    
    const statusBadge = document.createElement('div');
    statusBadge.className = `device-status-badge status-${device.status}`;
    statusBadge.innerHTML = `
        <span class="status-indicator"></span>
        ${device.status.toUpperCase()}
    `;
    modalHeader.insertBefore(statusBadge, modalHeader.querySelector('.close'));
    
    // Populate Basic Info tab with topology device information
    document.getElementById('basicInfoContent').innerHTML = `
        <div class="detail-item">
            <span class="detail-label">Device Name:</span>
            <span class="detail-value">${device.name}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Device Type:</span>
            <span class="detail-value">${device.type.toUpperCase()}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Location:</span>
            <span class="detail-value">${device.location}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Coordinates:</span>
            <span class="detail-value">${device.latitude}°, ${device.longitude}°</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Status:</span>
            <span class="detail-value status-${device.status}">${device.status.toUpperCase()}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Network Role:</span>
            <span class="detail-value">Topology Node</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Map Position:</span>
            <span class="detail-value">X: ${Math.round(device.x)}, Y: ${Math.round(device.y)}</span>
        </div>
    `;
    
    // Populate Hardware tab with topology-specific information
    document.getElementById('hardwareContent').innerHTML = `
        <div class="detail-item">
            <span class="detail-label">Device Category:</span>
            <span class="detail-value">${device.type.charAt(0).toUpperCase() + device.type.slice(1)}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Geographic Region:</span>
            <span class="detail-value">${getGeographicRegion(device.latitude, device.longitude)}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Network Tier:</span>
            <span class="detail-value">${getNetworkTier(device.type)}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Operational Status:</span>
            <span class="detail-value status-${device.status}">${device.status.toUpperCase()}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Connectivity:</span>
            <span class="detail-value">${getConnectivityInfo(device)}</span>
        </div>
    `;
    
    // Populate Performance tab with network topology metrics
    document.getElementById('performanceContent').innerHTML = `
        <div class="performance-metrics">
            <div class="metric-card">
                <div class="metric-header">
                    <h4>Network Status</h4>
                    <span class="metric-value ${device.status === 'online' ? 'normal' : device.status === 'warning' ? 'warning' : 'critical'}">${device.status.toUpperCase()}</span>
                </div>
                <div class="metric-bar">
                    <div class="metric-fill" style="width: ${device.status === 'online' ? '100' : device.status === 'warning' ? '75' : '0'}%; background-color: ${device.status === 'online' ? '#28a745' : device.status === 'warning' ? '#ffc107' : '#dc3545'}"></div>
                </div>
            </div>
            
            <div class="performance-details">
                <div class="detail-item">
                    <span class="detail-label">Device ID:</span>
                    <span class="detail-value">${device.id}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Network Position:</span>
                    <span class="detail-value">${device.latitude}°, ${device.longitude}°</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Geographic Location:</span>
                    <span class="detail-value">${device.location}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Topology Role:</span>
                    <span class="detail-value">${getTopologyRole(device.type)}</span>
                </div>
            </div>
        </div>
    `;
    
    // Clear Physical Inventory tab for topology view
    document.getElementById('inventoryContent').innerHTML = `
        <div class="detail-item">
            <span class="detail-label">Topology View:</span>
            <span class="detail-value">Physical inventory not available in topology mode</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Device Type:</span>
            <span class="detail-value">${device.type.toUpperCase()}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Network Function:</span>
            <span class="detail-value">${getNetworkFunction(device.type)}</span>
        </div>
    `;
    
    document.getElementById('deviceModal').style.display = 'block';
}

// Helper functions for topology device details
function getGeographicRegion(latitude, longitude) {
    if (longitude >= -130 && longitude <= -60) return 'North America';
    if (longitude >= -20 && longitude <= 50) return 'Europe/Africa';
    if (longitude >= 50 && longitude <= 180) return 'Asia/Oceania';
    if (longitude >= -90 && longitude <= -30) return 'South America';
    return 'Unknown Region';
}

function getNetworkTier(type) {
    switch (type.toLowerCase()) {
        case 'router': return 'Core Network';
        case 'switch': return 'Access/Distribution';
        case 'firewall': return 'Security Layer';
        case 'server': return 'Service Layer';
        default: return 'Network Infrastructure';
    }
}

function getConnectivityInfo(device) {
    const connections = networkLinksData.filter(link => 
        link.from === device.id || link.to === device.id
    ).length;
    return `${connections} network connection${connections !== 1 ? 's' : ''}`;
}

function getTopologyRole(type) {
    switch (type.toLowerCase()) {
        case 'router': return 'Traffic Routing & Forwarding';
        case 'switch': return 'Layer 2/3 Switching';
        case 'firewall': return 'Security Enforcement';
        case 'server': return 'Service Provisioning';
        default: return 'Network Node';
    }
}

function getNetworkFunction(type) {
    switch (type.toLowerCase()) {
        case 'router': return 'Packet routing between networks';
        case 'switch': return 'Frame switching within networks';
        case 'firewall': return 'Network security and access control';
        case 'server': return 'Application and service hosting';
        default: return 'General network function';
    }
}

function updateTopologyStats() {
    const totalDevicesEl = document.getElementById('topologyTotalDevices');
    const activeLinksEl = document.getElementById('topologyActiveLinks');
    const networkHealthEl = document.getElementById('topologyNetworkHealth');

    if (totalDevicesEl && networkDevicesData) {
        totalDevicesEl.textContent = networkDevicesData.length;
    }
    
    if (activeLinksEl && networkLinksData) {
        const activeLinks = networkLinksData.filter(link => link.status === 'active').length;
        activeLinksEl.textContent = activeLinks;
    }

    if (networkHealthEl && networkDevicesData && networkLinksData) {
        const offlineDevices = networkDevicesData.filter(d => d.status === 'offline').length;
        const warningDevices = networkDevicesData.filter(d => d.status === 'warning').length;
        const inactiveLinks = networkLinksData.filter(l => l.status === 'inactive').length;

        if (offlineDevices > 0 || inactiveLinks > 0) {
            networkHealthEl.textContent = 'Critical';
            networkHealthEl.className = 'info-value health-critical';
        } else if (warningDevices > 0) {
            networkHealthEl.textContent = 'Warning';
            networkHealthEl.className = 'info-value health-warning';
        } else {
            networkHealthEl.textContent = 'Optimal';
            networkHealthEl.className = 'info-value health-good';
        }
    }
}

// Topology control functions
function refreshTopology() {
    showNotification('🔄 Refreshing topology data...', 'info');
    // Simulate data refresh
    setTimeout(() => {
        renderTopology();
        showNotification('✓ Topology data refreshed', 'success');
    }, 1500);
}

// Force update topology stats (can be called externally if needed)
function forceUpdateTopologyStats() {
    updateTopologyStats();
}

function toggleLinks() {
    topologyLinksVisible = !topologyLinksVisible;
    renderNetworkLinks();
    showNotification(topologyLinksVisible ? '🔗 Links shown' : '🔗 Links hidden', 'info');
}

function centerMap() {
    currentZoom = 1;
    panX = 0;
    panY = 0;
    applyZoom();
    showNotification('🌍 Map centered and reset', 'info');
}

// Zoom control functions
function zoomIn() {
    if (currentZoom < 3) { // Max zoom 300%
        currentZoom += 0.25;
        applyZoom();
        showNotification(`🔍 Zoomed to ${Math.round(currentZoom * 100)}%`, 'info');
    }
}

function zoomOut() {
    if (currentZoom > 0.5) { // Min zoom 50%
        currentZoom -= 0.25;
        applyZoom();
        showNotification(`🔍 Zoomed to ${Math.round(currentZoom * 100)}%`, 'info');
    }
}

function resetZoom() {
    currentZoom = 1;
    panX = 0;
    panY = 0;
    applyZoom();
    showNotification('⚡ Zoom reset to 100%', 'info');
}

function applyZoom() {
    const worldMap = document.getElementById('worldMap');
    if (worldMap) {
        const transform = `scale(${currentZoom}) translate(${panX}px, ${panY}px)`;
        worldMap.style.transform = transform;
    }
    
    // Update zoom level display
    const zoomLevel = document.getElementById('zoomLevel');
    if (zoomLevel) {
        zoomLevel.textContent = `${Math.round(currentZoom * 100)}%`;
    }
    
    // Update cursor based on zoom level
    const mapContainer = document.querySelector('.world-map-container');
    if (mapContainer && !isDragging) {
        mapContainer.style.cursor = currentZoom > 1 ? 'grab' : 'default';
    }
}

// Pan/drag functionality variables
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragStartPanX = 0;
let dragStartPanY = 0;

// Add mouse wheel zoom support and drag functionality
function initializeZoomControls() {
    const mapContainer = document.querySelector('.world-map-container');
    if (mapContainer) {
        // Mouse wheel zoom
        mapContainer.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (e.deltaY < 0) {
                zoomIn();
            } else {
                zoomOut();
            }
        });

        // Mouse drag events
        mapContainer.addEventListener('mousedown', startDrag);
        mapContainer.addEventListener('mousemove', dragMap);
        mapContainer.addEventListener('mouseup', stopDrag);
        mapContainer.addEventListener('mouseleave', stopDrag);

        // Touch events for mobile support
        mapContainer.addEventListener('touchstart', startTouchDrag);
        mapContainer.addEventListener('touchmove', dragMapTouch);
        mapContainer.addEventListener('touchend', stopDrag);

        // Prevent context menu on right click during drag
        mapContainer.addEventListener('contextmenu', (e) => {
            if (isDragging) {
                e.preventDefault();
            }
        });

        // Change cursor style when dragging
        mapContainer.style.cursor = 'grab';
    }
}

function startDrag(e) {
    // Only start dragging if zoomed in (when panning is useful)
    if (currentZoom <= 1) return;
    
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragStartPanX = panX;
    dragStartPanY = panY;
    
    const mapContainer = document.querySelector('.world-map-container');
    if (mapContainer) {
        mapContainer.style.cursor = 'grabbing';
    }
    
    e.preventDefault();
}

function dragMap(e) {
    if (!isDragging) return;
    
    const deltaX = (e.clientX - dragStartX) / currentZoom;
    const deltaY = (e.clientY - dragStartY) / currentZoom;
    
    panX = dragStartPanX + deltaX;
    panY = dragStartPanY + deltaY;
    
    // Apply pan limits to keep content visible
    applyPanLimits();
    applyZoom();
    
    e.preventDefault();
}

function stopDrag() {
    if (isDragging) {
        isDragging = false;
        const mapContainer = document.querySelector('.world-map-container');
        if (mapContainer) {
            mapContainer.style.cursor = currentZoom > 1 ? 'grab' : 'default';
        }
    }
}

function startTouchDrag(e) {
    // Only start dragging if zoomed in (when panning is useful)
    if (currentZoom <= 1 || e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    isDragging = true;
    dragStartX = touch.clientX;
    dragStartY = touch.clientY;
    dragStartPanX = panX;
    dragStartPanY = panY;
    
    e.preventDefault();
}

function dragMapTouch(e) {
    if (!isDragging || e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    const deltaX = (touch.clientX - dragStartX) / currentZoom;
    const deltaY = (touch.clientY - dragStartY) / currentZoom;
    
    panX = dragStartPanX + deltaX;
    panY = dragStartPanY + deltaY;
    
    // Apply pan limits to keep content visible
    applyPanLimits();
    applyZoom();
    
    e.preventDefault();
}

function applyPanLimits() {
    // Get container dimensions
    const mapContainer = document.querySelector('.world-map-container');
    if (!mapContainer) return;
    
    const containerRect = mapContainer.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;
    
    // Calculate scaled map dimensions
    const scaledMapWidth = 1000 * currentZoom;
    const scaledMapHeight = 500 * currentZoom;
    
    // Calculate maximum pan offsets to keep some content visible
    const maxPanX = Math.max(0, (scaledMapWidth - containerWidth) / 2 / currentZoom);
    const maxPanY = Math.max(0, (scaledMapHeight - containerHeight) / 2 / currentZoom);
    
    // Apply limits
    panX = Math.max(-maxPanX, Math.min(maxPanX, panX));
    panY = Math.max(-maxPanY, Math.min(maxPanY, panY));
}

function showLinkDetails(link, fromDevice, toDevice) {
    hideDeviceHover();
    
    document.getElementById('modalLinkTitle').textContent = 'Network Link Properties';
    
    const linkType = getLinkType(link.bandwidth);
    const distance = calculateDistance(fromDevice, toDevice);
    const latency = calculateLatency(distance);
    const utilization = generateMockUtilization(link.status);
    const uptime = generateMockUptime(link.status);
    
    document.getElementById('linkInfoContent').innerHTML = `
        <div class="link-details">
            <div class="detail-item">
                <span class="detail-label">From Device:</span>
                <span class="detail-value">${fromDevice.name}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">To Device:</span>
                <span class="detail-value">${toDevice.name}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Link Status:</span>
                <span class="link-status-indicator ${link.status}">${link.status.toUpperCase()}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Bandwidth Capacity:</span>
                <span class="detail-value">${link.bandwidth}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Link Type:</span>
                <span class="detail-value">${linkType}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Geographic Distance:</span>
                <span class="detail-value">${distance.toFixed(0)} km</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Estimated Latency:</span>
                <span class="detail-value">${latency.toFixed(1)} ms</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Link Uptime:</span>
                <span class="detail-value">${uptime}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">From Location:</span>
                <span class="detail-value">${fromDevice.location}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">To Location:</span>
                <span class="detail-value">${toDevice.location}</span>
            </div>
        </div>
    `;
    
    const bandwidthPercent = getBandwidthUtilization(link.bandwidth, utilization);
    const bandwidthColor = getBandwidthColor(bandwidthPercent);
    
    document.getElementById('linkPerformanceContent').innerHTML = `
        <div class="link-metrics">
            <div class="detail-item">
                <span class="detail-label">Current Utilization:</span>
                <span class="detail-value">${utilization}% (${calculateThroughput(link.bandwidth, utilization)})</span>
            </div>
            
            <div class="link-bandwidth-bar">
                <div class="link-bandwidth-fill" style="width: ${bandwidthPercent}%; background: ${bandwidthColor}"></div>
            </div>
            
            <div class="performance-metrics" style="margin-top: 15px;">
                <div class="metric-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div class="metric-card">
                        <div class="metric-label">Packets/sec</div>
                        <div class="metric-value">${generateMockPackets(link.bandwidth, utilization)}</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">Error Rate</div>
                        <div class="metric-value">${generateMockErrorRate(link.status)}</div>
                    </div>
                </div>
                
                <div class="metric-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 10px;">
                    <div class="metric-card">
                        <div class="metric-label">Availability</div>
                        <div class="metric-value">${generateMockAvailability(link.status)}</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">Last Updated</div>
                        <div class="metric-value">${new Date().toLocaleTimeString()}</div>
                    </div>
                </div>
            </div>
            
            <div class="link-path-info" style="margin-top: 15px; padding: 12px; background: rgba(0, 129, 194, 0.05); border-radius: 6px;">
                <div class="detail-item">
                    <span class="detail-label">Network Path:</span>
                    <span class="detail-value">${fromDevice.name} → ${toDevice.name}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Route Type:</span>
                    <span class="detail-value">${getRouteType(distance, linkType)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Protocol:</span>
                    <span class="detail-value">MPLS/BGP</span>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('linkModal').style.display = 'block';
}

function closeLinkModal() {
    document.getElementById('linkModal').style.display = 'none';
}

function calculateDistance(device1, device2) {
    const lat1 = device1.latitude * Math.PI / 180;
    const lat2 = device2.latitude * Math.PI / 180;
    const deltaLat = (device2.latitude - device1.latitude) * Math.PI / 180;
    const deltaLng = (device2.longitude - device1.longitude) * Math.PI / 180;
    
    const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLng/2) * Math.sin(deltaLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return 6371 * c;
}

function calculateLatency(distance) {
    return (distance / 300000) * 1000 * 2;
}

function getLinkType(bandwidth) {
    if (bandwidth.includes('100G')) return 'High-Speed Backbone';
    if (bandwidth.includes('40G')) return 'Regional Backbone';
    if (bandwidth.includes('10G')) return 'Metro Connection';
    return 'Standard Link';
}

function generateMockUtilization(status) {
    if (status === 'active') return Math.floor(Math.random() * 40) + 20;
    if (status === 'warning') return Math.floor(Math.random() * 30) + 60;
    return 0;
}

function generateMockUptime(status) {
    if (status === 'active') return '99.9%';
    if (status === 'warning') return '98.2%';
    return '0%';
}

function getBandwidthUtilization(bandwidth, utilization) {
    return utilization;
}

function getBandwidthColor(percent) {
    if (percent < 50) return '#28a745';
    if (percent < 80) return '#ffc107';
    return '#dc3545';
}

function calculateThroughput(bandwidth, utilizationPercent) {
    const capacity = parseFloat(bandwidth);
    const unit = bandwidth.replace(/[0-9.]/g, '');
    const throughput = (capacity * utilizationPercent / 100).toFixed(1);
    return `${throughput}${unit}`;
}

function generateMockPackets(bandwidth, utilization) {
    const base = parseFloat(bandwidth) * 1000 * (utilization / 100);
    return `${(base * Math.random() * 10).toFixed(0)}K`;
}

function generateMockErrorRate(status) {
    if (status === 'active') return '< 0.01%';
    if (status === 'warning') return '0.05%';
    return 'N/A';
}

function generateMockAvailability(status) {
    if (status === 'active') return '99.95%';
    if (status === 'warning') return '98.50%';
    return '0%';
}

function getRouteType(distance, linkType) {
    if (distance > 5000) return 'Intercontinental';
    if (distance > 1000) return 'International';
    if (distance > 500) return 'National';
    return 'Regional';
}