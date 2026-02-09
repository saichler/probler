// Probler Host & VM Column Definitions
window.ProblerHosts = window.ProblerHosts || {};
ProblerHosts.columns = {};

ProblerHosts.columns.Hypervisor = [
    { key: 'name', label: 'Host Name' },
    { key: 'type', label: 'Type' },
    { key: 'cluster', label: 'Cluster' },
    { key: 'status', label: 'Status' },
    { key: 'cpuUsage', label: 'CPU %', formatter: function(value) { return value + '%'; } },
    { key: 'memoryUsage', label: 'Memory %', formatter: function(value) { return value + '%'; } },
    { key: 'vmCount', label: 'VMs', formatter: function(value, row) { return row.vmRunning + '/' + value; } },
    { key: 'datacenter', label: 'Datacenter' }
];

ProblerHosts.columns.VM = [
    { key: 'name', label: 'VM Name' },
    { key: 'os', label: 'Operating System' },
    { key: 'hypervisor', label: 'Host' },
    { key: 'status', label: 'Status' },
    { key: 'cpuUsage', label: 'CPU %', formatter: function(value) { return value + '%'; } },
    { key: 'memory', label: 'Memory', formatter: function(value, row) { return row.memoryUsed + '/' + value + ' GB'; } },
    { key: 'diskUsage', label: 'Disk %', formatter: function(value) { return value + '%'; } },
    { key: 'ipAddress', label: 'IP Address' }
];
