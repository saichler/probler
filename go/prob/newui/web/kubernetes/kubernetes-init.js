// Kubernetes Initialization Module (Standalone App)
// Enums: ProblerK8s.enums (probler/k8s/k8s-enums.js)
// Columns: ProblerK8s.columns (probler/k8s/k8s-columns.js)

// Global storage for cluster data
let k8sClustersData = {};

// Resource definitions used by nav bar, content generation, and table init
const K8S_RESOURCES = [
    { key: 'nodes', label: 'Nodes', model: 'Node', showFn: 'showNodeDetailModal' },
    { key: 'pods', label: 'Pods', model: 'Pod', showFn: 'showPodDetailModal' },
    { key: 'deployments', label: 'Deployments', model: 'Deployment', showFn: 'showDeploymentDetailModal' },
    { key: 'statefulsets', label: 'StatefulSets', model: 'StatefulSet', showFn: 'showStatefulSetDetailModal' },
    { key: 'daemonsets', label: 'DaemonSets', model: 'DaemonSet', showFn: 'showDaemonSetDetailModal' },
    { key: 'services', label: 'Services', model: 'Service', showFn: 'showServiceDetailModal' },
    { key: 'namespaces', label: 'Namespaces', model: 'Namespace', showFn: 'showNamespaceDetailModal' },
    { key: 'networkpolicies', label: 'NetPolicies', model: 'NetworkPolicy', showFn: 'showNetworkPolicyDetailModal' }
];

// Fetch Kubernetes cluster data from API
async function fetchK8sClusters() {
    try {
        const response = await makeAuthenticatedRequest(Layer8DConfig.resolveEndpoint('/1/KCache') + '?body=' + encodeURIComponent(JSON.stringify({
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

// Get resource count for a cluster
function getResourceCount(clusterData, resourceKey) {
    return clusterData[resourceKey] ? Object.keys(clusterData[resourceKey]).length : 0;
}

// Create a single resource table for a cluster
function initResourceTable(clusterName, resource, data) {
    var containerId = resource.key + '-' + clusterName + '-table';
    if (!document.getElementById(containerId)) return;
    var showFn = window[resource.showFn];
    var table = new Layer8DTable({
        containerId: containerId,
        columns: ProblerK8s.columns[resource.model],
        data: data,
        pageSize: 10,
        sortable: true,
        filterable: true,
        onRowClick: function(item) { showFn(item, clusterName); }
    });
    table.init();
}

// Initialize all resource tables for a cluster
function initializeClusterTables(clusterName, clusterData) {
    k8sClustersData[clusterName] = clusterData;
    K8S_RESOURCES.forEach(function(resource) {
        initResourceTable(clusterName, resource, transformObjectToArray(clusterData[resource.key]));
    });
}

// Main Initialization Function
async function initializeKubernetes() {
    const clusters = await fetchK8sClusters();

    if (!clusters || clusters.length === 0) {
        populateNavBar([], {});
        return;
    }

    const firstCluster = clusters[0];
    populateNavBar(clusters, firstCluster);

    const mainContent = document.querySelector('.k8s-main-content');
    if (!mainContent) return;
    mainContent.innerHTML = '';

    clusters.forEach((cluster, index) => {
        const clusterName = cluster.name;
        const isActive = index === 0;
        const clusterContent = createClusterContentHTML(clusterName, isActive);
        mainContent.appendChild(clusterContent);

        if (isActive) {
            initializeClusterTables(clusterName, cluster);
        } else {
            k8sClustersData[clusterName] = cluster;
        }
    });

    setupNavigation();
}

// Populate the single nav bar: cluster dropdown + resource tabs with counts
function populateNavBar(clusters, activeClusterData) {
    const dropdown = document.getElementById('k8s-cluster-dropdown');
    const tabsContainer = document.getElementById('k8s-resource-tabs');
    if (!dropdown || !tabsContainer) return;

    // Populate cluster dropdown
    dropdown.innerHTML = clusters.map(c =>
        `<option value="${c.name}">${c.name}</option>`
    ).join('');

    // Populate resource tabs with counts from the active cluster
    tabsContainer.innerHTML = K8S_RESOURCES.map((r, i) => {
        const count = getResourceCount(activeClusterData, r.key);
        return `<button class="k8s-resource-tab ${i === 0 ? 'active' : ''}" data-resource="${r.key}">
            ${r.label} <span class="k8s-tab-count">${count}</span>
        </button>`;
    }).join('');
}

// Update resource tab badge counts for the given cluster data
function updateResourceTabCounts(clusterData) {
    const tabs = document.querySelectorAll('.k8s-resource-tab');
    tabs.forEach(tab => {
        const resource = tab.dataset.resource;
        const count = getResourceCount(clusterData, resource);
        const badge = tab.querySelector('.k8s-tab-count');
        if (badge) badge.textContent = count;
    });
}

// Create cluster content HTML (resource-content divs only, no header/tabs)
function createClusterContentHTML(clusterName, isActive) {
    const div = document.createElement('div');
    div.className = `cluster-content ${isActive ? 'active' : ''}`;
    div.setAttribute('data-cluster-content', clusterName);

    div.innerHTML = K8S_RESOURCES.map((r, i) =>
        `<div class="resource-content ${i === 0 ? 'active' : ''}" data-resource-content="${r.key}-${clusterName}">
            <div id="${r.key}-${clusterName}-table"></div>
        </div>`
    ).join('');

    return div;
}

// Switch which resource-content div is active for a given cluster
function switchResource(resource, cluster) {
    const clusterContent = document.querySelector(`.cluster-content[data-cluster-content="${cluster}"]`);
    if (!clusterContent) return;

    clusterContent.querySelectorAll('.resource-content').forEach(c => c.classList.remove('active'));
    const target = clusterContent.querySelector(`[data-resource-content="${resource}-${cluster}"]`);
    if (target) target.classList.add('active');
}

// Set up cluster dropdown + resource tab event handlers
function setupNavigation() {
    const dropdown = document.getElementById('k8s-cluster-dropdown');
    if (!dropdown) return;

    // Cluster switching via dropdown
    dropdown.addEventListener('change', () => {
        const cluster = dropdown.value;
        const clusterData = k8sClustersData[cluster] || {};

        // Switch active cluster content
        document.querySelectorAll('.cluster-content').forEach(c => c.classList.remove('active'));
        const content = document.querySelector(`.cluster-content[data-cluster-content="${cluster}"]`);
        if (content) content.classList.add('active');

        // Lazy-initialize tables for this cluster
        const firstTable = document.getElementById(`nodes-${cluster}-table`);
        if (firstTable && !firstTable.querySelector('.l8-table-wrapper')) {
            initializeClusterTables(cluster, clusterData);
        }

        // Update badge counts
        updateResourceTabCounts(clusterData);

        // Re-apply the active resource tab for the new cluster
        const activeTab = document.querySelector('.k8s-resource-tab.active');
        if (activeTab) {
            switchResource(activeTab.dataset.resource, cluster);
        }
    });

    // Resource tab switching via click (delegated)
    const tabsContainer = document.getElementById('k8s-resource-tabs');
    if (tabsContainer) {
        tabsContainer.addEventListener('click', (e) => {
            const tab = e.target.closest('.k8s-resource-tab');
            if (!tab) return;

            document.querySelectorAll('.k8s-resource-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            switchResource(tab.dataset.resource, dropdown.value);
        });
    }
}

// Initialization is called by sections.js when the kubernetes section is loaded
