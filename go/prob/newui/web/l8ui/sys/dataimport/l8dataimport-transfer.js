/*
© 2025 Sharon Aicler (saichler@gmail.com)

Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
/**
 * L8DITransfer - Transfer sub-tab for Data Import.
 * Export templates to JSON for transfer between environments.
 * Import templates from a JSON file.
 */
(function() {
    'use strict';

    window.L8DITransfer = {};

    var templates = [];

    function getHeaders() {
        return L8DataImport.getHeaders();
    }

    function initialize() {
        var pane = document.getElementById('l8di-transfer-pane');
        if (!pane) return;
        pane.innerHTML = renderView();
        loadTemplates();
    }

    function renderView() {
        return '<div class="l8di-section-title">Export Templates</div>' +
            '<p style="font-size:13px;color:var(--layer8d-text-muted);margin-bottom:12px">' +
                'Select templates to export as a JSON file for transfer to another environment.</p>' +
            '<div id="l8di-xfer-list" class="l8di-template-list" style="margin-bottom:16px"></div>' +
            '<div class="l8di-actions">' +
                '<button class="layer8d-btn layer8d-btn-primary layer8d-btn-small" id="l8di-export-btn" disabled>' +
                    'Export Selected</button>' +
                '<button class="layer8d-btn layer8d-btn-secondary layer8d-btn-small" id="l8di-select-all-btn">' +
                    'Select All</button>' +
            '</div>' +
            '<hr style="border-color:var(--layer8d-border);margin:24px 0">' +
            '<div class="l8di-section-title">Import Templates</div>' +
            '<p style="font-size:13px;color:var(--layer8d-text-muted);margin-bottom:12px">' +
                'Upload a previously exported JSON file to import templates.</p>' +
            '<div class="l8di-dropzone" id="l8di-import-drop">' +
                '<div class="l8di-dropzone-icon">📥</div>' +
                '<p>Drop a template export file here or click to browse</p>' +
                '<input type="file" id="l8di-import-file" style="display:none" accept=".json">' +
            '</div>' +
            '<div style="margin-bottom:8px">' +
                '<label style="font-size:13px;cursor:pointer">' +
                    '<input type="checkbox" id="l8di-overwrite"> Overwrite existing templates with same name' +
                '</label>' +
            '</div>' +
            '<div id="l8di-import-status"></div>';
    }

    function loadTemplates() {
        var query = 'select * from L8ImportTemplate';
        var body = encodeURIComponent(JSON.stringify({ text: query }));
        fetch(Layer8DConfig.resolveEndpoint('/0/ImprtTmpl') + '?body=' + body, {
            method: 'GET',
            headers: getHeaders()
        }).then(function(r) { return r.json(); })
        .then(function(data) {
            templates = data.list || data.List || [];
            renderExportList();
            bindEvents();
        }).catch(function() {
            templates = [];
            renderExportList();
            bindEvents();
        });
    }

    function renderExportList() {
        var container = document.getElementById('l8di-xfer-list');
        if (!container) return;
        if (templates.length === 0) {
            container.innerHTML = '<div class="l8di-empty" style="padding:20px">' +
                '<p>No templates available for export.</p></div>';
            return;
        }
        container.innerHTML = templates.map(function(t) {
            return '<label class="l8di-template-card" style="cursor:pointer">' +
                '<div style="display:flex;align-items:center;gap:8px">' +
                    '<input type="checkbox" class="l8di-xfer-check" value="' + t.templateId + '">' +
                    '<div><div class="l8di-template-name">' + esc(t.name) + '</div>' +
                    '<div class="l8di-template-meta">' + esc(t.targetModelType) +
                        ' &middot; ' + (t.sourceFormat || 'csv').toUpperCase() + '</div></div>' +
                '</div>' +
            '</label>';
        }).join('');
    }

    function bindEvents() {
        var pane = document.getElementById('l8di-transfer-pane');
        if (!pane) return;

        // Export button
        var exportBtn = document.getElementById('l8di-export-btn');
        if (exportBtn) exportBtn.onclick = exportTemplates;

        // Select all
        var selectAllBtn = document.getElementById('l8di-select-all-btn');
        if (selectAllBtn) selectAllBtn.onclick = function() {
            pane.querySelectorAll('.l8di-xfer-check').forEach(function(cb) { cb.checked = true; });
            updateExportButton();
        };

        // Checkbox change
        pane.querySelectorAll('.l8di-xfer-check').forEach(function(cb) {
            cb.onchange = updateExportButton;
        });

        // Import drop zone
        var dropzone = document.getElementById('l8di-import-drop');
        var fileInput = document.getElementById('l8di-import-file');
        if (dropzone && fileInput) {
            dropzone.onclick = function() { fileInput.click(); };
            dropzone.addEventListener('dragover', function(e) {
                e.preventDefault();
                dropzone.classList.add('dragover');
            });
            dropzone.addEventListener('dragleave', function() {
                dropzone.classList.remove('dragover');
            });
            dropzone.addEventListener('drop', function(e) {
                e.preventDefault();
                dropzone.classList.remove('dragover');
                if (e.dataTransfer.files.length > 0) importFile(e.dataTransfer.files[0]);
            });
            fileInput.addEventListener('change', function() {
                if (fileInput.files.length > 0) importFile(fileInput.files[0]);
            });
        }
    }

    function updateExportButton() {
        var checked = document.querySelectorAll('.l8di-xfer-check:checked');
        var btn = document.getElementById('l8di-export-btn');
        if (btn) btn.disabled = checked.length === 0;
    }

    // ──────────────────────── Export ────────────────────────

    function exportTemplates() {
        var ids = [];
        document.querySelectorAll('.l8di-xfer-check:checked').forEach(function(cb) {
            ids.push(cb.value);
        });
        if (ids.length === 0) return;

        fetch(Layer8DConfig.resolveEndpoint('/0/ImprtXfer'), {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ templateIds: ids })
        }).then(function(r) {
            if (!r.ok) return r.text().then(function(t) { throw new Error(t); });
            return r.json();
        }).then(function(data) {
            if (!data.exportData) throw new Error('No export data returned');
            downloadJSON(data.exportData, data.filename || 'import-templates.json');
        }).catch(function(err) {
            alert('Export failed: ' + err.message);
        });
    }

    function downloadJSON(jsonStr, filename) {
        var blob = new Blob([jsonStr], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // ──────────────────────── Import ────────────────────────

    function importFile(file) {
        var status = document.getElementById('l8di-import-status');
        if (status) status.innerHTML = '<em>Importing...</em>';

        var reader = new FileReader();
        reader.onload = function() {
            var overwrite = (document.getElementById('l8di-overwrite') || {}).checked || false;
            fetch(Layer8DConfig.resolveEndpoint('/0/ImprtXfer'), {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({
                    importData: reader.result,
                    overwriteExisting: overwrite
                })
            }).then(function(r) {
                if (!r.ok) return r.text().then(function(t) { throw new Error(t); });
                return r.json();
            }).then(function(data) {
                var msg = 'Imported ' + (data.importedCount || 0) + ' template(s)';
                if (data.skippedCount > 0) msg += ', skipped ' + data.skippedCount;
                if (status) status.innerHTML = '<span style="color:var(--layer8d-success)">' + msg + '</span>';
                loadTemplates();
            }).catch(function(err) {
                if (status) status.innerHTML = '<span style="color:var(--layer8d-error)">Import failed: ' +
                    esc(err.message) + '</span>';
            });
        };
        reader.readAsText(file);
    }

    function esc(s) {
        var d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    L8DITransfer.initialize = initialize;
})();
