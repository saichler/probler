/**
 * Host & VM Detail Popups - Mobile v2
 * Desktop parity: Hypervisor (4 tabs), VM (4 tabs)
 */
(function() {
    'use strict';

    var D = ProblerDetail;
    var row = D.row;

    // ── Hypervisor Detail ─────────────────────────────────────────
    window.showHypervisorDetail = function(hv) {
        var storagePercent = hv.storageTotal > 0 ? Math.round((hv.storageUsed / hv.storageTotal) * 100) : 0;

        // Tab 1: Overview — matches desktop Overview
        var overviewContent =
            '<div class="detail-section">' +
                '<div class="detail-section-title">Host Information</div>' +
                row('Host Name', hv.name) +
                row('Hostname', hv.hostname) +
                row('IP Address', hv.ipAddress) +
                row('Type', hv.type) +
                row('Version', hv.version) +
                row('Status', hv.status) +
            '</div>' +
            '<div class="detail-section">' +
                '<div class="detail-section-title">Cluster & Location</div>' +
                row('Datacenter', hv.datacenter) +
                row('Cluster', hv.cluster) +
                row('Uptime', (hv.uptime || '') + ' days') +
                row('Last Seen', hv.lastSeen) +
                row('Virtual Machines', (hv.vmRunning || 0) + ' running / ' + (hv.vmCount || 0) + ' total') +
            '</div>';

        // Tab 2: Hardware — matches desktop Hardware
        var hwContent =
            '<div class="detail-section">' +
                '<div class="detail-section-title">Physical Hardware</div>' +
                row('Manufacturer', hv.manufacturer) +
                row('Model', hv.model) +
                row('BIOS Version', hv.biosVersion) +
            '</div>' +
            '<div class="detail-section">' +
                '<div class="detail-section-title">CPU Specifications</div>' +
                row('CPU Model', hv.cpuModel) +
                row('Total Cores', hv.cpuCores) +
                row('Total Threads', hv.cpuThreads) +
            '</div>' +
            '<div class="detail-section">' +
                '<div class="detail-section-title">Memory</div>' +
                row('Total Memory', hv.memoryTotal + ' GB') +
                row('Used Memory', hv.memoryUsed + ' GB') +
            '</div>' +
            '<div class="detail-section">' +
                '<div class="detail-section-title">Storage</div>' +
                row('Total Storage', hv.storageTotal + ' TB') +
                row('Used Storage', hv.storageUsed + ' TB') +
                row('Datastores', hv.datastores) +
            '</div>';

        // Tab 3: Resources — matches desktop Resources
        var resourcesContent =
            '<div class="detail-section">' +
                '<div class="detail-section-title">Resource Utilization</div>' +
                D.perfBar('CPU', hv.cpuUsage, '% (' + hv.cpuCores + ' cores)') +
                D.perfBar('Memory', hv.memoryUsage, '% (' + hv.memoryUsed + ' / ' + hv.memoryTotal + ' GB)') +
                D.perfBar('Storage', storagePercent, '% (' + hv.storageUsed + ' / ' + hv.storageTotal + ' TB)') +
            '</div>' +
            '<div class="detail-section">' +
                '<div class="detail-section-title">Network</div>' +
                row('Network Interfaces', hv.networkInterfaces) +
                row('Virtual Switches', hv.vSwitches) +
            '</div>';

        // Tab 4: Virtual Machines — matches desktop VMs tab
        var vmsContent =
            '<div class="detail-section">' +
                '<div class="detail-section-title">Virtual Machine Summary</div>' +
                row('Total VMs', hv.vmCount) +
                row('Running', hv.vmRunning) +
                row('Stopped', hv.vmStopped) +
            '</div>';

        D.showTabbedPopup(hv.name, [
            { id: 'overview', label: 'Overview', content: overviewContent },
            { id: 'hardware', label: 'Hardware', content: hwContent },
            { id: 'resources', label: 'Resources', content: resourcesContent },
            { id: 'vms', label: 'Virtual Machines', content: vmsContent }
        ]);
    };

    // ── VM Detail ─────────────────────────────────────────────────
    window.showVmDetail = function(vm) {
        // Tab 1: Overview — matches desktop Overview
        var tagsStr = '';
        if (vm.tags && Array.isArray(vm.tags)) {
            tagsStr = vm.tags.join(', ');
        }
        var overviewContent =
            '<div class="detail-section">' +
                '<div class="detail-section-title">VM Information</div>' +
                row('VM Name', vm.name) +
                row('Hostname', vm.hostname) +
                row('Operating System', vm.os) +
                row('Status', vm.status) +
                row('Purpose', vm.purpose) +
                row('Owner', vm.owner) +
            '</div>' +
            '<div class="detail-section">' +
                '<div class="detail-section-title">Host & Runtime</div>' +
                row('Hypervisor', vm.hypervisor) +
                row('Uptime', (vm.uptime || '') + ' days') +
                row('Created Date', vm.createdDate) +
                row('Last Seen', vm.lastSeen) +
                row('Tags', tagsStr) +
            '</div>';
        if (vm.notes) {
            overviewContent += '<div class="detail-section">' +
                '<div class="detail-section-title">Notes</div>' +
                '<div class="detail-row"><span class="detail-value">' + D.esc(vm.notes) + '</span></div>' +
            '</div>';
        }

        // Tab 2: Resources — matches desktop Resources
        var resourcesContent =
            '<div class="detail-section">' +
                '<div class="detail-section-title">Allocated Resources</div>' +
                row('vCPU Cores', vm.cpuCores) +
                row('Memory', vm.memory + ' GB') +
                row('Disk Space', vm.diskTotal + ' GB') +
            '</div>' +
            '<div class="detail-section">' +
                '<div class="detail-section-title">Resource Utilization</div>' +
                D.perfBar('CPU', vm.cpuUsage, '%') +
                D.perfBar('Memory', vm.memoryUsage, '% (' + vm.memoryUsed + ' / ' + vm.memory + ' GB)') +
                D.perfBar('Disk', vm.diskUsage, '% (' + vm.diskUsed + ' / ' + vm.diskTotal + ' GB)') +
                row('Network Throughput', (vm.networkThroughput || '') + ' Mbps') +
            '</div>';

        // Tab 3: Network — matches desktop Network
        var networkContent =
            '<div class="detail-section">' +
                '<div class="detail-section-title">Network Configuration</div>' +
                row('IP Address', vm.ipAddress) +
                row('MAC Address', vm.macAddress) +
                row('VLAN', vm.vlan) +
                row('Network Throughput', (vm.networkThroughput || '') + ' Mbps') +
            '</div>';

        // Tab 4: Backup & Snapshots — matches desktop Backup tab
        var backupContent =
            '<div class="detail-section">' +
                '<div class="detail-section-title">Backup Information</div>' +
                row('Backup Status', vm.backupStatus) +
                row('Last Backup', vm.lastBackup) +
            '</div>' +
            '<div class="detail-section">' +
                '<div class="detail-section-title">Snapshots</div>' +
                row('Snapshot Count', vm.snapshotCount) +
            '</div>';

        D.showTabbedPopup(vm.name, [
            { id: 'overview', label: 'Overview', content: overviewContent },
            { id: 'resources', label: 'Resources', content: resourcesContent },
            { id: 'network', label: 'Network', content: networkContent },
            { id: 'backup', label: 'Backup', content: backupContent }
        ]);
    };

})();
