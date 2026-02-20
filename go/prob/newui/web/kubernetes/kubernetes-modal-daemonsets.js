// DaemonSet Detail Modal Function

// DaemonSet Detail Modal
function showDaemonSetDetailModal(daemonset, cluster) {
    const modal = document.getElementById('k8s-detail-modal');
    const content = document.getElementById('k8s-detail-content');
    const modalTitle = modal.querySelector('.modal-title');

    modalTitle.textContent = `DaemonSet ${daemonset.name} Details`;

    const containerList = daemonset.containers ? daemonset.containers.split(',') : [];
    const imageList = daemonset.images ? daemonset.images.split(',') : [];

    content.innerHTML = `
        <div class="modal-tabs">
            <div class="modal-tab active" data-tab="overview">Overview</div>
            <div class="modal-tab" data-tab="template">Template</div>
            <div class="modal-tab" data-tab="status">Status</div>
        </div>

        <div class="modal-tab-content active" data-tab-content="overview">
            <div class="detail-section">
                <h3>DaemonSet Information</h3>
                <div class="detail-grid">
                    <div class="detail-item"><span class="detail-label">Name:</span><span class="detail-value">${daemonset.name}</span></div>
                    <div class="detail-item"><span class="detail-label">Namespace:</span><span class="detail-value">${daemonset.namespace}</span></div>
                    <div class="detail-item"><span class="detail-label">Cluster:</span><span class="detail-value">${cluster}</span></div>
                    <div class="detail-item"><span class="detail-label">Age:</span><span class="detail-value">${daemonset.age || 'N/A'}</span></div>
                    <div class="detail-item"><span class="detail-label">Desired Scheduled:</span><span class="detail-value">${daemonset.desired || 0}</span></div>
                    <div class="detail-item"><span class="detail-label">Current Scheduled:</span><span class="detail-value"><span class="status-badge ${daemonset.current === daemonset.desired ? 'status-operational' : 'status-warning'}">${daemonset.current || 0}/${daemonset.desired || 0}</span></span></div>
                </div>
            </div>
        </div>

        <div class="modal-tab-content" data-tab-content="template">
            <div class="detail-section">
                <h3>Containers</h3>
                ${containerList.map((containerName, idx) => `
                    <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                        <h4 style="color: #0ea5e9; margin-bottom: 12px;">Container: ${containerName.trim()}</h4>
                        <div class="detail-grid">
                            <div class="detail-item"><span class="detail-label">Image:</span><span class="detail-value"><code>${(imageList[idx] || '').trim() || 'N/A'}</code></span></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="modal-tab-content" data-tab-content="status">
            <div class="detail-section">
                <h3>DaemonSet Status</h3>
                <div class="detail-grid">
                    <div class="detail-item"><span class="detail-label">Current Number Scheduled:</span><span class="detail-value">${daemonset.current || 0}</span></div>
                    <div class="detail-item"><span class="detail-label">Desired Number Scheduled:</span><span class="detail-value">${daemonset.desired || 0}</span></div>
                    <div class="detail-item"><span class="detail-label">Number Ready:</span><span class="detail-value">${daemonset.ready || 0}</span></div>
                    <div class="detail-item"><span class="detail-label">Number Available:</span><span class="detail-value">${daemonset.available || 0}</span></div>
                    <div class="detail-item"><span class="detail-label">Updated Number Scheduled:</span><span class="detail-value">${daemonset.upToDate || 0}</span></div>
                </div>
            </div>
            <div class="detail-section">
                <h3>Node Distribution</h3>
                <div class="detail-grid">
                    <div class="detail-item"><span class="detail-label">Pods Running:</span><span class="detail-value">${daemonset.ready || 0} of ${daemonset.desired || 0} nodes</span></div>
                    <div class="detail-item"><span class="detail-label">Coverage:</span><span class="detail-value">${daemonset.desired > 0 ? (((daemonset.ready || 0) / daemonset.desired) * 100).toFixed(1) : 0}%</span></div>
                </div>
            </div>
        </div>
    `;

    setupK8sModalTabs(content);
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}
