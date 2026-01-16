/**
 * MobileTable - Card-based data display component with server-side pagination
 * Desktop Equivalent: ProblerTable in view_table/table.js
 */
(function() {
    'use strict';

    class MobileTable {
        constructor(containerId, config) {
            this.containerId = containerId;
            this.config = {
                // Columns/Fields configuration
                columns: config.columns || [],

                // Data source
                data: config.data || [],
                endpoint: config.endpoint || null,
                modelName: config.modelName || null,

                // Pagination
                rowsPerPage: config.rowsPerPage || 15,
                serverSide: config.serverSide !== false,
                totalCount: config.totalCount || 0,

                // Filtering
                filterable: config.filterable !== false,
                filterDebounceMs: config.filterDebounceMs || 1000,
                searchFields: config.searchFields || [],
                searchPlaceholder: config.searchPlaceholder || 'Search...',
                filters: config.filters || [],       // Filter chip configurations
                baseWhereClause: config.baseWhereClause || null,

                // Sorting
                sortable: config.sortable !== false,
                defaultSort: config.defaultSort || null,

                // Status field
                statusField: config.statusField || null,
                getStatusClass: config.getStatusClass || this._defaultGetStatusClass,

                // Display
                emptyMessage: config.emptyMessage || 'No items found',
                emptyIcon: config.emptyIcon || '📭',
                loadingMessage: config.loadingMessage || 'Loading...',

                // Custom rendering
                renderCard: config.renderCard || null,

                // Callbacks
                transformData: config.transformData || null,
                onDataLoaded: config.onDataLoaded || null,
                onCardClick: config.onCardClick || null,
                onError: config.onError || null
            };

            // State
            this.currentPage = 1;
            this.filteredData = [...this.config.data];
            this.sortColumn = this.config.defaultSort?.column || null;
            this.sortDirection = this.config.defaultSort?.direction || 'asc';

            // Filter state (dropdown + search text)
            this.filterColumn = null;   // Selected column key (e.g., 'status')
            this.filterValue = '';      // User's filter text (e.g., 'online')
            this.isInvalidFilter = false;  // True when enum filter is invalid

            this.isLoading = false;
            this.hasError = false;
            this.errorMessage = '';

            this.init();
        }

        init() {
            // Create debounced filter handler for server-side filtering (matches desktop)
            if (this.config.serverSide) {
                this.debouncedFilterHandler = this._debounce(() => {
                    this.currentPage = 1;
                    this.fetchData(1);
                }, this.config.filterDebounceMs);
            }

            this.render();

            // Auto-fetch initial data if server-side with endpoint
            if (this.config.serverSide && this.config.endpoint && this.config.modelName) {
                this.fetchData(1);
            }
        }

        // ============================================
        // DATA FETCHING
        // ============================================

        /**
         * Match enum value from user input (case-insensitive partial match)
         * Copied from desktop ProblerTable
         */
        _matchEnumValue(input, enumValues) {
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

        /**
         * Build L8Query with filter and sort conditions
         * Matches desktop ProblerTable.buildQuery()
         */
        buildQuery(page, pageSize) {
            const pageIndex = page - 1;
            const filterConditions = [];
            let isInvalid = false;

            // Start with base where clause if provided
            if (this.config.baseWhereClause) {
                filterConditions.push(this.config.baseWhereClause);
            }

            // Build filter condition from column dropdown + search text
            if (this.filterValue) {
                if (this.filterColumn) {
                    // Specific column selected
                    const column = this.config.columns.find(c => c.key === this.filterColumn);
                    if (column) {
                        const filterKey = column.filterKey || column.key;
                        let queryValue;

                        if (column.enumValues) {
                            // Enum column: convert display text to number
                            const enumValue = this._matchEnumValue(this.filterValue, column.enumValues);
                            if (enumValue !== null) {
                                queryValue = enumValue;
                            } else {
                                // Invalid enum - mark as invalid, skip filter
                                isInvalid = true;
                            }
                        } else {
                            // Text column: use wildcard suffix
                            queryValue = `${this.filterValue}*`;
                        }

                        if (queryValue !== undefined) {
                            filterConditions.push(`${filterKey}=${queryValue}`);
                        }
                    }
                } else {
                    // "All Columns" selected - search by Id with wildcard
                    filterConditions.push(`Id=${this.filterValue}*`);
                }
            }

            // Build query
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

            return { query, isInvalid };
        }

        /**
         * Fetch data from server
         * Matches desktop ProblerTable.fetchData() pattern
         */
        async fetchData(page) {
            if (!this.config.endpoint || !this.config.modelName) {
                console.error('MobileTable requires endpoint and modelName for server-side mode');
                return;
            }

            this.isLoading = true;
            this.hasError = false;
            this.render();

            const { query, isInvalid } = this.buildQuery(page, this.config.rowsPerPage);

            // Update invalid filter state
            this.isInvalidFilter = isInvalid;

            try {
                const body = encodeURIComponent(JSON.stringify({ text: query }));
                const response = await MobileAuth.get(this.config.endpoint + '?body=' + body);

                // CRITICAL: Only update totalCount from page 1 response
                // Page 2+ does NOT have valid metadata
                let totalCount = this.config.totalCount;  // Keep existing
                if (page === 1 && response.metadata?.keyCount?.counts) {
                    totalCount = response.metadata.keyCount.counts.Total || 0;
                }

                // Transform data if transformer provided
                let items = response.list || [];
                if (this.config.transformData) {
                    items = items.map(item => this.config.transformData(item)).filter(item => item !== null);
                }

                // Update table - this calls render() (matches desktop pattern)
                this._updateServerData(items, totalCount);
                this.currentPage = page;

                // Call optional callback
                if (this.config.onDataLoaded) {
                    this.config.onDataLoaded(response, items, totalCount);
                }
            } catch (error) {
                console.error('MobileTable fetch error:', error);
                this.hasError = true;
                this.errorMessage = error.message || 'Failed to load data';
                this.isLoading = false;
                this.render();  // Render error state

                if (this.config.onError) {
                    this.config.onError(error);
                }
            }
        }

        /**
         * Refresh current page
         */
        refresh() {
            if (this.config.serverSide) {
                this.fetchData(this.currentPage);
            } else {
                this.render();
            }
        }

        /**
         * Reset to initial state
         */
        reset() {
            this.currentPage = 1;
            this.searchQuery = '';
            this.activeFilters = {};
            this.sortColumn = this.config.defaultSort?.column || null;
            this.sortDirection = this.config.defaultSort?.direction || 'asc';

            if (this.config.serverSide) {
                this.fetchData(1);
            } else {
                this.filteredData = [...this.config.data];
                this.render();
            }
        }

        // ============================================
        // PAGINATION
        // ============================================

        goToPage(page) {
            const totalCount = this.config.serverSide ? this.config.totalCount : this.filteredData.length;
            const totalPages = Math.ceil(totalCount / this.config.rowsPerPage);

            if (page >= 1 && page <= totalPages) {
                this.currentPage = page;

                if (this.config.serverSide) {
                    this.fetchData(page);
                } else {
                    this.render();
                }
            }
        }

        getStats() {
            const totalCount = this.config.serverSide ? this.config.totalCount : this.filteredData.length;
            const totalPages = Math.ceil(totalCount / this.config.rowsPerPage);
            const startIndex = (this.currentPage - 1) * this.config.rowsPerPage;
            const endIndex = Math.min(startIndex + this.config.rowsPerPage, totalCount);

            return {
                totalCount,
                totalPages,
                currentPage: this.currentPage,
                startIndex: startIndex + 1,
                endIndex,
                rowsPerPage: this.config.rowsPerPage
            };
        }

        // ============================================
        // FILTERING
        // ============================================

        setFilter(key, value) {
            if (value) {
                this.activeFilters[key] = value;
            } else {
                delete this.activeFilters[key];
            }

            this.currentPage = 1;

            if (this.config.serverSide) {
                this.fetchData(1);
            } else {
                this._applyClientFilters();
            }
        }

        clearFilters() {
            this.activeFilters = {};
            this.searchQuery = '';
            this.currentPage = 1;

            if (this.config.serverSide) {
                this.fetchData(1);
            } else {
                this.filteredData = [...this.config.data];
                this.render();
            }
        }

        setBaseWhereClause(whereClause) {
            this.config.baseWhereClause = whereClause;
            this.activeFilters = {};
            this.currentPage = 1;
            this.fetchData(1);
        }

        // ============================================
        // SORTING
        // ============================================

        sort(column) {
            if (this.sortColumn === column) {
                this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                this.sortColumn = column;
                this.sortDirection = 'asc';
            }

            this.currentPage = 1;

            if (this.config.serverSide) {
                this.fetchData(1);
            } else {
                this._applyClientSort();
            }
        }

        // ============================================
        // DATA ACCESS
        // ============================================

        getData() {
            return this.config.serverSide ? this.config.data : this.filteredData;
        }

        updateData(newData) {
            this.config.data = newData;
            this.filteredData = [...newData];
            this.currentPage = 1;
            this.render();
        }

        // ============================================
        // RENDERING
        // ============================================

        render() {
            const container = document.getElementById(this.containerId);
            if (!container) return;

            let html = '<div class="mobile-table-wrapper">';

            // Filters section
            if (this.config.filterable) {
                html += this._renderFilters();
            }

            // Content area
            if (this.isLoading) {
                html += this._renderLoading();
            } else if (this.hasError) {
                html += this._renderError();
            } else {
                const data = this._getPageData();
                if (data.length === 0) {
                    html += this._renderEmpty();
                } else {
                    // Pagination above cards (matches desktop pattern)
                    html += this._renderPagination();
                    html += this._renderCards(data);
                }
            }

            html += '</div>';

            container.innerHTML = html;
            this._attachEventListeners();
        }

        _renderFilters() {
            let html = '<div class="mobile-table-filters">';

            // Column dropdown + search text (matches desktop pattern)
            if (this.config.columns && this.config.columns.length > 0) {
                const invalidClass = this.isInvalidFilter ? 'invalid' : '';

                html += '<div class="mobile-table-filter-row">';

                // Column dropdown - populated from columns config
                html += '<select class="mobile-table-column-select">';
                html += '<option value="">All Columns</option>';
                this.config.columns.forEach(col => {
                    const selected = this.filterColumn === col.key ? 'selected' : '';
                    html += `<option value="${col.key}" ${selected}>${this._escapeHtml(col.label)}</option>`;
                });
                html += '</select>';

                // Search text input
                html += `<input type="text"
                               class="mobile-table-search-input ${invalidClass}"
                               placeholder="Filter..."
                               value="${this._escapeHtml(this.filterValue)}">`;

                html += '</div>';
            }

            // Sort row (dropdown + direction button)
            if (this.config.sortable && this.config.columns && this.config.columns.length > 0) {
                // Get sortable columns (those with sortKey or filterKey)
                const sortableColumns = this.config.columns.filter(col => col.sortKey || col.filterKey);

                if (sortableColumns.length > 0) {
                    html += '<div class="mobile-table-sort-row">';

                    // Sort column dropdown
                    html += '<select class="mobile-table-sort-select">';
                    html += '<option value="">No Sorting</option>';
                    sortableColumns.forEach(col => {
                        const selected = this.sortColumn === col.key ? 'selected' : '';
                        html += `<option value="${col.key}" ${selected}>${this._escapeHtml(col.label)}</option>`;
                    });
                    html += '</select>';

                    // Sort direction button (▲ for asc, ▼ for desc)
                    const directionIcon = this.sortDirection === 'asc' ? '&#9650;' : '&#9660;';
                    const directionTitle = this.sortDirection === 'asc' ? 'Ascending (click to change)' : 'Descending (click to change)';
                    const disabled = !this.sortColumn ? 'disabled' : '';
                    html += `<button class="mobile-table-sort-direction-btn" ${disabled} title="${directionTitle}">
                                ${directionIcon}
                             </button>`;

                    html += '</div>';
                }
            }

            html += '</div>';
            return html;
        }

        _renderCards(data) {
            let html = '<div class="mobile-table-cards">';

            data.forEach((item, index) => {
                if (this.config.renderCard) {
                    // Custom card renderer
                    html += this.config.renderCard(item, index, this);
                } else {
                    // Default card renderer
                    html += this._renderDefaultCard(item, index);
                }
            });

            html += '</div>';
            return html;
        }

        _renderDefaultCard(item, index) {
            const primaryCols = this.config.columns.filter(c => c.primary);
            const secondaryCols = this.config.columns.filter(c => c.secondary);
            const bodyCols = this.config.columns.filter(c => !c.primary && !c.secondary && !c.hidden);

            const clickableClass = this.config.onCardClick ? 'clickable' : '';

            let html = `<div class="mobile-table-card ${clickableClass}" data-index="${index}">`;

            // Card header
            html += '<div class="mobile-table-card-header">';

            // Primary info (title)
            html += '<div>';
            primaryCols.forEach(col => {
                let value = this._getNestedValue(item, col.key);
                if (col.formatter) value = col.formatter(value, item);
                html += `<h4 class="mobile-table-card-title">${this._escapeHtml(value)}</h4>`;
            });

            // Secondary info (subtitle)
            secondaryCols.forEach(col => {
                let value = this._getNestedValue(item, col.key);
                if (col.formatter) value = col.formatter(value, item);
                html += `<p class="mobile-table-card-subtitle">${this._escapeHtml(value)}</p>`;
            });
            html += '</div>';

            // Status badge
            if (this.config.statusField) {
                const statusValue = this._getNestedValue(item, this.config.statusField);
                const statusClass = this.config.getStatusClass(statusValue);
                html += `
                    <div class="mobile-table-status ${statusClass}">
                        <span class="mobile-table-status-indicator"></span>
                        <span>${this._formatStatus(statusValue)}</span>
                    </div>
                `;
            }

            html += '</div>';

            // Card body (remaining fields)
            if (bodyCols.length > 0) {
                html += '<div class="mobile-table-card-body">';
                bodyCols.forEach(col => {
                    let value = this._getNestedValue(item, col.key);
                    if (col.formatter) value = col.formatter(value, item);
                    html += `
                        <div class="mobile-table-card-row">
                            <span class="mobile-table-card-label">${this._escapeHtml(col.label)}</span>
                            <span class="mobile-table-card-value">${this._escapeHtml(value)}</span>
                        </div>
                    `;
                });
                html += '</div>';
            }

            html += '</div>';
            return html;
        }

        _renderPagination() {
            const stats = this.getStats();
            if (stats.totalPages <= 1) return '';

            let html = '<div class="mobile-table-pagination">';

            // Info
            html += `
                <div class="mobile-table-pagination-info">
                    Showing ${stats.startIndex}-${stats.endIndex} of ${stats.totalCount}
                </div>
            `;

            // Controls
            html += '<div class="mobile-table-pagination-controls">';

            // First page
            html += `
                <button class="mobile-table-pagination-btn nav-btn ${stats.currentPage === 1 ? 'disabled' : ''}"
                        data-action="first" ${stats.currentPage === 1 ? 'disabled' : ''}>
                    &#171;
                </button>
            `;

            // Previous
            html += `
                <button class="mobile-table-pagination-btn nav-btn ${stats.currentPage === 1 ? 'disabled' : ''}"
                        data-action="prev" ${stats.currentPage === 1 ? 'disabled' : ''}>
                    &#8249;
                </button>
            `;

            // Page numbers
            const pageRange = this._getPageRange(stats.currentPage, stats.totalPages);
            pageRange.forEach(page => {
                if (page === '...') {
                    html += '<span class="mobile-table-pagination-ellipsis">...</span>';
                } else {
                    html += `
                        <button class="mobile-table-pagination-btn ${page === stats.currentPage ? 'active' : ''}"
                                data-page="${page}">${page}</button>
                    `;
                }
            });

            // Next
            html += `
                <button class="mobile-table-pagination-btn nav-btn ${stats.currentPage === stats.totalPages ? 'disabled' : ''}"
                        data-action="next" ${stats.currentPage === stats.totalPages ? 'disabled' : ''}>
                    &#8250;
                </button>
            `;

            // Last page
            html += `
                <button class="mobile-table-pagination-btn nav-btn ${stats.currentPage === stats.totalPages ? 'disabled' : ''}"
                        data-action="last" ${stats.currentPage === stats.totalPages ? 'disabled' : ''}>
                    &#187;
                </button>
            `;

            html += '</div></div>';
            return html;
        }

        _renderLoading() {
            return `
                <div class="mobile-table-loading">
                    <div class="mobile-table-loading-spinner"></div>
                    <span class="mobile-table-loading-text">${this._escapeHtml(this.config.loadingMessage)}</span>
                </div>
            `;
        }

        _renderEmpty() {
            return `
                <div class="mobile-table-empty">
                    <span class="mobile-table-empty-icon">${this.config.emptyIcon}</span>
                    <h4 class="mobile-table-empty-title">No Results</h4>
                    <p class="mobile-table-empty-message">${this._escapeHtml(this.config.emptyMessage)}</p>
                </div>
            `;
        }

        _renderError() {
            return `
                <div class="mobile-table-error">
                    <span class="mobile-table-error-icon">&#x26A0;</span>
                    <h4 class="mobile-table-error-title">Error Loading Data</h4>
                    <p class="mobile-table-error-message">${this._escapeHtml(this.errorMessage)}</p>
                    <button class="mobile-table-error-retry">Retry</button>
                </div>
            `;
        }

        // ============================================
        // EVENT HANDLING
        // ============================================

        _attachEventListeners() {
            const container = document.getElementById(this.containerId);
            if (!container) return;

            // Column dropdown change
            const columnSelect = container.querySelector('.mobile-table-column-select');
            if (columnSelect) {
                columnSelect.addEventListener('change', (e) => {
                    this.filterColumn = e.target.value || null;
                    // If there's already a filter value, re-fetch
                    if (this.filterValue) {
                        this.currentPage = 1;
                        this.fetchData(1);
                    }
                });
            }

            // Search text input (debounced)
            const searchInput = container.querySelector('.mobile-table-search-input');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    this.filterValue = e.target.value;

                    if (this.config.serverSide) {
                        this.debouncedFilterHandler();
                    } else {
                        this._applyClientFilters();
                    }
                });
            }

            // Pagination buttons
            container.querySelectorAll('.mobile-table-pagination-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const action = btn.dataset.action;
                    const page = btn.dataset.page;
                    const stats = this.getStats();

                    if (action === 'first') {
                        this.goToPage(1);
                    } else if (action === 'prev') {
                        this.goToPage(this.currentPage - 1);
                    } else if (action === 'next') {
                        this.goToPage(this.currentPage + 1);
                    } else if (action === 'last') {
                        this.goToPage(stats.totalPages);
                    } else if (page) {
                        this.goToPage(parseInt(page));
                    }
                });
            });

            // Card clicks
            if (this.config.onCardClick) {
                container.querySelectorAll('.mobile-table-card').forEach(card => {
                    card.addEventListener('click', () => {
                        const index = parseInt(card.dataset.index);
                        const data = this._getPageData();
                        if (data[index]) {
                            this.config.onCardClick(data[index], index);
                        }
                    });
                });
            }

            // Retry button
            const retryBtn = container.querySelector('.mobile-table-error-retry');
            if (retryBtn) {
                retryBtn.addEventListener('click', () => {
                    this.fetchData(this.currentPage);
                });
            }

            // Sort column dropdown change
            const sortSelect = container.querySelector('.mobile-table-sort-select');
            if (sortSelect) {
                sortSelect.addEventListener('change', (e) => {
                    const column = e.target.value || null;
                    if (column) {
                        // Set sort column (keep current direction or default to asc)
                        this.sortColumn = column;
                        if (!this.sortDirection) this.sortDirection = 'asc';
                    } else {
                        // Clear sorting
                        this.sortColumn = null;
                    }
                    this.currentPage = 1;
                    if (this.config.serverSide) {
                        this.fetchData(1);
                    } else {
                        if (this.sortColumn) {
                            this._applyClientSort();
                        } else {
                            this.filteredData = [...this.config.data];
                            this.render();
                        }
                    }
                });
            }

            // Sort direction button click
            const sortDirectionBtn = container.querySelector('.mobile-table-sort-direction-btn');
            if (sortDirectionBtn) {
                sortDirectionBtn.addEventListener('click', () => {
                    if (!this.sortColumn) return;

                    // Toggle direction
                    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
                    this.currentPage = 1;

                    if (this.config.serverSide) {
                        this.fetchData(1);
                    } else {
                        this._applyClientSort();
                    }
                });
            }
        }

        // ============================================
        // PRIVATE HELPERS
        // ============================================

        _getPageData() {
            if (this.config.serverSide) {
                return this.config.data;
            }

            const startIndex = (this.currentPage - 1) * this.config.rowsPerPage;
            const endIndex = startIndex + this.config.rowsPerPage;
            return this.filteredData.slice(startIndex, endIndex);
        }

        _updateServerData(newData, totalCount) {
            this.config.data = newData;
            this.config.totalCount = totalCount;
            this.isLoading = false;
            this.hasError = false;
            this.render();  // Matches desktop pattern: render after data update
        }

        _applyClientFilters() {
            this.filteredData = this.config.data.filter(item => {
                // Check search query
                if (this.searchQuery && this.config.searchFields.length > 0) {
                    const query = this.searchQuery.toLowerCase();
                    const matches = this.config.searchFields.some(field => {
                        const value = this._getNestedValue(item, field);
                        return String(value).toLowerCase().includes(query);
                    });
                    if (!matches) return false;
                }

                // Check active filters
                for (const [key, value] of Object.entries(this.activeFilters)) {
                    if (!value) continue;
                    const itemValue = this._getNestedValue(item, key);
                    if (String(itemValue) !== String(value)) return false;
                }

                return true;
            });

            this.currentPage = 1;
            this.render();
        }

        _applyClientSort() {
            if (!this.sortColumn) return;

            const column = this.config.columns.find(c => c.key === this.sortColumn);
            const sortKey = column?.sortKey || this.sortColumn;

            this.filteredData.sort((a, b) => {
                let aVal = this._getNestedValue(a, sortKey);
                let bVal = this._getNestedValue(b, sortKey);

                // Handle numbers
                if (!isNaN(aVal) && !isNaN(bVal)) {
                    aVal = parseFloat(aVal);
                    bVal = parseFloat(bVal);
                }

                if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
                if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
                return 0;
            });

            this.render();
        }

        _getPageRange(current, total) {
            const range = [];
            const delta = 1; // Show fewer pages on mobile

            for (let i = 1; i <= total; i++) {
                if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
                    range.push(i);
                } else if (range[range.length - 1] !== '...') {
                    range.push('...');
                }
            }

            return range;
        }

        _getNestedValue(obj, path) {
            if (!path) return '';
            const keys = path.split('.');
            let value = obj;
            for (const key of keys) {
                if (value == null) return '';
                value = value[key];
            }
            return value ?? '';
        }

        _defaultGetStatusClass(status) {
            if (!status) return 'offline';
            const statusLower = String(status).toLowerCase();

            if (statusLower.includes('online') || statusLower.includes('operational') ||
                statusLower.includes('ok') || statusLower.includes('healthy') ||
                statusLower.includes('running') || statusLower.includes('active')) {
                return 'operational';
            } else if (statusLower.includes('warning') || statusLower.includes('degraded') ||
                       statusLower.includes('partial')) {
                return 'warning';
            } else if (statusLower.includes('critical') || statusLower.includes('error') ||
                       statusLower.includes('down') || statusLower.includes('failed')) {
                return 'critical';
            } else if (statusLower.includes('maintenance')) {
                return 'maintenance';
            } else if (statusLower.includes('offline') || statusLower.includes('unknown') ||
                       statusLower.includes('pending')) {
                return 'offline';
            }

            return 'offline';
        }

        _formatStatus(status) {
            if (!status) return 'Unknown';

            // Convert enum-style status to readable format
            // e.g., DEVICE_STATUS_ONLINE -> Online
            let formatted = String(status)
                .replace(/^[A-Z_]+_STATUS_/, '')
                .replace(/_/g, ' ')
                .toLowerCase();

            return formatted.charAt(0).toUpperCase() + formatted.slice(1);
        }

        _escapeHtml(text) {
            if (text == null) return '';
            const div = document.createElement('div');
            div.textContent = String(text);
            return div.innerHTML;
        }

        _debounce(func, wait) {
            let timeout;
            return (...args) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), wait);
            };
        }
    }

    // Export to global scope
    window.MobileTable = MobileTable;

})();
