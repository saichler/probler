// Namespace and Network Policy Detail Modals and Helper Functions

// Generate detailed namespace data matching namespace.json structure
function generateNamespaceDetails(namespace, cluster) {
    const generateUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    const creationTime = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);

    return {
        apiVersion: "v1",
        kind: "Namespace",
        metadata: {
            name: namespace.name,
            uid: generateUID(),
            resourceVersion: String(Math.floor(Math.random() * 9000000) + 1000000),
            creationTimestamp: creationTime.toISOString(),
            labels: {
                "kubernetes.io/metadata.name": namespace.name,
                "name": namespace.name
            },
            annotations: {
                "kubectl.kubernetes.io/last-applied-configuration": `{"apiVersion":"v1","kind":"Namespace","metadata":{"labels":{"name":"${namespace.name}"},"name":"${namespace.name}"}}`
            }
        },
        spec: {
            finalizers: ["kubernetes"]
        },
        status: {
            phase: namespace.status
        }
    };
}

// Namespace Detail Modal
function showNamespaceDetailModal(namespace, cluster) {
    const modal = document.getElementById('k8s-detail-modal');
    const content = document.getElementById('k8s-detail-content');
    const modalTitle = modal.querySelector('.modal-title');

    // Update modal title
    modalTitle.textContent = `Namespace ${namespace.name} Details`;

    // Generate detailed namespace data matching namespace.json structure
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
                    <div class="detail-item">
                        <span class="detail-label">Name:</span>
                        <span class="detail-value">${namespaceDetails.metadata.name}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">UID:</span>
                        <span class="detail-value">${namespaceDetails.metadata.uid}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Cluster:</span>
                        <span class="detail-value">${cluster}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Phase:</span>
                        <span class="detail-value"><span class="status-badge ${namespaceDetails.status.phase === 'Active' ? 'status-operational' : 'status-warning'}">${namespaceDetails.status.phase}</span></span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Resource Version:</span>
                        <span class="detail-value">${namespaceDetails.metadata.resourceVersion}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Creation Time:</span>
                        <span class="detail-value">${namespaceDetails.metadata.creationTimestamp}</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="modal-tab-content" data-tab-content="metadata">
            <div class="detail-section">
                <h3>Metadata</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Name:</span>
                        <span class="detail-value">${namespaceDetails.metadata.name}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">UID:</span>
                        <span class="detail-value">${namespaceDetails.metadata.uid}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Resource Version:</span>
                        <span class="detail-value">${namespaceDetails.metadata.resourceVersion}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Creation Timestamp:</span>
                        <span class="detail-value">${namespaceDetails.metadata.creationTimestamp}</span>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <h3>Labels</h3>
                <table class="detail-table">
                    <thead>
                        <tr>
                            <th>Key</th>
                            <th>Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(namespaceDetails.metadata.labels).map(([key, value]) => `
                            <tr>
                                <td><code>${key}</code></td>
                                <td>${value}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div class="detail-section">
                <h3>Annotations</h3>
                <table class="detail-table">
                    <thead>
                        <tr>
                            <th>Key</th>
                            <th>Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(namespaceDetails.metadata.annotations).map(([key, value]) => `
                            <tr>
                                <td><code>${key}</code></td>
                                <td style="max-width: 400px; word-break: break-all; font-size: 11px;">${value}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="modal-tab-content" data-tab-content="spec">
            <div class="detail-section">
                <h3>Namespace Spec</h3>
                <div class="detail-grid">
                    <div class="detail-item full-width">
                        <span class="detail-label">Finalizers:</span>
                        <span class="detail-value">${namespaceDetails.spec.finalizers.join(', ')}</span>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <h3>Finalizers List</h3>
                <table class="detail-table">
                    <thead>
                        <tr>
                            <th>Finalizer</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${namespaceDetails.spec.finalizers.map(finalizer => `
                            <tr>
                                <td><code>${finalizer}</code></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="modal-tab-content" data-tab-content="status">
            <div class="detail-section">
                <h3>Namespace Status</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Phase:</span>
                        <span class="detail-value"><span class="status-badge ${namespaceDetails.status.phase === 'Active' ? 'status-operational' : 'status-warning'}">${namespaceDetails.status.phase}</span></span>
                    </div>
                </div>
            </div>
        </div>
    `;

    setupK8sModalTabs(content);
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Generate detailed network policy data matching networkpolicy.json structure
function generateNetworkPolicyDetails(policy, cluster) {
    const generateUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    const creationTime = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);

    // Parse policy types from string (e.g., "Ingress, Egress" or "Ingress")
    const policyTypes = policy.policyTypes.split(',').map(t => t.trim());

    // Generate ingress rules based on count
    const ingressRules = policy.ingressRules > 0 ? Array.from({length: policy.ingressRules}, (_, i) => ({
        from: [
            {
                podSelector: {
                    matchLabels: {
                        access: "true"
                    }
                }
            }
        ],
        ports: [
            {
                protocol: "TCP",
                port: 80
            }
        ]
    })) : [];

    // Generate egress rules based on count
    const egressRules = policy.egressRules > 0 ? Array.from({length: policy.egressRules}, (_, i) => ({
        to: [
            {
                podSelector: {
                    matchLabels: {
                        role: "db"
                    }
                }
            }
        ],
        ports: [
            {
                protocol: "TCP",
                port: 5432
            }
        ]
    })) : [];

    return {
        apiVersion: "networking.k8s.io/v1",
        kind: "NetworkPolicy",
        metadata: {
            name: policy.name,
            namespace: policy.namespace,
            uid: generateUID(),
            resourceVersion: String(Math.floor(Math.random() * 9000000) + 1000000),
            generation: 1,
            creationTimestamp: creationTime.toISOString(),
            annotations: {
                "kubectl.kubernetes.io/last-applied-configuration": `{\"apiVersion\":\"networking.k8s.io/v1\",\"kind\":\"NetworkPolicy\",\"metadata\":{\"name\":\"${policy.name}\",\"namespace\":\"${policy.namespace}\"}}`
            }
        },
        spec: {
            podSelector: {
                matchLabels: {
                    app: policy.podSelector || "nginx"
                }
            },
            policyTypes: policyTypes,
            ingress: ingressRules.length > 0 ? ingressRules : undefined,
            egress: egressRules.length > 0 ? egressRules : undefined
        }
    };
}

// Network Policy Detail Modal
function showNetworkPolicyDetailModal(policy, cluster) {
    const modal = document.getElementById('k8s-detail-modal');
    const content = document.getElementById('k8s-detail-content');
    const modalTitle = modal.querySelector('.modal-title');

    // Update modal title
    modalTitle.textContent = `Network Policy ${policy.name} Details`;

    // Generate detailed network policy data matching networkpolicy.json structure
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
                    <div class="detail-item">
                        <span class="detail-label">Name:</span>
                        <span class="detail-value">${policyDetails.metadata.name}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Namespace:</span>
                        <span class="detail-value">${policyDetails.metadata.namespace}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">UID:</span>
                        <span class="detail-value">${policyDetails.metadata.uid}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Cluster:</span>
                        <span class="detail-value">${cluster}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Policy Types:</span>
                        <span class="detail-value">${policyDetails.spec.policyTypes.map(t => `<span class="status-badge status-operational">${t}</span>`).join(' ')}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Generation:</span>
                        <span class="detail-value">${policyDetails.metadata.generation}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Creation Time:</span>
                        <span class="detail-value">${policyDetails.metadata.creationTimestamp}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Resource Version:</span>
                        <span class="detail-value">${policyDetails.metadata.resourceVersion}</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="modal-tab-content" data-tab-content="metadata">
            <div class="detail-section">
                <h3>Metadata</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Name:</span>
                        <span class="detail-value">${policyDetails.metadata.name}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Namespace:</span>
                        <span class="detail-value">${policyDetails.metadata.namespace}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">UID:</span>
                        <span class="detail-value">${policyDetails.metadata.uid}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Resource Version:</span>
                        <span class="detail-value">${policyDetails.metadata.resourceVersion}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Generation:</span>
                        <span class="detail-value">${policyDetails.metadata.generation}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Creation Timestamp:</span>
                        <span class="detail-value">${policyDetails.metadata.creationTimestamp}</span>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <h3>Annotations</h3>
                <table class="detail-table">
                    <thead>
                        <tr>
                            <th>Key</th>
                            <th>Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(policyDetails.metadata.annotations).map(([key, value]) => `
                            <tr>
                                <td><code>${key}</code></td>
                                <td style="max-width: 400px; word-break: break-all; font-size: 11px;">${value}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="modal-tab-content" data-tab-content="spec">
            <div class="detail-section">
                <h3>Network Policy Spec</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Policy Types:</span>
                        <span class="detail-value">${policyDetails.spec.policyTypes.join(', ')}</span>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <h3>Pod Selector</h3>
                <table class="detail-table">
                    <thead>
                        <tr>
                            <th>Match Labels - Key</th>
                            <th>Match Labels - Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(policyDetails.spec.podSelector.matchLabels).map(([key, value]) => `
                            <tr>
                                <td><code>${key}</code></td>
                                <td>${value}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="modal-tab-content" data-tab-content="ingress">
            <div class="detail-section">
                <h3>Ingress Rules</h3>
                ${policyDetails.spec.ingress && policyDetails.spec.ingress.length > 0 ? `
                    ${policyDetails.spec.ingress.map((rule, idx) => `
                        <div class="detail-section">
                            <h4 style="color: #0ea5e9; margin-bottom: 12px;">Ingress Rule ${idx + 1}</h4>

                            ${rule.from && rule.from.length > 0 ? `
                                <h5 style="color: #666; margin-top: 16px; margin-bottom: 8px;">From Selectors</h5>
                                ${rule.from.map((from, fromIdx) => `
                                    <div style="margin-bottom: 16px;">
                                        ${from.podSelector ? `
                                            <p style="margin-bottom: 8px;"><strong>Pod Selector ${fromIdx + 1}:</strong></p>
                                            <table class="detail-table">
                                                <thead>
                                                    <tr>
                                                        <th>Match Labels - Key</th>
                                                        <th>Match Labels - Value</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    ${Object.entries(from.podSelector.matchLabels || {}).map(([key, value]) => `
                                                        <tr>
                                                            <td><code>${key}</code></td>
                                                            <td>${value}</td>
                                                        </tr>
                                                    `).join('')}
                                                </tbody>
                                            </table>
                                        ` : ''}
                                        ${from.namespaceSelector ? `
                                            <p style="margin-bottom: 8px;"><strong>Namespace Selector ${fromIdx + 1}:</strong></p>
                                            <table class="detail-table">
                                                <thead>
                                                    <tr>
                                                        <th>Match Labels - Key</th>
                                                        <th>Match Labels - Value</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    ${Object.entries(from.namespaceSelector.matchLabels || {}).map(([key, value]) => `
                                                        <tr>
                                                            <td><code>${key}</code></td>
                                                            <td>${value}</td>
                                                        </tr>
                                                    `).join('')}
                                                </tbody>
                                            </table>
                                        ` : ''}
                                    </div>
                                `).join('')}
                            ` : '<p style="color: #718096;">Allow from all sources</p>'}

                            ${rule.ports && rule.ports.length > 0 ? `
                                <h5 style="color: #666; margin-top: 16px; margin-bottom: 8px;">Ports</h5>
                                <table class="detail-table">
                                    <thead>
                                        <tr>
                                            <th>Protocol</th>
                                            <th>Port</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${rule.ports.map(port => `
                                            <tr>
                                                <td>${port.protocol}</td>
                                                <td><code>${port.port}</code></td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            ` : '<p style="color: #718096; margin-top: 8px;">All ports allowed</p>'}
                        </div>
                    `).join('')}
                ` : '<p style="color: #718096; padding: 20px;">No ingress rules defined. All ingress traffic is denied.</p>'}
            </div>
        </div>

        <div class="modal-tab-content" data-tab-content="egress">
            <div class="detail-section">
                <h3>Egress Rules</h3>
                ${policyDetails.spec.egress && policyDetails.spec.egress.length > 0 ? `
                    ${policyDetails.spec.egress.map((rule, idx) => `
                        <div class="detail-section">
                            <h4 style="color: #0ea5e9; margin-bottom: 12px;">Egress Rule ${idx + 1}</h4>

                            ${rule.to && rule.to.length > 0 ? `
                                <h5 style="color: #666; margin-top: 16px; margin-bottom: 8px;">To Selectors</h5>
                                ${rule.to.map((to, toIdx) => `
                                    <div style="margin-bottom: 16px;">
                                        ${to.podSelector ? `
                                            <p style="margin-bottom: 8px;"><strong>Pod Selector ${toIdx + 1}:</strong></p>
                                            <table class="detail-table">
                                                <thead>
                                                    <tr>
                                                        <th>Match Labels - Key</th>
                                                        <th>Match Labels - Value</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    ${Object.entries(to.podSelector.matchLabels || {}).map(([key, value]) => `
                                                        <tr>
                                                            <td><code>${key}</code></td>
                                                            <td>${value}</td>
                                                        </tr>
                                                    `).join('')}
                                                </tbody>
                                            </table>
                                        ` : ''}
                                        ${to.namespaceSelector ? `
                                            <p style="margin-bottom: 8px;"><strong>Namespace Selector ${toIdx + 1}:</strong></p>
                                            <table class="detail-table">
                                                <thead>
                                                    <tr>
                                                        <th>Match Labels - Key</th>
                                                        <th>Match Labels - Value</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    ${Object.entries(to.namespaceSelector.matchLabels || {}).map(([key, value]) => `
                                                        <tr>
                                                            <td><code>${key}</code></td>
                                                            <td>${value}</td>
                                                        </tr>
                                                    `).join('')}
                                                </tbody>
                                            </table>
                                        ` : ''}
                                    </div>
                                `).join('')}
                            ` : '<p style="color: #718096;">Allow to all destinations</p>'}

                            ${rule.ports && rule.ports.length > 0 ? `
                                <h5 style="color: #666; margin-top: 16px; margin-bottom: 8px;">Ports</h5>
                                <table class="detail-table">
                                    <thead>
                                        <tr>
                                            <th>Protocol</th>
                                            <th>Port</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${rule.ports.map(port => `
                                            <tr>
                                                <td>${port.protocol}</td>
                                                <td><code>${port.port}</code></td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            ` : '<p style="color: #718096; margin-top: 8px;">All ports allowed</p>'}
                        </div>
                    `).join('')}
                ` : '<p style="color: #718096; padding: 20px;">No egress rules defined. All egress traffic is denied.</p>'}
            </div>
        </div>
    `;

    setupK8sModalTabs(content);
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}
