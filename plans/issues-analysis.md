# Mobile v2 Issues — Root Cause Analysis

## Issue 1: Pressing Dashboard service card has blank page — RESOLVED

**File**: `go/prob/newui/web/m/v2/js/app-core.js` lines 74-84

**Root Cause**: The `loadSection()` method at line 76 checks:
```javascript
if (section !== 'dashboard' && window.LAYER8M_NAV_CONFIG && LAYER8M_NAV_CONFIG[section]) {
    await this._loadDashboardForModule(section, forceReload);
    return;
}
```
The `dashboard` key is explicitly excluded (`section !== 'dashboard'`), so it falls through to the `SECTIONS` lookup at line 81. `SECTIONS` only has `'dashboard'` and `'system'` mapped to HTML files. The dashboard loads correctly from the **sidebar**.

However, the "Dashboard" **service card** on the home view is generated from `LAYER8M_NAV_CONFIG_BASE.modules[0]` which has `key: 'dashboard'`. When a user taps this card, `Layer8MNav` tries to navigate to the `dashboard` module within the nav config. But `PROBLER_NAV_CONFIG_MONITORING.dashboard` is defined as `{ section: 'dashboard' }` — a special redirect, not a real module with subModules/services. The nav system tries to render sub-module cards for `dashboard` and finds nothing — blank page.

**Why I missed this**: I treated the dashboard as a sidebar-only section and didn't test/trace the path of clicking the Dashboard card from the Layer8MNav home view. I analyzed sidebar navigation routing but not the card-based navigation flow which goes through a different code path in Layer8MNav.

---

## Issue 2: The side menu items are not aligned with the service cards — RESOLVED

**Files**:
- `go/prob/newui/web/m/v2/app.html` lines 79-124 (hardcoded sidebar: 5 items)
- `go/prob/newui/web/m/v2/nav-configs/probler-nav-config-base.js` (13 module cards)

**Root Cause**: Two independent navigation systems driven by different data sources:
1. **Sidebar**: Hardcoded HTML with 5 items — Dashboard, Monitoring, Infrastructure, Alarms & Events, System
2. **Home cards**: Dynamic from `LAYER8M_NAV_CONFIG_BASE.modules` with 13 items — dashboard, inventory, network, gpus, hosts, kubernetes, infrastructure, topologies, alarms, automation, applications, analytics, system

The sidebar groups monitoring resources under one "Monitoring" entry, but the cards show them individually (network, gpus, hosts, kubernetes). Cards also show items with no sidebar equivalent (inventory, topologies, automation, applications, analytics).

**Why I missed this**: I analyzed each system in isolation — I read the sidebar HTML and the nav config separately but never placed them side by side to check if their entries match. My analysis focused on "does feature X exist on both desktop and mobile" rather than "does the mobile navigation internally agree with itself."

---

## Issue 3: Detail Popup on any target always shows the same info — RESOLVED

**Two compounding bugs: (1) view factory dropped `getItemId`, and (2) CRUD/detail files made unnecessary L8Queries.**

**Files affected**:
- `go/prob/newui/web/l8ui/m/js/layer8m-view-factory.js` — missing `getItemId` passthrough (ROOT CAUSE)
- `go/prob/newui/web/m/v2/modules/targets/targets-detail.js` — unnecessary L8Query (compounding bug)
- `go/prob/newui/web/m/v2/modules/targets/targets-crud.js` — unnecessary L8Query (compounding bug)
- `go/prob/newui/web/m/v2/modules/system/security-users-crud.js` — unnecessary L8Query (compounding bug)
- `go/prob/newui/web/m/v2/modules/system/security-credentials-crud.js` — unnecessary L8Query (compounding bug)

**Additional Root Cause Found**: The nav system (`layer8m-nav-data.js` line 39) correctly builds `getItemId: (item) => item[primaryKey] || item.id` using `idField` from the service config. It passes this in `viewOptions`. But `layer8m-view-factory.js` (the 'table' view type factory) **never forwards `getItemId`** to `Layer8MEditTable`. The table falls back to `_defaultGetItemId`, which tries the reference config (empty — no references registered for probler), then falls back to `item.id || item.Id || ''`. For models with `targetId`, `userId`, `roleId` as primary keys, this returns `''` for EVERY item. Every card renders with `data-id=""`, and `_findItemById('')` always returns the first item. **This is why every row click shows the same data — even after removing the L8Query, `_findItemById` was always returning the first item.**

**Root Cause — Desktop never makes L8Queries for detail/edit on edit tables:**

The desktop and mobile table frameworks BOTH pass the full item object to their handlers. The critical difference is what happens AFTER the handler receives the item:

**Desktop pattern (correct — no server query):**
1. `Layer8DTable` `onRowClick` passes the full item: `this.onRowClick(this.data[rowIndex], id)` (layer8d-table-events.js line 134)
2. Desktop `targets.js` handler: `onRowClick: function(target) { showTargetDetailsModal(target); }` — passes item directly
3. Desktop `targets-detail.js`: `function showTargetDetailsModal(target)` renders the popup using the passed `target` object — **NO server query at all**
4. For edit: `onEdit` passes `id` → `editTarget(targetId)` → uses `targets[targetId]` from a local cache populated by `onDataLoaded` callback — **still NO server query**
5. Desktop detail popup uses `showFooter: false` — read-only, no edit button

**Mobile pattern (broken — unnecessary server query):**
1. `Layer8MEditTable` `onRowClick` ALSO passes the full item: `this.config.onRowClick(item, id)` where `item = this._findItemById(id)` from `this.config.data` (layer8m-edit-table.js lines 333-345)
2. Mobile `targets-detail.js` handler receives the item BUT IGNORES IT — instead constructs an L8Query:
   ```javascript
   var query = encodeURIComponent(JSON.stringify({ text: 'select * from L8PTarget where targetId=' + item.targetId }));
   ```
3. This query has broken syntax (unquoted value), so it either fails or returns the wrong result
4. The fallback `if (!target) target = item;` uses the table's summary data, which is limited
5. Same broken pattern replicated across ALL CRUD/detail files

**Why the desktop works and mobile doesn't:**

The desktop NEVER re-fetches data for detail or edit popups on edit tables. The data is already loaded in the table — `Layer8DTable` stores it in `this.data[]` and passes the full item object to handlers. The desktop `targets.js` additionally caches items in a local `targets` map via `onDataLoaded`, so even `onEdit` (which only receives `id`) can look up the full item without a server call.

The mobile `Layer8MEditTable` follows the EXACT same pattern — it also passes the full item to both `onRowClick(item, id)` and `onEdit(id, item)`. The item is available. But the mobile CRUD/detail code was written to make a server re-fetch via L8Query, introducing a query that (a) the desktop never makes, (b) has broken syntax with unquoted values, and (c) is completely unnecessary since the data is already available in the passed `item` parameter.

**The conversion mistake**: When converting desktop to mobile, I didn't trace how desktop detail/edit popups GET their data. I assumed they must query the server for the full object. In reality, desktop edit tables pass the already-loaded item directly and never make a server call for detail/edit. I introduced unnecessary L8Query calls and replicated this mistake across every CRUD/detail file.

**Why I missed this**: Three compounding errors:
1. I assumed detail popups need to fetch fresh data from the server — they don't, the table already has it
2. I never traced the desktop `onRowClick → showTargetDetailsModal(target)` flow to see that `target` IS the full object from the table, not a stub
3. I replicated the broken pattern across ALL edit table files (targets, users, roles, credentials) without testing any of them against a running server

---

## Issue 4: Detail Popup on a target shows a functional edit button — RESOLVED

**File**: `go/prob/newui/web/m/v2/modules/targets/targets-detail.js` lines 80-94

**Root Cause**: The detail popup explicitly adds an Edit button:
```javascript
Layer8MPopup.show({
    showFooter: true,
    saveButtonText: 'Edit',
    onSave: function() {
        Layer8MPopup.close();
        MobileTargetsCRUD.openEdit(service, target.targetId);
    }
});
```
This is a **read-only** detail view, yet it has `showFooter: true` with a functional "Edit" button that transitions to edit mode. The desktop `targets-detail.js` renders a pure read-only popup without footer buttons. Edit is accessed only through the table's action buttons.

**Why I missed this**: I intentionally designed the detail popup to include an Edit shortcut, thinking it would be a UX improvement for mobile. I didn't compare against the desktop behavior which keeps detail views strictly read-only. This violates the desktop parity principle — features should match, not be "improved" unilaterally.

---

## Issue 5: Pressing Edit on a target invokes query without the id — RESOLVED

**File**: `go/prob/newui/web/m/v2/modules/targets/targets-crud.js` line 164

**Root Cause — Same systemic issue as Issue 3**: The mobile `openEdit` function makes an unnecessary L8Query server call:
```javascript
var query = encodeURIComponent(JSON.stringify({ text: 'select * from L8PTarget where targetId=' + targetId }));
```

The desktop NEVER does this. Desktop `editTarget(targetId)` uses `targets[targetId]` from a local cache populated by `onDataLoaded` — no server query. Furthermore, the mobile `Layer8MEditTable.onEdit` passes BOTH `(id, item)` to the handler (line 315-321 of `layer8m-edit-table.js`), so the full item is already available. The nav config handler `onEdit: function(id, item) { MobileTargetsCRUD.openEdit({...}, id); }` receives the item but only passes the id, then `openEdit` tries to re-fetch from the server with a broken query.

The query fails because: (a) the value is unquoted, and (b) if `L8PTarget` isn't registered in the mobile reference config, `getItemId` falls back to `item.id || item.Id` which is empty for a model that uses `targetId` as primary key, producing `where targetId=undefined`.

**Why I missed this**: Same as Issue 3 — I didn't trace the desktop edit flow to see it uses local cached data, not a server query. I introduced an unnecessary and broken L8Query.

---

## Issue 6: Inventory is missing the drop down selection of a target type — RESOLVED

**Files**:
- Desktop: `go/prob/newui/web/targets/targets.js` lines 155-201 — has `initInventoryTypeFilter()` with dropdown and `setBaseWhereClause()`
- Mobile: `go/prob/newui/web/m/v2/nav-configs/probler-nav-config-monitoring.js` lines 82-96 — no filter config

**Root Cause**: The desktop targets table initializes with `baseWhereClause: 'inventoryType=${selectedInventoryType}'` and provides a dropdown to switch between Network Device, GPUs, Hosts, VMs, K8s Cluster, Storage, Power. The mobile nav config for the inventory service has no equivalent — no `baseWhereClause`, no filter dropdown, no inventory type selector. The mobile table loads all targets unfiltered.

**Fix**: Three changes:
1. `layer8m-nav-data.js`: Added `filterDropdown` support to `loadServiceData` — renders a `<select>` above the table and calls `setBaseWhereClause` on change
2. `layer8m-view-factory.js`: Forward `baseWhereClause` from view options to `Layer8MEditTable` constructor
3. `probler-nav-config-monitoring.js`: Added `baseWhereClause: 'inventoryType=1'` and `filterDropdown` config with all 7 inventory types to the targets service

**Why I missed this**: The mobile parity plan (Phase 7) focused on implementing the 3-level nested CRUD (Target → Hosts → Protocols). I read the desktop `targets.js` file but focused on the modal/form code, not the table initialization and filtering code at lines 155-217. The inventory type filter is part of the table chrome, not the CRUD flow, so it fell outside the scope of what I was looking at.

---

## Issue 7: Inventory Detail popup Performance tab has mock data / blank charts — RESOLVED

**File**: `go/prob/newui/web/m/v2/js/details/network-device-detail.js` lines 304-325, 476-479

**Root Cause — Two compounding bugs:**

1. **Charts rendered into hidden tab container**: The `onShow` callback fired `initPerformanceCharts()` immediately, but the Performance tab was hidden (`display:none`, no `.active` class). Charts rendered into zero-dimension containers produce blank output. The desktop uses `initializePerformanceCharts()` with **lazy sub-tab rendering** — charts only render when their sub-tab is first clicked, tracked by a `rendered` map.

2. **Wrong `Layer8DChart` constructor signature**: The mobile used `new Layer8DChart(containerId, chartData, {...})` — three arguments. The actual constructor takes a **single options object**: `new Layer8DChart({ containerId, viewConfig: {...} })`. With three arguments, `options` receives the string containerId, `options.containerId` is undefined, and the chart silently fails. Additionally, `init()` and `setData()` were never called.

**Fix — Three changes:**

1. **`layer8m-popup.js`**: Added `onTabChange` callback to tab click handler — fires when user switches tabs, passing the tab ID.

2. **`network-device-detail.js` lines 476-501**: Replaced `D.showTabbedPopup()` with direct `Layer8MPopup.show()` using `onTabChange` to defer chart rendering until the Performance tab is activated (matching desktop lazy pattern).

3. **`network-device-detail.js` `renderTimeSeriesChart()`**: Fixed constructor to `new Layer8DChart({ containerId, viewConfig: {...} })` and added `chart.init()` + `chart.setData()` calls (matching desktop pattern).

**Why I missed this**: I verified the Performance tab code *exists* and uses `Layer8DChart`, but didn't trace the actual rendering lifecycle or verify the constructor signature against the `Layer8DChart` API. I also didn't compare the desktop's lazy sub-tab rendering approach vs the mobile's eager rendering in `onShow`.

---

## Issue 8: System/Health Detail popup — Memory & CPU button error — RESOLVED

**File**: `go/prob/newui/web/m/v2/js/details/health-detail.js` line 27

**Root Cause**: Line 27 uses `Layer8DConfig` (desktop) instead of `Layer8MConfig` (mobile):
```javascript
var endpoint = Layer8DConfig.resolveEndpoint('/0/Health');
```
On mobile, `Layer8DConfig` may not be loaded or may not have been initialized with the correct prefix. The mobile framework uses `Layer8MConfig`. This causes the endpoint to resolve incorrectly or throw an error when the Memory & CPU button is pressed.

**Why I missed this**: A simple copy-paste error from the desktop code. The `fetchPprofData()` function at line 26-75 was adapted from the desktop health detail, and the `Layer8DConfig` reference was not updated to `Layer8MConfig`. I read the file during my analysis but did not notice this single-character-difference (`D` vs `M`) in the config object name.

---

## Issue 9: Detail Popup on any users/roles/credentials always shows the same info — RESOLVED

**Files**:
- `go/prob/newui/web/m/v2/modules/system/security-users-crud.js` line 180
- `go/prob/newui/web/m/v2/modules/system/security-credentials-crud.js` line 169

**Root Cause — Same systemic issue as Issue 3**: The mobile detail functions make unnecessary L8Query server calls instead of using the item already passed by `Layer8MEditTable`.

The desktop SYS module (l8ui `security-*.js` files) uses the same pattern as desktop targets — `onRowClick` receives the full item from the table's loaded data and passes it directly to the detail popup. No server re-fetch.

The mobile `onRowClick` handler in the nav config receives `(item, id)` from `Layer8MEditTable._findItemById(id)` — the full item IS available. But `showDetails` ignores it and makes an L8Query:
```javascript
var query = encodeURIComponent(JSON.stringify({ text: 'select * from L8User where userId=' + userId }));
```
This query has the same broken unquoted syntax. When it fails or returns the wrong result, the fallback `if (!user) user = item;` uses the table's summary data, showing the same limited info for every row.

**Why I missed this**: Same as Issue 3 — I didn't trace the desktop SYS security detail flow to see it uses already-loaded data. I introduced unnecessary server queries across all security CRUD files.

---

## Issue 10: System/Security edit button gives an error — RESOLVED

**Files**:
- `go/prob/newui/web/m/v2/modules/system/security-users-crud.js` line 154
- `go/prob/newui/web/m/v2/nav-configs/probler-nav-config-system.js` lines 29, 35, 41

**Root Cause — Same systemic issue as Issues 3 and 5**: The mobile `openEdit` functions make unnecessary L8Query server calls:
```javascript
var query = encodeURIComponent(JSON.stringify({ text: 'select * from L8User where userId=' + userId }));
```

The desktop SYS security edit uses the item already available from the table data — no server query. The mobile `Layer8MEditTable.onEdit` passes `(id, item)` to the handler, so the full item IS available. But the nav config handler `onEdit: function(id, item)` only forwards the `id` to `openEdit`, which then tries to re-fetch from the server with a broken query.

Additional issue: if `L8User` isn't registered in the mobile reference config, `getItemId` falls back to `item.id || item.Id` which may not match the actual primary key field (`userId`), causing `id` to be empty and producing `where userId=` with no value.

**Why I missed this**: Same systemic conversion mistake — introducing server re-fetches where the desktop uses already-loaded data.

---

## Issue 11: System/Security detail popup contains an edit button — RESOLVED

**Files**:
- `go/prob/newui/web/m/v2/modules/system/security-users-crud.js` lines 186-201
- `go/prob/newui/web/m/v2/modules/system/security-credentials-crud.js` lines 177-192

**Root Cause**: Same pattern as Issue 4. All `showDetails` functions include `showFooter: true` with `saveButtonText: 'Edit'`:
```javascript
Layer8MPopup.show({
    title: 'User Details',
    showFooter: true,
    saveButtonText: 'Edit',
    onSave: function() {
        Layer8MPopup.close();
        openEdit(service, userId);
    }
});
```
Detail popups should be read-only without an edit button. Edit functionality is accessible through the table's action buttons.

**Why I missed this**: Same as Issue 4. I deliberately added Edit buttons to detail views as a "convenience" feature, not recognizing that this deviates from the desktop pattern where detail views are strictly read-only.

---

## Issue 12: Editing a target and pressing Save does nothing on mobile — RESOLVED

**Files**:
- `go/prob/newui/web/l8ui/m/js/layer8m-auth.js` — missing `patch()` method
- `go/prob/newui/web/m/v2/modules/targets/targets-crud.js` line 205 — calls `Layer8MAuth.patch()`

**Root Cause**: `Layer8MAuth` provides `get`, `post`, `put`, `delete` — but **no `patch` method**. The desktop `targets.js` (line 559) uses `fetch()` with `method: 'PATCH'` for target edits. The mobile `targets-crud.js` correctly calls `Layer8MAuth.patch(endpoint, targetObj)` on line 205, but since `Layer8MAuth.patch` is `undefined`, calling it throws `TypeError: Layer8MAuth.patch is not a function`. The `try/catch` block at line 213 catches the error and shows "Error saving target: Layer8MAuth.patch is not a function", but this may not be visible if the error message is truncated or the user doesn't notice the toast.

**Desktop save flow** (works):
```javascript
const method = currentEditMode === 'add' ? 'POST' : 'PATCH';
const response = await fetch(getTargetsEndpoint(), {
    method: method,
    headers: getAuthHeaders(),
    body: JSON.stringify(targetObj)
});
```
Desktop uses raw `fetch()` directly with `PATCH` — no abstraction layer.

**Mobile save flow** (broken):
```javascript
if (currentIsEdit) {
    await Layer8MAuth.patch(endpoint, targetObj);  // ← patch() doesn't exist
} else {
    await Layer8MAuth.post(endpoint, targetObj);
}
```
Mobile uses the `Layer8MAuth` abstraction, which wraps HTTP methods with auth headers and error handling. But `patch()` was never implemented — `Layer8MAuth` only had `get`, `post`, `put`, `delete`.

**Note**: The shared l8ui CRUD (`layer8m-nav-crud.js` line 135) uses `Layer8MAuth.put()` for edits, not `patch`. This is because ERP modules use PUT for updates. The probler backend expects PATCH for target updates — a different HTTP verb convention. This mismatch is why the missing `patch()` method was never noticed in l8ui development: ERP never needed it.

**Fix**: Add a `patch()` method to `Layer8MAuth` following the same pattern as `put()`.

**Why I missed this**: Three compounding failures:
1. **Didn't verify API method existence**: I wrote `Layer8MAuth.patch()` without checking if `patch` exists on the `Layer8MAuth` object. The `platform-conversion-data-flow` rule says to trace every link in the pipeline — I traced the data but not the transport method.
2. **Assumed parity with desktop HTTP methods**: The desktop uses raw `fetch()` which supports any HTTP method. `Layer8MAuth` is a convenience wrapper that only supports specific methods. I assumed it would cover all standard HTTP verbs, but it was built for ERP which only uses GET/POST/PUT/DELETE — never PATCH.
3. **No runtime testing**: The TypeError only manifests when the Save button is pressed in edit mode. The form renders correctly, the data loads correctly — the failure is deferred to the moment of save. Without running the code, this is invisible.

---

## Issue 13: Network Device detail popup does nothing — RESOLVED

**Files**:
- `go/prob/newui/web/m/v2/nav-configs/probler-nav-config-monitoring.js` — `idField: 'Id'` (wrong case)

**Root Cause — `idField` casing mismatch**: All 12 monitoring services in the nav config had `idField: 'Id'` (capital I), but the protobuf JSON tag is `id` (lowercase). This caused a completely silent failure chain:

1. `getItemId: (item) => item['Id']` → returns `undefined` (field is lowercase `id`)
2. `escapeAttr(undefined)` → returns `""` (empty string)
3. Card rendered with `data-id=""`
4. Click handler: `_findItemById("")` → `String(undefined) !== ""` → no match → returns `undefined`
5. `if (item) this.config.onRowClick(item, id)` → `item` is `undefined` → callback never fires
6. No error, no popup, no console output

**Why this took 5 attempts to find**: All previous fixes focused on `showNetworkDeviceDetail()` — but that function was **never being called**. The failure happened upstream in the table's click-to-callback pipeline. Static analysis showed correct code at every level; only runtime `console.log` in the table click handler revealed `getItemId` returning `undefined`.

**Fix**: Changed all `idField: 'Id'` to `idField: 'id'` across all 12 monitoring services.

**Prevention rule updated**: `js-protobuf-field-names.md` now includes a dedicated section on nav config `idField` — must use JSON tag name (lowercase), not Go field name (capitalized).

---

## Summary of Root Causes

| Category | Issues | Root Cause |
|----------|--------|------------|
| **Unnecessary L8Query server calls** | 3, 5, 9, 10 | Desktop edit tables pass the already-loaded item to detail/edit handlers — NO server query. Mobile code ignores the passed item and makes unnecessary L8Query calls with broken unquoted syntax. Same mistake replicated across ALL CRUD/detail files. |
| **Edit button in read-only detail** | 4, 11 | Detail popups include `showFooter: true, saveButtonText: 'Edit'` — deviating from desktop's read-only pattern. |
| **Navigation mismatch** | 1, 2 | Sidebar (5 items) and home cards (13 items) use independent data sources. Dashboard card navigates to a non-module config. |
| **Missing desktop feature** | 6 | Inventory type filter dropdown not implemented. Desktop `targets.js` filtering code not ported. **RESOLVED** — added `filterDropdown` support to nav system + configured inventory service. |
| **Wrong config object** | 8 | `Layer8DConfig` used instead of `Layer8MConfig` in health detail pprof function. |
| **Chart rendering in hidden tabs** | 7 | Performance charts rendered into hidden tab containers that have zero dimensions. Wrong `Layer8DChart` constructor signature. **RESOLVED** — added `onTabChange` to popup, deferred chart init to tab activation, fixed constructor + init/setData calls. |
| **Missing HTTP method in auth wrapper** | 12 | `Layer8MAuth` has no `patch()` method. Desktop uses raw `fetch()` with PATCH; mobile uses `Layer8MAuth.patch()` which is undefined. ERP uses PUT for edits so the gap was never exposed in l8ui. |
| **Bypassed existing abstraction** | 13 | Replaced working `D.showTabbedPopup()` wrapper with direct `Layer8MPopup.show()` call while fixing Issue 7. The wrapper handled details the direct call missed, causing a regression. |

## Why My Gap Analysis Failed

My inspection approach had four fundamental flaws:

1. **Failed to trace data flow**: The most critical failure. I never traced HOW desktop detail/edit popups get their data. Both `Layer8DTable` and `Layer8MEditTable` pass the full item object to their handlers — the data is already loaded. Desktop uses the item directly (detail) or from a local cache (edit). I assumed mobile needed server re-fetches and introduced L8Query calls that the desktop never makes. This single assumption produced Issues 3, 5, 9, and 10.

2. **Feature-existence analysis, not behavioral analysis**: I checked "does the file exist and does it have the right functions" rather than "does the code actually work when executed." I verified code structure, not runtime behavior. Every file I read "looked correct" at the structural level while containing bugs that only manifest at runtime.

3. **No cross-system consistency check**: I verified desktop vs mobile parity per-section but never checked whether the mobile UI's own systems are internally consistent (sidebar vs cards, detail popup behavior patterns). The navigation mismatch (Issues 1, 2) is entirely a mobile-internal inconsistency.

4. **Pattern replication without validation**: I wrote the unnecessary L8Query pattern once, never tested it, and replicated it across ALL CRUD/detail files (targets, users, roles, credentials). One untested flawed pattern became 6+ bugs. The same happened with the Edit-button-in-detail pattern.

The correct approach would have been: for each section, trace the full user interaction path (click sidebar → load section → click row → detail popup → edit button → save) through the actual code, **following the data from the table framework through the handler to the popup**, verifying that the data arrives correctly at each step. My analysis stopped at "the function exists and is wired up" without tracing how the item data actually flows from the table to the detail/edit popup.
