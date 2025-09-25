// NVIDIA GPU Data Center Dashboard JavaScript

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

// Pagination functionality
let currentPage = 1;
let pageSize = 25;
let totalPages = Math.ceil(2240 / pageSize); // 90 pages for 2,240 GPUs

function initializePagination() {
    // Add event listeners for pagination controls
    document.getElementById('pageSizeSelect')?.addEventListener('change', handlePageSizeChange);
    document.getElementById('firstPageBtn')?.addEventListener('click', () => goToPage(1));
    document.getElementById('prevPageBtn')?.addEventListener('click', () => goToPage(currentPage - 1));
    document.getElementById('nextPageBtn')?.addEventListener('click', () => goToPage(currentPage + 1));
    document.getElementById('lastPageBtn')?.addEventListener('click', () => goToPage(totalPages));
    document.getElementById('pageJumpBtn')?.addEventListener('click', handlePageJump);

    // Add event listeners for page number buttons
    document.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const page = parseInt(e.target.getAttribute('data-page'));
            goToPage(page);
        });
    });

    // Add enter key support for page jump input
    document.getElementById('pageJumpInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handlePageJump();
        }
    });

    updatePaginationDisplay();
}

function handlePageSizeChange(e) {
    pageSize = parseInt(e.target.value);
    totalPages = Math.ceil(2240 / pageSize);
    currentPage = 1; // Reset to first page when changing page size
    updatePaginationDisplay();
    loadPageData(currentPage);
}

function handlePageJump() {
    const pageInput = document.getElementById('pageJumpInput');
    const targetPage = parseInt(pageInput.value);
    if (targetPage >= 1 && targetPage <= totalPages) {
        goToPage(targetPage);
    } else {
        pageInput.value = currentPage; // Reset to current page if invalid
    }
}

function goToPage(page) {
    if (page < 1 || page > totalPages || page === currentPage) return;

    currentPage = page;
    updatePaginationDisplay();
    loadPageData(page);
}

function updatePaginationDisplay() {
    // Update page info
    const startRecord = (currentPage - 1) * pageSize + 1;
    const endRecord = Math.min(currentPage * pageSize, 2240);

    document.getElementById('pageStart').textContent = startRecord;
    document.getElementById('pageEnd').textContent = endRecord;
    document.getElementById('pageJumpInput').value = currentPage;

    // Update button states
    document.getElementById('firstPageBtn').disabled = currentPage === 1;
    document.getElementById('prevPageBtn').disabled = currentPage === 1;
    document.getElementById('nextPageBtn').disabled = currentPage === totalPages;
    document.getElementById('lastPageBtn').disabled = currentPage === totalPages;

    // Update page jump input max value
    document.getElementById('pageJumpInput').setAttribute('max', totalPages);

    // Update page number buttons
    updatePageNumberButtons();
}

function updatePageNumberButtons() {
    const pageNumbersDiv = document.getElementById('pageNumbers');
    if (!pageNumbersDiv) return;

    let html = '';

    // Always show first page
    if (currentPage === 1) {
        html += '<button class="btn btn-primary page-btn active" data-page="1" style="padding: 0.25rem 0.5rem; min-width: 32px;">1</button>';
    } else {
        html += '<button class="btn btn-secondary page-btn" data-page="1" style="padding: 0.25rem 0.5rem; min-width: 32px;">1</button>';
    }

    // Add ellipsis if needed
    if (currentPage > 4) {
        html += '<span style="padding: 0.25rem;">...</span>';
    }

    // Show pages around current page
    const startPage = Math.max(2, currentPage - 2);
    const endPage = Math.min(totalPages - 1, currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
        if (i === 1 || i === totalPages) continue; // Skip first and last as they're handled separately

        const isActive = i === currentPage;
        const btnClass = isActive ? 'btn-primary active' : 'btn-secondary';
        html += `<button class="btn ${btnClass} page-btn" data-page="${i}" style="padding: 0.25rem 0.5rem; min-width: 32px;">${i}</button>`;
    }

    // Add ellipsis if needed
    if (currentPage < totalPages - 3) {
        html += '<span style="padding: 0.25rem;">...</span>';
    }

    // Always show last page (if more than 1 page)
    if (totalPages > 1) {
        if (currentPage === totalPages) {
            html += `<button class="btn btn-primary page-btn active" data-page="${totalPages}" style="padding: 0.25rem 0.5rem; min-width: 32px;">${totalPages}</button>`;
        } else {
            html += `<button class="btn btn-secondary page-btn" data-page="${totalPages}" style="padding: 0.25rem 0.5rem; min-width: 32px;">${totalPages}</button>`;
        }
    }

    pageNumbersDiv.innerHTML = html;

    // Re-attach event listeners to new buttons
    pageNumbersDiv.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const page = parseInt(e.target.getAttribute('data-page'));
            goToPage(page);
        });
    });
}

function loadPageData(page) {
    console.log(`Loading data for page ${page}`);
    // In a real implementation, this would make an API call to load GPU data for the specific page
    // For now, we'll simulate loading different GPUs

    // Update the view stats for the current page
    updateViewStats(page);
}

function updateViewStats(page) {
    // Calculate approximate stats for current page view
    const startGPU = (page - 1) * pageSize + 1;
    const endGPU = Math.min(page * pageSize, 2240);
    const gpusInView = endGPU - startGPU + 1;

    // Simulate different stats per page - based on the 25 GPUs we're actually showing
    // Looking at our mock data: 21 online working GPUs + 3 idle GPUs + 1 warning GPU + 0 offline = 25 total
    const onlineInView = Math.floor(gpusInView * 0.84); // ~21/25 = 84% working GPUs
    const warningInView = 1; // We have 1 GPU with temperature warning
    const offlineInView = 0; // No offline GPUs in current view
    const utilizationInView = Math.floor(Math.random() * 15) + 80; // 80-94% avg utilization

    // Update the view stats
    const viewOnlineElement = document.getElementById('viewOnline');
    const viewWarningElement = document.getElementById('viewWarning');
    const viewOfflineElement = document.getElementById('viewOffline');
    const viewUtilizationElement = document.getElementById('viewUtilization');

    if (viewOnlineElement) viewOnlineElement.textContent = onlineInView;
    if (viewWarningElement) viewWarningElement.textContent = warningInView;
    if (viewOfflineElement) viewOfflineElement.textContent = offlineInView;
    if (viewUtilizationElement) viewUtilizationElement.textContent = `${utilizationInView}%`;
}

// Refresh functions
function refreshGPUList() {
    console.log('Refreshing GPU list');
    updateMetrics();
    loadPageData(currentPage); // Reload current page data
}

function refreshJobQueue() {
    console.log('Refreshing job queue');
    updateJobQueue();
}

function refreshAlerts() {
    console.log('Refreshing alerts');
    // Implementation would fetch new alerts from server
}

// Make functions available globally
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