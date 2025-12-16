// Namespace Detail Modal Function

// Namespace Detail Modal
function showNamespaceDetailModal(namespace, cluster) {
    const modal = document.getElementById('k8s-detail-modal');
    const content = document.getElementById('k8s-detail-content');
    const modalTitle = modal.querySelector('.modal-title');

    modalTitle.textContent = `Namespace ${namespace.name} Details`;

    const namespaceDetails = generateNamespaceDetails(namespace, cluster);

    content.innerHTML = `
        <div class="modal-tabs">
            <div class="modal-tab active" data-tab="overview">Overview</div>
            <div class="modal-tab" data-tab="metadata">Metadata</div>
            <div class="modal-tab" data-tab="spec">Spec</div>
            <div class="modal-tab" data-tab="status">Status</div>
        </div>

        <div class="modal-tab-content active" data-tab-content="overview">
            <div class="detail-section">
                <h3>Namespace Information</h3>
                <div class="detail-grid">
                    <div class="detail-item"><span class="detail-label">Name:</span><span class="detail-value">${namespaceDetails.metadata.name}</span></div>
                    <div class="detail-item"><span class="detail-label">UID:</span><span class="detail-value">${namespaceDetails.metadata.uid}</span></div>
                    <div class="detail-item"><span class="detail-label">Cluster:</span><span class="detail-value">${cluster}</span></div>
                    <div class="detail-item"><span class="detail-label">Phase:</span><span class="detail-value"><span class="status-badge ${namespaceDetails.status.phase === 'Active' ? 'status-operational' : 'status-warning'}">${namespaceDetails.status.phase}</span></span></div>
                    <div class="detail-item"><span class="detail-label">Resource Version:</span><span class="detail-value">${namespaceDetails.metadata.resourceVersion}</span></div>
                    <div class="detail-item"><span class="detail-label">Creation Time:</span><span class="detail-value">${namespaceDetails.metadata.creationTimestamp}</span></div>
                </div>
            </div>
        </div>

        <div class="modal-tab-content" data-tab-content="metadata">
            <div class="detail-section">
                <h3>Metadata</h3>
                <div class="detail-grid">
                    <div class="detail-item"><span class="detail-label">Name:</span><span class="detail-value">${namespaceDetails.metadata.name}</span></div>
                    <div class="detail-item"><span class="detail-label">UID:</span><span class="detail-value">${namespaceDetails.metadata.uid}</span></div>
                    <div class="detail-item"><span class="detail-label">Resource Version:</span><span class="detail-value">${namespaceDetails.metadata.resourceVersion}</span></div>
                    <div class="detail-item"><span class="detail-label">Creation Timestamp:</span><span class="detail-value">${namespaceDetails.metadata.creationTimestamp}</span></div>
                </div>
            </div>
            <div class="detail-section">
                <h3>Labels</h3>
                <table class="detail-table">
                    <thead><tr><th>Key</th><th>Value</th></tr></thead>
                    <tbody>${Object.entries(namespaceDetails.metadata.labels).map(([key, value]) => `<tr><td><code>${key}</code></td><td>${value}</td></tr>`).join('')}</tbody>
                </table>
            </div>
            <div class="detail-section">
                <h3>Annotations</h3>
                <table class="detail-table">
                    <thead><tr><th>Key</th><th>Value</th></tr></thead>
                    <tbody>${Object.entries(namespaceDetails.metadata.annotations).map(([key, value]) => `<tr><td><code>${key}</code></td><td style="max-width: 400px; word-break: break-all; font-size: 11px;">${value}</td></tr>`).join('')}</tbody>
                </table>
            </div>
        </div>

        <div class="modal-tab-content" data-tab-content="spec">
            <div class="detail-section">
                <h3>Namespace Spec</h3>
                <div class="detail-grid">
                    <div class="detail-item full-width"><span class="detail-label">Finalizers:</span><span class="detail-value">${namespaceDetails.spec.finalizers.join(', ')}</span></div>
                </div>
            </div>
            <div class="detail-section">
                <h3>Finalizers List</h3>
                <table class="detail-table">
                    <thead><tr><th>Finalizer</th></tr></thead>
                    <tbody>${namespaceDetails.spec.finalizers.map(finalizer => `<tr><td><code>${finalizer}</code></td></tr>`).join('')}</tbody>
                </table>
            </div>
        </div>

        <div class="modal-tab-content" data-tab-content="status">
            <div class="detail-section">
                <h3>Namespace Status</h3>
                <div class="detail-grid">
                    <div class="detail-item"><span class="detail-label">Phase:</span><span class="detail-value"><span class="status-badge ${namespaceDetails.status.phase === 'Active' ? 'status-operational' : 'status-warning'}">${namespaceDetails.status.phase}</span></span></div>
                </div>
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

    const policyDetails = generateNetworkPolicyDetails(policy, cluster);

    content.innerHTML = `
        <div class="modal-tabs">
            <div class="modal-tab active" data-tab="overview">Overview</div>
            <div class="modal-tab" data-tab="metadata">Metadata</div>
            <div class="modal-tab" data-tab="spec">Spec</div>
            <div class="modal-tab" data-tab="ingress">Ingress Rules</div>
            <div class="modal-tab" data-tab="egress">Egress Rules</div>
        </div>

        <div class="modal-tab-content active" data-tab-content="overview">
            <div class="detail-section">
                <h3>Network Policy Information</h3>
                <div class="detail-grid">
                    <div class="detail-item"><span class="detail-label">Name:</span><span class="detail-value">${policyDetails.metadata.name}</span></div>
                    <div class="detail-item"><span class="detail-label">Namespace:</span><span class="detail-value">${policyDetails.metadata.namespace}</span></div>
                    <div class="detail-item"><span class="detail-label">UID:</span><span class="detail-value">${policyDetails.metadata.uid}</span></div>
                    <div class="detail-item"><span class="detail-label">Cluster:</span><span class="detail-value">${cluster}</span></div>
                    <div class="detail-item"><span class="detail-label">Policy Types:</span><span class="detail-value">${policyDetails.spec.policyTypes.map(t => `<span class="status-badge status-operational">${t}</span>`).join(' ')}</span></div>
                    <div class="detail-item"><span class="detail-label">Generation:</span><span class="detail-value">${policyDetails.metadata.generation}</span></div>
                    <div class="detail-item"><span class="detail-label">Creation Time:</span><span class="detail-value">${policyDetails.metadata.creationTimestamp}</span></div>
                </div>
            </div>
        </div>

        <div class="modal-tab-content" data-tab-content="metadata">
            <div class="detail-section">
                <h3>Metadata</h3>
                <div class="detail-grid">
                    <div class="detail-item"><span class="detail-label">Name:</span><span class="detail-value">${policyDetails.metadata.name}</span></div>
                    <div class="detail-item"><span class="detail-label">Namespace:</span><span class="detail-value">${policyDetails.metadata.namespace}</span></div>
                    <div class="detail-item"><span class="detail-label">UID:</span><span class="detail-value">${policyDetails.metadata.uid}</span></div>
                    <div class="detail-item"><span class="detail-label">Resource Version:</span><span class="detail-value">${policyDetails.metadata.resourceVersion}</span></div>
                </div>
            </div>
        </div>

        <div class="modal-tab-content" data-tab-content="spec">
            <div class="detail-section">
                <h3>Network Policy Spec</h3>
                <div class="detail-grid">
                    <div class="detail-item"><span class="detail-label">Policy Types:</span><span class="detail-value">${policyDetails.spec.policyTypes.join(', ')}</span></div>
                </div>
            </div>
            <div class="detail-section">
                <h3>Pod Selector</h3>
                <table class="detail-table">
                    <thead><tr><th>Match Labels - Key</th><th>Match Labels - Value</th></tr></thead>
                    <tbody>${Object.entries(policyDetails.spec.podSelector.matchLabels).map(([key, value]) => `<tr><td><code>${key}</code></td><td>${value}</td></tr>`).join('')}</tbody>
                </table>
            </div>
        </div>

        <div class="modal-tab-content" data-tab-content="ingress">
            <div class="detail-section">
                <h3>Ingress Rules</h3>
                ${policyDetails.spec.ingress && policyDetails.spec.ingress.length > 0 ?
                    policyDetails.spec.ingress.map((rule, idx) => `
                        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                            <h4 style="color: #0ea5e9; margin-bottom: 12px;">Ingress Rule ${idx + 1}</h4>
                            ${rule.ports && rule.ports.length > 0 ? `
                                <h5 style="color: #666; margin-bottom: 8px;">Ports</h5>
                                <table class="detail-table">
                                    <thead><tr><th>Protocol</th><th>Port</th></tr></thead>
                                    <tbody>${rule.ports.map(port => `<tr><td>${port.protocol}</td><td><code>${port.port}</code></td></tr>`).join('')}</tbody>
                                </table>
                            ` : ''}
                        </div>
                    `).join('')
                : '<p style="color: #718096; padding: 20px;">No ingress rules defined.</p>'}
            </div>
        </div>

        <div class="modal-tab-content" data-tab-content="egress">
            <div class="detail-section">
                <h3>Egress Rules</h3>
                ${policyDetails.spec.egress && policyDetails.spec.egress.length > 0 ?
                    policyDetails.spec.egress.map((rule, idx) => `
                        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                            <h4 style="color: #0ea5e9; margin-bottom: 12px;">Egress Rule ${idx + 1}</h4>
                            ${rule.ports && rule.ports.length > 0 ? `
                                <h5 style="color: #666; margin-bottom: 8px;">Ports</h5>
                                <table class="detail-table">
                                    <thead><tr><th>Protocol</th><th>Port</th></tr></thead>
                                    <tbody>${rule.ports.map(port => `<tr><td>${port.protocol}</td><td><code>${port.port}</code></td></tr>`).join('')}</tbody>
                                </table>
                            ` : ''}
                        </div>
                    `).join('')
                : '<p style="color: #718096; padding: 20px;">No egress rules defined.</p>'}
            </div>
        </div>
    `;

    setupK8sModalTabs(content);
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}
