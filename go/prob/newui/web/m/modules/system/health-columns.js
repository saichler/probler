/**
 * Mobile System Module - Health Columns & Transform
 * Desktop Equivalent: l8ui/sys/health/l8health.js
 */
(function() {
    'use strict';

    window.MobileSystem = window.MobileSystem || {};

    var col = window.Layer8ColumnFactory;

    MobileSystem.columns = {
        L8Health: [
            ...col.col('service', 'Service'),
            ...col.col('rx', 'RX'),
            ...col.col('rxData', 'RX Data'),
            ...col.col('tx', 'TX'),
            ...col.col('txData', 'TX Data'),
            ...col.col('memory', 'Memory'),
            ...col.col('cpuPercent', 'CPU %'),
            ...col.col('upTime', 'Up Time'),
            ...col.col('lastPulse', 'Last Pulse')
        ]
    };

    MobileSystem.primaryKeys = {
        L8Health: 'service'
    };

    // Store raw data for detail popup
    var healthDataMap = new Map();

    function formatBytes(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        var sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        var i = Math.floor(Math.log(bytes) / Math.log(1024));
        if (i === 0) return bytes + ' B';
        return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
    }

    function formatCPU(cpu) {
        if (!cpu || cpu === 0) return '0.00%';
        return cpu.toFixed(2) + '%';
    }

    function formatUptime(startTime) {
        if (!startTime || startTime === 0 || startTime === '0') return '00:00:00';
        var startMs = typeof startTime === 'string' ? parseInt(startTime, 10) : startTime;
        var sec = Math.floor((Date.now() - startMs) / 1000);
        if (sec < 0) return '00:00:00';
        var h = Math.floor(sec / 3600);
        var m = Math.floor((sec % 3600) / 60);
        var s = sec % 60;
        return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }

    function formatLastPulse(lastMsgTime) {
        if (!lastMsgTime || lastMsgTime === 0 || lastMsgTime === '0') return '00:00:00';
        var lastMs = typeof lastMsgTime === 'string' ? parseInt(lastMsgTime, 10) : lastMsgTime;
        var sec = Math.floor((Date.now() - lastMs) / 1000);
        if (sec < 0) return '00:00:00';
        var h = Math.floor(sec / 3600);
        var m = Math.floor((sec % 3600) / 60);
        var s = sec % 60;
        return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }

    MobileSystem.transforms = {
        L8Health: function(item) {
            if (!item.stats) return null;
            var key = item.alias || 'Unknown';
            healthDataMap.set(key, item);
            return {
                service: key,
                rx: item.stats.rxMsgCount || 0,
                rxData: formatBytes(item.stats.rxDataCont || 0),
                rxDataRaw: item.stats.rxDataCont || 0,
                tx: item.stats.txMsgCount || 0,
                txData: formatBytes(item.stats.txDataCount || 0),
                txDataRaw: item.stats.txDataCount || 0,
                memory: formatBytes(item.stats.memoryUsage || 0),
                memoryRaw: item.stats.memoryUsage || 0,
                cpuPercent: formatCPU(item.stats.cpuUsage || 0),
                cpuPercentRaw: item.stats.cpuUsage || 0,
                upTime: formatUptime(item.startTime),
                lastPulse: formatLastPulse(item.stats.lastMsgTime)
            };
        }
    };

    MobileSystem.getColumns = function(model) {
        return this.columns[model] || null;
    };

    MobileSystem.getTransformData = function(model) {
        return this.transforms[model] || null;
    };

    MobileSystem.getFormDef = function() { return null; };

    MobileSystem.getHealthRawData = function(serviceName) {
        return healthDataMap.get(serviceName);
    };

})();
