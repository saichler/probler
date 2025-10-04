// Pod Detail Modal and Helper Functions

// Pod Detail Modal
function showPodDetailModal(pod, cluster) {
    const modal = document.getElementById('k8s-detail-modal');
    const content = document.getElementById('k8s-detail-content');
    const modalTitle = modal.querySelector('.modal-title');

    // Update modal title
    modalTitle.textContent = `Pod ${pod.name} Details`;

    // Generate detailed pod data matching pod.json structure
    const podDetails = generatePodDetails(pod, cluster);

    content.innerHTML = `
        <div class="modal-tabs">
            <div class="modal-tab active" data-tab="overview">Overview</div>
            <div class="modal-tab" data-tab="metadata">Metadata</div>
            <div class="modal-tab" data-tab="spec">Spec</div>
            <div class="modal-tab" data-tab="containers">Containers</div>
            <div class="modal-tab" data-tab="volumes">Volumes</div>
            <div class="modal-tab" data-tab="conditions">Conditions</div>
            <div class="modal-tab" data-tab="status">Status</div>
        </div>

        <div class="modal-tab-content active" data-tab-content="overview">
            <div class="detail-section">
                <h3>Pod Information</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Name:</span>
                        <span class="detail-value">${podDetails.metadata.name}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Namespace:</span>
                        <span class="detail-value">${podDetails.metadata.namespace}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">UID:</span>
                        <span class="detail-value">${podDetails.metadata.uid}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Cluster:</span>
                        <span class="detail-value">${cluster}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Phase:</span>
                        <span class="detail-value"><span class="status-badge ${podDetails.status.phase === 'Running' ? 'status-operational' : 'status-critical'}">${podDetails.status.phase}</span></span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">QoS Class:</span>
                        <span class="detail-value">${podDetails.status.qosClass}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Node:</span>
                        <span class="detail-value">${podDetails.spec.nodeName}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Pod IP:</span>
                        <span class="detail-value">${podDetails.status.podIP}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Host IP:</span>
                        <span class="detail-value">${podDetails.status.hostIP}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Start Time:</span>
                        <span class="detail-value">${podDetails.status.startTime}</span>
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
                        <span class="detail-value">${podDetails.metadata.name}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Generate Name:</span>
                        <span class="detail-value">${podDetails.metadata.generateName}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Namespace:</span>
                        <span class="detail-value">${podDetails.metadata.namespace}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">UID:</span>
                        <span class="detail-value">${podDetails.metadata.uid}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Resource Version:</span>
                        <span class="detail-value">${podDetails.metadata.resourceVersion}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Creation Timestamp:</span>
                        <span class="detail-value">${podDetails.metadata.creationTimestamp}</span>
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
                        ${Object.entries(podDetails.metadata.labels).map(([key, value]) => `
                            <tr>
                                <td><code>${key}</code></td>
                                <td>${value}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div class="detail-section">
                <h3>Owner References</h3>
                <table class="detail-table">
                    <thead>
                        <tr>
                            <th>Kind</th>
                            <th>Name</th>
                            <th>UID</th>
                            <th>Controller</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${podDetails.metadata.ownerReferences.map(ref => `
                            <tr>
                                <td><strong>${ref.kind}</strong></td>
                                <td>${ref.name}</td>
                                <td style="font-size: 11px;">${ref.uid}</td>
                                <td>${ref.controller ? 'Yes' : 'No'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="modal-tab-content" data-tab-content="spec">
            <div class="detail-section">
                <h3>Pod Spec</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Node Name:</span>
                        <span class="detail-value">${podDetails.spec.nodeName}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Service Account:</span>
                        <span class="detail-value">${podDetails.spec.serviceAccountName}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Restart Policy:</span>
                        <span class="detail-value">${podDetails.spec.restartPolicy}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">DNS Policy:</span>
                        <span class="detail-value">${podDetails.spec.dnsPolicy}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Scheduler Name:</span>
                        <span class="detail-value">${podDetails.spec.schedulerName}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Priority:</span>
                        <span class="detail-value">${podDetails.spec.priority}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Preemption Policy:</span>
                        <span class="detail-value">${podDetails.spec.preemptionPolicy}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Termination Grace Period:</span>
                        <span class="detail-value">${podDetails.spec.terminationGracePeriodSeconds}s</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Enable Service Links:</span>
                        <span class="detail-value">${podDetails.spec.enableServiceLinks ? 'Yes' : 'No'}</span>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <h3>Tolerations</h3>
                <table class="detail-table">
                    <thead>
                        <tr>
                            <th>Key</th>
                            <th>Operator</th>
                            <th>Effect</th>
                            <th>Toleration Seconds</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${podDetails.spec.tolerations.map(tol => `
                            <tr>
                                <td><code>${tol.key}</code></td>
                                <td>${tol.operator}</td>
                                <td>${tol.effect}</td>
                                <td>${tol.tolerationSeconds || 'N/A'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="modal-tab-content" data-tab-content="containers">
            <div class="detail-section">
                <h3>Container Specifications</h3>
                ${podDetails.spec.containers.map(container => `
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

                        ${container.volumeMounts && container.volumeMounts.length > 0 ? `
                            <h5 style="color: #666; margin-top: 16px; margin-bottom: 8px;">Volume Mounts</h5>
                            <table class="detail-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Mount Path</th>
                                        <th>Read Only</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${container.volumeMounts.map(mount => `
                                        <tr>
                                            <td><code>${mount.name}</code></td>
                                            <td><code>${mount.mountPath}</code></td>
                                            <td>${mount.readOnly ? 'Yes' : 'No'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        ` : ''}
                    </div>
                `).join('')}
            </div>

            <div class="detail-section">
                <h3>Container Statuses</h3>
                ${podDetails.status.containerStatuses.map(status => `
                    <div class="detail-section">
                        <h4 style="color: #0ea5e9; margin-bottom: 12px;">Container: ${status.name}</h4>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <span class="detail-label">Container ID:</span>
                                <span class="detail-value" style="font-size: 11px;"><code>${status.containerID}</code></span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Image:</span>
                                <span class="detail-value"><code>${status.image}</code></span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Image ID:</span>
                                <span class="detail-value" style="font-size: 11px;"><code>${status.imageID}</code></span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Ready:</span>
                                <span class="detail-value"><span class="status-badge ${status.ready ? 'status-operational' : 'status-critical'}">${status.ready ? 'Yes' : 'No'}</span></span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Started:</span>
                                <span class="detail-value">${status.started ? 'Yes' : 'No'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Restart Count:</span>
                                <span class="detail-value">${status.restartCount}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">State:</span>
                                <span class="detail-value">${status.state.running ? `Running (started ${status.state.running.startedAt})` : 'Not Running'}</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="modal-tab-content" data-tab-content="volumes">
            <div class="detail-section">
                <h3>Volumes</h3>
                ${podDetails.spec.volumes.map(volume => `
                    <div class="detail-section">
                        <h4 style="color: #0ea5e9; margin-bottom: 12px;">Volume: ${volume.name}</h4>
                        ${volume.projected ? `
                            <div class="detail-grid">
                                <div class="detail-item">
                                    <span class="detail-label">Type:</span>
                                    <span class="detail-value">Projected</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Default Mode:</span>
                                    <span class="detail-value">${volume.projected.defaultMode}</span>
                                </div>
                            </div>
                            <h5 style="color: #666; margin-top: 16px; margin-bottom: 8px;">Projected Sources</h5>
                            <table class="detail-table">
                                <thead>
                                    <tr>
                                        <th>Source Type</th>
                                        <th>Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${volume.projected.sources.map(source => {
                                        if (source.serviceAccountToken) {
                                            return `<tr>
                                                <td><strong>Service Account Token</strong></td>
                                                <td>Path: ${source.serviceAccountToken.path}, Expiration: ${source.serviceAccountToken.expirationSeconds}s</td>
                                            </tr>`;
                                        } else if (source.configMap) {
                                            return `<tr>
                                                <td><strong>ConfigMap</strong></td>
                                                <td>Name: ${source.configMap.name}, Items: ${source.configMap.items.map(i => i.key).join(', ')}</td>
                                            </tr>`;
                                        } else if (source.downwardAPI) {
                                            return `<tr>
                                                <td><strong>Downward API</strong></td>
                                                <td>Fields: ${source.downwardAPI.items.map(i => i.fieldRef.fieldPath).join(', ')}</td>
                                            </tr>`;
                                        }
                                        return '';
                                    }).join('')}
                                </tbody>
                            </table>
                        ` : '<p>Volume details not available</p>'}
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="modal-tab-content" data-tab-content="conditions">
            <div class="detail-section">
                <h3>Pod Conditions</h3>
                <table class="detail-table">
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>Status</th>
                            <th>Last Probe Time</th>
                            <th>Last Transition Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${podDetails.status.conditions.map(condition => `
                            <tr>
                                <td><strong>${condition.type}</strong></td>
                                <td><span class="status-badge ${condition.status === 'True' ? 'status-operational' : 'status-warning'}">${condition.status}</span></td>
                                <td>${condition.lastProbeTime || 'N/A'}</td>
                                <td>${condition.lastTransitionTime}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="modal-tab-content" data-tab-content="status">
            <div class="detail-section">
                <h3>Runtime Status</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Phase:</span>
                        <span class="detail-value"><span class="status-badge ${podDetails.status.phase === 'Running' ? 'status-operational' : 'status-critical'}">${podDetails.status.phase}</span></span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">QoS Class:</span>
                        <span class="detail-value">${podDetails.status.qosClass}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Start Time:</span>
                        <span class="detail-value">${podDetails.status.startTime}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Pod IP:</span>
                        <span class="detail-value">${podDetails.status.podIP}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Host IP:</span>
                        <span class="detail-value">${podDetails.status.hostIP}</span>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <h3>Pod IPs</h3>
                <table class="detail-table">
                    <thead>
                        <tr>
                            <th>IP Address</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${podDetails.status.podIPs.map(ipObj => `
                            <tr>
                                <td><code>${ipObj.ip}</code></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div class="detail-section">
                <h3>Host IPs</h3>
                <table class="detail-table">
                    <thead>
                        <tr>
                            <th>IP Address</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${podDetails.status.hostIPs.map(ipObj => `
                            <tr>
                                <td><code>${ipObj.ip}</code></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    setupK8sModalTabs(content);
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Generate detailed pod data matching pod.json structure
function generatePodDetails(pod, cluster) {
    const generateUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    const creationTime = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
    const startTime = new Date(creationTime.getTime() + Math.random() * 60000);

    return {
        apiVersion: "v1",
        kind: "Pod",
        metadata: {
            name: pod.name,
            generateName: pod.name.substring(0, pod.name.lastIndexOf('-') + 1),
            namespace: pod.namespace,
            uid: generateUID(),
            resourceVersion: String(Math.floor(Math.random() * 9000000) + 1000000),
            creationTimestamp: creationTime.toISOString(),
            labels: {
                "app": pod.name.split('-')[0],
                "pod-template-hash": pod.name.split('-').slice(-2, -1)[0]
            },
            ownerReferences: [
                {
                    apiVersion: "apps/v1",
                    kind: "ReplicaSet",
                    name: pod.name.substring(0, pod.name.lastIndexOf('-')),
                    uid: generateUID(),
                    controller: true,
                    blockOwnerDeletion: true
                }
            ]
        },
        spec: {
            containers: [
                {
                    name: pod.name.split('-')[0],
                    image: `${pod.name.split('-')[0]}:latest`,
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
                    volumeMounts: [
                        {
                            name: "kube-api-access",
                            mountPath: "/var/run/secrets/kubernetes.io/serviceaccount",
                            readOnly: true
                        }
                    ],
                    terminationMessagePath: "/dev/termination-log",
                    terminationMessagePolicy: "File"
                }
            ],
            restartPolicy: "Always",
            terminationGracePeriodSeconds: 30,
            dnsPolicy: "ClusterFirst",
            serviceAccountName: "default",
            serviceAccount: "default",
            nodeName: pod.node,
            securityContext: {},
            schedulerName: "default-scheduler",
            tolerations: [
                {
                    key: "node.kubernetes.io/not-ready",
                    operator: "Exists",
                    effect: "NoExecute",
                    tolerationSeconds: 300
                },
                {
                    key: "node.kubernetes.io/unreachable",
                    operator: "Exists",
                    effect: "NoExecute",
                    tolerationSeconds: 300
                }
            ],
            priority: 0,
            enableServiceLinks: true,
            preemptionPolicy: "PreemptLowerPriority",
            volumes: [
                {
                    name: "kube-api-access",
                    projected: {
                        defaultMode: 420,
                        sources: [
                            {
                                serviceAccountToken: {
                                    expirationSeconds: 3607,
                                    path: "token"
                                }
                            },
                            {
                                configMap: {
                                    name: "kube-root-ca.crt",
                                    items: [
                                        {
                                            key: "ca.crt",
                                            path: "ca.crt"
                                        }
                                    ]
                                }
                            },
                            {
                                downwardAPI: {
                                    items: [
                                        {
                                            path: "namespace",
                                            fieldRef: {
                                                apiVersion: "v1",
                                                fieldPath: "metadata.namespace"
                                            }
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                }
            ]
        },
        status: {
            phase: pod.status,
            conditions: [
                {
                    type: "PodReadyToStartContainers",
                    status: "True",
                    lastProbeTime: null,
                    lastTransitionTime: new Date(startTime.getTime() + 2000).toISOString()
                },
                {
                    type: "Initialized",
                    status: "True",
                    lastProbeTime: null,
                    lastTransitionTime: startTime.toISOString()
                },
                {
                    type: "Ready",
                    status: pod.status === "Running" ? "True" : "False",
                    lastProbeTime: null,
                    lastTransitionTime: new Date(startTime.getTime() + 2000).toISOString()
                },
                {
                    type: "ContainersReady",
                    status: pod.status === "Running" ? "True" : "False",
                    lastProbeTime: null,
                    lastTransitionTime: new Date(startTime.getTime() + 2000).toISOString()
                },
                {
                    type: "PodScheduled",
                    status: "True",
                    lastProbeTime: null,
                    lastTransitionTime: startTime.toISOString()
                }
            ],
            hostIP: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
            hostIPs: [
                {
                    ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
                }
            ],
            podIP: pod.ip,
            podIPs: [
                {
                    ip: pod.ip
                }
            ],
            startTime: startTime.toISOString(),
            containerStatuses: [
                {
                    name: pod.name.split('-')[0],
                    state: {
                        running: {
                            startedAt: new Date(startTime.getTime() + 2000).toISOString()
                        }
                    },
                    lastState: {},
                    ready: pod.status === "Running",
                    restartCount: pod.restarts,
                    image: `${pod.name.split('-')[0]}:latest`,
                    imageID: `docker.io/${pod.name.split('-')[0]}@sha256:${Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
                    containerID: `containerd://${Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
                    started: pod.status === "Running"
                }
            ],
            qosClass: "BestEffort"
        }
    };
}
