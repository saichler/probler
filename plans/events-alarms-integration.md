# Plan: Integrate L8Alarms UI into Probler as Events & Alarms Section

## Overview

Port the Events & Alarms UI from the `l8alarms` project into probler. The backend services are already ported. This plan covers:
1. Updating the l8ui library with the newer version from l8alarms
2. Copying the ALM module UI files
3. Wiring the section into probler's navigation and section loader

## Source & Destination

- **Source**: `/home/saichler/proj/src/github.com/saichler/l8alarms/go/alm/ui/web/`
- **Destination**: `/home/saichler/proj/src/github.com/saichler/probler/go/prob/newui/web/`

## Architecture

The ALM module uses `Layer8SectionGenerator` to dynamically generate its section HTML from config. It has 6 submodules (alarms, events, correlation, policies, maintenance, archive) with 10 services. The section name in the nav sidebar is `events` but the ALM section generator registers as `alarms`. We will change the nav entry from `events` to `alarms` for consistency with the l8alarms architecture.

---

## Phase 1: Update L8UI Library

Copy the entire `l8ui/` directory from l8alarms to probler, replacing all files. This brings in functional updates needed by the ALM module:

### Functional Changes (required for ALM)
| File | Change |
|------|--------|
| `shared/layer8-column-factory.js` | Adds `datetime()` column factory method |
| `shared/layer8-form-factory.js` | Fixes `datetime` field type definition |
| `shared/layer8d-forms-fields.js` | Adds field-level `readOnly` support + `datetime` rendering |
| `shared/layer8d-forms-data.js` | Adds skip logic for `datetime` and `readOnly` fields |
| `shared/layer8d-renderers.js` | Adds `renderDateTime()` function |
| `GUIDE.md` | Updated documentation for new features |

### Preservation Notes
- **`layer8d-table-core.js`**: Probler has a bug fix (`this.data = options.data || []`) that l8alarms lacks. After copying, **re-apply this fix** to preserve client-side data support:
  - Line: `this.data = options.data || [];` (not `this.data = [];`)
  - Line: `this.filteredData = this.data.length > 0 ? [...this.data] : [];` (not `this.filteredData = [];`)
- **`layer8d-theme.css`**: l8alarms has `--layer8d-radius-lg: 12px;` while probler uses `0` (sharp corners). After copying, **restore probler's value** (`--layer8d-radius-lg: 0;`) if sharp corners are desired.
- **Login files** (`login/`, `register/`): These will be overwritten but probler uses its own login page (`login.html`), not the l8ui login component. No functional impact.

### Command
```bash
rsync -av --delete \
  ../l8alarms/go/alm/ui/web/l8ui/ \
  go/prob/newui/web/l8ui/
```

Then manually re-apply the two preservation fixes above.

---

## Phase 2: Copy ALM Module UI Files

### 2a. Copy the `alm/` directory (22 files)

Copy the entire ALM module directory structure:

```
alm/
├── alm.css
├── alm-config.js
├── alm-init.js
├── alm-section-config.js
├── alarms/
│   ├── alarms-enums.js
│   ├── alarms-columns.js
│   ├── alarms-forms.js
│   ├── alarms-correlation-tree.js
│   └── alarms-correlation-tree.css
├── events/
│   ├── events-enums.js
│   ├── events-columns.js
│   └── events-forms.js
├── correlation/
│   ├── correlation-enums.js
│   ├── correlation-columns.js
│   └── correlation-forms.js
├── policies/
│   ├── policies-enums.js
│   ├── policies-columns.js
│   └── policies-forms.js
├── maintenance/
│   ├── maintenance-enums.js
│   ├── maintenance-columns.js
│   └── maintenance-forms.js
└── archive/
    ├── archive-enums.js
    ├── archive-columns.js
    └── archive-forms.js
```

**Command:**
```bash
cp -r ../l8alarms/go/alm/ui/web/alm/ go/prob/newui/web/alm/
```

**No modifications needed** — these files use `Layer8ModuleConfigFactory`, `Layer8DModuleFactory`, and `Layer8SectionConfigs` which resolve endpoints via `Layer8DConfig.resolveEndpoint()`. Since probler's `login.json` has `apiPrefix: "/probler"`, endpoints like `/10/Alarm` will resolve to `/probler/10/Alarm` automatically.

### 2b. Copy Reference Registry

```bash
cp ../l8alarms/go/alm/ui/web/js/reference-registry-alm.js go/prob/newui/web/js/
```

### 2c. Create Section Placeholder HTML

Replace the existing placeholder `sections/events.html` with a section generator placeholder at `sections/alarms.html`:

**File**: `go/prob/newui/web/sections/alarms.html`
```html
<div id="alarms-section-placeholder"></div>
```

Note: The `<script>` tag in the l8alarms version won't execute when loaded via innerHTML. The probler `sections.js` already handles this via the placeholder detection pattern (to be added in Phase 3).

---

## Phase 3: Wire into Probler

### 3a. Update `app.html`

**Add ALM CSS** (after the Kubernetes CSS line, before L8UI SYS Module CSS):
```html
<!-- ALM Module -->
<link rel="stylesheet" href="alm/alm.css">
<link rel="stylesheet" href="alm/alarms/alarms-correlation-tree.css">
```

**Add ALM Reference Registry** (after the l8ui factories, before notification scripts — same position as l8alarms app.html):
```html
<!-- ALM Reference Registry -->
<script src="js/reference-registry-alm.js"></script>
```

**Add ALM Module Scripts** (after the Probler module scripts block, before the Network Devices block):
```html
<!-- ALM Module -->
<script src="alm/alm-config.js"></script>
<script src="alm/alm-section-config.js"></script>
<script src="alm/alarms/alarms-enums.js"></script>
<script src="alm/alarms/alarms-columns.js"></script>
<script src="alm/alarms/alarms-forms.js"></script>
<script src="alm/events/events-enums.js"></script>
<script src="alm/events/events-columns.js"></script>
<script src="alm/events/events-forms.js"></script>
<script src="alm/correlation/correlation-enums.js"></script>
<script src="alm/correlation/correlation-columns.js"></script>
<script src="alm/correlation/correlation-forms.js"></script>
<script src="alm/policies/policies-enums.js"></script>
<script src="alm/policies/policies-columns.js"></script>
<script src="alm/policies/policies-forms.js"></script>
<script src="alm/maintenance/maintenance-enums.js"></script>
<script src="alm/maintenance/maintenance-columns.js"></script>
<script src="alm/maintenance/maintenance-forms.js"></script>
<script src="alm/archive/archive-enums.js"></script>
<script src="alm/archive/archive-columns.js"></script>
<script src="alm/archive/archive-forms.js"></script>
<script src="alm/alm-init.js"></script>
<script src="alm/alarms/alarms-correlation-tree.js"></script>
```

### 3b. Update Navigation Sidebar in `app.html`

Change the nav entry from `events` to `alarms`:
```html
<!-- Before -->
<li><a href="#" data-section="events" class="nav-link">
    <span class="nav-icon">🔔</span>
    <span>Events & Alarms</span>
</a></li>

<!-- After -->
<li><a href="#" data-section="alarms" class="nav-link">
    <span class="nav-icon">🔔</span>
    <span>Events & Alarms</span>
</a></li>
```

### 3c. Update `js/sections.js`

**Update the sections mapping** — replace `events` with `alarms`:
```javascript
const sections = {
    dashboard: 'sections/dashboard.html',
    inventory: 'sections/inventory.html',
    network: 'sections/network.html',
    gpus: 'sections/gpus.html',
    hosts: 'sections/hosts.html',
    kubernetes: 'sections/kubernetes.html',
    infrastructure: 'sections/infrastructure.html',
    topologies: 'sections/topologies.html',
    alarms: 'sections/alarms.html',      // was: events: 'sections/events.html'
    automation: 'sections/automation.html',
    applications: 'sections/applications.html',
    analytics: 'sections/analytics.html',
    system: 'sections/sys.html'
};
```

**Add section generator placeholder handling** — after `contentArea.innerHTML = html;` and before the fade-in animation, add:
```javascript
// Handle section generator placeholder pattern
const placeholder = contentArea.querySelector('[id$="-section-placeholder"]');
if (placeholder && window.Layer8SectionGenerator) {
    const generatedHtml = Layer8SectionGenerator.generate(sectionName);
    const temp = document.createElement('div');
    temp.innerHTML = generatedHtml;
    placeholder.replaceWith(...temp.children);
}
```

**Add section initializer** — add an `else if` block for `alarms`:
```javascript
} else if (sectionName === 'alarms') {
    if (typeof initializeAlm === 'function') {
        initializeAlm();
    }
}
```

**Add module filter call** — after the section initialization block, add:
```javascript
// Apply module filter to hide disabled sub-modules/services
if (window.Layer8DModuleFilter) {
    Layer8DModuleFilter.applyToSection(sectionName);
}
```

### 3d. Delete Old Placeholder

Remove the old `sections/events.html` file since it's replaced by `sections/alarms.html`.

---

## Phase 4: Verification

### 4a. File Verification
```bash
# Verify all ALM files exist
ls -la go/prob/newui/web/alm/alm-config.js
ls -la go/prob/newui/web/alm/alm-init.js
ls -la go/prob/newui/web/alm/alm-section-config.js
ls -la go/prob/newui/web/alm/alarms/alarms-enums.js
ls -la go/prob/newui/web/js/reference-registry-alm.js
ls -la go/prob/newui/web/sections/alarms.html

# Verify script includes in app.html
grep "alm-config.js" go/prob/newui/web/app.html
grep "alm-init.js" go/prob/newui/web/app.html
grep "reference-registry-alm.js" go/prob/newui/web/app.html
grep "alarms-correlation-tree" go/prob/newui/web/app.html

# Verify section mapping
grep "alarms:" go/prob/newui/web/js/sections.js

# Verify nav entry
grep 'data-section="alarms"' go/prob/newui/web/app.html

# Verify l8ui preservation fixes
grep "options.data" go/prob/newui/web/l8ui/edit_table/layer8d-table-core.js

# Verify no old events placeholder remains
test ! -f go/prob/newui/web/sections/events.html && echo "OK: old events.html removed"
```

### 4b. Syntax Check
```bash
# Verify all JS files parse correctly
for f in go/prob/newui/web/alm/**/*.js go/prob/newui/web/js/reference-registry-alm.js; do
    node -c "$f" || echo "SYNTAX ERROR: $f"
done
```

### 4c. Functional Test
1. Start the probler demo server
2. Navigate to "Events & Alarms" in the sidebar
3. Verify the section generates with the hero header, 6 module tabs, and service navigation
4. Click through each submodule (Alarms, Events, Correlation, Policies, Maintenance, Archive)
5. Verify tables load data from `/probler/10/Alarm`, `/probler/10/Event`, etc.
6. Test detail popups by clicking rows
7. Test the correlation tree tab on Alarm detail popups
8. Test view switching (table/kanban/chart) on Active Alarms
9. Test calendar view on Maintenance Windows

---

## File Change Summary

| Action | File | Description |
|--------|------|-------------|
| Replace | `l8ui/` (entire directory) | Update to l8alarms version |
| Fix | `l8ui/edit_table/layer8d-table-core.js` | Re-apply `options.data` fix |
| Fix | `l8ui/shared/layer8d-theme.css` | Restore `--layer8d-radius-lg: 0` if desired |
| Create | `alm/` (entire directory, 22 files) | Copy from l8alarms |
| Create | `js/reference-registry-alm.js` | Copy from l8alarms |
| Create | `sections/alarms.html` | Section generator placeholder |
| Modify | `app.html` | Add CSS, reference registry, and 21 script includes; change nav `events`→`alarms` |
| Modify | `js/sections.js` | Add `alarms` section mapping, placeholder handling, initializer, module filter |
| Delete | `sections/events.html` | Replaced by `sections/alarms.html` |
