// Kubernetes Initialization Module

// Main Initialization Function
function initializeKubernetes() {
    // Initialize all tables for production cluster (default active)
    initializeNodesTable('production');
    initializePodsTable('production');
    initializeDeploymentsTable('production');
    initializeStatefulSetsTable('production');
    initializeDaemonSetsTable('production');
    initializeServicesTable('production');
    initializeNamespacesTable('production');
    initializeNetworkPoliciesTable('production');

    // Set up cluster tab switching
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
                initializeNodesTable(cluster);
                initializePodsTable(cluster);
                initializeDeploymentsTable(cluster);
                initializeStatefulSetsTable(cluster);
                initializeDaemonSetsTable(cluster);
                initializeServicesTable(cluster);
                initializeNamespacesTable(cluster);
                initializeNetworkPoliciesTable(cluster);
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
