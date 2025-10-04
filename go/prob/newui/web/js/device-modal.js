// Device Detail Modal Module

// Show device detail modal
function showDeviceDetailModal(device) {
    const modal = document.getElementById('device-detail-modal');
    const content = document.getElementById('device-detail-content');
    const modalTitle = modal.querySelector('.modal-title');

    // Determine status class and performance levels
    const statusClass = `status-${device.status}`;
    const cpuClass = device.cpuUsage < 50 ? 'low' : device.cpuUsage < 80 ? 'medium' : 'high';
    const memClass = device.memoryUsage < 50 ? 'low' : device.memoryUsage < 80 ? 'medium' : 'high';
    const tempClass = device.temperature < 40 ? 'low' : device.temperature < 55 ? 'medium' : 'high';

    // Update modal title with device name and status
    modalTitle.innerHTML = `
        <span>Device Details - ${device.name}</span>
        <span class="modal-status-badge ${statusClass}">${device.status.toUpperCase()}</span>
    `;

    content.innerHTML = `
        <!-- Modal Tabs -->
        <div class="modal-tabs">
            <div class="modal-tab active" data-tab="overview">Overview</div>
            <div class="modal-tab" data-tab="equipment">Equipment</div>
            <div class="modal-tab" data-tab="physical">Physical Inventory</div>
            <div class="modal-tab" data-tab="performance">Performance</div>
        </div>

        <!-- Tab Content -->
        <div class="modal-tab-content">
            <!-- Overview Tab -->
            <div class="tab-pane active" data-pane="overview">
                <div class="device-detail-grid">
                    <div class="detail-section">
                        <div class="detail-section-title">Device Information</div>
                        <div class="detail-row">
                            <span class="detail-label">Device Name</span>
                            <span class="detail-value">${device.name || ''}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">System Name</span>
                            <span class="detail-value">${device.sysName || ''}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">IP Address</span>
                            <span class="detail-value">${device.ipAddress || ''}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Device Type</span>
                            <span class="detail-value">${device.deviceType || ''}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Status</span>
                            <span class="detail-value ${statusClass}">${device.status ? device.status.toUpperCase() : ''}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Last Seen</span>
                            <span class="detail-value">${device.lastSeen || ''}</span>
                        </div>
                    </div>

                    <div class="detail-section">
                        <div class="detail-section-title">Location & Network</div>
                        <div class="detail-row">
                            <span class="detail-label">Location</span>
                            <span class="detail-value">${device.location || ''}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Coordinates</span>
                            <span class="detail-value">${device.latitude && device.longitude ? `${device.latitude.toFixed(4)}, ${device.longitude.toFixed(4)}` : ''}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Uptime</span>
                            <span class="detail-value">${device.uptime || ''}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Interfaces</span>
                            <span class="detail-value">${device.interfaces || ''}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Equipment Tab -->
            <div class="tab-pane" data-pane="equipment">
                <div class="device-detail-grid">
                    <div class="detail-section">
                        <div class="detail-section-title">Hardware Information</div>
                        <div class="detail-row">
                            <span class="detail-label">Vendor</span>
                            <span class="detail-value">${device.vendor || ''}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Model</span>
                            <span class="detail-value">${device.model || ''}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Series</span>
                            <span class="detail-value">${device.series || ''}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Family</span>
                            <span class="detail-value">${device.family || ''}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Serial Number</span>
                            <span class="detail-value">${device.serialNumber || ''}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Interfaces</span>
                            <span class="detail-value">${device.interfaces || ''}</span>
                        </div>
                    </div>

                    <div class="detail-section">
                        <div class="detail-section-title">Software & Configuration</div>
                        <div class="detail-row">
                            <span class="detail-label">Software</span>
                            <span class="detail-value">${device.software || ''}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Firmware Version</span>
                            <span class="detail-value">${device.firmware || ''}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Device Type</span>
                            <span class="detail-value">${device.deviceType || ''}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Management IP</span>
                            <span class="detail-value">${device.ipAddress || ''}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Temperature</span>
                            <span class="detail-value">${device.temperature ? device.temperature + '°C' : ''}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Physical Inventory Tab -->
            <div class="tab-pane" data-pane="physical">
                <div id="physical-inventory-tree"></div>
            </div>

            <!-- Performance Tab -->
            <div class="tab-pane" data-pane="performance">
                <div class="detail-section detail-full-width">
                    <div class="detail-section-title">Performance Metrics</div>
                    <div class="detail-row">
                        <span class="detail-label">CPU Usage</span>
                        <span class="detail-value">${device.cpuUsage}%</span>
                    </div>
                    <div class="performance-bar">
                        <div class="performance-bar-fill ${cpuClass}" style="width: ${device.cpuUsage}%"></div>
                    </div>
                    <div class="detail-row" style="margin-top: 15px;">
                        <span class="detail-label">Memory Usage</span>
                        <span class="detail-value">${device.memoryUsage}%</span>
                    </div>
                    <div class="performance-bar">
                        <div class="performance-bar-fill ${memClass}" style="width: ${device.memoryUsage}%"></div>
                    </div>
                    <div class="detail-row" style="margin-top: 15px;">
                        <span class="detail-label">Temperature</span>
                        <span class="detail-value">${device.temperature}°C</span>
                    </div>
                    <div class="performance-bar">
                        <div class="performance-bar-fill ${tempClass}" style="width: ${Math.min(device.temperature, 100)}%"></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Initialize Physical Inventory Tree if data exists
    if (device.physicals) {
        const physicalTree = new ProblerTree('physical-inventory-tree', {
            data: device.physicals,
            expandAll: true,
            maxHeight: '600px'
        });
    } else {
        const treeContainer = document.getElementById('physical-inventory-tree');
        if (treeContainer) {
            treeContainer.innerHTML = '<div class="detail-section detail-full-width"><p style="color: #718096; text-align: center; padding: 20px;">No physical inventory data available</p></div>';
        }
    }

    // Setup tab switching
    const tabs = content.querySelectorAll('.modal-tab');
    const panes = content.querySelectorAll('.tab-pane');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;

            // Remove active class from all tabs and panes
            tabs.forEach(t => t.classList.remove('active'));
            panes.forEach(p => p.classList.remove('active'));

            // Add active class to clicked tab and corresponding pane
            tab.classList.add('active');
            const targetPane = content.querySelector(`.tab-pane[data-pane="${targetTab}"]`);
            if (targetPane) {
                targetPane.classList.add('active');
            }
        });
    });

    // Close modal on overlay click
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeDeviceDetailModal();
        }
    };

    // Close modal on Escape key
    document.addEventListener('keydown', handleEscapeKey);

    // Show modal
    modal.classList.add('active');
}

// Close device detail modal
function closeDeviceDetailModal() {
    const modal = document.getElementById('device-detail-modal');
    modal.classList.remove('active');
    document.removeEventListener('keydown', handleEscapeKey);
}

// Handle Escape key to close modal
function handleEscapeKey(e) {
    if (e.key === 'Escape') {
        closeDeviceDetailModal();
    }
}
