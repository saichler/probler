# Plan: Merge l8ui Updates from l8erp to Probler

## Summary
The l8erp l8ui library has been updated with new features (CSV export, file upload, data import) and bug fixes. This plan merges those changes into probler's l8ui copy.

## Changes Overview

### New Files (copy from l8erp)
1. `shared/layer8-csv-export.js` — CSV export component
2. `shared/layer8-file-upload.js` — File upload component
3. `shared/layer8-file-upload.css` — File upload styles
4. `sys/dataimport/` — Data import module (5 files: l8dataimport.js, l8dataimport-execute.js, l8dataimport-templates.js, l8dataimport-transfer.js, l8dataimport.css)

### Modified Files (copy from l8erp, overwriting probler versions)

**edit_table/ (4 files)**
- `layer8d-table-core.js` — Removes probler's client-side data fix (`options.data || []`), reverts to `[]` default
- `layer8d-table-data.js` — Adds page-1-only metadata guard (pagination fix from CLAUDE.md rules)
- `layer8d-table-events.js` — Adds CSV export button click handler
- `layer8d-table-render.js` — Adds export button to pagination bar

**shared/ (6 files)**
- `layer8d-forms-data.js` — Adds `file` type to compound field guard + file data collection case
- `layer8d-forms-fields-ext.js` — Adds file upload field renderer
- `layer8d-forms-fields.js` — Adds readOnly pass-through to field HTML generation + file field readOnly handling
- `layer8d-module-crud.js` — Makes `_showDetailsModal` async, adds server-side fresh record fetch before showing detail popup
- `layer8d-theme.css` — Changes `--layer8d-radius-lg` from `0` to `12px`
- `layer8-form-factory.js` — Adds `f.file()` factory method

**m/ (3 files)**
- `m/js/layer8m-forms-fields.js` — Adds mobile file field renderer
- `m/js/layer8m-forms.js` — Adds `file` case to mobile form field rendering
- `m/js/layer8m-table.js` — Adds export bar + export button handler to mobile table

**sys/ (2 files)**
- `sys/l8sys-config.js` — Adds "Data Import" tab to SYS module config
- `sys/l8sys-init.js` — Adds `L8DataImport.initialize()` call

**GUIDE.md** — Adds CSV export documentation section

## Conflict: layer8d-table-core.js

The l8erp version reverts to `this.data = []` and `this.filteredData = []`, removing probler's fix for client-side data support (`options.data || []` and conditional `filteredData` init).

**Resolution**: Keep probler's client-side data fix. Copy the l8erp version but re-apply the two-line probler patch:
- Line 22: `this.data = options.data || [];`
- Line 65: `this.filteredData = this.data.length > 0 ? [...this.data] : [];`

## Execution Steps

1. **Copy new files** from l8erp to probler (4 new files + 1 new directory with 5 files)
2. **Copy modified files** — overwrite 14 files with l8erp versions
3. **Re-apply probler patch** to probler's `edit_table/layer8d-table-core.js` (client-side data support)
4. **Port client-side data fix to l8erp** — apply the same two-line patch to l8erp's `go/erp/ui/web/l8ui/edit_table/layer8d-table-core.js`:
   - `this.data = options.data || [];`
   - `this.filteredData = this.data.length > 0 ? [...this.data] : [];`
   This makes the fix canonical in l8erp so future syncs won't conflict.
5. **Update `app.html`** — add `<script>` includes for new files: `layer8-csv-export.js`, `layer8-file-upload.js`, `layer8-file-upload.css`, and the 4 dataimport files + CSS
6. **Verify** — run `node -c` syntax check on all modified JS files
