// Alarms Management Functions

// Sample data for demonstration (replace with API calls)
let alarmsData = [];

async function loadAlarms() {
    showLoading('alarmsLoading');
    
    try {
        // Replace with actual API call
        // const response = await fetch(`${API_BASE_URL}/alarms`);
        // alarmsData = await response.json();
        
        // Sample data
        alarmsData = [
            {
                id: 1,
                severity: 'Critical',
                timestamp: '2025-08-03 14:25:00',
                device: 'Firewall-Main',
                type: 'Performance',
                description: 'High CPU utilization detected (89%)',
                status: 'Active',
                duration: '25m'
            },
            {
                id: 2,
                severity: 'Critical',
                timestamp: '2025-08-03 12:15:30',
                device: 'Access-Point-15',
                type: 'Connectivity',
                description: 'Device unreachable - Connection timeout',
                status: 'Active',
                duration: '2h 15m'
            },
            {
                id: 3,
                severity: 'Major',
                timestamp: '2025-08-03 13:45:12',
                device: 'Edge-Router-02',
                type: 'Performance',
                description: 'Memory usage above threshold (78%)',
                status: 'Active',
                duration: '45m'
            },
            {
                id: 4,
                severity: 'Minor',
                timestamp: '2025-08-03 14:20:00',
                device: 'Core-Switch-01',
                type: 'Interface',
                description: 'Interface Gi1/0/24 flapping detected',
                status: 'Active',
                duration: '10m'
            },
            {
                id: 5,
                severity: 'Warning',
                timestamp: '2025-08-03 11:30:00',
                device: 'Core-Switch-01',
                type: 'Environmental',
                description: 'Temperature sensor reading: 42°C',
                status: 'Acknowledged',
                duration: '3h'
            }
        ];

        renderAlarmsTable();
    } catch (error) {
        console.error('Error loading alarms:', error);
    } finally {
        hideLoading('alarmsLoading');
    }
}

function renderAlarmsTable() {
    const tbody = document.getElementById('alarmsTableBody');
    tbody.innerHTML = '';

    alarmsData.forEach(alarm => {
        const row = document.createElement('tr');
        const severityClass = `severity-${alarm.severity.toLowerCase()}`;
        row.className = 'alarm-row';
        row.style.cursor = 'pointer';
        row.onclick = () => showAlarmDetails(alarm);

        row.innerHTML = `
            <td class="${severityClass}">${alarm.severity}</td>
            <td>${alarm.timestamp}</td>
            <td>${alarm.device}</td>
            <td>${alarm.type}</td>
            <td>${alarm.description}</td>
            <td>${alarm.status}</td>
            <td>${alarm.duration}</td>
        `;

        tbody.appendChild(row);
    });
}

function closeAlarmModal() {
    document.getElementById('alarmModal').style.display = 'none';
}

function generateAlarmAggregation(alarm) {
    // Generate sample aggregated data based on alarm
    const aggregation = {
        name: `${alarm.type} Alarm on ${alarm.device}`,
        type: 'root-alarm',
        severity: alarm.severity,
        details: `Root cause alarm - ${alarm.description}`,
        status: alarm.status,
        children: []
    };

    // Generate related alarms
    if (alarm.severity === 'Critical') {
        aggregation.children = [
            {
                name: 'Interface Connectivity Issues',
                type: 'related-alarm',
                severity: 'Major',
                details: 'Secondary alarm triggered by main issue',
                status: 'Active',
                children: [
                    {
                        name: 'Link Down Event - Interface Gi1/0/24',
                        type: 'event',
                        severity: 'Warning',
                        details: 'Interface state changed to down',
                        status: 'Acknowledged',
                        timestamp: '2025-08-03 14:25:15'
                    },
                    {
                        name: 'SNMP Timeout Event',
                        type: 'event',
                        severity: 'Minor',
                        details: 'SNMP polling timeout detected',
                        status: 'Active',
                        timestamp: '2025-08-03 14:25:30'
                    }
                ]
            },
            {
                name: 'Performance Degradation',
                type: 'related-alarm',
                severity: 'Minor',
                details: 'System performance impact detected',
                status: 'Active',
                children: [
                    {
                        name: 'Memory Usage Spike Event',
                        type: 'event',
                        severity: 'Warning',
                        details: 'Memory usage exceeded 85% threshold',
                        status: 'Active',
                        timestamp: '2025-08-03 14:26:00'
                    },
                    {
                        name: 'Response Time Degradation Event',
                        type: 'event',
                        severity: 'Minor',
                        details: 'Average response time increased by 200ms',
                        status: 'Active',
                        timestamp: '2025-08-03 14:26:30'
                    }
                ]
            }
        ];
    } else if (alarm.severity === 'Major') {
        aggregation.children = [
            {
                name: 'Resource Threshold Violations',
                type: 'related-alarm',
                severity: 'Minor',
                details: 'Resource utilization approaching limits',
                status: 'Active',
                children: [
                    {
                        name: 'Memory Threshold Event',
                        type: 'event',
                        severity: 'Warning',
                        details: 'Memory usage above 75% for 5 minutes',
                        status: 'Active',
                        timestamp: '2025-08-03 13:45:20'
                    }
                ]
            }
        ];
    } else {
        aggregation.children = [
            {
                name: 'Supporting Events',
                type: 'event-group',
                severity: 'Info',
                details: 'Related system events',
                status: 'Informational',
                children: [
                    {
                        name: 'Configuration Change Event',
                        type: 'event',
                        severity: 'Info',
                        details: 'System configuration was modified',
                        status: 'Closed',
                        timestamp: '2025-08-03 14:20:10'
                    }
                ]
            }
        ];
    }

    return aggregation;
}

function showAlarmDetails(alarm) {
    document.getElementById('modalAlarmTitle').textContent = `${alarm.severity} Alarm - ${alarm.device}`;
    
    // Set severity color for the floating title
    const alarmInfoSection = document.querySelector('.alarm-info-section');
    let severityColor;
    switch(alarm.severity.toLowerCase()) {
        case 'critical':
            severityColor = '#dc3545';
            break;
        case 'major':
            severityColor = '#fd7e14';
            break;
        case 'minor':
            severityColor = '#ffc107';
            break;
        case 'warning':
            severityColor = '#ffc107';
            break;
        default:
            severityColor = '#0081c2';
    }
    alarmInfoSection.style.setProperty('--alarm-severity-color', severityColor);
    
    // Populate Alarm Info section
    document.getElementById('alarmInfoContent').innerHTML = `
        <div class="detail-item">
            <span class="detail-label">Severity:</span>
            <span class="detail-value severity-${alarm.severity.toLowerCase()}">${alarm.severity}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Timestamp:</span>
            <span class="detail-value">${alarm.timestamp}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Device:</span>
            <span class="detail-value">${alarm.device}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Type:</span>
            <span class="detail-value">${alarm.type}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Description:</span>
            <span class="detail-value">${alarm.description}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Status:</span>
            <span class="detail-value">${alarm.status}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Duration:</span>
            <span class="detail-value">${alarm.duration}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Alarm ID:</span>
            <span class="detail-value">${alarm.id}</span>
        </div>
    `;
    
    // Populate Aggregation section
    const aggregationData = generateAlarmAggregation(alarm);
    const treeHtml = `<ul class="tree-node">${createTreeNode(aggregationData)}</ul>`;
    document.getElementById('alarmAggregationContent').innerHTML = treeHtml;
    
    document.getElementById('alarmModal').style.display = 'block';
}

function showCriticalAlarms() {
    const tbody = document.getElementById('alarmsTableBody');
    const rows = tbody.querySelectorAll('tr');
    
    rows.forEach(row => {
        const severityCell = row.querySelector('td').textContent.toLowerCase();
        if (severityCell.includes('critical')) {
            row.style.display = '';
            row.style.backgroundColor = 'rgba(244, 67, 54, 0.1)';
            setTimeout(() => {
                row.style.backgroundColor = '';
            }, 2000);
        } else {
            row.style.display = 'none';
        }
    });
    
    // Scroll to alarms table
    document.getElementById('alarmsTable').scrollIntoView({ behavior: 'smooth' });
}

function showAllAlarms() {
    const tbody = document.getElementById('alarmsTableBody');
    const rows = tbody.querySelectorAll('tr');
    
    rows.forEach(row => {
        row.style.display = '';
    });
    
    // Scroll to alarms table
    document.getElementById('alarmsTable').scrollIntoView({ behavior: 'smooth' });
}

function refreshAlarms() {
    loadAlarms();
}