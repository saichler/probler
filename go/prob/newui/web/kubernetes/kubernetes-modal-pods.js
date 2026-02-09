// Pod Detail Modal Function

// Pod Detail Modal
async function showPodDetailModal(pod, cluster) {
    const modal = document.getElementById('k8s-detail-modal');
    const content = document.getElementById('k8s-detail-content');
    const modalTitle = modal.querySelector('.modal-title');

    modalTitle.textContent = `Pod ${pod.name} Details`;

    let podDetails;
    try {
        const response = await makeAuthenticatedRequest(Layer8DConfig.resolveEndpoint('/0/exec'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                targetId: 'lab',
                hostId: 'lab',
                pollarisName: 'kubernetes',
                jobName: 'poddetails',
                arguments: { namespace: pod.namespace, podname: pod.name }
            })
        });

        if (!response || !response.ok) {
            podDetails = generatePodDetails(pod, cluster);
        } else {
            const data = await response.json();
            if (data && data.result) {
                try {
                    let decodedResult = atob(data.result);
                    const jsonStart = decodedResult.indexOf('{');
                    if (jsonStart > 0) decodedResult = decodedResult.substring(jsonStart);
                    const parsedData = JSON.parse(decodedResult);

                    if (parsedData && parsedData.items && parsedData.items.length > 0) {
                        podDetails = parsedData.items.find(item => item.metadata.name === pod.name) || parsedData.items[0];
                    } else if (parsedData && parsedData.metadata && parsedData.metadata.name) {
                        podDetails = parsedData;
                    } else {
                        podDetails = generatePodDetails(pod, cluster);
                    }
                } catch (error) {
                    podDetails = generatePodDetails(pod, cluster);
                }
            } else {
                podDetails = generatePodDetails(pod, cluster);
            }
        }
    } catch (error) {
        podDetails = generatePodDetails(pod, cluster);
    }

    try {
        content.innerHTML = generatePodModalContent(podDetails, pod, cluster);
    } catch (renderError) {
        console.error('Error rendering pod details:', renderError);
        content.innerHTML = `<div class="detail-section"><h3>Pod Information</h3>
            <div class="detail-grid">
                <div class="detail-item"><span class="detail-label">Name:</span><span class="detail-value">${pod.name}</span></div>
                <div class="detail-item"><span class="detail-label">Namespace:</span><span class="detail-value">${pod.namespace}</span></div>
                <div class="detail-item"><span class="detail-label">Node:</span><span class="detail-value">${pod.node || 'N/A'}</span></div>
                <div class="detail-item"><span class="detail-label">IP:</span><span class="detail-value">${pod.ip || 'N/A'}</span></div>
            </div>
            <p style="color: #e53e3e; margin-top: 16px;">Error rendering full details. Check console for more information.</p></div>`;
    }

    setupK8sModalTabs(content);
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Generate the modal HTML content
function generatePodModalContent(podDetails, pod, cluster) {
    return `
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
            ${generatePodOverviewTab(podDetails, cluster)}
        </div>
        <div class="modal-tab-content" data-tab-content="metadata">
            ${generatePodMetadataTab(podDetails)}
        </div>
        <div class="modal-tab-content" data-tab-content="spec">
            ${generatePodSpecTab(podDetails)}
        </div>
        <div class="modal-tab-content" data-tab-content="containers">
            ${generatePodContainersTab(podDetails)}
        </div>
        <div class="modal-tab-content" data-tab-content="volumes">
            ${generatePodVolumesTab(podDetails)}
        </div>
        <div class="modal-tab-content" data-tab-content="conditions">
            ${generatePodConditionsTab(podDetails)}
        </div>
        <div class="modal-tab-content" data-tab-content="status">
            ${generatePodStatusTab(podDetails)}
        </div>
    `;
}

function generatePodOverviewTab(podDetails, cluster) {
    const containers = (podDetails.spec && podDetails.spec.containers) || [];
    const containerImages = containers.length > 0
        ? containers.map(c => `<code>${c.image || 'N/A'}</code>`).join(', ')
        : 'N/A';

    return `
        <div class="detail-section">
            <h3>Pod Information</h3>
            <div class="detail-grid">
                <div class="detail-item"><span class="detail-label">Name:</span><span class="detail-value">${podDetails.metadata.name}</span></div>
                <div class="detail-item"><span class="detail-label">Namespace:</span><span class="detail-value">${podDetails.metadata.namespace}</span></div>
                <div class="detail-item"><span class="detail-label">UID:</span><span class="detail-value">${podDetails.metadata.uid}</span></div>
                <div class="detail-item"><span class="detail-label">Cluster:</span><span class="detail-value">${cluster}</span></div>
                <div class="detail-item"><span class="detail-label">Phase:</span><span class="detail-value"><span class="status-badge ${getPodStatusClass(getPodStatusText(podDetails.status.phase))}">${getPodStatusText(podDetails.status.phase)}</span></span></div>
                <div class="detail-item"><span class="detail-label">QoS Class:</span><span class="detail-value">${podDetails.status.qosClass}</span></div>
                <div class="detail-item"><span class="detail-label">Node:</span><span class="detail-value">${podDetails.spec.nodeName}</span></div>
                <div class="detail-item"><span class="detail-label">Pod IP:</span><span class="detail-value">${podDetails.status.podIP}</span></div>
                <div class="detail-item"><span class="detail-label">Host IP:</span><span class="detail-value">${podDetails.status.hostIP}</span></div>
                <div class="detail-item"><span class="detail-label">Start Time:</span><span class="detail-value">${podDetails.status.startTime}</span></div>
                <div class="detail-item full-width"><span class="detail-label">Container Images:</span><span class="detail-value">${containerImages}</span></div>
            </div>
        </div>
    `;
}

function generatePodMetadataTab(podDetails) {
    const labels = (podDetails.metadata.labels && typeof podDetails.metadata.labels === 'object') ? podDetails.metadata.labels : {};
    const ownerRefs = podDetails.metadata.ownerReferences || [];

    return `
        <div class="detail-section">
            <h3>Metadata</h3>
            <div class="detail-grid">
                <div class="detail-item"><span class="detail-label">Name:</span><span class="detail-value">${podDetails.metadata.name}</span></div>
                <div class="detail-item"><span class="detail-label">Generate Name:</span><span class="detail-value">${podDetails.metadata.generateName || 'N/A'}</span></div>
                <div class="detail-item"><span class="detail-label">Namespace:</span><span class="detail-value">${podDetails.metadata.namespace}</span></div>
                <div class="detail-item"><span class="detail-label">UID:</span><span class="detail-value">${podDetails.metadata.uid}</span></div>
                <div class="detail-item"><span class="detail-label">Resource Version:</span><span class="detail-value">${podDetails.metadata.resourceVersion}</span></div>
                <div class="detail-item"><span class="detail-label">Creation Timestamp:</span><span class="detail-value">${podDetails.metadata.creationTimestamp}</span></div>
            </div>
        </div>
        <div class="detail-section">
            <h3>Labels</h3>
            <table class="detail-table">
                <thead><tr><th>Key</th><th>Value</th></tr></thead>
                <tbody>
                    ${Object.entries(labels).map(([key, value]) => `<tr><td><code>${key}</code></td><td>${value}</td></tr>`).join('')}
                </tbody>
            </table>
        </div>
        ${ownerRefs.length > 0 ? `
        <div class="detail-section">
            <h3>Owner References</h3>
            <table class="detail-table">
                <thead><tr><th>Kind</th><th>Name</th><th>UID</th><th>Controller</th></tr></thead>
                <tbody>
                    ${ownerRefs.map(ref => `<tr><td><strong>${ref.kind}</strong></td><td>${ref.name}</td><td style="font-size: 11px;">${ref.uid}</td><td>${ref.controller ? 'Yes' : 'No'}</td></tr>`).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}
    `;
}

function generatePodSpecTab(podDetails) {
    const tolerations = podDetails.spec.tolerations || [];

    return `
        <div class="detail-section">
            <h3>Pod Spec</h3>
            <div class="detail-grid">
                <div class="detail-item"><span class="detail-label">Node Name:</span><span class="detail-value">${podDetails.spec.nodeName || 'N/A'}</span></div>
                <div class="detail-item"><span class="detail-label">Service Account:</span><span class="detail-value">${podDetails.spec.serviceAccountName || 'default'}</span></div>
                <div class="detail-item"><span class="detail-label">Restart Policy:</span><span class="detail-value">${podDetails.spec.restartPolicy || 'Always'}</span></div>
                <div class="detail-item"><span class="detail-label">DNS Policy:</span><span class="detail-value">${podDetails.spec.dnsPolicy || 'ClusterFirst'}</span></div>
                <div class="detail-item"><span class="detail-label">Scheduler Name:</span><span class="detail-value">${podDetails.spec.schedulerName || 'default-scheduler'}</span></div>
                <div class="detail-item"><span class="detail-label">Priority:</span><span class="detail-value">${podDetails.spec.priority != null ? podDetails.spec.priority : 'N/A'}</span></div>
                <div class="detail-item"><span class="detail-label">Preemption Policy:</span><span class="detail-value">${podDetails.spec.preemptionPolicy || 'N/A'}</span></div>
                <div class="detail-item"><span class="detail-label">Termination Grace Period:</span><span class="detail-value">${podDetails.spec.terminationGracePeriodSeconds || 30}s</span></div>
                <div class="detail-item"><span class="detail-label">Enable Service Links:</span><span class="detail-value">${podDetails.spec.enableServiceLinks !== false ? 'Yes' : 'No'}</span></div>
                <div class="detail-item"><span class="detail-label">Host Network:</span><span class="detail-value">${podDetails.spec.hostNetwork ? 'Yes' : 'No'}</span></div>
            </div>
        </div>
        ${tolerations.length > 0 ? `
        <div class="detail-section">
            <h3>Tolerations</h3>
            <table class="detail-table">
                <thead><tr><th>Key</th><th>Operator</th><th>Effect</th><th>Toleration Seconds</th></tr></thead>
                <tbody>
                    ${tolerations.map(tol => `<tr><td><code>${tol.key || ''}</code></td><td>${tol.operator || ''}</td><td>${tol.effect || ''}</td><td>${tol.tolerationSeconds || 'N/A'}</td></tr>`).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}
    `;
}

function generatePodConditionsTab(podDetails) {
    const conditions = podDetails.status.conditions || [];

    return `
        <div class="detail-section">
            <h3>Pod Conditions</h3>
            ${conditions.length > 0 ? `
            <table class="detail-table">
                <thead><tr><th>Type</th><th>Status</th><th>Last Probe Time</th><th>Last Transition Time</th></tr></thead>
                <tbody>
                    ${conditions.map(condition => `
                        <tr>
                            <td><strong>${condition.type}</strong></td>
                            <td><span class="status-badge ${condition.status === 'True' ? 'status-operational' : 'status-warning'}">${condition.status}</span></td>
                            <td>${condition.lastProbeTime || 'N/A'}</td>
                            <td>${condition.lastTransitionTime || 'N/A'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            ` : '<p style="color: #718096;">No conditions available</p>'}
        </div>
    `;
}

function generatePodStatusTab(podDetails) {
    const podIPs = podDetails.status.podIPs || (podDetails.status.podIP ? [{ ip: podDetails.status.podIP }] : []);
    const hostIPs = podDetails.status.hostIPs || (podDetails.status.hostIP ? [{ ip: podDetails.status.hostIP }] : []);

    return `
        <div class="detail-section">
            <h3>Runtime Status</h3>
            <div class="detail-grid">
                <div class="detail-item"><span class="detail-label">Phase:</span><span class="detail-value"><span class="status-badge ${getPodStatusClass(getPodStatusText(podDetails.status.phase))}">${getPodStatusText(podDetails.status.phase)}</span></span></div>
                <div class="detail-item"><span class="detail-label">QoS Class:</span><span class="detail-value">${podDetails.status.qosClass || 'N/A'}</span></div>
                <div class="detail-item"><span class="detail-label">Start Time:</span><span class="detail-value">${podDetails.status.startTime || 'N/A'}</span></div>
                <div class="detail-item"><span class="detail-label">Pod IP:</span><span class="detail-value">${podDetails.status.podIP || 'N/A'}</span></div>
                <div class="detail-item"><span class="detail-label">Host IP:</span><span class="detail-value">${podDetails.status.hostIP || 'N/A'}</span></div>
            </div>
        </div>
        ${podIPs.length > 0 ? `
        <div class="detail-section">
            <h3>Pod IPs</h3>
            <table class="detail-table">
                <thead><tr><th>IP Address</th></tr></thead>
                <tbody>${podIPs.map(ipObj => `<tr><td><code>${ipObj.ip || ipObj}</code></td></tr>`).join('')}</tbody>
            </table>
        </div>
        ` : ''}
        ${hostIPs.length > 0 ? `
        <div class="detail-section">
            <h3>Host IPs</h3>
            <table class="detail-table">
                <thead><tr><th>IP Address</th></tr></thead>
                <tbody>${hostIPs.map(ipObj => `<tr><td><code>${ipObj.ip || ipObj}</code></td></tr>`).join('')}</tbody>
            </table>
        </div>
        ` : ''}
    `;
}
