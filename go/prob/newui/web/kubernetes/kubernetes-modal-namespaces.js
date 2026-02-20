// Namespace Detail Modal Function

// Namespace Detail Modal
function showNamespaceDetailModal(namespace, cluster) {
    const modal = document.getElementById('k8s-detail-modal');
    const content = document.getElementById('k8s-detail-content');
    const modalTitle = modal.querySelector('.modal-title');

    modalTitle.textContent = `Namespace ${namespace.name} Details`;

    content.innerHTML = `
        <div class="detail-section">
            <h3>Namespace Information</h3>
            <div class="detail-grid">
                <div class="detail-item"><span class="detail-label">Name:</span><span class="detail-value">${namespace.name}</span></div>
                <div class="detail-item"><span class="detail-label">Cluster:</span><span class="detail-value">${cluster}</span></div>
                <div class="detail-item"><span class="detail-label">Status:</span><span class="detail-value"><span class="status-badge ${namespace.status === 'Active' ? 'status-operational' : 'status-warning'}">${namespace.status}</span></span></div>
            </div>
        </div>
    `;

    setupK8sModalTabs(content);
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Network Policy Detail Modal
function showNetworkPolicyDetailModal(policy, cluster) {
    const modal = document.getElementById('k8s-detail-modal');
    const content = document.getElementById('k8s-detail-content');
    const modalTitle = modal.querySelector('.modal-title');

    modalTitle.textContent = `Network Policy ${policy.name} Details`;

    content.innerHTML = `
        <div class="detail-section">
            <h3>Network Policy Information</h3>
            <div class="detail-grid">
                <div class="detail-item"><span class="detail-label">Name:</span><span class="detail-value">${policy.name}</span></div>
                <div class="detail-item"><span class="detail-label">Namespace:</span><span class="detail-value">${policy.namespace}</span></div>
                <div class="detail-item"><span class="detail-label">Cluster:</span><span class="detail-value">${cluster}</span></div>
                <div class="detail-item"><span class="detail-label">Policy Types:</span><span class="detail-value">${policy.policyTypes || 'N/A'}</span></div>
                <div class="detail-item"><span class="detail-label">Pod Selector:</span><span class="detail-value">${policy.podSelector || 'N/A'}</span></div>
                <div class="detail-item"><span class="detail-label">Ingress Rules:</span><span class="detail-value">${policy.ingressRules || 0}</span></div>
                <div class="detail-item"><span class="detail-label">Egress Rules:</span><span class="detail-value">${policy.egressRules || 0}</span></div>
            </div>
        </div>
    `;

    setupK8sModalTabs(content);
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}
