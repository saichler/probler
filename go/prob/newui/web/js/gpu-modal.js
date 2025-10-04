// GPU Detail Modal Module

// Show GPU detail modal
function showGPUDetailModal(gpu) {
    const modal = document.getElementById('gpu-detail-modal');
    const content = document.getElementById('gpu-detail-content');
    const modalTitle = modal.querySelector('.modal-title');

    // Determine status class and performance levels
    const statusClass = `status-${gpu.status}`;
    const utilizationClass = gpu.utilization < 50 ? 'low' : gpu.utilization < 80 ? 'medium' : 'high';
    const memoryPercent = Math.round((gpu.memoryUsed / gpu.memoryTotal) * 100);
    const memClass = memoryPercent < 50 ? 'low' : memoryPercent < 80 ? 'medium' : 'high';
    const tempClass = gpu.temperature < 70 ? 'low' : gpu.temperature < 85 ? 'medium' : 'high';
    const powerPercent = Math.round((gpu.powerDraw / gpu.powerLimit) * 100);
    const powerClass = powerPercent < 50 ? 'low' : powerPercent < 80 ? 'medium' : 'high';

    // Update modal title with GPU name and status
    modalTitle.innerHTML = `
        <span>GPU Details - ${gpu.name}</span>
        <span class="modal-status-badge ${statusClass}">${gpu.status.toUpperCase()}</span>
    `;

    // Build processes list HTML
    let processesHtml = '';
    if (gpu.processes && gpu.processes.length > 0) {
        processesHtml = '<div class="processes-list">';
        gpu.processes.forEach(proc => {
            processesHtml += `
                <div class="process-item">
                    <span class="process-pid">PID: ${proc.pid}</span>
                    <span class="process-name">${proc.name}</span>
                    <span class="process-memory">${(proc.memoryUsage / 1024).toFixed(2)} GB</span>
                </div>
            `;
        });
        processesHtml += '</div>';
    } else {
        processesHtml = '<p style="color: #718096; text-align: center; padding: 20px;">No active processes</p>';
    }

    content.innerHTML = `
        <!-- Modal Tabs -->
        <div class="modal-tabs">
            <div class="modal-tab active" data-tab="overview">Overview</div>
            <div class="modal-tab" data-tab="hardware">Hardware</div>
            <div class="modal-tab" data-tab="performance">Performance</div>
            <div class="modal-tab" data-tab="processes">Processes</div>
        </div>

        <!-- Tab Content -->
        <div class="modal-tab-content">
            <!-- Overview Tab -->
            <div class="tab-pane active" data-pane="overview">
                <div class="device-detail-grid">
                    <div class="detail-section">
                        <div class="detail-section-title">GPU Information</div>
                        <div class="detail-row">
                            <span class="detail-label">GPU Name</span>
                            <span class="detail-value">${gpu.name}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Model</span>
                            <span class="detail-value">${gpu.model}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Vendor</span>
                            <span class="detail-value">${gpu.vendor}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Architecture</span>
                            <span class="detail-value">${gpu.architecture}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Status</span>
                            <span class="detail-value ${statusClass}">${gpu.status.toUpperCase()}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Bus ID</span>
                            <span class="detail-value">${gpu.busId}</span>
                        </div>
                    </div>

                    <div class="detail-section">
                        <div class="detail-section-title">Host & Location</div>
                        <div class="detail-row">
                            <span class="detail-label">Host Name</span>
                            <span class="detail-value">${gpu.hostName}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Serial Number</span>
                            <span class="detail-value">${gpu.serialNumber}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Last Seen</span>
                            <span class="detail-value">${gpu.lastSeen}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Compute Mode</span>
                            <span class="detail-value">${gpu.computeMode}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">ECC Enabled</span>
                            <span class="detail-value">${gpu.eccEnabled ? 'Yes' : 'No'}</span>
                        </div>
                    </div>
                </div>

                <!-- Quick Metrics -->
                <div class="gpu-quick-metrics">
                    <div class="metric-card">
                        <div class="metric-label">GPU Utilization</div>
                        <div class="metric-value ${utilizationClass}">${gpu.utilization}%</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">Memory Usage</div>
                        <div class="metric-value ${memClass}">${gpu.memoryUsed}GB / ${gpu.memoryTotal}GB</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">Temperature</div>
                        <div class="metric-value ${tempClass}">${gpu.temperature}°C</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">Power Draw</div>
                        <div class="metric-value ${powerClass}">${gpu.powerDraw}W / ${gpu.powerLimit}W</div>
                    </div>
                </div>
            </div>

            <!-- Hardware Tab -->
            <div class="tab-pane" data-pane="hardware">
                <div class="device-detail-grid">
                    <div class="detail-section">
                        <div class="detail-section-title">Core Specifications</div>
                        <div class="detail-row">
                            <span class="detail-label">CUDA Cores</span>
                            <span class="detail-value">${gpu.cudaCores.toLocaleString()}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Tensor Cores</span>
                            <span class="detail-value">${gpu.tensorCores}</span>
                        </div>
                        ${gpu.rtCores > 0 ? `
                        <div class="detail-row">
                            <span class="detail-label">RT Cores</span>
                            <span class="detail-value">${gpu.rtCores}</span>
                        </div>
                        ` : ''}
                        <div class="detail-row">
                            <span class="detail-label">Clock Speed</span>
                            <span class="detail-value">${gpu.clockSpeed} MHz (Max: ${gpu.clockSpeedMax} MHz)</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Architecture</span>
                            <span class="detail-value">${gpu.architecture}</span>
                        </div>
                    </div>

                    <div class="detail-section">
                        <div class="detail-section-title">Memory & Interface</div>
                        <div class="detail-row">
                            <span class="detail-label">Total Memory</span>
                            <span class="detail-value">${gpu.memoryTotal} GB ${gpu.vramType}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Memory Type</span>
                            <span class="detail-value">${gpu.vramType}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">PCIe Generation</span>
                            <span class="detail-value">Gen ${gpu.pcieGen}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">PCIe Lanes</span>
                            <span class="detail-value">x${gpu.pcieLanes}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Bus ID</span>
                            <span class="detail-value">${gpu.busId}</span>
                        </div>
                    </div>

                    <div class="detail-section">
                        <div class="detail-section-title">Firmware & Drivers</div>
                        <div class="detail-row">
                            <span class="detail-label">Driver Version</span>
                            <span class="detail-value">${gpu.driverVersion}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">CUDA Version</span>
                            <span class="detail-value">${gpu.cudaVersion}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">VBIOS Version</span>
                            <span class="detail-value">${gpu.vbios}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Serial Number</span>
                            <span class="detail-value">${gpu.serialNumber}</span>
                        </div>
                    </div>

                    <div class="detail-section">
                        <div class="detail-section-title">Configuration</div>
                        <div class="detail-row">
                            <span class="detail-label">Compute Mode</span>
                            <span class="detail-value">${gpu.computeMode}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">ECC Support</span>
                            <span class="detail-value">${gpu.eccEnabled ? 'Enabled' : 'Disabled'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Power Limit</span>
                            <span class="detail-value">${gpu.powerLimit}W</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Fan Speed</span>
                            <span class="detail-value">${gpu.fanSpeed}%</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Performance Tab -->
            <div class="tab-pane" data-pane="performance">
                <div class="detail-section detail-full-width">
                    <div class="detail-section-title">Performance Metrics</div>

                    <div class="detail-row">
                        <span class="detail-label">GPU Utilization</span>
                        <span class="detail-value">${gpu.utilization}%</span>
                    </div>
                    <div class="performance-bar">
                        <div class="performance-bar-fill ${utilizationClass}" style="width: ${gpu.utilization}%"></div>
                    </div>

                    <div class="detail-row" style="margin-top: 15px;">
                        <span class="detail-label">Memory Usage</span>
                        <span class="detail-value">${gpu.memoryUsed} GB / ${gpu.memoryTotal} GB (${memoryPercent}%)</span>
                    </div>
                    <div class="performance-bar">
                        <div class="performance-bar-fill ${memClass}" style="width: ${memoryPercent}%"></div>
                    </div>

                    <div class="detail-row" style="margin-top: 15px;">
                        <span class="detail-label">Temperature</span>
                        <span class="detail-value">${gpu.temperature}°C</span>
                    </div>
                    <div class="performance-bar">
                        <div class="performance-bar-fill ${tempClass}" style="width: ${Math.min(gpu.temperature, 100)}%"></div>
                    </div>

                    <div class="detail-row" style="margin-top: 15px;">
                        <span class="detail-label">Power Draw</span>
                        <span class="detail-value">${gpu.powerDraw}W / ${gpu.powerLimit}W (${powerPercent}%)</span>
                    </div>
                    <div class="performance-bar">
                        <div class="performance-bar-fill ${powerClass}" style="width: ${powerPercent}%"></div>
                    </div>

                    <div class="detail-row" style="margin-top: 15px;">
                        <span class="detail-label">Clock Speed</span>
                        <span class="detail-value">${gpu.clockSpeed} MHz / ${gpu.clockSpeedMax} MHz</span>
                    </div>
                    <div class="performance-bar">
                        <div class="performance-bar-fill low" style="width: ${(gpu.clockSpeed / gpu.clockSpeedMax) * 100}%"></div>
                    </div>

                    <div class="detail-row" style="margin-top: 15px;">
                        <span class="detail-label">Fan Speed</span>
                        <span class="detail-value">${gpu.fanSpeed}%</span>
                    </div>
                    <div class="performance-bar">
                        <div class="performance-bar-fill low" style="width: ${gpu.fanSpeed}%"></div>
                    </div>
                </div>
            </div>

            <!-- Processes Tab -->
            <div class="tab-pane" data-pane="processes">
                <div class="detail-section detail-full-width">
                    <div class="detail-section-title">Active Processes (${gpu.processes.length})</div>
                    ${processesHtml}
                </div>
            </div>
        </div>
    `;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

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
            closeGPUDetailModal();
        }
    };

    // Close modal on Escape key
    document.addEventListener('keydown', handleGPUEscapeKey);
}

// Close GPU detail modal
function closeGPUDetailModal() {
    const modal = document.getElementById('gpu-detail-modal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', handleGPUEscapeKey);
}

// Handle Escape key to close modal
function handleGPUEscapeKey(e) {
    if (e.key === 'Escape') {
        closeGPUDetailModal();
    }
}
