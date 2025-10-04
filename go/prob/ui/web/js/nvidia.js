// NVIDIA GPU Data Center Dashboard JavaScript

// GPU Pagination Variables (exactly matching devices.js structure)
let gpuCurrentPage = 1;
let gpuPerPage = 25;
let gpuTotalPages = 90; // 2,240 GPUs / 25 per page = ~90 pages
let gpuTotalCount = 2240;
const allGPUData = [];

// Generate mock GPU data for all 2,240 GPUs
function generateAllGPUData() {
    const gpuTypes = ['H100 80GB', 'A100 40GB', 'RTX 4090', 'RTX 6000', 'RTX 5900', 'RTX 5800'];
    const statuses = ['online', 'online', 'online', 'online', 'idle', 'warning', 'critical'];
    const jobs = ['LLM-Training', 'AI-Research', 'Data-Analysis', 'Image-Processing', 'Video-Rendering', 'Idle', 'ML-Training', 'NLP-Research'];
    const teams = ['ai_research', 'ml_team', 'data_science', 'graphics_team', 'compute_team', 'dev_team'];

    const allGPUs = [];

    for (let i = 0; i < gpuTotalCount; i++) {
        const rackNum = Math.floor(i / 70) + 1; // 70 GPUs per rack
        const nodeNum = Math.floor(i / 8) + 1; // 8 GPUs per node
        const gpuNum = i % 8;
        const gpuType = gpuTypes[Math.floor(Math.random() * gpuTypes.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const utilization = status === 'idle' ? 0 : Math.floor(Math.random() * 60) + 40;
        const memory = gpuType.includes('80GB') ? 80 : gpuType.includes('40GB') ? 40 : gpuType.includes('32GB') ? 32 : 24;
        const memoryUsed = status === 'idle' ? Math.random() * 2 : (utilization / 100) * memory;
        const temp = status === 'idle' ? 35 + Math.random() * 10 : 60 + Math.random() * 30;
        const job = status === 'idle' ? 'Idle' : jobs[Math.floor(Math.random() * jobs.length)];
        const team = status === 'idle' ? 'Available' : teams[Math.floor(Math.random() * teams.length)];

        allGPUs.push({
            id: `R${String(rackNum).padStart(2, '0')}N${String(nodeNum).padStart(3, '0')}G${gpuNum}`,
            rack: rackNum,
            node: nodeNum,
            gpu: gpuNum,
            type: gpuType,
            status: status,
            utilization: utilization,
            memory: memory,
            memoryUsed: memoryUsed.toFixed(1),
            temperature: Math.round(temp),
            job: job,
            team: team
        });
    }

    return allGPUs;
}

// Initialize GPU data
allGPUData.push(...generateAllGPUData());

// Tab switching functionality
document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    initializeSubTabs();
    initializeModal();
    initializeMetricsUpdates();
    initializeDefaultStates();
    initializePagination();
    console.log('NVIDIA GPU Data Center Dashboard initialized');
    updateMetrics();
});

// Initialize default states for tabs and sub-tabs
function initializeDefaultStates() {
    // Ensure GPU management tab has proper default sub-tab state
    ensureGpuDefaultSubTab();
}

// Initialize main navigation
function initializeNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            // Remove active class from all nav items and main tab contents
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            document.querySelectorAll('#overview, #gpus, #jobs, #monitoring, #alerts, #settings').forEach(content => content.classList.remove('active'));

            // Add active class to clicked nav item and corresponding tab content
            item.classList.add('active');
            const tabId = item.getAttribute('data-tab');
            const mainTabContent = document.getElementById(tabId);
            if (mainTabContent) {
                mainTabContent.classList.add('active');

                // If this is the GPU management tab, ensure the default sub-tab is shown
                if (tabId === 'gpus') {
                    ensureGpuDefaultSubTab();
                }
            }
        });
    });
}

// Ensure GPU management tab shows the default sub-tab
function ensureGpuDefaultSubTab() {
    const gpuContainer = document.getElementById('gpus');
    if (gpuContainer) {
        // Reset all sub-tabs in GPU management
        const subTabs = gpuContainer.querySelectorAll('.tab');
        const subTabContents = gpuContainer.querySelectorAll('[id$="-overview"], [id$="-details"], [id$="-maintenance"]');

        subTabs.forEach(tab => tab.classList.remove('active'));
        subTabContents.forEach(content => content.classList.remove('active'));

        // Activate the default sub-tab (overview)
        const defaultTab = gpuContainer.querySelector('.tab[data-subtab="gpu-overview"]');
        const defaultContent = document.getElementById('gpu-overview');

        if (defaultTab) defaultTab.classList.add('active');
        if (defaultContent) defaultContent.classList.add('active');
    }
}

// Initialize sub-tab switching
function initializeSubTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const container = tab.closest('.card');
            const subtabId = tab.getAttribute('data-subtab');

            // Remove active from all tabs in this container
            container.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            container.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

            // Add active to clicked tab and content
            tab.classList.add('active');
            const content = document.getElementById(subtabId);
            if (content) content.classList.add('active');
        });
    });
}

// Initialize modal functionality
function initializeModal() {
    const modal = document.getElementById('gpuModal');
    const closeBtn = document.getElementsByClassName('close')[0];

    if (closeBtn) {
        closeBtn.onclick = function() {
            modal.style.display = 'none';
        }
    }

    window.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    }
}

// Show GPU details modal
function showGPUDetails() {
    const modal = document.getElementById('gpuModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

// Initialize metrics updates
function initializeMetricsUpdates() {
    // Update metrics every 5 seconds
    setInterval(updateMetrics, 5000);
}

// Simulate real-time data updates
function updateMetrics() {
    // Simulate updating GPU utilization
    const progressBars = document.querySelectorAll('.progress-fill');
    progressBars.forEach(bar => {
        const currentWidth = parseInt(bar.style.width);
        const newWidth = Math.max(10, Math.min(100, currentWidth + (Math.random() - 0.5) * 10));
        bar.style.width = newWidth + '%';
    });

    // Update header stats
    const utilizationStat = document.querySelector('.header-stats .header-stat:nth-child(3) .header-stat-value');
    if (utilizationStat) {
        const newUtil = (85 + Math.random() * 10).toFixed(1);
        utilizationStat.textContent = newUtil + '%';
    }

    // Update other dynamic metrics
    updateGPUCount();
    updateTemperatures();
    updatePowerUsage();
    updateJobQueue();
}

// Update GPU count
function updateGPUCount() {
    const totalGPUsElement = document.querySelector('.header-stat:nth-child(1) .header-stat-value');
    const onlineGPUsElement = document.querySelector('.header-stat:nth-child(2) .header-stat-value');

    if (totalGPUsElement) {
        const variance = Math.floor(Math.random() * 5) - 2; // -2 to +2
        const current = parseInt(totalGPUsElement.textContent);
        totalGPUsElement.textContent = Math.max(2240, current + variance);
    }

    if (onlineGPUsElement) {
        const variance = Math.floor(Math.random() * 10) - 5; // -5 to +5
        const current = parseInt(onlineGPUsElement.textContent);
        onlineGPUsElement.textContent = Math.max(2150, Math.min(2165, current + variance));
    }
}

// Update temperature values
function updateTemperatures() {
    const tempElements = document.querySelectorAll('.gpu-stats');
    tempElements.forEach(element => {
        const tempMatch = element.textContent.match(/Temp: (\d+)°C/);
        if (tempMatch) {
            const currentTemp = parseInt(tempMatch[1]);
            const newTemp = Math.max(60, Math.min(85, currentTemp + Math.floor((Math.random() - 0.5) * 4)));
            element.textContent = element.textContent.replace(/Temp: \d+°C/, `Temp: ${newTemp}°C`);
        }
    });
}

// Update power usage
function updatePowerUsage() {
    const powerElements = document.querySelectorAll('.gpu-stats');
    powerElements.forEach(element => {
        const powerMatch = element.textContent.match(/Power: (\d+)W/);
        if (powerMatch) {
            const currentPower = parseInt(powerMatch[1]);
            const newPower = Math.max(300, Math.min(450, currentPower + Math.floor((Math.random() - 0.5) * 20)));
            element.textContent = element.textContent.replace(/Power: \d+W/, `Power: ${newPower}W`);
        }
    });
}

// Update job queue statistics
function updateJobQueue() {
    const activeJobsElement = document.querySelector('.header-stat:nth-child(4) .header-stat-value');
    if (activeJobsElement) {
        const variance = Math.floor(Math.random() * 20) - 10; // -10 to +10
        const current = parseInt(activeJobsElement.textContent);
        activeJobsElement.textContent = Math.max(800, Math.min(900, current + variance));
    }
}

// Job management functions
function submitJob() {
    alert('Job submission dialog would open here');
}

function pauseJob(jobId) {
    console.log(`Pausing job ${jobId}`);
    alert(`Job ${jobId} paused`);
}

function editJob(jobId) {
    console.log(`Editing job ${jobId}`);
    alert(`Job ${jobId} edit dialog would open here`);
}

function downloadJobResults(jobId) {
    console.log(`Downloading results for job ${jobId}`);
    alert(`Downloading results for job ${jobId}`);
}

// GPU management functions
function manageGPU(gpuId) {
    console.log(`Managing GPU ${gpuId}`);
    showGPUDetails();
}

function resetGPU(gpuId) {
    if (confirm(`Are you sure you want to reset GPU ${gpuId}?`)) {
        console.log(`Resetting GPU ${gpuId}`);
        alert(`GPU ${gpuId} reset initiated`);
    }
}

function scheduleMaintenanceForGPU(gpuId) {
    console.log(`Scheduling maintenance for GPU ${gpuId}`);
    alert(`Maintenance scheduling dialog would open here for GPU ${gpuId}`);
}

function viewGPULogs(gpuId) {
    console.log(`Viewing logs for GPU ${gpuId}`);
    alert(`Log viewer would open here for GPU ${gpuId}`);
}

// Alert management functions
function acknowledgeAlert(alertId) {
    console.log(`Acknowledging alert ${alertId}`);
    const alertElement = document.querySelector(`[data-alert-id="${alertId}"]`);
    if (alertElement) {
        alertElement.style.opacity = '0.5';
        alertElement.querySelector('.btn').textContent = 'Acknowledged';
        alertElement.querySelector('.btn').disabled = true;
    }
}

function clearAllAlerts() {
    if (confirm('Are you sure you want to clear all alerts?')) {
        const alerts = document.querySelectorAll('.alert');
        alerts.forEach(alert => {
            alert.style.display = 'none';
        });
        console.log('All alerts cleared');
    }
}

// Settings management functions
function saveSettings() {
    const settings = {
        tempWarning: document.querySelector('input[placeholder*="Temperature Warning"]')?.value,
        tempCritical: document.querySelector('input[placeholder*="Temperature Critical"]')?.value,
        memoryWarning: document.querySelector('input[placeholder*="Memory Warning"]')?.value,
        powerWarning: document.querySelector('input[placeholder*="Power Warning"]')?.value,
        realtimeMonitoring: document.querySelector('input[type="checkbox"]:nth-of-type(1)')?.checked,
        emailNotifications: document.querySelector('input[type="checkbox"]:nth-of-type(2)')?.checked,
        smsAlerts: document.querySelector('input[type="checkbox"]:nth-of-type(3)')?.checked
    };

    console.log('Saving settings:', settings);
    localStorage.setItem('nvidiaSettings', JSON.stringify(settings));
    alert('Settings saved successfully');
}

function resetToDefaults() {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
        localStorage.removeItem('nvidiaSettings');
        location.reload();
    }
}

// Filter functions
function filterGPUs(filterType) {
    console.log(`Filtering GPUs by: ${filterType}`);
    // Implementation would filter GPU list based on filterType
}

function filterJobs(filterType) {
    console.log(`Filtering jobs by: ${filterType}`);
    // Implementation would filter job queue based on filterType
}

// Export functionality
function exportGPUData() {
    const data = {
        timestamp: new Date().toISOString(),
        totalGPUs: document.querySelector('.header-stat:nth-child(1) .header-stat-value')?.textContent,
        onlineGPUs: document.querySelector('.header-stat:nth-child(2) .header-stat-value')?.textContent,
        utilization: document.querySelector('.header-stat:nth-child(3) .header-stat-value')?.textContent,
        activeJobs: document.querySelector('.header-stat:nth-child(4) .header-stat-value')?.textContent
    };

    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const exportFileDefaultName = `gpu_data_${Date.now()}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

// GPU Pagination functionality (exactly matching devices.js structure)
function initializePagination() {
    // Initialize GPU table with first page
    loadGPUsInternal(1);
}

function loadGPUsInternal(page) {
    gpuCurrentPage = page;

    // Calculate which GPUs to show for this page
    const startIndex = (page - 1) * gpuPerPage;
    const endIndex = Math.min(startIndex + gpuPerPage, allGPUData.length);
    const pageGPUs = allGPUData.slice(startIndex, endIndex);

    // Update the GPU table with the page data
    updateGPUTable(pageGPUs);

    // Update pagination controls
    updateGPUPagination();

    // Update count display
    updateGPUCountDisplay();
}

// Make the internal function available
window.loadGPUsInternal = loadGPUsInternal;

function updateGPUTable(gpus) {
    const tbody = document.getElementById('gpusTableBody');
    if (!tbody) return;

    // Clear existing content
    tbody.innerHTML = '';

    // Add GPU rows
    gpus.forEach(gpu => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="padding: 0.75rem 1rem; border-bottom: 1px solid #333; font-size: 0.8rem;">
                <strong>Rack ${String(gpu.rack).padStart(2, '0')}, Node ${String(gpu.node).padStart(3, '0')}, GPU ${gpu.gpu}</strong><br>
                <span style="color: var(--crm-gray-500);">${gpu.id}</span>
            </td>
            <td style="padding: 0.75rem 1rem; border-bottom: 1px solid #333; font-size: 0.8rem;">
                <span class="status-indicator status-${gpu.status}"></span>
                ${gpu.status.toUpperCase()}
            </td>
            <td style="padding: 0.75rem 1rem; border-bottom: 1px solid #333; font-size: 0.8rem;">${gpu.type}</td>
            <td style="padding: 0.75rem 1rem; border-bottom: 1px solid #333; font-size: 0.8rem;">${gpu.utilization}%</td>
            <td style="padding: 0.75rem 1rem; border-bottom: 1px solid #333; font-size: 0.8rem;">${gpu.memoryUsed}GB / ${gpu.memory}GB</td>
            <td style="padding: 0.75rem 1rem; border-bottom: 1px solid #333; font-size: 0.8rem;">${gpu.temperature}°C</td>
            <td style="padding: 0.75rem 1rem; border-bottom: 1px solid #333; font-size: 0.8rem;">${gpu.job}</td>
            <td style="padding: 0.75rem 1rem; border-bottom: 1px solid #333; font-size: 0.8rem;">
                <button class="btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.7rem;" onclick="showGPUDetails('${gpu.id}')">
                    View
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function updateGPUPagination() {
    // Update existing static pagination buttons - DON'T clear the container
    const paginationContainer = document.querySelector('#gpuPaginationContainer');
    if (!paginationContainer) {
        console.error('GPU pagination container not found!');
        return;
    }
    console.log('Found GPU pagination container, updating buttons...');

    // Update the existing buttons instead of rebuilding
    updateExistingGPUButtons();
}

function updateExistingGPUButtons() {
    // Update Previous button state
    const prevBtn = document.getElementById('gpuPrevBtn');
    if (prevBtn) {
        prevBtn.disabled = gpuCurrentPage === 1;
        prevBtn.style.opacity = gpuCurrentPage === 1 ? '0.5' : '1';
        prevBtn.onclick = () => {
            if (gpuCurrentPage > 1) {
                loadGPUs(gpuCurrentPage - 1);
            }
        };
    }

    // Update Next button state
    const nextBtn = document.getElementById('gpuNextBtn');
    if (nextBtn) {
        nextBtn.disabled = gpuCurrentPage === gpuTotalPages;
        nextBtn.style.opacity = gpuCurrentPage === gpuTotalPages ? '0.5' : '1';
        nextBtn.onclick = () => {
            if (gpuCurrentPage < gpuTotalPages) {
                loadGPUs(gpuCurrentPage + 1);
            }
        };
    }

    // Update page button states
    [1, 2, 3, 90].forEach(pageNum => {
        const btn = document.getElementById('gpuPage' + pageNum);
        if (btn) {
            if (pageNum === gpuCurrentPage) {
                btn.classList.add('active');
                btn.style.background = 'var(--crm-primary)';
                btn.style.borderColor = 'var(--crm-primary)';
                btn.style.color = 'white';
            } else {
                btn.classList.remove('active');
                btn.style.background = 'white';
                btn.style.borderColor = 'var(--crm-gray-300)';
                btn.style.color = 'var(--crm-gray-700)';
            }
            btn.onclick = () => loadGPUs(pageNum);
        }
    });
}

function createGPUPageButton(pageNumber) {
    const button = document.createElement('button');
    button.className = `pagination-btn ${pageNumber === gpuCurrentPage ? 'active' : ''}`;
    button.textContent = pageNumber;
    button.onclick = () => {
        loadGPUs(pageNumber);
    };
    return button;
}

function updateGPUCountDisplay() {
    const startIndex = (gpuCurrentPage - 1) * gpuPerPage;
    const endIndex = Math.min(startIndex + gpuPerPage, gpuTotalCount);

    // Remove existing count display
    const existingCount = document.querySelector('#gpus-app .devices-count');
    if (existingCount) {
        existingCount.remove();
    }

    // Create count display
    const countDisplay = document.createElement('div');
    countDisplay.className = 'devices-count';
    countDisplay.innerHTML = `
        <span>Showing ${startIndex + 1}-${endIndex} of ${gpuTotalCount} GPUs (Page ${gpuCurrentPage} of ${gpuTotalPages})</span>
    `;

    // Insert count display before the table
    const tableContainer = document.querySelector('#gpus-app .table-container');
    if (tableContainer && tableContainer.firstChild) {
        tableContainer.insertBefore(countDisplay, tableContainer.firstChild);
    }
}

// Make functions available globally - DO THIS IMMEDIATELY
window.gpuCurrentPage = 1;

window.changeGPUPage = function(page) {
    console.log('changeGPUPage called with:', page);

    let newPage = window.gpuCurrentPage;

    if (page === 'prev') {
        newPage = Math.max(1, window.gpuCurrentPage - 1);
    } else if (page === 'next') {
        newPage = Math.min(90, window.gpuCurrentPage + 1);
    } else {
        newPage = parseInt(page);
    }

    if (newPage !== window.gpuCurrentPage) {
        window.gpuCurrentPage = newPage;
        updateGPUTableDirectly(newPage);
        updateDynamicGPUPagination(newPage);
        console.log('Changed to page:', newPage);
    }
};

// Make it available immediately
console.log('changeGPUPage function defined:', typeof window.changeGPUPage);

function updateGPUTableDirectly(page) {
    const tbody = document.getElementById('gpusTableBody');
    if (!tbody) return;

    // Clear current content
    tbody.innerHTML = '';

    // Calculate range for this page
    const startGPU = (page - 1) * 25 + 1;

    // Add 25 GPU rows for this page
    for (let i = 0; i < 25; i++) {
        const gpuNum = startGPU + i;
        const rackNum = Math.ceil(gpuNum / 70);
        const nodeNum = Math.ceil(gpuNum / 8);
        const gpuId = (gpuNum - 1) % 8;

        const row = tbody.insertRow();
        row.innerHTML = `
            <td style="padding: 0.75rem 1rem; border-bottom: 1px solid #333; font-size: 0.8rem;">
                <strong>Rack ${String(rackNum).padStart(2, '0')}, Node ${String(nodeNum).padStart(3, '0')}, GPU ${gpuId}</strong><br>
                <span style="color: var(--crm-gray-500);">Page ${page} - GPU #${gpuNum}</span>
            </td>
            <td style="padding: 0.75rem 1rem; border-bottom: 1px solid #333; font-size: 0.8rem;">
                <span class="status-indicator status-online"></span>
                ONLINE
            </td>
            <td style="padding: 0.75rem 1rem; border-bottom: 1px solid #333; font-size: 0.8rem;">H100 80GB</td>
            <td style="padding: 0.75rem 1rem; border-bottom: 1px solid #333; font-size: 0.8rem;">85%</td>
            <td style="padding: 0.75rem 1rem; border-bottom: 1px solid #333; font-size: 0.8rem;">68GB / 80GB</td>
            <td style="padding: 0.75rem 1rem; border-bottom: 1px solid #333; font-size: 0.8rem;">72°C</td>
            <td style="padding: 0.75rem 1rem; border-bottom: 1px solid #333; font-size: 0.8rem;">ML-Training</td>
            <td style="padding: 0.75rem 1rem; border-bottom: 1px solid #333; font-size: 0.8rem;">
                <button class="btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.7rem;">View</button>
            </td>
        `;
    }
}

function updateDynamicGPUPagination(currentPage) {
    // Find the pagination container by ID (we know it exists)
    const paginationContainer = document.getElementById('gpuPaginationContainer');
    if (!paginationContainer) {
        console.error('GPU pagination container not found!');
        return;
    }

    // Clear and rebuild pagination with dynamic page numbers (exactly like devices.js)
    paginationContainer.innerHTML = '';

    const totalPages = 90;

    // Previous button
    const prevButton = document.createElement('button');
    prevButton.className = 'pagination-btn';
    prevButton.textContent = '‹ Previous';
    prevButton.disabled = currentPage === 1;
    prevButton.onclick = () => window.changeGPUPage('prev');
    paginationContainer.appendChild(prevButton);

    // Dynamic page numbers (current page ± 2 pages)
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    // Show first page if not in range
    if (startPage > 1) {
        const firstButton = createGPUPageButtonDynamic(1, currentPage);
        paginationContainer.appendChild(firstButton);
        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'pagination-ellipsis';
            ellipsis.textContent = '...';
            paginationContainer.appendChild(ellipsis);
        }
    }

    // Show pages around current page
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = createGPUPageButtonDynamic(i, currentPage);
        paginationContainer.appendChild(pageButton);
    }

    // Show last page if not in range
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'pagination-ellipsis';
            ellipsis.textContent = '...';
            paginationContainer.appendChild(ellipsis);
        }
        const lastButton = createGPUPageButtonDynamic(totalPages, currentPage);
        paginationContainer.appendChild(lastButton);
    }

    // Next button
    const nextButton = document.createElement('button');
    nextButton.className = 'pagination-btn';
    nextButton.textContent = 'Next ›';
    nextButton.disabled = currentPage === totalPages;
    nextButton.onclick = () => window.changeGPUPage('next');
    paginationContainer.appendChild(nextButton);
}

function createGPUPageButtonDynamic(pageNumber, currentPage) {
    const button = document.createElement('button');
    button.className = pageNumber === currentPage ? 'pagination-btn active' : 'pagination-btn';
    button.textContent = pageNumber;
    button.onclick = () => window.changeGPUPage(pageNumber);
    return button;
}

function updateDynamicGPUPagination(currentPage) {
    const paginationContainer = document.getElementById('gpuPaginationContainer');
    if (!paginationContainer) {
        console.error('GPU pagination container not found!');
        return;
    }

    // Clear and rebuild pagination with dynamic page numbers
    paginationContainer.innerHTML = '';
    // Container styling is now handled by CSS

    const totalPages = 90;

    // Previous button
    const prevButton = document.createElement('button');
    prevButton.textContent = '‹ Previous';
    prevButton.disabled = currentPage === 1;
    prevButton.onclick = () => window.changeGPUPage('prev');
    paginationContainer.appendChild(prevButton);

    // Dynamic page numbers (current page ± 2 pages)
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    // Show first page if not in range
    if (startPage > 1) {
        const firstButton = createDynamicPageButton(1, currentPage);
        paginationContainer.appendChild(firstButton);
        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            paginationContainer.appendChild(ellipsis);
        }
    }

    // Show pages around current page
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = createDynamicPageButton(i, currentPage);
        paginationContainer.appendChild(pageButton);
    }

    // Show last page if not in range
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            paginationContainer.appendChild(ellipsis);
        }
        const lastButton = createDynamicPageButton(totalPages, currentPage);
        paginationContainer.appendChild(lastButton);
    }

    // Next button
    const nextButton = document.createElement('button');
    nextButton.textContent = 'Next ›';
    nextButton.disabled = currentPage === totalPages;
    nextButton.onclick = () => window.changeGPUPage('next');
    paginationContainer.appendChild(nextButton);
}

function createDynamicPageButton(pageNumber, currentPage) {
    const button = document.createElement('button');
    button.textContent = pageNumber;

    // Use CSS class for active state, no inline styles needed
    if (pageNumber === currentPage) {
        button.className = 'gpu-active';
    }

    button.onclick = () => window.changeGPUPage(pageNumber);
    return button;
}

window.loadGPUs = function(page) {
    window.changeGPUPage(page);
};

window.showGPUDetails = showGPUDetails;
window.submitJob = submitJob;
window.pauseJob = pauseJob;
window.editJob = editJob;
window.downloadJobResults = downloadJobResults;
window.manageGPU = manageGPU;
window.resetGPU = resetGPU;
window.scheduleMaintenanceForGPU = scheduleMaintenanceForGPU;
window.viewGPULogs = viewGPULogs;
window.acknowledgeAlert = acknowledgeAlert;
window.clearAllAlerts = clearAllAlerts;
window.saveSettings = saveSettings;
// Define missing refresh functions
function refreshGPUList() {
    console.log('Refreshing GPU list...');
    loadGPUs(); // Call the existing loadGPUs function
}

function refreshJobQueue() {
    console.log('Refreshing job queue...');
    // TODO: Implement job queue refresh
}

function refreshAlerts() {
    console.log('Refreshing alerts...');
    // TODO: Implement alerts refresh
}

// Define missing pagination functions
function goToPage(pageNum) {
    console.log(`Going to page ${pageNum}`);
    if (typeof changeGPUPage === 'function') {
        changeGPUPage(pageNum);
    }
}

function handlePageSizeChange(newSize) {
    console.log(`Changing page size to ${newSize}`);
    // TODO: Implement page size change
}

function handlePageJump(pageNum) {
    console.log(`Jumping to page ${pageNum}`);
    if (typeof changeGPUPage === 'function') {
        changeGPUPage(pageNum);
    }
}

window.resetToDefaults = resetToDefaults;
window.filterGPUs = filterGPUs;
window.filterJobs = filterJobs;
window.exportGPUData = exportGPUData;
window.refreshGPUList = refreshGPUList;
window.refreshJobQueue = refreshJobQueue;
window.refreshAlerts = refreshAlerts;
window.goToPage = goToPage;
window.handlePageSizeChange = handlePageSizeChange;
window.handlePageJump = handlePageJump;

// GPU Pagination Functions (copied exactly from devices.js)
function updateGPUPaginationControls() {
    // Remove existing pagination if it exists
    const existingPagination = document.querySelector('.gpu-section .devices-pagination');
    if (existingPagination) {
        existingPagination.remove();
    }

    // Create pagination container
    const paginationContainer = document.createElement('div');
    paginationContainer.className = 'devices-pagination';

    // Previous button
    const prevButton = document.createElement('button');
    prevButton.className = 'pagination-btn';
    prevButton.textContent = '‹ Previous';
    prevButton.disabled = gpuCurrentPage === 1;
    prevButton.onclick = () => {
        if (gpuCurrentPage > 1) {
            loadGPUPage(gpuCurrentPage - 1);
        }
    };
    paginationContainer.appendChild(prevButton);

    // Page numbers
    const startPage = Math.max(1, gpuCurrentPage - 2);
    const endPage = Math.min(gpuTotalPages, gpuCurrentPage + 2);

    if (startPage > 1) {
        const firstButton = createGPUPageButton(1);
        paginationContainer.appendChild(firstButton);
        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'pagination-ellipsis';
            ellipsis.textContent = '...';
            paginationContainer.appendChild(ellipsis);
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        const pageButton = createGPUPageButton(i);
        paginationContainer.appendChild(pageButton);
    }

    if (endPage < gpuTotalPages) {
        if (endPage < gpuTotalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'pagination-ellipsis';
            ellipsis.textContent = '...';
            paginationContainer.appendChild(ellipsis);
        }
        const lastButton = createGPUPageButton(gpuTotalPages);
        paginationContainer.appendChild(lastButton);
    }

    // Next button
    const nextButton = document.createElement('button');
    nextButton.className = 'pagination-btn';
    nextButton.textContent = 'Next ›';
    nextButton.disabled = gpuCurrentPage === gpuTotalPages;
    nextButton.onclick = () => {
        if (gpuCurrentPage < gpuTotalPages) {
            loadGPUPage(gpuCurrentPage + 1);
        }
    };
    paginationContainer.appendChild(nextButton);

    // Insert pagination after the table
    const tableContainer = document.querySelector('.gpu-section .table-container');
    if (tableContainer) {
        tableContainer.appendChild(paginationContainer);
    }
}

function createGPUPageButton(pageNumber) {
    const button = document.createElement('button');
    button.className = `pagination-btn ${pageNumber === gpuCurrentPage ? 'active' : ''}`;
    button.textContent = pageNumber;
    button.onclick = () => {
        loadGPUPage(pageNumber);
    };
    return button;
}

function loadGPUPage(pageNumber) {
    if (pageNumber < 1 || pageNumber > gpuTotalPages) return;

    gpuCurrentPage = pageNumber;

    // Calculate the start and end indices for this page
    const startIndex = (pageNumber - 1) * gpuPerPage;
    const endIndex = Math.min(startIndex + gpuPerPage, gpuTotalCount);
    const pageGPUs = allGPUData.slice(startIndex, endIndex);

    // Update the table body with the new data
    const tbody = document.getElementById('gpusTableBody');
    if (tbody) {
        tbody.innerHTML = ''; // Clear existing rows

        pageGPUs.forEach(gpu => {
            const row = document.createElement('tr');
            row.className = 'gpu-row';
            row.onclick = () => showGPUDetails(gpu.id);

            // Determine status colors
            const tempColor = gpu.temperature > 80 ? 'var(--crm-danger)' :
                            gpu.temperature > 70 ? 'var(--crm-warning)' :
                            'var(--crm-success)';
            const statusColor = gpu.status === 'online' ? 'var(--crm-success)' :
                              gpu.status === 'warning' ? 'var(--crm-warning)' :
                              gpu.status === 'critical' ? 'var(--crm-danger)' :
                              'var(--crm-gray-500)';

            row.innerHTML = `
                <td style="padding: 0.75rem 1rem; border-bottom: 1px solid #333; font-size: 0.85rem;">
                    <strong>Rack ${String(gpu.rack).padStart(2, '0')}, Node ${String(gpu.node).padStart(3, '0')}, GPU ${gpu.gpu}</strong><br>
                    <span style="color: var(--crm-gray-500);">${gpu.type}</span>
                </td>
                <td style="padding: 0.75rem 1rem; border-bottom: 1px solid #333; font-size: 0.85rem;">${gpu.type.split(' ')[0]}</td>
                <td style="padding: 0.75rem 1rem; border-bottom: 1px solid #333; font-size: 0.85rem;">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span>${gpu.utilization}%</span>
                        <div style="flex: 1; height: 4px; background: #333; border-radius: 2px;">
                            <div style="width: ${gpu.utilization}%; height: 100%; background: ${gpu.utilization > 90 ? 'var(--crm-danger)' : 'var(--crm-success)'}; border-radius: 2px;"></div>
                        </div>
                    </div>
                </td>
                <td style="padding: 0.75rem 1rem; border-bottom: 1px solid #333; font-size: 0.85rem;">
                    <span>${gpu.memoryUsed}GB</span><br>
                    <span style="color: var(--crm-gray-500); font-size: 0.7rem;">/ ${gpu.memory}GB</span>
                </td>
                <td style="padding: 0.75rem 1rem; border-bottom: 1px solid #333; font-size: 0.85rem; color: ${tempColor};">${gpu.temperature}°C</td>
                <td style="padding: 0.75rem 1rem; border-bottom: 1px solid #333; font-size: 0.85rem;">
                    <span style="color: ${statusColor};">${gpu.job}</span><br>
                    <span style="color: var(--crm-gray-500); font-size: 0.7rem;">${gpu.team}</span>
                </td>
                <td style="padding: 0.75rem 1rem; border-bottom: 1px solid #333; font-size: 0.85rem;">
                    <button class="btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.7rem;" onclick="showGPUDetails('${gpu.id}')">
                        View
                    </button>
                </td>
            `;

            tbody.appendChild(row);
        });
    }

    // Update pagination buttons
    updatePaginationButtons();
    console.log(`Loaded GPU page ${pageNumber} - showing GPUs ${startIndex + 1} to ${endIndex}`);
}

// Update pagination button states and visibility
function updatePaginationButtons() {
    // Update pagination control in the HTML
    const paginationDiv = document.querySelector('#gpuPagination') || document.querySelector('.gpu-section .devices-pagination');
    if (paginationDiv) {
        paginationDiv.innerHTML = `
            <div style="display: flex !important; justify-content: center !important; align-items: center !important; gap: 8px !important;">
                <button style="padding: 8px 16px !important; border: 1px solid #ccc !important; background: #fff !important; color: #333 !important; border-radius: 6px !important; cursor: ${gpuCurrentPage === 1 ? 'not-allowed' : 'pointer'} !important; opacity: ${gpuCurrentPage === 1 ? '0.5' : '1'};" onclick="loadGPUPage(${gpuCurrentPage - 1})" ${gpuCurrentPage === 1 ? 'disabled' : ''}>‹ Previous</button>
                ${generatePageButtons()}
                <button style="padding: 8px 16px !important; border: 1px solid #ccc !important; background: #fff !important; color: #333 !important; border-radius: 6px !important; cursor: ${gpuCurrentPage === gpuTotalPages ? 'not-allowed' : 'pointer'} !important; opacity: ${gpuCurrentPage === gpuTotalPages ? '0.5' : '1'};" onclick="loadGPUPage(${gpuCurrentPage + 1})" ${gpuCurrentPage === gpuTotalPages ? 'disabled' : ''}>Next ›</button>
            </div>
        `;
    }
}

// Generate page number buttons
function generatePageButtons() {
    let buttons = '';
    const startPage = Math.max(1, gpuCurrentPage - 2);
    const endPage = Math.min(gpuTotalPages, gpuCurrentPage + 2);

    if (startPage > 1) {
        buttons += `<button style="padding: 8px 16px !important; border: 1px solid #ccc !important; background: #fff !important; color: #333 !important; border-radius: 6px !important; cursor: pointer !important;" onclick="loadGPUPage(1)">1</button>`;
        if (startPage > 2) {
            buttons += `<span style="padding: 0 8px !important; color: #666 !important;">...</span>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === gpuCurrentPage;
        buttons += `<button style="padding: 8px 16px !important; border: 1px solid ${isActive ? '#007bff' : '#ccc'} !important; background: ${isActive ? '#007bff' : '#fff'} !important; color: ${isActive ? 'white' : '#333'} !important; border-radius: 6px !important; cursor: pointer !important;" onclick="loadGPUPage(${i})">${i}</button>`;
    }

    if (endPage < gpuTotalPages) {
        if (endPage < gpuTotalPages - 1) {
            buttons += `<span style="padding: 0 8px !important; color: #666 !important;">...</span>`;
        }
        buttons += `<button style="padding: 8px 16px !important; border: 1px solid #ccc !important; background: #fff !important; color: #333 !important; border-radius: 6px !important; cursor: pointer !important;" onclick="loadGPUPage(${gpuTotalPages})">${gpuTotalPages}</button>`;
    }

    return buttons;
}

// Make loadGPUPage available globally
window.loadGPUPage = loadGPUPage;

// Also make a simple test function
window.testGPUPagination = function() {
    console.log('Testing GPU pagination...');
    console.log('Current page:', gpuCurrentPage);
    console.log('Total pages:', gpuTotalPages);
    console.log('Total GPUs:', gpuTotalCount);
    console.log('GPU data loaded:', allGPUData ? allGPUData.length : 0);
    return true;
};

// Initialize GPU pagination when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Add a small delay to ensure the DOM is fully ready
    setTimeout(() => {
        // Load the first page of GPU data on startup
        if (document.getElementById('gpusTableBody')) {
            loadGPUPage(1);
        }
    }, 500);
});