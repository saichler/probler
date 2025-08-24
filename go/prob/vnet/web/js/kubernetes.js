// Kubernetes Application Management
let kubernetesData = {
    clusters: []
};

let k8sAutoRefreshInterval = null;
let k8sAutoRefreshEnabled = false;

// Mock data for fallback when API fails
const mockKubernetesData = {
    clusters: [
        {
            name: "production-cluster",
            nodes: {
                "node1": {
                    name: "k8s-master-01",
                    status: 1,
                    roles: "control-plane",
                    age: "45d",
                    version: "v1.28.3",
                    internal_ip: "10.0.1.100",
                    external_ip: "203.0.113.100",
                    os_image: "Ubuntu 22.04.3 LTS",
                    kernel_version: "5.15.0-84-generic",
                    container_runtime: "containerd://1.7.2"
                },
                "node2": {
                    name: "k8s-worker-01",
                    status: 1,
                    roles: "worker",
                    age: "42d",
                    version: "v1.28.3",
                    internal_ip: "10.0.1.101",
                    external_ip: "<none>",
                    os_image: "Ubuntu 22.04.3 LTS",
                    kernel_version: "5.15.0-84-generic",
                    container_runtime: "containerd://1.7.2"
                },
                "node3": {
                    name: "k8s-worker-02",
                    status: 1,
                    roles: "worker",
                    age: "38d",
                    version: "v1.28.3",
                    internal_ip: "10.0.1.102",
                    external_ip: "<none>",
                    os_image: "Ubuntu 22.04.3 LTS",
                    kernel_version: "5.15.0-84-generic",
                    container_runtime: "containerd://1.7.2"
                }
            },
            pods: {
                "pod1": {
                    namespace: "default",
                    name: "nginx-deployment-7d6b4c9f8d-xk9m2",
                    ready: { count: 1, outof: 1 },
                    status: 1,
                    restarts: { count: 0, ago: "" },
                    age: "5d",
                    ip: "10.244.1.15",
                    node: "k8s-worker-01",
                    nominated_node: "<none>",
                    readiness_gates: "<none>"
                },
                "pod2": {
                    namespace: "kube-system",
                    name: "coredns-5d78c9869d-7x4p9",
                    ready: { count: 1, outof: 1 },
                    status: 1,
                    restarts: { count: 2, ago: "3d" },
                    age: "42d",
                    ip: "10.244.0.5",
                    node: "k8s-master-01",
                    nominated_node: "<none>",
                    readiness_gates: "<none>"
                },
                "pod3": {
                    namespace: "kube-system",
                    name: "etcd-k8s-master-01",
                    ready: { count: 1, outof: 1 },
                    status: 1,
                    restarts: { count: 1, ago: "12d" },
                    age: "45d",
                    ip: "10.0.1.100",
                    node: "k8s-master-01",
                    nominated_node: "<none>",
                    readiness_gates: "<none>"
                },
                "pod4": {
                    namespace: "monitoring",
                    name: "prometheus-server-6b8c7d9f4b-9h2k7",
                    ready: { count: 1, outof: 1 },
                    status: 1,
                    restarts: { count: 0, ago: "" },
                    age: "15d",
                    ip: "10.244.2.8",
                    node: "k8s-worker-02",
                    nominated_node: "<none>",
                    readiness_gates: "<none>"
                },
                "pod5": {
                    namespace: "ingress-nginx",
                    name: "ingress-nginx-controller-5d88495688-kx9p4",
                    ready: { count: 1, outof: 1 },
                    status: 1,
                    restarts: { count: 0, ago: "" },
                    age: "23d",
                    ip: "10.244.1.22",
                    node: "k8s-worker-01",
                    nominated_node: "<none>",
                    readiness_gates: "<none>"
                }
            }
        },
        {
            name: "staging-cluster",
            nodes: {
                "staging-node1": {
                    name: "k8s-staging-master",
                    status: 1,
                    roles: "control-plane",
                    age: "28d",
                    version: "v1.28.2",
                    internal_ip: "10.0.2.100",
                    external_ip: "203.0.113.200",
                    os_image: "Ubuntu 22.04.2 LTS",
                    kernel_version: "5.15.0-82-generic",
                    container_runtime: "containerd://1.7.1"
                },
                "staging-node2": {
                    name: "k8s-staging-worker",
                    status: 1,
                    roles: "worker",
                    age: "25d",
                    version: "v1.28.2",
                    internal_ip: "10.0.2.101",
                    external_ip: "<none>",
                    os_image: "Ubuntu 22.04.2 LTS",
                    kernel_version: "5.15.0-82-generic",
                    container_runtime: "containerd://1.7.1"
                }
            },
            pods: {
                "staging-pod1": {
                    namespace: "default",
                    name: "test-app-deployment-8d7c5b9f2e-x1m9",
                    ready: { count: 1, outof: 1 },
                    status: 1,
                    restarts: { count: 3, ago: "2h" },
                    age: "8d",
                    ip: "10.244.3.12",
                    node: "k8s-staging-worker",
                    nominated_node: "<none>",
                    readiness_gates: "<none>"
                },
                "staging-pod2": {
                    namespace: "kube-system",
                    name: "coredns-5d78c9869d-m4n8p",
                    ready: { count: 1, outof: 1 },
                    status: 1,
                    restarts: { count: 1, ago: "5d" },
                    age: "25d",
                    ip: "10.244.0.8",
                    node: "k8s-staging-master",
                    nominated_node: "<none>",
                    readiness_gates: "<none>"
                },
                "staging-pod3": {
                    namespace: "development",
                    name: "redis-deployment-6c8d7f9a5b-z2x4",
                    ready: { count: 1, outof: 1 },
                    status: 1,
                    restarts: { count: 0, ago: "" },
                    age: "12d",
                    ip: "10.244.3.18",
                    node: "k8s-staging-worker",
                    nominated_node: "<none>",
                    readiness_gates: "<none>"
                }
            }
        },
        {
            name: "development-cluster",
            nodes: {
                "dev-node1": {
                    name: "k8s-dev-all-in-one",
                    status: 1,
                    roles: "control-plane,worker",
                    age: "18d",
                    version: "v1.28.4",
                    internal_ip: "10.0.3.100",
                    external_ip: "203.0.113.300",
                    os_image: "Ubuntu 22.04.3 LTS",
                    kernel_version: "5.15.0-86-generic",
                    container_runtime: "containerd://1.7.3"
                }
            },
            pods: {
                "dev-pod1": {
                    namespace: "default",
                    name: "hello-world-deployment-9f8e7d6c5b-a1b2",
                    ready: { count: 1, outof: 1 },
                    status: 1,
                    restarts: { count: 1, ago: "1d" },
                    age: "3d",
                    ip: "10.244.4.5",
                    node: "k8s-dev-all-in-one",
                    nominated_node: "<none>",
                    readiness_gates: "<none>"
                },
                "dev-pod2": {
                    namespace: "kube-system",
                    name: "coredns-5d78c9869d-p7q8r",
                    ready: { count: 1, outof: 1 },
                    status: 1,
                    restarts: { count: 0, ago: "" },
                    age: "18d",
                    ip: "10.244.0.3",
                    node: "k8s-dev-all-in-one",
                    nominated_node: "<none>",
                    readiness_gates: "<none>"
                }
            }
        }
    ]
};

// Sorting state
let currentSortState = {
    // clusterName: { table: 'nodes'|'pods', column: number, direction: 'asc'|'desc' }
};

// System pods visibility state per cluster
let systemPodsVisibility = {
    // clusterName: true|false
};

// Initialize Kubernetes app
function initKubernetesApp() {
    console.log('Initializing Kubernetes app...');
    refreshKubernetes();
}

// Fetch Kubernetes data from API
async function fetchK8sData() {
    const bodyData = {
        "text": "select * from k8scluster where Name=*",
        "rootType": "k8scluster",
        "properties": ["*"],
        "criteria": {
            "condition": {
                "comparator": {
                    "left": "name",
                    "oper": "=",
                    "right": "*"
                }
            }
        },
        "matchCase": true
    };

    // Create URL with single "body" query parameter
    const url = `/probler/1/K8sClr?body=${encodeURIComponent(JSON.stringify(bodyData))}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseText = await response.text();
        
        // Try to parse as JSON
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Failed to parse response as JSON:', parseError);
            console.error('Raw response:', responseText);
            throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`);
        }
        
        console.log('K8s API Response:', data);

        // Process the response and extract nodes and pods from all clusters
        return processK8sApiResponse(data);
    } catch (error) {
        console.error('Error fetching Kubernetes data:', error);
        throw error;
    }
}

// Process the API response and extract all clusters
function processK8sApiResponse(apiResponse) {
    const processedData = {
        clusters: []
    };

    // The API response contains a list with K8sCluster objects
    // Process all clusters in the list
    if (apiResponse && apiResponse.list && Array.isArray(apiResponse.list)) {
        apiResponse.list.forEach((cluster, index) => {
            console.log(`Processing cluster: ${cluster.name}`);
            
            const processedCluster = {
                name: cluster.name,
                nodes: {},
                pods: {}
            };
            
            // Process nodes - convert API format to display format
            if (cluster.nodes) {
                Object.keys(cluster.nodes).forEach(nodeKey => {
                    const node = cluster.nodes[nodeKey];
                    processedCluster.nodes[nodeKey] = {
                        name: node.name,
                        status: 1, // Assume Ready status since API doesn't provide status
                        roles: node.roles || '<none>',
                        age: node.age,
                        version: node.version,
                        internal_ip: node.internalIp,
                        external_ip: node.externalIp,
                        os_image: node.osImage,
                        kernel_version: node.kernelVersion,
                        container_runtime: node.containerRuntime
                    };
                });
            }
            
            // Process pods - convert API format to display format
            if (cluster.pods) {
                Object.keys(cluster.pods).forEach(podKey => {
                    const pod = cluster.pods[podKey];
                    // Handle empty ready and restarts objects from API
                    const ready = (pod.ready && Object.keys(pod.ready).length > 0) 
                        ? pod.ready 
                        : { count: 1, outof: 1 };
                    
                    const restarts = (pod.restarts && Object.keys(pod.restarts).length > 0) 
                        ? pod.restarts 
                        : { count: 0, ago: "" };
                    
                    processedCluster.pods[podKey] = {
                        namespace: pod.namespace,
                        name: pod.name,
                        ready: ready,
                        status: 1, // Assume Running status since API doesn't provide status
                        restarts: restarts,
                        age: pod.age,
                        ip: pod.ip,
                        node: pod.node,
                        nominated_node: pod.nominatedNode,
                        readiness_gates: pod.readinessGates || '<none>'
                    };
                });
            }
            
            processedData.clusters.push(processedCluster);
        });
    }

    return processedData;
}

// Main refresh function for all Kubernetes data
function refreshKubernetes() {
    const clustersLoading = document.getElementById('k8sClustersLoading');
    const clustersError = document.getElementById('k8sClustersError');
    const clusterTabs = document.getElementById('clusterTabContent');
    
    // Show loading
    if (clustersLoading) clustersLoading.style.display = 'flex';
    if (clustersError) clustersError.style.display = 'none';
    if (clusterTabs) clusterTabs.style.display = 'none';
    
    // Fetch data from API and create cluster tabs
    fetchK8sData()
        .then(data => {
            kubernetesData = data;
            
            // Create tabs for all clusters
            createClusterTabs(data.clusters);
            updateK8sStats();
            updateK8sLastUpdate();
            
            // Hide loading and show content
            if (clustersLoading) clustersLoading.style.display = 'none';
            if (clusterTabs) clusterTabs.style.display = 'block';
        })
        .catch(error => {
            console.error('Failed to load Kubernetes data, falling back to mock data:', error);
            
            // Use mock data as fallback
            kubernetesData = mockKubernetesData;
            
            // Create tabs for all clusters using mock data
            createClusterTabs(mockKubernetesData.clusters);
            updateK8sStats();
            updateK8sLastUpdate();
            
            // Hide loading and show content
            if (clustersLoading) clustersLoading.style.display = 'none';
            if (clusterTabs) clusterTabs.style.display = 'block';
            
            // Show a subtle notification that we're using demo data
            if (typeof showNotification === 'function') {
                showNotification('📊 Using demo data - API connection failed', 'warning');
            }
        });
}

// Refresh Kubernetes nodes
function refreshK8sNodes() {
    refreshKubernetes();
}

// Refresh Kubernetes pods
function refreshK8sPods() {
    refreshKubernetes();
}

// Create cluster tabs dynamically
function createClusterTabs(clusters) {
    const tabNav = document.getElementById('clusterTabNav');
    const tabContent = document.getElementById('clusterTabContent');
    
    if (!tabNav || !tabContent) return;
    
    // Clear existing tabs
    tabNav.innerHTML = '';
    tabContent.innerHTML = '';
    
    clusters.forEach((cluster, index) => {
        // Initialize system pods visibility state (default: show all pods)
        systemPodsVisibility[cluster.name] = true;
        
        // Create tab navigation button
        const tabButton = document.createElement('button');
        tabButton.className = `tab-button ${index === 0 ? 'active' : ''}`;
        tabButton.textContent = `🖧 ${cluster.name}`;
        tabButton.onclick = (event) => switchClusterTab(event, cluster.name);
        tabNav.appendChild(tabButton);
        
        // Create tab content
        const tabPane = document.createElement('div');
        tabPane.id = `cluster-${cluster.name}`;
        tabPane.className = `tab-pane ${index === 0 ? 'active' : ''}`;
        
        tabPane.innerHTML = `
            <div class="cluster-info">
                <h3>Cluster: ${cluster.name}</h3>
                <div class="cluster-stats" style="display: flex !important; flex-direction: row !important; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; align-items: center;">
                    <div style="display: flex !important; align-items: center !important; gap: 0.25rem; white-space: nowrap;">
                        <span style="font-size: 1rem;">🖥️</span>
                        <span style="font-size: 0.9rem;">Total Nodes:</span>
                        <span style="font-weight: bold;" id="totalNodes-${cluster.name}">${Object.keys(cluster.nodes).length}</span>
                    </div>
                    <div style="display: flex !important; align-items: center !important; gap: 0.25rem; white-space: nowrap;">
                        <span style="font-size: 1rem; color: #28a745;">✅</span>
                        <span style="font-size: 0.9rem;">Ready:</span>
                        <span style="font-weight: bold; color: #28a745;" id="readyNodes-${cluster.name}">${Object.values(cluster.nodes).filter(node => node.status === 1).length}</span>
                    </div>
                    <div style="display: flex !important; align-items: center !important; gap: 0.25rem; white-space: nowrap;">
                        <span style="font-size: 1rem;">📦</span>
                        <span style="font-size: 0.9rem;">Total Pods:</span>
                        <span style="font-weight: bold;" id="totalPods-${cluster.name}">${Object.keys(cluster.pods).length}</span>
                    </div>
                    <div style="display: flex !important; align-items: center !important; gap: 0.25rem; white-space: nowrap;">
                        <span style="font-size: 1rem; color: #28a745;">🟢</span>
                        <span style="font-size: 0.9rem;">Running:</span>
                        <span style="font-weight: bold; color: #28a745;" id="runningPods-${cluster.name}">${Object.values(cluster.pods).filter(pod => pod.status === 1).length}</span>
                    </div>
                    <div style="display: flex !important; align-items: center !important; gap: 0.25rem; white-space: nowrap;">
                        <span style="font-size: 1rem;">📊</span>
                        <span style="font-size: 0.9rem;">Namespaces:</span>
                        <span style="font-weight: bold;" id="namespaces-${cluster.name}">${[...new Set(Object.values(cluster.pods).map(pod => pod.namespace))].length}</span>
                    </div>
                </div>
            </div>
            
            <!-- Sub-tabs for Nodes and Pods -->
            <div class="cluster-sub-tabs">
                <div class="sub-tab-nav" style="display: flex; flex-direction: row; margin-bottom: 1rem; border-bottom: 2px solid #e9ecef;">
                    <button class="sub-tab-button active" onclick="switchSubTab(event, '${cluster.name}', 'nodes')" id="nodes-tab-${cluster.name}" style="padding: 0.75rem 1.5rem; border: none; background: none; cursor: pointer; border-bottom: 2px solid transparent; margin-right: 1rem;">
                        🖥️ Nodes (${Object.keys(cluster.nodes).length})
                    </button>
                    <button class="sub-tab-button" onclick="switchSubTab(event, '${cluster.name}', 'pods')" id="pods-tab-${cluster.name}" style="padding: 0.75rem 1.5rem; border: none; background: none; cursor: pointer; border-bottom: 2px solid transparent;">
                        📦 Pods (${Object.keys(cluster.pods).length})
                    </button>
                </div>
                
                <div class="sub-tab-content-container">
                    <!-- Nodes Tab Content -->
                    <div id="nodes-content-${cluster.name}" class="sub-tab-pane" style="display: block;">
                        <div class="table-container">
                            <table class="k8s-table" id="k8sNodesTable-${cluster.name}">
                                <thead>
                                    <tr>
                                        <th onclick="sortK8sTable('${cluster.name}', 'nodes', 0)" style="cursor: pointer;" title="Click to sort">Status <span class="sort-indicator" id="nodes-sort-0-${cluster.name}"></span></th>
                                        <th onclick="sortK8sTable('${cluster.name}', 'nodes', 1)" style="cursor: pointer;" title="Click to sort">Name <span class="sort-indicator" id="nodes-sort-1-${cluster.name}"></span></th>
                                        <th onclick="sortK8sTable('${cluster.name}', 'nodes', 2)" style="cursor: pointer;" title="Click to sort">Roles <span class="sort-indicator" id="nodes-sort-2-${cluster.name}"></span></th>
                                        <th onclick="sortK8sTable('${cluster.name}', 'nodes', 3)" style="cursor: pointer;" title="Click to sort">Age <span class="sort-indicator" id="nodes-sort-3-${cluster.name}"></span></th>
                                        <th onclick="sortK8sTable('${cluster.name}', 'nodes', 4)" style="cursor: pointer;" title="Click to sort">Version <span class="sort-indicator" id="nodes-sort-4-${cluster.name}"></span></th>
                                        <th onclick="sortK8sTable('${cluster.name}', 'nodes', 5)" style="cursor: pointer;" title="Click to sort">Internal IP <span class="sort-indicator" id="nodes-sort-5-${cluster.name}"></span></th>
                                        <th onclick="sortK8sTable('${cluster.name}', 'nodes', 6)" style="cursor: pointer;" title="Click to sort">External IP <span class="sort-indicator" id="nodes-sort-6-${cluster.name}"></span></th>
                                        <th onclick="sortK8sTable('${cluster.name}', 'nodes', 7)" style="cursor: pointer;" title="Click to sort">OS Image <span class="sort-indicator" id="nodes-sort-7-${cluster.name}"></span></th>
                                        <th onclick="sortK8sTable('${cluster.name}', 'nodes', 8)" style="cursor: pointer;" title="Click to sort">Kernel Version <span class="sort-indicator" id="nodes-sort-8-${cluster.name}"></span></th>
                                        <th onclick="sortK8sTable('${cluster.name}', 'nodes', 9)" style="cursor: pointer;" title="Click to sort">Container Runtime <span class="sort-indicator" id="nodes-sort-9-${cluster.name}"></span></th>
                                    </tr>
                                </thead>
                                <tbody id="k8sNodesTableBody-${cluster.name}">
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <!-- Pods Tab Content -->
                    <div id="pods-content-${cluster.name}" class="sub-tab-pane" style="display: none;">
                        <div class="table-controls" style="margin-bottom: 1rem;">
                            <button class="refresh-btn" onclick="toggleSystemPods('${cluster.name}')" title="Hide system pods (kube-system, calico-system, calico-apiserver)" id="systemPodsBtn-${cluster.name}">
                                👁️ Hide System
                            </button>
                        </div>
                        <div class="table-container">
                            <table class="k8s-table" id="k8sPodsTable-${cluster.name}">
                                <thead>
                                    <tr>
                                        <th onclick="sortK8sTable('${cluster.name}', 'pods', 0)" style="cursor: pointer;" title="Click to sort">Status <span class="sort-indicator" id="pods-sort-0-${cluster.name}"></span></th>
                                        <th onclick="sortK8sTable('${cluster.name}', 'pods', 1)" style="cursor: pointer;" title="Click to sort">Namespace <span class="sort-indicator" id="pods-sort-1-${cluster.name}"></span></th>
                                        <th onclick="sortK8sTable('${cluster.name}', 'pods', 2)" style="cursor: pointer;" title="Click to sort">Name <span class="sort-indicator" id="pods-sort-2-${cluster.name}"></span></th>
                                        <th onclick="sortK8sTable('${cluster.name}', 'pods', 3)" style="cursor: pointer;" title="Click to sort">Ready <span class="sort-indicator" id="pods-sort-3-${cluster.name}"></span></th>
                                        <th onclick="sortK8sTable('${cluster.name}', 'pods', 4)" style="cursor: pointer;" title="Click to sort">Restarts <span class="sort-indicator" id="pods-sort-4-${cluster.name}"></span></th>
                                        <th onclick="sortK8sTable('${cluster.name}', 'pods', 5)" style="cursor: pointer;" title="Click to sort">Age <span class="sort-indicator" id="pods-sort-5-${cluster.name}"></span></th>
                                        <th onclick="sortK8sTable('${cluster.name}', 'pods', 6)" style="cursor: pointer;" title="Click to sort">IP <span class="sort-indicator" id="pods-sort-6-${cluster.name}"></span></th>
                                        <th onclick="sortK8sTable('${cluster.name}', 'pods', 7)" style="cursor: pointer;" title="Click to sort">Node <span class="sort-indicator" id="pods-sort-7-${cluster.name}"></span></th>
                                        <th onclick="sortK8sTable('${cluster.name}', 'pods', 8)" style="cursor: pointer;" title="Click to sort">Nominated Node <span class="sort-indicator" id="pods-sort-8-${cluster.name}"></span></th>
                                        <th onclick="sortK8sTable('${cluster.name}', 'pods', 9)" style="cursor: pointer;" title="Click to sort">Readiness Gates <span class="sort-indicator" id="pods-sort-9-${cluster.name}"></span></th>
                                    </tr>
                                </thead>
                                <tbody id="k8sPodsTableBody-${cluster.name}">
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        tabContent.appendChild(tabPane);
        
        // Populate tables for this cluster
        populateK8sNodesTable(cluster.nodes, cluster.name);
        
        // Apply default sort to pods table (namespace column ascending)
        applyDefaultPodSort(cluster, cluster.name);
        populateK8sPodsTable(cluster.pods, cluster.name);
    });
}

// Apply default sort to pods table (namespace column ascending)
function applyDefaultPodSort(cluster, clusterName) {
    const data = cluster.pods;
    const dataArray = Object.values(data);
    
    if (dataArray.length === 0) return;
    
    // Set default sort state
    const stateKey = `${clusterName}-pods`;
    currentSortState[stateKey] = {
        column: 1, // namespace column
        direction: 'asc'
    };
    
    // Sort the data by namespace ascending
    const sortedData = sortTableData(dataArray, 'pods', 1, 'asc');
    
    // Convert back to object format with original keys
    const sortedObject = {};
    const originalKeys = Object.keys(data);
    sortedData.forEach((item, index) => {
        // Find original key for this item
        const originalKey = originalKeys.find(key => data[key] === item) || `item-${index}`;
        sortedObject[originalKey] = item;
    });
    
    // Update cluster data
    cluster.pods = sortedObject;
    
    // Update sort indicator for namespace column
    setTimeout(() => {
        updateSortIndicators(clusterName, 'pods', 1, 'asc');
    }, 100);
}


// Populate nodes table
function populateK8sNodesTable(nodes, clusterName) {
    const tableBodyId = clusterName ? `k8sNodesTableBody-${clusterName}` : 'k8sNodesTableBody';
    const tableBody = document.getElementById(tableBodyId);
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    Object.values(nodes).forEach(node => {
        const row = document.createElement('tr');
        row.className = 'table-row clickable';
        row.onclick = () => showNodeDetails(node);
        
        const statusClass = node.status === 1 ? 'status-online' : 'status-offline';
        const statusText = node.status === 1 ? '✅ Ready' : '❌ Not Ready';
        
        row.innerHTML = `
            <td><span class="${statusClass}">${statusText}</span></td>
            <td class="text-bold">${node.name}</td>
            <td>${node.roles}</td>
            <td>${node.age}</td>
            <td>${node.version}</td>
            <td>${node.internal_ip}</td>
            <td>${node.external_ip}</td>
            <td>${node.os_image}</td>
            <td>${node.kernel_version}</td>
            <td>${node.container_runtime}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Populate pods table
function populateK8sPodsTable(pods, clusterName) {
    const tableBodyId = clusterName ? `k8sPodsTableBody-${clusterName}` : 'k8sPodsTableBody';
    const tableBody = document.getElementById(tableBodyId);
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    // Get system pods visibility state for this cluster
    const showSystemPods = systemPodsVisibility[clusterName] !== false; // Default to true if not set
    
    Object.values(pods).forEach(pod => {
        // Check if this is a system pod
        const isSystemPod = isSystemNamespace(pod.namespace);
        
        // Skip system pods if they should be hidden
        if (isSystemPod && !showSystemPods) {
            return;
        }
        
        const row = document.createElement('tr');
        row.className = 'table-row clickable';
        row.onclick = () => showPodDetails(pod);
        
        const statusClass = pod.status === 1 ? 'status-online' : 'status-offline';
        const statusText = pod.status === 1 ? '✅ Running' : '❌ Not Running';
        
        const readyText = pod.ready && pod.ready.count !== undefined && pod.ready.outof !== undefined 
            ? `${pod.ready.count}/${pod.ready.outof}` 
            : '1/1'; // Default value
        
        const restartsText = pod.restarts && pod.restarts.count !== undefined
            ? (pod.restarts.count > 0 
                ? `${pod.restarts.count} (${pod.restarts.ago || 'unknown'} ago)` 
                : pod.restarts.count.toString())
            : '0'; // Default value
        
        row.innerHTML = `
            <td><span class="${statusClass}">${statusText}</span></td>
            <td>${pod.namespace}</td>
            <td class="text-bold">${pod.name}</td>
            <td>${readyText}</td>
            <td>${restartsText}</td>
            <td>${pod.age}</td>
            <td>${pod.ip}</td>
            <td>${pod.node}</td>
            <td>${pod.nominated_node}</td>
            <td>${pod.readiness_gates}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Update statistics for each cluster
function updateK8sStats() {
    if (!kubernetesData.clusters || kubernetesData.clusters.length === 0) return;
    
    // Update statistics for each cluster individually
    kubernetesData.clusters.forEach(cluster => {
        const nodes = Object.values(cluster.nodes);
        const pods = Object.values(cluster.pods);
        const namespaces = [...new Set(pods.map(pod => pod.namespace))];
        
        const readyNodes = nodes.filter(node => node.status === 1).length;
        const runningPods = pods.filter(pod => pod.status === 1).length;
        
        // Update cluster-specific statistics
        updateElementText(`totalNodes-${cluster.name}`, nodes.length);
        updateElementText(`readyNodes-${cluster.name}`, readyNodes);
        updateElementText(`totalPods-${cluster.name}`, pods.length);
        updateElementText(`runningPods-${cluster.name}`, runningPods);
        updateElementText(`namespaces-${cluster.name}`, namespaces.length);
    });
}

// Update last update timestamp
function updateK8sLastUpdate() {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    updateElementText('k8sLastUpdate', timeString);
}

// Toggle auto-refresh
function toggleK8sAutoRefresh() {
    const button = document.getElementById('k8sAutoRefreshBtn');
    
    if (k8sAutoRefreshEnabled) {
        // Disable auto-refresh
        clearInterval(k8sAutoRefreshInterval);
        k8sAutoRefreshInterval = null;
        k8sAutoRefreshEnabled = false;
        if (button) {
            button.textContent = '▶️ Auto-refresh (30s)';
            button.title = 'Enable Auto-refresh';
        }
    } else {
        // Enable auto-refresh
        k8sAutoRefreshInterval = setInterval(refreshKubernetes, 30000); // 30 seconds
        k8sAutoRefreshEnabled = true;
        if (button) {
            button.textContent = '⏸️ Auto-refresh (30s)';
            button.title = 'Disable Auto-refresh';
        }
    }
}

// Toggle sections
function toggleK8sNodesSection() {
    toggleSection('k8sNodesSection', 'k8sNodesContent', 'k8sNodesToggleIcon');
}

function toggleK8sPodsSection() {
    toggleSection('k8sPodsSection', 'k8sPodsContent', 'k8sPodsToggleIcon');
}

// Cluster tab switching
function switchClusterTab(event, clusterName) {
    // Hide all tab panes
    const tabPanes = document.querySelectorAll('.tab-pane');
    tabPanes.forEach(pane => {
        pane.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.classList.remove('active');
    });
    
    // Show selected tab pane
    const targetPane = document.getElementById(`cluster-${clusterName}`);
    if (targetPane) {
        targetPane.classList.add('active');
    }
    
    // Add active class to clicked button
    if (event && event.target) {
        event.target.classList.add('active');
    }
}

// Sub-tab switching within clusters
function switchSubTab(event, clusterName, tabType) {
    // Hide all sub-tab content for this cluster
    const nodesContent = document.getElementById(`nodes-content-${clusterName}`);
    const podsContent = document.getElementById(`pods-content-${clusterName}`);
    
    if (nodesContent) nodesContent.style.display = 'none';
    if (podsContent) podsContent.style.display = 'none';
    
    // Remove active class from all sub-tab buttons for this cluster
    const subTabButtons = document.querySelectorAll(`#cluster-${clusterName} .sub-tab-button`);
    subTabButtons.forEach(button => {
        button.classList.remove('active');
        button.style.borderBottom = '2px solid transparent';
    });
    
    // Show selected sub-tab content
    const targetContent = document.getElementById(`${tabType}-content-${clusterName}`);
    if (targetContent) {
        targetContent.style.display = 'block';
    }
    
    // Add active class to clicked button
    if (event && event.target) {
        event.target.classList.add('active');
        event.target.style.borderBottom = '2px solid #007bff';
    }
    
    // Show notification
    const tabDisplayName = tabType === 'nodes' ? 'Nodes' : 'Pods';
    if (typeof showNotification === 'function') {
        showNotification(`📊 Switched to ${tabDisplayName} view for ${clusterName}`, 'info');
    }
}

// Toggle cluster-specific sections
function toggleClusterSection(sectionId, contentId, iconId) {
    const section = document.getElementById(sectionId);
    const content = document.getElementById(contentId);
    const icon = document.getElementById(iconId);
    
    if (section && content && icon) {
        if (section.classList.contains('collapsed')) {
            section.classList.remove('collapsed');
            section.classList.add('visible');
            icon.textContent = '−';
        } else {
            section.classList.remove('visible');
            section.classList.add('collapsed');
            icon.textContent = '+';
        }
    }
}

// Show node details (placeholder)
function showNodeDetails(node) {
    console.log('Showing details for node:', node.name);
    showNotification(`Node Details: ${node.name} (${node.status === 1 ? 'Ready' : 'Not Ready'})`, 'info');
}

// Show pod details (placeholder)
function showPodDetails(pod) {
    console.log('Showing details for pod:', pod.name);
    showNotification(`Pod Details: ${pod.name} in ${pod.namespace} namespace`, 'info');
}

// Helper function to update element text
function updateElementText(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = text;
    }
}

// Helper function to toggle sections
function toggleSection(sectionId, contentId, iconId) {
    const section = document.getElementById(sectionId);
    const content = document.getElementById(contentId);
    const icon = document.getElementById(iconId);
    
    if (section && content && icon) {
        if (section.classList.contains('collapsed')) {
            section.classList.remove('collapsed');
            section.classList.add('visible');
            icon.textContent = '−';
        } else {
            section.classList.remove('visible');
            section.classList.add('collapsed');
            icon.textContent = '+';
        }
    }
}

// Kubernetes table sorting functionality
function sortK8sTable(clusterName, tableType, columnIndex) {
    const cluster = kubernetesData.clusters.find(c => c.name === clusterName);
    if (!cluster) return;
    
    const data = tableType === 'nodes' ? cluster.nodes : cluster.pods;
    const dataArray = Object.values(data);
    
    if (dataArray.length === 0) return;
    
    // Get current sort state for this table
    const stateKey = `${clusterName}-${tableType}`;
    const currentSort = currentSortState[stateKey];
    
    // Determine sort direction
    let direction = 'desc'; // Default to descending
    if (currentSort && currentSort.column === columnIndex) {
        // Toggle direction if same column
        direction = currentSort.direction === 'desc' ? 'asc' : 'desc';
    }
    
    // Update sort state
    currentSortState[stateKey] = {
        column: columnIndex,
        direction: direction
    };
    
    // Sort the data
    const sortedData = sortTableData(dataArray, tableType, columnIndex, direction);
    
    // Convert back to object format with original keys
    const sortedObject = {};
    const originalKeys = Object.keys(data);
    sortedData.forEach((item, index) => {
        // Find original key for this item
        const originalKey = originalKeys.find(key => data[key] === item) || `item-${index}`;
        sortedObject[originalKey] = item;
    });
    
    // Update cluster data
    if (tableType === 'nodes') {
        cluster.nodes = sortedObject;
    } else {
        cluster.pods = sortedObject;
    }
    
    // Re-populate the table
    if (tableType === 'nodes') {
        populateK8sNodesTable(sortedObject, clusterName);
    } else {
        populateK8sPodsTable(sortedObject, clusterName);
    }
    
    // Update sort indicators
    updateSortIndicators(clusterName, tableType, columnIndex, direction);
    
    // Show notification
    const columnNames = tableType === 'nodes' 
        ? ['Status', 'Name', 'Roles', 'Age', 'Version', 'Internal IP', 'External IP', 'OS Image', 'Kernel Version', 'Container Runtime']
        : ['Status', 'Namespace', 'Name', 'Ready', 'Restarts', 'Age', 'IP', 'Node', 'Nominated Node', 'Readiness Gates'];
    
    if (typeof showNotification === 'function') {
        showNotification(`📊 Sorted ${tableType} by ${columnNames[columnIndex]} (${direction.toUpperCase()})`, 'info');
    }
}

// Sort table data based on column and data type
function sortTableData(dataArray, tableType, columnIndex, direction) {
    const multiplier = direction === 'desc' ? -1 : 1;
    
    return dataArray.sort((a, b) => {
        let valueA, valueB;
        
        if (tableType === 'nodes') {
            const nodeFields = ['status', 'name', 'roles', 'age', 'version', 'internal_ip', 'external_ip', 'os_image', 'kernel_version', 'container_runtime'];
            const field = nodeFields[columnIndex];
            valueA = a[field];
            valueB = b[field];
        } else { // pods
            const podFields = ['status', 'namespace', 'name', 'ready', 'restarts', 'age', 'ip', 'node', 'nominated_node', 'readiness_gates'];
            const field = podFields[columnIndex];
            
            if (field === 'ready') {
                valueA = `${a.ready.count}/${a.ready.outof}`;
                valueB = `${b.ready.count}/${b.ready.outof}`;
            } else if (field === 'restarts') {
                valueA = a.restarts.count || 0;
                valueB = b.restarts.count || 0;
            } else {
                valueA = a[field];
                valueB = b[field];
            }
        }
        
        // Handle different data types
        return compareValues(valueA, valueB, columnIndex, tableType) * multiplier;
    });
}

// Compare values based on data type
function compareValues(valueA, valueB, columnIndex, tableType) {
    // Handle null/undefined values
    if (valueA == null && valueB == null) return 0;
    if (valueA == null) return -1;
    if (valueB == null) return 1;
    
    // Status comparison (numbers)
    if (columnIndex === 0) {
        return Number(valueA) - Number(valueB);
    }
    
    // Age comparison (parse age strings like "45d", "2h", "30m")
    if ((tableType === 'nodes' && columnIndex === 3) || (tableType === 'pods' && columnIndex === 5)) {
        return compareAgeStrings(valueA, valueB);
    }
    
    // IP address comparison
    if ((tableType === 'nodes' && (columnIndex === 5 || columnIndex === 6)) || (tableType === 'pods' && columnIndex === 6)) {
        return compareIPAddresses(valueA, valueB);
    }
    
    // Ready comparison (for pods - like "1/1", "2/3")
    if (tableType === 'pods' && columnIndex === 3) {
        return compareReadyValues(valueA, valueB);
    }
    
    // Restarts comparison (numeric)
    if (tableType === 'pods' && columnIndex === 4) {
        return Number(valueA) - Number(valueB);
    }
    
    // Default string comparison
    return String(valueA).localeCompare(String(valueB));
}

// Compare age strings like "45d", "2h", "30m", "5s"
function compareAgeStrings(ageA, ageB) {
    const parseAge = (ageStr) => {
        if (!ageStr || ageStr === '<none>') return 0;
        const match = ageStr.match(/^(\d+)([smhd])$/);
        if (!match) return 0;
        
        const value = parseInt(match[1]);
        const unit = match[2];
        
        switch (unit) {
            case 's': return value;
            case 'm': return value * 60;
            case 'h': return value * 3600;
            case 'd': return value * 86400;
            default: return 0;
        }
    };
    
    return parseAge(ageA) - parseAge(ageB);
}

// Compare IP addresses
function compareIPAddresses(ipA, ipB) {
    if (ipA === '<none>' && ipB === '<none>') return 0;
    if (ipA === '<none>') return -1;
    if (ipB === '<none>') return 1;
    
    const parseIP = (ip) => {
        const parts = ip.split('.').map(Number);
        if (parts.length !== 4) return 0;
        return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
    };
    
    return parseIP(ipA) - parseIP(ipB);
}

// Compare ready values like "1/1", "2/3"
function compareReadyValues(readyA, readyB) {
    const parseReady = (readyStr) => {
        const parts = readyStr.split('/').map(Number);
        if (parts.length !== 2) return 0;
        return parts[0] / parts[1]; // Calculate percentage
    };
    
    return parseReady(readyA) - parseReady(readyB);
}

// Update sort indicators in table headers
function updateSortIndicators(clusterName, tableType, columnIndex, direction) {
    // Clear all indicators for this table
    for (let i = 0; i < 10; i++) {
        const indicator = document.getElementById(`${tableType}-sort-${i}-${clusterName}`);
        if (indicator) {
            indicator.textContent = '';
        }
    }
    
    // Set indicator for current sorted column
    const currentIndicator = document.getElementById(`${tableType}-sort-${columnIndex}-${clusterName}`);
    if (currentIndicator) {
        currentIndicator.textContent = direction === 'desc' ? ' ↓' : ' ↑';
    }
}

// System pods filtering functions
function isSystemNamespace(namespace) {
    return namespace === 'kube-system' || namespace === 'calico-system' || namespace === 'calico-apiserver';
}

function toggleSystemPods(clusterName) {
    // Toggle the visibility state
    systemPodsVisibility[clusterName] = !systemPodsVisibility[clusterName];
    
    // Update button text
    const button = document.getElementById(`systemPodsBtn-${clusterName}`);
    if (button) {
        if (systemPodsVisibility[clusterName]) {
            button.innerHTML = '👁️ Hide System';
            button.title = 'Hide system pods (kube-system, calico-system, calico-apiserver)';
        } else {
            button.innerHTML = '🙈 Show System';
            button.title = 'Show system pods (kube-system, calico-system, calico-apiserver)';
        }
    }
    
    // Find the cluster and re-populate the pods table
    const cluster = kubernetesData.clusters.find(c => c.name === clusterName);
    if (cluster) {
        populateK8sPodsTable(cluster.pods, clusterName);
        
        // Update statistics to reflect filtered view
        updateClusterStats(cluster, clusterName);
    }
    
    // Show notification
    const action = systemPodsVisibility[clusterName] ? 'Showing' : 'Hiding';
    if (typeof showNotification === 'function') {
        showNotification(`👁️ ${action} system pods in ${clusterName}`, 'info');
    }
}

// Update statistics for a specific cluster with filtering applied
function updateClusterStats(cluster, clusterName) {
    const nodes = Object.values(cluster.nodes);
    const allPods = Object.values(cluster.pods);
    const showSystemPods = systemPodsVisibility[clusterName] !== false;
    
    // Filter pods based on system pods visibility
    const filteredPods = showSystemPods 
        ? allPods 
        : allPods.filter(pod => !isSystemNamespace(pod.namespace));
    
    const namespaces = [...new Set(filteredPods.map(pod => pod.namespace))];
    
    const readyNodes = nodes.filter(node => node.status === 1).length;
    const runningPods = filteredPods.filter(pod => pod.status === 1).length;
    
    // Update cluster-specific statistics
    updateElementText(`totalNodes-${clusterName}`, nodes.length);
    updateElementText(`readyNodes-${clusterName}`, readyNodes);
    updateElementText(`totalPods-${clusterName}`, filteredPods.length);
    updateElementText(`runningPods-${clusterName}`, runningPods);
    updateElementText(`namespaces-${clusterName}`, namespaces.length);
}