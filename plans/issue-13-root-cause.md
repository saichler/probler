# Issue 13: Network Device Detail Popup Does Not Open (Mobile v2)

## Root Cause

**`idField: 'Id'` (capital I) does not match the actual data field `id` (lowercase).**

### The Silent Failure Chain

1. Nav config: `idField: 'Id'`
2. `layer8m-nav-data.js` line 43: `getItemId: (item) => item['Id']` → **returns `undefined`**
   - The transform in `network-columns.js` produces `{ id: device.id, ... }` (lowercase)
   - `item['Id']` does not exist → `undefined`
3. `layer8m-edit-table.js` line 178: `const itemId = this.config.getItemId(item)` → `undefined`
4. `layer8m-utils.js` line 153-154: `escapeAttr(undefined)` → `''` (empty string, because `undefined == null`)
5. Card rendered with `data-id=""` (empty)
6. Click handler line 342: `const id = card.dataset.id` → `""` (empty string)
7. `_findItemById("")` line 396: `String(this.config.getItemId(item)) === String(id)` → `String(undefined) === String("")` → `"undefined" !== ""` → **no match** → returns `undefined`
8. Line 344: `if (item) this.config.onRowClick(item, id)` → `item` is `undefined` → **callback never fires**
9. **No error, no popup, complete silence**

### Why Previous Fixes Failed

All three previous fix attempts focused on the `showNetworkDeviceDetail` function (data transforms, `device.raw`, chart constructors, popup wrappers). But the function was **never being called** — the failure happens BEFORE the function, in the table's click-to-callback pipeline.

The function was correct; the call site never reached it.

### Why This Was Not a Regression from Issue 7

This bug existed since the nav config was first created with `idField: 'Id'`. It was not caused by the Issue 7 fix. However, the user may not have tested row clicks on network devices before Issue 7, so it appeared to be a regression.

## Fix

### Phase 1: Fix the idField casing

**File**: `go/prob/newui/web/m/v2/nav-configs/probler-nav-config-monitoring.js`

Change all `idField: 'Id'` to `idField: 'id'` for all monitoring services that use the `id` protobuf field (NetworkDevice, GpuDevice, Hypervisor, VirtualMachine, K8sPod, K8sNode, K8sDeployment, K8sStatefulSet, K8sDaemonSet, K8sService, K8sNamespace, K8sNetworkPolicy).

### Phase 2: Revert unnecessary changes from previous fix attempts

**File**: `go/prob/newui/web/m/v2/js/details/network-device-detail.js`

The `device.raw || device` fallback added in the previous fix is now correct defensive code — the transform DOES set `raw: device`, but having the fallback is harmless and protects against future misuse. Keep it.

### Phase 3: Verify all other detail popups

Check that GPU, Host, and K8s detail functions are also not affected by similar issues.

### Phase 4: End-to-end verification

1. Navigate to Network Devices on mobile v2
2. Click a device row → detail popup should open
3. Verify Overview, Equipment, Interfaces tabs show data
4. Verify Performance tab charts render on tab click (if device has perf data)
5. Repeat for GPU, Host, K8s sections

## Traceability Matrix

| # | Gap | Phase |
|---|-----|-------|
| 1 | `idField: 'Id'` should be `'id'` for all monitoring services | Phase 1 |
| 2 | Previous fix changes (device.raw fallback) — keep as defensive code | Phase 2 (no action) |
| 3 | Other detail popups may have same idField issue | Phase 3 |
| 4 | End-to-end click-through verification | Phase 4 |

## Prevention

This class of bug (case-sensitive field name mismatch) is already covered by the `js-protobuf-field-names.md` rule. The specific trap: protobuf Go structs use `Id` (exported Go field name), but JSON serialization uses `id` (from the `json:"id,omitempty"` tag). Always verify against the JSON tag, not the Go field name.
