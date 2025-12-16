// Node Detail Generation Functions

// Generate detailed node data matching node.json structure
function generateNodeDetails(node, cluster) {
    const creationDate = new Date(Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000);

    const cpuCapacity = node.cpuCapacity || node.cpu || "4";
    const memoryCapacity = node.memoryCapacity || node.memory || "8Gi";
    const internalIP = node.internalIP || node.internalIp || "192.168.1.100";
    const externalIP = node.externalIP || node.externalIp || '<none>';
    const roles = node.roles || "";
    const osImage = node.osImage || "Ubuntu 22.04.3 LTS";
    const kernelVersion = node.kernelVersion || "5.15.0-78-generic";
    const containerRuntime = node.containerRuntime || "containerd://1.7.2";
    const version = node.version || "v1.28.0";

    let memoryKi;
    if (typeof memoryCapacity === 'string') {
        const memoryValue = parseFloat(memoryCapacity.replace(/[^0-9.]/g, '')) || 8;
        memoryKi = memoryCapacity.includes('Gi') ? memoryValue * 1024 * 1024 : memoryValue;
    } else {
        memoryKi = memoryCapacity * 1024 * 1024;
    }

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
                    "node-role.kubernetes.io/control-plane": roles.includes('control-plane') ? "" : undefined,
                    "node-role.kubernetes.io/worker": roles.includes('worker') ? "" : undefined,
                    "node.kubernetes.io/exclude-from-external-load-balancers": ""
                }).filter(([_, value]) => value !== undefined)
            ),
            annotations: {
                "flannel.alpha.coreos.com/backend-data": `{"VNI":1,"VtepMAC":"${generateMAC()}"}`,
                "flannel.alpha.coreos.com/backend-type": "vxlan",
                "flannel.alpha.coreos.com/kube-subnet-manager": "true",
                "flannel.alpha.coreos.com/public-ip": internalIP,
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
                { type: "InternalIP", address: internalIP },
                { type: "Hostname", address: node.name },
                ...(externalIP !== '<none>' ? [{ type: "ExternalIP", address: externalIP }] : [])
            ],
            capacity: {
                cpu: String(cpuCapacity),
                "ephemeral-storage": "50254368Ki",
                "hugepages-2Mi": "0",
                memory: memoryKi + "Ki",
                pods: "110"
            },
            allocatable: {
                cpu: String(cpuCapacity),
                "ephemeral-storage": "46314425473",
                "hugepages-2Mi": "0",
                memory: (memoryKi * 0.95).toFixed(0) + "Ki",
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
                containerRuntimeVersion: containerRuntime,
                kernelVersion: kernelVersion,
                kubeProxyVersion: version,
                kubeletVersion: version,
                machineID: generateUID().replace(/-/g, ''),
                operatingSystem: "linux",
                osImage: osImage,
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
        return status === 'False' ? 'status-operational' : 'status-warning';
    }
}
