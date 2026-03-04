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
 * Layer8CsvExport - Shared CSV export utility for desktop and mobile.
 * Posts to the CsvExport backend service and triggers a file download.
 *
 * Usage:
 *   Layer8CsvExport.export({
 *       modelName: 'Employee',
 *       serviceName: 'Employee',
 *       serviceArea: 30,
 *       filename: 'Employee'
 *   });
 */
(function() {
    'use strict';

    window.Layer8CsvExport = {
        /**
         * Export table data as CSV via the backend CsvExport service.
         * @param {Object} options
         * @param {string} options.modelName - Protobuf type name (e.g., "Employee")
         * @param {string} options.serviceName - Service name (e.g., "Employee")
         * @param {number} options.serviceArea - Service area number (e.g., 30)
         * @param {string} [options.filename] - Base filename (default: modelName)
         */
        export: async function(options) {
            if (!options.modelName || !options.serviceName || options.serviceArea == null) {
                console.error('Layer8CsvExport: modelName, serviceName, and serviceArea are required');
                return;
            }

            const filename = (options.filename || options.modelName) + '.csv';

            const requestBody = {
                modelType: options.modelName,
                serviceName: options.serviceName,
                serviceArea: options.serviceArea
            };

            try {
                const headers = typeof getAuthHeaders === 'function'
                    ? getAuthHeaders()
                    : { 'Content-Type': 'application/json' };
                headers['Content-Type'] = 'application/json';

                const endpoint = Layer8DConfig.resolveEndpoint('/0/CsvExport');
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(requestBody)
                });

                if (!response.ok) {
                    const text = await response.text();
                    throw new Error(text || 'Export failed');
                }

                const data = await response.json();
                if (!data.csvData) {
                    throw new Error('No CSV data returned');
                }

                Layer8CsvExport._download(data.csvData, data.filename || filename);

                const rowCount = data.rowCount || 0;
                console.log('CSV export complete:', rowCount, 'rows exported to', filename);
            } catch (error) {
                console.error('CSV export error:', error);
                if (typeof Layer8DPopup !== 'undefined') {
                    Layer8DPopup.alert('Export Failed', 'Unable to export data: ' + error.message);
                } else {
                    alert('Export failed: ' + error.message);
                }
            }
        },

        /**
         * Parse endpoint string to extract serviceName and serviceArea.
         * @param {string} endpoint - e.g., "/erp/30/Employee"
         * @returns {{ serviceName: string, serviceArea: number } | null}
         */
        parseEndpoint: function(endpoint) {
            if (!endpoint) return null;
            const parts = endpoint.split('/').filter(function(p) { return p; });
            if (parts.length < 2) return null;
            return {
                serviceArea: parseInt(parts[parts.length - 2], 10),
                serviceName: parts[parts.length - 1]
            };
        },

        /** @private Trigger a browser file download from CSV string data. */
        _download: function(csvData, filename) {
            const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    };
})();
