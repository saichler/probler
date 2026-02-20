// StatefulSet Detail Modal Function

// StatefulSet Detail Modal
function showStatefulSetDetailModal(statefulset, cluster) {
    const modal = document.getElementById('k8s-detail-modal');
    const content = document.getElementById('k8s-detail-content');
    const modalTitle = modal.querySelector('.modal-title');

    modalTitle.textContent = `StatefulSet ${statefulset.name} Details`;

    const readyParts = statefulset.ready ? statefulset.ready.split('/') : ['0', '0'];
    const readyReplicas = parseInt(readyParts[0]) || 0;
    const totalReplicas = parseInt(readyParts[1]) || 0;
    const containerList = statefulset.containers ? statefulset.containers.split(',') : [];
    const imageList = statefulset.images ? statefulset.images.split(',') : [];

    content.innerHTML = `
        <div class="modal-tabs">
            <div class="modal-tab active" data-tab="overview">Overview</div>
            <div class="modal-tab" data-tab="template">Template</div>
            <div class="modal-tab" data-tab="status">Status</div>
        </div>

        <div class="modal-tab-content active" data-tab-content="overview">
            <div class="detail-section">
                <h3>StatefulSet Information</h3>
                <div class="detail-grid">
                    <div class="detail-item"><span class="detail-label">Name:</span><span class="detail-value">${statefulset.name}</span></div>
                    <div class="detail-item"><span class="detail-label">Namespace:</span><span class="detail-value">${statefulset.namespace}</span></div>
                    <div class="detail-item"><span class="detail-label">Cluster:</span><span class="detail-value">${cluster}</span></div>
                    <div class="detail-item"><span class="detail-label">Age:</span><span class="detail-value">${statefulset.age || 'N/A'}</span></div>
                    <div class="detail-item"><span class="detail-label">Replicas:</span><span class="detail-value">${totalReplicas}</span></div>
                    <div class="detail-item"><span class="detail-label">Ready Replicas:</span><span class="detail-value"><span class="status-badge ${readyReplicas === totalReplicas ? 'status-operational' : 'status-warning'}">${readyReplicas}/${totalReplicas}</span></span></div>
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
                <h3>Replica Status</h3>
                <div class="detail-grid">
                    <div class="detail-item"><span class="detail-label">Total Replicas:</span><span class="detail-value">${totalReplicas}</span></div>
                    <div class="detail-item"><span class="detail-label">Ready Replicas:</span><span class="detail-value">${readyReplicas}</span></div>
                </div>
            </div>
        </div>
    `;

    setupK8sModalTabs(content);
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}
