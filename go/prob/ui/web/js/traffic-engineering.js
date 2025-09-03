// Traffic Engineering Application
// Visualizes L3 topology, TE services, SR policies, BGP, and MPLS

// Convert latitude/longitude to SVG coordinates - EXACT SAME as topology.js
function latLngToTeSVG(latitude, longitude) {
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
        "-33.9249_18.4241": { x: 543.6, y: 419.8 }, // Cape Town, South Africa
        
        // Additional TE locations
        "32.7767_-96.7970": { x: 248.5, y: 163.2 }, // Dallas, USA
        "39.7392_-104.9903": { x: 221.8, y: 146.5 }, // Denver, USA
        "33.7490_-84.3880": { x: 282.4, y: 156.8 }, // Atlanta, USA
        "25.7617_-80.1918": { x: 305.2, y: 181.9 }, // Miami, USA
        "47.3769_8.5417": { x: 516.2, y: 118.3 }, // Zurich, Switzerland
        "45.4642_9.1900": { x: 520.8, y: 125.4 }, // Milan, Italy
        "40.4168_-3.7038": { x: 487.2, y: 138.6 }, // Madrid, Spain
        "22.3193_114.1694": { x: 798.4, y: 201.5 }, // Hong Kong
        "25.2048_55.2708": { x: 641.8, y: 195.3 } // Dubai, UAE
    };
    
    // Return precise coordinates if available - NO SCALING
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

class TrafficEngineeringApp {
    constructor() {
        this.nodes = [];
        this.links = [];
        this.srPolicies = [];
        this.bgpSessions = [];
        this.mplsLabels = [];
        this.activeView = 'topology';
        this.selectedNode = null;
        this.selectedLink = null;
        this.selectedPolicy = null;
        this.highlightedPolicies = new Set();
        this.visualization = null;
        this.apiBaseUrl = '/api/te';
        this.tooltipTimeout = null;
        
        // Zoom and pan state
        this.currentZoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.dragStartPanX = 0;
        this.dragStartPanY = 0;
        
        this.initializeVisualization();
        this.setupEventListeners();
    }

    async initializeVisualization() {
        try {
            await this.loadTopologyData();
            this.renderVisualization();
            this.renderPoliciesPanel();
            this.updateStats();
        } catch (error) {
            console.error('Failed to initialize TE visualization:', error);
            this.showNotification('Failed to load TE data', 'error');
        }
    }

    async loadTopologyData() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/topology`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            
            this.nodes = data.nodes || [];
            this.links = data.links || [];
            this.srPolicies = data.sr_policies || [];
            this.bgpSessions = data.bgp_sessions || [];
            this.mplsLabels = data.mpls_labels || [];
            
            console.log('TE Topology Data loaded from API:', data);
        } catch (error) {
            console.warn('Failed to load from API, using mock data:', error);
            // Use comprehensive mock data as fallback
            const mockData = this.getMockTopologyData();
            this.nodes = mockData.nodes;
            this.links = mockData.links;
            this.srPolicies = mockData.sr_policies;
            this.bgpSessions = mockData.bgp_sessions;
            this.mplsLabels = mockData.mpls_labels;
            
            console.log('TE Topology Mock Data loaded:', mockData);
        }
    }

    getMockTopologyData() {
        return {
            nodes: [
                // North America - Core Network
                {id: "pe-nyc-01", name: "NYC-PE-CORE-01", type: "pe", status: "active", location: "New York, USA", lat: 40.7128, lng: -74.0060, as_number: 65001, router_id: "1.1.1.1"},
                {id: "pe-lax-01", name: "LAX-PE-EDGE-01", type: "pe", status: "active", location: "Los Angeles, USA", lat: 34.0522, lng: -118.2426, as_number: 65001, router_id: "2.2.2.2"},
                {id: "pe-chi-01", name: "CHI-PE-AGGR-01", type: "pe", status: "warning", location: "Chicago, USA", lat: 41.8781, lng: -87.6298, as_number: 65001, router_id: "3.3.3.3"},
                {id: "p-dal-01", name: "DAL-P-BACKBONE-01", type: "p", status: "active", location: "Dallas, USA", lat: 32.7767, lng: -96.7970, as_number: 65001, router_id: "4.4.4.4"},
                {id: "p-den-01", name: "DEN-P-TRANSIT-01", type: "p", status: "active", location: "Denver, USA", lat: 39.7392, lng: -104.9903, as_number: 65001, router_id: "5.5.5.5"},
                {id: "rr-atl-01", name: "ATL-RR-PRIMARY-01", type: "rr", status: "active", location: "Atlanta, USA", lat: 33.7490, lng: -84.3880, as_number: 65001, router_id: "6.6.6.6"},
                {id: "asbr-mia-01", name: "MIA-ASBR-INTL-01", type: "asbr", status: "active", location: "Miami, USA", lat: 25.7617, lng: -80.1918, as_number: 65001, router_id: "7.7.7.7"},
                {id: "pe-tor-01", name: "TOR-PE-NORTH-01", type: "pe", status: "active", location: "Toronto, Canada", lat: 43.6532, lng: -79.3832, as_number: 65001, router_id: "8.8.8.8"},
                
                // Europe - Multi-AS Network
                {id: "pe-lon-01", name: "LON-PE-METRO-01", type: "pe", status: "active", location: "London, UK", lat: 51.5074, lng: -0.1278, as_number: 65002, router_id: "10.10.10.10"},
                {id: "pe-par-01", name: "PAR-PE-ACCESS-01", type: "pe", status: "active", location: "Paris, France", lat: 48.8566, lng: 2.3522, as_number: 65002, router_id: "11.11.11.11"},
                {id: "p-fra-01", name: "FRA-P-EXCHANGE-01", type: "p", status: "active", location: "Frankfurt, Germany", lat: 50.1109, lng: 8.6821, as_number: 65002, router_id: "12.12.12.12"},
                {id: "p-ams-01", name: "AMS-P-HUB-01", type: "p", status: "inactive", location: "Amsterdam, Netherlands", lat: 52.3676, lng: 4.9041, as_number: 65002, router_id: "13.13.13.13"},
                {id: "rr-zur-01", name: "ZUR-RR-BACKUP-01", type: "rr", status: "active", location: "Zurich, Switzerland", lat: 47.3769, lng: 8.5417, as_number: 65002, router_id: "14.14.14.14"},
                {id: "asbr-mil-01", name: "MIL-ASBR-SOUTH-01", type: "asbr", status: "active", location: "Milan, Italy", lat: 45.4642, lng: 9.1900, as_number: 65002, router_id: "15.15.15.15"},
                {id: "pe-mad-01", name: "MAD-PE-IBERIA-01", type: "pe", status: "warning", location: "Madrid, Spain", lat: 40.4168, lng: -3.7038, as_number: 65002, router_id: "16.16.16.16"},
                
                // Asia-Pacific - Emerging Markets
                {id: "pe-tok-01", name: "TOK-PE-JAPAN-01", type: "pe", status: "active", location: "Tokyo, Japan", lat: 35.6762, lng: 139.6503, as_number: 65003, router_id: "20.20.20.20"},
                {id: "pe-sin-01", name: "SIN-PE-SEASIA-01", type: "pe", status: "active", location: "Singapore", lat: 1.3521, lng: 103.8198, as_number: 65003, router_id: "21.21.21.21"},
                {id: "p-hkg-01", name: "HKG-P-CHINA-01", type: "p", status: "active", location: "Hong Kong", lat: 22.3193, lng: 114.1694, as_number: 65003, router_id: "22.22.22.22"},
                {id: "pe-seo-01", name: "SEO-PE-KOREA-01", type: "pe", status: "active", location: "Seoul, South Korea", lat: 37.5665, lng: 126.9780, as_number: 65003, router_id: "23.23.23.23"},
                {id: "asbr-mum-01", name: "MUM-ASBR-INDIA-01", type: "asbr", status: "inactive", location: "Mumbai, India", lat: 19.0760, lng: 72.8777, as_number: 65004, router_id: "24.24.24.24"},
                {id: "pe-syd-01", name: "SYD-PE-OCEANIA-01", type: "pe", status: "active", location: "Sydney, Australia", lat: -33.8688, lng: 151.2093, as_number: 65003, router_id: "25.25.25.25"},
                {id: "rr-mel-01", name: "MEL-RR-PACIFIC-01", type: "rr", status: "active", location: "Melbourne, Australia", lat: -37.8136, lng: 144.9631, as_number: 65003, router_id: "26.26.26.26"},
                
                // Global Regional Nodes
                {id: "pe-sao-01", name: "SAO-PE-BRASIL-01", type: "pe", status: "active", location: "São Paulo, Brazil", lat: -23.5505, lng: -46.6333, as_number: 65005, router_id: "30.30.30.30"},
                {id: "pe-cai-01", name: "CAI-PE-MENA-01", type: "pe", status: "active", location: "Cairo, Egypt", lat: 30.0444, lng: 31.2357, as_number: 65006, router_id: "40.40.40.40"},
                {id: "pe-dub-01", name: "DUB-PE-GULF-01", type: "pe", status: "active", location: "Dubai, UAE", lat: 25.2048, lng: 55.2708, as_number: 65007, router_id: "50.50.50.50"},
            ],
            links: [
                // North America Backbone - High Capacity Core
                {id: "na-core-01", source: "pe-nyc-01", target: "p-dal-01", status: "up", bandwidth: "400Gbps", utilization: 73, te_enabled: true, mpls_enabled: true, cost: 5, delay: 12},
                {id: "na-core-02", source: "pe-lax-01", target: "p-den-01", status: "up", bandwidth: "400Gbps", utilization: 68, te_enabled: true, mpls_enabled: true, cost: 5, delay: 15},
                {id: "na-core-03", source: "p-dal-01", target: "p-den-01", status: "up", bandwidth: "800Gbps", utilization: 42, te_enabled: true, mpls_enabled: true, cost: 3, delay: 8},
                {id: "na-pe-01", source: "pe-chi-01", target: "rr-atl-01", status: "warning", bandwidth: "100Gbps", utilization: 89, te_enabled: true, mpls_enabled: true, cost: 15, delay: 18},
                {id: "na-pe-02", source: "pe-tor-01", target: "pe-nyc-01", status: "up", bandwidth: "200Gbps", utilization: 34, te_enabled: true, mpls_enabled: true, cost: 12, delay: 6},
                
                // Europe Regional Network - Mixed Performance
                {id: "eu-metro-01", source: "pe-lon-01", target: "p-fra-01", status: "up", bandwidth: "200Gbps", utilization: 67, te_enabled: true, mpls_enabled: true, cost: 8, delay: 14},
                {id: "eu-metro-02", source: "pe-par-01", target: "p-fra-01", status: "up", bandwidth: "200Gbps", utilization: 45, te_enabled: true, mpls_enabled: true, cost: 10, delay: 12},
                {id: "eu-prob-01", source: "p-ams-01", target: "rr-zur-01", status: "down", bandwidth: "40Gbps", utilization: 0, te_enabled: false, mpls_enabled: false, cost: 999, delay: 999},
                {id: "eu-south-01", source: "asbr-mil-01", target: "pe-mad-01", status: "warning", bandwidth: "40Gbps", utilization: 92, te_enabled: true, mpls_enabled: true, cost: 20, delay: 22},
                
                // Trans-Atlantic Submarine Cables
                {id: "transatl-01", source: "pe-nyc-01", target: "pe-lon-01", status: "up", bandwidth: "400Gbps", utilization: 78, te_enabled: true, mpls_enabled: true, cost: 50, delay: 76},
                {id: "transatl-02", source: "asbr-mia-01", target: "asbr-mil-01", status: "up", bandwidth: "200Gbps", utilization: 63, te_enabled: true, mpls_enabled: true, cost: 60, delay: 85},
                
                // Asia-Pacific Ring - Emerging Tech
                {id: "apac-ring-01", source: "pe-tok-01", target: "pe-sin-01", status: "up", bandwidth: "200Gbps", utilization: 71, te_enabled: true, mpls_enabled: true, cost: 30, delay: 45},
                {id: "apac-ring-02", source: "pe-sin-01", target: "p-hkg-01", status: "up", bandwidth: "400Gbps", utilization: 52, te_enabled: true, mpls_enabled: true, cost: 15, delay: 25},
                {id: "apac-ring-03", source: "p-hkg-01", target: "pe-seo-01", status: "up", bandwidth: "200Gbps", utilization: 47, te_enabled: true, mpls_enabled: true, cost: 20, delay: 35},
                {id: "apac-oceania-01", source: "pe-syd-01", target: "rr-mel-01", status: "up", bandwidth: "100Gbps", utilization: 36, te_enabled: true, mpls_enabled: true, cost: 12, delay: 8},
                
                // Trans-Pacific Submarine Links
                {id: "transpacific-01", source: "pe-lax-01", target: "pe-tok-01", status: "up", bandwidth: "400Gbps", utilization: 82, te_enabled: true, mpls_enabled: true, cost: 45, delay: 125},
                {id: "transpacific-02", source: "pe-lax-01", target: "pe-syd-01", status: "up", bandwidth: "200Gbps", utilization: 59, te_enabled: true, mpls_enabled: true, cost: 55, delay: 145},
                
                // Global Connections
                {id: "mideast-01", source: "pe-dub-01", target: "pe-cai-01", status: "up", bandwidth: "100Gbps", utilization: 38, te_enabled: true, mpls_enabled: true, cost: 28, delay: 35},
                {id: "eu-asia-01", source: "p-fra-01", target: "pe-dub-01", status: "up", bandwidth: "200Gbps", utilization: 54, te_enabled: true, mpls_enabled: true, cost: 32, delay: 48},
                {id: "latam-01", source: "pe-sao-01", target: "asbr-mia-01", status: "up", bandwidth: "100Gbps", utilization: 56, te_enabled: true, mpls_enabled: true, cost: 25, delay: 45},
            ],
            sr_policies: [
                {id: "sr-ultra-low", name: "Ultra-Low-Latency-Gaming", endpoint: "20.20.20.20", color: 100, status: "up", paths: ["pe-nyc-01->p-dal-01->p-den-01->pe-lax-01->pe-tok-01"], preference: 255, traffic: 25000000000},
                {id: "sr-finance-ny-lon", name: "Financial-Trading-Express", endpoint: "10.10.10.10", color: 150, status: "up", paths: ["pe-nyc-01->pe-lon-01"], preference: 250, traffic: 45000000000},
                {id: "sr-cdn-global", name: "Global-CDN-Distribution", endpoint: "21.21.21.21", color: 200, status: "up", paths: ["pe-lax-01->pe-tok-01->pe-sin-01", "pe-lax-01->pe-syd-01"], preference: 180, traffic: 120000000000},
                {id: "sr-corp-primary", name: "Corporate-VPN-Primary", endpoint: "50.50.50.50", color: 300, status: "up", paths: ["pe-nyc-01->asbr-mia-01->pe-dub-01"], preference: 160, traffic: 32000000000},
                {id: "sr-research-net", name: "Research-Network-Slice", endpoint: "14.14.14.14", color: 750, status: "up", paths: ["rr-zur-01->p-fra-01->pe-lon-01"], preference: 60, traffic: 5500000000},
                {id: "sr-maintenance", name: "Under-Maintenance-Policy", endpoint: "13.13.13.13", color: 999, status: "down", paths: ["p-ams-01->rr-zur-01"], preference: 10, traffic: 0},
            ],
            bgp_sessions: [
                {id: "ibgp-nyc-lax", peer_ip: "2.2.2.2", peer_as: 65001, state: "established", uptime: 2592000, routes: 485000, type: "ibgp"},
                {id: "ibgp-lon-par", peer_ip: "11.11.11.11", peer_as: 65002, state: "established", uptime: 6480000, routes: 320000, type: "ibgp"},
                {id: "ibgp-tok-sin", peer_ip: "21.21.21.21", peer_as: 65003, state: "established", uptime: 4320000, routes: 275000, type: "ibgp"},
                {id: "ebgp-na-eu-primary", peer_ip: "10.10.10.10", peer_as: 65002, state: "established", uptime: 15552000, routes: 847000, type: "ebgp"},
                {id: "ebgp-na-apac", peer_ip: "20.20.20.20", peer_as: 65003, state: "established", uptime: 10368000, routes: 695000, type: "ebgp"},
                {id: "cdn-google", peer_ip: "8.8.8.8", peer_as: 15169, state: "established", uptime: 25920000, routes: 350, type: "ebgp"},
                {id: "cdn-cloudflare", peer_ip: "1.1.1.1", peer_as: 13335, state: "established", uptime: 20736000, routes: 280, type: "ebgp"},
                {id: "ixp-london-ix", peer_ip: "195.66.224.175", peer_as: 8714, state: "established", uptime: 31536000, routes: 925000, type: "ebgp"},
            ],
            mpls_labels: [
                {label: 16001, type: "sr-node", fec: "1.1.1.1/32", next_hop: "direct", interface: "lo0"},
                {label: 16002, type: "sr-node", fec: "2.2.2.2/32", next_hop: "4.4.4.4", interface: "400GE-1/0/1"},
                {label: 17010, type: "sr-node", fec: "10.10.10.10/32", next_hop: "12.12.12.12", interface: "200GE-3/0/1"},
                {label: 18020, type: "sr-node", fec: "20.20.20.20/32", next_hop: "22.22.22.22", interface: "200GE-4/0/1"},
                {label: 24001, type: "sr-adj", fec: "adj:400GE-1/0/1->4.4.4.4", next_hop: "4.4.4.4", interface: "400GE-1/0/1"},
                {label: 300001, type: "ldp", fec: "10.1.0.0/16", next_hop: "4.4.4.4", interface: "400GE-1/0/1"},
                {label: 100001, type: "rsvp", fec: "tunnel:NYC-to-LAX-Primary", next_hop: "4.4.4.4", interface: "400GE-1/0/1"},
                {label: 500001, type: "service", fec: "L3VPN:Customer-Bank-VRF", next_hop: "4.4.4.4", interface: "400GE-1/0/1"},
            ]
        };
    }

    renderVisualization() {
        const container = document.getElementById('te-visualization');
        if (!container) return;

        // Clear existing content
        container.innerHTML = '';

        // Create SVG container using exact same structure as topology app
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 1000 500');
        svg.setAttribute('class', 'te-world-map');
        svg.setAttribute('id', 'te-topology-svg');

        // Create defs section
        const defsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        
        // Add ocean pattern (copied from topology app)
        const oceanPattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
        oceanPattern.setAttribute('id', 'te-oceanPattern');
        oceanPattern.setAttribute('x', '0');
        oceanPattern.setAttribute('y', '0');
        oceanPattern.setAttribute('width', '4');
        oceanPattern.setAttribute('height', '4');
        oceanPattern.setAttribute('patternUnits', 'userSpaceOnUse');
        
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', '2');
        circle.setAttribute('cy', '2');
        circle.setAttribute('r', '0.5');
        circle.setAttribute('fill', 'rgba(0,129,194,0.1)');
        oceanPattern.appendChild(circle);
        defsGroup.appendChild(oceanPattern);

        // Add glow filter (copied from topology app)
        const glowFilter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
        glowFilter.setAttribute('id', 'te-glow');
        
        const blur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
        blur.setAttribute('stdDeviation', '3');
        blur.setAttribute('result', 'coloredBlur');
        glowFilter.appendChild(blur);
        
        const merge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
        const mergeNode1 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
        mergeNode1.setAttribute('in', 'coloredBlur');
        const mergeNode2 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
        mergeNode2.setAttribute('in', 'SourceGraphic');
        merge.appendChild(mergeNode1);
        merge.appendChild(mergeNode2);
        glowFilter.appendChild(merge);
        defsGroup.appendChild(glowFilter);

        // Define very small arrowhead marker for TE app
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', 'te-arrowhead');
        marker.setAttribute('markerWidth', '4');
        marker.setAttribute('markerHeight', '3');
        marker.setAttribute('refX', '3');
        marker.setAttribute('refY', '1.5');
        marker.setAttribute('orient', 'auto');
        
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', '0 0, 4 1.5, 0 3');
        polygon.setAttribute('fill', '#666');
        marker.appendChild(polygon);
        defsGroup.appendChild(marker);

        // World Map using exact same approach as topology app
        const worldMapImage = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        worldMapImage.setAttribute('x', '0');
        worldMapImage.setAttribute('y', '0');
        worldMapImage.setAttribute('width', '1000');
        worldMapImage.setAttribute('height', '500');
        worldMapImage.setAttribute('href', 'world.svg');
        worldMapImage.setAttribute('preserveAspectRatio', 'xMidYMid slice');
        worldMapImage.setAttribute('opacity', '0.8');
        worldMapImage.setAttribute('class', 'te-world-map-image');

        // Network Links Layer
        const linksGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        linksGroup.setAttribute('id', 'te-networkLinks');
        linksGroup.setAttribute('class', 'te-network-links');

        // Network Devices Layer
        const nodesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        nodesGroup.setAttribute('id', 'te-networkDevices');
        nodesGroup.setAttribute('class', 'te-network-devices');

        // Add hover info group (copied from topology app)
        const hoverInfo = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        hoverInfo.setAttribute('id', 'te-hoverInfo');
        hoverInfo.style.display = 'none';
        
        const hoverRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        hoverRect.setAttribute('width', '200');
        hoverRect.setAttribute('height', '100');
        hoverRect.setAttribute('fill', 'rgba(0,0,0,0.8)');
        hoverRect.setAttribute('stroke', '#4a90e2');
        hoverRect.setAttribute('stroke-width', '1');
        hoverRect.setAttribute('rx', '5');
        hoverInfo.appendChild(hoverRect);
        
        const hoverText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        hoverText.setAttribute('id', 'te-hoverText');
        hoverText.setAttribute('fill', 'white');
        hoverText.setAttribute('font-family', 'Arial, sans-serif');
        hoverText.setAttribute('font-size', '12');
        hoverInfo.appendChild(hoverText);

        svg.appendChild(defsGroup);
        svg.appendChild(worldMapImage);
        svg.appendChild(linksGroup);
        svg.appendChild(nodesGroup);
        svg.appendChild(hoverInfo);
        container.appendChild(svg);

        // Render links
        this.renderTeLinks(linksGroup);
        
        // Render nodes
        this.renderTeNodes(nodesGroup);

        // Initialize zoom controls after rendering
        setTimeout(() => {
            this.initializeZoomControls();
        }, 100);
    }

    renderTeLinks(container) {
        this.links.forEach(link => {
            const sourceNode = this.nodes.find(n => n.id === link.source);
            const targetNode = this.nodes.find(n => n.id === link.target);
            
            if (!sourceNode || !targetNode) return;

            const sourcePos = this.getNodePosition(sourceNode);
            const targetPos = this.getNodePosition(targetNode);

            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', sourcePos.x);
            line.setAttribute('y1', sourcePos.y);
            line.setAttribute('x2', targetPos.x);
            line.setAttribute('y2', targetPos.y);
            line.setAttribute('class', `te-link te-link-${link.status}`);
            line.setAttribute('data-link-id', link.id);
            line.setAttribute('stroke-width', this.getLinkStrokeWidth(link.bandwidth));
            
            if (link.te_enabled) {
                line.setAttribute('marker-end', 'url(#te-arrowhead)');
            }

            // Add hover and click events similar to topology app
            line.addEventListener('mouseenter', (e) => this.showLinkHover(e, link, sourceNode, targetNode));
            line.addEventListener('mouseleave', this.hideNodeHover);
            line.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleLinkClick(e, link);
            });

            container.appendChild(line);

            // Add utilization indicator
            if (link.utilization > 0) {
                this.renderUtilizationIndicator(container, sourcePos, targetPos, link);
            }
        });
    }

    renderTeNodes(container) {
        this.nodes.forEach(node => {
            const pos = this.getNodePosition(node);
            
            // Node circle
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', pos.x);
            circle.setAttribute('cy', pos.y);
            circle.setAttribute('r', this.getNodeRadius(node.type));
            circle.setAttribute('class', `te-node te-node-${node.type} te-node-${node.status}`);
            circle.setAttribute('data-node-id', node.id);

            // Add hover and click events similar to topology app
            circle.addEventListener('mouseenter', (e) => this.showNodeHover(e, node));
            circle.addEventListener('mouseleave', this.hideNodeHover);
            circle.addEventListener('click', (e) => this.handleNodeClick(e, node));

            container.appendChild(circle);

            // Node type indicator
            const typeIndicator = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            typeIndicator.setAttribute('x', pos.x);
            typeIndicator.setAttribute('y', pos.y + 5);
            typeIndicator.setAttribute('text-anchor', 'middle');
            typeIndicator.setAttribute('class', 'te-node-type');
            typeIndicator.textContent = this.getNodeTypeSymbol(node.type);
            
            container.appendChild(typeIndicator);
        });
    }

    renderTeLabels(container) {
        this.nodes.forEach(node => {
            const pos = this.getNodePosition(node);
            
            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('x', pos.x);
            label.setAttribute('y', pos.y - 25);
            label.setAttribute('text-anchor', 'middle');
            label.setAttribute('class', 'te-node-label');
            label.textContent = node.name;
            
            container.appendChild(label);

            // AS Number label for routers
            if (node.as_number && node.type !== 'p') {
                const asLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                asLabel.setAttribute('x', pos.x);
                asLabel.setAttribute('y', pos.y + 40);
                asLabel.setAttribute('text-anchor', 'middle');
                asLabel.setAttribute('class', 'te-node-as');
                asLabel.textContent = `AS${node.as_number}`;
                
                container.appendChild(asLabel);
            }
        });
    }

    renderUtilizationIndicator(container, sourcePos, targetPos, link) {
        // Calculate utilization bar position
        const midX = (sourcePos.x + targetPos.x) / 2;
        const midY = (sourcePos.y + targetPos.y) / 2;
        
        // Offset perpendicular to link direction
        const dx = targetPos.x - sourcePos.x;
        const dy = targetPos.y - sourcePos.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const offsetX = (-dy / length) * 15;
        const offsetY = (dx / length) * 15;

        // Background bar
        const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bgRect.setAttribute('x', midX + offsetX - 20);
        bgRect.setAttribute('y', midY + offsetY - 3);
        bgRect.setAttribute('width', 40);
        bgRect.setAttribute('height', 6);
        bgRect.setAttribute('fill', '#e0e0e0');
        bgRect.setAttribute('rx', 3);
        container.appendChild(bgRect);

        // Utilization bar
        const utilRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        utilRect.setAttribute('x', midX + offsetX - 20);
        utilRect.setAttribute('y', midY + offsetY - 3);
        utilRect.setAttribute('width', (40 * link.utilization) / 100);
        utilRect.setAttribute('height', 6);
        utilRect.setAttribute('fill', this.getUtilizationColor(link.utilization));
        utilRect.setAttribute('rx', 3);
        container.appendChild(utilRect);

        // Utilization text
        const utilText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        utilText.setAttribute('x', midX + offsetX);
        utilText.setAttribute('y', midY + offsetY + 18);
        utilText.setAttribute('text-anchor', 'middle');
        utilText.setAttribute('class', 'te-util-text');
        utilText.textContent = `${link.utilization}%`;
        container.appendChild(utilText);
    }

    getNodePosition(node) {
        // Use geographic coordinates with world map positioning
        if (node.lat !== undefined && node.lng !== undefined) {
            return latLngToTeSVG(node.lat, node.lng);
        }
        
        // Fallback to original logic for nodes without coordinates
        const baseX = 100;
        const baseY = 100;
        const width = 1000;
        const height = 400;
        
        // Normalize longitude and latitude to 0-1 range
        const normalizedLng = (node.lng + 180) / 360;
        const normalizedLat = (90 - node.lat) / 180;
        
        return {
            x: baseX + (normalizedLng * width),
            y: baseY + (normalizedLat * height)
        };
    }

    getNodeRadius(type) {
        const radii = {
            'pe': 12,
            'p': 10,
            'rr': 14,
            'asbr': 16,
            'default': 8
        };
        return radii[type] || radii.default;
    }

    getNodeTypeSymbol(type) {
        const symbols = {
            'pe': 'PE',
            'p': 'P',
            'rr': 'RR',
            'asbr': 'BR',
            'default': '●'
        };
        return symbols[type] || symbols.default;
    }

    getLinkStrokeWidth(bandwidth) {
        if (bandwidth.includes('200G')) return 8;
        if (bandwidth.includes('100G')) return 6;
        if (bandwidth.includes('40G')) return 4;
        if (bandwidth.includes('10G')) return 2;
        return 1;
    }

    getUtilizationColor(utilization) {
        if (utilization < 30) return '#28a745';
        if (utilization < 70) return '#ffc107';
        return '#dc3545';
    }

    handleNodeClick(event, node) {
        event.stopPropagation();
        this.selectedNode = node;
        this.showNodeDetails(node);
    }

    handleLinkClick(event, link) {
        event.stopPropagation();
        this.selectedLink = link;
        this.showLinkDetails(link);
    }

    showNodeDetails(node) {
        const modal = document.getElementById('te-node-modal') || this.createNodeModal();
        
        // Populate node details with horizontal layout
        modal.querySelector('.modal-title').textContent = node.name;
        modal.querySelector('.node-details').innerHTML = `
            <div class="detail-panels-container">
                <div class="detail-group detail-panel">
                    <h4>Basic Information</h4>
                    <div class="detail-item"><strong>Type:</strong> ${node.type.toUpperCase()}</div>
                    <div class="detail-item"><strong>Status:</strong> <span class="status-${node.status}">${node.status.toUpperCase()}</span></div>
                    <div class="detail-item"><strong>Location:</strong> ${node.location}</div>
                    ${node.as_number ? `<div class="detail-item"><strong>AS Number:</strong> ${node.as_number}</div>` : ''}
                    ${node.router_id ? `<div class="detail-item"><strong>Router ID:</strong> ${node.router_id}</div>` : ''}
                </div>
                
                <div class="detail-group detail-panel">
                    <h4>BGP Information</h4>
                    <div id="node-bgp-info">Loading BGP data...</div>
                </div>
                
                <div class="detail-group detail-panel">
                    <h4>MPLS Information</h4>
                    <div id="node-mpls-info">Loading MPLS data...</div>
                </div>
            </div>
        `;
        
        modal.style.display = 'block';
        
        // Load additional data
        this.loadNodeBgpInfo(node.id);
        this.loadNodeMplsInfo(node.id);
    }

    showLinkDetails(link) {
        const modal = document.getElementById('te-link-modal') || this.createLinkModal();
        
        const sourceNode = this.nodes.find(n => n.id === link.source);
        const targetNode = this.nodes.find(n => n.id === link.target);
        
        modal.querySelector('.modal-title').textContent = `Link: ${sourceNode.name} ↔ ${targetNode.name}`;
        modal.querySelector('.link-details').innerHTML = `
            <div class="detail-group">
                <h4>Link Properties</h4>
                <div class="detail-item"><strong>Status:</strong> <span class="status-${link.status}">${link.status.toUpperCase()}</span></div>
                <div class="detail-item"><strong>Bandwidth:</strong> ${link.bandwidth}</div>
                <div class="detail-item"><strong>Utilization:</strong> ${link.utilization}%</div>
                <div class="detail-item"><strong>TE Enabled:</strong> ${link.te_enabled ? 'Yes' : 'No'}</div>
                <div class="detail-item"><strong>MPLS Enabled:</strong> ${link.mpls_enabled ? 'Yes' : 'No'}</div>
            </div>
            
            <div class="detail-group">
                <h4>Traffic Engineering</h4>
                <div class="detail-item"><strong>TE Metric:</strong> ${link.cost}</div>
                <div class="detail-item"><strong>Delay:</strong> ${link.delay}ms</div>
                <div class="utilization-bar">
                    <div class="util-bar-bg">
                        <div class="util-bar-fill" style="width: ${link.utilization}%; background: ${this.getUtilizationColor(link.utilization)}"></div>
                    </div>
                </div>
            </div>
        `;
        
        modal.style.display = 'block';
    }

    async loadNodeBgpInfo(nodeId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/bgp-sessions`);
            const sessions = await response.json();
            
            const container = document.getElementById('node-bgp-info');
            if (sessions.length > 0) {
                container.innerHTML = sessions.map(session => `
                    <div class="bgp-session">
                        <div><strong>Peer:</strong> ${session.peer_ip} (AS${session.peer_as})</div>
                        <div><strong>State:</strong> <span class="status-${session.state}">${session.state.toUpperCase()}</span></div>
                        <div><strong>Type:</strong> ${session.type.toUpperCase()}</div>
                        <div><strong>Routes:</strong> ${session.routes.toLocaleString()}</div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<div class="no-data">No BGP sessions found</div>';
            }
        } catch (error) {
            console.warn('BGP API failed, using mock data:', error);
            // Use mock BGP sessions
            const mockSessions = this.bgpSessions.slice(0, 3); // Show first 3 sessions
            const container = document.getElementById('node-bgp-info');
            if (mockSessions.length > 0) {
                container.innerHTML = mockSessions.map(session => `
                    <div class="bgp-session">
                        <div><strong>Peer:</strong> ${session.peer_ip} (AS${session.peer_as})</div>
                        <div><strong>State:</strong> <span class="status-${session.state}">${session.state.toUpperCase()}</span></div>
                        <div><strong>Type:</strong> ${session.type.toUpperCase()}</div>
                        <div><strong>Routes:</strong> ${session.routes.toLocaleString()}</div>
                    </div>
                `).join('');
            }
        }
    }

    async loadNodeMplsInfo(nodeId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/mpls-labels`);
            const labels = await response.json();
            
            const container = document.getElementById('node-mpls-info');
            if (labels.length > 0) {
                container.innerHTML = labels.map(label => `
                    <div class="mpls-label">
                        <div><strong>Label:</strong> ${label.label}</div>
                        <div><strong>FEC:</strong> ${label.fec}</div>
                        <div><strong>Type:</strong> ${label.type}</div>
                        <div><strong>Next Hop:</strong> ${label.next_hop}</div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<div class="no-data">No MPLS labels found</div>';
            }
        } catch (error) {
            console.warn('MPLS API failed, using mock data:', error);
            // Use mock MPLS labels
            const mockLabels = this.mplsLabels.slice(0, 4); // Show first 4 labels
            const container = document.getElementById('node-mpls-info');
            if (mockLabels.length > 0) {
                container.innerHTML = mockLabels.map(label => `
                    <div class="mpls-label">
                        <div><strong>Label:</strong> ${label.label}</div>
                        <div><strong>FEC:</strong> ${label.fec}</div>
                        <div><strong>Type:</strong> ${label.type}</div>
                        <div><strong>Next Hop:</strong> ${label.next_hop}</div>
                    </div>
                `).join('');
            }
        }
    }

    // Zoom control functions
    zoomIn() {
        if (this.currentZoom < 3) { // Max zoom 300%
            this.currentZoom += 0.25;
            this.applyZoom();
            this.showNotification(`🔍 Zoomed to ${Math.round(this.currentZoom * 100)}%`, 'info');
        }
    }

    zoomOut() {
        if (this.currentZoom > 0.5) { // Min zoom 50%
            this.currentZoom -= 0.25;
            this.applyZoom();
            this.showNotification(`🔍 Zoomed to ${Math.round(this.currentZoom * 100)}%`, 'info');
        }
    }

    resetZoom() {
        this.currentZoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.applyZoom();
        this.showNotification('⚡ Zoom reset to 100%', 'info');
    }

    centerMap() {
        this.currentZoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.applyZoom();
        this.showNotification('🌍 Map centered and reset', 'info');
    }

    applyZoom() {
        const svg = document.getElementById('te-topology-svg');
        if (svg) {
            const transform = `scale(${this.currentZoom}) translate(${this.panX}px, ${this.panY}px)`;
            svg.style.transform = transform;
        }
        
        // Update cursor based on zoom level
        const mapContainer = document.getElementById('te-visualization');
        if (mapContainer && !this.isDragging) {
            mapContainer.style.cursor = this.currentZoom > 1 ? 'grab' : 'default';
        }
    }

    // Pan/drag functionality
    initializeZoomControls() {
        const mapContainer = document.getElementById('te-visualization');
        if (mapContainer) {
            // Mouse wheel zoom
            mapContainer.addEventListener('wheel', (e) => {
                e.preventDefault();
                if (e.deltaY < 0) {
                    this.zoomIn();
                } else {
                    this.zoomOut();
                }
            });

            // Mouse drag events
            mapContainer.addEventListener('mousedown', (e) => this.startDrag(e));
            mapContainer.addEventListener('mousemove', (e) => this.dragMap(e));
            mapContainer.addEventListener('mouseup', () => this.stopDrag());
            mapContainer.addEventListener('mouseleave', () => this.stopDrag());

            // Touch events for mobile support
            mapContainer.addEventListener('touchstart', (e) => this.startTouchDrag(e));
            mapContainer.addEventListener('touchmove', (e) => this.dragMapTouch(e));
            mapContainer.addEventListener('touchend', () => this.stopDrag());

            // Prevent context menu on right click during drag
            mapContainer.addEventListener('contextmenu', (e) => {
                if (this.isDragging) {
                    e.preventDefault();
                }
            });

            // Change cursor style when dragging
            mapContainer.style.cursor = 'grab';
        }
    }

    startDrag(e) {
        // Only start dragging if zoomed in (when panning is useful)
        if (this.currentZoom <= 1) return;
        
        this.isDragging = true;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        this.dragStartPanX = this.panX;
        this.dragStartPanY = this.panY;
        
        const mapContainer = document.getElementById('te-visualization');
        if (mapContainer) {
            mapContainer.style.cursor = 'grabbing';
        }
        
        e.preventDefault();
    }

    dragMap(e) {
        if (!this.isDragging) return;
        
        const deltaX = (e.clientX - this.dragStartX) / this.currentZoom;
        const deltaY = (e.clientY - this.dragStartY) / this.currentZoom;
        
        this.panX = this.dragStartPanX + deltaX;
        this.panY = this.dragStartPanY + deltaY;
        
        // Apply pan limits to keep content visible
        this.applyPanLimits();
        this.applyZoom();
        
        e.preventDefault();
    }

    stopDrag() {
        if (this.isDragging) {
            this.isDragging = false;
            const mapContainer = document.getElementById('te-visualization');
            if (mapContainer) {
                mapContainer.style.cursor = this.currentZoom > 1 ? 'grab' : 'default';
            }
        }
    }

    startTouchDrag(e) {
        // Only start dragging if zoomed in (when panning is useful)
        if (this.currentZoom <= 1 || e.touches.length !== 1) return;
        
        const touch = e.touches[0];
        this.isDragging = true;
        this.dragStartX = touch.clientX;
        this.dragStartY = touch.clientY;
        this.dragStartPanX = this.panX;
        this.dragStartPanY = this.panY;
        
        e.preventDefault();
    }

    dragMapTouch(e) {
        if (!this.isDragging || e.touches.length !== 1) return;
        
        const touch = e.touches[0];
        const deltaX = (touch.clientX - this.dragStartX) / this.currentZoom;
        const deltaY = (touch.clientY - this.dragStartY) / this.currentZoom;
        
        this.panX = this.dragStartPanX + deltaX;
        this.panY = this.dragStartPanY + deltaY;
        
        // Apply pan limits to keep content visible
        this.applyPanLimits();
        this.applyZoom();
        
        e.preventDefault();
    }

    applyPanLimits() {
        // Get container dimensions
        const mapContainer = document.getElementById('te-visualization');
        if (!mapContainer) return;
        
        const containerRect = mapContainer.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const containerHeight = containerRect.height;
        
        // Calculate scaled map dimensions (viewBox is 1000x500)
        const scaledMapWidth = 1000 * this.currentZoom;
        const scaledMapHeight = 500 * this.currentZoom;
        
        // Calculate maximum pan offsets to keep some content visible
        const maxPanX = Math.max(0, (scaledMapWidth - containerWidth) / 2 / this.currentZoom);
        const maxPanY = Math.max(0, (scaledMapHeight - containerHeight) / 2 / this.currentZoom);
        
        // Apply limits
        this.panX = Math.max(-maxPanX, Math.min(maxPanX, this.panX));
        this.panY = Math.max(-maxPanY, Math.min(maxPanY, this.panY));
    }

    showNodeHover(event, node) {
        const hoverInfo = document.getElementById('te-hoverInfo');
        const hoverText = document.getElementById('te-hoverText');
        
        if (hoverInfo && hoverText) {
            hoverText.innerHTML = `
                <tspan x="10" y="20" font-weight="bold">${node.name}</tspan>
                <tspan x="10" y="35">Type: ${node.type.toUpperCase()}</tspan>
                <tspan x="10" y="50">Status: ${node.status.toUpperCase()}</tspan>
                <tspan x="10" y="65">Location: ${node.location}</tspan>
                ${node.as_number ? `<tspan x="10" y="80">AS: ${node.as_number}</tspan>` : ''}
            `;
            
            hoverInfo.setAttribute('transform', `translate(${event.target.getAttribute('cx') - 100}, ${event.target.getAttribute('cy') - 120})`);
            hoverInfo.style.display = 'block';
        }
    }

    showLinkHover(event, link, sourceNode, targetNode) {
        const hoverInfo = document.getElementById('te-hoverInfo');
        const hoverText = document.getElementById('te-hoverText');
        
        if (hoverInfo && hoverText) {
            hoverText.innerHTML = `
                <tspan x="10" y="20" font-weight="bold">Network Link</tspan>
                <tspan x="10" y="35">From: ${sourceNode.name}</tspan>
                <tspan x="10" y="50">To: ${targetNode.name}</tspan>
                <tspan x="10" y="65">Bandwidth: ${link.bandwidth}</tspan>
                <tspan x="10" y="80">Status: ${link.status.toUpperCase()}</tspan>
            `;
            
            const x = (parseFloat(event.target.getAttribute('x1')) + parseFloat(event.target.getAttribute('x2'))) / 2;
            const y = (parseFloat(event.target.getAttribute('y1')) + parseFloat(event.target.getAttribute('y2'))) / 2;
            
            hoverInfo.setAttribute('transform', `translate(${x - 100}, ${y - 120})`);
            hoverInfo.style.display = 'block';
        }
    }

    hideNodeHover() {
        const hoverInfo = document.getElementById('te-hoverInfo');
        if (hoverInfo) {
            hoverInfo.style.display = 'none';
        }
    }


    createNodeModal() {
        const modal = document.createElement('div');
        modal.id = 'te-node-modal';
        modal.className = 'te-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Node Details</h3>
                    <button class="close-btn" onclick="this.closest('.te-modal').style.display='none'">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="node-details"></div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        return modal;
    }

    createLinkModal() {
        const modal = document.createElement('div');
        modal.id = 'te-link-modal';
        modal.className = 'te-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Link Details</h3>
                    <button class="close-btn" onclick="this.closest('.te-modal').style.display='none'">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="link-details"></div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        return modal;
    }

    setupEventListeners() {
        // Close modals when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('te-modal')) {
                e.target.style.display = 'none';
            }
        });

        // View switcher
        document.addEventListener('change', (e) => {
            if (e.target.id === 'te-view-selector') {
                this.switchView(e.target.value);
            }
        });

        // Refresh button
        document.addEventListener('click', (e) => {
            if (e.target.id === 'refresh-te-data') {
                this.refreshData();
            }
        });

        // Policy panel controls
        document.addEventListener('click', (e) => {
            if (e.target.id === 'toggle-all-policies') {
                this.toggleAllPolicies();
            } else if (e.target.id === 'clear-policy-highlights') {
                this.clearAllPolicyHighlights();
            }
        });
    }

    switchView(view) {
        this.activeView = view;
        
        // Update visualization based on view
        switch (view) {
            case 'topology':
                this.showTopologyView();
                break;
            case 'sr-policies':
                this.showSrPoliciesView();
                break;
            case 'bgp':
                this.showBgpView();
                break;
            case 'mpls':
                this.showMplsView();
                break;
        }
    }

    showTopologyView() {
        // Default topology view - already implemented
        this.renderVisualization();
    }

    async showSrPoliciesView() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/sr-policies`);
            const policies = await response.json();
            
            // Render SR policies overlay
            this.renderSrPoliciesOverlay(policies);
        } catch (error) {
            console.warn('SR Policies API failed, using mock data:', error);
            // Use mock SR policies
            this.renderSrPoliciesOverlay(this.srPolicies);
        }
    }

    renderSrPoliciesOverlay(policies) {
        const svg = document.getElementById('te-topology-svg');
        const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        overlay.setAttribute('id', 'sr-policies-overlay');
        
        // Remove existing overlay
        const existing = document.getElementById('sr-policies-overlay');
        if (existing) existing.remove();
        
        policies.forEach((policy, index) => {
            const color = this.getSrPolicyColor(index);
            
            // Draw policy paths
            policy.paths.forEach(pathStr => {
                const path = pathStr.split('->');
                for (let i = 0; i < path.length - 1; i++) {
                    const sourceNode = this.nodes.find(n => n.id === path[i]);
                    const targetNode = this.nodes.find(n => n.id === path[i + 1]);
                    
                    if (sourceNode && targetNode) {
                        const sourcePos = this.getNodePosition(sourceNode);
                        const targetPos = this.getNodePosition(targetNode);
                        
                        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                        line.setAttribute('x1', sourcePos.x);
                        line.setAttribute('y1', sourcePos.y);
                        line.setAttribute('x2', targetPos.x);
                        line.setAttribute('y2', targetPos.y);
                        line.setAttribute('stroke', color);
                        line.setAttribute('stroke-width', '3');
                        line.setAttribute('stroke-dasharray', '5,5');
                        line.setAttribute('class', 'sr-policy-path');
                        
                        overlay.appendChild(line);
                    }
                }
            });
        });
        
        svg.appendChild(overlay);
    }

    getSrPolicyColor(index) {
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#ff7675', '#74b9ff', '#00b894', '#fdcb6e', '#e17055'];
        return colors[index % colors.length];
    }


    renderPoliciesPanel() {
        const container = document.getElementById('te-policies-content');
        if (!container) return;

        container.innerHTML = '';

        if (!this.srPolicies || this.srPolicies.length === 0) {
            container.innerHTML = '<div class="no-data">No SR Policies available</div>';
            return;
        }

        this.srPolicies.forEach((policy, index) => {
            const policyElement = this.createPolicyElement(policy, index);
            container.appendChild(policyElement);
        });
    }

    createPolicyElement(policy, index) {
        const div = document.createElement('div');
        div.className = 'te-policy-item';
        div.setAttribute('data-policy-id', policy.id);

        const colorIndicator = this.getSrPolicyColor(index);
        const trafficMbps = Math.round(policy.traffic / 1000000);

        div.innerHTML = `
            <div class="te-policy-name">
                <span>
                    <span class="te-policy-color-indicator" style="background-color: ${colorIndicator}"></span>
                    ${policy.name}
                </span>
                <span class="te-policy-status ${policy.status}">${policy.status.toUpperCase()}</span>
            </div>
            <div class="te-policy-details">
                <div>Endpoint: <span class="te-policy-endpoint">${policy.endpoint}</span></div>
                <div>Color: ${policy.color} | Preference: ${policy.preference}</div>
            </div>
            <div class="te-policy-metrics">
                <div class="te-policy-metric">
                    <span class="te-policy-metric-label">Traffic</span>
                    <span class="te-policy-metric-value">${trafficMbps}M</span>
                </div>
                <div class="te-policy-metric">
                    <span class="te-policy-metric-label">Paths</span>
                    <span class="te-policy-metric-value">${policy.paths.length}</span>
                </div>
            </div>
            <div class="te-policy-paths">
                ${policy.paths.map((path, pathIndex) => `
                    <div class="te-policy-path">Path ${pathIndex + 1}: ${path.replace(/->/, ' → ')}</div>
                `).join('')}
            </div>
        `;

        // Add click event listener
        div.addEventListener('click', (e) => this.handlePolicyClick(policy, index, e));
        
        return div;
    }

    handlePolicyClick(policy, index, event) {
        event.stopPropagation();
        
        // Toggle policy selection
        if (this.selectedPolicy && this.selectedPolicy.id === policy.id) {
            // Deselect current policy
            this.selectedPolicy = null;
            this.clearPolicyHighlight();
            this.removePolicySelection();
        } else {
            // Select new policy
            this.selectedPolicy = policy;
            this.clearPolicyHighlight();
            this.highlightPolicyPaths(policy, index);
            this.updatePolicySelection(policy.id);
        }
    }

    highlightPolicyPaths(policy, index) {
        const svg = document.getElementById('te-topology-svg');
        if (!svg) return;

        // Remove existing policy highlights
        const existingHighlights = svg.querySelectorAll('.policy-path-highlight');
        existingHighlights.forEach(el => el.remove());

        const color = this.getSrPolicyColor(index);

        policy.paths.forEach((pathStr, pathIndex) => {
            const path = pathStr.split('->');
            for (let i = 0; i < path.length - 1; i++) {
                const sourceNode = this.nodes.find(n => n.id === path[i]);
                const targetNode = this.nodes.find(n => n.id === path[i + 1]);
                
                if (sourceNode && targetNode) {
                    const sourcePos = this.getNodePosition(sourceNode);
                    const targetPos = this.getNodePosition(targetNode);
                    
                    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    line.setAttribute('x1', sourcePos.x);
                    line.setAttribute('y1', sourcePos.y);
                    line.setAttribute('x2', targetPos.x);
                    line.setAttribute('y2', targetPos.y);
                    line.setAttribute('stroke', color);
                    line.setAttribute('stroke-width', '4');
                    line.setAttribute('stroke-opacity', '0.8');
                    line.setAttribute('stroke-dasharray', '8,4');
                    line.setAttribute('class', 'policy-path-highlight');
                    line.setAttribute('data-policy-id', policy.id);
                    
                    // Add animation
                    const animate = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
                    animate.setAttribute('attributeName', 'stroke-dashoffset');
                    animate.setAttribute('values', '0;12;0');
                    animate.setAttribute('dur', '2s');
                    animate.setAttribute('repeatCount', 'indefinite');
                    line.appendChild(animate);
                    
                    svg.appendChild(line);
                }
            }
        });
    }

    clearPolicyHighlight() {
        const svg = document.getElementById('te-topology-svg');
        if (svg) {
            const highlights = svg.querySelectorAll('.policy-path-highlight');
            highlights.forEach(el => el.remove());
        }
    }

    updatePolicySelection(policyId) {
        // Remove existing selection
        document.querySelectorAll('.te-policy-item.active').forEach(el => {
            el.classList.remove('active');
        });
        
        // Add selection to clicked policy
        const policyElement = document.querySelector(`[data-policy-id="${policyId}"]`);
        if (policyElement) {
            policyElement.classList.add('active');
        }
    }

    removePolicySelection() {
        document.querySelectorAll('.te-policy-item.active').forEach(el => {
            el.classList.remove('active');
        });
    }

    toggleAllPolicies() {
        const button = document.getElementById('toggle-all-policies');
        const svg = document.getElementById('te-topology-svg');
        
        if (!svg) return;

        const existingHighlights = svg.querySelectorAll('.policy-path-highlight');
        
        if (existingHighlights.length > 0) {
            // Clear all highlights
            this.clearPolicyHighlight();
            this.removePolicySelection();
            this.selectedPolicy = null;
            button.textContent = 'Show All';
        } else {
            // Show all policies
            this.srPolicies.forEach((policy, index) => {
                this.highlightPolicyPaths(policy, index);
            });
            button.textContent = 'Hide All';
        }
    }

    clearAllPolicyHighlights() {
        this.clearPolicyHighlight();
        this.removePolicySelection();
        this.selectedPolicy = null;
        
        const button = document.getElementById('toggle-all-policies');
        if (button) {
            button.textContent = 'Show All';
        }
    }

    async refreshData() {
        this.showNotification('Refreshing TE data...', 'info');
        try {
            await this.loadTopologyData();
            this.renderVisualization();
            this.renderPoliciesPanel();
            this.updateStats();
            this.clearAllPolicyHighlights(); // Clear any existing highlights
            this.showNotification('TE data refreshed successfully', 'success');
        } catch (error) {
            this.showNotification('Failed to refresh TE data', 'error');
        }
    }

    updateStats() {
        // Update statistics in the UI
        const statsContainer = document.getElementById('te-stats');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="stat-item">
                    <div class="stat-value">${this.nodes.length}</div>
                    <div class="stat-label">Routers</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${this.links.length}</div>
                    <div class="stat-label">Links</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${this.srPolicies.length}</div>
                    <div class="stat-label">SR Policies</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${this.bgpSessions.length}</div>
                    <div class="stat-label">BGP Sessions</div>
                </div>
            `;
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `te-notification te-notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize TE App when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the TE page
    if (document.getElementById('te-visualization')) {
        window.teApp = new TrafficEngineeringApp();
    }
});

// Helper functions for integration
function initializeTrafficEngineering() {
    if (!window.teApp) {
        window.teApp = new TrafficEngineeringApp();
    }
}

function refreshTeData() {
    if (window.teApp) {
        window.teApp.refreshData();
    }
}

function switchTeView(view) {
    if (window.teApp) {
        window.teApp.switchView(view);
    }
}

// Zoom control functions for TE map
function teZoomIn() {
    if (window.teApp) {
        window.teApp.zoomIn();
    }
}

function teZoomOut() {
    if (window.teApp) {
        window.teApp.zoomOut();
    }
}

function teResetZoom() {
    if (window.teApp) {
        window.teApp.resetZoom();
    }
}

function teCenterMap() {
    if (window.teApp) {
        window.teApp.centerMap();
    }
}