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
 * Layer8FileUpload - Shared file upload/download utility for desktop and mobile.
 * Uses the FileStore protobuf service (POST for upload, PUT for download).
 *
 * Upload:
 *   Layer8FileUpload.upload(file, documentId, version)
 *     .then(result => { result.storagePath, result.fileName, ... })
 *
 * Download:
 *   Layer8FileUpload.download(storagePath, fileName)
 */
(function() {
    'use strict';

    const ENDPOINT = Layer8DConfig.resolveEndpoint('/0/FileStore');
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

    function getHeaders() {
        const headers = typeof getAuthHeaders === 'function'
            ? getAuthHeaders()
            : {};
        headers['Content-Type'] = 'application/json';
        return headers;
    }

    window.Layer8FileUpload = {
        MAX_FILE_SIZE: MAX_FILE_SIZE,

        /**
         * Upload a file via the FileStore protobuf service.
         * @param {File} file - Browser File object
         * @param {string} [documentId] - For storage path organization
         * @param {number} [version] - Version number (default 1)
         * @returns {Promise<{storagePath, fileName, fileSize, mimeType, checksum}>}
         */
        upload: function(file, documentId, version) {
            return new Promise(function(resolve, reject) {
                if (!file) {
                    reject(new Error('No file provided'));
                    return;
                }

                if (file.size > MAX_FILE_SIZE) {
                    reject(new Error('File size ' + Layer8FileUpload.formatSize(file.size) +
                        ' exceeds maximum ' + Layer8FileUpload.formatSize(MAX_FILE_SIZE)));
                    return;
                }

                var reader = new FileReader();
                reader.onload = function() {
                    var bytes = new Uint8Array(reader.result);
                    var binary = '';
                    for (var i = 0; i < bytes.length; i++) {
                        binary += String.fromCharCode(bytes[i]);
                    }
                    var base64 = btoa(binary);

                    var body = {
                        fileName: file.name,
                        mimeType: file.type || 'application/octet-stream',
                        fileData: base64
                    };
                    if (documentId) body.documentId = documentId;
                    if (version) body.version = version;

                    fetch(ENDPOINT, {
                        method: 'POST',
                        headers: getHeaders(),
                        body: JSON.stringify(body)
                    }).then(function(response) {
                        if (!response.ok) {
                            return response.text().then(function(text) {
                                throw new Error(text || 'Upload failed');
                            });
                        }
                        return response.json();
                    }).then(function(data) {
                        resolve(data);
                    }).catch(function(err) {
                        reject(err);
                    });
                };
                reader.onerror = function() {
                    reject(new Error('Failed to read file'));
                };
                reader.readAsArrayBuffer(file);
            });
        },

        /**
         * Download a file via the FileStore protobuf service.
         * @param {string} storagePath - Server storage path
         * @param {string} [fileName] - Filename for download (extracted from path if omitted)
         */
        download: function(storagePath, fileName) {
            if (!storagePath) {
                console.error('Layer8FileUpload: storagePath is required');
                return;
            }

            var body = { storagePath: storagePath };

            fetch(ENDPOINT, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(body)
            }).then(function(response) {
                if (!response.ok) {
                    return response.text().then(function(text) {
                        throw new Error(text || 'Download failed');
                    });
                }
                return response.json();
            }).then(function(data) {
                if (!data.fileData) {
                    throw new Error('No file data in response');
                }

                var binary = atob(data.fileData);
                var bytes = new Uint8Array(binary.length);
                for (var i = 0; i < binary.length; i++) {
                    bytes[i] = binary.charCodeAt(i);
                }

                var mimeType = data.mimeType || 'application/octet-stream';
                var blob = new Blob([bytes], { type: mimeType });
                var url = URL.createObjectURL(blob);
                var link = document.createElement('a');
                link.href = url;
                link.download = fileName || data.fileName || 'download';
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }).catch(function(err) {
                console.error('File download error:', err);
                if (typeof Layer8DPopup !== 'undefined') {
                    Layer8DPopup.alert('Download Failed', 'Unable to download file: ' + err.message);
                } else {
                    alert('Download failed: ' + err.message);
                }
            });
        },

        /**
         * Format file size in human-readable form.
         * @param {number} bytes
         * @returns {string}
         */
        formatSize: function(bytes) {
            if (bytes === 0) return '0 B';
            var units = ['B', 'KB', 'MB', 'GB'];
            var i = Math.floor(Math.log(bytes) / Math.log(1024));
            if (i >= units.length) i = units.length - 1;
            return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + ' ' + units[i];
        }
    };
})();
