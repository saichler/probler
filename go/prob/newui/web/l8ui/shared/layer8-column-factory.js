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
 * Layer8 Column Factory - Generates table column definitions from simple arrays.
 *
 * Usage:
 *   const cols = Layer8ColumnFactory;
 *   MyModule.columns = {
 *       Employee: [
 *           ...cols.basic(['code', 'name', 'description']),
 *           ...cols.boolean('isActive', 'Active'),
 *           ...cols.status('status', 'Status', enums.STATUS_VALUES, render.status),
 *           ...cols.date('hireDate', 'Hire Date'),
 *           ...cols.money('totalAmount', 'Total'),
 *       ]
 *   };
 */
(function() {
    'use strict';

    const { renderBoolean, renderDate, renderMoney } = window.Layer8DRenderers || {};

    window.Layer8ColumnFactory = {
        /**
         * Create a single basic column with sortKey and filterKey.
         * @param {string} key - The field key
         * @param {string} [label] - Optional label (defaults to key with title case)
         * @returns {Array} - Single column in array format for spreading
         */
        col: function(key, label) {
            return [{
                key: key,
                label: label || this._toTitleCase(key),
                sortKey: key,
                filterKey: key
            }];
        },

        /**
         * Create multiple basic columns from an array of keys.
         * @param {Array<string|[string, string]>} keys - Array of keys or [key, label] pairs
         * @returns {Array} - Array of column definitions
         */
        basic: function(keys) {
            return keys.map(item => {
                const key = Array.isArray(item) ? item[0] : item;
                const label = Array.isArray(item) ? item[1] : this._toTitleCase(key);
                return {
                    key: key,
                    label: label,
                    sortKey: key,
                    filterKey: key
                };
            });
        },

        /**
         * Create a boolean column.
         * @param {string} key - The field key
         * @param {string} [label] - Optional label
         * @param {Object} [options] - Options for renderBoolean (trueText, falseText)
         * @returns {Array} - Single column in array format
         */
        boolean: function(key, label, options) {
            return [{
                key: key,
                label: label || this._toTitleCase(key),
                sortKey: key,
                render: options
                    ? (item) => renderBoolean(item[key], options)
                    : (item) => renderBoolean(item[key])
            }];
        },

        /**
         * Create a status column with enum values and custom renderer.
         * @param {string} key - The field key
         * @param {string} label - The label
         * @param {Object} enumValues - The enum values object for filtering
         * @param {Function} renderer - The status renderer function
         * @returns {Array} - Single column in array format
         */
        status: function(key, label, enumValues, renderer) {
            return [{
                key: key,
                label: label,
                sortKey: key,
                filterKey: key,
                enumValues: enumValues,
                render: (item) => renderer(item[key])
            }];
        },

        /**
         * Create an enum column (no status styling, just text).
         * @param {string} key - The field key
         * @param {string} label - The label
         * @param {Object} [enumValues] - Optional enum values for filtering
         * @param {Function} renderer - The enum renderer function
         * @returns {Array} - Single column in array format
         */
        enum: function(key, label, enumValues, renderer) {
            const col = {
                key: key,
                label: label,
                sortKey: key,
                filterKey: key,
                render: (item) => renderer(item[key])
            };
            if (enumValues) {
                col.enumValues = enumValues;
            }
            return [col];
        },

        /**
         * Create a date column.
         * @param {string} key - The field key
         * @param {string} [label] - Optional label
         * @returns {Array} - Single column in array format
         */
        date: function(key, label) {
            return [{
                key: key,
                label: label || this._toTitleCase(key),
                sortKey: key,
                render: (item) => renderDate(item[key])
            }];
        },

        /**
         * Create a money column.
         * @param {string} key - The field key
         * @param {string} [label] - Optional label
         * @returns {Array} - Single column in array format
         */
        money: function(key, label) {
            return [{
                key: key,
                label: label || this._toTitleCase(key),
                sortKey: key,
                render: (item) => renderMoney(item[key])
            }];
        },

        /**
         * Create an ID column (first column, typically).
         * @param {string} key - The field key (e.g., 'employeeId')
         * @param {string} [label] - Optional label (defaults to 'ID')
         * @returns {Array} - Single column in array format
         */
        id: function(key, label) {
            return [{
                key: key,
                label: label || 'ID',
                sortKey: key,
                filterKey: key
            }];
        },

        /**
         * Create a custom column with a render function.
         * @param {string} key - The field key
         * @param {string} label - The label
         * @param {Function} renderFn - The render function (receives full item)
         * @param {Object} [options] - Optional sortKey, filterKey, enumValues
         * @returns {Array} - Single column in array format
         */
        custom: function(key, label, renderFn, options) {
            const col = {
                key: key,
                label: label,
                render: renderFn
            };
            if (options) {
                if (options.sortKey !== false) {
                    col.sortKey = options.sortKey || key;
                }
                if (options.filterKey) {
                    col.filterKey = options.filterKey;
                }
                if (options.enumValues) {
                    col.enumValues = options.enumValues;
                }
            } else {
                col.sortKey = key;
            }
            return [col];
        },

        /**
         * Create a link column.
         * @param {string} key - The field key
         * @param {string} label - The label
         * @param {Function} onClick - Click handler receiving item
         * @param {Function} [displayFn] - Display function (defaults to showing key value)
         * @returns {Array} - Single column in array format
         */
        link: function(key, label, onClick, displayFn) {
            const { escapeHtml } = window.Layer8DUtils || { escapeHtml: (s) => s };
            return [{
                key: key,
                label: label,
                sortKey: key,
                filterKey: key,
                render: (item) => {
                    const text = displayFn ? displayFn(item) : (item[key] || '');
                    return `<a href="#" class="layer8d-link" data-action="click">${escapeHtml(text)}</a>`;
                },
                onClick: onClick
            }];
        },

        /**
         * Convert camelCase or PascalCase to Title Case.
         * @param {string} str - The string to convert
         * @returns {string} - Title case string
         * @private
         */
        _toTitleCase: function(str) {
            if (!str) return '';
            // Handle camelCase and PascalCase
            const result = str
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, (s) => s.toUpperCase())
                .trim();
            return result;
        }
    };
})();
