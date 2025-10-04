// Kubernetes Initialization Module

// Global storage for cluster data
let k8sClustersData = {};

// Fetch Kubernetes cluster data from API
async function fetchK8sClusters() {
    try {
        const response = await makeAuthenticatedRequest('/probler/1/K8sClr?body=' + encodeURIComponent(JSON.stringify({
            text: 'select * from K8sCluster'
        })), {
            method: 'GET'
        });

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
    // Store cluster data globally
    k8sClustersData[clusterName] = clusterData;

    // Transform data to arrays
    const nodes = transformObjectToArray(clusterData.nodes);
    const pods = transformObjectToArray(clusterData.pods);
    const deployments = transformObjectToArray(clusterData.deployments);
    const statefulsets = transformObjectToArray(clusterData.statefulsets);
    const daemonsets = transformObjectToArray(clusterData.daemonsets);
    const services = transformObjectToArray(clusterData.services);
    const namespaces = transformObjectToArray(clusterData.namespaces);
    const networkpolicies = transformObjectToArray(clusterData.networkpolicies);

    // Initialize nodes table
    if (document.getElementById(`nodes-${clusterName}-table`)) {
        new ProblerTable(`nodes-${clusterName}-table`, {
            columns: [
                { key: 'name', label: 'NAME' },
                { key: 'roles', label: 'ROLES' },
                { key: 'age', label: 'AGE' },
                { key: 'version', label: 'VERSION' },
                { key: 'internalIp', label: 'INTERNAL-IP' },
                { key: 'externalIp', label: 'EXTERNAL-IP' },
                { key: 'osImage', label: 'OS-IMAGE' },
                { key: 'kernelVersion', label: 'KERNEL-VERSION' },
                { key: 'containerRuntime', label: 'CONTAINER-RUNTIME' }
            ],
            data: nodes,
            rowsPerPage: 15,
            onRowClick: (node) => showNodeDetailModal(node, clusterName)
        });
    }

    // Initialize pods table
    if (document.getElementById(`pods-${clusterName}-table`)) {
        new ProblerTable(`pods-${clusterName}-table`, {
            columns: [
                { key: 'namespace', label: 'NAMESPACE' },
                { key: 'name', label: 'NAME' },
                { key: 'age', label: 'AGE' },
                { key: 'ip', label: 'IP' },
                { key: 'node', label: 'NODE' },
                { key: 'nominatedNode', label: 'NOMINATED NODE' }
            ],
            data: pods,
            rowsPerPage: 15,
            onRowClick: (pod) => showPodDetailModal(pod, clusterName)
        });
    }

    // Initialize deployments table
    if (document.getElementById(`deployments-${clusterName}-table`)) {
        new ProblerTable(`deployments-${clusterName}-table`, {
            columns: [
                { key: 'namespace', label: 'NAMESPACE' },
                { key: 'name', label: 'NAME' },
                { key: 'ready', label: 'READY' },
                { key: 'upToDate', label: 'UP-TO-DATE' },
                { key: 'available', label: 'AVAILABLE' },
                { key: 'age', label: 'AGE' },
                { key: 'containers', label: 'CONTAINERS' },
                { key: 'images', label: 'IMAGES' },
                { key: 'selector', label: 'SELECTOR' }
            ],
            data: deployments,
            rowsPerPage: 15,
            onRowClick: (deployment) => showDeploymentDetailModal(deployment, clusterName)
        });
    }

    // Initialize statefulsets table
    if (document.getElementById(`statefulsets-${clusterName}-table`)) {
        new ProblerTable(`statefulsets-${clusterName}-table`, {
            columns: [
                { key: 'namespace', label: 'NAMESPACE' },
                { key: 'name', label: 'NAME' },
                { key: 'ready', label: 'READY' },
                { key: 'age', label: 'AGE' },
                { key: 'containers', label: 'CONTAINERS' },
                { key: 'images', label: 'IMAGES' }
            ],
            data: statefulsets,
            rowsPerPage: 15,
            onRowClick: (statefulset) => showStatefulSetDetailModal(statefulset, clusterName)
        });
    }

    // Initialize daemonsets table
    if (document.getElementById(`daemonsets-${clusterName}-table`)) {
        new ProblerTable(`daemonsets-${clusterName}-table`, {
            columns: [
                { key: 'namespace', label: 'NAMESPACE' },
                { key: 'name', label: 'NAME' },
                { key: 'desired', label: 'DESIRED' },
                { key: 'current', label: 'CURRENT' },
                { key: 'ready', label: 'READY' },
                { key: 'upToDate', label: 'UP-TO-DATE' },
                { key: 'available', label: 'AVAILABLE' },
                { key: 'nodeSelector', label: 'NODE SELECTOR' },
                { key: 'age', label: 'AGE' },
                { key: 'containers', label: 'CONTAINERS' },
                { key: 'images', label: 'IMAGES' },
                { key: 'selector', label: 'SELECTOR' }
            ],
            data: daemonsets,
            rowsPerPage: 15,
            onRowClick: (daemonset) => showDaemonSetDetailModal(daemonset, clusterName)
        });
    }

    // Initialize services table
    if (document.getElementById(`services-${clusterName}-table`)) {
        new ProblerTable(`services-${clusterName}-table`, {
            columns: [
                { key: 'namespace', label: 'NAMESPACE' },
                { key: 'name', label: 'NAME' },
                { key: 'type', label: 'TYPE' },
                { key: 'clusterIp', label: 'CLUSTER-IP' },
                { key: 'externalIp', label: 'EXTERNAL-IP' },
                { key: 'ports', label: 'PORT(S)' },
                { key: 'age', label: 'AGE' },
                { key: 'selector', label: 'SELECTOR' }
            ],
            data: services,
            rowsPerPage: 15,
            onRowClick: (service) => showServiceDetailModal(service, clusterName)
        });
    }

    // Initialize namespaces table
    if (document.getElementById(`namespaces-${clusterName}-table`)) {
        new ProblerTable(`namespaces-${clusterName}-table`, {
            columns: [
                { key: 'name', label: 'NAME' },
                { key: 'status', label: 'STATUS' },
                { key: 'age', label: 'AGE' }
            ],
            data: namespaces,
            rowsPerPage: 15,
            onRowClick: (namespace) => showNamespaceDetailModal(namespace, clusterName)
        });
    }

    // Initialize networkpolicies table
    if (document.getElementById(`networkpolicies-${clusterName}-table`)) {
        new ProblerTable(`networkpolicies-${clusterName}-table`, {
            columns: [
                { key: 'namespace', label: 'NAMESPACE' },
                { key: 'name', label: 'NAME' },
                { key: 'podSelector', label: 'POD-SELECTOR' },
                { key: 'age', label: 'AGE' }
            ],
            data: networkpolicies,
            rowsPerPage: 15,
            onRowClick: (policy) => showNetworkPolicyDetailModal(policy, clusterName)
        });
    }
}

// Main Initialization Function
async function initializeKubernetes() {
    // Fetch cluster data from API
    const clusters = await fetchK8sClusters();

    if (!clusters || clusters.length === 0) {
        // Fallback to existing mock data if API fails
        initializeClusterTables('production', {});
        setupClusterTabSwitching();
        return;
    }

    // Get references to sidebar and main content areas
    const sidebar = document.querySelector('.k8s-cluster-sidebar');
    const mainContent = document.querySelector('.k8s-main-content');

    if (!sidebar || !mainContent) return;

    // Clear existing cluster tabs and content (keep the title)
    const sidebarTitle = sidebar.querySelector('.sidebar-title');
    sidebar.innerHTML = '';
    if (sidebarTitle) {
        sidebar.appendChild(sidebarTitle);
    } else {
        sidebar.innerHTML = '<div class="sidebar-title">Clusters</div>';
    }
    mainContent.innerHTML = '';

    // Create cluster tabs and content dynamically
    clusters.forEach((cluster, index) => {
        const clusterName = cluster.name;
        const isActive = index === 0;

        // Create cluster tab button
        const tab = document.createElement('button');
        tab.className = `cluster-tab ${isActive ? 'active' : ''}`;
        tab.setAttribute('data-cluster', clusterName);
        tab.innerHTML = `
            <span class="cluster-status status-operational"></span>
            <div class="cluster-info">
                <div class="cluster-name">${clusterName}</div>
                <div class="cluster-version">K8s Cluster</div>
            </div>
        `;
        sidebar.appendChild(tab);

        // Create cluster content
        const clusterContent = createClusterContentHTML(clusterName, cluster, isActive);
        mainContent.appendChild(clusterContent);

        // Initialize tables for this cluster
        if (isActive) {
            initializeClusterTables(clusterName, cluster);
        }
    });

    // Set up tab switching
    setupClusterTabSwitching();
}

// Create cluster content HTML
function createClusterContentHTML(clusterName, clusterData, isActive) {
    const div = document.createElement('div');
    div.className = `cluster-content ${isActive ? 'active' : ''}`;
    div.setAttribute('data-cluster-content', clusterName);

    const nodeCount = clusterData.nodes ? Object.keys(clusterData.nodes).length : 0;
    const podCount = clusterData.pods ? Object.keys(clusterData.pods).length : 0;

    div.innerHTML = `
        <div class="cluster-header">
            <h3>${clusterName} Cluster</h3>
            <div class="cluster-stats">
                <span class="stat-item"><strong>Nodes:</strong> ${nodeCount}</span>
                <span class="stat-item"><strong>Pods:</strong> ${podCount}</span>
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

        <div class="resource-content active" data-resource-content="nodes-${clusterName}">
            <div id="nodes-${clusterName}-table"></div>
        </div>
        <div class="resource-content" data-resource-content="pods-${clusterName}">
            <div id="pods-${clusterName}-table"></div>
        </div>
        <div class="resource-content" data-resource-content="deployments-${clusterName}">
            <div id="deployments-${clusterName}-table"></div>
        </div>
        <div class="resource-content" data-resource-content="statefulsets-${clusterName}">
            <div id="statefulsets-${clusterName}-table"></div>
        </div>
        <div class="resource-content" data-resource-content="daemonsets-${clusterName}">
            <div id="daemonsets-${clusterName}-table"></div>
        </div>
        <div class="resource-content" data-resource-content="services-${clusterName}">
            <div id="services-${clusterName}-table"></div>
        </div>
        <div class="resource-content" data-resource-content="namespaces-${clusterName}">
            <div id="namespaces-${clusterName}-table"></div>
        </div>
        <div class="resource-content" data-resource-content="networkpolicies-${clusterName}">
            <div id="networkpolicies-${clusterName}-table"></div>
        </div>
    `;

    return div;
}

// Set up cluster tab switching
function setupClusterTabSwitching() {
    const clusterTabs = document.querySelectorAll('.cluster-tab');
    clusterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const cluster = tab.getAttribute('data-cluster');

            // Update active cluster tab
            clusterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update active cluster content
            const clusterContents = document.querySelectorAll('.cluster-content');
            clusterContents.forEach(content => {
                content.classList.remove('active');
                if (content.getAttribute('data-cluster-content') === cluster) {
                    content.classList.add('active');
                }
            });

            // Initialize tables for the selected cluster if not already initialized
            const nodesTableContainer = document.getElementById(`nodes-${cluster}-table`);
            if (nodesTableContainer && !nodesTableContainer.querySelector('.noc-table-container')) {
                initializeClusterTables(cluster, k8sClustersData[cluster] || {});
            }
        });
    });

    // Set up resource tab switching within each cluster
    const resourceTabs = document.querySelectorAll('.resource-tab');
    resourceTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const resource = tab.getAttribute('data-resource');
            const cluster = tab.getAttribute('data-cluster');

            // Update active resource tab within this cluster
            const clusterResourceTabs = document.querySelectorAll(`.resource-tab[data-cluster="${cluster}"]`);
            clusterResourceTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update active resource content within this cluster
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
