// StatefulSet Detail Modal and Helper Functions

// Generate detailed statefulset data matching statefulset.json structure
function generateStatefulSetDetails(statefulset, cluster) {
    const generateUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    const creationTime = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);

    // Parse replica counts from statefulset ready field (e.g., "3/3")
    const readyParts = statefulset.ready.split('/');
    const readyReplicas = parseInt(readyParts[0]);
    const totalReplicas = parseInt(readyParts[1]);

    return {
        apiVersion: "apps/v1",
        kind: "StatefulSet",
        metadata: {
            name: statefulset.name,
            namespace: statefulset.namespace,
            uid: generateUID(),
            resourceVersion: String(Math.floor(Math.random() * 9000000) + 1000000),
            generation: 1,
            creationTimestamp: creationTime.toISOString(),
            labels: {
                "app": statefulset.name
            },
            annotations: {
                "kubectl.kubernetes.io/last-applied-configuration": `{"apiVersion":"apps/v1","kind":"StatefulSet","metadata":{"labels":{"app":"${statefulset.name}"},"name":"${statefulset.name}","namespace":"${statefulset.namespace}"}}`
            }
        },
        spec: {
            replicas: totalReplicas,
            serviceName: statefulset.name,
            revisionHistoryLimit: 10,
            podManagementPolicy: "OrderedReady",
            persistentVolumeClaimRetentionPolicy: {
                whenDeleted: "Retain",
                whenScaled: "Retain"
            },
            selector: {
                matchLabels: {
                    "app": statefulset.name
                }
            },
            updateStrategy: {
                type: "RollingUpdate",
                rollingUpdate: {
                    partition: 0
                }
            },
            template: {
                metadata: {
                    creationTimestamp: null,
                    labels: {
                        "app": statefulset.name
                    }
                },
                spec: {
                    containers: statefulset.containers.split(',').map((containerName, idx) => ({
                        name: containerName.trim(),
                        image: statefulset.images.split(',')[idx]?.trim() || `${containerName.trim()}:latest`,
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
            readyReplicas: readyReplicas,
            currentReplicas: totalReplicas,
            updatedReplicas: totalReplicas,
            availableReplicas: readyReplicas,
            observedGeneration: 1,
            currentRevision: `${statefulset.name}-${Math.random().toString(36).substring(2, 12)}`,
            updateRevision: `${statefulset.name}-${Math.random().toString(36).substring(2, 12)}`,
            collisionCount: 0
        }
    };
}

// StatefulSet Detail Modal
function showStatefulSetDetailModal(statefulset, cluster) {
    const modal = document.getElementById('k8s-detail-modal');
    const content = document.getElementById('k8s-detail-content');
    const modalTitle = modal.querySelector('.modal-title');

    // Update modal title
    modalTitle.textContent = `StatefulSet ${statefulset.name} Details`;

    // Generate detailed statefulset data matching statefulset.json structure
    const statefulsetDetails = generateStatefulSetDetails(statefulset, cluster);

    content.innerHTML = `
        <div class="modal-tabs">
            <div class="modal-tab active" data-tab="overview">Overview</div>
            <div class="modal-tab" data-tab="metadata">Metadata</div>
            <div class="modal-tab" data-tab="spec">Spec</div>
            <div class="modal-tab" data-tab="template">Template</div>
            <div class="modal-tab" data-tab="status">Status</div>
        </div>

        <div class="modal-tab-content active" data-tab-content="overview">
            <div class="detail-section">
                <h3>StatefulSet Information</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Name:</span>
                        <span class="detail-value">${statefulsetDetails.metadata.name}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Namespace:</span>
                        <span class="detail-value">${statefulsetDetails.metadata.namespace}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">UID:</span>
                        <span class="detail-value">${statefulsetDetails.metadata.uid}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Cluster:</span>
                        <span class="detail-value">${cluster}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Service Name:</span>
                        <span class="detail-value">${statefulsetDetails.spec.serviceName}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Generation:</span>
                        <span class="detail-value">${statefulsetDetails.metadata.generation}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Replicas:</span>
                        <span class="detail-value">${statefulsetDetails.spec.replicas}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Ready Replicas:</span>
                        <span class="detail-value"><span class="status-badge ${statefulsetDetails.status.readyReplicas === statefulsetDetails.spec.replicas ? 'status-operational' : 'status-warning'}">${statefulsetDetails.status.readyReplicas}/${statefulsetDetails.spec.replicas}</span></span>
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
                        <span class="detail-value">${statefulsetDetails.metadata.name}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Namespace:</span>
                        <span class="detail-value">${statefulsetDetails.metadata.namespace}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">UID:</span>
                        <span class="detail-value">${statefulsetDetails.metadata.uid}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Resource Version:</span>
                        <span class="detail-value">${statefulsetDetails.metadata.resourceVersion}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Generation:</span>
                        <span class="detail-value">${statefulsetDetails.metadata.generation}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Creation Timestamp:</span>
                        <span class="detail-value">${statefulsetDetails.metadata.creationTimestamp}</span>
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
                        ${Object.entries(statefulsetDetails.metadata.labels).map(([key, value]) => `
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
                        ${Object.entries(statefulsetDetails.metadata.annotations).map(([key, value]) => `
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
                <h3>StatefulSet Spec</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Replicas:</span>
                        <span class="detail-value">${statefulsetDetails.spec.replicas}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Service Name:</span>
                        <span class="detail-value">${statefulsetDetails.spec.serviceName}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Pod Management Policy:</span>
                        <span class="detail-value">${statefulsetDetails.spec.podManagementPolicy}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Revision History Limit:</span>
                        <span class="detail-value">${statefulsetDetails.spec.revisionHistoryLimit}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Update Strategy Type:</span>
                        <span class="detail-value">${statefulsetDetails.spec.updateStrategy.type}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Rolling Update Partition:</span>
                        <span class="detail-value">${statefulsetDetails.spec.updateStrategy.rollingUpdate.partition}</span>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <h3>Persistent Volume Claim Retention Policy</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">When Deleted:</span>
                        <span class="detail-value">${statefulsetDetails.spec.persistentVolumeClaimRetentionPolicy.whenDeleted}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">When Scaled:</span>
                        <span class="detail-value">${statefulsetDetails.spec.persistentVolumeClaimRetentionPolicy.whenScaled}</span>
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
                        ${Object.entries(statefulsetDetails.spec.selector.matchLabels).map(([key, value]) => `
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
                        <span class="detail-value">${statefulsetDetails.spec.template.spec.dnsPolicy}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Restart Policy:</span>
                        <span class="detail-value">${statefulsetDetails.spec.template.spec.restartPolicy}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Scheduler Name:</span>
                        <span class="detail-value">${statefulsetDetails.spec.template.spec.schedulerName}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Termination Grace Period:</span>
                        <span class="detail-value">${statefulsetDetails.spec.template.spec.terminationGracePeriodSeconds}s</span>
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
                        ${Object.entries(statefulsetDetails.spec.template.metadata.labels).map(([key, value]) => `
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
                ${statefulsetDetails.spec.template.spec.containers.map(container => `
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

        <div class="modal-tab-content" data-tab-content="status">
            <div class="detail-section">
                <h3>Replica Status</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Replicas:</span>
                        <span class="detail-value">${statefulsetDetails.status.replicas}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Ready Replicas:</span>
                        <span class="detail-value">${statefulsetDetails.status.readyReplicas}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Current Replicas:</span>
                        <span class="detail-value">${statefulsetDetails.status.currentReplicas}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Updated Replicas:</span>
                        <span class="detail-value">${statefulsetDetails.status.updatedReplicas}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Available Replicas:</span>
                        <span class="detail-value">${statefulsetDetails.status.availableReplicas}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Observed Generation:</span>
                        <span class="detail-value">${statefulsetDetails.status.observedGeneration}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Collision Count:</span>
                        <span class="detail-value">${statefulsetDetails.status.collisionCount}</span>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <h3>Revisions</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Current Revision:</span>
                        <span class="detail-value"><code>${statefulsetDetails.status.currentRevision}</code></span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Update Revision:</span>
                        <span class="detail-value"><code>${statefulsetDetails.status.updateRevision}</code></span>
                    </div>
                </div>
            </div>
        </div>
    `;

    setupK8sModalTabs(content);
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

