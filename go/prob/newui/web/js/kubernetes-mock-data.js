// Kubernetes Mock Data Generators Module

// Mock Data Generators
function generatePodsMockData(cluster) {
    const pods = [];
    const namespaces = ['default', 'kube-system', 'monitoring', 'ingress-nginx', 'production', 'staging'];
    const statuses = [
        { name: 'Running', weight: 70 },
        { name: 'Pending', weight: 10 },
        { name: 'Succeeded', weight: 5 },
        { name: 'Failed', weight: 5 },
        { name: 'CrashLoopBackOff', weight: 10 }
    ];

    const baseCount = cluster === 'production' ? 60 : cluster === 'staging' ? 40 : 35;

    for (let i = 1; i <= baseCount; i++) {
        const namespace = namespaces[Math.floor(Math.random() * namespaces.length)];
        const rand = Math.random() * 100;
        let status = 'Running';
        let cumulative = 0;
        for (const s of statuses) {
            cumulative += s.weight;
            if (rand <= cumulative) {
                status = s.name;
                break;
            }
        }

        const restarts = status === 'CrashLoopBackOff' ? Math.floor(Math.random() * 20) + 5 : Math.floor(Math.random() * 3);
        const cpuUsage = status === 'Running' ? (Math.random() * 80 + 10).toFixed(1) : '0.0';
        const memoryUsage = status === 'Running' ? (Math.random() * 70 + 15).toFixed(1) : '0.0';
        const age = Math.floor(Math.random() * 30) + 1;
        const containers = Math.floor(Math.random() * 3) + 1;
        const readyContainers = status === 'Running' ? containers : status === 'Pending' ? 0 : Math.floor(Math.random() * containers);
        const nominatedNode = status === 'Pending' && Math.random() > 0.5 ? `node-${Math.floor(Math.random() * (cluster === 'production' ? 12 : cluster === 'staging' ? 6 : 4)) + 1}` : '<none>';
        const readinessGates = Math.random() > 0.7 ? `${Math.floor(Math.random() * 2)}/${Math.floor(Math.random() * 2) + 1}` : '<none>';

        pods.push({
            namespace: namespace,
            name: `${namespace}-pod-${i}`,
            ready: `${readyContainers}/${containers}`,
            readyContainers: readyContainers,
            status: status,
            restarts: restarts,
            age: age + 'd',
            ip: `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
            node: `node-${Math.floor(Math.random() * (cluster === 'production' ? 12 : cluster === 'staging' ? 6 : 4)) + 1}`,
            nominatedNode: nominatedNode,
            readinessGates: readinessGates,
            cpuUsage: cpuUsage + '%',
            memoryUsage: memoryUsage + '%',
            containers: containers
        });
    }

    return pods;
}

function generateDeploymentsMockData(cluster) {
    const deployments = [];
    const namespaces = ['default', 'production', 'staging', 'monitoring', 'ingress-nginx'];
    const strategies = ['RollingUpdate', 'Recreate'];
    const containerNames = ['nginx', 'redis', 'postgres', 'app', 'api', 'worker', 'frontend', 'backend'];
    const imageRepos = ['nginx', 'redis', 'postgres', 'myapp', 'myapi', 'worker'];

    const baseCount = cluster === 'production' ? 30 : cluster === 'staging' ? 25 : 20;

    for (let i = 1; i <= baseCount; i++) {
        const namespace = namespaces[Math.floor(Math.random() * namespaces.length)];
        const replicas = Math.floor(Math.random() * 5) + 1;
        const ready = Math.random() > 0.1 ? replicas : Math.floor(Math.random() * replicas);
        const available = ready;
        const upToDate = Math.random() > 0.15 ? replicas : Math.floor(Math.random() * replicas);
        const age = Math.floor(Math.random() * 90) + 1;

        // Generate containers and images
        const containerCount = Math.floor(Math.random() * 2) + 1;
        const containers = [];
        const images = [];
        for (let c = 0; c < containerCount; c++) {
            const containerName = containerNames[Math.floor(Math.random() * containerNames.length)];
            const imageRepo = imageRepos[Math.floor(Math.random() * imageRepos.length)];
            const imageTag = `${Math.floor(Math.random() * 3) + 1}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`;
            containers.push(containerName);
            images.push(`${imageRepo}:${imageTag}`);
        }

        deployments.push({
            namespace: namespace,
            name: `${namespace}-deployment-${i}`,
            ready: `${ready}/${replicas}`,
            readyCount: ready,
            replicas: replicas,
            upToDate: upToDate,
            available: available,
            age: age + 'd',
            containers: containers.join(','),
            images: images.join(','),
            selector: `app=${namespace}-app-${i}`,
            strategy: strategies[Math.floor(Math.random() * strategies.length)]
        });
    }

    return deployments;
}

function generateServicesMockData(cluster) {
    const services = [];
    const namespaces = ['default', 'production', 'staging', 'monitoring', 'kube-system'];
    const types = [
        { name: 'ClusterIP', weight: 60 },
        { name: 'NodePort', weight: 25 },
        { name: 'LoadBalancer', weight: 15 }
    ];

    const baseCount = cluster === 'production' ? 35 : cluster === 'staging' ? 28 : 22;

    for (let i = 1; i <= baseCount; i++) {
        const namespace = namespaces[Math.floor(Math.random() * namespaces.length)];
        const rand = Math.random() * 100;
        let type = 'ClusterIP';
        let cumulative = 0;
        for (const t of types) {
            cumulative += t.weight;
            if (rand <= cumulative) {
                type = t.name;
                break;
            }
        }

        const clusterIP = `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
        const externalIP = type === 'LoadBalancer'
            ? `${Math.floor(Math.random() * 200) + 50}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
            : '<none>';

        // Generate port mappings
        const port = Math.floor(Math.random() * 60000) + 3000;
        const targetPort = Math.floor(Math.random() * 10000) + 8000;
        const nodePort = type === 'NodePort' || type === 'LoadBalancer'
            ? Math.floor(Math.random() * 2768) + 30000
            : null;

        let ports;
        if (type === 'ClusterIP') {
            ports = `${port}/TCP`;
        } else if (type === 'NodePort') {
            ports = `${port}:${nodePort}/TCP`;
        } else { // LoadBalancer
            ports = `${port}:${nodePort}/TCP`;
        }

        const age = Math.floor(Math.random() * 120) + 1;

        services.push({
            namespace: namespace,
            name: `${namespace}-service-${i}`,
            type: type,
            clusterIP: clusterIP,
            externalIP: externalIP,
            ports: ports,
            age: age + 'd',
            selector: `app=${namespace}-app-${i}`
        });
    }

    return services;
}

function generateNodesMockData(cluster) {
    const nodes = [];
    const roles = ['master', 'worker'];
    const statuses = [
        { name: 'Ready', weight: 85 },
        { name: 'NotReady', weight: 10 },
        { name: 'SchedulingDisabled', weight: 5 }
    ];
    const versions = ['v1.28.3', 'v1.28.2', 'v1.27.8'];

    const nodeCount = cluster === 'production' ? 12 : cluster === 'staging' ? 6 : 4;

    for (let i = 1; i <= nodeCount; i++) {
        const role = i <= (nodeCount <= 4 ? 1 : 3) ? 'master' : 'worker';
        const rand = Math.random() * 100;
        let status = 'Ready';
        let cumulative = 0;
        for (const s of statuses) {
            cumulative += s.weight;
            if (rand <= cumulative) {
                status = s.name;
                break;
            }
        }

        const cpuCapacity = role === 'master' ? 8 : 16;
        const memoryCapacity = role === 'master' ? 32 : 64;
        const cpuUsage = status === 'Ready' ? (Math.random() * 60 + 20).toFixed(1) : '0.0';
        const memoryUsage = status === 'Ready' ? (Math.random() * 50 + 30).toFixed(1) : '0.0';
        const age = Math.floor(Math.random() * 200) + 30;
        const version = cluster === 'development' && Math.random() > 0.5 ? versions[2] : versions[Math.floor(Math.random() * 2)];

        // Generate IPs
        const internalIP = `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
        const externalIP = role === 'master' || Math.random() > 0.7
            ? `${Math.floor(Math.random() * 200) + 50}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
            : '<none>';

        nodes.push({
            name: `node-${i}`,
            status: status,
            roles: role,
            age: age + 'd',
            version: version,
            internalIP: internalIP,
            externalIP: externalIP,
            osImage: 'Ubuntu 22.04.3 LTS',
            kernelVersion: '5.15.0-89-generic',
            containerRuntime: 'containerd://1.7.2',
            cpuCapacity: cpuCapacity,
            cpuUsage: cpuUsage + '%',
            memoryCapacity: memoryCapacity + ' GB',
            memoryUsage: memoryUsage + '%'
        });
    }

    return nodes;
}

function generateStatefulSetsMockData(cluster) {
    const statefulsets = [];
    const namespaces = ['default', 'production', 'staging', 'monitoring', 'database'];
    const containerNames = ['mysql', 'postgres', 'mongodb', 'redis', 'cassandra', 'elasticsearch', 'kafka', 'zookeeper'];
    const imageRepos = ['mysql', 'postgres', 'mongo', 'redis', 'cassandra', 'elasticsearch', 'kafka', 'zookeeper'];

    const baseCount = cluster === 'production' ? 25 : cluster === 'staging' ? 18 : 15;

    for (let i = 1; i <= baseCount; i++) {
        const namespace = namespaces[Math.floor(Math.random() * namespaces.length)];
        const replicas = Math.floor(Math.random() * 5) + 1;
        const ready = Math.random() > 0.15 ? replicas : Math.floor(Math.random() * replicas);
        const age = Math.floor(Math.random() * 120) + 1;

        // Generate containers and images
        const containerCount = Math.floor(Math.random() * 2) + 1;
        const containers = [];
        const images = [];
        for (let c = 0; c < containerCount; c++) {
            const containerName = containerNames[Math.floor(Math.random() * containerNames.length)];
            const imageRepo = imageRepos[Math.floor(Math.random() * imageRepos.length)];
            const imageTag = `${Math.floor(Math.random() * 3) + 1}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`;
            containers.push(containerName);
            images.push(`${imageRepo}:${imageTag}`);
        }

        statefulsets.push({
            namespace: namespace,
            name: `${namespace}-statefulset-${i}`,
            ready: `${ready}/${replicas}`,
            readyCount: ready,
            replicas: replicas,
            age: age + 'd',
            containers: containers.join(','),
            images: images.join(','),
            selector: `app=${namespace}-stateful-${i}`,
            serviceName: `${namespace}-headless-svc`,
            volumeClaimTemplates: Math.floor(Math.random() * 3) + 1
        });
    }

    return statefulsets;
}

function generateDaemonSetsMockData(cluster) {
    const daemonsets = [];
    const namespaces = ['kube-system', 'monitoring', 'logging', 'networking', 'default'];
    const names = ['node-exporter', 'fluentd', 'kube-proxy', 'calico-node', 'nvidia-device-plugin'];
    const containerNames = ['node-exporter', 'fluentd', 'kube-proxy', 'calico-node', 'nvidia-plugin', 'log-collector'];
    const imageRepos = ['prom/node-exporter', 'fluent/fluentd', 'k8s.gcr.io/kube-proxy', 'calico/node', 'nvidia/k8s-device-plugin', 'fluentbit/fluent-bit'];

    const baseCount = cluster === 'production' ? 20 : cluster === 'staging' ? 15 : 12;

    for (let i = 1; i <= baseCount; i++) {
        const namespace = namespaces[Math.floor(Math.random() * namespaces.length)];
        const name = names[Math.floor(Math.random() * names.length)];
        const nodeCount = cluster === 'production' ? 12 : cluster === 'staging' ? 6 : 4;
        const desired = nodeCount;
        const current = Math.random() > 0.1 ? desired : Math.floor(Math.random() * desired);
        const ready = current;
        const upToDate = Math.random() > 0.15 ? ready : Math.floor(Math.random() * ready);
        const available = ready;
        const age = Math.floor(Math.random() * 180) + 10;

        // Generate containers and images
        const containerCount = Math.floor(Math.random() * 2) + 1;
        const containers = [];
        const images = [];
        for (let c = 0; c < containerCount; c++) {
            const containerName = containerNames[Math.floor(Math.random() * containerNames.length)];
            const imageRepo = imageRepos[Math.floor(Math.random() * imageRepos.length)];
            const imageTag = `v${Math.floor(Math.random() * 3) + 1}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`;
            containers.push(containerName);
            images.push(`${imageRepo}:${imageTag}`);
        }

        const nodeSelectors = [
            'kubernetes.io/os=linux',
            'node-role.kubernetes.io/worker=true',
            'beta.kubernetes.io/arch=amd64',
            'none'
        ];
        const nodeSelector = nodeSelectors[Math.floor(Math.random() * nodeSelectors.length)];

        daemonsets.push({
            namespace: namespace,
            name: `${name}-${namespace}-${i}`,
            desired: desired,
            current: current,
            ready: ready,
            upToDate: upToDate,
            available: available,
            nodeSelector: nodeSelector,
            age: age + 'd',
            containers: containers.join(','),
            images: images.join(','),
            selector: `app=${name},component=system`
        });
    }

    return daemonsets;
}

function generateNamespacesMockData(cluster) {
    const namespaces = [];
    const baseNames = ['default', 'kube-system', 'kube-public', 'kube-node-lease',
                       'production', 'staging', 'development', 'monitoring', 'logging',
                       'ingress-nginx', 'cert-manager', 'istio-system', 'database',
                       'kafka', 'redis', 'elasticsearch'];

    const extraCount = cluster === 'production' ? 10 : cluster === 'staging' ? 5 : 3;

    baseNames.forEach((name, index) => {
        const age = Math.floor(Math.random() * 300) + 30;
        const podCount = Math.floor(Math.random() * 50) + 5;
        const status = Math.random() > 0.05 ? 'Active' : 'Terminating';

        namespaces.push({
            name: name,
            status: status,
            age: age + 'd',
            labels: index < 4 ? 'kubernetes.io/metadata.name=' + name : 'environment=' + name,
            podCount: podCount
        });
    });

    // Add extra namespaces for pagination
    for (let i = 1; i <= extraCount; i++) {
        const age = Math.floor(Math.random() * 100) + 1;
        const podCount = Math.floor(Math.random() * 30) + 1;
        namespaces.push({
            name: `app-namespace-${i}`,
            status: 'Active',
            age: age + 'd',
            labels: `team=team-${i}`,
            podCount: podCount
        });
    }

    return namespaces;
}

function generateNetworkPoliciesMockData(cluster) {
    const policies = [];
    const namespaces = ['default', 'production', 'staging', 'monitoring', 'database'];
    const policyTypes = [
        { type: 'Ingress', weight: 40 },
        { type: 'Egress', weight: 30 },
        { type: 'Ingress,Egress', weight: 30 }
    ];

    const baseCount = cluster === 'production' ? 25 : cluster === 'staging' ? 18 : 15;

    for (let i = 1; i <= baseCount; i++) {
        const namespace = namespaces[Math.floor(Math.random() * namespaces.length)];
        const rand = Math.random() * 100;
        let policyType = 'Ingress';
        let cumulative = 0;
        for (const p of policyTypes) {
            cumulative += p.weight;
            if (rand <= cumulative) {
                policyType = p.type;
                break;
            }
        }

        const age = Math.floor(Math.random() * 150) + 1;
        const podSelector = `app=${namespace}-app-${i}`;

        policies.push({
            name: `${namespace}-network-policy-${i}`,
            namespace: namespace,
            policyTypes: policyType,
            podSelector: podSelector,
            age: age + 'd',
            ingressRules: policyType.includes('Ingress') ? Math.floor(Math.random() * 5) + 1 : 0,
            egressRules: policyType.includes('Egress') ? Math.floor(Math.random() * 5) + 1 : 0
        });
    }

    return policies;
}
