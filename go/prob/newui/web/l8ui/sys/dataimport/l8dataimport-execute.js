/*
© 2025 Sharon Aicler (saichler@gmail.com)

Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
/**
 * L8DIExecute - Import execution sub-tab for Data Import.
 * Select a template, upload a data file, execute the import, view results.
 */
(function() {
    'use strict';

    window.L8DIExecute = {};

    var templates = [];
    var selectedTemplateId = '';
    var lastResults = null;

    function getHeaders() {
        return L8DataImport.getHeaders();
    }

    function initialize() {
        var pane = document.getElementById('l8di-import-pane');
        if (!pane) return;
        pane.innerHTML = renderView();
        loadTemplates();
    }

    function renderView() {
        return '<div class="l8di-section-title">1. Select Template</div>' +
            '<select id="l8di-exec-template" class="layer8d-input" style="width:100%;max-width:400px;margin-bottom:16px">' +
                '<option value="">-- Select a template --</option>' +
            '</select>' +
            '<div id="l8di-exec-template-info" style="font-size:12px;color:var(--layer8d-text-muted);margin-bottom:16px"></div>' +
            '<div class="l8di-section-title">2. Upload Data File</div>' +
            '<div class="l8di-dropzone" id="l8di-exec-drop">' +
                '<div class="l8di-dropzone-icon">📤</div>' +
                '<p>Drop your data file here or click to browse</p>' +
                '<input type="file" id="l8di-exec-file" style="display:none" accept=".csv,.json,.xml">' +
            '</div>' +
            '<div id="l8di-exec-file-info" style="font-size:12px;color:var(--layer8d-text-muted);margin-bottom:16px"></div>' +
            '<div class="l8di-section-title">3. Execute Import</div>' +
            '<div class="l8di-actions">' +
                '<button class="layer8d-btn layer8d-btn-primary layer8d-btn-small" id="l8di-exec-btn" disabled>' +
                    'Run Import</button>' +
            '</div>' +
            '<div id="l8di-exec-status" style="margin:12px 0"></div>' +
            '<div id="l8di-exec-results"></div>';
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
            populateSelect();
            bindEvents();
        }).catch(function() {
            templates = [];
            populateSelect();
            bindEvents();
        });
    }

    function populateSelect() {
        var sel = document.getElementById('l8di-exec-template');
        if (!sel) return;
        var opts = '<option value="">-- Select a template --</option>';
        templates.forEach(function(t) {
            opts += '<option value="' + t.templateId + '">' + esc(t.name) +
                ' (' + t.targetModelType + ')</option>';
        });
        sel.innerHTML = opts;
        if (selectedTemplateId) sel.value = selectedTemplateId;
    }

    function bindEvents() {
        var sel = document.getElementById('l8di-exec-template');
        if (sel) sel.onchange = function() {
            selectedTemplateId = sel.value;
            showTemplateInfo();
            updateRunButton();
        };

        var dropzone = document.getElementById('l8di-exec-drop');
        var fileInput = document.getElementById('l8di-exec-file');
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
                if (e.dataTransfer.files.length > 0) setFile(e.dataTransfer.files[0]);
            });
            fileInput.addEventListener('change', function() {
                if (fileInput.files.length > 0) setFile(fileInput.files[0]);
            });
        }

        var runBtn = document.getElementById('l8di-exec-btn');
        if (runBtn) runBtn.onclick = executeImport;
    }

    var currentFile = null;
    var currentFileData = null;

    function setFile(file) {
        currentFile = file;
        var info = document.getElementById('l8di-exec-file-info');
        if (info) {
            info.textContent = 'Selected: ' + file.name + ' (' +
                formatSize(file.size) + ')';
        }
        // Read as base64
        var reader = new FileReader();
        reader.onload = function() {
            var bytes = new Uint8Array(reader.result);
            var binary = '';
            for (var i = 0; i < bytes.length; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            currentFileData = btoa(binary);
            updateRunButton();
        };
        reader.readAsArrayBuffer(file);
    }

    function showTemplateInfo() {
        var info = document.getElementById('l8di-exec-template-info');
        if (!info) return;
        var tmpl = templates.find(function(t) { return t.templateId === selectedTemplateId; });
        if (!tmpl) { info.textContent = ''; return; }
        var cols = (tmpl.columnMappings || []).filter(function(m) { return !m.skip; }).length;
        info.textContent = 'Target: ' + tmpl.targetModelType + ' | Format: ' +
            (tmpl.sourceFormat || 'csv').toUpperCase() + ' | ' + cols + ' active mappings';
    }

    function updateRunButton() {
        var btn = document.getElementById('l8di-exec-btn');
        if (btn) btn.disabled = !selectedTemplateId || !currentFileData;
    }

    // ──────────────────────── Execute ────────────────────────

    function executeImport() {
        if (!selectedTemplateId || !currentFileData) return;

        var status = document.getElementById('l8di-exec-status');
        var results = document.getElementById('l8di-exec-results');
        if (status) status.innerHTML = '<em>Importing data... This may take a moment.</em>';
        if (results) results.innerHTML = '';

        var btn = document.getElementById('l8di-exec-btn');
        if (btn) btn.disabled = true;

        fetch(Layer8DConfig.resolveEndpoint('/0/ImprtExec'), {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
                templateId: selectedTemplateId,
                fileData: currentFileData,
                fileName: currentFile ? currentFile.name : 'upload'
            })
        }).then(function(r) {
            if (!r.ok) return r.text().then(function(t) { throw new Error(t); });
            return r.json();
        }).then(function(data) {
            lastResults = data;
            if (status) status.innerHTML = '';
            renderResults(data);
        }).catch(function(err) {
            if (status) status.innerHTML = '<span style="color:var(--layer8d-error)">Import failed: ' +
                esc(err.message) + '</span>';
        }).finally(function() {
            if (btn) btn.disabled = false;
        });
    }

    function renderResults(data) {
        var container = document.getElementById('l8di-exec-results');
        if (!container) return;

        var total = data.totalRows || 0;
        var imported = data.importedRows || 0;
        var failed = data.failedRows || 0;
        var errors = data.rowErrors || [];

        var html = '<div class="l8di-results">' +
            '<div class="l8di-results-summary">' +
                stat(total, 'Total Rows', '') +
                stat(imported, 'Imported', 'success') +
                stat(failed, 'Failed', failed > 0 ? 'error' : '') +
            '</div>';

        if (errors.length > 0) {
            html += '<div class="l8di-section-title" style="margin-top:12px">Errors</div>' +
                '<div class="l8di-errors">' +
                errors.map(function(e) {
                    return '<div class="l8di-error-row">' +
                        'Row ' + e.rowNumber + ': ' +
                        '<strong>' + esc(e.field || '') + '</strong> ' +
                        esc(e.errorMessage || '') +
                        (e.sourceValue ? ' (value: "' + esc(e.sourceValue) + '")' : '') +
                    '</div>';
                }).join('') +
                '</div>';
        }

        html += '</div>';
        container.innerHTML = html;
    }

    function stat(value, label, cls) {
        return '<div class="l8di-stat">' +
            '<div class="l8di-stat-value' + (cls ? ' ' + cls : '') + '">' + value + '</div>' +
            '<div class="l8di-stat-label">' + label + '</div></div>';
    }

    function formatSize(bytes) {
        if (bytes === 0) return '0 B';
        var units = ['B', 'KB', 'MB', 'GB'];
        var i = Math.floor(Math.log(bytes) / Math.log(1024));
        if (i >= units.length) i = units.length - 1;
        return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + ' ' + units[i];
    }

    function esc(s) {
        var d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    L8DIExecute.initialize = initialize;
})();
