// Kubernetes Initialization Module (Standalone App)

// Global storage for cluster data
let k8sClustersData = {};

// Fetch Kubernetes cluster data from API
async function fetchK8sClusters() {
    try {
        const response = await makeAuthenticatedRequest('/probler/1/KCache?body=' + encodeURIComponent(JSON.stringify({
            text: 'select * from K8sCluster'
        })), { method: 'GET' });

        if (!response || !response.ok) {
            return null;
        }

        const data = await response.json();
        return data.list || [];
    } catch (error) {
        return null;
    }
}

// Transform object data to array format for tables
function transformObjectToArray(obj) {
    if (!obj) return [];
    return Object.values(obj);
}

// Initialize cluster tables with real data
function initializeClusterTables(clusterName, clusterData) {
    k8sClustersData[clusterName] = clusterData;

    const nodes = transformObjectToArray(clusterData.nodes);
    const pods = transformObjectToArray(clusterData.pods);
    const deployments = transformObjectToArray(clusterData.deployments);
    const statefulsets = transformObjectToArray(clusterData.statefulsets);
    const daemonsets = transformObjectToArray(clusterData.daemonsets);
    const services = transformObjectToArray(clusterData.services);
    const namespaces = transformObjectToArray(clusterData.namespaces);
    const networkpolicies = transformObjectToArray(clusterData.networkpolicies);

    initNodesTable(clusterName, nodes);
    initPodsTable(clusterName, pods);
    initDeploymentsTable(clusterName, deployments);
    initStatefulSetsTable(clusterName, statefulsets);
    initDaemonSetsTable(clusterName, daemonsets);
    initServicesTable(clusterName, services);
    initNamespacesTable(clusterName, namespaces);
    initNetworkPoliciesTable(clusterName, networkpolicies);
}

function initNodesTable(clusterName, nodes) {
    if (!document.getElementById(`nodes-${clusterName}-table`)) return;
    new ProblerTable(`nodes-${clusterName}-table`, {
        columns: [
            { key: 'name', label: 'NAME', filterKey: 'name' },
            { key: 'roles', label: 'ROLES', filterKey: 'roles' },
            { key: 'age', label: 'AGE' },
            { key: 'version', label: 'VERSION', filterKey: 'version' },
            { key: 'internalIp', label: 'INTERNAL-IP', filterKey: 'internalIp' },
            { key: 'externalIp', label: 'EXTERNAL-IP', filterKey: 'externalIp' },
            { key: 'osImage', label: 'OS-IMAGE', filterKey: 'osImage' },
            { key: 'kernelVersion', label: 'KERNEL-VERSION', filterKey: 'kernelVersion' },
            { key: 'containerRuntime', label: 'CONTAINER-RUNTIME', filterKey: 'containerRuntime' }
        ],
        data: nodes,
        rowsPerPage: 15,
        sortable: true,
        filterable: true,
        onRowClick: (node) => showNodeDetailModal(node, clusterName)
    });
}

function initPodsTable(clusterName, pods) {
    if (!document.getElementById(`pods-${clusterName}-table`)) return;
    new ProblerTable(`pods-${clusterName}-table`, {
        columns: [
            { key: 'namespace', label: 'NAMESPACE', filterKey: 'namespace' },
            { key: 'name', label: 'NAME', filterKey: 'name' },
            {
                key: 'ready', label: 'READY',
                formatter: (value, row) => {
                    let count, outof;
                    if (value && typeof value === 'object') {
                        count = value.count || 0;
                        outof = value.outof || 0;
                    } else if (typeof value === 'string') {
                        const parts = value.split('/');
                        count = parseInt(parts[0]) || 0;
                        outof = parseInt(parts[1]) || 0;
                    } else {
                        count = 0; outof = 0;
                    }
                    const statusClass = count === outof ? 'status-operational' : count > 0 ? 'status-warning' : 'status-critical';
                    return `<span class="status-badge ${statusClass}">${count}/${outof}</span>`;
                }
            },
            {
                key: 'status', label: 'STATUS', filterKey: 'status',
                formatter: (value) => {
                    const statusText = getPodStatusText(value);
                    const statusClass = getPodStatusClass(statusText);
                    return `<span class="status-badge ${statusClass}">${statusText}</span>`;
                }
            },
            {
                key: 'restarts', label: 'RESTARTS',
                formatter: (value) => {
                    if (typeof value === 'object' && value !== null) {
                        return `<span>${value.count || 0} ${value.ago || ''}</span>`;
                    }
                    return `<span>${value}</span>`;
                }
            },
            { key: 'age', label: 'AGE' },
            { key: 'ip', label: 'IP', filterKey: 'ip' },
            { key: 'node', label: 'NODE', filterKey: 'node' },
            { key: 'nominatedNode', label: 'NOMINATED NODE', filterKey: 'nominatedNode' },
            { key: 'readinessGates', label: 'READINESS GATES' }
        ],
        data: pods,
        rowsPerPage: 15,
        sortable: true,
        filterable: true,
        onRowClick: (pod) => showPodDetailModal(pod, clusterName)
    });
}

function initDeploymentsTable(clusterName, deployments) {
    if (!document.getElementById(`deployments-${clusterName}-table`)) return;
    new ProblerTable(`deployments-${clusterName}-table`, {
        columns: [
            { key: 'namespace', label: 'NAMESPACE', filterKey: 'namespace' },
            { key: 'name', label: 'NAME', filterKey: 'name' },
            { key: 'ready', label: 'READY' },
            { key: 'upToDate', label: 'UP-TO-DATE' },
            { key: 'available', label: 'AVAILABLE' },
            { key: 'age', label: 'AGE' },
            { key: 'containers', label: 'CONTAINERS', filterKey: 'containers' },
            { key: 'images', label: 'IMAGES', filterKey: 'images' },
            { key: 'selector', label: 'SELECTOR', filterKey: 'selector' }
        ],
        data: deployments,
        rowsPerPage: 15,
        sortable: true,
        filterable: true,
        onRowClick: (deployment) => showDeploymentDetailModal(deployment, clusterName)
    });
}

function initStatefulSetsTable(clusterName, statefulsets) {
    if (!document.getElementById(`statefulsets-${clusterName}-table`)) return;
    new ProblerTable(`statefulsets-${clusterName}-table`, {
        columns: [
            { key: 'namespace', label: 'NAMESPACE', filterKey: 'namespace' },
            { key: 'name', label: 'NAME', filterKey: 'name' },
            { key: 'ready', label: 'READY' },
            { key: 'age', label: 'AGE' },
            { key: 'containers', label: 'CONTAINERS', filterKey: 'containers' },
            { key: 'images', label: 'IMAGES', filterKey: 'images' }
        ],
        data: statefulsets,
        rowsPerPage: 15,
        sortable: true,
        filterable: true,
        onRowClick: (statefulset) => showStatefulSetDetailModal(statefulset, clusterName)
    });
}

function initDaemonSetsTable(clusterName, daemonsets) {
    if (!document.getElementById(`daemonsets-${clusterName}-table`)) return;
    new ProblerTable(`daemonsets-${clusterName}-table`, {
        columns: [
            { key: 'namespace', label: 'NAMESPACE', filterKey: 'namespace' },
            { key: 'name', label: 'NAME', filterKey: 'name' },
            { key: 'desired', label: 'DESIRED' },
            { key: 'current', label: 'CURRENT' },
            { key: 'ready', label: 'READY' },
            { key: 'upToDate', label: 'UP-TO-DATE' },
            { key: 'available', label: 'AVAILABLE' },
            { key: 'nodeSelector', label: 'NODE SELECTOR', filterKey: 'nodeSelector' },
            { key: 'age', label: 'AGE' },
            { key: 'containers', label: 'CONTAINERS', filterKey: 'containers' },
            { key: 'images', label: 'IMAGES', filterKey: 'images' },
            { key: 'selector', label: 'SELECTOR', filterKey: 'selector' }
        ],
        data: daemonsets,
        rowsPerPage: 15,
        sortable: true,
        filterable: true,
        onRowClick: (daemonset) => showDaemonSetDetailModal(daemonset, clusterName)
    });
}

function initServicesTable(clusterName, services) {
    if (!document.getElementById(`services-${clusterName}-table`)) return;
    new ProblerTable(`services-${clusterName}-table`, {
        columns: [
            { key: 'namespace', label: 'NAMESPACE', filterKey: 'namespace' },
            { key: 'name', label: 'NAME', filterKey: 'name' },
            { key: 'type', label: 'TYPE', filterKey: 'type' },
            { key: 'clusterIp', label: 'CLUSTER-IP', filterKey: 'clusterIp' },
            { key: 'externalIp', label: 'EXTERNAL-IP', filterKey: 'externalIp' },
            { key: 'ports', label: 'PORT(S)', filterKey: 'ports' },
            { key: 'age', label: 'AGE' },
            { key: 'selector', label: 'SELECTOR', filterKey: 'selector' }
        ],
        data: services,
        rowsPerPage: 15,
        sortable: true,
        filterable: true,
        onRowClick: (service) => showServiceDetailModal(service, clusterName)
    });
}

function initNamespacesTable(clusterName, namespaces) {
    if (!document.getElementById(`namespaces-${clusterName}-table`)) return;
    new ProblerTable(`namespaces-${clusterName}-table`, {
        columns: [
            { key: 'name', label: 'NAME', filterKey: 'name' },
            { key: 'status', label: 'STATUS', filterKey: 'status' },
            { key: 'age', label: 'AGE' }
        ],
        data: namespaces,
        rowsPerPage: 15,
        sortable: true,
        filterable: true,
        onRowClick: (namespace) => showNamespaceDetailModal(namespace, clusterName)
    });
}

function initNetworkPoliciesTable(clusterName, networkpolicies) {
    if (!document.getElementById(`networkpolicies-${clusterName}-table`)) return;
    new ProblerTable(`networkpolicies-${clusterName}-table`, {
        columns: [
            { key: 'namespace', label: 'NAMESPACE', filterKey: 'namespace' },
            { key: 'name', label: 'NAME', filterKey: 'name' },
            { key: 'podSelector', label: 'POD-SELECTOR', filterKey: 'podSelector' },
            { key: 'age', label: 'AGE' }
        ],
        data: networkpolicies,
        rowsPerPage: 15,
        sortable: true,
        filterable: true,
        onRowClick: (policy) => showNetworkPolicyDetailModal(policy, clusterName)
    });
}

// Main Initialization Function
async function initializeKubernetes() {
    const clusters = await fetchK8sClusters();

    if (!clusters || clusters.length === 0) {
        initializeClusterTables('production', {});
        setupClusterTabSwitching();
        return;
    }

    const clusterTabsContainer = document.querySelector('.k8s-cluster-tabs');
    const mainContent = document.querySelector('.k8s-main-content');

    if (!clusterTabsContainer || !mainContent) return;

    clusterTabsContainer.innerHTML = '';
    mainContent.innerHTML = '';

    clusters.forEach((cluster, index) => {
        const clusterName = cluster.name;
        const isActive = index === 0;

        const tab = document.createElement('button');
        tab.className = `cluster-tab ${isActive ? 'active' : ''}`;
        tab.setAttribute('data-cluster', clusterName);
        tab.innerHTML = `
            <span class="cluster-status status-operational"></span>
            <span class="cluster-name">${clusterName}</span>
        `;
        clusterTabsContainer.appendChild(tab);

        const clusterContent = createClusterContentHTML(clusterName, cluster, isActive);
        mainContent.appendChild(clusterContent);

        if (isActive) {
            initializeClusterTables(clusterName, cluster);
        }
    });

    setupClusterTabSwitching();
}

// Create cluster content HTML
function createClusterContentHTML(clusterName, clusterData, isActive) {
    const div = document.createElement('div');
    div.className = `cluster-content ${isActive ? 'active' : ''}`;
    div.setAttribute('data-cluster-content', clusterName);

    const nodeCount = clusterData.nodes ? Object.keys(clusterData.nodes).length : 0;
    const podCount = clusterData.pods ? Object.keys(clusterData.pods).length : 0;
    const deploymentCount = clusterData.deployments ? Object.keys(clusterData.deployments).length : 0;
    const statefulsetCount = clusterData.statefulsets ? Object.keys(clusterData.statefulsets).length : 0;
    const daemonsetCount = clusterData.daemonsets ? Object.keys(clusterData.daemonsets).length : 0;
    const serviceCount = clusterData.services ? Object.keys(clusterData.services).length : 0;
    const namespaceCount = clusterData.namespaces ? Object.keys(clusterData.namespaces).length : 0;
    const networkpolicyCount = clusterData.networkpolicies ? Object.keys(clusterData.networkpolicies).length : 0;

    div.innerHTML = `
        <div class="cluster-header">
            <h3>${clusterName} Cluster</h3>
            <div class="cluster-stats">
                <span class="stat-item"><strong>Nodes:</strong> ${nodeCount}</span>
                <span class="stat-item"><strong>Pods:</strong> ${podCount}</span>
                <span class="stat-item"><strong>Deployments:</strong> ${deploymentCount}</span>
                <span class="stat-item"><strong>StatefulSets:</strong> ${statefulsetCount}</span>
                <span class="stat-item"><strong>DaemonSets:</strong> ${daemonsetCount}</span>
                <span class="stat-item"><strong>Services:</strong> ${serviceCount}</span>
                <span class="stat-item"><strong>Namespaces:</strong> ${namespaceCount}</span>
                <span class="stat-item"><strong>Network Policies:</strong> ${networkpolicyCount}</span>
            </div>
        </div>
        <div class="resource-tabs">
            <button class="resource-tab active" data-resource="nodes" data-cluster="${clusterName}">Nodes</button>
            <button class="resource-tab" data-resource="pods" data-cluster="${clusterName}">Pods</button>
            <button class="resource-tab" data-resource="deployments" data-cluster="${clusterName}">Deployments</button>
            <button class="resource-tab" data-resource="statefulsets" data-cluster="${clusterName}">StatefulSets</button>
            <button class="resource-tab" data-resource="daemonsets" data-cluster="${clusterName}">DaemonSets</button>
            <button class="resource-tab" data-resource="services" data-cluster="${clusterName}">Services</button>
            <button class="resource-tab" data-resource="namespaces" data-cluster="${clusterName}">Namespaces</button>
            <button class="resource-tab" data-resource="networkpolicies" data-cluster="${clusterName}">Network Policies</button>
        </div>
        <div class="resource-content active" data-resource-content="nodes-${clusterName}"><div id="nodes-${clusterName}-table"></div></div>
        <div class="resource-content" data-resource-content="pods-${clusterName}"><div id="pods-${clusterName}-table"></div></div>
        <div class="resource-content" data-resource-content="deployments-${clusterName}"><div id="deployments-${clusterName}-table"></div></div>
        <div class="resource-content" data-resource-content="statefulsets-${clusterName}"><div id="statefulsets-${clusterName}-table"></div></div>
        <div class="resource-content" data-resource-content="daemonsets-${clusterName}"><div id="daemonsets-${clusterName}-table"></div></div>
        <div class="resource-content" data-resource-content="services-${clusterName}"><div id="services-${clusterName}-table"></div></div>
        <div class="resource-content" data-resource-content="namespaces-${clusterName}"><div id="namespaces-${clusterName}-table"></div></div>
        <div class="resource-content" data-resource-content="networkpolicies-${clusterName}"><div id="networkpolicies-${clusterName}-table"></div></div>
    `;
    return div;
}

// Set up cluster tab switching
function setupClusterTabSwitching() {
    const clusterTabs = document.querySelectorAll('.cluster-tab');
    clusterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const cluster = tab.getAttribute('data-cluster');

            clusterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const clusterContents = document.querySelectorAll('.cluster-content');
            clusterContents.forEach(content => {
                content.classList.remove('active');
                if (content.getAttribute('data-cluster-content') === cluster) {
                    content.classList.add('active');
                }
            });

            const nodesTableContainer = document.getElementById(`nodes-${cluster}-table`);
            if (nodesTableContainer && !nodesTableContainer.querySelector('.noc-table-container')) {
                initializeClusterTables(cluster, k8sClustersData[cluster] || {});
            }
        });
    });

    const resourceTabs = document.querySelectorAll('.resource-tab');
    resourceTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const resource = tab.getAttribute('data-resource');
            const cluster = tab.getAttribute('data-cluster');

            const clusterResourceTabs = document.querySelectorAll(`.resource-tab[data-cluster="${cluster}"]`);
            clusterResourceTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const clusterContent = document.querySelector(`.cluster-content[data-cluster-content="${cluster}"]`);
            const resourceContents = clusterContent.querySelectorAll('.resource-content');
            resourceContents.forEach(content => {
                content.classList.remove('active');
                if (content.getAttribute('data-resource-content') === `${resource}-${cluster}`) {
                    content.classList.add('active');
                }
            });
        });
    });
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', initializeKubernetes);
