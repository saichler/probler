// Device Management Functions

// Sample data for demonstration (replace with API calls)
let devicesData = [];
let filteredDevicesData = [];
let currentPage = 1;
let devicesPerPage = 25;
let totalPages = 1;
let currentSortColumn = null;
let currentSortDirection = 'asc';
let columnFilters = {};

// Convert API NetworkDevice data to the expected device format
function convertApiDataToDeviceFormat(apiDevices) {
    return apiDevices.map((apiDevice, index) => {
        const equipmentInfo = apiDevice.equipmentinfo || {};
        
        return {
            id: equipmentInfo.device_id || index + 1,
            name: equipmentInfo.sysName || `Device-${index + 1}`,
            ipAddress: equipmentInfo.ipAddress || 'Unknown',
            type: getDeviceTypeString(equipmentInfo.deviceType) || 'Unknown',
            location: equipmentInfo.location || 'Unknown Location',
            latitude: equipmentInfo.latitude || 0,
            longitude: equipmentInfo.longitude || 0,
            status: getDeviceStatusString(equipmentInfo.deviceStatus) || 'unknown',
            cpuUsage: Math.floor(Math.random() * 100), // Placeholder - would come from performance metrics
            memoryUsage: Math.floor(Math.random() * 100), // Placeholder - would come from performance metrics
            uptime: equipmentInfo.uptime || 'Unknown',
            lastSeen: equipmentInfo.last_seen || new Date().toISOString().slice(0, 19).replace('T', ' '),
            model: equipmentInfo.model || 'Unknown Model',
            serialNumber: equipmentInfo.serial_number || 'Unknown',
            firmware: equipmentInfo.firmware_version || equipmentInfo.software || 'Unknown',
            interfaces: equipmentInfo.interface_count || 0,
            temperature: Math.floor(Math.random() * 60) + 20 // Placeholder - would come from performance metrics
        };
    });
}

// Helper functions to convert enum values to strings
function getDeviceTypeString(deviceType) {
    const typeMap = {
        0: 'Unknown',
        1: 'Router', 
        2: 'Switch',
        3: 'Firewall',
        4: 'Load Balancer',
        5: 'Access Point',
        6: 'Server',
        7: 'Storage',
        8: 'Gateway'
    };
    return typeMap[deviceType] || 'Unknown';
}

function getDeviceStatusString(deviceStatus) {
    const statusMap = {
        0: 'unknown',
        1: 'online',
        2: 'offline', 
        3: 'warning',
        4: 'critical',
        5: 'maintenance',
        6: 'partial'
    };
    return statusMap[deviceStatus] || 'unknown';
}

// Generate Physical Tree data from NetworkDevice.physicals
function generatePhysicalInventoryData(device) {
    // If we have original API data with physicals, use it
    if (device.originalApiData && device.originalApiData.physicals) {
        const physicals = device.originalApiData.physicals;
        
        // Create root device node
        const rootNode = {
            name: device.name,
            type: 'chassis',
            details: `${device.model} - ${device.serialNumber}`,
            status: device.status === 'online' ? 'ok' : 'error',
            children: []
        };

        // Process each physical component (e.g., "physical-0")
        Object.keys(physicals).forEach(physicalKey => {
            const physical = physicals[physicalKey];
            
            // Add physical component node
            const physicalNode = {
                name: `Physical Component ${physical.id || physicalKey}`,
                type: 'physical',
                details: `Physical component ${physical.id || physicalKey}`,
                status: 'ok',
                children: []
            };

            // Add chassis components
            if (physical.chassis && physical.chassis.length > 0) {
                physical.chassis.forEach((chassis, chassisIndex) => {
                    const chassisNode = {
                        name: chassis.description || `Chassis ${chassisIndex + 1}`,
                        type: 'chassis',
                        details: `Model: ${chassis.model || 'Unknown'}, S/N: ${chassis.serial_number || chassis.serialNumber || 'Unknown'}`,
                        status: getComponentStatus(chassis.status),
                        children: []
                    };

                    // Add modules directly attached to chassis
                    if (chassis.modules && chassis.modules.length > 0) {
                        chassis.modules.forEach((module, moduleIndex) => {
                            const moduleNode = {
                                name: module.name || `Module ${moduleIndex + 1}`,
                                type: 'module',
                                details: `${module.model || 'Unknown'} - ${module.description || 'Network Module'}`,
                                status: getComponentStatus(module.status),
                                children: []
                            };

                            // Add CPUs if present
                            if (module.cpus && module.cpus.length > 0) {
                                module.cpus.forEach(cpu => {
                                    moduleNode.children.push({
                                        name: cpu.name || `CPU ${cpu.id}`,
                                        type: 'cpu',
                                        details: `${cpu.model || 'Unknown'}, ${cpu.cores || 'N/A'} cores, ${cpu.frequency_mhz || 'N/A'}MHz`,
                                        status: getComponentStatus(cpu.status)
                                    });
                                });
                            }

                            // Add Memory if present
                            if (module.memory_modules && module.memory_modules.length > 0) {
                                module.memory_modules.forEach(mem => {
                                    moduleNode.children.push({
                                        name: mem.name || `Memory ${mem.id}`,
                                        type: 'memory',
                                        details: `${mem.type || 'Unknown'}, ${Math.round((mem.size_bytes || 0) / (1024*1024*1024))}GB`,
                                        status: getComponentStatus(mem.status)
                                    });
                                });
                            }

                            chassisNode.children.push(moduleNode);
                        });
                    }

                    physicalNode.children.push(chassisNode);
                });
            }

            // Add ports (at physical level)
            if (physical.ports && physical.ports.length > 0) {
                const portsNode = {
                    name: 'Network Ports',
                    type: 'ports_group',
                    details: `${physical.ports.length} ports available`,
                    status: 'ok',
                    children: []
                };

                physical.ports.forEach(port => {
                    const portNode = {
                        name: `Port ${port.id}`,
                        type: 'port',
                        details: `Port ${port.id}`,
                        status: 'ok',
                        children: []
                    };

                    // Add interfaces
                    if (port.interfaces && port.interfaces.length > 0) {
                        port.interfaces.forEach(intf => {
                            portNode.children.push({
                                name: intf.name || `Interface ${intf.id}`,
                                type: 'interface',
                                details: `${intf.description || intf.name || ''} - ${intf.ip_address || 'No IP'}`,
                                status: intf.admin_status ? 'ok' : 'down'
                            });
                        });
                    }

                    portsNode.children.push(portNode);
                });

                physicalNode.children.push(portsNode);
            }

            // Add power supplies (at physical level)
            if (physical.powerSupplies && physical.powerSupplies.length > 0) {
                const powerNode = {
                    name: 'Power Supplies',
                    type: 'power_group',
                    details: `${physical.powerSupplies.length} power supplies`,
                    status: 'ok',
                    children: []
                };

                physical.powerSupplies.forEach((psu, psuIndex) => {
                    powerNode.children.push({
                        name: psu.name || `PSU ${psuIndex + 1}`,
                        type: 'power',
                        details: `${psu.model || 'Unknown'}, ${psu.wattage || 'N/A'}W`,
                        status: getComponentStatus(psu.status)
                    });
                });

                physicalNode.children.push(powerNode);
            }

            // Add fans (at physical level)
            if (physical.fans && physical.fans.length > 0) {
                const fansNode = {
                    name: 'Fans',
                    type: 'fans_group',
                    details: `${physical.fans.length} fans`,
                    status: 'ok',
                    children: []
                };

                physical.fans.forEach((fan, fanIndex) => {
                    fansNode.children.push({
                        name: fan.name || `Fan ${fanIndex + 1}`,
                        type: 'fan',
                        details: `${fan.description || ''} - ${fan.speed_rpm || 'Variable'} RPM`,
                        status: getComponentStatus(fan.status)
                    });
                });

                physicalNode.children.push(fansNode);
            }

            // Add performance metrics if available
            if (physical.performance) {
                const perfNode = {
                    name: 'Performance Metrics',
                    type: 'performance',
                    details: `CPU: ${physical.performance.cpuUsagePercent || 0}%, Memory: ${physical.performance.memoryUsagePercent || 0}%`,
                    status: (physical.performance.cpuUsagePercent > 80 || physical.performance.memoryUsagePercent > 80) ? 'warning' : 'ok',
                    children: []
                };

                if (physical.performance.cpuUsagePercent !== undefined) {
                    perfNode.children.push({
                        name: 'CPU Usage',
                        type: 'metric',
                        details: `${physical.performance.cpuUsagePercent}%`,
                        status: physical.performance.cpuUsagePercent > 80 ? 'warning' : 'ok'
                    });
                }

                if (physical.performance.memoryUsagePercent !== undefined) {
                    perfNode.children.push({
                        name: 'Memory Usage',
                        type: 'metric',
                        details: `${physical.performance.memoryUsagePercent}%`,
                        status: physical.performance.memoryUsagePercent > 80 ? 'warning' : 'ok'
                    });
                }

                physicalNode.children.push(perfNode);
            }

            rootNode.children.push(physicalNode);
        });

        return rootNode;
    }

    // Return empty inventory data if no physicals data available
    return {
        name: device.name,
        type: 'chassis',
        details: 'No physical inventory data available',
        status: 'unknown',
        children: []
    };
}

// Helper function to convert component status to string
function getComponentStatus(status) {
    const statusMap = {
        0: 'unknown',
        1: 'ok',
        2: 'warning',
        3: 'error',
        4: 'critical',
        5: 'offline',
        6: 'not_present'
    };
    return statusMap[status] || 'unknown';
}

async function loadDevices(page = 1) {
    showLoading('devicesLoading');

    try {
        // Try to fetch data from the REST API endpoint first
        const apiEndpoint = '/probler/0/NetDev';
        const serverPage = page - 1; // Convert UI page (1-based) to server page (0-based)
        const bodyParam = `{"text":"select * from NetworkDevice where Id=* limit 25 page ${serverPage}", "rootType":"networkdevice", "properties":["*"], "criteria":{"condition":{"comparator":{"left":"id", "oper":"=", "right":"*"}}}, "limit":25, "page":${serverPage}, "matchCase":true}`;

        console.log('Attempting to fetch devices from API:', apiEndpoint, 'Page:', page);

        // Pass the body parameter as URL query parameter for GET request
        const queryParams = new URLSearchParams({
            body: bodyParam
        });

        const response = await fetch(`${apiEndpoint}?${queryParams}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (response.ok) {
            const apiData = await response.json();
            console.log('Successfully fetched device data from API:', apiData);

            // Store the API response globally for dashboard stats access
            window.lastApiResponse = apiData;

            // Convert API response to expected format if needed
            if (apiData && apiData.list && Array.isArray(apiData.list)) {
                devicesData = convertApiDataToDeviceFormat(apiData.list);
                // Store the original API data for detailed views
                devicesData.forEach((device, index) => {
                    device.originalApiData = apiData.list[index];
                });

                // Update pagination info using stats.Total instead of totalPages
                if (apiData.stats && apiData.stats.Total) {
                    totalPages = Math.ceil(apiData.stats.Total / 25);
                } else {
                    totalPages = apiData.totalPages || 1;
                }
                currentPage = page;

                console.log(`Loaded ${devicesData.length} devices from API, Page ${page} of ${totalPages} (Total devices: ${apiData.stats?.Total || 'unknown'})`);
                renderDevicesTable();
                // Update dashboard stats with new device data
                if (typeof loadDashboardStats === 'function') {
                    loadDashboardStats();
                }
                return;
            }
        }

        // If API call fails or returns unexpected data, don't show any mock data
        console.warn('API call failed or returned unexpected data, no devices will be displayed');
        throw new Error('API call failed, no data available');

    } catch (error) {
        console.error('Error loading devices from API:', error);
        console.log('No device data available - API failed and mock data disabled');

        // Show notification to user about API failure
        if (typeof showNotification === 'function') {
            showNotification('Unable to connect to device service. No device data available.', 'error');
        }

        // Set empty devices data instead of fallback mock data
        devicesData = [];
        totalPages = 1;
        currentPage = 1;

        renderDevicesTable();
        // Update dashboard stats with empty device data
        if (typeof loadDashboardStats === 'function') {
            loadDashboardStats();
        }
    } finally {
        hideLoading('devicesLoading');
    }
}

function renderDevicesTable() {
    // For server-side paging, we don't need client-side pagination slicing
    // Apply filters and sorting (but server handles pagination)
    applyFiltersAndSorting();

    const tbody = document.getElementById('devicesTableBody');
    tbody.innerHTML = '';

    // Render all devices from server response (already paginated)
    filteredDevicesData.forEach(device => {
        const row = document.createElement('tr');
        row.className = 'device-row';
        row.onclick = () => showDeviceDetails(device);

        const statusClass = device.status === 'online' ? 'status-online' : 
                          device.status === 'offline' ? 'status-offline' : 'status-warning';

        row.innerHTML = `
            <td class="${statusClass}">
                <span class="status-indicator"></span>
                ${device.status.toUpperCase()}
            </td>
            <td>${device.name}</td>
            <td>${device.ipAddress}</td>
            <td>${device.type}</td>
            <td>${device.location}</td>
            <td>${device.cpuUsage}%</td>
            <td>${device.memoryUsage}%</td>
            <td>${device.uptime}</td>
            <td>${device.lastSeen}</td>
        `;

        tbody.appendChild(row);
    });

    // Update pagination controls
    updatePaginationControls();
    
    // Update device count display
    updateDeviceCountDisplay();
}

function applyFiltersAndSorting() {
    // Start with all devices
    filteredDevicesData = [...devicesData];
    
    // Apply column filters
    Object.keys(columnFilters).forEach(column => {
        const filterValue = columnFilters[column].toLowerCase();
        if (filterValue) {
            filteredDevicesData = filteredDevicesData.filter(device => {
                let value = '';
                switch(column) {
                    case 'status': value = device.status; break;
                    case 'name': value = device.name; break;
                    case 'ipAddress': value = device.ipAddress; break;
                    case 'type': value = device.type; break;
                    case 'location': value = device.location; break;
                    case 'cpuUsage': value = device.cpuUsage.toString(); break;
                    case 'memoryUsage': value = device.memoryUsage.toString(); break;
                    case 'uptime': value = device.uptime; break;
                    case 'lastSeen': value = device.lastSeen; break;
                }
                return value.toLowerCase().includes(filterValue);
            });
        }
    });
    
    // Apply sorting
    if (currentSortColumn) {
        filteredDevicesData.sort((a, b) => {
            let aValue, bValue;
            
            switch(currentSortColumn) {
                case 'status': aValue = a.status; bValue = b.status; break;
                case 'name': aValue = a.name; bValue = b.name; break;
                case 'ipAddress': aValue = a.ipAddress; bValue = b.ipAddress; break;
                case 'type': aValue = a.type; bValue = b.type; break;
                case 'location': aValue = a.location; bValue = b.location; break;
                case 'cpuUsage': aValue = a.cpuUsage; bValue = b.cpuUsage; break;
                case 'memoryUsage': aValue = a.memoryUsage; bValue = b.memoryUsage; break;
                case 'uptime': aValue = a.uptime; bValue = b.uptime; break;
                case 'lastSeen': aValue = new Date(a.lastSeen); bValue = new Date(b.lastSeen); break;
                default: return 0;
            }
            
            // Handle numeric comparisons
            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return currentSortDirection === 'asc' ? aValue - bValue : bValue - aValue;
            }
            
            // Handle date comparisons
            if (aValue instanceof Date && bValue instanceof Date) {
                return currentSortDirection === 'asc' ? aValue - bValue : bValue - aValue;
            }
            
            // Handle string comparisons
            const comparison = aValue.localeCompare(bValue);
            return currentSortDirection === 'asc' ? comparison : -comparison;
        });
    }
}

function updatePaginationControls() {
    // Use totalPages from server response instead of calculating from client data
    
    // Remove existing pagination if it exists
    const existingPagination = document.querySelector('.devices-pagination');
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
    prevButton.disabled = currentPage === 1;
    prevButton.onclick = () => {
        if (currentPage > 1) {
            loadDevices(currentPage - 1);
        }
    };
    paginationContainer.appendChild(prevButton);
    
    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
        const firstButton = createPageButton(1);
        paginationContainer.appendChild(firstButton);
        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'pagination-ellipsis';
            ellipsis.textContent = '...';
            paginationContainer.appendChild(ellipsis);
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = createPageButton(i);
        paginationContainer.appendChild(pageButton);
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'pagination-ellipsis';
            ellipsis.textContent = '...';
            paginationContainer.appendChild(ellipsis);
        }
        const lastButton = createPageButton(totalPages);
        paginationContainer.appendChild(lastButton);
    }
    
    // Next button
    const nextButton = document.createElement('button');
    nextButton.className = 'pagination-btn';
    nextButton.textContent = 'Next ›';
    nextButton.disabled = currentPage === totalPages;
    nextButton.onclick = () => {
        if (currentPage < totalPages) {
            loadDevices(currentPage + 1);
        }
    };
    paginationContainer.appendChild(nextButton);
    
    // Insert pagination after the table
    const tableContainer = document.querySelector('.devices-section .table-container');
    tableContainer.appendChild(paginationContainer);
}

function createPageButton(pageNumber) {
    const button = document.createElement('button');
    button.className = `pagination-btn ${pageNumber === currentPage ? 'active' : ''}`;
    button.textContent = pageNumber;
    button.onclick = () => {
        loadDevices(pageNumber);
    };
    return button;
}

function updateDeviceCountDisplay() {
    const startIndex = (currentPage - 1) * devicesPerPage;
    const endIndex = Math.min(startIndex + filteredDevicesData.length, startIndex + devicesPerPage);

    // Use stats.Total if available, otherwise fall back to estimation
    let totalDevices;
    if (window.lastApiResponse && window.lastApiResponse.stats && window.lastApiResponse.stats.Total) {
        totalDevices = window.lastApiResponse.stats.Total;
    } else {
        totalDevices = totalPages * devicesPerPage; // Approximate total fallback
    }

    // Remove existing count display if it exists
    const existingCount = document.querySelector('.devices-count');
    if (existingCount) {
        existingCount.remove();
    }

    // Create count display
    const countDisplay = document.createElement('div');
    countDisplay.className = 'devices-count';
    const totalIndicator = window.lastApiResponse && window.lastApiResponse.stats && window.lastApiResponse.stats.Total ? '' : '~';
    countDisplay.innerHTML = `
        <span>Showing ${startIndex + 1}-${endIndex} of ${totalIndicator}${totalDevices} devices (Page ${currentPage} of ${totalPages})</span>
    `;

    // Insert count display before the table
    const tableContainer = document.querySelector('.devices-section .table-container');
    tableContainer.insertBefore(countDisplay, tableContainer.firstChild);
}

function sortDevicesByColumn(column) {
    if (currentSortColumn === column) {
        // Toggle sort direction if same column
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        // New column, start with ascending
        currentSortColumn = column;
        currentSortDirection = 'asc';
    }
    
    // Update sort indicators in table headers
    updateSortIndicators(column);
    
    // Reset to first page when sorting and reload data
    loadDevices(1);
}

function updateSortIndicators(activeColumn) {
    // Remove existing sort indicators
    document.querySelectorAll('.sort-indicator').forEach(indicator => {
        indicator.remove();
    });
    
    // Add sort indicator to active column
    const headers = document.querySelectorAll('#devicesTable th');
    headers.forEach((header, index) => {
        const columns = ['status', 'name', 'ipAddress', 'type', 'location', 'cpuUsage', 'memoryUsage', 'uptime', 'lastSeen'];
        if (columns[index] === activeColumn) {
            const indicator = document.createElement('span');
            indicator.className = 'sort-indicator';
            indicator.textContent = currentSortDirection === 'asc' ? ' ▲' : ' ▼';
            header.appendChild(indicator);
        }
    });
}

function filterDevicesByColumn(column, value) {
    if (value.trim() === '') {
        delete columnFilters[column];
    } else {
        columnFilters[column] = value;
    }
    
    // Reset to first page when filtering and reload data
    loadDevices(1);
}

function showDeviceDetails(device) {
    document.getElementById('modalDeviceName').textContent = device.name;
    
    // Update modal header with status badge
    const modalHeader = document.querySelector('#deviceModal .modal-header');
    const existingBadge = modalHeader.querySelector('.device-status-badge');
    if (existingBadge) {
        existingBadge.remove();
    }
    
    const statusBadge = document.createElement('div');
    statusBadge.className = `device-status-badge status-${device.status}`;
    statusBadge.innerHTML = `
        <span class="status-indicator"></span>
        ${device.status.toUpperCase()}
    `;
    modalHeader.insertBefore(statusBadge, modalHeader.querySelector('.close'));
    
    // Populate Basic Info tab with essential device information
    document.getElementById('basicInfoContent').innerHTML = `
        <div class="detail-item">
            <span class="detail-label">Device Name:</span>
            <span class="detail-value">${device.name}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">IP Address:</span>
            <span class="detail-value">${device.ipAddress}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Device Type:</span>
            <span class="detail-value">${device.type}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Location:</span>
            <span class="detail-value">${device.location}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Coordinates:</span>
            <span class="detail-value">${device.latitude}°, ${device.longitude}°</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Last Seen:</span>
            <span class="detail-value">${device.lastSeen}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Uptime:</span>
            <span class="detail-value">${device.uptime}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Model:</span>
            <span class="detail-value">${device.model}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Serial Number:</span>
            <span class="detail-value">${device.serialNumber}</span>
        </div>
    `;
    
    // Populate Hardware tab
    document.getElementById('hardwareContent').innerHTML = `
        <div class="detail-item">
            <span class="detail-label">Manufacturer:</span>
            <span class="detail-value">${device.model.split(' ')[0]}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Product Line:</span>
            <span class="detail-value">${device.model}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Hardware Serial:</span>
            <span class="detail-value">${device.serialNumber}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Operating System:</span>
            <span class="detail-value">${device.firmware}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Total Interfaces:</span>
            <span class="detail-value">${device.interfaces} ports</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Operating Temperature:</span>
            <span class="detail-value">${device.temperature}°C</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Hardware Type:</span>
            <span class="detail-value">${device.type}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Power Status:</span>
            <span class="detail-value">${device.status === 'online' ? 'Powered On' : 'Powered Off'}</span>
        </div>
    `;
    
    // Populate Performance tab
    const performanceContent = document.getElementById('performanceContent');
    performanceContent.innerHTML = `
        <div class="performance-metrics">
            <div class="metric-card">
                <div class="metric-header">
                    <h4>CPU Usage</h4>
                    <span class="metric-value ${device.cpuUsage > 80 ? 'critical' : device.cpuUsage > 60 ? 'warning' : 'normal'}">${device.cpuUsage}%</span>
                </div>
                <div class="metric-bar">
                    <div class="metric-fill" style="width: ${device.cpuUsage}%; background-color: ${device.cpuUsage > 80 ? '#dc3545' : device.cpuUsage > 60 ? '#ffc107' : '#28a745'}"></div>
                </div>
            </div>
            
            <div class="metric-card">
                <div class="metric-header">
                    <h4>Memory Usage</h4>
                    <span class="metric-value ${device.memoryUsage > 80 ? 'critical' : device.memoryUsage > 60 ? 'warning' : 'normal'}">${device.memoryUsage}%</span>
                </div>
                <div class="metric-bar">
                    <div class="metric-fill" style="width: ${device.memoryUsage}%; background-color: ${device.memoryUsage > 80 ? '#dc3545' : device.memoryUsage > 60 ? '#ffc107' : '#28a745'}"></div>
                </div>
            </div>
            
            <div class="metric-card">
                <div class="metric-header">
                    <h4>Temperature</h4>
                    <span class="metric-value ${device.temperature > 50 ? 'critical' : device.temperature > 40 ? 'warning' : 'normal'}">${device.temperature}°C</span>
                </div>
                <div class="metric-bar">
                    <div class="metric-fill" style="width: ${Math.min(device.temperature, 100)}%; background-color: ${device.temperature > 50 ? '#dc3545' : device.temperature > 40 ? '#ffc107' : '#28a745'}"></div>
                </div>
            </div>
            
            <div class="performance-details">
                <div class="detail-item">
                    <span class="detail-label">Current Status:</span>
                    <span class="detail-value status-${device.status}">${device.status.toUpperCase()}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Uptime:</span>
                    <span class="detail-value">${device.uptime}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Last Performance Check:</span>
                    <span class="detail-value">${device.lastSeen}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Interface Count:</span>
                    <span class="detail-value">${device.interfaces} interfaces</span>
                </div>
            </div>
        </div>
    `;
    
    // Populate Physical Inventory tab using NetworkDevice.physicals data
    const inventoryData = generatePhysicalInventoryData(device);
    const treeHtml = `<ul class="tree-node">${createTreeNode(inventoryData)}</ul>`;
    document.getElementById('inventoryContent').innerHTML = treeHtml;
    
    document.getElementById('deviceModal').style.display = 'block';
}

function filterDevices(status) {
    const tbody = document.getElementById('devicesTableBody');
    const rows = tbody.querySelectorAll('tr');
    
    rows.forEach(row => {
        if (status === 'all') {
            row.style.display = '';
        } else {
            const statusCell = row.querySelector('td').textContent.toLowerCase();
            if (statusCell.includes(status)) {
                row.style.display = '';
                row.style.backgroundColor = 'rgba(100, 181, 246, 0.1)';
                setTimeout(() => {
                    row.style.backgroundColor = '';
                }, 2000);
            } else {
                row.style.display = 'none';
            }
        }
    });
    
    // Scroll to devices table
    document.getElementById('devicesTable').scrollIntoView({ behavior: 'smooth' });
}

function refreshDevices() {
    console.log('Refreshing device data...');
    loadDevices();
}

function changeDevicesPerPage(value) {
    // Note: Server-side paging currently uses fixed page size of 25
    // This function is kept for UI compatibility but doesn't change server behavior
    if (value !== 'all') {
        const newPerPage = parseInt(value);
        if (newPerPage > 0) {
            devicesPerPage = newPerPage;
        }
    }

    // Reset to first page when changing page size and reload
    loadDevices(1);
}

function clearAllFilters() {
    // Clear all column filters
    columnFilters = {};
    
    // Clear all filter input fields
    document.querySelectorAll('.column-filter').forEach(input => {
        input.value = '';
    });
    
    // Reset per page selector to default
    const perPageSelect = document.getElementById('devicesPerPageSelect');
    if (perPageSelect) {
        perPageSelect.value = '25';
        devicesPerPage = 25;
    }

    // Reset to first page and reload data
    loadDevices(1);
}