// Kubernetes Table Initialization Module

// Table Initialization Functions
function initializePodsTable(cluster) {
    const pods = generatePodsMockData(cluster);
    const containerElement = document.getElementById(`pods-${cluster}-table`);

    if (!containerElement) {
        return;
    }

    const columns = [
        { key: 'namespace', label: 'NAMESPACE' },
        { key: 'name', label: 'NAME' },
        {
            key: 'ready',
            label: 'READY',
            render: (value, row) => {
                const statusClass = row.readyContainers === row.containers ? 'status-operational' :
                                   row.readyContainers > 0 ? 'status-warning' : 'status-critical';
                return `<span class="status-badge ${statusClass}">${value}</span>`;
            }
        },
        {
            key: 'status',
            label: 'STATUS',
            render: (value) => {
                const statusClass = value === 'Running' ? 'status-operational' :
                                   value === 'Pending' ? 'status-warning' :
                                   value === 'Succeeded' ? 'status-operational' :
                                   'status-critical';
                return `<span class="status-badge ${statusClass}">${value}</span>`;
            }
        },
        { key: 'restarts', label: 'RESTARTS' },
        { key: 'age', label: 'AGE' },
        { key: 'ip', label: 'IP' },
        { key: 'node', label: 'NODE' },
        { key: 'nominatedNode', label: 'NOMINATED NODE' },
        { key: 'readinessGates', label: 'READINESS GATES' }
    ];

    const podsTable = new ProblerTable(`pods-${cluster}-table`, {
        columns: columns,
        data: pods,
        rowsPerPage: 15,
        onRowClick: (pod) => showPodDetailModal(pod, cluster)
    });
}

function initializeDeploymentsTable(cluster) {
    const deployments = generateDeploymentsMockData(cluster);
    const containerElement = document.getElementById(`deployments-${cluster}-table`);

    if (!containerElement) {
        return;
    }

    const columns = [
        { key: 'namespace', label: 'NAMESPACE' },
        { key: 'name', label: 'NAME' },
        {
            key: 'ready',
            label: 'READY',
            render: (value, row) => {
                const statusClass = row.readyCount === row.replicas ? 'status-operational' :
                                   row.readyCount > 0 ? 'status-warning' : 'status-critical';
                return `<span class="status-badge ${statusClass}">${value}</span>`;
            }
        },
        { key: 'upToDate', label: 'UP-TO-DATE' },
        { key: 'available', label: 'AVAILABLE' },
        { key: 'age', label: 'AGE' },
        { key: 'containers', label: 'CONTAINERS' },
        { key: 'images', label: 'IMAGES' },
        { key: 'selector', label: 'SELECTOR' }
    ];

    const deploymentsTable = new ProblerTable(`deployments-${cluster}-table`, {
        columns: columns,
        data: deployments,
        rowsPerPage: 15,
        onRowClick: (deployment) => showDeploymentDetailModal(deployment, cluster)
    });
}

function initializeServicesTable(cluster) {
    const services = generateServicesMockData(cluster);
    const containerElement = document.getElementById(`services-${cluster}-table`);

    if (!containerElement) {
        return;
    }

    const columns = [
        { key: 'namespace', label: 'NAMESPACE' },
        { key: 'name', label: 'NAME' },
        {
            key: 'type',
            label: 'TYPE',
            render: (value) => {
                const typeClass = value === 'LoadBalancer' ? 'status-operational' :
                                 value === 'NodePort' ? 'status-warning' : '';
                return typeClass ? `<span class="status-badge ${typeClass}">${value}</span>` : value;
            }
        },
        { key: 'clusterIP', label: 'CLUSTER-IP' },
        { key: 'externalIP', label: 'EXTERNAL-IP' },
        { key: 'ports', label: 'PORT(S)' },
        { key: 'age', label: 'AGE' },
        { key: 'selector', label: 'SELECTOR' }
    ];

    const servicesTable = new ProblerTable(`services-${cluster}-table`, {
        columns: columns,
        data: services,
        rowsPerPage: 15,
        onRowClick: (service) => showServiceDetailModal(service, cluster)
    });
}

function initializeNodesTable(cluster) {
    const nodes = generateNodesMockData(cluster);
    const containerElement = document.getElementById(`nodes-${cluster}-table`);

    if (!containerElement) {
        return;
    }

    const columns = [
        { key: 'name', label: 'NAME' },
        {
            key: 'status',
            label: 'STATUS',
            render: (value) => {
                const statusClass = value === 'Ready' ? 'status-operational' :
                                   value === 'SchedulingDisabled' ? 'status-warning' :
                                   'status-critical';
                return `<span class="status-badge ${statusClass}">${value}</span>`;
            }
        },
        { key: 'roles', label: 'ROLES' },
        { key: 'age', label: 'AGE' },
        { key: 'version', label: 'VERSION' },
        { key: 'internalIP', label: 'INTERNAL-IP' },
        { key: 'externalIP', label: 'EXTERNAL-IP' },
        { key: 'osImage', label: 'OS-IMAGE' },
        { key: 'kernelVersion', label: 'KERNEL-VERSION' },
        { key: 'containerRuntime', label: 'CONTAINER-RUNTIME' }
    ];

    const nodesTable = new ProblerTable(`nodes-${cluster}-table`, {
        columns: columns,
        data: nodes,
        rowsPerPage: 15,
        onRowClick: (node) => showNodeDetailModal(node, cluster)
    });
}

function initializeStatefulSetsTable(cluster) {
    const statefulsets = generateStatefulSetsMockData(cluster);
    const containerElement = document.getElementById(`statefulsets-${cluster}-table`);

    if (!containerElement) {
        return;
    }

    const columns = [
        { key: 'namespace', label: 'NAMESPACE' },
        { key: 'name', label: 'NAME' },
        {
            key: 'ready',
            label: 'READY',
            render: (value, row) => {
                const statusClass = row.readyCount === row.replicas ? 'status-operational' :
                                   row.readyCount > 0 ? 'status-warning' : 'status-critical';
                return `<span class="status-badge ${statusClass}">${value}</span>`;
            }
        },
        { key: 'age', label: 'AGE' },
        { key: 'containers', label: 'CONTAINERS' },
        { key: 'images', label: 'IMAGES' }
    ];

    const statefulSetsTable = new ProblerTable(`statefulsets-${cluster}-table`, {
        columns: columns,
        data: statefulsets,
        rowsPerPage: 15,
        onRowClick: (statefulset) => showStatefulSetDetailModal(statefulset, cluster)
    });
}

function initializeDaemonSetsTable(cluster) {
    const daemonsets = generateDaemonSetsMockData(cluster);
    const containerElement = document.getElementById(`daemonsets-${cluster}-table`);

    if (!containerElement) {
        return;
    }

    const columns = [
        { key: 'namespace', label: 'NAMESPACE' },
        { key: 'name', label: 'NAME' },
        { key: 'desired', label: 'DESIRED' },
        { key: 'current', label: 'CURRENT' },
        {
            key: 'ready',
            label: 'READY',
            render: (value, row) => {
                const statusClass = value === row.desired ? 'status-operational' :
                                   value > 0 ? 'status-warning' : 'status-critical';
                return `<span class="status-badge ${statusClass}">${value}</span>`;
            }
        },
        { key: 'upToDate', label: 'UP-TO-DATE' },
        { key: 'available', label: 'AVAILABLE' },
        { key: 'nodeSelector', label: 'NODE SELECTOR' },
        { key: 'age', label: 'AGE' },
        { key: 'containers', label: 'CONTAINERS' },
        { key: 'images', label: 'IMAGES' },
        { key: 'selector', label: 'SELECTOR' }
    ];

    const daemonSetsTable = new ProblerTable(`daemonsets-${cluster}-table`, {
        columns: columns,
        data: daemonsets,
        rowsPerPage: 15,
        onRowClick: (daemonset) => showDaemonSetDetailModal(daemonset, cluster)
    });
}

function initializeNamespacesTable(cluster) {
    const namespaces = generateNamespacesMockData(cluster);
    const containerElement = document.getElementById(`namespaces-${cluster}-table`);

    if (!containerElement) {
        return;
    }

    const columns = [
        { key: 'name', label: 'NAME' },
        {
            key: 'status',
            label: 'STATUS',
            render: (value) => {
                const statusClass = value === 'Active' ? 'status-operational' : 'status-warning';
                return `<span class="status-badge ${statusClass}">${value}</span>`;
            }
        },
        { key: 'age', label: 'AGE' }
    ];

    const namespacesTable = new ProblerTable(`namespaces-${cluster}-table`, {
        columns: columns,
        data: namespaces,
        rowsPerPage: 15,
        onRowClick: (namespace) => showNamespaceDetailModal(namespace, cluster)
    });
}

function initializeNetworkPoliciesTable(cluster) {
    const policies = generateNetworkPoliciesMockData(cluster);
    const containerElement = document.getElementById(`networkpolicies-${cluster}-table`);

    if (!containerElement) {
        return;
    }

    const columns = [
        { key: 'namespace', label: 'NAMESPACE' },
        { key: 'name', label: 'NAME' },
        { key: 'podSelector', label: 'POD-SELECTOR' },
        { key: 'age', label: 'AGE' }
    ];

    const networkPoliciesTable = new ProblerTable(`networkpolicies-${cluster}-table`, {
        columns: columns,
        data: policies,
        rowsPerPage: 15,
        onRowClick: (policy) => showNetworkPolicyDetailModal(policy, cluster)
    });
}
