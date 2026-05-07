# Plan: Make All Relevant Probler UI Components Live

## Background

The WebSocket real-time notification infrastructure is now working end-to-end:
- Backend services multicast `L8NotificationSet` to the `"websock"` service on CRUD operations
- `WsNotifyService` receives notifications and forwards them to `WebSocketManager`
- `WebSocketManager` delivers JSON messages (`{action, modelType, primaryKey}`) to connected WebSocket clients
- Frontend `Layer8DWebSocket` dispatches messages to subscribers by `modelType`
- `Layer8DTable` with `realtime: true` subscribes and triggers `fetchData` on change

This plan identifies every UI component that should be "live" and the changes needed.

### Rule Compliance Notes
- **l8ui-no-project-specific-code**: The `l8ui/` directory must remain project-agnostic. Phase 1 adds `realtime: true` to the Health table in l8health.js — this is a generic table option, not probler-specific. Phase 3d (Health detail live refresh) is placed in a probler-specific wrapper file, NOT in l8health.js.
- **demo-directory-sync**: Source of truth is `go/prob/newui/web/`. Phase 5 copies to demo for testing only.
- **never-edit-vendor**: All changes are in the project's own l8ui copy or probler-specific JS files, not in vendor.
- **maintainability / Second Instance Rule**: Phase 3 requires the same subscribe/match/re-fetch/unsubscribe lifecycle in 4 modals. Phase 0 extracts this into a shared `LivePopup` utility. Each modal provides only config (modelType, getId, refetch). No behavioral code is duplicated across modal files.

---

## Current State Audit

### Tables Already Live (realtime: true)
These tables already subscribe to WebSocket notifications and auto-refresh:

| Table | File | modelName | Status |
|-------|------|-----------|--------|
| Network Devices | `js/network-devices-init.js` | `NetworkDevice` | DONE |
| GPUs | `js/gpus-init.js` | `GpuDevice` | DONE |
| Targets | `targets/targets.js` | `L8PTarget` | DONE |
| K8s Tables (all) | `kubernetes/kubernetes-tables.js` | `K8S*`, `Istio*` | DONE |
| K8s Explorer | `k8s-explorer/js/k8s-explorer-resource-view.js` | dynamic | DONE |

### Tables NOT Yet Live
| Table | File | modelName | Backend Notifications? |
|-------|------|-----------|----------------------|
| Health | `l8ui/sys/health/l8health.js` | `L8Health` | YES (BaseService, stateful+voter) |
| Hypervisors | `js/hosts.js` | n/a | NO (client-side empty data) |
| VMs | `js/hosts.js` | n/a | NO (client-side empty data) |
| Dashboard Alarms | `dashboard/dashboard-init.js` | n/a | NO (placeholder, empty data) |

### Non-Table Components NOT Yet Live
| Component | File | What It Shows | Backend Notifications? |
|-----------|------|---------------|----------------------|
| Dashboard Network Card | `dashboard/dashboard-init.js` | Device count (online/offline) | YES (NetworkDevice) |
| Dashboard K8s Card | `dashboard/dashboard-init.js` | Cluster/node/pod counts | YES (K8SCluster) |
| Dashboard GPU Card | `dashboard/dashboard-init.js` | GPU count (online/offline) | YES (GpuDevice) |
| Network Hero Stats | `js/network-devices-init.js` | Device count subtitle | Already refreshed on table reload |
| GPU Hero Stats | `js/gpus-init.js` | GPU count subtitle | Already refreshed on table reload |

### Detail Popups — Open When Data Changes
| Popup | File | Model |
|-------|------|-------|
| Network Device Detail | `js/network-device-modal.js` | NetworkDevice |
| GPU Detail | `js/gpu-modal.js` | GpuDevice |
| K8s Resource Detail | `kubernetes/kubernetes-detail.js` | K8S* |
| K8s Explorer Detail | `k8s-explorer/js/k8s-explorer-detail.js` | K8S* |
| Health Detail | `l8ui/sys/health/l8health.js` (render) | L8Health |

---

## What's NOT Applicable

- **Hypervisors/VMs tables**: Client-side with empty data, no backend service endpoint — cannot be made live. Skip.
- **Dashboard Alarms table**: Placeholder with empty data, no backend endpoint yet — cannot be made live. Skip.
- **Topology iframe**: Visualization, not a data table — skip.
- **Inventory iframe**: Targets table already live — skip.

---

## Phase 0: Extract LivePopup Utility

**File:** `go/prob/newui/web/js/live-popup.js` (NEW probler-specific file)

Phase 3 requires the same behavioral pattern in 4 different modal files: subscribe to a modelType on popup open, match by primaryKey, re-fetch and re-render on match, unsubscribe on popup close. Per the Second Instance Rule (`maintainability.md`), this must be extracted into a shared utility before the second consumer is built.

Create `LivePopup` — a small utility that handles the WebSocket subscription lifecycle for any detail popup:

```javascript
window.LivePopup = {
    /**
     * Subscribe to live updates for an open popup.
     * @param {Object} config
     * @param {string} config.modelType   - WebSocket modelType to listen for
     * @param {string} config.primaryKey  - The specific record's key to match
     * @param {function} config.onUpdate  - Called when a matching notification arrives
     * @returns {function} unsubscribe - Call on popup close
     */
    subscribe: function(config) {
        if (typeof Layer8DWebSocket === 'undefined') {
            return function() {};
        }
        var debounceTimer = null;
        var unsubscribe = Layer8DWebSocket.subscribe(config.modelType, function(msg) {
            if (msg.primaryKey === config.primaryKey) {
                if (debounceTimer) return;
                debounceTimer = setTimeout(function() {
                    debounceTimer = null;
                    config.onUpdate(msg);
                }, 500);
            }
        });
        return function() {
            if (debounceTimer) clearTimeout(debounceTimer);
            unsubscribe();
        };
    }
};
```

Each modal then uses it as config-only (~3 lines):
```javascript
var unsub = LivePopup.subscribe({
    modelType: 'NetworkDevice',
    primaryKey: device.id,
    onUpdate: function() { /* re-fetch and re-render */ }
});
// On popup close: unsub();
```

**Behavioral code**: subscription lifecycle, debounce, primaryKey matching — lives in `live-popup.js` once.
**Configuration**: modelType, primaryKey, onUpdate callback — provided by each modal.

Add `<script src="js/live-popup.js"></script>` to `app.html` after `layer8d-websocket.js` and before the modal files.

**Scope:** ~30 lines.

---

## Phase 1: Health Table — Add realtime: true

**File:** `go/prob/newui/web/l8ui/sys/health/l8health.js`

Add `realtime: true` to the Health table constructor. This is a generic Layer8DTable option (already used by all probler tables), not probler-specific logic, so adding it to the shared l8ui file is compliant with `l8ui-no-project-specific-code`.

The Health service is a BaseService with stateful+voter, so it already multicasts `L8NotificationSet` on changes.

Change:
```javascript
healthTable = new Layer8DTable({
    containerId: 'health-table-container',
    endpoint: getHealthEndpoint(),
    modelName: 'L8Health',
    columns: columns,
    pageSize: 15,
    sortable: true,
    filterable: true,
    serverSide: true,
+   realtime: true,
    transformData: transformHealthData,
    ...
});
```

**Scope:** ~1 line change.

---

## Phase 2: Dashboard Cards — Live Stats via WebSocket

**File:** `go/prob/newui/web/dashboard/dashboard-init.js` (probler-specific file)

Subscribe to WebSocket notifications for the three dashboard stat cards. When any `NetworkDevice`, `GpuDevice`, or `K8SCluster` change arrives, re-fetch the corresponding card's stats.

Add a debounce utility to avoid flooding when bulk updates arrive (e.g., collector pushes 50 devices at once):

```javascript
var _dashboardRefreshTimers = {};
function debouncedCardRefresh(modelType, refreshFn) {
    if (_dashboardRefreshTimers[modelType]) return;
    _dashboardRefreshTimers[modelType] = setTimeout(function() {
        _dashboardRefreshTimers[modelType] = null;
        refreshFn();
    }, 1000);
}
```

Add subscriptions at the end of `initializeDashboard()`:
```javascript
if (typeof Layer8DWebSocket !== 'undefined') {
    Layer8DWebSocket.subscribe('NetworkDevice', function() {
        debouncedCardRefresh('NetworkDevice', updateNetworkDevicesCard);
    });
    Layer8DWebSocket.subscribe('GpuDevice', function() {
        debouncedCardRefresh('GpuDevice', updateGpuCard);
    });
    Layer8DWebSocket.subscribe('K8SCluster', function() {
        debouncedCardRefresh('K8SCluster', updateK8sCard);
    });
}
```

**Scope:** ~20 lines added.

---

## Phase 3: Detail Popup Live Refresh

When a detail popup is open showing a specific record, and a WebSocket notification arrives for that record's model, the popup content should refresh automatically.

All files in this phase are probler-specific JS files — no l8ui shared library files are modified. Each modal uses the `LivePopup` utility from Phase 0, so the only code added per modal is config (~3-5 lines for the subscribe call, plus the re-fetch/re-render callback).

### 3a: Network Device Detail
**File:** `go/prob/newui/web/js/network-device-modal.js` (probler-specific)

On popup open, call `LivePopup.subscribe` with modelType `'NetworkDevice'`, the device's ID, and an `onUpdate` callback that re-fetches the device and re-renders the popup tabs. Store the unsubscribe function and call it on popup close.

```javascript
var unsub = LivePopup.subscribe({
    modelType: 'NetworkDevice',
    primaryKey: device.id,
    onUpdate: function() { refreshDevicePopup(device.id); }
});
// pass unsub to popup close handler
```

### 3b: GPU Detail
**File:** `go/prob/newui/web/js/gpu-modal.js` (probler-specific)

Same config pattern, modelType `'GpuDevice'`.

### 3c: K8s Resource Detail
**File:** `go/prob/newui/web/kubernetes/kubernetes-detail.js` (probler-specific)

Same config pattern, modelType is the specific K8s resource type being viewed (dynamic).

### 3e: K8s Explorer Detail
**File:** `go/prob/newui/web/k8s-explorer/js/k8s-explorer-detail.js` (probler-specific)

Same config pattern, modelType is the specific K8s resource type being viewed (dynamic). Separate from 3c because the K8s Explorer has its own detail rendering logic.

### 3d: Health Detail
**File:** `go/prob/newui/web/js/health-detail-live.js` (NEW probler-specific file)

The Health detail popup is rendered by `l8ui/sys/health/l8health.js`, which is a shared l8ui library file. Per `l8ui-no-project-specific-code`, we must NOT add WebSocket subscription logic directly to that file.

Instead, create a small probler-specific wrapper that hooks into the Health detail popup lifecycle. It monkey-patches or wraps the `showHealthDetailsModal` function exposed by l8health.js to inject a `LivePopup.subscribe` call on open, and unsubscribe on close.

This file must be loaded after `l8health.js` in `app.html`.

**Scope:** ~5 lines added per existing modal file (3a, 3b, 3c). ~20 lines for the new health-detail-live.js wrapper (3d).

---

## Phase 4: Update app.html

Add `<script src="js/live-popup.js"></script>` after `layer8d-websocket.js` and before modal files. Add `<script src="js/health-detail-live.js"></script>` after `l8health.js`.

---

## Phase 5: Copy to Demo

After all source changes, copy modified files to `go/demo/web/` so the running demo picks them up. Source of truth remains `go/prob/newui/web/` per `demo-directory-sync` rule.

---

## Phase 6: End-to-End Verification

For each component:
1. Open the section in the browser
2. Trigger a backend data change (collector push, manual edit, K8s change)
3. Verify the component updates without manual page refresh

Verification checklist:
- [ ] Health table auto-refreshes when health data changes
- [ ] Dashboard Network card updates when devices change
- [ ] Dashboard K8s card updates when cluster data changes
- [ ] Dashboard GPU card updates when GPU data changes
- [ ] Network Device detail popup refreshes when the viewed device changes
- [ ] GPU detail popup refreshes when the viewed GPU changes
- [ ] K8s detail popup refreshes when the viewed resource changes
- [ ] Health detail popup refreshes when the viewed service changes
- [ ] Bulk updates (50+ devices at once) don't flood the dashboard with requests

---

## Traceability Matrix

| # | Component | Gap | Phase |
|---|-----------|-----|-------|
| 0 | LivePopup utility | Shared subscribe/match/debounce/unsubscribe pattern needed by 5 modals | Phase 0 (NEW probler-specific utility) |
| 1 | Health table | Missing `realtime: true` | Phase 1 (generic option in l8ui — compliant) |
| 2 | Dashboard Network card | No WebSocket subscription | Phase 2 (probler-specific file) |
| 3 | Dashboard K8s card | No WebSocket subscription | Phase 2 (probler-specific file) |
| 4 | Dashboard GPU card | No WebSocket subscription | Phase 2 (probler-specific file) |
| 5 | Network Device detail popup | No live refresh | Phase 3a (config-only, uses LivePopup) |
| 6 | GPU detail popup | No live refresh | Phase 3b (config-only, uses LivePopup) |
| 7 | K8s detail popup | No live refresh | Phase 3c (config-only, uses LivePopup) |
| 8 | Health detail popup | No live refresh | Phase 3d (NEW probler-specific wrapper, uses LivePopup — avoids editing l8ui) |
| 9 | K8s Explorer detail popup | No live refresh | Phase 3e (config-only, uses LivePopup) |
| 10 | app.html | Missing script tags for new files | Phase 4 |
| 11 | Hypervisors/VMs tables | No backend endpoint | Deferred — no backend service |
| 12 | Dashboard Alarms table | Placeholder, no data | Deferred — not implemented yet |
