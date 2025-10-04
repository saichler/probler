// Deployment Detail Modal and Helper Functions

// Generate detailed deployment data matching deployment.json structure
function generateDeploymentDetails(deployment, cluster) {
    const generateUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    const creationTime = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
    const updateTime = new Date(creationTime.getTime() + Math.random() * 60000);

    // Parse replica counts from deployment ready field (e.g., "3/3")
    const readyParts = deployment.ready.split('/');
    const readyReplicas = parseInt(readyParts[0]);
    const totalReplicas = parseInt(readyParts[1]);

    return {
        apiVersion: "apps/v1",
        kind: "Deployment",
        metadata: {
            name: deployment.name,
            namespace: deployment.namespace,
            uid: generateUID(),
            resourceVersion: String(Math.floor(Math.random() * 9000000) + 1000000),
            generation: 1,
            creationTimestamp: creationTime.toISOString(),
            labels: {
                "app": deployment.name
            },
            annotations: {
                "deployment.kubernetes.io/revision": "1",
                "kubectl.kubernetes.io/last-applied-configuration": `{"apiVersion":"apps/v1","kind":"Deployment","metadata":{"labels":{"app":"${deployment.name}"},"name":"${deployment.name}","namespace":"${deployment.namespace}"}}`
            }
        },
        spec: {
            replicas: totalReplicas,
            revisionHistoryLimit: 10,
            progressDeadlineSeconds: 600,
            selector: {
                matchLabels: {
                    "app": deployment.name
                }
            },
            strategy: {
                type: "RollingUpdate",
                rollingUpdate: {
                    maxUnavailable: "25%",
                    maxSurge: "25%"
                }
            },
            template: {
                metadata: {
                    creationTimestamp: null,
                    labels: {
                        "app": deployment.name
                    }
                },
                spec: {
                    containers: deployment.containers.split(',').map((containerName, idx) => ({
                        name: containerName.trim(),
                        image: deployment.images.split(',')[idx]?.trim() || `${containerName.trim()}:latest`,
                        imagePullPolicy: "Always",
                        env: [
                            {
                                name: "NODE_IP",
                                valueFrom: {
                                    fieldRef: {
                                        apiVersion: "v1",
                                        fieldPath: "status.hostIP"
                                    }
                                }
                            }
                        ],
                        resources: {},
                        terminationMessagePath: "/dev/termination-log",
                        terminationMessagePolicy: "File"
                    })),
                    dnsPolicy: "ClusterFirst",
                    restartPolicy: "Always",
                    schedulerName: "default-scheduler",
                    securityContext: {},
                    terminationGracePeriodSeconds: 30
                }
            }
        },
        status: {
            replicas: totalReplicas,
            updatedReplicas: totalReplicas,
            readyReplicas: readyReplicas,
            availableReplicas: readyReplicas,
            observedGeneration: 1,
            conditions: [
                {
                    type: "Available",
                    status: readyReplicas === totalReplicas ? "True" : "False",
                    reason: "MinimumReplicasAvailable",
                    message: "Deployment has minimum availability.",
                    lastUpdateTime: updateTime.toISOString(),
                    lastTransitionTime: new Date(creationTime.getTime() + 3000).toISOString()
                },
                {
                    type: "Progressing",
                    status: "True",
                    reason: "NewReplicaSetAvailable",
                    message: `ReplicaSet "${deployment.name}-${Math.random().toString(36).substring(2, 12)}" has successfully progressed.`,
                    lastUpdateTime: new Date(updateTime.getTime() + 1000).toISOString(),
                    lastTransitionTime: creationTime.toISOString()
                }
            ]
        }
    };
}

// Deployment Detail Modal
function showDeploymentDetailModal(deployment, cluster) {
    const modal = document.getElementById('k8s-detail-modal');
    const content = document.getElementById('k8s-detail-content');
    const modalTitle = modal.querySelector('.modal-title');

    // Update modal title
    modalTitle.textContent = `Deployment ${deployment.name} Details`;

    // Generate detailed deployment data matching deployment.json structure
    const deploymentDetails = generateDeploymentDetails(deployment, cluster);

    content.innerHTML = `
        <div class="modal-tabs">
            <div class="modal-tab active" data-tab="overview">Overview</div>
            <div class="modal-tab" data-tab="metadata">Metadata</div>
            <div class="modal-tab" data-tab="spec">Spec</div>
            <div class="modal-tab" data-tab="template">Template</div>
            <div class="modal-tab" data-tab="conditions">Conditions</div>
            <div class="modal-tab" data-tab="status">Status</div>
        </div>

        <div class="modal-tab-content active" data-tab-content="overview">
            <div class="detail-section">
                <h3>Deployment Information</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Name:</span>
                        <span class="detail-value">${deploymentDetails.metadata.name}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Namespace:</span>
                        <span class="detail-value">${deploymentDetails.metadata.namespace}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">UID:</span>
                        <span class="detail-value">${deploymentDetails.metadata.uid}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Cluster:</span>
                        <span class="detail-value">${cluster}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Generation:</span>
                        <span class="detail-value">${deploymentDetails.metadata.generation}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Creation Time:</span>
                        <span class="detail-value">${deploymentDetails.metadata.creationTimestamp}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Replicas:</span>
                        <span class="detail-value">${deploymentDetails.spec.replicas}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Ready Replicas:</span>
                        <span class="detail-value"><span class="status-badge ${deploymentDetails.status.readyReplicas === deploymentDetails.spec.replicas ? 'status-operational' : 'status-warning'}">${deploymentDetails.status.readyReplicas}/${deploymentDetails.spec.replicas}</span></span>
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
                        <span class="detail-value">${deploymentDetails.metadata.name}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Namespace:</span>
                        <span class="detail-value">${deploymentDetails.metadata.namespace}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">UID:</span>
                        <span class="detail-value">${deploymentDetails.metadata.uid}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Resource Version:</span>
                        <span class="detail-value">${deploymentDetails.metadata.resourceVersion}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Generation:</span>
                        <span class="detail-value">${deploymentDetails.metadata.generation}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Creation Timestamp:</span>
                        <span class="detail-value">${deploymentDetails.metadata.creationTimestamp}</span>
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
                        ${Object.entries(deploymentDetails.metadata.labels).map(([key, value]) => `
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
                        ${Object.entries(deploymentDetails.metadata.annotations).map(([key, value]) => `
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
                <h3>Deployment Spec</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Replicas:</span>
                        <span class="detail-value">${deploymentDetails.spec.replicas}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Revision History Limit:</span>
                        <span class="detail-value">${deploymentDetails.spec.revisionHistoryLimit}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Progress Deadline:</span>
                        <span class="detail-value">${deploymentDetails.spec.progressDeadlineSeconds}s</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Strategy Type:</span>
                        <span class="detail-value">${deploymentDetails.spec.strategy.type}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Max Unavailable:</span>
                        <span class="detail-value">${deploymentDetails.spec.strategy.rollingUpdate.maxUnavailable}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Max Surge:</span>
                        <span class="detail-value">${deploymentDetails.spec.strategy.rollingUpdate.maxSurge}</span>
                    </div>
                </div>
            </div>

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
                        ${Object.entries(deploymentDetails.spec.selector.matchLabels).map(([key, value]) => `
                            <tr>
                                <td><code>${key}</code></td>
                                <td>${value}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="modal-tab-content" data-tab-content="template">
            <div class="detail-section">
                <h3>Pod Template</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">DNS Policy:</span>
                        <span class="detail-value">${deploymentDetails.spec.template.spec.dnsPolicy}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Restart Policy:</span>
                        <span class="detail-value">${deploymentDetails.spec.template.spec.restartPolicy}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Scheduler Name:</span>
                        <span class="detail-value">${deploymentDetails.spec.template.spec.schedulerName}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Termination Grace Period:</span>
                        <span class="detail-value">${deploymentDetails.spec.template.spec.terminationGracePeriodSeconds}s</span>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <h3>Template Labels</h3>
                <table class="detail-table">
                    <thead>
                        <tr>
                            <th>Key</th>
                            <th>Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(deploymentDetails.spec.template.metadata.labels).map(([key, value]) => `
                            <tr>
                                <td><code>${key}</code></td>
                                <td>${value}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div class="detail-section">
                <h3>Containers</h3>
                ${deploymentDetails.spec.template.spec.containers.map(container => `
                    <div class="detail-section">
                        <h4 style="color: #0ea5e9; margin-bottom: 12px;">Container: ${container.name}</h4>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <span class="detail-label">Image:</span>
                                <span class="detail-value"><code>${container.image}</code></span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Image Pull Policy:</span>
                                <span class="detail-value">${container.imagePullPolicy}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Termination Message Path:</span>
                                <span class="detail-value"><code>${container.terminationMessagePath}</code></span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Termination Message Policy:</span>
                                <span class="detail-value">${container.terminationMessagePolicy}</span>
                            </div>
                        </div>

                        ${container.env && container.env.length > 0 ? `
                            <h5 style="color: #666; margin-top: 16px; margin-bottom: 8px;">Environment Variables</h5>
                            <table class="detail-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Value / Value From</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${container.env.map(envVar => `
                                        <tr>
                                            <td><code>${envVar.name}</code></td>
                                            <td>${envVar.value || (envVar.valueFrom ? JSON.stringify(envVar.valueFrom.fieldRef) : 'N/A')}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="modal-tab-content" data-tab-content="conditions">
            <div class="detail-section">
                <h3>Deployment Conditions</h3>
                <table class="detail-table">
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>Status</th>
                            <th>Reason</th>
                            <th>Message</th>
                            <th>Last Update Time</th>
                            <th>Last Transition Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${deploymentDetails.status.conditions.map(condition => `
                            <tr>
                                <td><strong>${condition.type}</strong></td>
                                <td><span class="status-badge ${condition.status === 'True' ? 'status-operational' : 'status-warning'}">${condition.status}</span></td>
                                <td>${condition.reason}</td>
                                <td style="max-width: 300px;">${condition.message}</td>
                                <td>${condition.lastUpdateTime}</td>
                                <td>${condition.lastTransitionTime}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="modal-tab-content" data-tab-content="status">
            <div class="detail-section">
                <h3>Replica Status</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Replicas:</span>
                        <span class="detail-value">${deploymentDetails.status.replicas}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Updated Replicas:</span>
                        <span class="detail-value">${deploymentDetails.status.updatedReplicas}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Ready Replicas:</span>
                        <span class="detail-value">${deploymentDetails.status.readyReplicas}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Available Replicas:</span>
                        <span class="detail-value">${deploymentDetails.status.availableReplicas}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Observed Generation:</span>
                        <span class="detail-value">${deploymentDetails.status.observedGeneration}</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    setupK8sModalTabs(content);
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}
