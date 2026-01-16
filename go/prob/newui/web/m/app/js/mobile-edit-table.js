/**
 * MobileEditTable - Card-based data display component with CRUD operations
 * Desktop Equivalent: L8Table in edit_table/table.js
 *
 * Features:
 * - Server-side pagination, filtering, sorting (same as MobileTable)
 * - Add button in pagination header
 * - Edit/Delete/Toggle buttons in card footer
 * - Integration with MobilePopup and MobileConfirm
 */
(function() {
    'use strict';

    class MobileEditTable {
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
                filters: config.filters || [],
                baseWhereClause: config.baseWhereClause || null,

                // Sorting
                sortable: config.sortable !== false,
                defaultSort: config.defaultSort || null,

                // Status field
                statusField: config.statusField || null,
                getStatusClass: config.getStatusClass || this._defaultGetStatusClass,

                // CRUD callbacks (from L8Table)
                onAdd: config.onAdd || null,
                addButtonText: config.addButtonText || 'Add',
                onEdit: config.onEdit || null,
                onDelete: config.onDelete || null,
                onToggleState: config.onToggleState || null,
                getItemState: config.getItemState || null,
                getItemId: config.getItemId || this._defaultGetItemId.bind(this),

                // Display
                emptyMessage: config.emptyMessage || 'No items found',
                emptyIcon: config.emptyIcon || '&#x1F4ED;',
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
            this.filterColumn = null;
            this.filterValue = '';
            this.isInvalidFilter = false;

            this.isLoading = false;
            this.hasError = false;
            this.errorMessage = '';

            this.init();
        }

        init() {
            // Create debounced filter handler for server-side filtering
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

            return null;
        }

        /**
         * Build L8Query with filter and sort conditions
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
         */
        async fetchData(page) {
            if (!this.config.endpoint || !this.config.modelName) {
                console.error('MobileEditTable requires endpoint and modelName for server-side mode');
                return;
            }

            this.isLoading = true;
            this.hasError = false;
            this.render();

            const { query, isInvalid } = this.buildQuery(page, this.config.rowsPerPage);
            this.isInvalidFilter = isInvalid;

            try {
                const body = encodeURIComponent(JSON.stringify({ text: query }));
                const response = await MobileAuth.get(this.config.endpoint + '?body=' + body);

                // CRITICAL: Only update totalCount from page 1 response
                let totalCount = this.config.totalCount;
                if (page === 1 && response.metadata?.keyCount?.counts) {
                    totalCount = response.metadata.keyCount.counts.Total || 0;
                }

                // Transform data if transformer provided
                let items = response.list || [];
                if (this.config.transformData) {
                    items = items.map(item => this.config.transformData(item)).filter(item => item !== null);
                }

                // Update table
                this._updateServerData(items, totalCount);
                this.currentPage = page;

                // Call optional callback
                if (this.config.onDataLoaded) {
                    this.config.onDataLoaded(response, items, totalCount);
                }
            } catch (error) {
                console.error('MobileEditTable fetch error:', error);
                this.hasError = true;
                this.errorMessage = error.message || 'Failed to load data';
                this.isLoading = false;
                this.render();

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
            this.filterColumn = null;
            this.filterValue = '';
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
            this.filterColumn = key;
            this.filterValue = value;
            this.currentPage = 1;

            if (this.config.serverSide) {
                this.fetchData(1);
            } else {
                this._applyClientFilters();
            }
        }

        clearFilters() {
            this.filterColumn = null;
            this.filterValue = '';
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
            this.filterColumn = null;
            this.filterValue = '';
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

            let html = '<div class="mobile-edit-table-wrapper">';

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
                    // Pagination above cards (always on TOP)
                    html += this._renderPagination();
                    html += this._renderCards(data);
                }
            }

            html += '</div>';

            container.innerHTML = html;
            this._attachEventListeners();
        }

        _renderFilters() {
            let html = '<div class="mobile-edit-table-filters">';

            // Column dropdown + search text
            if (this.config.columns && this.config.columns.length > 0) {
                const invalidClass = this.isInvalidFilter ? 'invalid' : '';

                html += '<div class="mobile-edit-table-filter-row">';

                // Column dropdown
                html += '<select class="mobile-edit-table-column-select">';
                html += '<option value="">All Columns</option>';
                this.config.columns.forEach(col => {
                    const selected = this.filterColumn === col.key ? 'selected' : '';
                    html += `<option value="${col.key}" ${selected}>${this._escapeHtml(col.label)}</option>`;
                });
                html += '</select>';

                // Search text input
                html += `<input type="text"
                               class="mobile-edit-table-search-input ${invalidClass}"
                               placeholder="Filter..."
                               value="${this._escapeHtml(this.filterValue)}">`;

                html += '</div>';
            }

            html += '</div>';
            return html;
        }

        _renderCards(data) {
            let html = '<div class="mobile-edit-table-cards">';

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
            const itemId = this.config.getItemId(item);

            let html = `<div class="mobile-edit-table-card ${clickableClass}" data-index="${index}" data-id="${this._escapeAttr(itemId)}">`;

            // Card header
            html += '<div class="mobile-edit-table-card-header">';

            // Primary info (title)
            html += '<div>';
            primaryCols.forEach(col => {
                let value = this._getNestedValue(item, col.key);
                if (col.formatter) value = col.formatter(value, item);
                html += `<h4 class="mobile-edit-table-card-title">${this._escapeHtml(value)}</h4>`;
            });

            // Secondary info (subtitle)
            secondaryCols.forEach(col => {
                let value = this._getNestedValue(item, col.key);
                if (col.formatter) value = col.formatter(value, item);
                html += `<p class="mobile-edit-table-card-subtitle">${this._escapeHtml(value)}</p>`;
            });
            html += '</div>';

            // Status badge
            if (this.config.statusField) {
                const statusValue = this._getNestedValue(item, this.config.statusField);
                const statusClass = this.config.getStatusClass(statusValue);
                html += `
                    <div class="mobile-edit-table-status ${statusClass}">
                        <span class="mobile-edit-table-status-indicator"></span>
                        <span>${this._formatStatus(statusValue)}</span>
                    </div>
                `;
            }

            html += '</div>';

            // Card body (remaining fields)
            if (bodyCols.length > 0) {
                html += '<div class="mobile-edit-table-card-body">';
                bodyCols.forEach(col => {
                    let value = this._getNestedValue(item, col.key);
                    if (col.formatter) value = col.formatter(value, item);
                    html += `
                        <div class="mobile-edit-table-card-row">
                            <span class="mobile-edit-table-card-label">${this._escapeHtml(col.label)}</span>
                            <span class="mobile-edit-table-card-value">${this._escapeHtml(value)}</span>
                        </div>
                    `;
                });
                html += '</div>';
            }

            // Card footer with action buttons
            html += this._renderCardActions(item, itemId);

            html += '</div>';
            return html;
        }

        /**
         * Render action buttons in card footer (Edit, Delete, Toggle)
         */
        _renderCardActions(item, itemId) {
            const hasActions = this.config.onEdit || this.config.onDelete || this.config.onToggleState;
            if (!hasActions) return '';

            let html = '<div class="mobile-edit-table-card-actions">';

            // Toggle state button
            if (this.config.onToggleState && this.config.getItemState) {
                const isUp = this.config.getItemState(item);
                const icon = isUp ? '&#x23F9;' : '&#x25B6;';  // Stop : Play
                const title = isUp ? 'Stop' : 'Start';
                html += `<button class="mobile-edit-table-action-btn toggle ${isUp ? 'active' : ''}"
                                 data-action="toggle" data-id="${this._escapeAttr(itemId)}"
                                 title="${title}">${icon}</button>`;
            }

            // Edit button
            if (this.config.onEdit) {
                html += `<button class="mobile-edit-table-action-btn edit"
                                 data-action="edit" data-id="${this._escapeAttr(itemId)}">Edit</button>`;
            }

            // Delete button
            if (this.config.onDelete) {
                html += `<button class="mobile-edit-table-action-btn delete"
                                 data-action="delete" data-id="${this._escapeAttr(itemId)}">Delete</button>`;
            }

            html += '</div>';
            return html;
        }

        _renderPagination() {
            const stats = this.getStats();

            let html = '<div class="mobile-edit-table-pagination">';

            // Info row with Add button
            html += '<div class="mobile-edit-table-pagination-header">';

            // Pagination info
            html += `<div class="mobile-edit-table-pagination-info">
                Showing ${stats.startIndex}-${stats.endIndex} of ${stats.totalCount}
            </div>`;

            // Add button (if onAdd callback provided)
            if (this.config.onAdd) {
                html += `<button class="mobile-edit-table-add-btn" data-action="add">
                    + ${this._escapeHtml(this.config.addButtonText)}
                </button>`;
            }

            html += '</div>';

            // Page controls (if more than 1 page)
            if (stats.totalPages > 1) {
                html += '<div class="mobile-edit-table-pagination-controls">';

                // First page
                html += `
                    <button class="mobile-edit-table-pagination-btn nav-btn ${stats.currentPage === 1 ? 'disabled' : ''}"
                            data-action="first" ${stats.currentPage === 1 ? 'disabled' : ''}>
                        &#171;
                    </button>
                `;

                // Previous
                html += `
                    <button class="mobile-edit-table-pagination-btn nav-btn ${stats.currentPage === 1 ? 'disabled' : ''}"
                            data-action="prev" ${stats.currentPage === 1 ? 'disabled' : ''}>
                        &#8249;
                    </button>
                `;

                // Page numbers
                const pageRange = this._getPageRange(stats.currentPage, stats.totalPages);
                pageRange.forEach(page => {
                    if (page === '...') {
                        html += '<span class="mobile-edit-table-pagination-ellipsis">...</span>';
                    } else {
                        html += `
                            <button class="mobile-edit-table-pagination-btn ${page === stats.currentPage ? 'active' : ''}"
                                    data-page="${page}">${page}</button>
                        `;
                    }
                });

                // Next
                html += `
                    <button class="mobile-edit-table-pagination-btn nav-btn ${stats.currentPage === stats.totalPages ? 'disabled' : ''}"
                            data-action="next" ${stats.currentPage === stats.totalPages ? 'disabled' : ''}>
                        &#8250;
                    </button>
                `;

                // Last page
                html += `
                    <button class="mobile-edit-table-pagination-btn nav-btn ${stats.currentPage === stats.totalPages ? 'disabled' : ''}"
                            data-action="last" ${stats.currentPage === stats.totalPages ? 'disabled' : ''}>
                        &#187;
                    </button>
                `;

                html += '</div>';
            }

            html += '</div>';
            return html;
        }

        _renderLoading() {
            return `
                <div class="mobile-edit-table-loading">
                    <div class="mobile-edit-table-loading-spinner"></div>
                    <span class="mobile-edit-table-loading-text">${this._escapeHtml(this.config.loadingMessage)}</span>
                </div>
            `;
        }

        _renderEmpty() {
            let html = '<div class="mobile-edit-table-empty">';

            // Show Add button even when empty
            if (this.config.onAdd) {
                html += `<button class="mobile-edit-table-add-btn large" data-action="add">
                    + ${this._escapeHtml(this.config.addButtonText)}
                </button>`;
            }

            html += `
                <span class="mobile-edit-table-empty-icon">${this.config.emptyIcon}</span>
                <h4 class="mobile-edit-table-empty-title">No Results</h4>
                <p class="mobile-edit-table-empty-message">${this._escapeHtml(this.config.emptyMessage)}</p>
            </div>`;

            return html;
        }

        _renderError() {
            return `
                <div class="mobile-edit-table-error">
                    <span class="mobile-edit-table-error-icon">&#x26A0;</span>
                    <h4 class="mobile-edit-table-error-title">Error Loading Data</h4>
                    <p class="mobile-edit-table-error-message">${this._escapeHtml(this.errorMessage)}</p>
                    <button class="mobile-edit-table-error-retry">Retry</button>
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
            const columnSelect = container.querySelector('.mobile-edit-table-column-select');
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
            const searchInput = container.querySelector('.mobile-edit-table-search-input');
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
            container.querySelectorAll('.mobile-edit-table-pagination-btn').forEach(btn => {
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

            // Add button
            container.querySelectorAll('[data-action="add"]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (this.config.onAdd) {
                        this.config.onAdd();
                    }
                });
            });

            // Edit buttons
            container.querySelectorAll('[data-action="edit"]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = btn.dataset.id;
                    const item = this._findItemById(id);
                    if (this.config.onEdit) {
                        this.config.onEdit(id, item);
                    }
                });
            });

            // Delete buttons
            container.querySelectorAll('[data-action="delete"]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = btn.dataset.id;
                    const item = this._findItemById(id);
                    if (this.config.onDelete) {
                        this.config.onDelete(id, item);
                    }
                });
            });

            // Toggle buttons
            container.querySelectorAll('[data-action="toggle"]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = btn.dataset.id;
                    const item = this._findItemById(id);
                    if (this.config.onToggleState) {
                        this.config.onToggleState(id, item);
                    }
                });
            });

            // Card body click (not action buttons)
            if (this.config.onCardClick) {
                container.querySelectorAll('.mobile-edit-table-card-body').forEach(body => {
                    body.addEventListener('click', () => {
                        const card = body.closest('.mobile-edit-table-card');
                        const index = parseInt(card.dataset.index);
                        const data = this._getPageData();
                        if (data[index]) {
                            this.config.onCardClick(data[index], index);
                        }
                    });
                });
            }

            // Retry button
            const retryBtn = container.querySelector('.mobile-edit-table-error-retry');
            if (retryBtn) {
                retryBtn.addEventListener('click', () => {
                    this.fetchData(this.currentPage);
                });
            }
        }

        // ============================================
        // PRIVATE HELPERS
        // ============================================

        _findItemById(id) {
            return this.config.data.find(item =>
                String(this.config.getItemId(item)) === String(id)
            );
        }

        _defaultGetItemId(item) {
            return item.id || item.Id || item.targetId || item.name || '';
        }

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
            this.render();
        }

        _applyClientFilters() {
            this.filteredData = this.config.data.filter(item => {
                if (!this.filterValue) return true;

                if (this.filterColumn) {
                    const column = this.config.columns.find(c => c.key === this.filterColumn);
                    const value = this._getNestedValue(item, column?.key || this.filterColumn);
                    return String(value).toLowerCase().includes(this.filterValue.toLowerCase());
                } else {
                    // Search all columns
                    return this.config.columns.some(col => {
                        const value = this._getNestedValue(item, col.key);
                        return String(value).toLowerCase().includes(this.filterValue.toLowerCase());
                    });
                }
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
            const delta = 1;

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
                statusLower.includes('running') || statusLower.includes('active') ||
                statusLower === 'up' || status === 2) {
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

            // Handle numeric status (e.g., from enum)
            if (typeof status === 'number') {
                const statusMap = { 0: 'Unknown', 1: 'Down', 2: 'Up', 3: 'Maintenance' };
                return statusMap[status] || 'Unknown';
            }

            // Convert enum-style status to readable format
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

        _escapeAttr(text) {
            if (text == null) return '';
            return String(text)
                .replace(/&/g, '&amp;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
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
    window.MobileEditTable = MobileEditTable;

})();
