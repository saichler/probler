// Network Device Detail Modal - Performance Tab & Charts

// Find performance data from the first physical entry that has it
function findPerformanceData(device) {
    if (!device.physicals) return null;
    var keys = Object.keys(device.physicals);
    for (var i = 0; i < keys.length; i++) {
        var phys = device.physicals[keys[i]];
        if (phys && phys.performance) return phys.performance;
    }
    return null;
}

// Collect temperature time series from all physical components recursively
function collectComponentTemperatures(obj, prefix) {
    var results = [];
    if (!obj || typeof obj !== 'object') return results;
    if (Array.isArray(obj)) {
        obj.forEach(function(item, i) {
            var name = (item && (item.name || item.id)) ? (item.name || item.id) : prefix + ' ' + (i + 1);
            results = results.concat(collectComponentTemperatures(item, name));
        });
        return results;
    }
    // If this object has a temperature time series, collect it
    if (obj.temperature && Array.isArray(obj.temperature) && obj.temperature.length > 0) {
        var label = prefix || obj.name || obj.id || 'Component';
        results.push({ name: label, data: obj.temperature });
    }
    // Recurse into child arrays/objects that may contain components
    Object.keys(obj).forEach(function(k) {
        if (k === 'temperature' || k === 'performance') return;
        var val = obj[k];
        if (Array.isArray(val)) {
            results = results.concat(collectComponentTemperatures(val, k));
        } else if (val && typeof val === 'object' && !Array.isArray(val)) {
            var childName = val.name || val.id || k;
            results = results.concat(collectComponentTemperatures(val, childName));
        }
    });
    return results;
}

// Build Performance tab content with sub-tabs
function buildPerformanceTab(device) {
    var perf = findPerformanceData(device);
    var hasComponentTemps = false;
    if (device.physicals) {
        var keys = Object.keys(device.physicals);
        for (var i = 0; i < keys.length; i++) {
            if (collectComponentTemperatures(device.physicals[keys[i]], '').length > 0) {
                hasComponentTemps = true;
                break;
            }
        }
    }
    if (!perf && !hasComponentTemps) {
        return '<div class="probler-popup-tab-pane" data-pane="performance">' +
            '<p style="color: var(--layer8d-text-muted, #718096); text-align: center; padding: 40px;">' +
            'No performance data available</p></div>';
    }
    var esc = Layer8DUtils.escapeHtml;
    var html = '<div class="probler-popup-tab-pane" data-pane="performance">';

    // Sub-tab navigation
    html += '<div class="perf-sub-tabs">';
    if (perf) {
        html += '<div class="perf-sub-tab active" data-perf-tab="summary">Summary</div>' +
            '<div class="perf-sub-tab" data-perf-tab="cpu">CPU</div>' +
            '<div class="perf-sub-tab" data-perf-tab="memory">Memory</div>';
    }
    if (hasComponentTemps) {
        html += '<div class="perf-sub-tab' + (perf ? '' : ' active') + '" data-perf-tab="temperature">Temperature</div>';
    }
    html += '</div>';

    // Sub-tab panes
    html += '<div class="perf-sub-content">';
    if (perf) {
        // Summary pane
        html += '<div class="perf-sub-pane active" data-perf-pane="summary">' +
            '<div class="detail-grid">' +
                '<div class="detail-section">' +
                    '<div class="detail-section-title">Summary</div>' +
                    '<div class="detail-row">' +
                        '<span class="detail-label">Uptime</span>' +
                        '<span class="detail-value">' + esc(perf.uptime || '-') + '</span>' +
                    '</div>' +
                    '<div class="detail-row">' +
                        '<span class="detail-label">Load Average</span>' +
                        '<span class="detail-value">' + (perf.loadAverage || 0) + '</span>' +
                    '</div>' +
                    '<div class="detail-row">' +
                        '<span class="detail-label">Active Connections</span>' +
                        '<span class="detail-value">' + (perf.activeConnections || 0) + '</span>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';
        // CPU pane
        html += '<div class="perf-sub-pane" data-perf-pane="cpu">' +
            '<div id="perf-cpu-chart" style="min-height:200px;"></div>' +
        '</div>';
        // Memory pane
        html += '<div class="perf-sub-pane" data-perf-pane="memory">' +
            '<div id="perf-memory-chart" style="min-height:200px;"></div>' +
        '</div>';
    }
    if (hasComponentTemps) {
        html += '<div class="perf-sub-pane' + (perf ? '' : ' active') + '" data-perf-pane="temperature">' +
            '<div id="perf-temps-container"></div>' +
        '</div>';
    }
    html += '</div></div>';
    return html;
}

// Format a Unix-seconds timestamp for chart X-axis labels
function formatChartTimestamp(stamp, spanHours) {
    var d = new Date(stamp * 1000);
    var hh = String(d.getHours()).padStart(2, '0');
    var mm = String(d.getMinutes()).padStart(2, '0');
    if (spanHours <= 24) return hh + ':' + mm;
    var mon = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return mon + '/' + day + ' ' + hh + ':' + mm;
}

// Format bytes/KB into a human-readable string
function formatMemoryValue(kb) {
    if (kb < 1024) return kb + ' KB';
    if (kb < 1048576) return (kb / 1024).toFixed(1) + ' MB';
    return (kb / 1048576).toFixed(2) + ' GB';
}

// Render a time series into a chart inside the given container element
// valueTransform: optional function to transform each point's value
function renderTimeSeriesChart(containerId, series, title, valueTransform) {
    if (!series || !series.length) return;
    var container = document.getElementById(containerId);
    if (!container) return;

    var firstStamp = series[0].stamp || 0;
    var lastStamp = series[series.length - 1].stamp || 0;
    var spanHours = (lastStamp - firstStamp) / 3600;

    var chartData = series.map(function(pt) {
        var val = valueTransform ? valueTransform(pt.value) : pt.value;
        return {
            label: formatChartTimestamp(pt.stamp, spanHours),
            value: val
        };
    });

    var chart = new Layer8DChart({
        containerId: containerId,
        viewConfig: {
            chartType: 'line',
            title: title,
            categoryField: 'label',
            valueField: 'value',
            aggregation: 'avg'
        }
    });
    chart.init();
    chart.setData(chartData, chartData.length);
}

// Render the CPU chart
function renderCpuChart(perf) {
    renderTimeSeriesChart('perf-cpu-chart', perf.cpuUsagePercent, 'CPU Usage %');
}

// Render the Memory chart with auto-detection of absolute vs percentage
function renderMemoryChart(perf) {
    var memSeries = perf.memoryUsagePercent;
    if (!memSeries || !memSeries.length) return;
    var maxMem = 0;
    for (var i = 0; i < memSeries.length; i++) {
        if (memSeries[i].value > maxMem) maxMem = memSeries[i].value;
    }
    if (maxMem > 100) {
        var memTitle = 'Memory Usage (' + formatMemoryValue(maxMem) + ' peak)';
        renderTimeSeriesChart('perf-memory-chart', memSeries, memTitle, function(v) {
            return Math.round(v / 1024);
        });
    } else {
        renderTimeSeriesChart('perf-memory-chart', memSeries, 'Memory Usage %');
    }
}

// Render all component temperature charts
function renderTemperatureCharts(device) {
    var tempsContainer = document.getElementById('perf-temps-container');
    if (!tempsContainer || !device.physicals) return;
    var allTemps = [];
    Object.keys(device.physicals).forEach(function(key) {
        allTemps = allTemps.concat(collectComponentTemperatures(device.physicals[key], ''));
    });
    if (allTemps.length === 0) return;
    allTemps.forEach(function(entry, i) {
        var chartId = 'perf-comp-temp-' + i;
        var div = document.createElement('div');
        div.id = chartId;
        div.style.marginTop = '16px';
        div.style.minHeight = '200px';
        tempsContainer.appendChild(div);
        renderTimeSeriesChart(chartId, entry.data, entry.name + ' Temperature (\u00B0C)');
    });
}

// Initialize performance sub-tabs and lazy chart rendering
function initializePerformanceCharts(device) {
    setTimeout(function() {
        var container = document.querySelector('.perf-sub-tabs');
        if (!container) return;

        var perf = findPerformanceData(device);
        var rendered = {};

        // Render the initially active sub-tab's chart
        function renderSubTab(tabId) {
            if (rendered[tabId]) return;
            rendered[tabId] = true;
            if (typeof Layer8DChart === 'undefined') return;
            if (tabId === 'cpu' && perf) renderCpuChart(perf);
            if (tabId === 'memory' && perf) renderMemoryChart(perf);
            if (tabId === 'temperature') renderTemperatureCharts(device);
        }

        // Sub-tab click handler
        container.addEventListener('click', function(e) {
            var tab = e.target.closest('.perf-sub-tab');
            if (!tab) return;
            var tabId = tab.dataset.perfTab;
            if (!tabId) return;

            container.querySelectorAll('.perf-sub-tab').forEach(function(t) {
                t.classList.remove('active');
            });
            var content = container.parentElement.querySelector('.perf-sub-content');
            if (content) {
                content.querySelectorAll('.perf-sub-pane').forEach(function(p) {
                    p.classList.remove('active');
                });
                var pane = content.querySelector('.perf-sub-pane[data-perf-pane="' + tabId + '"]');
                if (pane) pane.classList.add('active');
            }
            tab.classList.add('active');

            // Lazy-render chart on first visit
            setTimeout(function() { renderSubTab(tabId); }, 50);
        });
    }, 100);
}
