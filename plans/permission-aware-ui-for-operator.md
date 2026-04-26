# Permission-Aware UI for Operator Role

## Problem

The l8secure config at `../l8secure/go/secure/plugin/probler/probler.json` defines an `operator` role with three deny rules:

| Rule ID | Element Type | Denied Actions |
|---------|--------------|----------------|
| `oper-view-only-users` | `L8User` | 1 (POST), 2 (PUT), 3 (DELETE), 4 (PATCH) |
| `oper-view-only-rules` | `L8Role` | 1 (POST), 2 (PUT), 3 (DELETE), 4 (PATCH) |
| `oper-view-only-creds` | `L8Credentials` | 1 (POST), 2 (PUT), 3 (DELETE), 4 (PATCH) |

Server-side enforcement is correct: `operator`-role users cannot mutate these entities. However, the UI still renders Add / Edit / Delete buttons on the Security tabs (Users, Roles, Credentials), leaving the buttons clickable and the failures surfaced only after the server rejects them.

`../l8erp` fixed the same issue. This plan ports the fix to probler.

## Root Cause (Why the UI Doesn't Already Gate the Buttons)

Probler's `l8ui/` library already has the full gating pipeline in place:

1. **`l8ui/shared/layer8d-service-registry.js`** (lines ~89-98, `initializeServiceTable`) reads `window.Layer8DPermissions` and decides `canCreate` / `canUpdate` / `canDelete`. When an action is denied, the registry passes `null` for the corresponding callback (`onAdd`, `onEdit`, `onDelete`).
2. **`l8ui/edit_table/layer8d-table-render.js`** (lines ~73, ~123, ~218-219) renders the Add / Edit / Delete buttons only when the callback is non-null (`this.onAdd ? '<button...>' : ''`).
3. **`l8ui/shared/layer8d-permission-filter.js`** (221 lines, already present) handles nav-cascade hiding (module tabs, sub-nav items) based on `canView`.
4. **`l8ui/sys/l8sys-init.js`** uses `Layer8DModuleFactory.create({ namespace: 'L8Sys', ... })` — so the Security tables (L8User, L8Role, L8Credentials) flow through the gated `Layer8DServiceRegistry`. The local `_openAddModal` / `_openEditModal` / `_confirmDeleteItem` overrides only replace the callback *body*; they are only invoked when the registry passes a non-null callback in the first place.

The machinery exists. The gap is the **bootstrap wiring**:

- Desktop `go/prob/newui/web/js/app.js` (DOMContentLoaded) never calls `fetch('/permissions')`.
- Mobile `go/prob/newui/web/m/js/app-core.js` (`MobileApp.init`) never calls it either.
- Neither `app.html` nor `m/app.html` loads `l8ui/shared/layer8d-permission-filter.js`.
- No `Layer8DPermissionFilter.registerResolver(...)` call exists for probler's section/module layout.

Because `window.Layer8DPermissions` is never populated, `layer8d-service-registry.js` treats the session as "no permissions declared → permissive mode" and every button renders.

## Reference Implementation in l8erp (for pattern fidelity)

- `l8erp/go/erp/ui/web/js/app.js` lines 163-171 — desktop `/permissions` fetch
- `l8erp/go/erp/ui/web/m/js/app-core.js` lines 86-94 — mobile `/permissions` fetch
- `l8erp/go/erp/ui/web/js/app.js` lines 181-207 — `Layer8DPermissionFilter.registerResolver` + `applyToSidebar` wiring

Both desktop and mobile wrap the fetch in `try / catch` and log a warning on failure so a transient `/permissions` outage does not lock the user out.

## Scope Boundaries

- **In scope**: bootstrap wiring so `window.Layer8DPermissions` is populated before sections render; verify the Security tab gates Add/Edit/Delete for operator; mobile parity.
- **Out of scope**: custom probler sections (`network`, `gpus`, `hosts`, `kubernetes`). The `operator` role's deny rules only cover `L8User`, `L8Role`, `L8Credentials`; the other entities are unaffected by this config. If future roles restrict network / GPU / host / K8s entities, those custom sections will need to consult `Layer8DPermissions` — tracked as a deferred item below, not implemented here.
- **Out of scope**: iframe sections (`dashboard`, `targets`, `topo`). Same reasoning — no current deny rule touches them.

## Gap Analysis

| # | Area | Gap | Source of truth |
|---|------|-----|-----------------|
| G0 | Prerequisites | `/permissions` endpoint reachability + scope assumptions unverified | Phase 0 checks below |
| G1 | Shared helper | No probler-local `/permissions` loader; desktop and mobile would otherwise duplicate the same 9-line fetch block | Second-Instance Rule — desktop + mobile are two call sites |
| G2 | Desktop bootstrap | `app.js` does not fetch `/permissions` after auth | Compare probler `js/app.js` DOMContentLoaded vs l8erp `js/app.js` 163-171 |
| G3 | Desktop script load | `app.html` does not include `layer8d-permission-filter.js` or the new helper | File exists at `l8ui/shared/layer8d-permission-filter.js` but no `<script>` tag |
| G4 | Desktop resolver | No `Layer8DPermissionFilter.registerResolver()` call for probler namespaces | Needed if we want cascading nav hide for L8UI-based sections |
| G5 | Mobile bootstrap | `m/js/app-core.js` does not fetch `/permissions` | Compare against l8erp `m/js/app-core.js` 86-94 |
| G6 | Mobile script load | `m/app.html` does not include `layer8d-permission-filter.js` or the new helper | — |
| G7 | Verification | No end-to-end check that operator sees SYS Security with read-only tables | Manual test |

## Traceability Matrix

| Gap | Phase | Notes |
|-----|-------|-------|
| G0 | Phase 0 | Verify `/permissions` is reachable via curl; confirm no probler-owned `AllowedActions`; confirm `bearerToken` scoping in desktop `app.js`; confirm portal framework is not in use |
| G1 | Phase 1 | Create `go/prob/newui/web/probler/probler-permissions.js` exposing `ProblerPermissions.load()` — single source of the fetch logic used by desktop + mobile |
| G2 | Phase 2 | Call `await ProblerPermissions.load();` in `js/app.js` before `loadSection('dashboard')` |
| G3 | Phase 2 | Add `<script src="probler/probler-permissions.js">` and `<script src="l8ui/shared/layer8d-permission-filter.js">` in `app.html` |
| G4 | Phase 2 | Register resolver mapping `system` section → SYS module → services (users, roles, credentials). Apply to sidebar and section. |
| G5 | Phase 3 | Call `await ProblerPermissions.load();` in `m/js/app-core.js` `MobileApp.init` after `Layer8MConfig.load()` |
| G6 | Phase 3 | Add `<script src="../probler/probler-permissions.js">` and `<script src="../l8ui/shared/layer8d-permission-filter.js">` in `m/app.html` |
| G7 | Phase 4 | Log in as `operator`, navigate to System → Security → Users / Roles / Credentials, verify buttons hidden; log in as `admin`, verify buttons present |

## Phase 0 — Prerequisite Verification

Before any code change, confirm the assumptions underlying Phases 1–2. Each check below has been run once during plan authoring; re-run at implementation time to catch drift.

### 0.1 Confirm `/permissions` is reachable

Probler's backend does not serve `/permissions` directly (`grep -rn '"/permissions"' go/` in probler returns nothing in Go sources). The endpoint is expected to be served by the l8secure auth gateway that fronts probler — same pattern as l8erp. Before implementing:

```bash
# With probler demo running and a valid bearer token:
curl -sk -H "Authorization: Bearer <token>" https://localhost:2443/permissions | head -c 200
```

Expected: a JSON object shaped like `{ "L8User": [5], "L8Role": [5], ... }` for an operator account, or `{...all actions per type...}` for admin. If it returns 404 or HTML, stop — the gateway isn't wired to serve `/permissions` for probler, and Phases 1–2 will silently degrade to permissive mode.

### 0.2 Confirm no probler-owned `AllowedActions` handler

`grep -rn 'AllowedActions\|Nodes(' go/prob/` in probler returns no Go matches (only JS tree-traversal hits named `expandAllNodes` / `_renderNodes`). Probler does not implement `AllowedActions` itself, so the `Nodes(false, true)` constraint from `introspector-nodes-params` is a framework concern, not a probler one. No action needed — just verify nothing was added since.

### 0.3 Confirm `bearerToken` is not in outer scope in desktop `app.js`

`go/prob/newui/web/js/app.js` holds `bearerToken` only inside helper functions (`getAuthHeaders` at line 6, `makeAuthenticatedRequest` at line 62). It is NOT a top-level `const` in the DOMContentLoaded handler. Consequence: the desktop fetch block in Phase 1 must read `sessionStorage.getItem('bearerToken')` inline, mirroring the mobile pattern — do **not** assume a `bearerToken` variable exists.

### 0.4 Note: `Layer8DPortal.init()` is not used by probler

The l8ui portal framework (`l8ui/portal/layer8d-portal.js` line 311) already contains a `/permissions` fetch, but probler uses a custom bootstrap in `js/app.js` and never invokes `Layer8DPortal.init()`. This is why the fetch has never fired. Phases 1–2 replicate that fetch in probler's own bootstrap, they do not switch probler over to the portal framework.

### Go/No-go

- If 0.1 fails → stop, escalate to the l8secure gateway owner.
- If 0.1 passes → proceed to Phase 1.

## Phase 1 — Shared Helper (`ProblerPermissions.load`)

Desktop and mobile both need the same `/permissions` fetch. To avoid a two-site copy-paste (Second Instance Rule, `plan-duplication-audit`), extract the fetch into a single probler-local module that both bootstraps call.

**New file**: `go/prob/newui/web/probler/probler-permissions.js`

```js
(function() {
    'use strict';

    // Probler-local loader for per-type action permissions.
    // Populates window.Layer8DPermissions so Layer8DServiceRegistry and
    // layer8d-table-render gate Add/Edit/Delete buttons automatically.
    // On any failure we warn and leave Layer8DPermissions unset — downstream
    // code treats that as permissive mode, matching l8erp's degraded-state behavior.
    window.ProblerPermissions = {
        load: async function() {
            try {
                var token = sessionStorage.getItem('bearerToken');
                if (!token) { console.warn('ProblerPermissions.load: no bearerToken'); return; }
                var resp = await fetch('/permissions', {
                    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
                });
                if (resp.ok) {
                    window.Layer8DPermissions = await resp.json();
                }
            } catch (e) {
                console.warn('ProblerPermissions.load failed:', e);
            }
        }
    };
})();
```

**Why a probler-local helper, not a shared l8ui component**: the l8ui portal framework (`l8ui/portal/layer8d-portal.js`) already contains a `/permissions` fetch, but probler uses its own bootstrap and does not invoke `Layer8DPortal.init()` (Phase 0.4). Upstreaming to l8ui is a separate, larger refactor that would also touch l8erp's two call sites and l8ui's portal code. Keeping the helper probler-local scopes the change to this plan; extraction to l8ui can follow as a separate effort.

**Non-changes**: No edits to `l8ui/` in this phase. The helper lives alongside existing `probler/`-namespaced modules (`probler-config.js`, `probler-init.js`).

## Phase 2 — Desktop Bootstrap

**Files**

1. `go/prob/newui/web/app.html`
   - Add `<script src="probler/probler-permissions.js"></script>` **before** `js/app.js` so `ProblerPermissions.load` is defined when `DOMContentLoaded` fires.
   - Add `<script src="l8ui/shared/layer8d-permission-filter.js"></script>` immediately after `layer8d-module-filter.js` (line ~273) so it loads before `l8sys-init.js` which calls `Layer8DModuleFactory.create`.
2. `go/prob/newui/web/js/app.js`
   - Inside the `DOMContentLoaded` handler, after `await Layer8DConfig.load();` (line ~148) and before `loadSection('dashboard');` (line ~155), insert:
     ```js
     // Load per-type action permissions for the current user.
     // Helper reads the bearer token inline — see Phase 0.3.
     await ProblerPermissions.load();

     // Register resolver and apply nav filtering when the filter is available
     if (typeof Layer8DPermissionFilter !== 'undefined') {
         // Map probler section keys to the L8UI namespaces whose services back them.
         // Only L8UI-driven sections (those built with Layer8DModuleFactory) need mapping.
         var nsMap = { 'system': 'L8Sys', 'alarms': 'Alm' };
         Layer8DPermissionFilter.registerResolver(function(sectionKey, moduleKey, serviceKey) {
             var ns = window[nsMap[sectionKey]];
             if (!ns || !ns.modules || !ns.modules[moduleKey]) return null;
             var svc = ns.modules[moduleKey].services.find(function(s) { return s.key === serviceKey; });
             return svc ? svc.model : null;
         });

         var sidebarModels = {};
         Object.keys(nsMap).forEach(function(section) {
             var ns = window[nsMap[section]];
             if (!ns || !ns.modules) return;
             var models = [];
             Object.values(ns.modules).forEach(function(mod) {
                 if (mod.services) mod.services.forEach(function(svc) { if (svc.model) models.push(svc.model); });
             });
             sidebarModels[section] = models;
         });
         Layer8DPermissionFilter.applyToSidebar(sidebarModels);
     }
     ```
   - Do **not** wrap the helper call in a hard failure branch — the helper already swallows fetch errors. A transient `/permissions` outage should leave the app in permissive mode, same as l8erp.

**Why this placement**: `Layer8DConfig.load()` resolves `apiPrefix` but `/permissions` is served at the root (not under `apiPrefix`), so we can fetch it as soon as the bearer token is available. Fetching before `loadSection('dashboard')` ensures the first section render already sees populated permissions — prevents a flash of clickable buttons.

**Non-changes**: `Layer8DServiceRegistry` and `layer8d-table-render.js` already have the gating logic. Do not modify them.

## Phase 3 — Mobile Bootstrap

**Files**

1. `go/prob/newui/web/m/app.html`
   - Add `<script src="../probler/probler-permissions.js"></script>` **before** `m/js/app-core.js` so the helper is loaded when `MobileApp.init` runs.
   - Add `<script src="../l8ui/shared/layer8d-permission-filter.js"></script>` before the first script that uses it (before `probler-nav-config-system.js` is safe).
2. `go/prob/newui/web/m/js/app-core.js`
   - Inside `MobileApp.init`, after `await Layer8MConfig.load();` (line ~15) and before `this.initSidebar();`, insert:
     ```js
     // Load per-type action permissions for the current user (same helper as desktop)
     await ProblerPermissions.load();
     ```
   - Resolver registration is optional on mobile for now — mobile uses `Layer8MNav`, a different nav system than `applyToSidebar`. Table-level gating still works because `Layer8DServiceRegistry` consults `window.Layer8DPermissions` regardless.

**Non-changes**: `Layer8MEditTable` constructs Add/Edit/Delete buttons the same way — `options.onAdd ? ... : null` — so it picks up the gating automatically.

## Phase 4 — End-to-End Verification

Start the probler demo (`cd go && ./run-demo.sh`) with the l8secure probler config loaded (admin / operator / viewer accounts provisioned). For each account below, exercise the golden path on both desktop and mobile.

### Desktop

- [ ] Log in as **admin** → System → Security → Users: verify the "Add User" button is visible, each row shows Edit + Delete.
- [ ] Log in as **operator** → System → Security → Users: verify the "Add User" button is hidden, rows have no Edit or Delete buttons, the rest of the row renders normally (view-only).
- [ ] As operator → System → Security → Roles: Add / Edit / Delete hidden.
- [ ] As operator → System → Security → Credentials: Add / Edit / Delete hidden.
- [ ] As operator → System → Health / Modules / Logs: tabs still visible (they are not L8User/L8Role/L8Credentials-backed and must not regress).
- [ ] As operator → Network Devices / GPUs / Hosts / Kubernetes: behavior unchanged from pre-patch (out of scope — these sections do not consume `Layer8DPermissions` yet).
- [ ] DevTools → Network: `/permissions` returns a JSON body and a 200; on a failure, console shows the warning and the rest of the app still works in permissive mode.

### Mobile (`/m/app.html`)

- [ ] Log in as **admin** → System → Security → Users: Add / Edit / Delete visible.
- [ ] Log in as **operator** → System → Security → Users: Add / Edit / Delete hidden; cards still clickable for read-only detail.
- [ ] As operator → Security → Roles, Credentials: same as above.

### Regression checks

- [ ] `viewer` account (if configured): same read-only behavior as `operator` on Security tables.
- [ ] No uncaught errors in the console on any login; no console spam from `Layer8DPermissionFilter` on a permissive (empty) `Layer8DPermissions` map.

## Deferred (not in this plan)

- **Custom section permission awareness**: `network-devices-init.js`, `gpus-init.js`, `hosts.js`, and the `kubernetes/` init files instantiate `Layer8DTable` directly with hard-coded `onAdd` / `onEdit` / `onDelete`. If future roles restrict these entities (e.g., `NetworkDevice`, `K8sCluster`), each init file needs a guard that mirrors the `Layer8DServiceRegistry` check. Track separately.
- **Iframe sections** (`dashboard`, `targets`, `topo`): if a future role restricts their backing entities, the iframes need their own `/permissions` fetch or a postMessage bridge from the parent. Not required by the current operator config.
- **Mobile nav cascade hide**: `Layer8MNav` consumes `LAYER8M_NAV_CONFIG` directly; wiring `Layer8DPermissionFilter.canViewService` into it would hide denied services at the nav level. Not needed for the current issue (operator can still *view* L8User/L8Role/L8Credentials — actions 5 are allowed), but worth adding when the next role denies GET.

## Rollback Plan

Each phase's change is additive:

- Revert the `<script>` tag additions in `app.html` / `m/app.html` (helper + permission-filter).
- Revert the `await ProblerPermissions.load();` + resolver block in `js/app.js` and `m/js/app-core.js`.
- Delete `go/prob/newui/web/probler/probler-permissions.js`.

After rollback, `window.Layer8DPermissions` is undefined and the UI returns to permissive mode — no data loss, no schema change. The server continues to reject denied actions; only the UX regresses to pre-fix state.
