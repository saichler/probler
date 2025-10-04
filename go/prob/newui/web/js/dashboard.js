// Dashboard Section Module

// Initialize Dashboard
function initializeDashboard() {
    // Add parallax scrolling effect to dashboard hero
    const sectionContainer = document.querySelector('.dashboard-section');
    const heroBackground = document.querySelector('.hero-background');
    const heroContent = document.querySelector('.hero-content');

    if (sectionContainer && heroBackground && heroContent) {
        sectionContainer.addEventListener('scroll', function() {
            const scrollPosition = this.scrollTop;

            // Parallax effect on hero background (slower scroll)
            heroBackground.style.transform = `translateY(${scrollPosition * 0.5}px)`;

            // Fade out hero content as user scrolls
            const opacity = Math.max(0, 1 - (scrollPosition / 200));
            heroContent.style.opacity = opacity;

            // Slight zoom effect on illustration
            const scale = 1 + (scrollPosition * 0.0005);
            heroBackground.style.transform = `translateY(${scrollPosition * 0.5}px) scale(${scale})`;
        });
    }

    // Sample alarm data
    const alarmsData = [
        { timestamp: '2025-10-01 14:32:15', severity: 'CRITICAL', device: 'DC1-CORE-SW-01', type: 'Network', message: 'High CPU utilization (98%)', location: 'Dallas DC1 - Rack A12' },
        { timestamp: '2025-10-01 14:28:42', severity: 'CRITICAL', device: 'DC2-GPU-NODE-47', type: 'GPU', message: 'Temperature threshold exceeded (92°C)', location: 'Austin DC2 - Rack B08' },
        { timestamp: '2025-10-01 14:25:18', severity: 'WARNING', device: 'DC1-ESX-HOST-22', type: 'Host', message: 'Memory usage high (87%)', location: 'Dallas DC1 - Rack C15' },
        { timestamp: '2025-10-01 14:21:05', severity: 'CRITICAL', device: 'DC3-STORAGE-ARRAY-3', type: 'Storage', message: 'RAID degraded - Drive failure detected', location: 'Houston DC3 - Rack D04' },
        { timestamp: '2025-10-01 14:18:33', severity: 'WARNING', device: 'DC2-FW-01', type: 'Network', message: 'Bandwidth utilization (85%)', location: 'Austin DC2 - Rack A01' },
        { timestamp: '2025-10-01 14:15:27', severity: 'CRITICAL', device: 'DC1-K8S-MASTER-02', type: 'Kubernetes', message: 'Node unreachable - Connection timeout', location: 'Dallas DC1 - Rack E09' },
        { timestamp: '2025-10-01 14:12:44', severity: 'WARNING', device: 'DC3-UPS-MAIN', type: 'Power', message: 'Battery capacity low (45%)', location: 'Houston DC3 - Power Room' },
        { timestamp: '2025-10-01 14:09:15', severity: 'WARNING', device: 'DC2-HVAC-UNIT-3', type: 'Cooling', message: 'Temperature rising (28°C)', location: 'Austin DC2 - HVAC Zone 3' },
        { timestamp: '2025-10-01 14:05:52', severity: 'CRITICAL', device: 'DC1-GPU-NODE-128', type: 'GPU', message: 'GPU process crashed - Restarting', location: 'Dallas DC1 - Rack B22' },
        { timestamp: '2025-10-01 14:02:31', severity: 'WARNING', device: 'DC3-SPINE-SW-02', type: 'Network', message: 'Link flapping detected on port 48', location: 'Houston DC3 - Rack A05' },
        { timestamp: '2025-10-01 13:58:16', severity: 'CRITICAL', device: 'DC2-SAN-SWITCH-01', type: 'Storage', message: 'Fiber channel error rate high', location: 'Austin DC2 - Rack D12' },
        { timestamp: '2025-10-01 13:54:42', severity: 'WARNING', device: 'DC1-ESX-HOST-45', type: 'Host', message: 'Disk latency warning (35ms)', location: 'Dallas DC1 - Rack C28' },
        { timestamp: '2025-10-01 13:51:08', severity: 'CRITICAL', device: 'DC3-CORE-RTR-01', type: 'Network', message: 'BGP session down with peer', location: 'Houston DC3 - Rack A02' },
        { timestamp: '2025-10-01 13:47:29', severity: 'WARNING', device: 'DC2-PDU-B-07', type: 'Power', message: 'Power load imbalance (L1:92%, L2:65%)', location: 'Austin DC2 - Rack B07' },
        { timestamp: '2025-10-01 13:43:55', severity: 'WARNING', device: 'DC1-VM-WEB-PROD-12', type: 'Virtual Machine', message: 'CPU ready time high (12%)', location: 'Dallas DC1 - Cluster 2' },
        { timestamp: '2025-10-01 13:40:21', severity: 'CRITICAL', device: 'DC2-STORAGE-ARRAY-7', type: 'Storage', message: 'Volume approaching capacity (95%)', location: 'Austin DC2 - Rack D18' },
        { timestamp: '2025-10-01 13:36:47', severity: 'WARNING', device: 'DC3-GPU-NODE-89', type: 'GPU', message: 'Memory bandwidth saturation (91%)', location: 'Houston DC3 - Rack B15' },
        { timestamp: '2025-10-01 13:33:12', severity: 'CRITICAL', device: 'DC1-K8S-WORKER-34', type: 'Kubernetes', message: 'Pod eviction - Out of memory', location: 'Dallas DC1 - Rack E14' },
        { timestamp: '2025-10-01 13:29:38', severity: 'WARNING', device: 'DC2-ACCESS-SW-19', type: 'Network', message: 'Port error counter increasing', location: 'Austin DC2 - Rack C09' },
        { timestamp: '2025-10-01 13:26:04', severity: 'WARNING', device: 'DC3-ESX-HOST-67', type: 'Host', message: 'Storage path redundancy lost', location: 'Houston DC3 - Rack C31' }
    ];

    // Initialize the alarms table
    const alarmsTable = new ProblerTable('alarms-table', {
        columns: [
            { key: 'timestamp', label: 'Timestamp' },
            { key: 'severity', label: 'Severity' },
            { key: 'device', label: 'Device' },
            { key: 'type', label: 'Type' },
            { key: 'message', label: 'Message' },
            { key: 'location', label: 'Location' }
        ],
        data: alarmsData,
        rowsPerPage: 15,
        sortable: true,
        filterable: true,
        statusColumn: 'severity'
    });
}
