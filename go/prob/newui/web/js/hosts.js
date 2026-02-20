// Hosts & Virtual Machines Section Module
// Columns: ProblerHosts.columns (probler/hosts/hosts-columns.js)

// Initialize Hosts Section
function initializeHosts() {
    // Initialize tab switching
    const tabs = document.querySelectorAll('.l8-module-tab');
    const tabContents = document.querySelectorAll('.l8-module-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.module;

            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));

            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            const targetContent = document.querySelector(`.l8-module-content[data-module="${tabName}"]`);
            if (targetContent) {
                targetContent.classList.add('active');
            }

            // Initialize tables when switching tabs
            if (tabName === 'hypervisors' && !window.hypervisorsTableInitialized) {
                initializeHypervisorsTable();
            } else if (tabName === 'vms' && !window.vmsTableInitialized) {
                initializeVMsTable();
            }
        });
    });

    // Initialize hypervisors table by default
    initializeHypervisorsTable();
}

// Initialize Hypervisors Table
function initializeHypervisorsTable() {
    const container = document.getElementById('hypervisors-table');
    if (!container) {
        return;
    }

    const hypervisorData = [];

    try {
        const hypervisorsTable = new Layer8DTable({
            containerId: 'hypervisors-table',
            columns: ProblerHosts.columns.Hypervisor,
            data: hypervisorData,
            pageSize: 15,
            sortable: true,
            filterable: true,
            statusColumn: 'status',
            onRowClick: (rowData) => {
                showHypervisorDetailModal(rowData);
            }
        });
        hypervisorsTable.init();

        window.hypervisorsTableInitialized = true;
    } catch (error) {
    }
}

// Initialize VMs Table
function initializeVMsTable() {
    const container = document.getElementById('vms-table');
    if (!container) {
        return;
    }

    const vmData = [];

    try {
        const vmsTable = new Layer8DTable({
            containerId: 'vms-table',
            columns: ProblerHosts.columns.VM,
            data: vmData,
            pageSize: 15,
            sortable: true,
            filterable: true,
            statusColumn: 'status',
            onRowClick: (rowData) => {
                showVMDetailModal(rowData);
            }
        });
        vmsTable.init();

        window.vmsTableInitialized = true;
    } catch (error) {
    }
}
