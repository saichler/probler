// Node Detail Modal and Helper Functions

// Node Detail Modal
function showNodeDetailModal(node, cluster) {
    const modal = document.getElementById('node-detail-modal');
    const content = document.getElementById('node-detail-content');
    const modalTitle = modal.querySelector('.modal-title');

    // Update modal title
    modalTitle.textContent = `Node ${node.name} Details`;

    // Generate mock detailed node data matching node.json structure
    const nodeDetails = generateNodeDetails(node, cluster);

    content.innerHTML = `
        <div class="modal-tabs">
            <div class="modal-tab active" data-tab="overview">Overview</div>
            <div class="modal-tab" data-tab="labels">Labels</div>
            <div class="modal-tab" data-tab="annotations">Annotations</div>
            <div class="modal-tab" data-tab="addresses">Addresses</div>
            <div class="modal-tab" data-tab="resources">Resources</div>
            <div class="modal-tab" data-tab="conditions">Conditions</div>
            <div class="modal-tab" data-tab="system">System Info</div>
            <div class="modal-tab" data-tab="images">Images</div>
        </div>

        <div class="modal-tab-content active" data-tab-content="overview">
            <div class="detail-section">
                <h3>Metadata</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Name:</span>
                        <span class="detail-value">${nodeDetails.metadata.name}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">UID:</span>
                        <span class="detail-value">${nodeDetails.metadata.uid}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Creation Timestamp:</span>
                        <span class="detail-value">${nodeDetails.metadata.creationTimestamp}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Resource Version:</span>
                        <span class="detail-value">${nodeDetails.metadata.resourceVersion}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Age:</span>
                        <span class="detail-value">${node.age}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Cluster:</span>
                        <span class="detail-value">${cluster}</span>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <h3>Spec</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Pod CIDR:</span>
                        <span class="detail-value">${nodeDetails.spec.podCIDR}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Pod CIDRs:</span>
                        <span class="detail-value">${nodeDetails.spec.podCIDRs.join(', ')}</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="modal-tab-content" data-tab-content="labels">
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
                        ${Object.entries(nodeDetails.metadata.labels).map(([key, value]) => `
                            <tr>
                                <td><code>${key}</code></td>
                                <td>${value || '<none>'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="modal-tab-content" data-tab-content="annotations">
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
                        ${Object.entries(nodeDetails.metadata.annotations).map(([key, value]) => `
                            <tr>
                                <td><code>${key}</code></td>
                                <td style="max-width: 400px; word-break: break-all;">${value}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="modal-tab-content" data-tab-content="addresses">
            <div class="detail-section">
                <h3>Network Addresses</h3>
                <table class="detail-table">
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>Address</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${nodeDetails.status.addresses.map(addr => `
                            <tr>
                                <td><strong>${addr.type}</strong></td>
                                <td>${addr.address}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="modal-tab-content" data-tab-content="resources">
            <div class="detail-section">
                <h3>Capacity</h3>
                <table class="detail-table">
                    <thead>
                        <tr>
                            <th>Resource</th>
                            <th>Quantity</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(nodeDetails.status.capacity).map(([key, value]) => `
                            <tr>
                                <td><strong>${key}</strong></td>
                                <td>${value}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div class="detail-section">
                <h3>Allocatable</h3>
                <table class="detail-table">
                    <thead>
                        <tr>
                            <th>Resource</th>
                            <th>Quantity</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(nodeDetails.status.allocatable).map(([key, value]) => `
                            <tr>
                                <td><strong>${key}</strong></td>
                                <td>${value}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="modal-tab-content" data-tab-content="conditions">
            <div class="detail-section">
                <h3>Node Conditions</h3>
                <table class="detail-table">
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>Status</th>
                            <th>Reason</th>
                            <th>Message</th>
                            <th>Last Heartbeat</th>
                            <th>Last Transition</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${nodeDetails.status.conditions.map(condition => `
                            <tr>
                                <td><strong>${condition.type}</strong></td>
                                <td><span class="status-badge ${getConditionStatusClass(condition.type, condition.status)}">${condition.status}</span></td>
                                <td>${condition.reason}</td>
                                <td style="max-width: 300px;">${condition.message}</td>
                                <td>${condition.lastHeartbeatTime}</td>
                                <td>${condition.lastTransitionTime}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="modal-tab-content" data-tab-content="system">
            <div class="detail-section">
                <h3>Node Info</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">OS Image:</span>
                        <span class="detail-value">${nodeDetails.status.nodeInfo.osImage}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Kernel Version:</span>
                        <span class="detail-value">${nodeDetails.status.nodeInfo.kernelVersion}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Container Runtime:</span>
                        <span class="detail-value">${nodeDetails.status.nodeInfo.containerRuntimeVersion}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Kubelet Version:</span>
                        <span class="detail-value">${nodeDetails.status.nodeInfo.kubeletVersion}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Kube-Proxy Version:</span>
                        <span class="detail-value">${nodeDetails.status.nodeInfo.kubeProxyVersion}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Architecture:</span>
                        <span class="detail-value">${nodeDetails.status.nodeInfo.architecture}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Operating System:</span>
                        <span class="detail-value">${nodeDetails.status.nodeInfo.operatingSystem}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Machine ID:</span>
                        <span class="detail-value">${nodeDetails.status.nodeInfo.machineID}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">System UUID:</span>
                        <span class="detail-value">${nodeDetails.status.nodeInfo.systemUUID}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Boot ID:</span>
                        <span class="detail-value">${nodeDetails.status.nodeInfo.bootID}</span>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <h3>Daemon Endpoints</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Kubelet Port:</span>
                        <span class="detail-value">${nodeDetails.status.daemonEndpoints.kubeletEndpoint.Port}</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="modal-tab-content" data-tab-content="images">
            <div class="detail-section">
                <h3>Container Images (${nodeDetails.status.images.length} total)</h3>
                <table class="detail-table">
                    <thead>
                        <tr>
                            <th>Image Name</th>
                            <th>Size</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${nodeDetails.status.images.slice(0, 20).map(image => `
                            <tr>
                                <td style="max-width: 500px; word-break: break-all;"><code>${image.names[0]}</code></td>
                                <td>${formatBytes(image.sizeBytes)}</td>
                            </tr>
                        `).join('')}
                        ${nodeDetails.status.images.length > 20 ? `
                            <tr>
                                <td colspan="2" style="text-align: center; font-style: italic; color: #666;">
                                    ... and ${nodeDetails.status.images.length - 20} more images
                                </td>
                            </tr>
                        ` : ''}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    setupNodeModalTabs(content);
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Generate detailed node data matching node.json structure
function generateNodeDetails(node, cluster) {
    const creationDate = new Date(Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000);

    return {
        apiVersion: "v1",
        kind: "Node",
        metadata: {
            name: node.name,
            uid: generateUID(),
            creationTimestamp: creationDate.toISOString(),
            resourceVersion: String(Math.floor(Math.random() * 9000000) + 1000000),
            labels: Object.fromEntries(
                Object.entries({
                    "beta.kubernetes.io/arch": "amd64",
                    "beta.kubernetes.io/os": "linux",
                    "kubernetes.io/arch": "amd64",
                    "kubernetes.io/hostname": node.name,
                    "kubernetes.io/os": "linux",
                    "node-role.kubernetes.io/control-plane": node.roles.includes('control-plane') ? "" : undefined,
                    "node-role.kubernetes.io/worker": node.roles.includes('worker') ? "" : undefined,
                    "node.kubernetes.io/exclude-from-external-load-balancers": ""
                }).filter(([_, value]) => value !== undefined)
            ),
            annotations: {
                "flannel.alpha.coreos.com/backend-data": `{"VNI":1,"VtepMAC":"${generateMAC()}"}`,
                "flannel.alpha.coreos.com/backend-type": "vxlan",
                "flannel.alpha.coreos.com/kube-subnet-manager": "true",
                "flannel.alpha.coreos.com/public-ip": node.internalIP,
                "kubeadm.alpha.kubernetes.io/cri-socket": "unix:///var/run/containerd/containerd.sock",
                "node.alpha.kubernetes.io/ttl": "0",
                "volumes.kubernetes.io/controller-managed-attach-detach": "true"
            }
        },
        spec: {
            podCIDR: `10.${Math.floor(Math.random() * 255)}.0.0/24`,
            podCIDRs: [`10.${Math.floor(Math.random() * 255)}.0.0/24`]
        },
        status: {
            addresses: [
                { type: "InternalIP", address: node.internalIP },
                { type: "Hostname", address: node.name },
                ...(node.externalIP !== '<none>' ? [{ type: "ExternalIP", address: node.externalIP }] : [])
            ],
            capacity: {
                cpu: String(node.cpuCapacity),
                "ephemeral-storage": "50254368Ki",
                "hugepages-2Mi": "0",
                memory: node.memoryCapacity.replace('Gi', '') + "Ki",
                pods: "110"
            },
            allocatable: {
                cpu: String(node.cpuCapacity),
                "ephemeral-storage": "46314425473",
                "hugepages-2Mi": "0",
                memory: (parseInt(node.memoryCapacity) * 1024 * 0.95).toFixed(0) + "Ki",
                pods: "110"
            },
            conditions: [
                {
                    type: "NetworkUnavailable",
                    status: "False",
                    reason: "FlannelIsUp",
                    message: "Flannel is running on this node",
                    lastHeartbeatTime: new Date(Date.now() - Math.random() * 3600000).toISOString(),
                    lastTransitionTime: new Date(Date.now() - Math.random() * 86400000).toISOString()
                },
                {
                    type: "MemoryPressure",
                    status: "False",
                    reason: "KubeletHasSufficientMemory",
                    message: "kubelet has sufficient memory available",
                    lastHeartbeatTime: new Date(Date.now() - Math.random() * 60000).toISOString(),
                    lastTransitionTime: new Date(Date.now() - Math.random() * 86400000).toISOString()
                },
                {
                    type: "DiskPressure",
                    status: "False",
                    reason: "KubeletHasNoDiskPressure",
                    message: "kubelet has no disk pressure",
                    lastHeartbeatTime: new Date(Date.now() - Math.random() * 60000).toISOString(),
                    lastTransitionTime: new Date(Date.now() - Math.random() * 86400000).toISOString()
                },
                {
                    type: "PIDPressure",
                    status: "False",
                    reason: "KubeletHasSufficientPID",
                    message: "kubelet has sufficient PID available",
                    lastHeartbeatTime: new Date(Date.now() - Math.random() * 60000).toISOString(),
                    lastTransitionTime: new Date(Date.now() - Math.random() * 86400000).toISOString()
                },
                {
                    type: "Ready",
                    status: node.status === 'Ready' ? "True" : "False",
                    reason: node.status === 'Ready' ? "KubeletReady" : "KubeletNotReady",
                    message: node.status === 'Ready' ? "kubelet is posting ready status" : "kubelet is not ready",
                    lastHeartbeatTime: new Date(Date.now() - Math.random() * 60000).toISOString(),
                    lastTransitionTime: new Date(Date.now() - Math.random() * 86400000).toISOString()
                }
            ],
            daemonEndpoints: {
                kubeletEndpoint: {
                    Port: 10250
                }
            },
            images: generateNodeImages(),
            nodeInfo: {
                architecture: "amd64",
                bootID: generateUID(),
                containerRuntimeVersion: node.containerRuntime,
                kernelVersion: node.kernelVersion,
                kubeProxyVersion: node.version,
                kubeletVersion: node.version,
                machineID: generateUID().replace(/-/g, ''),
                operatingSystem: "linux",
                osImage: node.osImage,
                systemUUID: generateUID()
            }
        }
    };
}

// Generate container images for a node
function generateNodeImages() {
    const images = [];
    const repos = [
        'registry.k8s.io/kube-apiserver',
        'registry.k8s.io/kube-controller-manager',
        'registry.k8s.io/kube-scheduler',
        'registry.k8s.io/kube-proxy',
        'registry.k8s.io/etcd',
        'registry.k8s.io/coredns',
        'registry.k8s.io/pause',
        'docker.io/calico/node',
        'docker.io/calico/cni',
        'docker.io/calico/kube-controllers',
        'docker.io/flannel/flannel',
        'docker.io/nginx',
        'docker.io/redis',
        'docker.io/postgres',
        'docker.io/mongo'
    ];

    const imageCount = Math.floor(Math.random() * 30) + 20;
    for (let i = 0; i < imageCount; i++) {
        const repo = repos[Math.floor(Math.random() * repos.length)];
        const tag = `v1.${Math.floor(Math.random() * 30)}.${Math.floor(Math.random() * 10)}`;
        const sha = generateImageSHA();
        images.push({
            names: [
                `${repo}@sha256:${sha}`,
                `${repo}:${tag}`
            ],
            sizeBytes: Math.floor(Math.random() * 100000000) + 10000000
        });
    }
    return images;
}

// Helper function to generate UUID
function generateUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Helper function to generate MAC address
function generateMAC() {
    return 'xx:xx:xx:xx:xx:xx'.replace(/x/g, function() {
        return Math.floor(Math.random() * 16).toString(16);
    });
}

// Helper function to generate image SHA
function generateImageSHA() {
    return Array.from({length: 64}, () =>
        Math.floor(Math.random() * 16).toString(16)
    ).join('');
}

// Helper function to format bytes
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper function to get condition status CSS class
function getConditionStatusClass(type, status) {
    if (type === 'Ready') {
        return status === 'True' ? 'status-operational' : 'status-critical';
    } else {
        // For other conditions, False is good (no pressure, no unavailability)
        return status === 'False' ? 'status-operational' : 'status-warning';
    }
}
