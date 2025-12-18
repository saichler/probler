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
        this.onPageChange = options.onPageChange || null;

        // Add button support
        this.onAdd = options.onAdd || null;
        this.addButtonText = options.addButtonText || 'Add';

        // Toggle state button support
        this.onToggleState = options.onToggleState || null;
        this.getItemState = options.getItemState || null;

        this.container = null;
        this.tableId = options.tableId || 'l8-table-' + Date.now();
    }

    // Initialize the table in the container
    init() {
        this.container = document.getElementById(this.containerId);
        if (!this.container) {
            console.error('Container not found:', this.containerId);
            return;
        }
        this.render();
    }

    // Set data and re-render (for client-side pagination)
    setData(data) {
        this.data = Array.isArray(data) ? data : Object.values(data);
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
        // Client-side: slice the data
        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        return this.data.slice(start, end);
    }

    // Get total items count
    getTotalItems() {
        return this.serverSide ? this.totalItems : this.data.length;
    }

    // Get total pages
    getTotalPages() {
        const total = this.getTotalItems();
        return Math.ceil(total / this.pageSize);
    }

    // Render the complete table component
    render() {
        if (!this.container) return;

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
                            <tr>
                                ${this.renderHeaders()}
                            </tr>
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
        let headers = this.columns.map(col =>
            `<th>${this.escapeHtml(col.label)}</th>`
        ).join('');

        if (this.showActions && (this.onEdit || this.onDelete || this.onToggleState)) {
            headers += '<th>Actions</th>';
        }

        return headers;
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

        // Page size change
        const pageSizeSelect = this.container.querySelector('[data-action="pageSize"]');
        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', (e) => {
                const newPageSize = parseInt(e.target.value, 10);
                this.pageSize = newPageSize;
                this.currentPage = 1;
                if (this.serverSide && this.onPageChange) {
                    this.onPageChange(this.currentPage, this.pageSize);
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
            if (this.serverSide && this.onPageChange) {
                this.onPageChange(this.currentPage, this.pageSize);
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
            if (this.serverSide && this.onPageChange) {
                this.onPageChange(this.currentPage, this.pageSize);
            } else {
                this.render();
            }
        }
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
