// Deployment Detail Modal Function

// Deployment Detail Modal
async function showDeploymentDetailModal(deployment, cluster) {
    const modal = document.getElementById('k8s-detail-modal');
    const content = document.getElementById('k8s-detail-content');
    const modalTitle = modal.querySelector('.modal-title');

    modalTitle.textContent = `Deployment ${deployment.name} Details`;

    let deploymentDetails;
    try {
        const response = await makeAuthenticatedRequest('/probler/0/exec', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                targetId: 'lab',
                hostId: 'lab',
                pollarisName: 'kubernetes',
                jobName: 'deploymentdetails',
                arguments: { namespace: deployment.namespace, deploymentname: deployment.name }
            })
        });

        if (!response || !response.ok) {
            deploymentDetails = generateDeploymentDetails(deployment, cluster);
        } else {
            const data = await response.json();
            if (data && data.result) {
                try {
                    let decodedResult = atob(data.result);
                    const jsonStart = decodedResult.indexOf('{');
                    if (jsonStart > 0) decodedResult = decodedResult.substring(jsonStart);
                    const parsedData = JSON.parse(decodedResult);

                    if (parsedData && parsedData.items && parsedData.items.length > 0) {
                        deploymentDetails = parsedData.items.find(item => item.metadata.name === deployment.name) || parsedData.items[0];
                    } else if (parsedData && parsedData.metadata && parsedData.metadata.name) {
                        deploymentDetails = parsedData;
                    } else {
                        deploymentDetails = generateDeploymentDetails(deployment, cluster);
                    }
                } catch (error) {
                    deploymentDetails = generateDeploymentDetails(deployment, cluster);
                }
            } else {
                deploymentDetails = generateDeploymentDetails(deployment, cluster);
            }
        }
    } catch (error) {
        deploymentDetails = generateDeploymentDetails(deployment, cluster);
    }

    content.innerHTML = generateDeploymentModalContent(deploymentDetails, cluster);

    setupK8sModalTabs(content);
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function generateDeploymentModalContent(deploymentDetails, cluster) {
    return `
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
                    <div class="detail-item"><span class="detail-label">Name:</span><span class="detail-value">${deploymentDetails.metadata.name}</span></div>
                    <div class="detail-item"><span class="detail-label">Namespace:</span><span class="detail-value">${deploymentDetails.metadata.namespace}</span></div>
                    <div class="detail-item"><span class="detail-label">UID:</span><span class="detail-value">${deploymentDetails.metadata.uid}</span></div>
                    <div class="detail-item"><span class="detail-label">Cluster:</span><span class="detail-value">${cluster}</span></div>
                    <div class="detail-item"><span class="detail-label">Generation:</span><span class="detail-value">${deploymentDetails.metadata.generation}</span></div>
                    <div class="detail-item"><span class="detail-label">Creation Time:</span><span class="detail-value">${deploymentDetails.metadata.creationTimestamp}</span></div>
                    <div class="detail-item"><span class="detail-label">Replicas:</span><span class="detail-value">${deploymentDetails.spec.replicas}</span></div>
                    <div class="detail-item"><span class="detail-label">Ready Replicas:</span><span class="detail-value"><span class="status-badge ${deploymentDetails.status.readyReplicas === deploymentDetails.spec.replicas ? 'status-operational' : 'status-warning'}">${deploymentDetails.status.readyReplicas}/${deploymentDetails.spec.replicas}</span></span></div>
                </div>
            </div>
        </div>

        <div class="modal-tab-content" data-tab-content="metadata">
            ${generateDeploymentMetadataTab(deploymentDetails)}
        </div>

        <div class="modal-tab-content" data-tab-content="spec">
            ${generateDeploymentSpecTab(deploymentDetails)}
        </div>

        <div class="modal-tab-content" data-tab-content="template">
            ${generateDeploymentTemplateTab(deploymentDetails)}
        </div>

        <div class="modal-tab-content" data-tab-content="conditions">
            ${generateDeploymentConditionsTab(deploymentDetails)}
        </div>

        <div class="modal-tab-content" data-tab-content="status">
            ${generateDeploymentStatusTab(deploymentDetails)}
        </div>
    `;
}

function generateDeploymentMetadataTab(deploymentDetails) {
    return `
        <div class="detail-section">
            <h3>Metadata</h3>
            <div class="detail-grid">
                <div class="detail-item"><span class="detail-label">Name:</span><span class="detail-value">${deploymentDetails.metadata.name}</span></div>
                <div class="detail-item"><span class="detail-label">Namespace:</span><span class="detail-value">${deploymentDetails.metadata.namespace}</span></div>
                <div class="detail-item"><span class="detail-label">UID:</span><span class="detail-value">${deploymentDetails.metadata.uid}</span></div>
                <div class="detail-item"><span class="detail-label">Resource Version:</span><span class="detail-value">${deploymentDetails.metadata.resourceVersion}</span></div>
                <div class="detail-item"><span class="detail-label">Generation:</span><span class="detail-value">${deploymentDetails.metadata.generation}</span></div>
                <div class="detail-item"><span class="detail-label">Creation Timestamp:</span><span class="detail-value">${deploymentDetails.metadata.creationTimestamp}</span></div>
            </div>
        </div>
        <div class="detail-section">
            <h3>Labels</h3>
            <table class="detail-table">
                <thead><tr><th>Key</th><th>Value</th></tr></thead>
                <tbody>${Object.entries(deploymentDetails.metadata.labels).map(([key, value]) => `<tr><td><code>${key}</code></td><td>${value}</td></tr>`).join('')}</tbody>
            </table>
        </div>
        <div class="detail-section">
            <h3>Annotations</h3>
            <table class="detail-table">
                <thead><tr><th>Key</th><th>Value</th></tr></thead>
                <tbody>${Object.entries(deploymentDetails.metadata.annotations).map(([key, value]) => `<tr><td><code>${key}</code></td><td style="max-width: 400px; word-break: break-all; font-size: 11px;">${value}</td></tr>`).join('')}</tbody>
            </table>
        </div>
    `;
}

function generateDeploymentSpecTab(deploymentDetails) {
    return `
        <div class="detail-section">
            <h3>Deployment Spec</h3>
            <div class="detail-grid">
                <div class="detail-item"><span class="detail-label">Replicas:</span><span class="detail-value">${deploymentDetails.spec.replicas}</span></div>
                <div class="detail-item"><span class="detail-label">Revision History Limit:</span><span class="detail-value">${deploymentDetails.spec.revisionHistoryLimit}</span></div>
                <div class="detail-item"><span class="detail-label">Progress Deadline:</span><span class="detail-value">${deploymentDetails.spec.progressDeadlineSeconds}s</span></div>
                <div class="detail-item"><span class="detail-label">Strategy Type:</span><span class="detail-value">${deploymentDetails.spec.strategy.type}</span></div>
                <div class="detail-item"><span class="detail-label">Max Unavailable:</span><span class="detail-value">${deploymentDetails.spec.strategy.rollingUpdate.maxUnavailable}</span></div>
                <div class="detail-item"><span class="detail-label">Max Surge:</span><span class="detail-value">${deploymentDetails.spec.strategy.rollingUpdate.maxSurge}</span></div>
            </div>
        </div>
        <div class="detail-section">
            <h3>Selector</h3>
            <table class="detail-table">
                <thead><tr><th>Key</th><th>Value</th></tr></thead>
                <tbody>${Object.entries(deploymentDetails.spec.selector.matchLabels).map(([key, value]) => `<tr><td><code>${key}</code></td><td>${value}</td></tr>`).join('')}</tbody>
            </table>
        </div>
    `;
}

function generateDeploymentConditionsTab(deploymentDetails) {
    return `
        <div class="detail-section">
            <h3>Deployment Conditions</h3>
            <table class="detail-table">
                <thead><tr><th>Type</th><th>Status</th><th>Reason</th><th>Message</th><th>Last Update Time</th><th>Last Transition Time</th></tr></thead>
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
    `;
}

function generateDeploymentStatusTab(deploymentDetails) {
    return `
        <div class="detail-section">
            <h3>Replica Status</h3>
            <div class="detail-grid">
                <div class="detail-item"><span class="detail-label">Replicas:</span><span class="detail-value">${deploymentDetails.status.replicas}</span></div>
                <div class="detail-item"><span class="detail-label">Updated Replicas:</span><span class="detail-value">${deploymentDetails.status.updatedReplicas}</span></div>
                <div class="detail-item"><span class="detail-label">Ready Replicas:</span><span class="detail-value">${deploymentDetails.status.readyReplicas}</span></div>
                <div class="detail-item"><span class="detail-label">Available Replicas:</span><span class="detail-value">${deploymentDetails.status.availableReplicas}</span></div>
                <div class="detail-item"><span class="detail-label">Observed Generation:</span><span class="detail-value">${deploymentDetails.status.observedGeneration}</span></div>
            </div>
        </div>
    `;
}
