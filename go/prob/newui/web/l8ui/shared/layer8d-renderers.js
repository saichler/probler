/*
© 2025 Sharon Aicler (saichler@gmail.com)

Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
You may obtain a copy of the License at:

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
/**
 * ERP Shared Renderers
 * UI rendering functions for consistent display across all modules
 */
(function() {
    'use strict';

    const { escapeHtml, formatDate, formatMoney, formatPercentage } = Layer8DUtils;

    // ========================================
    // STATUS CLASSES (configurable per module)
    // ========================================

    const DEFAULT_STATUS_CLASSES = {
        // Positive states
        active: 'layer8d-status-active',
        approved: 'layer8d-status-active',
        completed: 'layer8d-status-active',
        paid: 'layer8d-status-active',

        // Warning states
        pending: 'layer8d-status-pending',
        review: 'layer8d-status-pending',
        draft: 'layer8d-status-pending',

        // Neutral states
        inactive: 'layer8d-status-inactive',
        cancelled: 'layer8d-status-inactive',

        // Negative states
        terminated: 'layer8d-status-terminated',
        rejected: 'layer8d-status-terminated',
        failed: 'layer8d-status-terminated',

        // Numeric status codes (legacy support)
        1: 'layer8d-status-active',
        2: 'layer8d-status-pending',
        3: 'layer8d-status-inactive',
        4: 'layer8d-status-terminated'
    };

    // ========================================
    // GENERIC RENDERERS
    // ========================================

    /**
     * Render an enum value as text
     */
    function renderEnum(value, enumMap, defaultLabel = '-') {
        if (value === null || value === undefined) return defaultLabel;
        return escapeHtml(enumMap[value] || defaultLabel);
    }

    /**
     * Render a status badge
     */
    function renderStatus(value, enumMap, classMap = {}) {
        if (value === null || value === undefined) return '-';

        const label = enumMap[value] || 'Unknown';
        const mergedClasses = { ...DEFAULT_STATUS_CLASSES, ...classMap };

        // Try to find class by value, then by lowercase label
        let cssClass = mergedClasses[value] ||
                       mergedClasses[String(value).toLowerCase()] ||
                       mergedClasses[label.toLowerCase()] ||
                       '';

        return `<span class="layer8d-status ${cssClass}">${escapeHtml(label)}</span>`;
    }

    /**
     * Create a status renderer for a specific enum
     */
    function createStatusRenderer(enumMap, classMap = {}) {
        return (value) => renderStatus(value, enumMap, classMap);
    }

    /**
     * Render a boolean value
     */
    function renderBoolean(value, options = {}) {
        const {
            trueText = 'Yes',
            falseText = 'No',
            trueClass = 'layer8d-status-active',
            falseClass = 'layer8d-status-inactive'
        } = options;

        const label = value ? trueText : falseText;
        const cssClass = value ? trueClass : falseClass;

        return `<span class="layer8d-status ${cssClass}">${escapeHtml(label)}</span>`;
    }

    /**
     * Render a date value
     */
    function renderDate(value, options = {}) {
        return formatDate(value, options);
    }

    /**
     * Render a money/currency value
     */
    function renderMoney(value, currency = 'USD') {
        return formatMoney(value, currency);
    }

    /**
     * Render a percentage value
     */
    function renderPercentage(value, decimals = 2) {
        return formatPercentage(value, decimals);
    }

    /**
     * Render a link
     */
    function renderLink(text, url, options = {}) {
        const { target = '_self', className = '' } = options;
        if (!url) return escapeHtml(text);
        return `<a href="${escapeHtml(url)}" target="${target}" class="${className}">${escapeHtml(text)}</a>`;
    }

    /**
     * Render a tag/badge
     */
    function renderTag(text, className = '') {
        return `<span class="layer8d-tag ${className}">${escapeHtml(text)}</span>`;
    }

    /**
     * Render multiple tags
     */
    function renderTags(items, className = '') {
        if (!items || items.length === 0) return '-';
        return items.map(item => renderTag(item, className)).join(' ');
    }

    /**
     * Render an empty/null value
     */
    function renderEmpty(value, emptyText = '-') {
        if (value === null || value === undefined || value === '') {
            return `<span class="layer8d-empty">${emptyText}</span>`;
        }
        return escapeHtml(String(value));
    }

    /**
     * Render a file size in human-readable format
     */
    function renderFileSize(bytes) {
        if (bytes === null || bytes === undefined || bytes === 0) return '-';

        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let unitIndex = 0;
        let size = bytes;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return size.toFixed(unitIndex === 0 ? 0 : 1) + ' ' + units[unitIndex];
    }

    // ========================================
    // EXPORT
    // ========================================

    window.Layer8DRenderers = {
        // Generic
        renderEnum,
        renderStatus,
        createStatusRenderer,
        renderBoolean,
        renderDate,
        renderMoney,
        renderPercentage,
        renderFileSize,
        renderLink,
        renderTag,
        renderTags,
        renderEmpty,

        // Constants
        DEFAULT_STATUS_CLASSES
    };

})();
