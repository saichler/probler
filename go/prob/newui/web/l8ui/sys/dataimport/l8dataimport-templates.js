/*
© 2025 Sharon Aicler (saichler@gmail.com)

Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
/**
 * L8DITemplates - Templates sub-tab for Data Import.
 * Lists saved templates, allows create/edit with AI-assisted mapping.
 */
(function() {
    'use strict';

    window.L8DITemplates = {};

    var templates = [];
    var currentTemplate = null;
    var modelFields = [];

    function getHeaders() {
        return L8DataImport.getHeaders();
    }

    function initialize() {
        var pane = document.getElementById('l8di-templates-pane');
        if (!pane) return;
        pane.innerHTML = renderListView();
        loadTemplates();
    }

    // ──────────────────────── List View ────────────────────────

    function renderListView() {
        return '<div class="l8di-actions">' +
            '<button class="layer8d-btn layer8d-btn-primary layer8d-btn-small" id="l8di-new-template">+ New Template</button>' +
        '</div>' +
        '<div id="l8di-template-list" class="l8di-template-list"></div>';
    }

    function loadTemplates() {
        var query = 'select * from L8ImportTemplate';
        var body = encodeURIComponent(JSON.stringify({ text: query }));
        fetch(Layer8DConfig.resolveEndpoint('/0/ImprtTmpl') + '?body=' + body, {
            method: 'GET',
            headers: getHeaders()
        }).then(function(r) { return r.json(); })
        .then(function(data) {
            templates = (data.list || data.List || []);
            renderTemplateList();
            bindListEvents();
        }).catch(function() {
            templates = [];
            renderTemplateList();
            bindListEvents();
        });
    }

    function renderTemplateList() {
        var container = document.getElementById('l8di-template-list');
        if (!container) return;
        if (templates.length === 0) {
            container.innerHTML = '<div class="l8di-empty">' +
                '<div class="l8di-empty-icon">📋</div>' +
                '<p>No import templates yet. Create one to get started.</p></div>';
            return;
        }
        container.innerHTML = templates.map(function(t) {
            var cols = (t.columnMappings || []).length;
            return '<div class="l8di-template-card" data-id="' + t.templateId + '">' +
                '<div><div class="l8di-template-name">' + esc(t.name) + '</div>' +
                '<div class="l8di-template-meta">' + esc(t.targetModelType) +
                ' &middot; ' + (t.sourceFormat || 'csv').toUpperCase() +
                ' &middot; ' + cols + ' mapping' + (cols !== 1 ? 's' : '') + '</div></div>' +
                '<span style="font-size:18px;cursor:pointer" class="l8di-edit-template">&#9998;</span>' +
            '</div>';
        }).join('');
    }

    function bindListEvents() {
        var pane = document.getElementById('l8di-templates-pane');
        if (!pane) return;
        var btn = document.getElementById('l8di-new-template');
        if (btn) btn.onclick = function() { openEditor(null); };
        pane.querySelectorAll('.l8di-edit-template').forEach(function(el) {
            el.onclick = function(e) {
                e.stopPropagation();
                var id = el.closest('.l8di-template-card').getAttribute('data-id');
                var tmpl = templates.find(function(t) { return t.templateId === id; });
                if (tmpl) openEditor(tmpl);
            };
        });
    }

    // ──────────────────────── Editor View ────────────────────────

    function openEditor(tmpl) {
        currentTemplate = tmpl ? JSON.parse(JSON.stringify(tmpl)) : {
            name: '', description: '', targetModelType: '', targetServiceName: '',
            targetServiceArea: 0, sourceFormat: 'csv',
            columnMappings: [], valueTransforms: [], defaultValues: {}
        };
        modelFields = [];
        var pane = document.getElementById('l8di-templates-pane');
        if (!pane) return;
        pane.innerHTML = renderEditor();
        bindEditorEvents();
        if (currentTemplate.targetModelType) {
            fetchModelInfo(currentTemplate.targetModelType);
        }
    }

    function renderEditor() {
        var t = currentTemplate;
        var isEdit = !!t.templateId;
        return '<div class="l8di-actions">' +
            '<button class="layer8d-btn layer8d-btn-secondary layer8d-btn-small" id="l8di-back-list">&larr; Back</button>' +
            '<button class="layer8d-btn layer8d-btn-primary layer8d-btn-small" id="l8di-save-template">' +
                (isEdit ? 'Update' : 'Save') + ' Template</button>' +
            (isEdit ? '<button class="layer8d-btn layer8d-btn-secondary layer8d-btn-small" id="l8di-delete-template" ' +
                'style="margin-left:auto;color:var(--layer8d-error)">Delete</button>' : '') +
        '</div>' +
        '<div class="l8di-section-title">Template Settings</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">' +
            inputField('l8di-name', 'Name', t.name) +
            inputField('l8di-desc', 'Description', t.description) +
            inputField('l8di-model', 'Target Model Type', t.targetModelType) +
            inputField('l8di-svc', 'Service Name', t.targetServiceName) +
            inputField('l8di-area', 'Service Area', t.targetServiceArea) +
            selectField('l8di-format', 'Source Format', ['csv', 'json', 'xml'], t.sourceFormat) +
        '</div>' +
        '<div class="l8di-section-title">Source File (for AI mapping)</div>' +
        '<div class="l8di-dropzone" id="l8di-file-drop">' +
            '<div class="l8di-dropzone-icon">📄</div>' +
            '<p>Drop a sample file here or click to browse</p>' +
            '<input type="file" id="l8di-file-input" style="display:none" accept=".csv,.json,.xml">' +
        '</div>' +
        '<div id="l8di-ai-status" style="margin-bottom:12px"></div>' +
        '<div class="l8di-section-title">Column Mappings</div>' +
        '<div id="l8di-mapping-editor">' + renderMappingTable() + '</div>';
    }

    function inputField(id, label, value) {
        return '<label style="font-size:13px;color:var(--layer8d-text-medium)">' + label +
            '<input id="' + id + '" class="layer8d-input" style="width:100%;margin-top:2px" value="' +
            esc(String(value || '')) + '"></label>';
    }

    function selectField(id, label, options, selected) {
        var opts = options.map(function(o) {
            return '<option value="' + o + '"' + (o === selected ? ' selected' : '') + '>' +
                o.toUpperCase() + '</option>';
        }).join('');
        return '<label style="font-size:13px;color:var(--layer8d-text-medium)">' + label +
            '<select id="' + id + '" class="layer8d-input" style="width:100%;margin-top:2px">' +
            opts + '</select></label>';
    }

    function renderMappingTable() {
        var mappings = currentTemplate.columnMappings || [];
        if (mappings.length === 0) {
            return '<div class="l8di-empty" style="padding:20px"><p>Upload a source file to auto-detect columns, ' +
                'or add mappings manually.</p></div>';
        }
        var fields = modelFields.map(function(f) { return f.fieldName; });
        var rows = mappings.map(function(m, i) {
            var opts = '<option value="">-- Skip --</option>' +
                fields.map(function(f) {
                    return '<option value="' + f + '"' +
                        (m.targetField === f ? ' selected' : '') + '>' + f + '</option>';
                }).join('');
            return '<tr>' +
                '<td>' + esc(m.sourceColumn) + '</td>' +
                '<td><select class="l8di-target-select" data-index="' + i + '">' + opts + '</select></td>' +
                '<td style="text-align:center"><input type="checkbox" class="l8di-skip-check" data-index="' + i + '"' +
                    (m.skip ? ' checked' : '') + '></td>' +
            '</tr>';
        }).join('');
        return '<table class="l8di-mapping-table"><thead><tr>' +
            '<th>Source Column</th><th>Target Field</th><th>Skip</th>' +
            '</tr></thead><tbody>' + rows + '</tbody></table>';
    }

    function bindEditorEvents() {
        var pane = document.getElementById('l8di-templates-pane');
        if (!pane) return;

        var backBtn = document.getElementById('l8di-back-list');
        if (backBtn) backBtn.onclick = function() { initialize(); };

        var saveBtn = document.getElementById('l8di-save-template');
        if (saveBtn) saveBtn.onclick = saveTemplate;

        var deleteBtn = document.getElementById('l8di-delete-template');
        if (deleteBtn) deleteBtn.onclick = deleteTemplate;

        var modelInput = document.getElementById('l8di-model');
        if (modelInput) {
            modelInput.addEventListener('change', function() {
                fetchModelInfo(modelInput.value.trim());
            });
        }

        // File drop zone
        var dropzone = document.getElementById('l8di-file-drop');
        var fileInput = document.getElementById('l8di-file-input');
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
                if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
            });
            fileInput.addEventListener('change', function() {
                if (fileInput.files.length > 0) handleFile(fileInput.files[0]);
            });
        }

        // Mapping selects & checkboxes
        bindMappingEvents();
    }

    function bindMappingEvents() {
        var editor = document.getElementById('l8di-mapping-editor');
        if (!editor) return;
        editor.querySelectorAll('.l8di-target-select').forEach(function(sel) {
            sel.onchange = function() {
                var idx = parseInt(sel.getAttribute('data-index'));
                currentTemplate.columnMappings[idx].targetField = sel.value;
            };
        });
        editor.querySelectorAll('.l8di-skip-check').forEach(function(cb) {
            cb.onchange = function() {
                var idx = parseInt(cb.getAttribute('data-index'));
                currentTemplate.columnMappings[idx].skip = cb.checked;
            };
        });
    }

    // ──────────────────────── File Handling ────────────────────────

    function handleFile(file) {
        var reader = new FileReader();
        reader.onload = function() {
            var text = reader.result;
            var columns = extractColumns(text, currentTemplate.sourceFormat || 'csv');
            var sample = extractSampleRow(text, currentTemplate.sourceFormat || 'csv');
            if (columns.length > 0) {
                requestAIMapping(columns, sample, text);
            }
        };
        reader.readAsText(file);
    }

    function extractColumns(text, format) {
        if (format === 'json') {
            try {
                var arr = JSON.parse(text);
                if (Array.isArray(arr) && arr.length > 0) return Object.keys(arr[0]);
            } catch (e) { /* ignore */ }
            return [];
        }
        // csv (default)
        var firstLine = text.split('\n')[0].trim();
        return firstLine.split(',').map(function(c) { return c.replace(/"/g, '').trim(); });
    }

    function extractSampleRow(text, format) {
        if (format === 'json') {
            try {
                var arr = JSON.parse(text);
                if (Array.isArray(arr) && arr.length > 0) {
                    return Object.values(arr[0]).map(String);
                }
            } catch (e) { /* ignore */ }
            return [];
        }
        var lines = text.split('\n');
        if (lines.length < 2) return [];
        return lines[1].split(',').map(function(c) { return c.replace(/"/g, '').trim(); });
    }

    // ──────────────────────── API Calls ────────────────────────

    function fetchModelInfo(modelType) {
        if (!modelType) return;
        var status = document.getElementById('l8di-ai-status');
        fetch(Layer8DConfig.resolveEndpoint('/0/ImprtInfo'), {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ modelType: modelType })
        }).then(function(r) { return r.json(); })
        .then(function(data) {
            modelFields = data.fields || [];
            if (status) status.textContent = 'Loaded ' + modelFields.length + ' fields for ' + modelType;
            refreshMappingTable();
        }).catch(function(err) {
            modelFields = [];
            if (status) status.textContent = 'Could not load model info: ' + err.message;
        });
    }

    function requestAIMapping(columns, sample, fileText) {
        var status = document.getElementById('l8di-ai-status');
        if (status) status.innerHTML = '<em>Requesting AI mapping suggestions...</em>';

        var modelType = (document.getElementById('l8di-model') || {}).value || currentTemplate.targetModelType;
        if (!modelType) {
            if (status) status.textContent = 'Please enter a Target Model Type first.';
            return;
        }

        var body = {
            targetModelType: modelType,
            targetServiceName: (document.getElementById('l8di-svc') || {}).value || '',
            targetServiceArea: parseInt((document.getElementById('l8di-area') || {}).value) || 0,
            sourceColumns: columns,
            sampleValues: sample,
            sourceFormat: currentTemplate.sourceFormat || 'csv'
        };

        fetch(Layer8DConfig.resolveEndpoint('/0/ImprtAI'), {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(body)
        }).then(function(r) { return r.json(); })
        .then(function(data) {
            currentTemplate.columnMappings = data.suggestedMappings || [];
            currentTemplate.valueTransforms = data.suggestedTransforms || [];
            var conf = data.confidence || 0;
            var cls = conf >= 0.8 ? 'high' : conf >= 0.5 ? 'medium' : 'low';
            if (status) {
                status.innerHTML = '<span class="l8di-confidence ' + cls + '">' +
                    Math.round(conf * 100) + '% confidence</span> ' +
                    esc(data.explanation || '');
            }
            if (modelFields.length === 0) fetchModelInfo(modelType);
            else refreshMappingTable();
        }).catch(function(err) {
            if (status) status.textContent = 'AI mapping failed: ' + err.message;
            // Fallback: create unmapped entries from columns
            currentTemplate.columnMappings = columns.map(function(c) {
                return { sourceColumn: c, targetField: '', skip: false };
            });
            refreshMappingTable();
        });
    }

    function refreshMappingTable() {
        var editor = document.getElementById('l8di-mapping-editor');
        if (editor) {
            editor.innerHTML = renderMappingTable();
            bindMappingEvents();
        }
    }

    function saveTemplate() {
        collectEditorFields();
        var isNew = !currentTemplate.templateId;
        var method = isNew ? 'POST' : 'PUT';

        fetch(Layer8DConfig.resolveEndpoint('/0/ImprtTmpl'), {
            method: method,
            headers: getHeaders(),
            body: JSON.stringify(currentTemplate)
        }).then(function(r) {
            if (!r.ok) return r.text().then(function(t) { throw new Error(t); });
            return r.json();
        }).then(function() {
            initialize();
        }).catch(function(err) {
            alert('Save failed: ' + err.message);
        });
    }

    function deleteTemplate() {
        if (!currentTemplate.templateId) return;
        if (!confirm('Delete template "' + currentTemplate.name + '"?')) return;
        fetch(Layer8DConfig.resolveEndpoint('/0/ImprtTmpl') + '?body=' + encodeURIComponent(
            JSON.stringify({ templateId: currentTemplate.templateId })), {
            method: 'DELETE',
            headers: getHeaders()
        }).then(function() {
            initialize();
        }).catch(function(err) {
            alert('Delete failed: ' + err.message);
        });
    }

    function collectEditorFields() {
        currentTemplate.name = val('l8di-name');
        currentTemplate.description = val('l8di-desc');
        currentTemplate.targetModelType = val('l8di-model');
        currentTemplate.targetServiceName = val('l8di-svc');
        currentTemplate.targetServiceArea = parseInt(val('l8di-area')) || 0;
        currentTemplate.sourceFormat = val('l8di-format');
    }

    function val(id) {
        var el = document.getElementById(id);
        return el ? el.value.trim() : '';
    }

    function esc(s) {
        var d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    L8DITemplates.initialize = initialize;
})();
