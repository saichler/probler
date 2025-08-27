// Application Management Functions

// Switch between applications
function switchApp(appName) {
    // Hide all app content
    const allApps = document.querySelectorAll('.app-content');
    allApps.forEach(app => app.classList.remove('active'));
    
    // Remove active class from all buttons (support both old and new classes)
    const allButtons = document.querySelectorAll('.app-button, .app-tab-button');
    allButtons.forEach(button => button.classList.remove('active'));
    
    // Show selected app content
    const selectedApp = document.getElementById(`${appName}-app`);
    if (selectedApp) {
        selectedApp.classList.add('active');
    }
    
    // Add active class to clicked button
    if (event && event.target) {
        const button = event.target.closest('.app-button') || event.target.closest('.app-tab-button');
        if (button) {
            button.classList.add('active');
        }
    }
    
    // Initialize specific apps when opened
    if (appName === 'topology') {
        initializeTopology();
        // Initialize zoom controls after a short delay to ensure DOM is ready
        setTimeout(() => {
            initializeZoomControls();
        }, 100);
    } else if (appName === 'health') {
        // Initialize System Health app
        if (typeof initServicesApp === 'function') {
            setTimeout(() => {
                initServicesApp();
            }, 100);
        }
    } else if (appName === 'kubernetes') {
        // Initialize Kubernetes app
        if (typeof initKubernetesApp === 'function') {
            setTimeout(() => {
                initKubernetesApp();
            }, 100);
        }
    } else if (appName === 'traffic-engineering') {
        // Initialize Traffic Engineering app
        if (typeof initializeTrafficEngineering === 'function') {
            setTimeout(() => {
                initializeTrafficEngineering();
            }, 100);
        }
    }
    
    // Show notification for non-dashboard apps
    if (appName !== 'dashboard') {
        const appMap = {
            'devices': 'Network Devices Manager',
            'topology': 'Network Topology Viewer',
            'bandwidth': 'Bandwidth Monitor',
            'config': 'Configuration Manager',
            'security': 'Security Center',
            'reports': 'Reports Dashboard',
            'tools': 'Network Tools Suite',
            'automation': 'Automation Hub',
            'health': 'System Health Monitor',
            'kubernetes': 'Kubernetes Cluster Monitor'
        };
        
        const appDisplayName = appMap[appName] || appName;
        showNotification(`Switched to ${appDisplayName}`, 'info');
    }
}

// Launch network application (legacy function kept for compatibility)
function launchApp(appName) {
    switchApp(appName);
}

// Tab management
function switchTab(event, tabName) {
    // Hide all tab panes
    const tabPanes = document.querySelectorAll('.tab-pane');
    tabPanes.forEach(pane => {
        pane.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.classList.remove('active');
    });
    
    // Show selected tab pane
    const targetPane = document.getElementById(tabName);
    if (targetPane) {
        targetPane.classList.add('active');
    }
    
    // Add active class to clicked button
    if (event && event.target) {
        event.target.classList.add('active');
    }
}

// Tree node management for hierarchical data
function toggleTreeNode(element) {
    const toggle = element.querySelector('.tree-toggle');
    const children = element.querySelector('.tree-children');
    
    if (!children) return;
    
    if (children.classList.contains('collapsed')) {
        children.classList.remove('collapsed');
        children.classList.add('expanded');
        toggle.classList.remove('collapsed');
        toggle.classList.add('expanded');
    } else {
        children.classList.remove('expanded');
        children.classList.add('collapsed');
        toggle.classList.remove('expanded');
        toggle.classList.add('collapsed');
    }
}

function selectTreeNode(element) {
    // Remove selection from all nodes
    document.querySelectorAll('.tree-content').forEach(content => {
        content.classList.remove('selected');
    });
    
    // Add selection to clicked node
    element.classList.add('selected');
}

function createTreeNode(item, level = 0) {
    const hasChildren = item.children && item.children.length > 0;
    const nodeId = `node-${Math.random().toString(36).substr(2, 9)}`;
    const severityClass = item.severity ? `severity-${item.severity.toLowerCase()}` : 'severity-unknown';
    
    let html = `
        <li class="tree-item" data-level="${level}">
            <div class="tree-node-header" onclick="toggleTreeNode(this.parentElement)">
                <span class="tree-toggle ${hasChildren ? 'expanded' : 'no-children'}"></span>
                <div class="tree-content" onclick="event.stopPropagation(); selectTreeNode(this)">
                    <span class="tree-severity-dot ${severityClass}"></span>
                    <span class="tree-label">${item.name}</span>
                    ${item.details ? `<span class="tree-details">${item.details}</span>` : ''}
                    ${item.status ? `<span class="status-${item.status}"> ${item.status.toUpperCase()}</span>` : ''}
                    ${item.timestamp ? `<span class="tree-details"> - ${item.timestamp}</span>` : ''}
                </div>
            </div>
    `;
    
    if (hasChildren) {
        html += `<ul class="tree-children expanded">`;
        item.children.forEach(child => {
            html += createTreeNode(child, level + 1);
        });
        html += `</ul>`;
    }
    
    html += `</li>`;
    return html;
}

// Generate inventory data for devices
function generateInventoryData(device) {
    // Generate sample inventory data based on device type
    const baseInventory = {
        name: device.name,
        type: 'chassis',
        details: `${device.model} - ${device.serialNumber}`,
        status: device.status === 'online' ? 'ok' : 'error',
        children: []
    };

    if (device.type === 'Switch') {
        baseInventory.children = [
            {
                name: 'Supervisor Module',
                type: 'module',
                details: 'C9500-SUP-1',
                status: 'ok',
                children: [
                    {
                        name: 'CPU',
                        type: 'cpu',
                        details: 'ARM Cortex A9 1.6GHz',
                        status: 'ok'
                    },
                    {
                        name: 'Memory',
                        type: 'memory',
                        details: '8GB DDR4',
                        status: 'ok'
                    }
                ]
            },
            {
                name: 'Line Card Slot 1',
                type: 'module',
                details: '48-Port GigE',
                status: 'ok',
                children: Array.from({length: 48}, (_, i) => ({
                    name: `Port ${i + 1}`,
                    type: 'port',
                    details: `Gi1/0/${i + 1}`,
                    status: i < 24 ? 'ok' : 'unknown'
                }))
            },
            {
                name: 'Power Supply 1',
                type: 'power',
                details: '1100W AC',
                status: 'ok'
            },
            {
                name: 'Power Supply 2',
                type: 'power',
                details: '1100W AC',
                status: 'ok'
            },
            {
                name: 'Fan Tray 1',
                type: 'fan',
                details: 'Variable Speed',
                status: 'ok'
            }
        ];
    } else if (device.type === 'Router') {
        baseInventory.children = [
            {
                name: 'Route Processor',
                type: 'module',
                details: 'RE-S-1800x4-16G',
                status: 'ok',
                children: [
                    {
                        name: 'CPU',
                        type: 'cpu',
                        details: 'Intel x86 2.0GHz',
                        status: 'ok'
                    },
                    {
                        name: 'Memory',
                        type: 'memory',
                        details: '16GB DDR4',
                        status: 'ok'
                    }
                ]
            },
            {
                name: 'Interface Module 1',
                type: 'module',
                details: '4x10GE SFP+',
                status: 'ok',
                children: Array.from({length: 4}, (_, i) => ({
                    name: `Interface ${i + 1}`,
                    type: 'interface',
                    details: `xe-0/0/${i}`,
                    status: 'ok'
                }))
            },
            {
                name: 'Power Supply',
                type: 'power',
                details: '2000W AC',
                status: 'ok'
            }
        ];
    } else if (device.type === 'Firewall') {
        baseInventory.children = [
            {
                name: 'Management Processor',
                type: 'module',
                details: 'PA-3220-MP',
                status: 'ok',
                children: [
                    {
                        name: 'CPU',
                        type: 'cpu',
                        details: 'ARM Cortex A57 1.8GHz',
                        status: 'ok'
                    },
                    {
                        name: 'Memory',
                        type: 'memory',
                        details: '4GB DDR4',
                        status: 'ok'
                    }
                ]
            },
            {
                name: 'Security Processing Unit',
                type: 'module',
                details: 'Dedicated Security ASIC',
                status: 'ok'
            },
            {
                name: 'Network Interfaces',
                type: 'module',
                details: '16x1GE + 4x10GE',
                status: 'ok',
                children: Array.from({length: 16}, (_, i) => ({
                    name: `Ethernet ${i + 1}`,
                    type: 'interface',
                    details: `ethernet1/${i + 1}`,
                    status: i < 8 ? 'ok' : 'unknown'
                }))
            }
        ];
    } else {
        // Generic device
        baseInventory.children = [
            {
                name: 'Processor',
                type: 'cpu',
                details: 'Generic ARM Processor',
                status: 'ok'
            },
            {
                name: 'Memory',
                type: 'memory',
                details: '2GB DDR3',
                status: 'ok'
            },
            {
                name: 'Network Interface',
                type: 'interface',
                details: 'eth0',
                status: 'ok'
            }
        ];
    }

    return baseInventory;
}