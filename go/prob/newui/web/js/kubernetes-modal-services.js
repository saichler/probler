// Service Detail Modal and Helper Functions

// Generate detailed service data matching service.json structure
function generateServiceDetails(service, cluster) {
    const generateUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    const creationTime = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);

    // Parse ports from service.ports field (e.g., "53:53/UDP,53:53/TCP")
    const portEntries = service.ports.split(',').map(p => {
        const parts = p.trim().split(':');
        const port = parseInt(parts[0]);
        const targetPart = parts[1] || parts[0];
        const [targetPort, protocol] = targetPart.split('/');
        return {
            name: protocol ? protocol.toLowerCase() : 'tcp',
            port: port,
            protocol: protocol || 'TCP',
            targetPort: parseInt(targetPort)
        };
    });

    return {
        apiVersion: "v1",
        kind: "Service",
        metadata: {
            name: service.name,
            namespace: service.namespace,
            uid: generateUID(),
            resourceVersion: String(Math.floor(Math.random() * 9000000) + 1000000),
            creationTimestamp: creationTime.toISOString(),
            labels: {
                "k8s-app": service.name,
                "kubernetes.io/cluster-service": "true",
                "kubernetes.io/name": service.name
            },
            annotations: {
                "prometheus.io/port": "9153",
                "prometheus.io/scrape": "true"
            }
        },
        spec: {
            clusterIP: service.clusterIP,
            clusterIPs: [service.clusterIP],
            internalTrafficPolicy: "Cluster",
            ipFamilies: ["IPv4"],
            ipFamilyPolicy: "SingleStack",
            ports: portEntries,
            selector: service.selector ? { "app": service.selector } : {},
            sessionAffinity: "None",
            type: service.type
        },
        status: {
            loadBalancer: service.type === "LoadBalancer" ? {
                ingress: [{ ip: service.externalIP || "pending" }]
            } : {}
        }
    };
}

// Service Detail Modal
function showServiceDetailModal(service, cluster) {
    const modal = document.getElementById('k8s-detail-modal');
    const content = document.getElementById('k8s-detail-content');
    const modalTitle = modal.querySelector('.modal-title');

    // Update modal title
    modalTitle.textContent = `Service ${service.name} Details`;

    // Generate detailed service data matching service.json structure
    const serviceDetails = generateServiceDetails(service, cluster);

    content.innerHTML = `
        <div class="modal-tabs">
            <div class="modal-tab active" data-tab="overview">Overview</div>
            <div class="modal-tab" data-tab="metadata">Metadata</div>
            <div class="modal-tab" data-tab="spec">Spec</div>
            <div class="modal-tab" data-tab="ports">Ports</div>
            <div class="modal-tab" data-tab="status">Status</div>
        </div>

        <div class="modal-tab-content active" data-tab-content="overview">
            <div class="detail-section">
                <h3>Service Information</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Name:</span>
                        <span class="detail-value">${serviceDetails.metadata.name}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Namespace:</span>
                        <span class="detail-value">${serviceDetails.metadata.namespace}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">UID:</span>
                        <span class="detail-value">${serviceDetails.metadata.uid}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Cluster:</span>
                        <span class="detail-value">${cluster}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Type:</span>
                        <span class="detail-value"><span class="status-badge ${serviceDetails.spec.type === 'LoadBalancer' ? 'status-operational' : 'status-warning'}">${serviceDetails.spec.type}</span></span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Cluster IP:</span>
                        <span class="detail-value"><code>${serviceDetails.spec.clusterIP}</code></span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Session Affinity:</span>
                        <span class="detail-value">${serviceDetails.spec.sessionAffinity}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Creation Time:</span>
                        <span class="detail-value">${serviceDetails.metadata.creationTimestamp}</span>
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
                        <span class="detail-value">${serviceDetails.metadata.name}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Namespace:</span>
                        <span class="detail-value">${serviceDetails.metadata.namespace}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">UID:</span>
                        <span class="detail-value">${serviceDetails.metadata.uid}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Resource Version:</span>
                        <span class="detail-value">${serviceDetails.metadata.resourceVersion}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Creation Timestamp:</span>
                        <span class="detail-value">${serviceDetails.metadata.creationTimestamp}</span>
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
                        ${Object.entries(serviceDetails.metadata.labels).map(([key, value]) => `
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
                        ${Object.entries(serviceDetails.metadata.annotations).map(([key, value]) => `
                            <tr>
                                <td><code>${key}</code></td>
                                <td>${value}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="modal-tab-content" data-tab-content="spec">
            <div class="detail-section">
                <h3>Service Spec</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Type:</span>
                        <span class="detail-value">${serviceDetails.spec.type}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Cluster IP:</span>
                        <span class="detail-value"><code>${serviceDetails.spec.clusterIP}</code></span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Session Affinity:</span>
                        <span class="detail-value">${serviceDetails.spec.sessionAffinity}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Internal Traffic Policy:</span>
                        <span class="detail-value">${serviceDetails.spec.internalTrafficPolicy}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">IP Family Policy:</span>
                        <span class="detail-value">${serviceDetails.spec.ipFamilyPolicy}</span>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <h3>Cluster IPs</h3>
                <table class="detail-table">
                    <thead>
                        <tr>
                            <th>IP Address</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${serviceDetails.spec.clusterIPs.map(ip => `
                            <tr>
                                <td><code>${ip}</code></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div class="detail-section">
                <h3>IP Families</h3>
                <table class="detail-table">
                    <thead>
                        <tr>
                            <th>IP Family</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${serviceDetails.spec.ipFamilies.map(family => `
                            <tr>
                                <td>${family}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            ${Object.keys(serviceDetails.spec.selector).length > 0 ? `
                <div class="detail-section">
                    <h3>Selector</h3>
                    <table class="detail-table">
                        <thead>
                            <tr>
                                <th>Key</th>
                                <th>Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.entries(serviceDetails.spec.selector).map(([key, value]) => `
                                <tr>
                                    <td><code>${key}</code></td>
                                    <td>${value}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : ''}
        </div>

        <div class="modal-tab-content" data-tab-content="ports">
            <div class="detail-section">
                <h3>Service Ports</h3>
                <table class="detail-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Port</th>
                            <th>Target Port</th>
                            <th>Protocol</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${serviceDetails.spec.ports.map(port => `
                            <tr>
                                <td><strong>${port.name}</strong></td>
                                <td><code>${port.port}</code></td>
                                <td><code>${port.targetPort}</code></td>
                                <td>${port.protocol}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="modal-tab-content" data-tab-content="status">
            <div class="detail-section">
                <h3>Service Status</h3>
                ${serviceDetails.spec.type === 'LoadBalancer' && serviceDetails.status.loadBalancer.ingress ? `
                    <div class="detail-section">
                        <h4 style="color: #0ea5e9; margin-bottom: 12px;">Load Balancer</h4>
                        <table class="detail-table">
                            <thead>
                                <tr>
                                    <th>Ingress IP</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${serviceDetails.status.loadBalancer.ingress.map(ing => `
                                    <tr>
                                        <td><code>${ing.ip}</code></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : '<p style="color: #718096; padding: 20px;">No load balancer status available</p>'}
            </div>
        </div>
    `;

    setupK8sModalTabs(content);
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}
