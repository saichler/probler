# Plan: Phase 9 — Cleanup Dead Code

## Context

Phases 0–8 of the L8UI migration are complete. The old pre-l8ui components (custom table, popup, per-section iframes) are no longer referenced by `app.html` or any active section HTML. This phase removes all dead code files.

## Scope

### Files to Delete (31 files total)

#### 1. Old Custom Component Directories (8 files)

Replaced by l8ui equivalents in `l8ui/edit_table/`, `l8ui/popup/`.

| File | Lines | Replaced By |
|------|-------|-------------|
| `view_table/table.js` | ~700 | l8ui/edit_table/layer8d-table*.js |
| `view_table/table.css` | ~350 | l8ui/edit_table/layer8d-table.css |
| `edit_table/table.js` | ~740 | l8ui/edit_table/layer8d-table*.js |
| `edit_table/table.css` | ~380 | l8ui/edit_table/layer8d-table.css |
| `popup/popup.js` | ~360 | l8ui/popup/layer8d-popup.js |
| `popup/popup.css` | ~150 | l8ui/popup/layer8d-popup.css |
| `popup/popup-forms.css` | ~380 | l8ui/popup/layer8d-popup-forms.css |
| `popup/popup-content.css` | ~250 | l8ui/popup/layer8d-popup-content.css |

**Evidence**: None of these appear in `app.html` `<script>` or `<link>` tags.

#### 2. Old Iframe Section Directories (20 files)

These directories contained standalone iframe pages. The iframes were replaced by direct l8ui integration in Phases 5a–5d.

**`network_devices/` (5 files)** — replaced by `js/network-devices-init.js` + `js/network-device-modal.js`
- `network_devices/index.html`
- `network_devices/config.js`
- `network_devices/network-devices.js`
- `network_devices/network-devices.css`
- `network_devices/device-modal.js`

**`health/` (4 files)** — replaced by l8ui SYS health module (`l8ui/sys/health/l8health.js`)
- `health/index.html`
- `health/config.js`
- `health/health.js`
- `health/health.css`

**`users/` (4 files)** — replaced by l8ui SYS security module (`l8ui/sys/security/l8security-users-crud.js`)
- `users/index.html`
- `users/config.js`
- `users/users.js`
- `users/users.css`

**`roles/` (4 files)** — replaced by l8ui SYS security module (`l8ui/sys/security/l8security-roles-crud.js`)
- `roles/index.html`
- `roles/config.js`
- `roles/roles.js`
- `roles/roles.css`

**`credentials/` (3 files)** — replaced by l8ui SYS security module (`l8ui/sys/security/l8security-credentials-crud.js`)
- `credentials/index.html`
- `credentials/config.js`
- `credentials/credentials.js`

Note: `credentials/credentials.css` is not listed because it doesn't exist (credentials section used shared styles).

**`kubernetes/` (2 files)** — replaced by direct integration in `sections/kubernetes.html`
- `kubernetes/config.js`
- `kubernetes/index.html`

**Evidence**: `sections/sys.html` has no iframes. `sections/network.html` has no iframe. `sections/kubernetes.html` has inline content. These directories are unreachable.

#### 3. Dead JS Files (3 files)

| File | Lines | Replaced By | Evidence |
|------|-------|-------------|----------|
| `js/device-modal.js` | ~240 | `js/network-device-modal.js` | Not in app.html |
| `js/system-health.js` | ~650 | `l8ui/sys/health/l8health.js` | Not in app.html |
| `js/network-devices.js` | ~300 | `js/network-devices-init.js` | Not in app.html |

Note: `js/system-users-roles.js` is listed in git status as modified (not deleted) — verify before deleting. It is NOT in app.html.

#### 4. Dead CSS Files (2 files)

| File | Evidence |
|------|----------|
| `css/base-login.css` | Not in app.html; `login.html` is a redirect to l8ui login |
| `css/sections-kubernetes.css` | Not in app.html; `kubernetes/kubernetes.css` is used instead |

### Files to KEEP

| File/Directory | Reason |
|----------------|--------|
| `dashboard/` | Active iframe in `sections/dashboard.html` |
| `targets/` | Active iframe in `sections/inventory.html` |
| `topo/` | Active iframe in `sections/topologies.html` |
| `confirm/` | `confirm.js` and `confirm.css` are in app.html |
| `css/landing-*.css` | Used by `index.html` (landing page) |
| `js/landing.js` | Used by `index.html` (landing page) |
| All `l8ui/` files | Active l8ui framework |
| All `probler/` files | Active module configs |
| All `kubernetes/*.js` (except config.js) | Active in app.html |
| `js/tree.js`, `js/parallax.js` | Active Probler-specific components |
| `js/sections.js`, `js/app.js` | Core app logic |
| `js/gpus-*.js`, `js/gpu-modal.js` | Active GPU section |
| `js/hosts*.js` | Active Hosts section |
| `js/network-devices-init.js`, `js/network-device-modal.js` | Active Network section |

## Execution Order

1. Delete old component directories: `view_table/`, `edit_table/`, `popup/`
2. Delete old iframe directories: `network_devices/`, `health/`, `users/`, `roles/`, `credentials/`
3. Delete dead kubernetes iframe files: `kubernetes/config.js`, `kubernetes/index.html`
4. Delete dead JS files: `js/device-modal.js`, `js/system-health.js`, `js/network-devices.js`, `js/system-users-roles.js`
5. Delete dead CSS files: `css/base-login.css`, `css/sections-kubernetes.css`

## Verification

After deletion:
1. App loads without console errors
2. All sections render correctly (Dashboard, Network, GPUs, Hosts, Kubernetes, Security, System, Inventory, Topologies)
3. Detail popups work on all sections
4. No 404 errors in browser network tab
5. Landing page (index.html) loads correctly with all styles
