// Deployment Detail Generation Functions

// Generate detailed deployment data
function generateDeploymentDetails(deployment, cluster) {
    const creationTime = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
    const updateTime = new Date(creationTime.getTime() + Math.random() * 60000);

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
            labels: { "app": deployment.name },
            annotations: {
                "deployment.kubernetes.io/revision": "1",
                "kubectl.kubernetes.io/last-applied-configuration": `{"apiVersion":"apps/v1","kind":"Deployment","metadata":{"labels":{"app":"${deployment.name}"},"name":"${deployment.name}","namespace":"${deployment.namespace}"}}`
            }
        },
        spec: {
            replicas: totalReplicas,
            revisionHistoryLimit: 10,
            progressDeadlineSeconds: 600,
            selector: { matchLabels: { "app": deployment.name } },
            strategy: {
                type: "RollingUpdate",
                rollingUpdate: { maxUnavailable: "25%", maxSurge: "25%" }
            },
            template: {
                metadata: { creationTimestamp: null, labels: { "app": deployment.name } },
                spec: {
                    containers: deployment.containers.split(',').map((containerName, idx) => ({
                        name: containerName.trim(),
                        image: deployment.images.split(',')[idx]?.trim() || `${containerName.trim()}:latest`,
                        imagePullPolicy: "Always",
                        env: [{ name: "NODE_IP", valueFrom: { fieldRef: { apiVersion: "v1", fieldPath: "status.hostIP" } } }],
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

// Generate template tab content
function generateDeploymentTemplateTab(deploymentDetails) {
    return `
        <div class="detail-section">
            <h3>Pod Template</h3>
            <div class="detail-grid">
                <div class="detail-item"><span class="detail-label">DNS Policy:</span><span class="detail-value">${deploymentDetails.spec.template.spec.dnsPolicy}</span></div>
                <div class="detail-item"><span class="detail-label">Restart Policy:</span><span class="detail-value">${deploymentDetails.spec.template.spec.restartPolicy}</span></div>
                <div class="detail-item"><span class="detail-label">Scheduler Name:</span><span class="detail-value">${deploymentDetails.spec.template.spec.schedulerName}</span></div>
                <div class="detail-item"><span class="detail-label">Termination Grace Period:</span><span class="detail-value">${deploymentDetails.spec.template.spec.terminationGracePeriodSeconds}s</span></div>
            </div>
        </div>
        <div class="detail-section">
            <h3>Template Labels</h3>
            <table class="detail-table">
                <thead><tr><th>Key</th><th>Value</th></tr></thead>
                <tbody>${Object.entries(deploymentDetails.spec.template.metadata.labels).map(([key, value]) => `<tr><td><code>${key}</code></td><td>${value}</td></tr>`).join('')}</tbody>
            </table>
        </div>
        <div class="detail-section">
            <h3>Containers</h3>
            ${deploymentDetails.spec.template.spec.containers.map(container => `
                <div class="detail-section" style="background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                    <h4 style="color: #0ea5e9; margin-bottom: 12px;">Container: ${container.name}</h4>
                    <div class="detail-grid">
                        <div class="detail-item"><span class="detail-label">Image:</span><span class="detail-value"><code>${container.image}</code></span></div>
                        <div class="detail-item"><span class="detail-label">Image Pull Policy:</span><span class="detail-value">${container.imagePullPolicy}</span></div>
                        <div class="detail-item"><span class="detail-label">Termination Message Path:</span><span class="detail-value"><code>${container.terminationMessagePath}</code></span></div>
                        <div class="detail-item"><span class="detail-label">Termination Message Policy:</span><span class="detail-value">${container.terminationMessagePolicy}</span></div>
                    </div>
                    ${container.env && container.env.length > 0 ? `
                        <h5 style="color: #666; margin-top: 16px; margin-bottom: 8px;">Environment Variables</h5>
                        <table class="detail-table">
                            <thead><tr><th>Name</th><th>Value / Value From</th></tr></thead>
                            <tbody>${container.env.map(envVar => `<tr><td><code>${envVar.name}</code></td><td>${envVar.value || (envVar.valueFrom ? JSON.stringify(envVar.valueFrom.fieldRef) : 'N/A')}</td></tr>`).join('')}</tbody>
                        </table>
                    ` : ''}
                </div>
            `).join('')}
        </div>
    `;
}
