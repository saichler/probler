# Mobile v2 Cutover Plan — Replace `/m/` with `/m/v2/`

## Goal

Promote `/m/v2/` to be the only mobile version at `/m/`. Remove the old mobile code entirely.

## Current State

| Path | Description |
|------|-------------|
| `web/m/app.html` | Old mobile app shell (bottom tab nav, 9 sections) |
| `web/m/index.html` | Old mobile landing page |
| `web/m/app/` | Old mobile app code (sections/, js/, css/) |
| `web/m/css/` | Old landing page CSS |
| `web/m/js/` | Old landing page JS |
| `web/m/MOBILE_COMPONENTS_PLAN.md` | Old plan doc |
| `web/m/v2/` | New mobile app (l8ui-based, all 11 parity phases done) |

## External References to `/m/`

Only two files outside `/m/` reference it — both are client-side redirects:

1. **`web/index.html`** (line ~10): Desktop landing page detects mobile and redirects to `m/index.html`
2. **`web/l8ui/login/layer8d-login-auth.js`** (line ~120): After login, `getRedirectUrl()` rewrites `app.html` → `m/app.html` for mobile devices

Both expect `m/app.html` and `m/index.html` to exist. After cutover, v2's files will be at those exact paths — **no changes needed** to these external references.

## Critical Path Change

V2 is currently at `web/m/v2/`. All its `../../` references reach `web/`:
```
web/m/v2/app.html  →  ../../l8ui/  →  web/l8ui/  ✓
```

After moving to `web/m/`, references must use `../` instead:
```
web/m/app.html  →  ../l8ui/  →  web/l8ui/  ✓
```

**Every `../../` in v2 files must become `../`.**

## Phase 1: Delete Old Mobile Files

Remove everything under `web/m/` EXCEPT the `v2/` directory:

```
DELETE: web/m/app.html
DELETE: web/m/index.html
DELETE: web/m/MOBILE_COMPONENTS_PLAN.md
DELETE: web/m/app/          (entire directory — sections/, js/, css/)
DELETE: web/m/css/          (entire directory — landing page CSS)
DELETE: web/m/js/           (entire directory — landing page JS)
```

**Keep**: `web/m/v2/` (will be moved in Phase 2)

Files to delete: ~40 files across 6 directories.

## Phase 2: Move v2 Contents Up

Move all contents of `web/m/v2/` up to `web/m/`:

```
web/m/v2/app.html        → web/m/app.html
web/m/v2/index.html      → web/m/index.html
web/m/v2/css/            → web/m/css/
web/m/v2/js/             → web/m/js/
web/m/v2/sections/       → web/m/sections/
web/m/v2/modules/        → web/m/modules/
web/m/v2/nav-configs/    → web/m/nav-configs/
```

Then remove the empty `web/m/v2/` directory.

## Phase 3: Fix Relative Paths

All `../../` references in v2 files must become `../` (one level less deep).

### Files with `../../` references:

**`app.html`** (~100 occurrences): CSS and JS includes
```
BEFORE: ../../l8ui/m/css/layer8m-popup.css
AFTER:  ../l8ui/m/css/layer8m-popup.css

BEFORE: ../../l8ui/images/logo.gif
AFTER:  ../l8ui/images/logo.gif

BEFORE: ../../css/components-misc.css
AFTER:  ../css/components-misc.css

BEFORE: ../../js/tree.js
AFTER:  ../js/tree.js
```

**`css/app-base.css`** (3 occurrences): Font file references
```
BEFORE: url('../../l8ui/font/static/Figtree-Regular.ttf')
AFTER:  url('../l8ui/font/static/Figtree-Regular.ttf')
```

**No other files have `../../` references** — all other paths are local (e.g., `sections/dashboard.html`, `modules/monitoring/network-enums.js`).

### Verification

After path changes:
```bash
# Should return ZERO matches
grep -r '../../' web/m/ --include='*.html' --include='*.css' --include='*.js'
```

## Phase 4: Verify

1. **External redirects**: `web/index.html` redirects to `m/index.html` — file exists ✓
2. **Login redirect**: `getRedirectUrl()` points to `m/app.html` — file exists ✓
3. **App loads**: Open `m/app.html` in browser, verify l8ui CSS/JS loads
4. **Section loading**: `sections/dashboard.html` loads (relative path, unchanged)
5. **Nav configs**: All module cards render, clicking opens correct views
6. **Detail popups**: Click a network device row → detail popup opens
7. **Images/fonts**: Logo and Figtree font render correctly

## Traceability Matrix

| # | Action | Phase |
|---|--------|-------|
| 1 | Delete old `web/m/app.html` | 1 |
| 2 | Delete old `web/m/index.html` | 1 |
| 3 | Delete old `web/m/MOBILE_COMPONENTS_PLAN.md` | 1 |
| 4 | Delete old `web/m/app/` directory | 1 |
| 5 | Delete old `web/m/css/` directory | 1 |
| 6 | Delete old `web/m/js/` directory | 1 |
| 7 | Move `web/m/v2/*` to `web/m/` | 2 |
| 8 | Remove empty `web/m/v2/` | 2 |
| 9 | Fix `../../` → `../` in `app.html` | 3 |
| 10 | Fix `../../` → `../` in `css/app-base.css` | 3 |
| 11 | Verify no remaining `../../` references | 3 |
| 12 | Browser test: app loads, sections work, details open | 4 |
