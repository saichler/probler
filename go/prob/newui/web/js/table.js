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
            onRowClick: config.onRowClick || null
        };

        this.currentPage = 1;
        this.filteredData = [...this.config.data];
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.filters = {};

        this.init();
    }

    init() {
        this.render();
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const totalPages = Math.ceil(this.filteredData.length / this.config.rowsPerPage);
        const startIndex = (this.currentPage - 1) * this.config.rowsPerPage;
        const endIndex = startIndex + this.config.rowsPerPage;
        const pageData = this.filteredData.slice(startIndex, endIndex);

        let html = '<div class="noc-table-container">';

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
            html += `<tr class="noc-table-row ${index % 2 === 0 ? 'even' : 'odd'}">`;
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

        // Pagination
        html += '<div class="noc-table-pagination">';
        html += `<div class="pagination-info">Showing ${startIndex + 1}-${Math.min(endIndex, this.filteredData.length)} of ${this.filteredData.length} entries</div>`;
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

        html += '</div>';

        container.innerHTML = html;
        this.attachEventListeners();
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
        if (statusLower.includes('operational') || statusLower.includes('ok') || statusLower.includes('healthy')) {
            return 'status-operational';
        } else if (statusLower.includes('warning') || statusLower.includes('degraded')) {
            return 'status-warning';
        } else if (statusLower.includes('critical') || statusLower.includes('error') || statusLower.includes('down')) {
            return 'status-critical';
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
                    this.filter(column, value);
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
            const startIndex = (this.currentPage - 1) * this.config.rowsPerPage;
            container.querySelectorAll('.noc-table-row').forEach((row, index) => {
                row.addEventListener('click', (e) => {
                    const dataIndex = startIndex + index;
                    const rowData = this.filteredData[dataIndex];
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

        this.filteredData.sort((a, b) => {
            let aVal = a[column];
            let bVal = b[column];

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
        const totalPages = Math.ceil(this.filteredData.length / this.config.rowsPerPage);
        if (page >= 1 && page <= totalPages) {
            this.currentPage = page;
            this.render();
        }
    }

    updateData(newData) {
        this.config.data = newData;
        this.filteredData = [...newData];
        this.currentPage = 1;
        this.render();
    }
}
