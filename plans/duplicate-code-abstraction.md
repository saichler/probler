# Plan: Duplicate Code Abstraction

## Summary

After scanning the entire `go/prob/newui/web/` codebase, approximately **2,000–2,500 lines** of duplicate code were identified across desktop and mobile files. This plan organizes the deduplication into 6 prioritized phases.

---

## Phase 1 — Shared Utility Functions (~14 duplicate sites → 0)

**Problem**: Identical utility functions copied into nearly every section file.

### 1a. `escapeHtml()` — 14 copies

| File | Line |
|------|------|
| `l8ui/shared/layer8d-utils.js` | 26 | ← **canonical** |
| `m/app/js/app-components.js` | 446 (as `escapeHtmlGlobal`) |
| `l8ui/notification/layer8d-notification.js` | 96 |
| `l8ui/login/layer8d-login-ui.js` | 79 |
| `l8ui/sys/health/l8health.js` | 142 |
| `targets/targets.js` | 701 |
| `confirm/confirm.js` | 57 |
| `m/app/sections/gpus.html` | 79 |
| `m/app/sections/hosts.html` | 123 |
| `m/app/sections/security.html` | 1074 |
| `m/app/sections/kubernetes.html` | 2237 |
| `m/app/sections/system.html` | 246 |
| `m/app/sections/inventory.html` | 489 |
| `m/app/sections/network.html` | 257 |

**Action**: Remove local definitions, use `Layer8DUtils.escapeHtml()` (desktop) or the global `escapeHtmlGlobal()` (mobile inline scripts where Layer8DUtils is unavailable). For mobile, expose a single shared `escapeHtml` on `window` from `app-components.js` and remove all per-section copies. For l8ui internal files (`layer8d-notification.js`, `layer8d-login-ui.js`, `l8health.js`) that load before `layer8d-utils.js`, keep their local copies but add a `// NOTE: local copy — loaded before layer8d-utils.js` comment.

**Estimated savings**: ~70 lines removed across mobile sections; ~30 lines across desktop/l8ui.

### 1b. `capitalize()` — 3 copies

| File | Line |
|------|------|
| `m/app/sections/gpus.html` | 87 |
| `m/app/sections/hosts.html` | 129 |
| `m/app/sections/network.html` | 265 |

**Action**: Add `capitalize()` to `m/app/js/app-components.js` as a global function. Remove from all 3 section files.

**Estimated savings**: ~10 lines.

### 1c. `formatBytes()` — 5 copies

| File | Line |
|------|------|
| `m/app/js/app-components.js` | 422 |
| `m/app/sections/kubernetes.html` | 1481 |
| `m/app/sections/system.html` | 88 |
| `l8ui/sys/health/l8health.js` | 103 |
| `kubernetes/kubernetes-modal-node-generate.js` | 204 |

**Action**: Add `formatBytes()` to `Layer8DUtils` in `layer8d-utils.js`. Desktop files use `Layer8DUtils.formatBytes()`. Mobile: use from `app-components.js` (already global there) and remove from inline sections.

**Estimated savings**: ~40 lines.

### 1d. `formatUptime()` — 3 copies (2 different signatures)

| File | Line | Signature |
|------|------|-----------|
| `js/network-devices-init.js` | 9 | `formatUptime(centiseconds)` |
| `m/app/sections/network.html` | 106 | `formatUptime(centiseconds)` |
| `m/app/sections/system.html` | 97 | `formatUptime(startTime)` — different! |
| `l8ui/sys/health/l8health.js` | 118 | `formatUptime(startTime)` — different! |

**Action**: Two variants exist (centiseconds vs Unix start time). Add both to `Layer8DUtils` as `formatUptimeCentiseconds()` and `formatUptimeFromStart()`. Update callers.

**Estimated savings**: ~25 lines.

---

## Phase 2 — Mobile Detail Popup CSS (~5 files → 1 shared stylesheet)

**Problem**: `.detail-section`, `.detail-row`, `.detail-label`, `.detail-value` CSS rules are copy-pasted inline in 5+ mobile section HTML files.

### Affected files

| File | Lines |
|------|-------|
| `m/app/sections/gpus.html` | 297–316 (~20 lines) |
| `m/app/sections/hosts.html` | 447–466 (~20 lines) |
| `m/app/sections/inventory.html` | 751–792 (~40 lines) |
| `m/app/sections/system.html` | 646+ (~20 lines) |
| `m/app/sections/network.html` | similar (~20 lines) |

**Action**: Create `m/app/css/mobile-detail-popup.css` with the shared rules. Add `<link>` to `m/app.html`. Remove inline `<style>` blocks for `.detail-*` from each section HTML.

**Estimated savings**: ~80 lines of duplicated CSS removed.

---

## Phase 3 — Desktop Modal Tab Switching & Close Handlers

**Problem**: `kubernetes-modal-core.js` has two identical tab-switching functions (`setupK8sModalTabs` and `setupNodeModalTabs` — 100% identical logic, 22 lines each). Additionally, GPU modal (`gpu-modal.js:294`) and VM modal (`hosts-modal-vm.js:217`) have inline versions of the same pattern.

### 3a. Consolidate K8s modal core (75 lines → ~30 lines)

`kubernetes-modal-core.js` currently has:
- `setupK8sModalTabs()` — 22 lines
- `setupNodeModalTabs()` — 22 lines (identical to above)
- `closeK8sDetailModal()` — 6 lines
- `closeNodeDetailModal()` — 6 lines (identical pattern)
- Click-outside handlers — 12 lines

**Action**: Replace both tab functions with a single `setupModalTabs(content)`. Replace both close functions with `closeModal(modalId)`. Update all callers (7 modal files reference these).

**Estimated savings**: ~25 lines.

### 3b. Share tab switching across GPU and Hosts modals

`gpu-modal.js:294` and `hosts-modal-vm.js:217` duplicate the same tab-switching pattern inline.

**Action**: Have these files call `setupModalTabs(content)` from the consolidated core instead of inline tab switching.

**Estimated savings**: ~30 lines.

---

## Phase 4 — K8s Modal Show Functions (7 files, ~1,270 lines)

**Problem**: All 7 K8s modal files follow the same pattern:
1. Get modal element, set active class
2. Set body overflow hidden
3. Build HTML content string with tabs
4. Set innerHTML
5. Call `setupK8sModalTabs(content)`
6. Close button handler

The structural code (steps 1–2, 5–6) is ~15 lines per file × 8 functions = ~120 lines of boilerplate.

### Affected files

| File | Function | Lines |
|------|----------|-------|
| `kubernetes-modal-pods.js` | `showPodDetailModal` | 267 |
| `kubernetes-modal-node.js` | `showNodeDetailModal` | 253 |
| `kubernetes-modal-deployments.js` | `showDeploymentDetailModal` | 199 |
| `kubernetes-modal-services.js` | `showServiceDetailModal` | 178 |
| `kubernetes-modal-daemonsets.js` | `showDaemonSetDetailModal` | 187 |
| `kubernetes-modal-statefulsets.js` | `showStatefulSetDetailModal` | 186 |
| `kubernetes-modal-namespaces.js` | `showNamespace/NetworkPolicyDetailModal` | 198 |

**Action**: Create a `showK8sModal(modalId, contentHtml)` helper in `kubernetes-modal-core.js` that handles the boilerplate (get modal, set active, overflow, innerHTML, setupModalTabs, close handler). Each modal file only needs to build its specific `contentHtml` string.

**Estimated savings**: ~100 lines of boilerplate across 8 functions.

---

## Phase 5 — Shared Mock Data Generators (desktop ↔ mobile)

**Problem**: GPU and Hosts mock data generators are duplicated between desktop JS and mobile inline HTML.

### Affected pairs

| Desktop | Mobile | Approx lines |
|---------|--------|-------------|
| `js/gpus-mock-data.js:4` | `m/app/sections/gpus.html:15` | ~60 lines each |
| `js/hosts.js:5` (hypervisors) | `m/app/sections/hosts.html:24` | ~60 lines each |
| `js/hosts.js:70` (VMs) | `m/app/sections/hosts.html:75` | ~50 lines each |

**Action**: Move mock data generators to shared files under `js/mock/` (e.g., `js/mock/gpu-mock-data.js`, `js/mock/hosts-mock-data.js`). Include in both `app.html` and `m/app.html` via `<script>` tags. Remove inline copies from mobile sections and the definitions from `gpus-mock-data.js` and `hosts.js`.

**Estimated savings**: ~170 lines (one copy of each generator removed).

---

## Phase 6 — Mobile `getStatusClass()` + `getBarLevel()` Variants

**Problem**: Status-to-CSS-class mapping functions are duplicated with slight variations.

| File | Function | Statuses handled |
|------|----------|-----------------|
| `m/app/sections/gpus.html:93` | `getStatusClass(status)` | operational, warning, critical, offline |
| `m/app/sections/network.html:246` | `getStatusClass(status)` | active, degraded, maintenance, down |
| `m/app/sections/gpus.html:103` | `getBarLevel(value)` | thresholds: <60, <80, ≥80 |
| `kubernetes/kubernetes-tables.js:28` | `getPodStatusClass(statusText)` | Running, Pending, Succeeded, Failed, Unknown |
| `m/app/sections/kubernetes.html:396` | `getPodStatusClass(statusText)` | same |

**Action**: These are similar but NOT identical — each section has different statuses and thresholds. Consolidate into a generic `getStatusClass(status, statusMap)` utility in `app-components.js` (mobile) that takes a map parameter. Each section passes its own map. For desktop K8s, keep `getPodStatusClass` in `kubernetes-tables.js` but remove the mobile duplicate.

**Estimated savings**: ~30 lines.

---

## Summary Table

| Phase | What | Files touched | Lines saved (est.) |
|-------|------|--------------|-------------------|
| 1 | Shared utility functions | ~18 files | ~175 |
| 2 | Mobile detail popup CSS | ~6 files | ~80 |
| 3 | Desktop modal tab/close | ~10 files | ~55 |
| 4 | K8s modal show boilerplate | ~8 files | ~100 |
| 5 | Mock data generators | ~5 files | ~170 |
| 6 | Status class functions | ~5 files | ~30 |
| **Total** | | **~52 file edits** | **~610 lines** |

## Execution Notes

- **Phases are independent** and can be done in any order
- Phase 1 is highest priority — every future section will add another `escapeHtml()` copy if not fixed
- Phase 5 has the highest risk (moving scripts between `app.html` and `m/app.html`) — verify both platforms
- Phases 3–4 are K8s-only and lowest risk
- No new shared files should exceed 100 lines
- After each phase, manually verify the affected sections still render correctly

## Files Created (new)

| File | Purpose |
|------|---------|
| `m/app/css/mobile-detail-popup.css` | Shared detail popup styles |
| `js/mock/gpu-mock-data.js` | Shared GPU mock data (moved from gpus-mock-data.js) |
| `js/mock/hosts-mock-data.js` | Shared Hosts mock data (extracted from hosts.js) |

## Files NOT Changed

- `l8ui/shared/layer8d-utils.js` — Already the canonical utility file; only additions (formatBytes, formatUptime variants)
- `dashboard/`, `targets/`, `topo/` — Iframes, independent codebases
- `l8ui/login/` — Loads before utils, keeps local copies
