// Hosts & Virtual Machines Section Module

// Generate mock hypervisor data
function generateHypervisorMockData() {
    const hypervisors = [];
    const types = ['VMware ESXi', 'KVM', 'Hyper-V', 'Proxmox VE'];
    const versions = {
        'VMware ESXi': ['8.0 Update 2', '8.0 Update 1', '7.0 Update 3'],
        'KVM': ['QEMU 8.0', 'QEMU 7.2', 'QEMU 7.1'],
        'Hyper-V': ['Windows Server 2022', 'Windows Server 2019'],
        'Proxmox VE': ['8.0', '7.4', '7.3']
    };
    const statuses = ['operational', 'operational', 'operational', 'operational', 'warning', 'critical'];
    const datacenters = ['DC1', 'DC2', 'DC3'];
    const clusters = ['Production', 'Development', 'Testing', 'DR'];

    for (let i = 1; i <= 25; i++) {
        const type = types[i % types.length];
        const status = statuses[i % statuses.length];
        const datacenter = datacenters[i % datacenters.length];
        const cluster = clusters[i % clusters.length];

        const totalCPU = [32, 64, 96, 128][i % 4];
        const totalMemory = [256, 512, 768, 1024][i % 4];
        const totalStorage = [10, 20, 30, 50][i % 4];

        const cpuUsage = status === 'operational' ? Math.floor(Math.random() * 40) + 40 : (status === 'warning' ? Math.floor(Math.random() * 20) + 75 : 0);
        const memoryUsage = status === 'operational' ? Math.floor(Math.random() * 35) + 50 : (status === 'warning' ? Math.floor(Math.random() * 15) + 80 : 0);
        const storageUsed = status === 'operational' ? Math.floor(totalStorage * 0.6) + Math.floor(Math.random() * totalStorage * 0.2) : 0;
        const vmCount = status === 'operational' ? Math.floor(Math.random() * 100) + 50 : (status === 'warning' ? Math.floor(Math.random() * 30) + 10 : 0);

        hypervisors.push({
            id: `hv-${String(i).padStart(3, '0')}`,
            name: `${type.split(' ')[0].toUpperCase()}-HV-${String(i).padStart(2, '0')}`,
            hostname: `${type.split(' ')[0].toLowerCase()}-hv-${String(i).padStart(2, '0')}.${datacenter.toLowerCase()}.datacenter.local`,
            type: type,
            version: versions[type][i % versions[type].length],
            status: status,
            datacenter: datacenter,
            cluster: cluster,
            cpuCores: totalCPU,
            cpuUsage: cpuUsage,
            cpuThreads: totalCPU * 2,
            memoryTotal: totalMemory,
            memoryUsage: memoryUsage,
            memoryUsed: Math.floor((memoryUsage / 100) * totalMemory),
            storageTotal: totalStorage,
            storageUsed: storageUsed,
            vmCount: vmCount,
            vmRunning: status === 'operational' ? vmCount : (status === 'warning' ? Math.floor(vmCount * 0.7) : 0),
            vmStopped: status === 'operational' ? 0 : (status === 'warning' ? Math.floor(vmCount * 0.3) : vmCount),
            uptime: status === 'operational' ? Math.floor(Math.random() * 300) + 30 : 0,
            ipAddress: `10.${i}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
            manufacturer: type === 'VMware ESXi' ? 'Dell' : (type === 'Hyper-V' ? 'HP' : 'Supermicro'),
            model: type === 'VMware ESXi' ? 'PowerEdge R750' : (type === 'Hyper-V' ? 'ProLiant DL380 Gen10' : 'SYS-220U-TNR'),
            biosVersion: `${Math.floor(Math.random() * 10) + 1}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 100)}`,
            cpuModel: totalCPU >= 96 ? 'AMD EPYC 7763' : (totalCPU >= 64 ? 'Intel Xeon Gold 6330' : 'Intel Xeon Silver 4314'),
            networkInterfaces: Math.floor(Math.random() * 4) + 4,
            vSwitches: Math.floor(Math.random() * 3) + 2,
            datastores: Math.floor(Math.random() * 5) + 3,
            lastSeen: status === 'critical' ? `2025-10-03 ${String(13 + Math.floor(Math.random() * 2)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}` : `2025-10-03 14:${String(30 + Math.floor(Math.random() * 30)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`
        });
    }

    return hypervisors;
}

// Generate mock VM data
function generateVMMockData() {
    const vms = [];
    const osTypes = ['Windows Server 2022', 'Windows Server 2019', 'Ubuntu 22.04', 'Ubuntu 20.04', 'Red Hat Enterprise Linux 9', 'Red Hat Enterprise Linux 8', 'CentOS 7', 'Debian 11'];
    const statuses = ['running', 'running', 'running', 'running', 'running', 'stopped', 'suspended', 'error'];
    const purposes = ['Web Server', 'Database Server', 'Application Server', 'File Server', 'Domain Controller', 'Mail Server', 'Development', 'Testing', 'Backup'];
    const hypervisorNames = [];

    // Generate hypervisor names for reference
    for (let i = 1; i <= 25; i++) {
        const types = ['VMWARE', 'KVM', 'HYPER-V', 'PROXMOX'];
        hypervisorNames.push(`${types[i % types.length]}-HV-${String(i).padStart(2, '0')}`);
    }

    for (let i = 1; i <= 50; i++) {
        const os = osTypes[i % osTypes.length];
        const status = statuses[i % statuses.length];
        const purpose = purposes[i % purposes.length];
        const hypervisor = hypervisorNames[i % hypervisorNames.length];

        const cpuCores = [2, 4, 8, 16][i % 4];
        const memory = [4, 8, 16, 32, 64][i % 5];
        const disk = [50, 100, 250, 500, 1000][i % 5];

        const cpuUsage = status === 'running' ? Math.floor(Math.random() * 60) + 20 : 0;
        const memoryUsage = status === 'running' ? Math.floor(Math.random() * 50) + 40 : 0;
        const diskUsage = status === 'running' ? Math.floor(Math.random() * 40) + 40 : 0;
        const networkThroughput = status === 'running' ? (Math.random() * 500 + 100).toFixed(2) : 0;

        const uptime = status === 'running' ? Math.floor(Math.random() * 200) + 10 : 0;

        vms.push({
            id: `vm-${String(i).padStart(4, '0')}`,
            name: `${purpose.replace(/\s+/g, '-').toLowerCase()}-${String(i).padStart(3, '0')}`,
            hostname: `${purpose.replace(/\s+/g, '-').toLowerCase()}-${String(i).padStart(3, '0')}.datacenter.local`,
            os: os,
            status: status,
            purpose: purpose,
            hypervisor: hypervisor,
            cpuCores: cpuCores,
            cpuUsage: cpuUsage,
            memory: memory,
            memoryUsage: memoryUsage,
            memoryUsed: Math.floor((memoryUsage / 100) * memory),
            diskTotal: disk,
            diskUsed: Math.floor((diskUsage / 100) * disk),
            diskUsage: diskUsage,
            networkThroughput: networkThroughput,
            ipAddress: `192.168.${Math.floor(i / 255) + 1}.${i % 255}`,
            macAddress: `00:50:56:${Math.floor(Math.random() * 256).toString(16).padStart(2, '0')}:${Math.floor(Math.random() * 256).toString(16).padStart(2, '0')}:${Math.floor(Math.random() * 256).toString(16).padStart(2, '0')}`.toUpperCase(),
            vlan: 10 + (i % 10) * 10,
            snapshotCount: Math.floor(Math.random() * 5),
            backupStatus: status === 'running' ? (i % 3 === 0 ? 'Completed' : 'Scheduled') : 'N/A',
            lastBackup: status === 'running' ? `2025-10-${String(Math.floor(Math.random() * 3) + 1).padStart(2, '0')}` : 'N/A',
            uptime: uptime,
            createdDate: `2024-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
            owner: ['IT Team', 'Development', 'Operations', 'Finance', 'HR'][i % 5],
            tags: [purpose, os.split(' ')[0]],
            notes: `${purpose} for ${['Production', 'Development', 'Testing'][i % 3]} environment`,
            lastSeen: status === 'running' ? `2025-10-03 14:${String(30 + Math.floor(Math.random() * 30)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}` : `2025-10-03 ${String(Math.floor(Math.random() * 14)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`
        });
    }

    return vms;
}

// Initialize Hosts Section
function initializeHosts() {
    // Initialize tab switching
    const tabs = document.querySelectorAll('.content-tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;

            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));

            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            const targetContent = document.querySelector(`.tab-content[data-content="${tabName}"]`);
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

    const hypervisorData = generateHypervisorMockData();

    try {
        const hypervisorsTable = new ProblerTable('hypervisors-table', {
            columns: [
                { key: 'name', label: 'Host Name' },
                { key: 'type', label: 'Type' },
                { key: 'cluster', label: 'Cluster' },
                { key: 'status', label: 'Status' },
                {
                    key: 'cpuUsage',
                    label: 'CPU %',
                    formatter: (value) => `${value}%`
                },
                {
                    key: 'memoryUsage',
                    label: 'Memory %',
                    formatter: (value) => `${value}%`
                },
                {
                    key: 'vmCount',
                    label: 'VMs',
                    formatter: (value, row) => `${row.vmRunning}/${value}`
                },
                { key: 'datacenter', label: 'Datacenter' }
            ],
            data: hypervisorData,
            rowsPerPage: 15,
            sortable: true,
            filterable: true,
            statusColumn: 'status',
            onRowClick: (rowData) => {
                showHypervisorDetailModal(rowData);
            }
        });

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

    const vmData = generateVMMockData();

    try {
        const vmsTable = new ProblerTable('vms-table', {
            columns: [
                { key: 'name', label: 'VM Name' },
                { key: 'os', label: 'Operating System' },
                { key: 'hypervisor', label: 'Host' },
                { key: 'status', label: 'Status' },
                {
                    key: 'cpuUsage',
                    label: 'CPU %',
                    formatter: (value) => `${value}%`
                },
                {
                    key: 'memory',
                    label: 'Memory',
                    formatter: (value, row) => `${row.memoryUsed}/${value} GB`
                },
                {
                    key: 'diskUsage',
                    label: 'Disk %',
                    formatter: (value) => `${value}%`
                },
                { key: 'ipAddress', label: 'IP Address' }
            ],
            data: vmData,
            rowsPerPage: 15,
            sortable: true,
            filterable: true,
            statusColumn: 'status',
            onRowClick: (rowData) => {
                showVMDetailModal(rowData);
            }
        });

        window.vmsTableInitialized = true;
    } catch (error) {
    }
}
