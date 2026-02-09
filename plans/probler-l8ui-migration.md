# Migration Plan: Probler Custom Components to L8UI Generic Library

## 1. Executive Summary

Probler currently uses a mix of custom components and the l8ui library. The custom components duplicate functionality that l8ui already provides (tables, popups, confirmations, config loading, authentication). This plan migrates Probler from its custom implementations to the l8ui generic component library, resulting in less code to maintain, a consistent UI framework, and parity between desktop and mobile.

### Current State
- **Custom components**: `ProblerTable`, `ProblerPopup`, `ProblerConfirm`, custom config loaders, custom auth, custom section navigation
- **Custom login/register**: `login/` has its own `config.js` + `login.js` + `login.css` (539 lines of JS, separate HTML) that duplicates the l8ui login at `l8ui/login/` (5 modular JS files, 4 CSS files, full TFA support)
- **Custom register**: `register/` has its own `register.js` + `register.css` + `index.html` that duplicates l8ui's `l8ui/register/`
- **L8UI already loaded but unused**: The l8ui library exists at `go/prob/newui/web/l8ui/` but the main `app.html` does not load any l8ui scripts
- **iframe isolation pattern**: Dashboard, network devices, kubernetes, security tabs (users/roles/credentials), health, and logs each run in separate iframes with postMessage communication
- **No mobile app.html**: No mobile version of the main application shell exists

### Target State
- Replace custom login/register with l8ui login/register components
- Replace custom table/popup/confirm/config with l8ui equivalents
- Use l8ui module factory pattern for section management
- Consolidate iframe sections into direct l8ui module integrations where possible
- Achieve desktop/mobile parity per the mobile parity rule

---

## 2. Component Mapping (Custom -> L8UI)

| Custom Component | File(s) | L8UI Replacement | Notes |
|---|---|---|---|
| Custom Login | `login/config.js` + `login/login.js` + `login/login.css` + `login/index.html` (539 lines JS) | `l8ui/login/` (5 JS files, 4 CSS files, index.html) | l8ui version is modular (config, state, auth, tfa, ui), has identical TFA flow, uses `layer8d-login-*` CSS prefixes |
| Custom Register | `register/register.js` + `register/register.css` + `register/index.html` | `l8ui/register/` (1 JS, 1 CSS, index.html) | l8ui version is a drop-in replacement |
| `ProblerTable` (view) | `view_table/table.js` (532 lines) | `Layer8DTable` (with `onAdd`/`onEdit`/`onDelete` = null) | Near-identical API; l8ui table acts as view-only when CRUD callbacks are null |
| `L8Table` (edit) | `edit_table/table.js` (737 lines) | `Layer8DTable` (with `onAdd`/`onEdit`/`onDelete` set) | Near-identical API; l8ui table shows Add/Edit/Delete buttons when callbacks are provided |
| `ProblerPopup` | `popup/popup.js` (361 lines) | `Layer8DPopup` | l8ui version supports stacking, tabs, forms |
| `ProblerConfirm` | `confirm/confirm.js` (235 lines) | l8ui has no standalone confirm; keep or port to l8ui | Could add to l8ui or keep as probler-specific |
| Config loaders | `dashboard/config.js`, `network_devices/config.js`, etc. | `Layer8DConfig` | Single config loader replaces per-section loaders |
| Auth helper | `js/app.js:makeAuthenticatedRequest()` | `Layer8DConfig` + global `getAuthHeaders()` | l8ui pattern uses `sessionStorage.bearerToken` |
| Section navigation | `js/sections.js` | `Layer8DModuleFactory` + `sections.js` pattern | l8ui has section initializer dispatch built in |
| Tree view | `js/tree.js` (371 lines) | `Layer8DToggleTree` | Different use case; ProblerTree is for device inventory display, not toggle. **Keep as probler-specific.** |
| Parallax effects | `js/parallax.js` (92 lines) | No l8ui equivalent | **Keep as probler-specific.** |

---

## 3. Migration Phases

### Phase 0: Replace Custom Login & Register with L8UI Components

**Goal**: Switch from the custom login/register pages to the l8ui generic versions.

**Analysis of differences**:

| Aspect | Custom (`login/`) | L8UI (`l8ui/login/`) |
|---|---|---|
| JS structure | 2 files: `config.js` (28 lines) + `login.js` (539 lines) | 5 modular files: config (45), state, auth, tfa, ui |
| CSS structure | 1 file: `login.css` | 4 files: base, forms, tfa, components |
| CSS class prefix | None (`login-container`, `btn-login`, `tfa-section`) | `layer8d-login-` prefix (`layer8d-login-container`, `layer8d-btn-login`) |
| TFA flow | Full (verify + setup with QR) | Identical TFA flow (verify + setup with QR) |
| Config loading | `fetch('/login.json')` -> `config.login` | Identical: `fetch('/login.json')` -> `config.login` |
| Auth endpoint | `LOGIN_CONFIG.authEndpoint` | Same pattern |
| Token storage | `sessionStorage.bearerToken` | Same |
| Mobile redirect | `isMobileDevice()` -> redirect to `m/app.html` | Same mobile detection and redirect |
| Demo credentials | Has `<div class="demo-credentials">` | Does not have demo credentials display |
| Remember me | `localStorage.rememberedUser` | Same |
| Branding | Generic "Application" title | "ERP by Layer 8" title (configurable via login.json) |

The custom login is essentially a copy of the l8ui login with non-prefixed CSS classes and a "demo credentials" hint. The l8ui version is the canonical implementation with better modularity.

**Steps**:

1. **Update `login.json`** to set probler-specific branding:
   ```json
   {
       "login": {
           "appTitle": "Probler",
           "appDescription": "Datacenter Central Operation Management",
           "authEndpoint": "/auth",
           "redirectUrl": "../app.html",
           "showRememberMe": true,
           "showRegister": true,
           "sessionTimeout": 30,
           "tfaEnabled": true
       }
   }
   ```

2. **Update all login redirects** in `app.js` and other files:
   - Change `window.location.href = 'login/index.html'` to `window.location.href = 'l8ui/login/index.html'`
   - Change `window.location.href = '../login/index.html'` to use the l8ui path

3. **Update the l8ui login `redirectUrl`** in login.json to point to `../app.html` (relative to `l8ui/login/`)

4. **Copy probler logo** (`login/logo.gif`, `login/Layer8Logo.gif`) to `l8ui/login/` if they differ from the l8ui defaults

5. **Handle demo credentials**: If the demo credentials hint is needed, either:
   - (a) Add it to login.json as a configurable field (e.g., `"demoHint": "Demo: operator/Oper123!"`) and patch l8ui login to show it, or
   - (b) Accept that the l8ui login won't show demo credentials (users can learn them from docs/landing page)

6. **Replace custom register**: Update register links from `register/` to `l8ui/register/`. Update l8ui register's redirect to point back to `../login/index.html`.

7. **Update iframe sections** that redirect to login: Any iframe HTML files that reference `../login/index.html` must be updated.

**After migration**:
- Delete `go/prob/newui/web/login/config.js`
- Delete `go/prob/newui/web/login/login.js`
- Delete `go/prob/newui/web/login/login.css`
- Delete `go/prob/newui/web/login/index.html`
- Keep `go/prob/newui/web/login/logo.gif` and `Layer8Logo.gif` if copied to l8ui
- Delete `go/prob/newui/web/register/register.js`
- Delete `go/prob/newui/web/register/register.css`
- Delete `go/prob/newui/web/register/index.html`

**Verification**:
- [ ] Login page loads with probler branding (title, logo)
- [ ] Username/password authentication works
- [ ] TFA setup flow works (QR code display, code verification)
- [ ] TFA verify flow works (code entry for existing TFA users)
- [ ] "Remember me" persists username across sessions
- [ ] Session timeout works
- [ ] Mobile detection redirects to mobile app
- [ ] Logout clears tokens and redirects to login
- [ ] Register page loads and functions correctly
- [ ] Register link from login page works

---

### Phase 1: Foundation -- Wire L8UI Core Into app.html (No behavioral changes)

**Goal**: Load l8ui scripts into `app.html` alongside existing custom components. Nothing breaks; both systems coexist.

**Files to modify**:
- `go/prob/newui/web/app.html` -- Add l8ui CSS and JS includes (theme, config, utils, renderers, table, popup, forms, etc.)
- `go/prob/newui/web/login.json` -- Ensure it matches l8ui expected format (check `login` and `app` keys with `apiPrefix`, `healthPath`, `dateFormat`)

**Steps**:
1. Add l8ui CSS links to `<head>` (theme, scrollbar, animations, section-layout, table, popup, datepicker, reference-picker, input-formatter, notification)
2. Add l8ui JS scripts to `<body>` in the correct dependency order per GUIDE.md Section 3
3. Create `go/prob/newui/web/js/sections.js` update to add `sectionInitializers` object (l8ui pattern) while keeping existing `loadSection()` function
4. Verify login.json format works with `Layer8DConfig.load()`
5. **Verification**: App loads without errors, existing functionality unaffected

**File size compliance**: No new files exceed 500 lines. app.html stays under 500 lines.

---

### Phase 2: Replace Both Custom Tables with Layer8DTable

**Goal**: Replace both `ProblerTable` (view-only) and `L8Table` (editable) with the single l8ui `Layer8DTable`. The l8ui table acts as view-only when `onAdd`/`onEdit`/`onDelete` are null, and shows CRUD buttons when those callbacks are provided.

**Analysis**: Probler has two custom table classes:
1. **`ProblerTable`** (`view_table/table.js`, 532 lines) -- View-only table with pagination, sorting, filtering, row click. Constructor takes `(containerId, config)`. Auto-calls `init()` in constructor.
2. **`L8Table`** (`edit_table/table.js`, 737 lines) -- Editable table with Add/Edit/Delete buttons, pagination, sorting, filtering. Constructor takes single `options` object. Requires explicit `init()` call.

Both have nearly identical APIs to `Layer8DTable`. The l8ui table unifies both use cases in a single class.

**Usage inventory** (from grep):

| Custom Class | File | Count |
|---|---|---|
| `ProblerTable` | `js/gpus-init.js` | 1 |
| `ProblerTable` | `js/hosts.js` | 2 |
| `ProblerTable` | `js/network-devices.js` | 1 |
| `ProblerTable` | `js/system-users-roles.js` | 2 |
| `ProblerTable` | `network_devices/network-devices.js` | 1 |
| `ProblerTable` | `dashboard/dashboard.js` | 1 |
| `ProblerTable` | `health/health.js` | 1 |
| `ProblerTable` | `kubernetes/kubernetes-init.js` | 8 |
| `ProblerTable` | `kubernetes/kubernetes-tables.js` | 8 |
| `L8Table` | `users/users.js` | 1 |
| `L8Table` | `roles/roles.js` | 1 |
| `L8Table` | `credentials/credentials.js` | 1 |
| `L8Table` | `targets/targets.js` | 1 |
| **Total** | | **29 instances** |

**Migration pattern -- ProblerTable (view-only)** -> Layer8DTable:
```javascript
// BEFORE (ProblerTable -- view-only)
const table = new ProblerTable('container-id', {
    columns: [...],
    serverSide: true,
    endpoint: prefix + '/0/NCache',
    modelName: 'NetworkDevice',
    onRowClick: (item) => { ... }
});

// AFTER (Layer8DTable -- view-only: no onAdd/onEdit/onDelete)
const table = new Layer8DTable({
    containerId: 'container-id',
    columns: [...],
    serverSide: true,
    endpoint: '/0/NCache',
    modelName: 'NetworkDevice',
    onRowClick: (item, id) => { ... }
});
table.init();
```

**Migration pattern -- L8Table (editable)** -> Layer8DTable:
```javascript
// BEFORE (L8Table -- editable)
const table = new L8Table({
    containerId: 'users-table',
    columns: [...],
    serverSide: true,
    endpoint: resolveEndpoint('/20/Credential'),
    modelName: 'Credential',
    onAdd: () => { ... },
    onEdit: (id) => { ... },
    onDelete: (id) => { ... },
    addButtonText: 'Add User'
});
table.init();

// AFTER (Layer8DTable -- editable: same API)
const table = new Layer8DTable({
    containerId: 'users-table',
    columns: [...],
    serverSide: true,
    endpoint: '/20/Credential',
    modelName: 'Credential',
    onAdd: () => { ... },
    onEdit: (id) => { ... },
    onDelete: (id) => { ... },
    addButtonText: 'Add User'
});
table.init();
```

**Key difference**: `ProblerTable` constructor takes `(containerId, config)` as two arguments, while both `L8Table` and `Layer8DTable` take a single options object with `containerId` inside it. So `ProblerTable` migrations require restructuring the constructor call, while `L8Table` migrations are nearly drop-in.

**Files to modify** (29 instances across these files):
- `go/prob/newui/web/js/gpus-init.js`
- `go/prob/newui/web/js/hosts.js`
- `go/prob/newui/web/js/network-devices.js`
- `go/prob/newui/web/js/system-users-roles.js`
- `go/prob/newui/web/network_devices/network-devices.js`
- `go/prob/newui/web/dashboard/dashboard.js`
- `go/prob/newui/web/health/health.js`
- `go/prob/newui/web/kubernetes/kubernetes-init.js`
- `go/prob/newui/web/kubernetes/kubernetes-tables.js`
- `go/prob/newui/web/users/users.js`
- `go/prob/newui/web/roles/roles.js`
- `go/prob/newui/web/credentials/credentials.js`
- `go/prob/newui/web/targets/targets.js`

**After all 29 instances are migrated**:
- Delete `go/prob/newui/web/view_table/table.js` and `view_table/table.css`
- Delete `go/prob/newui/web/edit_table/table.js` and `edit_table/table.css`
- Remove view_table and edit_table CSS/JS includes from app.html and any iframe HTML files

**Verification**: All 29 tables render with same data, pagination works, sorting works, filtering works, row clicks work. For editable tables: Add/Edit/Delete buttons appear and function correctly.

---

### Phase 3: Replace ProblerPopup with Layer8DPopup

**Goal**: Replace the custom popup system with l8ui's popup.

**Analysis**: The custom `ProblerPopup` has postMessage-based iframe communication for showing modals from inside iframes. `Layer8DPopup` is a direct DOM-based popup that does not use postMessage. This migration changes the architecture:
- For sections that are **NOT in iframes** (GPUs, Hosts): Direct replacement, straightforward
- For sections that **ARE in iframes** (Network, K8s, Security): Requires either (a) keeping postMessage bridge for iframes, or (b) migrating those sections out of iframes (see Phase 5)

**Files to modify**:
- `go/prob/newui/web/js/gpu-modal.js` -- Replace `ProblerPopup.show(...)` with `Layer8DPopup.show(...)`
- `go/prob/newui/web/js/hosts-modal-hypervisor.js` -- Same
- `go/prob/newui/web/js/hosts-modal-vm.js` -- Same
- `go/prob/newui/web/popup/popup.js` -- Delete after migration

**Migration pattern**:
```javascript
// BEFORE (ProblerPopup)
ProblerPopup.show({
    title: 'Device Details',
    content: htmlContent,
    size: 'large'
});

// AFTER (Layer8DPopup)
Layer8DPopup.show({
    title: 'Device Details',
    content: htmlContent,
    size: 'large'
});
```

The API is nearly identical. Main differences:
- `ProblerPopup` uses `probler-popup-*` CSS classes; `Layer8DPopup` uses its own classes
- Tab support uses same `data-tab`/`data-pane` pattern in both

**After migration**:
- Delete `go/prob/newui/web/popup/popup.js`, `popup.css`, `popup-forms.css`, `popup-content.css`
- Remove popup CSS/JS includes from app.html

**Verification**: All detail modals open correctly, tabs work inside modals, close button works, nested modals work.

---

### Phase 4: Replace Custom Config Loaders with Layer8DConfig

**Goal**: Eliminate duplicate `loadConfig()` functions across dashboard, network_devices, kubernetes, etc.

**Analysis**: Currently each iframe-based section has its own `config.js` that fetches `login.json` and extracts `apiPrefix`. `Layer8DConfig` does this once and provides `resolveEndpoint()`.

**Files to modify**:
- `go/prob/newui/web/dashboard/config.js` -- Replace with `Layer8DConfig.load()` usage
- `go/prob/newui/web/network_devices/config.js` -- Same
- `go/prob/newui/web/kubernetes/config.js` -- Same
- `go/prob/newui/web/health/config.js` -- Same
- `go/prob/newui/web/credentials/config.js` -- Same
- `go/prob/newui/web/users/config.js` -- Same
- `go/prob/newui/web/roles/config.js` -- Same
- `go/prob/newui/web/targets/config.js` -- Same
- `go/prob/newui/web/login/config.js` -- Same

**Migration pattern**:
```javascript
// BEFORE (each section)
let CONFIG = null;
async function loadConfig() {
    const response = await fetch('../login.json');
    const config = await response.json();
    CONFIG = { apiPrefix: config.api.prefix, ... };
}
const url = CONFIG.apiPrefix + '/0/NCache';

// AFTER (l8ui)
await Layer8DConfig.load();
const url = Layer8DConfig.resolveEndpoint('/0/NCache');
```

**Note**: `login.json` format may need adjustment. Current probler uses `config.api.prefix`; l8ui expects `config.app.apiPrefix`. Either update login.json or add compatibility in the config.

**Verification**: All API calls resolve to correct URLs, all sections load data correctly.

---

### Phase 5: Consolidate iframe Sections Into Direct Module Integration

**Goal**: Remove iframe isolation for sections that don't need it, using l8ui's direct module pattern instead.

**Rationale**: The iframe pattern was used before l8ui existed. Now that l8ui provides module isolation via namespaces and factory pattern, iframes add unnecessary complexity (postMessage bridges, duplicate script loading, auth token syncing via localStorage).

**Sections currently in iframes**:
1. `dashboard` -- Custom dashboard with metrics cards (keep as iframe -- unique visualization)
2. `network_devices` -- Table with device detail modals (migrate to direct)
3. `kubernetes` -- K8s cluster views (migrate to direct)
4. `security/users` -- Users CRUD table (migrate to direct -- l8ui SYS module already has this)
5. `security/roles` -- Roles CRUD table (migrate to direct -- l8ui SYS module already has this)
6. `security/credentials` -- Credentials CRUD table (migrate to direct)
7. `system/health` -- Health monitor (migrate to direct -- l8ui SYS module already has this)
8. `system/logs` -- Log viewer (keep as iframe -- specialized UI)

**Sub-steps**:

#### 5a. Security Section -> L8UI SYS Module
The l8ui library already includes a complete security module at `l8ui/sys/security/` with users, roles, and credentials CRUD. Replace the custom iframe-based security section with l8ui's built-in SYS security module.

**Files to create/modify**:
- Update `sections/security.html` to use l8ui section layout (`l8-section`, `l8-module-tabs`, etc.)
- Add l8ui SYS module scripts to app.html (l8sys-config, l8security-*, l8sys-init)
- Update `sections.js` to call `initializeSys()` for the security section

#### 5b. System/Health -> L8UI Health Module
l8ui includes `l8ui/sys/health/l8health.js`. Replace the iframe-based health view.

#### Detail View Comparison Requirement (applies to 5c, 5d, and all future phases)

**Before migrating any table's detail view**, perform this comparison checklist:

1. **Data source**: Does the detail view use client-side data only, or does it fetch from a separate endpoint?
   - Client-side only: Targets, Network Devices (device-modal), GPUs, Hosts, Health, all SYS tables
   - Async server fetch: K8s Pods (`/0/exec` jobName=`poddetails`), K8s Nodes (`/0/exec` jobName=`nodedetails`), K8s Deployments (`/0/exec` jobName=`deploymentdetails`)
   - If server fetch: document the endpoint, method, request body, response decoding (e.g., base64 + JSON parse), and fallback behavior

2. **Modal system**: Which modal system does the detail view use?
   - `Layer8DPopup.show()` direct call (Health in l8health.js, SYS service registry)
   - PostMessage bridge -> `Layer8DPopup` (Network Devices iframe, Targets iframe)
   - Native DOM modal (`modal.classList.add('active')`) (K8s uses `k8s-detail-modal`, `node-detail-modal`)
   - If native DOM modal: must be converted to Layer8DPopup (direct or via postMessage)

3. **CSS class convention**: Which detail layout classes does it use?
   - `detail-grid/section/row/label/value` (in `layer8d-popup-content.css`, scoped under `.probler-popup-body`) -- Network Devices
   - `l8health-detail-*` (in `l8health.css`) -- Health
   - `detail-grid/section/item/label/value` + `modal-tabs/tab/tab-content` (in `kubernetes.css` + `components-modals.css`) -- K8s
   - Target: all migrated detail views should use the `detail-*` classes from `layer8d-popup-content.css`

4. **Tab structure**: List all tabs and their content types for each detail view
   - Are tabs simple key-value grids, or do they contain HTML tables (`detail-table`), progress bars, trees, etc.?

5. **Special components**: Does the detail view use any non-standard components?
   - `ProblerTree` (Network Devices physical inventory tab)
   - `performance-bar` progress bars (Network Devices performance tab)
   - `detail-table` HTML tables with `<thead>`/`<tbody>` (K8s labels, annotations, conditions, images, tolerations, volumes)
   - `status-badge` styled status indicators (K8s conditions)
   - If yes: verify the component or CSS class is available in the parent window

6. **Data fields**: For each tab, list every field displayed and verify it is present in the data object passed to the detail view (or fetched from the server)

#### Current Detail View Inventory

| Section | Tables | Detail Modal Type | Data Source | Tabs | Special Components |
|---------|--------|------------------|-------------|------|--------------------|
| Inventory/Targets | 1 | PostMessage -> Layer8DPopup | Client-side | Overview, Hosts & Protocols | None |
| Network Devices | 1 | PostMessage -> Layer8DPopup | Client-side (transformed) | Overview, Equipment, Physical Inventory, Performance | ProblerTree, performance-bar |
| GPUs | 1 | Layer8DPopup direct | Client-side | (single view) | None |
| Hosts | 2 | Layer8DPopup direct | Client-side | (single view per type) | None |
| K8s Pods | 1 | Native DOM modal | Async fetch (`/0/exec` poddetails) + fallback | Overview, Metadata, Spec, Containers, Volumes, Conditions, Status | detail-table, status-badge |
| K8s Nodes | 1 | Native DOM modal | Async fetch (`/0/exec` nodedetails) + fallback | Overview, Labels, Annotations, Addresses, Resources, Conditions, System Info, Images | detail-table, status-badge |
| K8s Deployments | 1 | Native DOM modal | Async fetch (`/0/exec` deploymentdetails) + fallback | (varies) | detail-table, status-badge |
| K8s Services | 1 | Native DOM modal | Client-side | (varies) | detail-table |
| K8s StatefulSets | 1 | Native DOM modal | Client-side | (varies) | detail-table |
| K8s DaemonSets | 1 | Native DOM modal | Client-side | (varies) | detail-table |
| K8s Namespaces | 1 | Native DOM modal | Client-side | (varies) | detail-table |
| K8s NetworkPolicies | 1 | Native DOM modal | Client-side | (varies) | detail-table |
| Health | 1 | Layer8DPopup direct | Client-side | Overview, Network, Resources, Services | None |
| SYS Users/Roles | 2 | Layer8DPopup direct (via service registry) | Client-side | (varies) | None |

#### 5c. Network Devices -> Direct Integration
Move network devices from iframe to direct integration in app.html:
- Load `network_devices/network-devices.js` directly (already loaded but only used when section is an iframe)
- Replace `ProblerTable` with `Layer8DTable` in the network devices JS
- Replace `ProblerPopup` with `Layer8DPopup` for device detail modals
- Update `sections/network.html` to use a direct table container instead of iframe

**Detail view migration notes (Network Devices)**:
- Currently uses postMessage bridge -> Layer8DPopup with `titleHtml` (status badge), `noPadding`, `showFooter: false`
- Uses `detail-*` CSS classes from `layer8d-popup-content.css` -- already compatible
- Physical Inventory tab uses `ProblerTree` -- must ensure `tree.js` is loaded in app.html and `initializeDeviceTree()` bridge in app.js continues to work
- Performance tab uses `performance-bar` / `performance-bar-fill` with `low/medium/high` -- CSS is in `layer8d-popup-content.css`, already loaded
- `deviceData` is passed as top-level postMessage property (not inside config) -- bridge handles this specially at app.js line 187-188

#### 5d. Kubernetes -> Direct Integration
Move K8s from iframe to direct table+modal pattern.

**Detail view migration notes (Kubernetes)** -- CRITICAL differences from other sections:
- **8 separate detail modal files** (13 files total including generators and helpers)
- **Native DOM modal system** -- uses `modal.classList.add('active')` and `setupK8sModalTabs(content)` / `setupNodeModalTabs(content)`. Must be converted to Layer8DPopup
- **3 modals use async server fetch** -- Pods, Nodes, Deployments POST to `/probler/0/exec` with job-specific arguments. Must preserve: endpoint, request body construction, base64 decoding, JSON parsing, and fallback to generated synthetic data on failure
- **Different CSS classes** -- uses `detail-item` (not `detail-row`), `modal-tab` (not `probler-popup-tab`), `modal-tab-content` (not `probler-popup-tab-pane`). Must convert to `layer8d-popup-content.css` convention
- **HTML tables** -- extensive use of `<table class="detail-table">` for labels, annotations, conditions, images, tolerations, volumes, addresses, resources. Must verify these render correctly inside Layer8DPopup body
- **status-badge** CSS class for condition status indicators -- must verify it exists in popup content CSS or add it
- Conversion must be done per-modal-file, verifying each tab's fields against the current implementation

**Verification**: Each migrated section functions identically to the iframe version -- same data display, same interactions, same detail modals. For each table:
- [ ] All tabs from the original detail view are present
- [ ] All data fields within each tab are displayed
- [ ] Async data fetching (if applicable) uses the same endpoint, request body, and response parsing
- [ ] Fallback behavior works when the server fetch fails
- [ ] Special components (ProblerTree, progress bars, HTML tables, status badges) render correctly
- [ ] CSS styling matches the original appearance

---

### Phase 6: Create Probler Module Config Files (L8UI Pattern)

**Goal**: Define probler-specific data (columns, forms, enums) using l8ui factory patterns.

**Files to create** (following GUIDE.md Section 8):

#### Desktop Module Config
```
go/prob/newui/web/probler/probler-config.js          -- Module config (Layer8ModuleConfigFactory)
go/prob/newui/web/probler/network/network-enums.js    -- Device status enums
go/prob/newui/web/probler/network/network-columns.js  -- NetworkDevice columns
go/prob/newui/web/probler/network/network-forms.js    -- NetworkDevice forms (if editable)
go/prob/newui/web/probler/gpus/gpus-enums.js          -- GPU status enums
go/prob/newui/web/probler/gpus/gpus-columns.js        -- GPU columns
go/prob/newui/web/probler/hosts/hosts-enums.js        -- Host status enums
go/prob/newui/web/probler/hosts/hosts-columns.js      -- Host/VM columns
go/prob/newui/web/probler/k8s/k8s-enums.js            -- K8S status enums
go/prob/newui/web/probler/k8s/k8s-columns.js          -- K8S cluster columns
go/prob/newui/web/probler/probler-init.js              -- Layer8DModuleFactory.create() call
```

**Key rule compliance**:
- All field names verified against protobuf `.pb.go` files before use (Rule 4.1)
- Model names match protobuf types exactly (Rule 3.4)
- Each file under 500 lines (Rule 1.1)
- No duplicate code -- use factory helpers (Rule 1.2)

#### Column Definitions (using Layer8ColumnFactory)
```javascript
const col = window.Layer8ColumnFactory;
ProblerNetwork.columns = {
    NetworkDevice: [
        ...col.id('id'),
        ...col.col('equipmentinfo.model', 'Model'),
        ...col.col('equipmentinfo.ipAddress', 'IP Address'),
        ...col.status('equipmentinfo.deviceStatus', 'Status', enums.DEVICE_STATUS_VALUES, render.deviceStatus),
        ...col.col('equipmentinfo.location', 'Location'),
    ]
};
```

**Critical**: Verify every field against `go/types/inventory.pb.go` before writing column definitions.

---

### Phase 7: Update Section HTML to L8UI Layout Pattern

**Goal**: Convert section HTML files from custom layout to l8ui `l8-` prefixed layout classes.

**Current pattern** (custom):
```html
<div class="section-container gpu-section">
    <div class="gpu-hero">...</div>
    <div class="section-content gpu-content">
        <div id="gpu-table"></div>
    </div>
</div>
```

**Target pattern** (l8ui):
```html
<div class="section-container l8-section">
    <div class="page-header"><h1>GPU Computing</h1></div>
    <div class="l8-module-tabs">
        <button class="l8-module-tab active" data-module="compute">...</button>
    </div>
    <div class="l8-module-content active" data-module="compute">
        <div class="l8-subnav">
            <a class="l8-subnav-item active" data-service="gpus">GPUs</a>
        </div>
        <div class="l8-service-view active" data-service="gpus">
            <div class="l8-table-container" id="compute-gpus-table-container"></div>
        </div>
    </div>
</div>
```

**Table container ID pattern**: `{moduleKey}-{serviceKey}-table-container`

**Sections to update**:
- `sections/gpus.html`
- `sections/hosts.html`
- `sections/network.html`
- `sections/kubernetes.html`
- `sections/security.html` (if not fully replaced by SYS module)
- `sections/system.html`
- `sections/inventory.html`
- `sections/infrastructure.html`
- `sections/events.html`
- `sections/topologies.html`

**Note**: Some sections (dashboard, topologies, analytics) may keep custom layouts because they are visualization-heavy rather than table-based.

---

### Phase 8: Mobile Parity

**Goal**: Create mobile version of probler application with l8ui mobile components.

Per the mobile parity rule, every UI feature must have functional parity between desktop and mobile.

**Files to create**:
```
go/prob/newui/web/m/app.html                     -- Mobile app shell
go/prob/newui/web/m/js/probler/network-enums.js  -- Mobile network enums
go/prob/newui/web/m/js/probler/network-columns.js -- Mobile network columns (with primary/secondary)
go/prob/newui/web/m/js/probler/gpus-enums.js     -- Mobile GPU enums
go/prob/newui/web/m/js/probler/gpus-columns.js   -- Mobile GPU columns
go/prob/newui/web/m/js/probler/hosts-enums.js    -- Mobile host enums
go/prob/newui/web/m/js/probler/hosts-columns.js  -- Mobile host columns
go/prob/newui/web/m/js/probler/k8s-enums.js      -- Mobile K8S enums
go/prob/newui/web/m/js/probler/k8s-columns.js    -- Mobile K8S columns
go/prob/newui/web/m/js/probler/probler-index.js  -- Layer8MModuleRegistry.create()
```

**Mobile nav config**:
- Add probler modules to `LAYER8M_NAV_CONFIG`
- Register `MobileProbler` in `layer8m-nav-data.js`

---

### Phase 9: Cleanup

**Goal**: Remove all dead code and unused custom components.

**Files to delete**:
- `go/prob/newui/web/view_table/table.js` and `table.css` (replaced by Layer8DTable -- view-only mode)
- `go/prob/newui/web/edit_table/table.js` and `table.css` (replaced by Layer8DTable -- editable mode)
- `go/prob/newui/web/popup/popup.js`, `popup.css`, `popup-forms.css`, `popup-content.css` (replaced by Layer8DPopup)
- `go/prob/newui/web/confirm/confirm.js`, `confirm.css` (replaced or kept)
- Per-section `config.js` files (replaced by Layer8DConfig)
- `go/prob/newui/web/js/system-users-roles.js` (replaced by l8ui SYS security module)
- Iframe HTML files for sections that were consolidated (e.g., `network_devices/index.html`, `users/index.html`, `roles/index.html`, `credentials/index.html`, `health/index.html`)

**Files to keep**:
- `go/prob/newui/web/js/tree.js` -- ProblerTree is unique (device inventory tree view)
- `go/prob/newui/web/js/parallax.js` -- Probler-specific visual effect
- `go/prob/newui/web/js/gpus-mock-data.js` -- Test data for GPUs
- `go/prob/newui/web/js/gpu-modal.js`, `hosts-modal-*.js` -- Domain-specific detail modals (refactored to use Layer8DPopup)
- `go/prob/newui/web/css/base-core.css` -- NOC theme (may merge with l8ui theme or keep as override)
- `go/prob/newui/web/topo/` -- Topology visualization (unique)
- `go/prob/newui/web/dashboard/` -- Dashboard (unique visualization, stays as iframe)
- Landing page files (`index.html`, `js/landing.js`, `css/landing-*.css`)
- Login/register already migrated to l8ui in Phase 0

---

## 4. Risk Assessment

| Risk | Impact | Mitigation |
|---|---|---|
| Login redirect paths change | Users/bookmarks hit 404 | Update all `href='login/index.html'` references to `l8ui/login/index.html`; add redirect or symlink at old path |
| Demo credentials hint lost | New users don't know demo login | Add demo hint to login.json config or to landing page |
| iframe sections depend on postMessage for popups | Breaking modals in network/k8s/security | Migrate sections out of iframes (Phase 5) before removing ProblerPopup (Phase 3) |
| login.json format mismatch | Config loading fails | Audit login.json format in Phase 0, update to match l8ui expectations |
| ProblerTable API differences | Tables break | Both APIs are very similar; test each migration individually |
| NOC dark theme conflicts with l8ui light theme | Visual inconsistency | Keep `base-core.css` as theme override, ensure l8ui CSS variables are compatible |
| Device detail modals use ProblerTree (not in l8ui) | Tree views break in modals | Keep ProblerTree, but open tree inside Layer8DPopup instead of ProblerPopup |

---

## 5. Dependency Order

```
Phase 0 (Login/Register) -- independent, can be done first
    |
Phase 1 (Foundation)
    |
Phase 2 (Tables) ----+
    |                 |
Phase 3 (Popups) ----+--- These can be done in parallel
    |                 |
Phase 4 (Config) ----+
    |
Phase 5 (iframe consolidation) -- depends on Phases 2-4
    |
Phase 6 (Module configs) -- depends on Phase 5
    |
Phase 7 (Section HTML) -- depends on Phase 6
    |
Phase 8 (Mobile parity) -- depends on Phases 6-7
    |
Phase 9 (Cleanup) -- depends on all above
```

---

## 6. Estimated Scope

| Phase | New Files | Modified Files | Deleted Files |
|---|---|---|---|
| Phase 0: Login/Register | 0 | ~3 (login.json, app.js, iframe HTMLs) | 6 (login/config.js, login/login.js, login/login.css, login/index.html, register/register.js, register/register.css, register/index.html) |
| Phase 1: Foundation | 0 | 2 (app.html, login.json) | 0 |
| Phase 2: Tables | 0 | ~13 JS files (29 instances) | 4 (view_table/*, edit_table/*) |
| Phase 3: Popups | 0 | ~4 modal JS files | 4 (popup/*) |
| Phase 4: Config | 0 | ~8 config.js files | 0 (delete in Phase 9) |
| Phase 5: iframe consolidation | 0 | ~6 section HTML + JS files | ~5 iframe index.html files |
| Phase 6: Module configs | ~12 | 1 (app.html) | 0 |
| Phase 7: Section HTML | 0 | ~10 section HTML files | 0 |
| Phase 8: Mobile parity | ~12 | 0 | 0 |
| Phase 9: Cleanup | 0 | 1 (app.html) | ~15 dead files |

---

## 7. Verification Checklist Per Phase

After each phase, verify:
- [ ] App loads without JS console errors
- [ ] All tables display data correctly
- [ ] Pagination, sorting, filtering work
- [ ] Detail modals open and close correctly
- [ ] Authentication flow works (login -> app -> logout)
- [ ] API calls resolve to correct endpoints
- [ ] No file exceeds 500 lines
- [ ] No duplicate code between custom and l8ui components
- [ ] Mobile version (if applicable) has same functionality as desktop
- [ ] All tables have an `onRowClick` handler that opens a read-only detail view
