// Node Detail Modal Function

// Node Detail Modal
async function showNodeDetailModal(node, cluster) {
    const modal = document.getElementById('node-detail-modal');
    const content = document.getElementById('node-detail-content');
    const modalTitle = modal.querySelector('.modal-title');

    modalTitle.textContent = `Node ${node.name} Details`;

    let nodeDetails;
    try {
        console.log('Fetching node details for:', node.name);
        const response = await makeAuthenticatedRequest(Layer8DConfig.resolveEndpoint('/0/exec'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                targetId: 'lab',
                hostId: 'lab',
                pollarisName: 'kubernetes',
                jobName: 'nodedetails',
                arguments: {
                    nodename: node.name
                }
            })
        });

        if (!response || !response.ok) {
            nodeDetails = generateNodeDetails(node, cluster);
        } else {
            const data = await response.json();

            if (data && data.result) {
                try {
                    let decodedResult = atob(data.result);
                    const jsonStart = decodedResult.indexOf('{');
                    if (jsonStart > 0) {
                        decodedResult = decodedResult.substring(jsonStart);
                    }

                    const parsedData = JSON.parse(decodedResult);

                    if (parsedData && parsedData.items && parsedData.items.length > 0) {
                        nodeDetails = parsedData.items.find(item => item.metadata.name === node.name) || parsedData.items[0];
                    } else if (parsedData && parsedData.metadata && parsedData.metadata.name) {
                        nodeDetails = parsedData;
                    } else {
                        nodeDetails = generateNodeDetails(node, cluster);
                    }
                } catch (error) {
                    nodeDetails = generateNodeDetails(node, cluster);
                }
            } else {
                nodeDetails = generateNodeDetails(node, cluster);
            }
        }
    } catch (error) {
        nodeDetails = generateNodeDetails(node, cluster);
    }

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
                    <thead><tr><th>Key</th><th>Value</th></tr></thead>
                    <tbody>
                        ${Object.entries(nodeDetails.metadata.labels).map(([key, value]) => `
                            <tr><td><code>${key}</code></td><td>${value || '<none>'}</td></tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="modal-tab-content" data-tab-content="annotations">
            <div class="detail-section">
                <h3>Annotations</h3>
                <table class="detail-table">
                    <thead><tr><th>Key</th><th>Value</th></tr></thead>
                    <tbody>
                        ${Object.entries(nodeDetails.metadata.annotations).map(([key, value]) => `
                            <tr><td><code>${key}</code></td><td style="max-width: 400px; word-break: break-all;">${value}</td></tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="modal-tab-content" data-tab-content="addresses">
            <div class="detail-section">
                <h3>Network Addresses</h3>
                <table class="detail-table">
                    <thead><tr><th>Type</th><th>Address</th></tr></thead>
                    <tbody>
                        ${nodeDetails.status.addresses.map(addr => `
                            <tr><td><strong>${addr.type}</strong></td><td>${addr.address}</td></tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="modal-tab-content" data-tab-content="resources">
            <div class="detail-section">
                <h3>Capacity</h3>
                <table class="detail-table">
                    <thead><tr><th>Resource</th><th>Quantity</th></tr></thead>
                    <tbody>
                        ${Object.entries(nodeDetails.status.capacity).map(([key, value]) => `
                            <tr><td><strong>${key}</strong></td><td>${value}</td></tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div class="detail-section">
                <h3>Allocatable</h3>
                <table class="detail-table">
                    <thead><tr><th>Resource</th><th>Quantity</th></tr></thead>
                    <tbody>
                        ${Object.entries(nodeDetails.status.allocatable).map(([key, value]) => `
                            <tr><td><strong>${key}</strong></td><td>${value}</td></tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="modal-tab-content" data-tab-content="conditions">
            <div class="detail-section">
                <h3>Node Conditions</h3>
                <table class="detail-table">
                    <thead><tr><th>Type</th><th>Status</th><th>Reason</th><th>Message</th><th>Last Heartbeat</th><th>Last Transition</th></tr></thead>
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
                    <div class="detail-item"><span class="detail-label">OS Image:</span><span class="detail-value">${nodeDetails.status.nodeInfo.osImage}</span></div>
                    <div class="detail-item"><span class="detail-label">Kernel Version:</span><span class="detail-value">${nodeDetails.status.nodeInfo.kernelVersion}</span></div>
                    <div class="detail-item"><span class="detail-label">Container Runtime:</span><span class="detail-value">${nodeDetails.status.nodeInfo.containerRuntimeVersion}</span></div>
                    <div class="detail-item"><span class="detail-label">Kubelet Version:</span><span class="detail-value">${nodeDetails.status.nodeInfo.kubeletVersion}</span></div>
                    <div class="detail-item"><span class="detail-label">Kube-Proxy Version:</span><span class="detail-value">${nodeDetails.status.nodeInfo.kubeProxyVersion}</span></div>
                    <div class="detail-item"><span class="detail-label">Architecture:</span><span class="detail-value">${nodeDetails.status.nodeInfo.architecture}</span></div>
                    <div class="detail-item"><span class="detail-label">Operating System:</span><span class="detail-value">${nodeDetails.status.nodeInfo.operatingSystem}</span></div>
                    <div class="detail-item"><span class="detail-label">Machine ID:</span><span class="detail-value">${nodeDetails.status.nodeInfo.machineID}</span></div>
                    <div class="detail-item"><span class="detail-label">System UUID:</span><span class="detail-value">${nodeDetails.status.nodeInfo.systemUUID}</span></div>
                    <div class="detail-item"><span class="detail-label">Boot ID:</span><span class="detail-value">${nodeDetails.status.nodeInfo.bootID}</span></div>
                </div>
            </div>
            <div class="detail-section">
                <h3>Daemon Endpoints</h3>
                <div class="detail-grid">
                    <div class="detail-item"><span class="detail-label">Kubelet Port:</span><span class="detail-value">${nodeDetails.status.daemonEndpoints.kubeletEndpoint.Port}</span></div>
                </div>
            </div>
        </div>

        <div class="modal-tab-content" data-tab-content="images">
            <div class="detail-section">
                <h3>Container Images (${nodeDetails.status.images.length} total)</h3>
                <table class="detail-table">
                    <thead><tr><th>Image Name</th><th>Size</th></tr></thead>
                    <tbody>
                        ${nodeDetails.status.images.slice(0, 20).map(image => `
                            <tr><td style="max-width: 500px; word-break: break-all;"><code>${image.names[0]}</code></td><td>${formatBytes(image.sizeBytes)}</td></tr>
                        `).join('')}
                        ${nodeDetails.status.images.length > 20 ? `
                            <tr><td colspan="2" style="text-align: center; font-style: italic; color: #666;">... and ${nodeDetails.status.images.length - 20} more images</td></tr>
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
