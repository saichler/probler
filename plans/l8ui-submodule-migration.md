# Plan: Replace Local l8ui Copy with Git Submodule

## Goal
Replace `go/prob/newui/web/l8ui/` (local copy) with a git submodule pointing to `../l8ui` (`github.com/saichler/l8ui`). This requires upstreaming Probler's enhancements to l8ui first, then adopting l8ui's improvements back.

---

## Analysis Summary

**289 total files compared → 287 identical, 9 differ**

### Files Where Probler is AHEAD (must upstream to l8ui)

| # | File | What Probler Added |
|---|------|--------------------|
| 1 | `shared/layer8d-module-filter.js` | Better error handling: `showErrorAndLogout()` → `logout(msg)` → `alert()` fallback chain |
| 2 | `m/js/layer8m-auth.js` | `patch(url, data)` method (PATCH HTTP verb was missing) |
| 3 | `m/js/layer8m-module-registry.js` | `getTransformData(modelName)` method for data transforms |
| 4 | `m/js/layer8m-nav.js` | Auto-skip single-service modules, section-based modules, custom home title (`homeSectionTitle`) |
| 5 | `m/js/layer8m-nav-crud.js` | "Edit" button in detail popup → opens full edit form |
| 6 | `m/js/layer8m-nav-data.js` | Custom CRUD handler overrides (`onAdd`/`onEdit`/`onDelete`/`onRowClick`), filter dropdown rendering, additional module registries (`MobileMonitoring`, `MobileALM`, `MobileSystem`, `MobileTargets`) |

### Files Where l8ui is AHEAD (must adopt into Probler after submodule switch)

| # | File | What l8ui Has |
|---|------|--------------------|
| 7 | `shared/layer8d-forms-fields.js` | `formatMoney`/`formatDate` imports, reference field read-only rendering, money/date display formatting |
| 8 | `m/js/layer8m-forms.js` | `if (!input.disabled)` guard on reference picker click handlers |
| 9 | `m/js/layer8m-forms-fields-reference.js` | `data-ref-config` and `data-lookup-model` attributes on disabled reference inputs |

### Documentation

| File | Location | Action |
|------|----------|--------|
| `GUIDE.md` | Probler only | Move to l8ui as `GUIDE.md` (alongside existing `README.md`) |
| `README.md` | l8ui only | Keep as-is (repo-level docs) |

---

## Phase 1: Upstream Probler Enhancements to l8ui

**Work in**: `../l8ui` repository

### 1.1 — `shared/layer8d-module-filter.js`
Replace the error handler in `load()` catch block (around line 40) with Probler's fallback chain:
```javascript
if (typeof showErrorAndLogout === 'function') {
    showErrorAndLogout(
        'Failed to load module configuration. The system may still be booting.',
        'Error: ' + e.message + (e.stack ? '\n\nStack:\n' + e.stack : '')
    );
} else if (typeof logout === 'function') {
    logout('Failed to load module config: ' + e.message);
} else {
    alert('Failed to load module config: ' + e.message);
    window.location.href = 'l8ui/login/index.html';
}
```

### 1.2 — `m/js/layer8m-auth.js`
Add `patch()` method after the existing `put()` method (around line 170):
```javascript
async patch(url, data) {
    const response = await this.makeAuthenticatedRequest(url, {
        method: 'PATCH',
        body: JSON.stringify(data)
    });
    if (!response) return null;
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(sanitizeServerError(errorText) || `Request failed: ${response.status}`);
    }
    return response.json();
},
```

### 1.3 — `m/js/layer8m-module-registry.js`
Add `getTransformData()` method to the registry object (around line 64):
```javascript
getTransformData: function(modelName) {
    var mod = findModule(modules, modelName);
    if (mod && mod.getTransformData) return mod.getTransformData(modelName);
    if (mod && mod.transforms && mod.transforms[modelName]) return mod.transforms[modelName];
    return null;
},
```

### 1.4 — `m/js/layer8m-nav.js` (largest change)
Three additions:
1. **Auto-skip logic** in module/submodule/service rendering — skip intermediate nav when only 1 child
2. **Section-based module support** — `_renderSectionModule()` method for modules that load HTML sections
3. **Custom home title** — use `LAYER8M_NAV_CONFIG.homeSectionTitle` instead of hardcoded "ERP Modules"
4. **`_wouldAutoSkip()` helper** — prevents back-button loops
5. **Smart back navigation** — detects auto-skip levels and goes back further

### 1.5 — `m/js/layer8m-nav-crud.js`
Change detail popup config to include Edit button:
- `showFooter: true` (was `false`)
- Add `saveButtonText: 'Edit'`, `showCancelButton: true`, `cancelButtonText: 'Close'`
- Add `onSave` callback that closes popup and opens `openServiceForm()`

### 1.6 — `m/js/layer8m-nav-data.js`
Three additions:
1. **Custom CRUD handler overrides** — check `serviceConfig.onAdd`, `.onEdit`, `.onDelete`, `.onRowClick` before using defaults
2. **Filter dropdown rendering** — `_renderFilterDropdown()` function for field-based filtering with base where clause
3. **Additional module registries** — check `window.MobileMonitoring`, `window.MobileALM`, `window.MobileSystem`, `window.MobileTargets`

### 1.7 — `GUIDE.md`
Copy Probler's `GUIDE.md` to l8ui repository as `GUIDE.md` (l8ui already has `README.md` for repo docs; `GUIDE.md` is the component API reference).

---

## Phase 2: Verify l8ui After Upstream

**Work in**: `../l8ui` repository

1. Run `node -c` syntax check on all 6 modified JS files
2. Verify no duplicate method names or broken closures
3. Commit all changes to l8ui with descriptive message

---

## Phase 3: Replace Local Copy with Submodule

**Work in**: Probler repository

### 3.1 — Remove local l8ui directory
```bash
git rm -r go/prob/newui/web/l8ui/
```

### 3.2 — Add git submodule
```bash
git submodule add ../l8ui go/prob/newui/web/l8ui
# or with full URL:
git submodule add https://github.com/saichler/l8ui.git go/prob/newui/web/l8ui
```

### 3.3 — Verify submodule contains all files
```bash
ls go/prob/newui/web/l8ui/shared/
ls go/prob/newui/web/l8ui/m/js/
```

### 3.4 — Verify Probler UI loads correctly
- Open desktop UI — verify sections load, tables render, popups work
- Open mobile UI — verify navigation, auto-skip, detail-to-edit, filter dropdowns

---

## Phase 4: Adopt l8ui Improvements (already in submodule)

After the submodule switch, these l8ui improvements are automatically adopted:

1. **`layer8d-forms-fields.js`** — `formatMoney`/`formatDate` in read-only display
2. **`layer8m-forms.js`** — `if (!input.disabled)` guard on reference pickers
3. **`layer8m-forms-fields-reference.js`** — `data-ref-config`/`data-lookup-model` attributes

Verify these don't conflict with Probler's usage:
- Check if Probler relies on click handlers firing on disabled reference inputs (if so, the guard may need conditional behavior)
- Check if Probler's forms use money/date fields in read-only mode (if so, the formatting is a bonus)

---

## Phase 5: End-to-End Verification

### Desktop
- [ ] Dashboard section loads
- [ ] Network devices table loads, row click opens detail modal
- [ ] GPU table loads, row click opens detail modal
- [ ] Hosts section loads with tabs, row click opens detail modal
- [ ] Kubernetes section loads, all sub-tables work
- [ ] SYS module (security, health) works

### Mobile
- [ ] Home screen shows module cards
- [ ] Auto-skip works for single-service modules
- [ ] Section-based modules (dashboard) load correctly
- [ ] Detail popup shows Edit button, clicking opens edit form
- [ ] Filter dropdowns render and apply filters
- [ ] Custom CRUD handlers fire correctly (MobileMonitoring, MobileALM, etc.)
- [ ] Reference pickers work on enabled inputs, are inert on disabled inputs

---

## Traceability Matrix

| # | Change | Source | Phase |
|---|--------|--------|-------|
| 1 | Upstream error handling to layer8d-module-filter.js | Probler ahead | Phase 1.1 |
| 2 | Upstream patch() to layer8m-auth.js | Probler ahead | Phase 1.2 |
| 3 | Upstream getTransformData() to layer8m-module-registry.js | Probler ahead | Phase 1.3 |
| 4 | Upstream auto-skip/section modules to layer8m-nav.js | Probler ahead | Phase 1.4 |
| 5 | Upstream Edit button to layer8m-nav-crud.js | Probler ahead | Phase 1.5 |
| 6 | Upstream custom handlers/filter to layer8m-nav-data.js | Probler ahead | Phase 1.6 |
| 7 | Copy GUIDE.md to l8ui | Documentation | Phase 1.7 |
| 8 | Adopt formatMoney/formatDate from l8ui | l8ui ahead | Phase 4 (automatic) |
| 9 | Adopt disabled input guard from l8ui | l8ui ahead | Phase 4 (automatic) |
| 10 | Adopt data-ref-config attributes from l8ui | l8ui ahead | Phase 4 (automatic) |
| 11 | Remove local l8ui, add submodule | Migration | Phase 3 |
| 12 | Verify desktop UI end-to-end | Verification | Phase 5 |
| 13 | Verify mobile UI end-to-end | Verification | Phase 5 |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Auto-skip logic breaks other l8ui consumers | Low | Medium | The logic is additive (only activates when config has single children) — existing multi-child modules unaffected |
| Custom module registries (MobileMonitoring, etc.) are Probler-specific | Medium | Low | These are `window.*` checks — they no-op if the globals don't exist |
| `GUIDE.md` conflicts with `README.md` | None | None | Different files, different purposes |
| Filter dropdown CSS missing in l8ui | Medium | Medium | Verify CSS for filter dropdown is in shared mobile CSS, not Probler-specific CSS |

## Open Question
- Should the additional module registry checks (`window.MobileMonitoring`, `window.MobileALM`, `window.MobileSystem`, `window.MobileTargets`) be upstreamed as-is, or refactored into a generic plugin pattern? As-is is simpler and the names don't cause harm in other consumers (they just won't have those globals defined).
