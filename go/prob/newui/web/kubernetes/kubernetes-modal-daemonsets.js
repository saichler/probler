// DaemonSet Detail Modal Function

// DaemonSet Detail Modal
function showDaemonSetDetailModal(daemonset, cluster) {
    const modal = document.getElementById('k8s-detail-modal');
    const content = document.getElementById('k8s-detail-content');
    const modalTitle = modal.querySelector('.modal-title');

    modalTitle.textContent = `DaemonSet ${daemonset.name} Details`;

    const daemonsetDetails = generateDaemonSetDetails(daemonset, cluster);

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
                <h3>DaemonSet Information</h3>
                <div class="detail-grid">
                    <div class="detail-item"><span class="detail-label">Name:</span><span class="detail-value">${daemonsetDetails.metadata.name}</span></div>
                    <div class="detail-item"><span class="detail-label">Namespace:</span><span class="detail-value">${daemonsetDetails.metadata.namespace}</span></div>
                    <div class="detail-item"><span class="detail-label">UID:</span><span class="detail-value">${daemonsetDetails.metadata.uid}</span></div>
                    <div class="detail-item"><span class="detail-label">Cluster:</span><span class="detail-value">${cluster}</span></div>
                    <div class="detail-item"><span class="detail-label">Generation:</span><span class="detail-value">${daemonsetDetails.metadata.generation}</span></div>
                    <div class="detail-item"><span class="detail-label">Creation Time:</span><span class="detail-value">${daemonsetDetails.metadata.creationTimestamp}</span></div>
                    <div class="detail-item"><span class="detail-label">Desired Scheduled:</span><span class="detail-value">${daemonsetDetails.status.desiredNumberScheduled}</span></div>
                    <div class="detail-item"><span class="detail-label">Current Scheduled:</span><span class="detail-value"><span class="status-badge ${daemonsetDetails.status.currentNumberScheduled === daemonsetDetails.status.desiredNumberScheduled ? 'status-operational' : 'status-warning'}">${daemonsetDetails.status.currentNumberScheduled}/${daemonsetDetails.status.desiredNumberScheduled}</span></span></div>
                </div>
            </div>
        </div>

        <div class="modal-tab-content" data-tab-content="metadata">
            <div class="detail-section">
                <h3>Metadata</h3>
                <div class="detail-grid">
                    <div class="detail-item"><span class="detail-label">Name:</span><span class="detail-value">${daemonsetDetails.metadata.name}</span></div>
                    <div class="detail-item"><span class="detail-label">Namespace:</span><span class="detail-value">${daemonsetDetails.metadata.namespace}</span></div>
                    <div class="detail-item"><span class="detail-label">UID:</span><span class="detail-value">${daemonsetDetails.metadata.uid}</span></div>
                    <div class="detail-item"><span class="detail-label">Resource Version:</span><span class="detail-value">${daemonsetDetails.metadata.resourceVersion}</span></div>
                    <div class="detail-item"><span class="detail-label">Generation:</span><span class="detail-value">${daemonsetDetails.metadata.generation}</span></div>
                    <div class="detail-item"><span class="detail-label">Creation Timestamp:</span><span class="detail-value">${daemonsetDetails.metadata.creationTimestamp}</span></div>
                </div>
            </div>
            <div class="detail-section">
                <h3>Labels</h3>
                <table class="detail-table">
                    <thead><tr><th>Key</th><th>Value</th></tr></thead>
                    <tbody>${Object.entries(daemonsetDetails.metadata.labels).map(([key, value]) => `<tr><td><code>${key}</code></td><td>${value}</td></tr>`).join('')}</tbody>
                </table>
            </div>
        </div>

        <div class="modal-tab-content" data-tab-content="spec">
            <div class="detail-section">
                <h3>DaemonSet Spec</h3>
                <div class="detail-grid">
                    <div class="detail-item"><span class="detail-label">Revision History Limit:</span><span class="detail-value">${daemonsetDetails.spec.revisionHistoryLimit}</span></div>
                    <div class="detail-item"><span class="detail-label">Update Strategy Type:</span><span class="detail-value">${daemonsetDetails.spec.updateStrategy.type}</span></div>
                    <div class="detail-item"><span class="detail-label">Max Unavailable:</span><span class="detail-value">${daemonsetDetails.spec.updateStrategy.rollingUpdate.maxUnavailable}</span></div>
                </div>
            </div>
            <div class="detail-section">
                <h3>Selector</h3>
                <table class="detail-table">
                    <thead><tr><th>Key</th><th>Value</th></tr></thead>
                    <tbody>${Object.entries(daemonsetDetails.spec.selector.matchLabels).map(([key, value]) => `<tr><td><code>${key}</code></td><td>${value}</td></tr>`).join('')}</tbody>
                </table>
            </div>
        </div>

        <div class="modal-tab-content" data-tab-content="template">
            <div class="detail-section">
                <h3>Pod Template</h3>
                <div class="detail-grid">
                    <div class="detail-item"><span class="detail-label">DNS Policy:</span><span class="detail-value">${daemonsetDetails.spec.template.spec.dnsPolicy}</span></div>
                    <div class="detail-item"><span class="detail-label">Host Network:</span><span class="detail-value">${daemonsetDetails.spec.template.spec.hostNetwork ? 'Yes' : 'No'}</span></div>
                    <div class="detail-item"><span class="detail-label">Restart Policy:</span><span class="detail-value">${daemonsetDetails.spec.template.spec.restartPolicy}</span></div>
                    <div class="detail-item"><span class="detail-label">Termination Grace Period:</span><span class="detail-value">${daemonsetDetails.spec.template.spec.terminationGracePeriodSeconds}s</span></div>
                </div>
            </div>
            <div class="detail-section">
                <h3>Containers</h3>
                ${daemonsetDetails.spec.template.spec.containers.map(container => `
                    <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                        <h4 style="color: #0ea5e9; margin-bottom: 12px;">Container: ${container.name}</h4>
                        <div class="detail-grid">
                            <div class="detail-item"><span class="detail-label">Image:</span><span class="detail-value"><code>${container.image}</code></span></div>
                            <div class="detail-item"><span class="detail-label">Image Pull Policy:</span><span class="detail-value">${container.imagePullPolicy}</span></div>
                        </div>
                        ${container.ports && container.ports.length > 0 ? `
                            <h5 style="color: #666; margin-top: 16px; margin-bottom: 8px;">Ports</h5>
                            <table class="detail-table">
                                <thead><tr><th>Container Port</th><th>Protocol</th></tr></thead>
                                <tbody>${container.ports.map(port => `<tr><td><code>${port.containerPort}</code></td><td>${port.protocol}</td></tr>`).join('')}</tbody>
                            </table>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="modal-tab-content" data-tab-content="status">
            <div class="detail-section">
                <h3>DaemonSet Status</h3>
                <div class="detail-grid">
                    <div class="detail-item"><span class="detail-label">Current Number Scheduled:</span><span class="detail-value">${daemonsetDetails.status.currentNumberScheduled}</span></div>
                    <div class="detail-item"><span class="detail-label">Desired Number Scheduled:</span><span class="detail-value">${daemonsetDetails.status.desiredNumberScheduled}</span></div>
                    <div class="detail-item"><span class="detail-label">Number Ready:</span><span class="detail-value">${daemonsetDetails.status.numberReady}</span></div>
                    <div class="detail-item"><span class="detail-label">Number Available:</span><span class="detail-value">${daemonsetDetails.status.numberAvailable}</span></div>
                    <div class="detail-item"><span class="detail-label">Updated Number Scheduled:</span><span class="detail-value">${daemonsetDetails.status.updatedNumberScheduled}</span></div>
                    <div class="detail-item"><span class="detail-label">Number Misscheduled:</span><span class="detail-value">${daemonsetDetails.status.numberMisscheduled}</span></div>
                </div>
            </div>
            <div class="detail-section">
                <h3>Node Distribution</h3>
                <div class="detail-grid">
                    <div class="detail-item"><span class="detail-label">Pods Running:</span><span class="detail-value">${daemonsetDetails.status.numberReady} of ${daemonsetDetails.status.desiredNumberScheduled} nodes</span></div>
                    <div class="detail-item"><span class="detail-label">Coverage:</span><span class="detail-value">${((daemonsetDetails.status.numberReady / daemonsetDetails.status.desiredNumberScheduled) * 100).toFixed(1)}%</span></div>
                </div>
            </div>
        </div>
    `;

    setupK8sModalTabs(content);
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Generate detailed daemonset data
function generateDaemonSetDetails(daemonset, cluster) {
    const creationTime = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);

    return {
        apiVersion: "apps/v1",
        kind: "DaemonSet",
        metadata: {
            name: daemonset.name,
            namespace: daemonset.namespace,
            uid: generateUID(),
            resourceVersion: String(Math.floor(Math.random() * 9000000) + 1000000),
            generation: 1,
            creationTimestamp: creationTime.toISOString(),
            labels: { "app": daemonset.name },
            annotations: { "deprecated.daemonset.template.generation": "1" }
        },
        spec: {
            revisionHistoryLimit: 10,
            selector: { matchLabels: { "app": daemonset.name } },
            updateStrategy: { type: "RollingUpdate", rollingUpdate: { maxSurge: 0, maxUnavailable: 1 } },
            template: {
                metadata: { creationTimestamp: null, labels: { "app": daemonset.name } },
                spec: {
                    containers: daemonset.containers.split(',').map((containerName, idx) => ({
                        name: containerName.trim(),
                        image: daemonset.images.split(',')[idx]?.trim() || `${containerName.trim()}:latest`,
                        imagePullPolicy: "Always",
                        ports: [{ containerPort: 25998, protocol: "TCP" }],
                        resources: {},
                        terminationMessagePath: "/dev/termination-log",
                        terminationMessagePolicy: "File"
                    })),
                    dnsPolicy: "ClusterFirst",
                    hostNetwork: true,
                    restartPolicy: "Always",
                    schedulerName: "default-scheduler",
                    securityContext: {},
                    terminationGracePeriodSeconds: 30
                }
            }
        },
        status: {
            currentNumberScheduled: daemonset.current,
            desiredNumberScheduled: daemonset.desired,
            numberAvailable: daemonset.available,
            numberMisscheduled: 0,
            numberReady: daemonset.ready,
            observedGeneration: 1,
            updatedNumberScheduled: daemonset.upToDate
        }
    };
}
