// Professional NOC Table Component
// Reusable table with pagination, sorting, and filtering

class ProblerTable {
    constructor(containerId, config) {
        this.containerId = containerId;
        this.config = {
            columns: config.columns || [],
            data: config.data || [],
            rowsPerPage: config.rowsPerPage || 15,
            sortable: config.sortable !== false,
            filterable: config.filterable !== false,
            statusColumn: config.statusColumn || null,
            onRowClick: config.onRowClick || null,
            serverSide: config.serverSide || false,
            totalCount: config.totalCount || 0,
            filterDebounceMs: config.filterDebounceMs || 1000,
            // Server-side auto-fetch options
            endpoint: config.endpoint || null,
            modelName: config.modelName || null,
            baseWhereClause: config.baseWhereClause || null,
            transformData: config.transformData || null,
            onDataLoaded: config.onDataLoaded || null
        };

        this.currentPage = 1;
        this.filteredData = [...this.config.data];
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.filters = {};

        this.init();
    }

    init() {
        // Create debounced filter handler for server-side filtering
        if (this.config.serverSide) {
            this.debouncedFilterHandler = this.debounce(() => {
                this.currentPage = 1;
                this.fetchData(this.currentPage, this.config.rowsPerPage);
            }, this.config.filterDebounceMs);
        }
        this.render();

        // Auto-fetch initial data if server-side with endpoint
        if (this.config.serverSide && this.config.endpoint && this.config.modelName) {
            this.fetchData(1, this.config.rowsPerPage);
        }
    }

    debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // Find matching enum value from user input (case-insensitive partial match)
    matchEnumValue(input, enumValues) {
        const normalizedInput = input.toLowerCase().trim();
        if (!normalizedInput) return null;

        // Try exact match first
        if (enumValues[normalizedInput] !== undefined) {
            return enumValues[normalizedInput];
        }

        // Try partial match (input is prefix of enum key)
        for (const [key, value] of Object.entries(enumValues)) {
            if (key.startsWith(normalizedInput)) {
                return value;
            }
        }

        return null; // No match found
    }

    // Build L8Query with filter and sort conditions
    buildQuery(page, pageSize) {
        const pageIndex = page - 1;
        const invalidFilters = [];
        const filterConditions = [];

        // Start with base where clause if provided
        if (this.config.baseWhereClause) {
            filterConditions.push(this.config.baseWhereClause);
        }

        // Add filter conditions
        for (const [columnKey, filterValue] of Object.entries(this.filters)) {
            if (!filterValue) continue;

            const column = this.config.columns.find(c => c.key === columnKey);
            if (!column) continue;

            const filterKey = column.filterKey || column.key;

            let queryValue;
            if (column.enumValues) {
                // Enum column: validate and convert to enum value
                const enumValue = this.matchEnumValue(filterValue, column.enumValues);
                if (enumValue === null) {
                    // No match - mark as invalid, skip this filter
                    invalidFilters.push(columnKey);
                    continue;
                }
                queryValue = enumValue;
            } else {
                // Non-enum column: use text with wildcard
                queryValue = `${filterValue}*`;
            }

            filterConditions.push(`${filterKey}=${queryValue}`);
        }

        // Build query - only add WHERE clause if there are conditions
        let query = `select * from ${this.config.modelName}`;
        if (filterConditions.length > 0) {
            query += ` where ${filterConditions.join(' and ')}`;
        }
        query += ` limit ${pageSize} page ${pageIndex}`;

        // Add sort clause
        if (this.sortColumn) {
            const column = this.config.columns.find(c => c.key === this.sortColumn);
            const sortKey = column?.sortKey || column?.filterKey || this.sortColumn;
            const desc = this.sortDirection === 'desc' ? ' descending' : '';
            query += ` sort-by ${sortKey}${desc}`;
        }

        return { query, invalidFilters };
    }

    // Fetch data from server
    async fetchData(page, pageSize) {
        if (!this.config.endpoint || !this.config.modelName) {
            console.error('Table requires endpoint and modelName for server-side mode');
            return;
        }

        const { query, invalidFilters } = this.buildQuery(page, pageSize);

        try {
            const body = encodeURIComponent(JSON.stringify({ text: query }));
            const response = await fetch(this.config.endpoint + '?body=' + body, {
                method: 'GET',
                headers: typeof getAuthHeaders === 'function' ? getAuthHeaders() : { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch data');
            }

            const data = await response.json();

            // Extract total count from metadata
            let totalCount = 0;
            if (data.metadata?.keyCount?.counts) {
                totalCount = data.metadata.keyCount.counts.Total || 0;
            }

            // Transform data if transformer provided
            let items = data.list || [];
            if (this.config.transformData) {
                items = items.map(item => this.config.transformData(item)).filter(item => item !== null);
            }

            // Update table
            this.updateServerData(items, totalCount);
            this.setInvalidFilters(invalidFilters);

            // Call optional callback for additional processing
            if (this.config.onDataLoaded) {
                this.config.onDataLoaded(data, items, totalCount);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            this.showError('Failed to load data');
        }
    }

    // Update base where clause and re-fetch
    setBaseWhereClause(whereClause) {
        this.config.baseWhereClause = whereClause;
        this.filters = {};  // Clear filters when base clause changes
        this.currentPage = 1;
        this.fetchData(this.currentPage, this.config.rowsPerPage);
    }

    // Show error message in table container
    showError(message) {
        const container = document.getElementById(this.containerId);
        if (container) {
            container.innerHTML = `<div style="padding: 20px; color: #718096; text-align: center;">${message}</div>`;
        }
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // Save focus state before re-render
        const activeElement = document.activeElement;
        let focusedColumn = null;
        let cursorPosition = null;
        if (activeElement && activeElement.classList.contains('noc-filter-input')) {
            focusedColumn = activeElement.dataset.column;
            cursorPosition = activeElement.selectionStart;
        }

        // For server-side pagination, use totalCount; for client-side, use filteredData.length
        const totalCount = this.config.serverSide ? this.config.totalCount : this.filteredData.length;
        const totalPages = Math.ceil(totalCount / this.config.rowsPerPage);
        const startIndex = (this.currentPage - 1) * this.config.rowsPerPage;
        const endIndex = startIndex + this.config.rowsPerPage;

        // For server-side pagination, use the data as-is; for client-side, slice it
        const pageData = this.config.serverSide ? this.config.data : this.filteredData.slice(startIndex, endIndex);

        let html = '<div class="noc-table-wrapper">';

        // Pagination (outside table container for separate rounded corners)
        html += '<div class="noc-table-pagination">';
        const actualEnd = this.config.serverSide ? Math.min(endIndex, totalCount) : Math.min(endIndex, this.filteredData.length);
        html += `<div class="pagination-info">Showing ${startIndex + 1}-${actualEnd} of ${totalCount} entries</div>`;
        html += '<div class="pagination-controls">';

        // Previous button
        html += `<button class="pagination-btn ${this.currentPage === 1 ? 'disabled' : ''}" data-action="prev" ${this.currentPage === 1 ? 'disabled' : ''}>PREV</button>`;

        // Page numbers
        const pageRange = this.getPageRange(this.currentPage, totalPages);
        pageRange.forEach(page => {
            if (page === '...') {
                html += `<span class="pagination-ellipsis">...</span>`;
            } else {
                html += `<button class="pagination-btn ${page === this.currentPage ? 'active' : ''}" data-page="${page}">${page}</button>`;
            }
        });

        // Next button
        html += `<button class="pagination-btn ${this.currentPage === totalPages ? 'disabled' : ''}" data-action="next" ${this.currentPage === totalPages ? 'disabled' : ''}>NEXT</button>`;

        html += '</div>';
        html += '</div>';

        // Table container with bottom rounded corners
        html += '<div class="noc-table-container">';

        // Table header with filters
        html += '<table class="noc-table">';
        html += '<thead>';

        // Column headers
        html += '<tr class="noc-table-header-row">';
        this.config.columns.forEach(col => {
            html += `<th class="noc-table-header ${this.config.sortable ? 'sortable' : ''}" data-column="${col.key}">`;
            html += `<div class="noc-table-header-content">`;
            html += `<span>${col.label}</span>`;
            if (this.config.sortable) {
                const sortIcon = this.sortColumn === col.key
                    ? (this.sortDirection === 'asc' ? '▲' : '▼')
                    : '⇅';
                html += `<span class="sort-indicator">${sortIcon}</span>`;
            }
            html += `</div>`;
            html += '</th>';
        });
        html += '</tr>';

        // Filter row
        if (this.config.filterable) {
            html += '<tr class="noc-table-filter-row">';
            this.config.columns.forEach(col => {
                const filterValue = this.filters[col.key] || '';
                html += `<th class="noc-table-filter">`;
                html += `<input type="text" class="noc-filter-input" data-column="${col.key}" value="${filterValue}" placeholder="Filter...">`;
                html += '</th>';
            });
            html += '</tr>';
        }

        html += '</thead>';

        // Table body
        html += '<tbody>';
        pageData.forEach((row, index) => {
            html += `<tr class="noc-table-row">`;
            this.config.columns.forEach(col => {
                let value = row[col.key];
                let cellClass = 'noc-table-cell';

                // Handle status column with colored indicators
                if (col.key === this.config.statusColumn) {
                    const statusClass = this.getStatusClass(value);
                    value = `<span class="status-badge ${statusClass}">${value}</span>`;
                    cellClass += ' status-cell';
                }

                // Format value if formatter provided
                if (col.formatter) {
                    value = col.formatter(value, row);
                }

                html += `<td class="${cellClass}">${value}</td>`;
            });
            html += '</tr>';
        });
        html += '</tbody>';
        html += '</table>';
        html += '</div>'; // Close noc-table-container

        html += '</div>'; // Close noc-table-wrapper

        container.innerHTML = html;
        this.attachEventListeners();

        // Restore focus after re-render
        if (focusedColumn) {
            const input = container.querySelector(`.noc-filter-input[data-column="${focusedColumn}"]`);
            if (input) {
                input.focus();
                if (cursorPosition !== null) {
                    input.setSelectionRange(cursorPosition, cursorPosition);
                }
            }
        }
    }

    getPageRange(current, total) {
        const range = [];
        const delta = 2;

        for (let i = 1; i <= total; i++) {
            if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
                range.push(i);
            } else if (range[range.length - 1] !== '...') {
                range.push('...');
            }
        }

        return range;
    }

    getStatusClass(status) {
        const statusLower = status.toLowerCase();
        if (statusLower.includes('online') || statusLower.includes('operational') || statusLower.includes('ok') || statusLower.includes('healthy')) {
            return 'status-operational';
        } else if (statusLower.includes('warning') || statusLower.includes('degraded') || statusLower.includes('partial')) {
            return 'status-warning';
        } else if (statusLower.includes('critical') || statusLower.includes('error') || statusLower.includes('down')) {
            return 'status-critical';
        } else if (statusLower.includes('maintenance')) {
            return 'status-maintenance';
        } else if (statusLower.includes('offline') || statusLower.includes('unknown')) {
            return 'status-offline';
        }
        return '';
    }

    attachEventListeners() {
        const container = document.getElementById(this.containerId);

        // Sorting
        if (this.config.sortable) {
            container.querySelectorAll('.noc-table-header.sortable').forEach(header => {
                header.addEventListener('click', (e) => {
                    const column = header.dataset.column;
                    this.sort(column);
                });
            });
        }

        // Filtering
        if (this.config.filterable) {
            container.querySelectorAll('.noc-filter-input').forEach(input => {
                input.addEventListener('input', (e) => {
                    const column = input.dataset.column;
                    const value = input.value;
                    this.filters[column] = value;  // Update immediately for UI state

                    if (this.config.serverSide) {
                        // Server-side: use debounced handler
                        this.debouncedFilterHandler();
                    } else {
                        // Client-side: immediate filtering
                        this.filter(column, value);
                    }
                });
            });
        }

        // Pagination
        container.querySelectorAll('.pagination-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = btn.dataset.action;
                const page = btn.dataset.page;

                if (action === 'prev') {
                    this.goToPage(this.currentPage - 1);
                } else if (action === 'next') {
                    this.goToPage(this.currentPage + 1);
                } else if (page) {
                    this.goToPage(parseInt(page));
                }
            });
        });

        // Row click events
        if (this.config.onRowClick) {
            container.querySelectorAll('.noc-table-row').forEach((row, index) => {
                row.addEventListener('click', (e) => {
                    // For server-side pagination, use the current page data directly
                    // For client-side pagination, use filteredData with calculated index
                    let rowData;
                    if (this.config.serverSide) {
                        rowData = this.config.data[index];
                    } else {
                        const startIndex = (this.currentPage - 1) * this.config.rowsPerPage;
                        const dataIndex = startIndex + index;
                        rowData = this.filteredData[dataIndex];
                    }
                    if (rowData) {
                        this.config.onRowClick(rowData);
                    }
                });
            });
        }
    }

    sort(column) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }

        // Server-side sorting: fetch with new sort
        if (this.config.serverSide) {
            this.currentPage = 1;
            this.fetchData(this.currentPage, this.config.rowsPerPage);
            return;
        }

        // Client-side sorting
        const columnConfig = this.config.columns.find(col => col.key === column);
        const sortKey = columnConfig && columnConfig.sortKey ? columnConfig.sortKey : column;

        this.filteredData.sort((a, b) => {
            let aVal = a[sortKey];
            let bVal = b[sortKey];

            // Handle numbers
            if (!isNaN(aVal) && !isNaN(bVal)) {
                aVal = parseFloat(aVal);
                bVal = parseFloat(bVal);
            }

            if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        this.currentPage = 1;
        this.render();
    }

    filter(column, value) {
        this.filters[column] = value;

        this.filteredData = this.config.data.filter(row => {
            for (let col in this.filters) {
                const filterValue = this.filters[col].toLowerCase();
                if (filterValue && !String(row[col]).toLowerCase().includes(filterValue)) {
                    return false;
                }
            }
            return true;
        });

        this.currentPage = 1;
        this.render();
    }

    goToPage(page) {
        const totalCount = this.config.serverSide ? this.config.totalCount : this.filteredData.length;
        const totalPages = Math.ceil(totalCount / this.config.rowsPerPage);
        if (page >= 1 && page <= totalPages) {
            this.currentPage = page;

            // For server-side pagination, fetch new data
            if (this.config.serverSide) {
                this.fetchData(page, this.config.rowsPerPage);
            } else {
                this.render();
            }
        }
    }

    updateData(newData) {
        this.config.data = newData;
        this.filteredData = [...newData];
        this.currentPage = 1;
        this.render();
    }

    updateServerData(newData, totalCount) {
        this.config.data = newData;
        this.config.totalCount = totalCount;
        this.render();
    }

    setInvalidFilters(invalidColumns) {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // Clear all invalid states first
        container.querySelectorAll('.noc-filter-input').forEach(input => {
            input.classList.remove('invalid');
        });

        // Mark specified columns as invalid
        invalidColumns.forEach(columnKey => {
            const input = container.querySelector(`.noc-filter-input[data-column="${columnKey}"]`);
            if (input) {
                input.classList.add('invalid');
            }
        });
    }
}
