// Service Detail Modal Function

// Service Detail Modal
function showServiceDetailModal(service, cluster) {
    const modal = document.getElementById('k8s-detail-modal');
    const content = document.getElementById('k8s-detail-content');
    const modalTitle = modal.querySelector('.modal-title');

    modalTitle.textContent = `Service ${service.name} Details`;

    const portEntries = service.ports ? service.ports.split(',').map(p => {
        const parts = p.trim().split(':');
        const port = parseInt(parts[0]) || 0;
        const targetPart = parts[1] || parts[0];
        const [targetPort, protocol] = targetPart.split('/');
        return {
            port: port,
            protocol: protocol || 'TCP',
            targetPort: parseInt(targetPort) || port
        };
    }) : [];

    content.innerHTML = `
        <div class="modal-tabs">
            <div class="modal-tab active" data-tab="overview">Overview</div>
            <div class="modal-tab" data-tab="ports">Ports</div>
            <div class="modal-tab" data-tab="status">Status</div>
        </div>

        <div class="modal-tab-content active" data-tab-content="overview">
            <div class="detail-section">
                <h3>Service Information</h3>
                <div class="detail-grid">
                    <div class="detail-item"><span class="detail-label">Name:</span><span class="detail-value">${service.name}</span></div>
                    <div class="detail-item"><span class="detail-label">Namespace:</span><span class="detail-value">${service.namespace}</span></div>
                    <div class="detail-item"><span class="detail-label">Cluster:</span><span class="detail-value">${cluster}</span></div>
                    <div class="detail-item"><span class="detail-label">Age:</span><span class="detail-value">${service.age || 'N/A'}</span></div>
                    <div class="detail-item"><span class="detail-label">Type:</span><span class="detail-value"><span class="status-badge ${service.type === 'LoadBalancer' ? 'status-operational' : 'status-warning'}">${service.type || 'N/A'}</span></span></div>
                    <div class="detail-item"><span class="detail-label">Cluster IP:</span><span class="detail-value"><code>${service.clusterIP || 'N/A'}</code></span></div>
                    <div class="detail-item"><span class="detail-label">External IP:</span><span class="detail-value"><code>${service.externalIP || 'None'}</code></span></div>
                    ${service.selector ? `<div class="detail-item"><span class="detail-label">Selector:</span><span class="detail-value">${service.selector}</span></div>` : ''}
                </div>
            </div>
        </div>

        <div class="modal-tab-content" data-tab-content="ports">
            <div class="detail-section">
                <h3>Service Ports</h3>
                ${portEntries.length > 0 ? `
                    <table class="detail-table">
                        <thead><tr><th>Port</th><th>Target Port</th><th>Protocol</th></tr></thead>
                        <tbody>${portEntries.map(port => `<tr><td><code>${port.port}</code></td><td><code>${port.targetPort}</code></td><td>${port.protocol}</td></tr>`).join('')}</tbody>
                    </table>
                ` : '<p style="color: #718096;">No ports configured</p>'}
            </div>
        </div>

        <div class="modal-tab-content" data-tab-content="status">
            <div class="detail-section">
                <h3>Service Status</h3>
                ${service.type === 'LoadBalancer' && service.externalIP && service.externalIP !== '<none>' ? `
                    <div class="detail-section">
                        <h4 style="color: #0ea5e9; margin-bottom: 12px;">Load Balancer</h4>
                        <div class="detail-grid">
                            <div class="detail-item"><span class="detail-label">External IP:</span><span class="detail-value"><code>${service.externalIP}</code></span></div>
                        </div>
                    </div>
                ` : '<p style="color: #718096; padding: 20px;">No load balancer status available</p>'}
            </div>
        </div>
    `;

    setupK8sModalTabs(content);
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}
