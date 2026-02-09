// Pod Detail Generation Functions

// Generate detailed pod data
function generatePodDetails(pod, cluster) {
    const creationTime = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
    const startTime = new Date(creationTime.getTime() + Math.random() * 60000);

    const containers = pod.ready ? pod.ready.split('/') : ['1', '1'];
    const readyCount = parseInt(containers[0]) || 1;
    const totalCount = parseInt(containers[1]) || 1;

    return {
        apiVersion: "v1",
        kind: "Pod",
        metadata: {
            name: pod.name,
            generateName: pod.name.split('-').slice(0, -2).join('-') + '-',
            namespace: pod.namespace,
            uid: generateUID(),
            resourceVersion: String(Math.floor(Math.random() * 9000000) + 1000000),
            creationTimestamp: creationTime.toISOString(),
            labels: {
                "app": pod.name.split('-')[0],
                "pod-template-hash": Math.random().toString(36).substring(2, 12)
            },
            ownerReferences: [{
                apiVersion: "apps/v1",
                kind: "ReplicaSet",
                name: pod.name.split('-').slice(0, -1).join('-'),
                uid: generateUID(),
                controller: true,
                blockOwnerDeletion: true
            }]
        },
        spec: {
            nodeName: pod.node || "node-1",
            serviceAccountName: "default",
            restartPolicy: "Always",
            dnsPolicy: "ClusterFirst",
            schedulerName: "default-scheduler",
            priority: 0,
            preemptionPolicy: "PreemptLowerPriority",
            terminationGracePeriodSeconds: 30,
            enableServiceLinks: true,
            hostNetwork: false,
            containers: generateContainerSpecs(totalCount, pod.name),
            volumes: generatePodVolumes(),
            tolerations: [
                { key: "node.kubernetes.io/not-ready", operator: "Exists", effect: "NoExecute", tolerationSeconds: 300 },
                { key: "node.kubernetes.io/unreachable", operator: "Exists", effect: "NoExecute", tolerationSeconds: 300 }
            ],
            securityContext: {}
        },
        status: {
            phase: getPodStatusText(pod.status),
            startTime: startTime.toISOString(),
            podIP: pod.ip || `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
            hostIP: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
            podIPs: [{ ip: pod.ip || `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}` }],
            hostIPs: [{ ip: `192.168.1.${Math.floor(Math.random() * 254) + 1}` }],
            qosClass: "BestEffort",
            conditions: [
                { type: "PodReadyToStartContainers", status: "True", lastProbeTime: null, lastTransitionTime: startTime.toISOString() },
                { type: "Initialized", status: "True", lastProbeTime: null, lastTransitionTime: startTime.toISOString() },
                { type: "Ready", status: readyCount === totalCount ? "True" : "False", lastProbeTime: null, lastTransitionTime: startTime.toISOString() },
                { type: "ContainersReady", status: readyCount === totalCount ? "True" : "False", lastProbeTime: null, lastTransitionTime: startTime.toISOString() },
                { type: "PodScheduled", status: "True", lastProbeTime: null, lastTransitionTime: creationTime.toISOString() }
            ],
            containerStatuses: generateContainerStatuses(readyCount, totalCount, pod.name, startTime)
        }
    };
}

function generateContainerSpecs(count, podName) {
    const containers = [];
    const appName = podName.split('-')[0];

    for (let i = 0; i < count; i++) {
        const containerName = count === 1 ? appName : `${appName}-${i + 1}`;
        containers.push({
            name: containerName,
            image: `${appName}:latest`,
            imagePullPolicy: "Always",
            env: [{ name: "NODE_IP", valueFrom: { fieldRef: { apiVersion: "v1", fieldPath: "status.hostIP" } } }],
            resources: {},
            volumeMounts: [{ name: "kube-api-access", readOnly: true, mountPath: "/var/run/secrets/kubernetes.io/serviceaccount" }],
            terminationMessagePath: "/dev/termination-log",
            terminationMessagePolicy: "File"
        });
    }
    return containers;
}

function generatePodVolumes() {
    return [{
        name: "kube-api-access",
        projected: {
            sources: [
                { serviceAccountToken: { expirationSeconds: 3607, path: "token" } },
                { configMap: { name: "kube-root-ca.crt", items: [{ key: "ca.crt", path: "ca.crt" }] } },
                { downwardAPI: { items: [{ path: "namespace", fieldRef: { apiVersion: "v1", fieldPath: "metadata.namespace" } }] } }
            ],
            defaultMode: 420
        }
    }];
}

function generateContainerStatuses(readyCount, totalCount, podName, startTime) {
    const statuses = [];
    const appName = podName.split('-')[0];

    for (let i = 0; i < totalCount; i++) {
        const containerName = totalCount === 1 ? appName : `${appName}-${i + 1}`;
        const isReady = i < readyCount;

        statuses.push({
            name: containerName,
            state: isReady
                ? { running: { startedAt: startTime.toISOString() } }
                : { waiting: { reason: "CrashLoopBackOff", message: "Back-off restarting failed container" } },
            lastState: {},
            ready: isReady,
            restartCount: isReady ? 0 : Math.floor(Math.random() * 5) + 1,
            image: `${appName}:latest`,
            imageID: `docker.io/library/${appName}@sha256:${generateImageSHA()}`,
            containerID: isReady ? `containerd://${generateUID().replace(/-/g, '')}` : "",
            started: isReady,
            volumeMounts: [{ name: "kube-api-access", readOnly: true, mountPath: "/var/run/secrets/kubernetes.io/serviceaccount", recursiveReadOnly: "Disabled" }]
        });
    }
    return statuses;
}

// Generate containers tab content
function generatePodContainersTab(podDetails) {
    let html = '<div class="detail-section"><h3>Containers</h3>';

    const containers = (podDetails.spec && podDetails.spec.containers) || [];
    const statuses = (podDetails.status && podDetails.status.containerStatuses) || [];

    containers.forEach((container, idx) => {
        const status = statuses[idx];
        const isRunning = status && status.state && status.state.running;

        html += `
            <div class="detail-section" style="background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                <h4 style="color: #0ea5e9; margin-bottom: 12px;">Container: ${container.name}</h4>
                <div class="detail-grid">
                    <div class="detail-item"><span class="detail-label">Image:</span><span class="detail-value"><code>${container.image}</code></span></div>
                    <div class="detail-item"><span class="detail-label">Image Pull Policy:</span><span class="detail-value">${container.imagePullPolicy}</span></div>
                    <div class="detail-item"><span class="detail-label">State:</span><span class="detail-value"><span class="status-badge ${isRunning ? 'status-operational' : 'status-warning'}">${isRunning ? 'Running' : 'Not Running'}</span></span></div>
                    <div class="detail-item"><span class="detail-label">Ready:</span><span class="detail-value">${status ? status.ready : 'N/A'}</span></div>
                    <div class="detail-item"><span class="detail-label">Restart Count:</span><span class="detail-value">${status ? status.restartCount : 'N/A'}</span></div>
                    <div class="detail-item"><span class="detail-label">Started:</span><span class="detail-value">${status ? status.started : 'N/A'}</span></div>
                </div>

                ${container.env && container.env.length > 0 ? `
                    <h5 style="color: #666; margin-top: 16px; margin-bottom: 8px;">Environment Variables</h5>
                    <table class="detail-table">
                        <thead><tr><th>Name</th><th>Value / Value From</th></tr></thead>
                        <tbody>
                            ${container.env.map(envVar => `<tr><td><code>${envVar.name}</code></td><td>${envVar.value || (envVar.valueFrom ? JSON.stringify(envVar.valueFrom.fieldRef) : 'N/A')}</td></tr>`).join('')}
                        </tbody>
                    </table>
                ` : ''}

                ${container.volumeMounts && container.volumeMounts.length > 0 ? `
                    <h5 style="color: #666; margin-top: 16px; margin-bottom: 8px;">Volume Mounts</h5>
                    <table class="detail-table">
                        <thead><tr><th>Name</th><th>Mount Path</th><th>Read Only</th></tr></thead>
                        <tbody>
                            ${container.volumeMounts.map(mount => `<tr><td>${mount.name}</td><td><code>${mount.mountPath}</code></td><td>${mount.readOnly ? 'Yes' : 'No'}</td></tr>`).join('')}
                        </tbody>
                    </table>
                ` : ''}
            </div>
        `;
    });

    html += '</div>';
    return html;
}

// Generate volumes tab content
function generatePodVolumesTab(podDetails) {
    if (!podDetails.spec.volumes || podDetails.spec.volumes.length === 0) {
        return '<div class="detail-section"><h3>Volumes</h3><p style="color: #718096;">No volumes defined</p></div>';
    }

    let html = '<div class="detail-section"><h3>Volumes</h3><table class="detail-table"><thead><tr><th>Name</th><th>Type</th><th>Details</th></tr></thead><tbody>';

    podDetails.spec.volumes.forEach(volume => {
        let volType = 'Unknown';
        let volDetails = '';

        if (volume.configMap) {
            volType = 'ConfigMap';
            volDetails = `Name: ${volume.configMap.name}`;
        } else if (volume.secret) {
            volType = 'Secret';
            volDetails = `Name: ${volume.secret.secretName}`;
        } else if (volume.emptyDir) {
            volType = 'EmptyDir';
            volDetails = volume.emptyDir.medium || 'Default';
        } else if (volume.hostPath) {
            volType = 'HostPath';
            volDetails = `Path: ${volume.hostPath.path}`;
        } else if (volume.persistentVolumeClaim) {
            volType = 'PVC';
            volDetails = `Claim: ${volume.persistentVolumeClaim.claimName}`;
        } else if (volume.projected) {
            volType = 'Projected';
            volDetails = `Sources: ${volume.projected.sources.length}`;
        }

        html += `<tr><td><strong>${volume.name}</strong></td><td><span class="status-badge">${volType}</span></td><td>${volDetails}</td></tr>`;
    });

    html += '</tbody></table></div>';
    return html;
}
