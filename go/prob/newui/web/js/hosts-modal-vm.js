// Show VM Detail Modal
function showVMDetailModal(vm) {
    const modal = document.getElementById('vm-detail-modal');
    const content = document.getElementById('vm-detail-content');
    const modalTitle = modal.querySelector('.modal-title');

    const statusClass = `status-${vm.status === 'running' ? 'operational' : (vm.status === 'stopped' ? 'offline' : (vm.status === 'suspended' ? 'warning' : 'critical'))}`;
    const cpuClass = vm.cpuUsage < 60 ? 'low' : vm.cpuUsage < 85 ? 'medium' : 'high';
    const memClass = vm.memoryUsage < 60 ? 'low' : vm.memoryUsage < 85 ? 'medium' : 'high';
    const diskClass = vm.diskUsage < 60 ? 'low' : vm.diskUsage < 85 ? 'medium' : 'high';

    modalTitle.innerHTML = `
        <span>VM Details - ${vm.name}</span>
        <span class="modal-status-badge ${statusClass}">${vm.status.toUpperCase()}</span>
    `;

    content.innerHTML = `
        <!-- Modal Tabs -->
        <div class="modal-tabs">
            <div class="modal-tab active" data-tab="overview">Overview</div>
            <div class="modal-tab" data-tab="resources">Resources</div>
            <div class="modal-tab" data-tab="network">Network</div>
            <div class="modal-tab" data-tab="backup">Backup & Snapshots</div>
        </div>

        <!-- Tab Content -->
        <div class="modal-tab-content">
            <!-- Overview Tab -->
            <div class="tab-pane active" data-pane="overview">
                <div class="device-detail-grid">
                    <div class="detail-section">
                        <div class="detail-section-title">VM Information</div>
                        <div class="detail-row">
                            <span class="detail-label">VM Name</span>
                            <span class="detail-value">${vm.name}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Hostname</span>
                            <span class="detail-value">${vm.hostname}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Operating System</span>
                            <span class="detail-value">${vm.os}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Status</span>
                            <span class="detail-value ${statusClass}">${vm.status.toUpperCase()}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Purpose</span>
                            <span class="detail-value">${vm.purpose}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Owner</span>
                            <span class="detail-value">${vm.owner}</span>
                        </div>
                    </div>

                    <div class="detail-section">
                        <div class="detail-section-title">Host & Runtime</div>
                        <div class="detail-row">
                            <span class="detail-label">Hypervisor</span>
                            <span class="detail-value">${vm.hypervisor}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Uptime</span>
                            <span class="detail-value">${vm.uptime} days</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Created Date</span>
                            <span class="detail-value">${vm.createdDate}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Last Seen</span>
                            <span class="detail-value">${vm.lastSeen}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Tags</span>
                            <span class="detail-value">${vm.tags.join(', ')}</span>
                        </div>
                    </div>
                </div>

                <div class="detail-section detail-full-width" style="margin-top: 20px;">
                    <div class="detail-section-title">Notes</div>
                    <div class="detail-row">
                        <span class="detail-value">${vm.notes}</span>
                    </div>
                </div>
            </div>

            <!-- Resources Tab -->
            <div class="tab-pane" data-pane="resources">
                <div class="device-detail-grid">
                    <div class="detail-section">
                        <div class="detail-section-title">Allocated Resources</div>
                        <div class="detail-row">
                            <span class="detail-label">vCPU Cores</span>
                            <span class="detail-value">${vm.cpuCores}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Memory</span>
                            <span class="detail-value">${vm.memory} GB</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Disk Space</span>
                            <span class="detail-value">${vm.diskTotal} GB</span>
                        </div>
                    </div>
                </div>

                <div class="detail-section detail-full-width" style="margin-top: 20px;">
                    <div class="detail-section-title">Resource Utilization</div>

                    <div class="detail-row">
                        <span class="detail-label">CPU Usage</span>
                        <span class="detail-value">${vm.cpuUsage}%</span>
                    </div>
                    <div class="performance-bar">
                        <div class="performance-bar-fill ${cpuClass}" style="width: ${vm.cpuUsage}%"></div>
                    </div>

                    <div class="detail-row" style="margin-top: 15px;">
                        <span class="detail-label">Memory Usage</span>
                        <span class="detail-value">${vm.memoryUsed} GB / ${vm.memory} GB (${vm.memoryUsage}%)</span>
                    </div>
                    <div class="performance-bar">
                        <div class="performance-bar-fill ${memClass}" style="width: ${vm.memoryUsage}%"></div>
                    </div>

                    <div class="detail-row" style="margin-top: 15px;">
                        <span class="detail-label">Disk Usage</span>
                        <span class="detail-value">${vm.diskUsed} GB / ${vm.diskTotal} GB (${vm.diskUsage}%)</span>
                    </div>
                    <div class="performance-bar">
                        <div class="performance-bar-fill ${diskClass}" style="width: ${vm.diskUsage}%"></div>
                    </div>

                    <div class="detail-row" style="margin-top: 15px;">
                        <span class="detail-label">Network Throughput</span>
                        <span class="detail-value">${vm.networkThroughput} Mbps</span>
                    </div>
                </div>
            </div>

            <!-- Network Tab -->
            <div class="tab-pane" data-pane="network">
                <div class="device-detail-grid">
                    <div class="detail-section">
                        <div class="detail-section-title">Network Configuration</div>
                        <div class="detail-row">
                            <span class="detail-label">IP Address</span>
                            <span class="detail-value">${vm.ipAddress}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">MAC Address</span>
                            <span class="detail-value">${vm.macAddress}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">VLAN</span>
                            <span class="detail-value">${vm.vlan}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Network Throughput</span>
                            <span class="detail-value">${vm.networkThroughput} Mbps</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Backup Tab -->
            <div class="tab-pane" data-pane="backup">
                <div class="device-detail-grid">
                    <div class="detail-section">
                        <div class="detail-section-title">Backup Information</div>
                        <div class="detail-row">
                            <span class="detail-label">Backup Status</span>
                            <span class="detail-value">${vm.backupStatus}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Last Backup</span>
                            <span class="detail-value">${vm.lastBackup}</span>
                        </div>
                    </div>

                    <div class="detail-section">
                        <div class="detail-section-title">Snapshots</div>
                        <div class="detail-row">
                            <span class="detail-label">Snapshot Count</span>
                            <span class="detail-value">${vm.snapshotCount}</span>
                        </div>
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
            closeVMDetailModal();
        }
    };

    // Close modal on Escape key
    document.addEventListener('keydown', handleVMEscapeKey);
}

// Setup modal tab switching (shared function)
function setupModalTabs(content) {
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
}

// Close VM Detail Modal
function closeVMDetailModal() {
    const modal = document.getElementById('vm-detail-modal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', handleVMEscapeKey);
}

// Handle Escape key for VM modal
function handleVMEscapeKey(e) {
    if (e.key === 'Escape') {
        closeVMDetailModal();
    }
}
