// GPU Dashboard Functions

// GPU data storage
let gpuData = [];
let filteredGpuData = [];
let gpuMetricsHistory = {};
let gpuUpdateInterval = null;
let currentGpuPage = 1;
let gpusPerPage = 50;
let totalGpuPages = 1;
let currentGpuSortColumn = null;
let currentGpuSortDirection = 'asc';
let gpuColumnFilters = {};

// GPU Dashboard initialization
function initGpuDashboard() {
    loadGpuData();
    startGpuMonitoring();
}

// Load GPU data from API
async function loadGpuData() {
    showLoading('gpuLoading');

    try {
        // Simulate API call - replace with actual endpoint
        const response = await fetch('/probler/0/GpuDevices', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch GPU data');
        }

        const data = await response.json();
        gpuData = processGpuData(data);
        renderGpuDashboard();

    } catch (error) {
        console.error('Error loading GPU data:', error);
        // Use mock data for demonstration
        gpuData = generateMockGpuData();
        renderGpuDashboard();
    } finally {
        hideLoading('gpuLoading');
    }
}

// Process GPU data from API
function processGpuData(apiData) {
    if (apiData && apiData.gpus && Array.isArray(apiData.gpus)) {
        return apiData.gpus.map(gpu => ({
            id: gpu.id,
            name: gpu.name,
            model: gpu.model,
            hostname: gpu.hostname,
            rack: gpu.rack,
            datacenter: gpu.datacenter,
            temperature: gpu.temperature,
            power: gpu.power,
            utilization: gpu.utilization,
            memory: gpu.memory,
            memoryTotal: gpu.memoryTotal,
            memoryUsed: gpu.memoryUsed,
            memoryFree: gpu.memoryFree,
            fanSpeed: gpu.fanSpeed,
            pcieBandwidth: gpu.pcieBandwidth,
            status: gpu.status,
            processes: gpu.processes || [],
            driver: gpu.driver,
            cuda: gpu.cuda,
            computeCapability: gpu.computeCapability
        }));
    }
    return [];
}

// Generate mock GPU data for demonstration
function generateMockGpuData() {
    const models = ['NVIDIA A100', 'NVIDIA V100', 'NVIDIA H100', 'NVIDIA A40', 'NVIDIA RTX 4090'];
    const datacenters = ['DC-East', 'DC-West', 'DC-Central', 'DC-North'];
    const statuses = ['healthy', 'warning', 'critical', 'offline'];

    return Array.from({length: 32}, (_, i) => ({
        id: `gpu-${i + 1}`,
        name: `GPU-${String(i + 1).padStart(3, '0')}`,
        model: models[Math.floor(Math.random() * models.length)],
        hostname: `node-${Math.floor(i / 8) + 1}`,
        rack: `R${Math.floor(i / 16) + 1}`,
        datacenter: datacenters[Math.floor(i / 8)],
        temperature: Math.floor(Math.random() * 40) + 40,
        power: Math.floor(Math.random() * 200) + 150,
        utilization: Math.floor(Math.random() * 100),
        memory: Math.floor(Math.random() * 80) + 20,
        memoryTotal: i < 8 ? 80 : i < 16 ? 40 : 24,
        memoryUsed: Math.floor(Math.random() * 60) + 10,
        memoryFree: 0,
        fanSpeed: Math.floor(Math.random() * 60) + 40,
        pcieBandwidth: Math.floor(Math.random() * 32) + 16,
        status: Math.random() > 0.8 ? statuses[Math.floor(Math.random() * statuses.length)] : 'healthy',
        processes: Math.floor(Math.random() * 5),
        driver: '535.129.03',
        cuda: '12.2',
        computeCapability: i < 16 ? '8.0' : '7.0'
    }));
}

// Render GPU Dashboard
function renderGpuDashboard() {
    // Update statistics
    updateGpuStats();

    // Apply filters and sorting
    applyGpuFiltersAndSorting();

    // Render GPU table view
    renderGpuTable();

    // Update charts
    updateGpuCharts();
}

// Update GPU statistics
function updateGpuStats() {
    const totalGpus = gpuData.length;
    const healthyGpus = gpuData.filter(gpu => gpu.status === 'healthy').length;
    const warningGpus = gpuData.filter(gpu => gpu.status === 'warning').length;
    const criticalGpus = gpuData.filter(gpu => gpu.status === 'critical').length;
    const offlineGpus = gpuData.filter(gpu => gpu.status === 'offline').length;

    const avgUtilization = gpuData.reduce((sum, gpu) => sum + gpu.utilization, 0) / totalGpus;
    const avgTemperature = gpuData.reduce((sum, gpu) => sum + gpu.temperature, 0) / totalGpus;
    const totalPower = gpuData.reduce((sum, gpu) => sum + gpu.power, 0);

    document.getElementById('totalGpus').textContent = totalGpus;
    document.getElementById('healthyGpus').textContent = healthyGpus;
    document.getElementById('warningGpus').textContent = warningGpus;
    document.getElementById('criticalGpus').textContent = criticalGpus;
    document.getElementById('avgUtilization').textContent = `${avgUtilization.toFixed(1)}%`;
    document.getElementById('avgTemperature').textContent = `${avgTemperature.toFixed(1)}°C`;
    document.getElementById('totalPower').textContent = `${(totalPower / 1000).toFixed(1)} kW`;
    document.getElementById('gpuEfficiency').textContent = `${(avgUtilization * 0.95).toFixed(1)}%`;
}

// Apply filters and sorting to GPU data
function applyGpuFiltersAndSorting() {
    // Start with all GPUs
    filteredGpuData = [...gpuData];

    // Apply column filters
    Object.keys(gpuColumnFilters).forEach(column => {
        const filterValue = gpuColumnFilters[column].toLowerCase();
        if (filterValue) {
            filteredGpuData = filteredGpuData.filter(gpu => {
                let value = '';
                switch(column) {
                    case 'name': value = gpu.name; break;
                    case 'model': value = gpu.model; break;
                    case 'hostname': value = gpu.hostname; break;
                    case 'datacenter': value = gpu.datacenter; break;
                    case 'rack': value = gpu.rack; break;
                    case 'status': value = gpu.status; break;
                    case 'utilization': value = gpu.utilization.toString(); break;
                    case 'memory': value = `${gpu.memoryUsed}/${gpu.memoryTotal}`; break;
                    case 'temperature': value = gpu.temperature.toString(); break;
                    case 'power': value = gpu.power.toString(); break;
                    case 'fanSpeed': value = gpu.fanSpeed.toString(); break;
                    case 'processes': value = gpu.processes.toString(); break;
                    case 'driver': value = gpu.driver; break;
                }
                return value.toLowerCase().includes(filterValue);
            });
        }
    });

    // Apply sorting
    if (currentGpuSortColumn) {
        filteredGpuData.sort((a, b) => {
            let aValue, bValue;

            switch(currentGpuSortColumn) {
                case 'name': aValue = a.name; bValue = b.name; break;
                case 'model': aValue = a.model; bValue = b.model; break;
                case 'hostname': aValue = a.hostname; bValue = b.hostname; break;
                case 'datacenter': aValue = a.datacenter; bValue = b.datacenter; break;
                case 'rack': aValue = a.rack; bValue = b.rack; break;
                case 'status': aValue = a.status; bValue = b.status; break;
                case 'utilization': aValue = a.utilization; bValue = b.utilization; break;
                case 'memory': aValue = a.memory; bValue = b.memory; break;
                case 'temperature': aValue = a.temperature; bValue = b.temperature; break;
                case 'power': aValue = a.power; bValue = b.power; break;
                case 'fanSpeed': aValue = a.fanSpeed; bValue = b.fanSpeed; break;
                case 'processes': aValue = a.processes; bValue = b.processes; break;
                case 'driver': aValue = a.driver; bValue = b.driver; break;
                default: return 0;
            }

            // Handle numeric comparisons
            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return currentGpuSortDirection === 'asc' ? aValue - bValue : bValue - aValue;
            }

            // Handle string comparisons
            const comparison = String(aValue).localeCompare(String(bValue));
            return currentGpuSortDirection === 'asc' ? comparison : -comparison;
        });
    }
}

// Render GPU table view
function renderGpuTable() {
    const tableContainer = document.getElementById('gpuTableContainer');
    if (!tableContainer) return;

    // Calculate pagination
    totalGpuPages = Math.ceil(filteredGpuData.length / gpusPerPage);
    const startIndex = (currentGpuPage - 1) * gpusPerPage;
    const endIndex = Math.min(startIndex + gpusPerPage, filteredGpuData.length);
    const pageData = filteredGpuData.slice(startIndex, endIndex);

    // Create table HTML
    let tableHTML = `
        <div class="gpu-table-controls">
            <div class="table-control-group">
                <label>Show:</label>
                <select class="per-page-select" onchange="changeGpusPerPage(this.value)">
                    <option value="25" ${gpusPerPage === 25 ? 'selected' : ''}>25</option>
                    <option value="50" ${gpusPerPage === 50 ? 'selected' : ''}>50</option>
                    <option value="100" ${gpusPerPage === 100 ? 'selected' : ''}>100</option>
                    <option value="200" ${gpusPerPage === 200 ? 'selected' : ''}>200</option>
                    <option value="all">All</option>
                </select>
                <span>GPUs per page</span>
            </div>
            <div class="gpu-count-display">
                Showing ${startIndex + 1}-${endIndex} of ${filteredGpuData.length} GPUs
            </div>
        </div>

        <div class="gpu-table-wrapper">
            <table class="gpu-table" id="gpuTable">
                <thead>
                    <tr class="header-row">
                        <th class="sortable" onclick="sortGpusByColumn('status')">
                            Status ${getSortIndicator('status')}
                        </th>
                        <th class="sortable" onclick="sortGpusByColumn('name')">
                            GPU Name ${getSortIndicator('name')}
                        </th>
                        <th class="sortable" onclick="sortGpusByColumn('model')">
                            Model ${getSortIndicator('model')}
                        </th>
                        <th class="sortable" onclick="sortGpusByColumn('hostname')">
                            Host ${getSortIndicator('hostname')}
                        </th>
                        <th class="sortable" onclick="sortGpusByColumn('datacenter')">
                            Datacenter ${getSortIndicator('datacenter')}
                        </th>
                        <th class="sortable" onclick="sortGpusByColumn('rack')">
                            Rack ${getSortIndicator('rack')}
                        </th>
                        <th class="sortable gpu-metric-header" onclick="sortGpusByColumn('utilization')">
                            Util % ${getSortIndicator('utilization')}
                        </th>
                        <th class="sortable gpu-metric-header" onclick="sortGpusByColumn('memory')">
                            Memory ${getSortIndicator('memory')}
                        </th>
                        <th class="sortable gpu-metric-header" onclick="sortGpusByColumn('temperature')">
                            Temp °C ${getSortIndicator('temperature')}
                        </th>
                        <th class="sortable gpu-metric-header" onclick="sortGpusByColumn('power')">
                            Power W ${getSortIndicator('power')}
                        </th>
                        <th class="sortable gpu-metric-header" onclick="sortGpusByColumn('fanSpeed')">
                            Fan % ${getSortIndicator('fanSpeed')}
                        </th>
                        <th class="sortable" onclick="sortGpusByColumn('processes')">
                            Procs ${getSortIndicator('processes')}
                        </th>
                        <th class="sortable" onclick="sortGpusByColumn('driver')">
                            Driver ${getSortIndicator('driver')}
                        </th>
                    </tr>
                    <tr class="filter-row">
                        <th>
                            <input type="text" class="column-filter" placeholder="Filter..."
                                   oninput="filterGpusByColumn('status', this.value)">
                        </th>
                        <th>
                            <input type="text" class="column-filter" placeholder="Filter..."
                                   oninput="filterGpusByColumn('name', this.value)">
                        </th>
                        <th>
                            <input type="text" class="column-filter" placeholder="Filter..."
                                   oninput="filterGpusByColumn('model', this.value)">
                        </th>
                        <th>
                            <input type="text" class="column-filter" placeholder="Filter..."
                                   oninput="filterGpusByColumn('hostname', this.value)">
                        </th>
                        <th>
                            <input type="text" class="column-filter" placeholder="Filter..."
                                   oninput="filterGpusByColumn('datacenter', this.value)">
                        </th>
                        <th>
                            <input type="text" class="column-filter" placeholder="Filter..."
                                   oninput="filterGpusByColumn('rack', this.value)">
                        </th>
                        <th>
                            <input type="text" class="column-filter" placeholder=">"
                                   oninput="filterGpusByColumn('utilization', this.value)">
                        </th>
                        <th>
                            <input type="text" class="column-filter" placeholder="Filter..."
                                   oninput="filterGpusByColumn('memory', this.value)">
                        </th>
                        <th>
                            <input type="text" class="column-filter" placeholder=">"
                                   oninput="filterGpusByColumn('temperature', this.value)">
                        </th>
                        <th>
                            <input type="text" class="column-filter" placeholder=">"
                                   oninput="filterGpusByColumn('power', this.value)">
                        </th>
                        <th>
                            <input type="text" class="column-filter" placeholder=">"
                                   oninput="filterGpusByColumn('fanSpeed', this.value)">
                        </th>
                        <th>
                            <input type="text" class="column-filter" placeholder="Filter..."
                                   oninput="filterGpusByColumn('processes', this.value)">
                        </th>
                        <th>
                            <input type="text" class="column-filter" placeholder="Filter..."
                                   oninput="filterGpusByColumn('driver', this.value)">
                        </th>
                    </tr>
                </thead>
                <tbody id="gpuTableBody">
    `;

    // Add table rows
    pageData.forEach(gpu => {
        const statusClass = `gpu-status-${gpu.status}`;
        const utilizationClass = gpu.utilization > 80 ? 'high' : gpu.utilization > 50 ? 'medium' : 'low';
        const tempClass = gpu.temperature > 75 ? 'critical' : gpu.temperature > 65 ? 'warning' : 'normal';
        const powerClass = gpu.power > 300 ? 'high' : gpu.power > 200 ? 'medium' : 'normal';

        tableHTML += `
            <tr class="gpu-row" onclick="showGpuDetails(${JSON.stringify(gpu).replace(/"/g, '&quot;')})">
                <td class="${statusClass}">
                    <span class="status-indicator">${getGpuStatusIcon(gpu.status)}</span>
                    ${gpu.status.toUpperCase()}
                </td>
                <td class="gpu-name">${gpu.name}</td>
                <td>${gpu.model}</td>
                <td>${gpu.hostname}</td>
                <td>${gpu.datacenter}</td>
                <td>${gpu.rack}</td>
                <td class="gpu-metric">
                    <div class="inline-metric-bar">
                        <div class="inline-metric-fill utilization-${utilizationClass}" style="width: ${gpu.utilization}%"></div>
                    </div>
                    <span class="metric-text">${gpu.utilization}%</span>
                </td>
                <td class="gpu-metric">
                    <div class="inline-metric-bar">
                        <div class="inline-metric-fill" style="width: ${gpu.memory}%"></div>
                    </div>
                    <span class="metric-text">${gpu.memoryUsed}/${gpu.memoryTotal}GB</span>
                </td>
                <td class="gpu-metric temp-${tempClass}">${gpu.temperature}</td>
                <td class="gpu-metric power-${powerClass}">${gpu.power}</td>
                <td class="gpu-metric">${gpu.fanSpeed}%</td>
                <td>${gpu.processes}</td>
                <td class="gpu-driver">${gpu.driver}</td>
            </tr>
        `;
    });

    tableHTML += `
                </tbody>
            </table>
        </div>
    `;

    // Add pagination controls
    tableHTML += createGpuPaginationControls();

    tableContainer.innerHTML = tableHTML;
}

// Get sort indicator
function getSortIndicator(column) {
    if (currentGpuSortColumn === column) {
        return currentGpuSortDirection === 'asc' ? '▲' : '▼';
    }
    return '';
}

// Sort GPUs by column
function sortGpusByColumn(column) {
    if (currentGpuSortColumn === column) {
        currentGpuSortDirection = currentGpuSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentGpuSortColumn = column;
        currentGpuSortDirection = 'asc';
    }

    currentGpuPage = 1; // Reset to first page
    renderGpuDashboard();
}

// Filter GPUs by column
function filterGpusByColumn(column, value) {
    if (value.trim() === '') {
        delete gpuColumnFilters[column];
    } else {
        gpuColumnFilters[column] = value;
    }

    currentGpuPage = 1; // Reset to first page
    renderGpuDashboard();
}

// Change GPUs per page
function changeGpusPerPage(value) {
    if (value === 'all') {
        gpusPerPage = filteredGpuData.length || 1000;
    } else {
        gpusPerPage = parseInt(value);
    }
    currentGpuPage = 1;
    renderGpuDashboard();
}

// Create GPU pagination controls
function createGpuPaginationControls() {
    if (totalGpuPages <= 1) return '';

    let paginationHTML = '<div class="gpu-pagination">';

    // Previous button
    paginationHTML += `
        <button class="pagination-btn" ${currentGpuPage === 1 ? 'disabled' : ''}
                onclick="goToGpuPage(${currentGpuPage - 1})">
            ‹ Previous
        </button>
    `;

    // Page numbers
    const startPage = Math.max(1, currentGpuPage - 2);
    const endPage = Math.min(totalGpuPages, currentGpuPage + 2);

    if (startPage > 1) {
        paginationHTML += `<button class="pagination-btn" onclick="goToGpuPage(1)">1</button>`;
        if (startPage > 2) {
            paginationHTML += `<span class="pagination-ellipsis">...</span>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button class="pagination-btn ${i === currentGpuPage ? 'active' : ''}"
                    onclick="goToGpuPage(${i})">
                ${i}
            </button>
        `;
    }

    if (endPage < totalGpuPages) {
        if (endPage < totalGpuPages - 1) {
            paginationHTML += `<span class="pagination-ellipsis">...</span>`;
        }
        paginationHTML += `<button class="pagination-btn" onclick="goToGpuPage(${totalGpuPages})">${totalGpuPages}</button>`;
    }

    // Next button
    paginationHTML += `
        <button class="pagination-btn" ${currentGpuPage === totalGpuPages ? 'disabled' : ''}
                onclick="goToGpuPage(${currentGpuPage + 1})">
            Next ›
        </button>
    `;

    paginationHTML += '</div>';
    return paginationHTML;
}

// Go to specific GPU page
function goToGpuPage(page) {
    currentGpuPage = Math.max(1, Math.min(page, totalGpuPages));
    renderGpuTable();

    // Scroll to top of table
    const tableContainer = document.getElementById('gpuTableContainer');
    if (tableContainer) {
        tableContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Get GPU status icon
function getGpuStatusIcon(status) {
    const icons = {
        'healthy': '✅',
        'warning': '⚠️',
        'critical': '🔴',
        'offline': '⭕'
    };
    return icons[status] || '❓';
}

// Show GPU details modal
function showGpuDetails(gpu) {
    const modalTitle = document.getElementById('gpuModalTitle');
    const modalContent = document.getElementById('gpuModalContent');

    modalTitle.textContent = `${gpu.name} - ${gpu.model}`;

    modalContent.innerHTML = `
        <div class="gpu-details-grid">
            <div class="gpu-detail-section">
                <h3>System Information</h3>
                <div class="detail-item">
                    <span class="detail-label">GPU ID:</span>
                    <span class="detail-value">${gpu.id}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Model:</span>
                    <span class="detail-value">${gpu.model}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Hostname:</span>
                    <span class="detail-value">${gpu.hostname}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Location:</span>
                    <span class="detail-value">${gpu.datacenter} / ${gpu.rack}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Driver Version:</span>
                    <span class="detail-value">${gpu.driver}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">CUDA Version:</span>
                    <span class="detail-value">${gpu.cuda}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Compute Capability:</span>
                    <span class="detail-value">${gpu.computeCapability}</span>
                </div>
            </div>

            <div class="gpu-detail-section">
                <h3>Performance Metrics</h3>
                <div class="detail-item">
                    <span class="detail-label">GPU Utilization:</span>
                    <span class="detail-value">${gpu.utilization}%</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Memory Usage:</span>
                    <span class="detail-value">${gpu.memoryUsed} / ${gpu.memoryTotal} GB (${gpu.memory}%)</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Temperature:</span>
                    <span class="detail-value">${gpu.temperature}°C</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Power Draw:</span>
                    <span class="detail-value">${gpu.power}W</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Fan Speed:</span>
                    <span class="detail-value">${gpu.fanSpeed}%</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">PCIe Bandwidth:</span>
                    <span class="detail-value">${gpu.pcieBandwidth} GB/s</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Active Processes:</span>
                    <span class="detail-value">${gpu.processes}</span>
                </div>
            </div>
        </div>

        <div class="gpu-detail-charts">
            <canvas id="gpuUtilizationChart" width="400" height="200"></canvas>
        </div>
    `;

    // Show modal
    document.getElementById('gpuDetailsModal').style.display = 'block';

    // Draw utilization chart
    drawGpuUtilizationChart(gpu);
}

// Draw GPU utilization chart
function drawGpuUtilizationChart(gpu) {
    const canvas = document.getElementById('gpuUtilizationChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Generate sample data points
    const dataPoints = 50;
    const data = Array.from({length: dataPoints}, (_, i) =>
        gpu.utilization + (Math.random() - 0.5) * 20
    );

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;

    for (let i = 0; i <= 5; i++) {
        const y = (height / 5) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }

    // Draw line chart
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.beginPath();

    data.forEach((value, index) => {
        const x = (width / (dataPoints - 1)) * index;
        const y = height - (value / 100) * height;

        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });

    ctx.stroke();

    // Add labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '12px monospace';
    ctx.fillText('100%', 5, 15);
    ctx.fillText('0%', 5, height - 5);
    ctx.fillText('GPU Utilization (last 5 minutes)', width / 2 - 100, height - 10);
}

// Update GPU charts
function updateGpuCharts() {
    updateUtilizationHeatmap();
    updatePowerConsumptionChart();
    updateTemperatureDistribution();
}

// Update utilization heatmap
function updateUtilizationHeatmap() {
    const heatmapContainer = document.getElementById('utilizationHeatmap');
    if (!heatmapContainer) return;

    heatmapContainer.innerHTML = '';

    // Group GPUs by datacenter and rack
    const grouped = {};
    gpuData.forEach(gpu => {
        const key = `${gpu.datacenter}-${gpu.rack}`;
        if (!grouped[key]) {
            grouped[key] = [];
        }
        grouped[key].push(gpu);
    });

    // Create heatmap grid
    Object.entries(grouped).forEach(([location, gpus]) => {
        const locationDiv = document.createElement('div');
        locationDiv.className = 'heatmap-location';

        const title = document.createElement('div');
        title.className = 'heatmap-title';
        title.textContent = location;
        locationDiv.appendChild(title);

        const grid = document.createElement('div');
        grid.className = 'heatmap-grid';

        gpus.forEach(gpu => {
            const cell = document.createElement('div');
            cell.className = 'heatmap-cell';
            const intensity = gpu.utilization / 100;
            cell.style.backgroundColor = `rgba(0, 255, 136, ${intensity})`;
            cell.title = `${gpu.name}: ${gpu.utilization}%`;
            grid.appendChild(cell);
        });

        locationDiv.appendChild(grid);
        heatmapContainer.appendChild(locationDiv);
    });
}

// Update power consumption chart
function updatePowerConsumptionChart() {
    const chartContainer = document.getElementById('powerChart');
    if (!chartContainer) return;

    // Calculate power by datacenter
    const powerByDc = {};
    gpuData.forEach(gpu => {
        if (!powerByDc[gpu.datacenter]) {
            powerByDc[gpu.datacenter] = 0;
        }
        powerByDc[gpu.datacenter] += gpu.power;
    });

    chartContainer.innerHTML = '';

    Object.entries(powerByDc).forEach(([dc, power]) => {
        const bar = document.createElement('div');
        bar.className = 'power-bar';

        const label = document.createElement('div');
        label.className = 'power-label';
        label.textContent = dc;

        const value = document.createElement('div');
        value.className = 'power-value';
        value.textContent = `${(power / 1000).toFixed(1)} kW`;

        const fill = document.createElement('div');
        fill.className = 'power-fill';
        const maxPower = Math.max(...Object.values(powerByDc));
        fill.style.width = `${(power / maxPower) * 100}%`;

        bar.appendChild(label);
        bar.appendChild(fill);
        bar.appendChild(value);
        chartContainer.appendChild(bar);
    });
}

// Update temperature distribution
function updateTemperatureDistribution() {
    const chartContainer = document.getElementById('temperatureChart');
    if (!chartContainer) return;

    // Create temperature ranges
    const ranges = {
        'Normal (< 60°C)': 0,
        'Warm (60-70°C)': 0,
        'Hot (70-80°C)': 0,
        'Critical (> 80°C)': 0
    };

    gpuData.forEach(gpu => {
        if (gpu.temperature < 60) ranges['Normal (< 60°C)']++;
        else if (gpu.temperature < 70) ranges['Warm (60-70°C)']++;
        else if (gpu.temperature < 80) ranges['Hot (70-80°C)']++;
        else ranges['Critical (> 80°C)']++;
    });

    chartContainer.innerHTML = '';

    Object.entries(ranges).forEach(([range, count]) => {
        const item = document.createElement('div');
        item.className = 'temp-range-item';

        const label = document.createElement('div');
        label.className = 'temp-range-label';
        label.textContent = `${range}: ${count} GPUs`;

        const bar = document.createElement('div');
        bar.className = 'temp-range-bar';
        const percentage = (count / gpuData.length) * 100;
        bar.style.width = `${percentage}%`;

        let barColor = '#28a745';
        if (range.includes('Warm')) barColor = '#ffc107';
        if (range.includes('Hot')) barColor = '#fd7e14';
        if (range.includes('Critical')) barColor = '#dc3545';
        bar.style.backgroundColor = barColor;

        item.appendChild(label);
        item.appendChild(bar);
        chartContainer.appendChild(item);
    });
}

// Start GPU monitoring
function startGpuMonitoring() {
    // Clear existing interval
    if (gpuUpdateInterval) {
        clearInterval(gpuUpdateInterval);
    }

    // Update every 5 seconds
    gpuUpdateInterval = setInterval(() => {
        updateGpuMetrics();
    }, 5000);
}

// Stop GPU monitoring
function stopGpuMonitoring() {
    if (gpuUpdateInterval) {
        clearInterval(gpuUpdateInterval);
        gpuUpdateInterval = null;
    }
}

// Update GPU metrics
function updateGpuMetrics() {
    // Simulate metric updates
    gpuData.forEach(gpu => {
        // Update utilization
        gpu.utilization = Math.max(0, Math.min(100,
            gpu.utilization + (Math.random() - 0.5) * 10));

        // Update temperature based on utilization
        gpu.temperature = Math.max(40, Math.min(85,
            40 + gpu.utilization * 0.4 + (Math.random() - 0.5) * 5));

        // Update power based on utilization
        gpu.power = Math.floor(150 + gpu.utilization * 2 + (Math.random() - 0.5) * 20);

        // Update memory
        gpu.memory = Math.max(20, Math.min(95,
            gpu.memory + (Math.random() - 0.5) * 5));
        gpu.memoryUsed = Math.floor(gpu.memoryTotal * gpu.memory / 100);
        gpu.memoryFree = gpu.memoryTotal - gpu.memoryUsed;

        // Update fan speed based on temperature
        gpu.fanSpeed = Math.max(30, Math.min(100,
            Math.floor(30 + (gpu.temperature - 40) * 1.5)));

        // Randomly update status
        if (Math.random() > 0.98) {
            const statuses = ['healthy', 'warning', 'critical'];
            gpu.status = statuses[Math.floor(Math.random() * statuses.length)];
        }
    });

    // Re-render dashboard
    renderGpuDashboard();
}

// Filter GPUs by quick filters
function filterGpus(criteria) {
    // Clear column filters
    gpuColumnFilters = {};

    // Clear filter inputs
    document.querySelectorAll('.gpu-table .column-filter').forEach(input => {
        input.value = '';
    });

    // Apply quick filter
    switch (criteria) {
        case 'all':
            // No additional filtering needed
            break;
        case 'healthy':
            gpuColumnFilters['status'] = 'healthy';
            break;
        case 'warning':
            gpuColumnFilters['status'] = 'warning';
            break;
        case 'critical':
            gpuColumnFilters['status'] = 'critical';
            break;
        case 'high-util':
            // Custom filter for high utilization
            filteredGpuData = gpuData.filter(gpu => gpu.utilization > 80);
            renderGpuDashboard();
            return;
        case 'high-temp':
            // Custom filter for high temperature
            filteredGpuData = gpuData.filter(gpu => gpu.temperature > 75);
            renderGpuDashboard();
            return;
    }

    currentGpuPage = 1;
    renderGpuDashboard();

    // Update active button
    document.querySelectorAll('.gpu-filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
}

// Search GPUs
function searchGpus(searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') {
        filteredGpuData = [...gpuData];
    } else {
        const term = searchTerm.toLowerCase();
        filteredGpuData = gpuData.filter(gpu =>
            gpu.name.toLowerCase().includes(term) ||
            gpu.model.toLowerCase().includes(term) ||
            gpu.hostname.toLowerCase().includes(term) ||
            gpu.datacenter.toLowerCase().includes(term) ||
            gpu.rack.toLowerCase().includes(term)
        );
    }

    currentGpuPage = 1;
    renderGpuDashboard();
}

// Refresh GPU data
function refreshGpuData() {
    console.log('Refreshing GPU data...');
    loadGpuData();
}

// Close GPU details modal
function closeGpuDetailsModal() {
    document.getElementById('gpuDetailsModal').style.display = 'none';
}

// Toggle GPU auto-refresh
let gpuAutoRefresh = false;
function toggleGpuAutoRefresh() {
    gpuAutoRefresh = !gpuAutoRefresh;
    const btn = document.getElementById('gpuAutoRefreshBtn');

    if (gpuAutoRefresh) {
        btn.textContent = '⏸️ Pause Updates';
        btn.classList.add('active');
        startGpuMonitoring();
    } else {
        btn.textContent = '▶️ Auto Update';
        btn.classList.remove('active');
        stopGpuMonitoring();
    }
}

// Export GPU data
function exportGpuData() {
    const csvContent = [
        ['GPU ID', 'Name', 'Model', 'Location', 'Utilization', 'Temperature', 'Power', 'Memory', 'Status'].join(','),
        ...gpuData.map(gpu => [
            gpu.id,
            gpu.name,
            gpu.model,
            `${gpu.datacenter}/${gpu.rack}/${gpu.hostname}`,
            `${gpu.utilization}%`,
            `${gpu.temperature}°C`,
            `${gpu.power}W`,
            `${gpu.memoryUsed}/${gpu.memoryTotal}GB`,
            gpu.status
        ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gpu-report-${new Date().toISOString()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}