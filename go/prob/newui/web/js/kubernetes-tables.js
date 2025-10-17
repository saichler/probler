// Kubernetes Table Initialization Module

// Pod Status Enum Mapping (from k8s.pb.go)
const PodStatusEnum = {
    0: "Invalid_Pod_Status",
    1: "Running",
    2: "Pending",
    3: "Succeeded",
    4: "Failed",
    5: "Unknown",
    6: "CrashLoopBackOff",
    7: "Terminating",
    8: "ContainerCreating",
    9: "ImagePullBackOff",
    10: "Error",
    11: "Completed"
};

// Function to convert Pod Status enum to text
function getPodStatusText(statusValue) {
    // If it's already a string, return it
    if (typeof statusValue === 'string') {
        return statusValue;
    }
    // If it's a number, convert using enum mapping
    return PodStatusEnum[statusValue] || 'Unknown';
}

// Function to get status class for Pod Status
function getPodStatusClass(statusText) {
    const statusLower = statusText.toLowerCase();

    // Operational statuses (green)
    if (statusLower === 'running' || statusLower === 'succeeded' || statusLower === 'completed') {
        return 'status-operational';
    }

    // Warning statuses (yellow/orange)
    if (statusLower === 'pending' || statusLower === 'containercreating' || statusLower === 'terminating') {
        return 'status-warning';
    }

    // Critical statuses (red)
    if (statusLower === 'failed' || statusLower === 'error' ||
        statusLower === 'crashloopbackoff' || statusLower === 'imagepullbackoff' ||
        statusLower === 'unknown' || statusLower === 'invalid_pod_status') {
        return 'status-critical';
    }

    // Default to warning for unknown statuses
    return 'status-warning';
}

// Table Initialization Functions
function initializePodsTable(cluster) {
    const pods = []; // Mock data removed
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
                const statusText = getPodStatusText(value);
                const statusClass = getPodStatusClass(statusText);
                return `<span class="status-badge ${statusClass}">${statusText}</span>`;
            }
        },
        {
            key: 'restarts',
            label: 'RESTARTS',
            render: (value) => {
                // Handle object format: {count: 24, ago: "(12d ago)"}
                if (typeof value === 'object' && value !== null) {
                    const count = value.count || 0;
                    const ago = value.ago || '';
                    return `<span>${count} ${ago}</span>`;
                }
                // Handle simple number format for backward compatibility
                return `<span>${value}</span>`;
            }
        },
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
    const deployments = []; // Mock data removed
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
    const services = []; // Mock data removed
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
    const nodes = []; // Mock data removed
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
    const statefulsets = []; // Mock data removed
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
    const daemonsets = []; // Mock data removed
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
    const namespaces = []; // Mock data removed
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
    const policies = []; // Mock data removed
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
