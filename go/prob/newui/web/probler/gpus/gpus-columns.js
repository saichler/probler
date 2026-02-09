// Probler GPU Column Definitions
window.ProblerGpus = window.ProblerGpus || {};
ProblerGpus.columns = {};

ProblerGpus.columns.GPU = [
    { key: 'name', label: 'GPU Name' },
    { key: 'model', label: 'Model' },
    { key: 'hostName', label: 'Host' },
    { key: 'status', label: 'Status' },
    { key: 'utilization', label: 'GPU %', formatter: function(value) { return value + '%'; } },
    { key: 'memoryUsed', label: 'Memory', formatter: function(value, row) { return value + 'GB / ' + row.memoryTotal + 'GB'; } },
    { key: 'temperature', label: 'Temp', formatter: function(value) { return value + '\u00B0C'; } },
    { key: 'powerDraw', label: 'Power', formatter: function(value, row) { return value + 'W / ' + row.powerLimit + 'W'; } }
];
