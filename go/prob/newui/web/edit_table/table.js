// Layer 8 Ecosystem - Abstract Table Component
// Reusable table with pagination (controls above table)

class L8Table {
    constructor(options) {
        this.containerId = options.containerId;
        this.columns = options.columns || [];
        this.data = [];
        this.pageSize = options.pageSize || 10;
        this.currentPage = 1;
        this.emptyMessage = options.emptyMessage || 'No data found.';
        this.onEdit = options.onEdit || null;
        this.onDelete = options.onDelete || null;
        this.showActions = options.showActions !== false;
        this.pageSizeOptions = options.pageSizeOptions || [5, 10, 25, 50];

        // Server-side pagination support
        this.serverSide = options.serverSide || false;
        this.totalItems = 0;

        // Server-side auto-fetch options
        this.endpoint = options.endpoint || null;
        this.modelName = options.modelName || null;
        this.baseWhereClause = options.baseWhereClause || null;
        this.transformData = options.transformData || null;
        this.onDataLoaded = options.onDataLoaded || null;

        // Add button support
        this.onAdd = options.onAdd || null;
        this.addButtonText = options.addButtonText || 'Add';

        // Toggle state button support
        this.onToggleState = options.onToggleState || null;
        this.getItemState = options.getItemState || null;

        // Sorting and filtering support
        this.sortable = options.sortable !== false;
        this.filterable = options.filterable !== false;
        this.filterDebounceMs = options.filterDebounceMs || 1000;

        // Sorting and filtering state
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.filters = {};
        this.filteredData = [];

        this.container = null;
        this.tableId = options.tableId || 'l8-table-' + Date.now();
    }

    // Debounce utility for server-side filtering
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
        if (this.baseWhereClause) {
            filterConditions.push(this.baseWhereClause);
        }

        // Add filter conditions
        for (const [columnKey, filterValue] of Object.entries(this.filters)) {
            if (!filterValue) continue;

            const column = this.columns.find(c => c.key === columnKey);
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
        let query = `select * from ${this.modelName}`;
        if (filterConditions.length > 0) {
            query += ` where ${filterConditions.join(' and ')}`;
        }
        query += ` limit ${pageSize} page ${pageIndex}`;

        // Add sort clause
        if (this.sortColumn) {
            const column = this.columns.find(c => c.key === this.sortColumn);
            const sortKey = column?.sortKey || column?.filterKey || this.sortColumn;
            const desc = this.sortDirection === 'desc' ? ' descending' : '';
            query += ` sort-by ${sortKey}${desc}`;
        }

        return { query, invalidFilters };
    }

    // Fetch data from server
    async fetchData(page, pageSize) {
        if (!this.endpoint || !this.modelName) {
            console.error('Table requires endpoint and modelName for server-side mode');
            return;
        }

        const { query, invalidFilters } = this.buildQuery(page, pageSize);

        try {
            const body = encodeURIComponent(JSON.stringify({ text: query }));
            const response = await fetch(this.endpoint + '?body=' + body, {
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
            if (this.transformData) {
                items = items.map(item => this.transformData(item));
            }

            // Update table
            this.setServerData(items, totalCount);
            this.setInvalidFilters(invalidFilters);

            // Call optional callback for additional processing
            if (this.onDataLoaded) {
                this.onDataLoaded(data, items, totalCount);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            this.showError('Failed to load data');
        }
    }

    // Update base where clause and re-fetch
    setBaseWhereClause(whereClause) {
        this.baseWhereClause = whereClause;
        this.filters = {};  // Clear filters when base clause changes
        this.currentPage = 1;
        this.fetchData(this.currentPage, this.pageSize);
    }

    // Show error message in table container
    showError(message) {
        if (this.container) {
            this.container.innerHTML = `<div style="padding: 20px; color: #718096; text-align: center;">${message}</div>`;
        }
    }

    // Initialize the table in the container
    init() {
        this.container = document.getElementById(this.containerId);
        if (!this.container) {
            console.error('Container not found:', this.containerId);
            return;
        }

        // Create debounced filter handler for server-side filtering
        if (this.serverSide) {
            this.debouncedFilterHandler = this.debounce(() => {
                this.currentPage = 1;
                this.fetchData(this.currentPage, this.pageSize);
            }, this.filterDebounceMs);
        }

        this.render();

        // Auto-fetch initial data if server-side with endpoint
        if (this.serverSide && this.endpoint && this.modelName) {
            this.fetchData(1, this.pageSize);
        }
    }

    // Set data and re-render (for client-side pagination)
    setData(data) {
        this.data = Array.isArray(data) ? data : Object.values(data);
        this.filteredData = [...this.data];
        if (!this.serverSide) {
            this.currentPage = 1;
        }
        this.render();
    }

    // Set data with server-side pagination metadata
    setServerData(data, totalItems) {
        this.data = Array.isArray(data) ? data : Object.values(data);
        this.totalItems = totalItems || 0;
        this.render();
    }

    // Get paginated data
    getPaginatedData() {
        if (this.serverSide) {
            // Server-side: data is already paginated
            return this.data;
        }
        // Client-side: use filteredData if filtering is enabled
        const dataSource = this.filterable ? this.filteredData : this.data;
        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        return dataSource.slice(start, end);
    }

    // Get total items count
    getTotalItems() {
        if (this.serverSide) return this.totalItems;
        return this.filterable ? this.filteredData.length : this.data.length;
    }

    // Get total pages
    getTotalPages() {
        const total = this.getTotalItems();
        return Math.ceil(total / this.pageSize);
    }

    // Render the complete table component
    render() {
        if (!this.container) return;

        // Save focus state before re-render
        const activeElement = document.activeElement;
        let focusedColumn = null;
        let cursorPosition = null;
        if (activeElement && activeElement.classList.contains('l8-filter-input')) {
            focusedColumn = activeElement.dataset.column;
            cursorPosition = activeElement.selectionStart;
        }

        const totalItems = this.getTotalItems();
        const totalPages = this.getTotalPages();
        const paginatedData = this.getPaginatedData();
        const startItem = totalItems === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
        const endItem = Math.min(this.currentPage * this.pageSize, totalItems);

        let html = `
            <div class="l8-table-wrapper">
                ${this.renderPagination(totalPages, startItem, endItem, totalItems)}
                <div class="l8-table-container">
                    <table id="${this.tableId}" class="l8-table">
                        <thead>
                            <tr class="l8-table-header-row">
                                ${this.renderHeaders()}
                            </tr>
                            ${this.renderFilterRow()}
                        </thead>
                        <tbody>
                            ${this.renderBody(paginatedData)}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        this.container.innerHTML = html;
        this.attachEventListeners();

        // Restore focus after re-render
        if (focusedColumn) {
            const input = this.container.querySelector(`.l8-filter-input[data-column="${focusedColumn}"]`);
            if (input) {
                input.focus();
                if (cursorPosition !== null) {
                    input.setSelectionRange(cursorPosition, cursorPosition);
                }
            }
        }
    }

    // Render pagination controls (above table)
    renderPagination(totalPages, startItem, endItem, totalItems) {
        const addButton = this.onAdd ?
            `<button class="l8-btn l8-btn-primary" data-action="add">${this.escapeHtml(this.addButtonText)}</button>` : '';

        if (totalItems === 0) {
            return `<div class="l8-pagination"><div class="l8-pagination-info"></div><div class="l8-pagination-controls">${addButton}</div></div>`;
        }

        return `
            <div class="l8-pagination">
                <div class="l8-pagination-info">
                    <span>Showing ${startItem}-${endItem} of ${totalItems}</span>
                </div>
                <div class="l8-pagination-controls">
                    <div class="l8-page-size">
                        <label>Show:</label>
                        <select class="l8-page-size-select" data-action="pageSize">
                            ${this.pageSizeOptions.map(size =>
                                `<option value="${size}" ${size === this.pageSize ? 'selected' : ''}>${size}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="l8-page-nav">
                        <button class="l8-page-btn" data-action="first" ${this.currentPage === 1 ? 'disabled' : ''}>
                            &laquo;
                        </button>
                        <button class="l8-page-btn" data-action="prev" ${this.currentPage === 1 ? 'disabled' : ''}>
                            &lsaquo;
                        </button>
                        <span class="l8-page-current">
                            Page ${this.currentPage} of ${totalPages || 1}
                        </span>
                        <button class="l8-page-btn" data-action="next" ${this.currentPage >= totalPages ? 'disabled' : ''}>
                            &rsaquo;
                        </button>
                        <button class="l8-page-btn" data-action="last" ${this.currentPage >= totalPages ? 'disabled' : ''}>
                            &raquo;
                        </button>
                    </div>
                    ${this.onAdd ? `<button class="l8-btn l8-btn-primary" data-action="add">${this.escapeHtml(this.addButtonText)}</button>` : ''}
                </div>
            </div>
        `;
    }

    // Render table headers
    renderHeaders() {
        let headers = this.columns.map(col => {
            const sortableClass = this.sortable ? 'sortable' : '';
            let sortIndicator = '';
            if (this.sortable) {
                const icon = this.sortColumn === col.key
                    ? (this.sortDirection === 'asc' ? '▲' : '▼')
                    : '⇅';
                sortIndicator = `<span class="l8-sort-indicator">${icon}</span>`;
            }
            return `<th class="${sortableClass}" data-column="${col.key}">
                <div class="l8-table-header-content">
                    <span>${this.escapeHtml(col.label)}</span>
                    ${sortIndicator}
                </div>
            </th>`;
        }).join('');

        if (this.showActions && (this.onEdit || this.onDelete || this.onToggleState)) {
            headers += '<th>Actions</th>';
        }

        return headers;
    }

    // Render filter row
    renderFilterRow() {
        if (!this.filterable) return '';

        let filterCells = this.columns.map(col => {
            const filterValue = this.filters[col.key] || '';
            return `<th class="l8-table-filter">
                <input type="text" class="l8-filter-input" data-column="${col.key}"
                       value="${this.escapeAttr(filterValue)}" placeholder="Filter...">
            </th>`;
        }).join('');

        if (this.showActions && (this.onEdit || this.onDelete || this.onToggleState)) {
            filterCells += '<th class="l8-table-filter"></th>';
        }

        return `<tr class="l8-table-filter-row">${filterCells}</tr>`;
    }

    // Render table body
    renderBody(data) {
        if (data.length === 0) {
            const colSpan = this.columns.length + (this.showActions ? 1 : 0);
            return `
                <tr>
                    <td colspan="${colSpan}" class="l8-empty-state">
                        <p>${this.escapeHtml(this.emptyMessage)}</p>
                    </td>
                </tr>
            `;
        }

        return data.map((item, index) => this.renderRow(item, index)).join('');
    }

    // Render a single row
    renderRow(item, index) {
        let cells = this.columns.map(col => {
            let value;
            if (col.render) {
                value = col.render(item, index);
            } else if (col.key) {
                value = this.getNestedValue(item, col.key);
                value = this.escapeHtml(value);
            } else {
                value = '';
            }
            return `<td>${value}</td>`;
        }).join('');

        if (this.showActions && (this.onEdit || this.onDelete || this.onToggleState)) {
            const itemId = this.getItemId(item);
            let toggleBtn = '';
            if (this.onToggleState && this.getItemState) {
                const isUp = this.getItemState(item);
                const emoji = isUp ? '⏹️' : '▶️';
                const title = isUp ? 'Stop' : 'Start';
                toggleBtn = `<button class="l8-btn l8-btn-toggle l8-btn-small" data-action="toggle" data-id="${this.escapeAttr(itemId)}" title="${title}">${emoji}</button>`;
            }
            cells += `
                <td>
                    <div class="l8-action-btns">
                        ${toggleBtn}
                        ${this.onEdit ? `<button class="l8-btn l8-btn-small" data-action="edit" data-id="${this.escapeAttr(itemId)}">Edit</button>` : ''}
                        ${this.onDelete ? `<button class="l8-btn l8-btn-danger l8-btn-small" data-action="delete" data-id="${this.escapeAttr(itemId)}">Delete</button>` : ''}
                    </div>
                </td>
            `;
        }

        return `<tr>${cells}</tr>`;
    }

    // Get item ID from common ID field patterns
    getItemId(item) {
        return item.id || item.userId || item.roleId || item.targetId ||
               item.credId || item.key || JSON.stringify(item);
    }

    // Get nested value from object (e.g., 'user.name')
    getNestedValue(obj, key) {
        if (!key) return '';
        const keys = key.split('.');
        let value = obj;
        for (const k of keys) {
            if (value === null || value === undefined) return '';
            value = value[k];
        }
        return value !== null && value !== undefined ? value : '';
    }

    // Attach event listeners
    attachEventListeners() {
        if (!this.container) return;

        // Sorting (click on headers)
        if (this.sortable) {
            this.container.querySelectorAll('th.sortable').forEach(header => {
                header.addEventListener('click', (e) => {
                    const column = header.dataset.column;
                    if (column) this.sort(column);
                });
            });
        }

        // Filtering (input in filter row)
        if (this.filterable) {
            this.container.querySelectorAll('.l8-filter-input').forEach(input => {
                input.addEventListener('input', (e) => {
                    const column = input.dataset.column;
                    const value = input.value;
                    this.filters[column] = value;

                    if (this.serverSide) {
                        this.debouncedFilterHandler();
                    } else {
                        this.filter(column, value);
                    }
                });
            });
        }

        // Page size change
        const pageSizeSelect = this.container.querySelector('[data-action="pageSize"]');
        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', (e) => {
                const newPageSize = parseInt(e.target.value, 10);
                this.pageSize = newPageSize;
                this.currentPage = 1;
                if (this.serverSide) {
                    this.fetchData(this.currentPage, this.pageSize);
                } else {
                    this.render();
                }
            });
        }

        // Pagination buttons
        this.container.querySelectorAll('.l8-page-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                this.handlePageAction(action);
            });
        });

        // Action buttons (Edit/Delete)
        this.container.querySelectorAll('[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                if (this.onEdit) this.onEdit(id);
            });
        });

        this.container.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                if (this.onDelete) this.onDelete(id);
            });
        });

        // Toggle state button
        this.container.querySelectorAll('[data-action="toggle"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('button').dataset.id;
                if (this.onToggleState) this.onToggleState(id);
            });
        });

        // Add button
        this.container.querySelectorAll('[data-action="add"]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.onAdd) this.onAdd();
            });
        });
    }

    // Handle pagination actions
    handlePageAction(action) {
        const totalPages = this.getTotalPages();
        const oldPage = this.currentPage;

        switch (action) {
            case 'first':
                this.currentPage = 1;
                break;
            case 'prev':
                if (this.currentPage > 1) this.currentPage--;
                break;
            case 'next':
                if (this.currentPage < totalPages) this.currentPage++;
                break;
            case 'last':
                this.currentPage = totalPages;
                break;
        }

        if (this.currentPage !== oldPage) {
            if (this.serverSide) {
                this.fetchData(this.currentPage, this.pageSize);
            } else {
                this.render();
            }
        }
    }

    // Go to specific page
    goToPage(page) {
        const totalPages = this.getTotalPages();
        if (page >= 1 && page <= totalPages && page !== this.currentPage) {
            this.currentPage = page;
            if (this.serverSide) {
                this.fetchData(this.currentPage, this.pageSize);
            } else {
                this.render();
            }
        }
    }

    // Sort by column
    sort(column) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }

        // Server-side sorting
        if (this.serverSide) {
            this.currentPage = 1;
            this.fetchData(this.currentPage, this.pageSize);
            return;
        }

        // Client-side sorting
        const columnConfig = this.columns.find(col => col.key === column);
        const sortKey = columnConfig && columnConfig.sortKey ? columnConfig.sortKey : column;

        this.filteredData.sort((a, b) => {
            let aVal = this.getNestedValue(a, sortKey);
            let bVal = this.getNestedValue(b, sortKey);

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

    // Filter data by column value
    filter(column, value) {
        this.filters[column] = value;

        this.filteredData = this.data.filter(row => {
            for (let col in this.filters) {
                const filterValue = this.filters[col].toLowerCase();
                if (filterValue) {
                    const cellValue = String(this.getNestedValue(row, col)).toLowerCase();
                    if (!cellValue.includes(filterValue)) {
                        return false;
                    }
                }
            }
            return true;
        });

        this.currentPage = 1;
        this.render();
    }

    // Mark filter inputs as invalid (for server-side validation)
    setInvalidFilters(invalidColumns) {
        if (!this.container) return;

        this.container.querySelectorAll('.l8-filter-input').forEach(input => {
            input.classList.remove('invalid');
        });

        invalidColumns.forEach(columnKey => {
            const input = this.container.querySelector(`.l8-filter-input[data-column="${columnKey}"]`);
            if (input) {
                input.classList.add('invalid');
            }
        });
    }

    // Escape HTML
    escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    // Escape attribute
    escapeAttr(text) {
        if (text === null || text === undefined) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    // Utility: Create tag HTML
    static tag(text, className) {
        const div = document.createElement('div');
        div.textContent = String(text || '');
        const escaped = div.innerHTML;
        return `<span class="l8-tag ${className || ''}">${escaped}</span>`;
    }

    // Utility: Create multiple tags
    static tags(items, className) {
        if (!items || items.length === 0) return '-';
        return items.map(item => L8Table.tag(item, className)).join(' ');
    }

    // Utility: Format count badge
    static countBadge(count, singular, plural) {
        plural = plural || singular + 's';
        const label = count === 1 ? singular : plural;
        return `<span class="l8-tag">${count} ${label}</span>`;
    }

    // Utility: Status tag
    static statusTag(isUp, upText, downText) {
        upText = upText || 'Up';
        downText = downText || 'Down';
        const className = isUp ? 'l8-tag-up' : 'l8-tag-down';
        const text = isUp ? upText : downText;
        return `<span class="l8-tag ${className}">${text}</span>`;
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = L8Table;
}
