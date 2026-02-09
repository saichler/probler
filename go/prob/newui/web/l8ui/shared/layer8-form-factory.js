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
 * Layer8 Form Factory - Generates form field definitions from simple arrays.
 *
 * BASIC USAGE:
 *   const f = Layer8FormFactory;
 *   MyModule.forms = {
 *       Employee: f.form('Employee', [
 *           f.section('Basic Information', [
 *               ...f.text('code', 'Code', true),
 *               ...f.text('name', 'Name', true),
 *               ...f.select('status', 'Status', enums.STATUS, true),
 *               ...f.reference('managerId', 'Manager', 'Employee'),
 *           ])
 *       ])
 *   };
 *
 * AVAILABLE PRESETS (use these to reduce boilerplate!):
 *   ...f.basicEntity()     - code, name, description, isActive (4 fields)
 *   ...f.person()          - firstName, lastName (2 fields)
 *   ...f.person(true)      - firstName, middleName, lastName (3 fields)
 *   ...f.dateRange()       - effectiveDate, endDate (2 fields)
 *   ...f.dateRange('start') - startDate, endDate (2 fields)
 *   ...f.address('key')    - key.line1, key.line2, key.city, key.stateProvince, key.postalCode, key.countryCode (6 fields)
 *   ...f.contact('key')    - key.value, key.contactType (2 fields)
 *   ...f.audit()           - createdBy, createdAt, modifiedBy, modifiedAt (4 fields, read-only)
 *
 * FIELD TYPES:
 *   ...f.text(key, label, required)
 *   ...f.textarea(key, label, required)
 *   ...f.number(key, label, required)
 *   ...f.checkbox(key, label)
 *   ...f.date(key, label, required)
 *   ...f.select(key, label, options, required)
 *   ...f.reference(key, label, lookupModel, required)
 *   ...f.money(key, label, required)
 *   ...f.email(key, label, required)
 *   ...f.phone(key, label)
 *   ...f.url(key, label)
 *   ...f.ssn(key, label)
 *   ...f.ein(key, label)
 */
(function() {
    'use strict';

    window.Layer8FormFactory = {
        /**
         * Create a text field.
         * @param {string} key - The field key
         * @param {string} [label] - Optional label
         * @param {boolean} [required] - Whether required
         * @returns {Array} - Single field in array format
         */
        text: function(key, label, required) {
            const field = {
                key: key,
                label: label || this._toTitleCase(key),
                type: 'text'
            };
            if (required) field.required = true;
            return [field];
        },

        /**
         * Create a textarea field.
         * @param {string} key - The field key
         * @param {string} [label] - Optional label
         * @param {boolean} [required] - Whether required
         * @returns {Array} - Single field in array format
         */
        textarea: function(key, label, required) {
            const field = {
                key: key,
                label: label || this._toTitleCase(key),
                type: 'textarea'
            };
            if (required) field.required = true;
            return [field];
        },

        /**
         * Create a number field.
         * @param {string} key - The field key
         * @param {string} [label] - Optional label
         * @param {boolean} [required] - Whether required
         * @returns {Array} - Single field in array format
         */
        number: function(key, label, required) {
            const field = {
                key: key,
                label: label || this._toTitleCase(key),
                type: 'number'
            };
            if (required) field.required = true;
            return [field];
        },

        /**
         * Create a checkbox field.
         * @param {string} key - The field key
         * @param {string} [label] - Optional label
         * @returns {Array} - Single field in array format
         */
        checkbox: function(key, label) {
            return [{
                key: key,
                label: label || this._toTitleCase(key),
                type: 'checkbox'
            }];
        },

        /**
         * Create a date field.
         * @param {string} key - The field key
         * @param {string} [label] - Optional label
         * @param {boolean} [required] - Whether required
         * @returns {Array} - Single field in array format
         */
        date: function(key, label, required) {
            const field = {
                key: key,
                label: label || this._toTitleCase(key),
                type: 'date'
            };
            if (required) field.required = true;
            return [field];
        },

        /**
         * Create a select field with options from an enum.
         * @param {string} key - The field key
         * @param {string} label - The label
         * @param {Object} options - The enum options object
         * @param {boolean} [required] - Whether required
         * @returns {Array} - Single field in array format
         */
        select: function(key, label, options, required) {
            const field = {
                key: key,
                label: label,
                type: 'select',
                options: options
            };
            if (required) field.required = true;
            return [field];
        },

        /**
         * Create a reference field (lookup).
         * @param {string} key - The field key
         * @param {string} label - The label
         * @param {string} lookupModel - The model to lookup
         * @param {boolean} [required] - Whether required
         * @returns {Array} - Single field in array format
         */
        reference: function(key, label, lookupModel, required) {
            const field = {
                key: key,
                label: label,
                type: 'reference',
                lookupModel: lookupModel
            };
            if (required) field.required = true;
            return [field];
        },

        /**
         * Create a URL field.
         * @param {string} key - The field key
         * @param {string} [label] - Optional label
         * @returns {Array} - Single field in array format
         */
        url: function(key, label) {
            return [{
                key: key,
                label: label || this._toTitleCase(key),
                type: 'url'
            }];
        },

        /**
         * Create an email field.
         * @param {string} key - The field key
         * @param {string} [label] - Optional label
         * @param {boolean} [required] - Whether required
         * @returns {Array} - Single field in array format
         */
        email: function(key, label, required) {
            const field = {
                key: key,
                label: label || this._toTitleCase(key),
                type: 'email'
            };
            if (required) field.required = true;
            return [field];
        },

        /**
         * Create a phone field.
         * @param {string} key - The field key
         * @param {string} [label] - Optional label
         * @returns {Array} - Single field in array format
         */
        phone: function(key, label) {
            return [{
                key: key,
                label: label || this._toTitleCase(key),
                type: 'phone'
            }];
        },

        /**
         * Create an SSN field.
         * @param {string} key - The field key
         * @param {string} [label] - Optional label
         * @returns {Array} - Single field in array format
         */
        ssn: function(key, label) {
            return [{
                key: key,
                label: label || 'SSN',
                type: 'ssn'
            }];
        },

        /**
         * Create an EIN field.
         * @param {string} key - The field key
         * @param {string} [label] - Optional label
         * @returns {Array} - Single field in array format
         */
        ein: function(key, label) {
            return [{
                key: key,
                label: label || 'EIN',
                type: 'ein'
            }];
        },

        /**
         * Create a money/currency field.
         * @param {string} key - The field key
         * @param {string} [label] - Optional label
         * @param {boolean} [required] - Whether required
         * @returns {Array} - Single field in array format
         */
        money: function(key, label, required) {
            const field = {
                key: key,
                label: label || this._toTitleCase(key),
                type: 'money'
            };
            if (required) field.required = true;
            return [field];
        },

        /**
         * Create a percentage field (renders as number).
         */
        percentage: function(key, label, required) {
            const field = {
                key: key,
                label: label || this._toTitleCase(key),
                type: 'number'
            };
            if (required) field.required = true;
            return [field];
        },

        /**
         * Create a rating field (renders as number).
         */
        rating: function(key, label, required) {
            const field = {
                key: key,
                label: label || this._toTitleCase(key),
                type: 'number'
            };
            if (required) field.required = true;
            return [field];
        },

        /**
         * Create a routing number field (renders as text).
         */
        routingNumber: function(key, label, required) {
            const field = {
                key: key,
                label: label || 'Routing Number',
                type: 'text'
            };
            if (required) field.required = true;
            return [field];
        },

        /**
         * Create a color code field (renders as text).
         */
        colorCode: function(key, label) {
            return [{
                key: key,
                label: label || 'Color Code',
                type: 'text'
            }];
        },

        /**
         * Create a datetime field (renders as text input for datetime values).
         */
        datetime: function(key, label, required) {
            const field = {
                key: key,
                label: label || this._toTitleCase(key),
                type: 'text'
            };
            if (required) field.required = true;
            return [field];
        },

        /**
         * Create a time field (renders as text).
         */
        time: function(key, label, required) {
            const field = {
                key: key,
                label: label || this._toTitleCase(key),
                type: 'text'
            };
            if (required) field.required = true;
            return [field];
        },

        /**
         * Create an hours field (renders as number).
         */
        hours: function(key, label, required) {
            const field = {
                key: key,
                label: label || this._toTitleCase(key),
                type: 'number'
            };
            if (required) field.required = true;
            return [field];
        },

        // ============================================================================
        // PRESET FIELD GROUPS
        // ============================================================================

        /**
         * Basic entity fields: code, name, description, isActive
         * @returns {Array} - Array of field definitions
         */
        basicEntity: function() {
            return [
                { key: 'code', label: 'Code', type: 'text', required: true },
                { key: 'name', label: 'Name', type: 'text', required: true },
                { key: 'description', label: 'Description', type: 'textarea' },
                { key: 'isActive', label: 'Active', type: 'checkbox' }
            ];
        },

        /**
         * Date range fields: effectiveDate, endDate
         * @param {string} [prefix] - Optional prefix (e.g., 'effective' -> effectiveStartDate)
         * @returns {Array} - Array of field definitions
         */
        dateRange: function(prefix) {
            if (prefix) {
                return [
                    { key: prefix + 'Date', label: this._toTitleCase(prefix) + ' Date', type: 'date' },
                    { key: 'endDate', label: 'End Date', type: 'date' }
                ];
            }
            return [
                { key: 'effectiveDate', label: 'Effective Date', type: 'date' },
                { key: 'endDate', label: 'End Date', type: 'date' }
            ];
        },

        /**
         * Address fields (maps to *erp.Address protobuf type)
         * @param {string} parentKey - Parent field name (e.g. 'address', 'serviceAddress')
         * @returns {Array} - Array of field definitions with dot-notation keys
         */
        address: function(parentKey) {
            const p = parentKey ? parentKey + '.' : '';
            return [
                { key: p + 'line1', label: 'Address Line 1', type: 'text' },
                { key: p + 'line2', label: 'Address Line 2', type: 'text' },
                { key: p + 'city', label: 'City', type: 'text' },
                { key: p + 'stateProvince', label: 'State/Province', type: 'text' },
                { key: p + 'postalCode', label: 'Postal Code', type: 'text' },
                { key: p + 'countryCode', label: 'Country', type: 'text' }
            ];
        },

        /**
         * Contact info fields (maps to *erp.ContactInfo protobuf type)
         * @param {string} parentKey - Parent field name (e.g. 'contactInfo')
         * @returns {Array} - Array of field definitions with dot-notation keys
         */
        contact: function(parentKey) {
            const p = parentKey ? parentKey + '.' : '';
            return [
                { key: p + 'value', label: 'Contact Value', type: 'text' },
                { key: p + 'contactType', label: 'Contact Type', type: 'text' }
            ];
        },

        /**
         * Audit fields (typically read-only)
         * @returns {Array} - Array of field definitions
         */
        audit: function() {
            return [
                { key: 'createdBy', label: 'Created By', type: 'text', readOnly: true },
                { key: 'createdAt', label: 'Created At', type: 'date', readOnly: true },
                { key: 'modifiedBy', label: 'Modified By', type: 'text', readOnly: true },
                { key: 'modifiedAt', label: 'Modified At', type: 'date', readOnly: true }
            ];
        },

        /**
         * Person name fields: firstName, middleName (optional), lastName
         * @param {boolean} [includeMiddle=false] - Include middle name field
         * @returns {Array} - Array of field definitions
         */
        person: function(includeMiddle) {
            const fields = [
                { key: 'firstName', label: 'First Name', type: 'text', required: true }
            ];
            if (includeMiddle) {
                fields.push({ key: 'middleName', label: 'Middle Name', type: 'text' });
            }
            fields.push({ key: 'lastName', label: 'Last Name', type: 'text', required: true });
            return fields;
        },

        // ============================================================================
        // UTILITY METHODS
        // ============================================================================

        /**
         * Create a form section.
         * @param {string} title - Section title
         * @param {Array} fields - Array of field definitions
         * @returns {Object} - Section object
         */
        section: function(title, fields) {
            return {
                title: title,
                fields: fields.flat()
            };
        },

        /**
         * Create a full form definition.
         * @param {string} title - Form title
         * @param {Array} sections - Array of section objects
         * @returns {Object} - Form definition object
         */
        form: function(title, sections) {
            return {
                title: title,
                sections: sections
            };
        },

        /**
         * Convert camelCase to Title Case.
         * @param {string} str - The string to convert
         * @returns {string} - Title case string
         * @private
         */
        _toTitleCase: function(str) {
            if (!str) return '';
            return str
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, (s) => s.toUpperCase())
                .trim();
        }
    };
})();
