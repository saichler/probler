// Hosts & VMs Detail Modal Module

// Show Hypervisor Detail Modal
function showHypervisorDetailModal(hypervisor) {
    const modal = document.getElementById('hypervisor-detail-modal');
    const content = document.getElementById('hypervisor-detail-content');
    const modalTitle = modal.querySelector('.modal-title');

    const statusClass = `status-${hypervisor.status}`;
    const cpuClass = hypervisor.cpuUsage < 60 ? 'low' : hypervisor.cpuUsage < 85 ? 'medium' : 'high';
    const memClass = hypervisor.memoryUsage < 60 ? 'low' : hypervisor.memoryUsage < 85 ? 'medium' : 'high';
    const storagePercent = Math.round((hypervisor.storageUsed / hypervisor.storageTotal) * 100);
    const storageClass = storagePercent < 60 ? 'low' : storagePercent < 85 ? 'medium' : 'high';

    modalTitle.innerHTML = `
        <span>Hypervisor Details - ${hypervisor.name}</span>
        <span class="modal-status-badge ${statusClass}">${hypervisor.status.toUpperCase()}</span>
    `;

    content.innerHTML = `
        <!-- Modal Tabs -->
        <div class="modal-tabs">
            <div class="modal-tab active" data-tab="overview">Overview</div>
            <div class="modal-tab" data-tab="hardware">Hardware</div>
            <div class="modal-tab" data-tab="resources">Resources</div>
            <div class="modal-tab" data-tab="vms">Virtual Machines</div>
        </div>

        <!-- Tab Content -->
        <div class="modal-tab-content">
            <!-- Overview Tab -->
            <div class="tab-pane active" data-pane="overview">
                <div class="device-detail-grid">
                    <div class="detail-section">
                        <div class="detail-section-title">Host Information</div>
                        <div class="detail-row">
                            <span class="detail-label">Host Name</span>
                            <span class="detail-value">${hypervisor.name}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Hostname</span>
                            <span class="detail-value">${hypervisor.hostname}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">IP Address</span>
                            <span class="detail-value">${hypervisor.ipAddress}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Type</span>
                            <span class="detail-value">${hypervisor.type}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Version</span>
                            <span class="detail-value">${hypervisor.version}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Status</span>
                            <span class="detail-value ${statusClass}">${hypervisor.status.toUpperCase()}</span>
                        </div>
                    </div>

                    <div class="detail-section">
                        <div class="detail-section-title">Cluster & Location</div>
                        <div class="detail-row">
                            <span class="detail-label">Datacenter</span>
                            <span class="detail-value">${hypervisor.datacenter}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Cluster</span>
                            <span class="detail-value">${hypervisor.cluster}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Uptime</span>
                            <span class="detail-value">${hypervisor.uptime} days</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Last Seen</span>
                            <span class="detail-value">${hypervisor.lastSeen}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Virtual Machines</span>
                            <span class="detail-value">${hypervisor.vmRunning} running / ${hypervisor.vmCount} total</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Hardware Tab -->
            <div class="tab-pane" data-pane="hardware">
                <div class="device-detail-grid">
                    <div class="detail-section">
                        <div class="detail-section-title">Physical Hardware</div>
                        <div class="detail-row">
                            <span class="detail-label">Manufacturer</span>
                            <span class="detail-value">${hypervisor.manufacturer}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Model</span>
                            <span class="detail-value">${hypervisor.model}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">BIOS Version</span>
                            <span class="detail-value">${hypervisor.biosVersion}</span>
                        </div>
                    </div>

                    <div class="detail-section">
                        <div class="detail-section-title">CPU Specifications</div>
                        <div class="detail-row">
                            <span class="detail-label">CPU Model</span>
                            <span class="detail-value">${hypervisor.cpuModel}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Total Cores</span>
                            <span class="detail-value">${hypervisor.cpuCores}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Total Threads</span>
                            <span class="detail-value">${hypervisor.cpuThreads}</span>
                        </div>
                    </div>

                    <div class="detail-section">
                        <div class="detail-section-title">Memory</div>
                        <div class="detail-row">
                            <span class="detail-label">Total Memory</span>
                            <span class="detail-value">${hypervisor.memoryTotal} GB</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Used Memory</span>
                            <span class="detail-value">${hypervisor.memoryUsed} GB</span>
                        </div>
                    </div>

                    <div class="detail-section">
                        <div class="detail-section-title">Storage</div>
                        <div class="detail-row">
                            <span class="detail-label">Total Storage</span>
                            <span class="detail-value">${hypervisor.storageTotal} TB</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Used Storage</span>
                            <span class="detail-value">${hypervisor.storageUsed} TB</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Datastores</span>
                            <span class="detail-value">${hypervisor.datastores}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Resources Tab -->
            <div class="tab-pane" data-pane="resources">
                <div class="detail-section detail-full-width">
                    <div class="detail-section-title">Resource Utilization</div>

                    <div class="detail-row">
                        <span class="detail-label">CPU Usage</span>
                        <span class="detail-value">${hypervisor.cpuUsage}% (${hypervisor.cpuCores} cores)</span>
                    </div>
                    <div class="performance-bar">
                        <div class="performance-bar-fill ${cpuClass}" style="width: ${hypervisor.cpuUsage}%"></div>
                    </div>

                    <div class="detail-row" style="margin-top: 15px;">
                        <span class="detail-label">Memory Usage</span>
                        <span class="detail-value">${hypervisor.memoryUsed} GB / ${hypervisor.memoryTotal} GB (${hypervisor.memoryUsage}%)</span>
                    </div>
                    <div class="performance-bar">
                        <div class="performance-bar-fill ${memClass}" style="width: ${hypervisor.memoryUsage}%"></div>
                    </div>

                    <div class="detail-row" style="margin-top: 15px;">
                        <span class="detail-label">Storage Usage</span>
                        <span class="detail-value">${hypervisor.storageUsed} TB / ${hypervisor.storageTotal} TB (${storagePercent}%)</span>
                    </div>
                    <div class="performance-bar">
                        <div class="performance-bar-fill ${storageClass}" style="width: ${storagePercent}%"></div>
                    </div>
                </div>

                <div class="device-detail-grid" style="margin-top: 20px;">
                    <div class="detail-section">
                        <div class="detail-section-title">Network</div>
                        <div class="detail-row">
                            <span class="detail-label">Network Interfaces</span>
                            <span class="detail-value">${hypervisor.networkInterfaces}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Virtual Switches</span>
                            <span class="detail-value">${hypervisor.vSwitches}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- VMs Tab -->
            <div class="tab-pane" data-pane="vms">
                <div class="detail-section detail-full-width">
                    <div class="detail-section-title">Virtual Machine Summary</div>
                    <div class="detail-row">
                        <span class="detail-label">Total VMs</span>
                        <span class="detail-value">${hypervisor.vmCount}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Running</span>
                        <span class="detail-value status-operational">${hypervisor.vmRunning}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Stopped</span>
                        <span class="detail-value status-offline">${hypervisor.vmStopped}</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Setup tab switching
    setupModalTabs(content);

    // Close modal on overlay click
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeHypervisorDetailModal();
        }
    };

    // Close modal on Escape key
    document.addEventListener('keydown', handleHypervisorEscapeKey);
}

// Close Hypervisor Detail Modal
function closeHypervisorDetailModal() {
    const modal = document.getElementById('hypervisor-detail-modal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', handleHypervisorEscapeKey);
}

// Handle Escape key for Hypervisor modal
function handleHypervisorEscapeKey(e) {
    if (e.key === 'Escape') {
        closeHypervisorDetailModal();
    }
}
