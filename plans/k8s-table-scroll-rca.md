# K8s Table Scroll — Critical RCA + Fix

## Severity
Critical. After two prior CSS attempts (`k8s-table-fixes.md` Phase 2, then the overflow revert), users still cannot scroll table rows in any K8s tab. Sticky headers work, but the body content below the visible area is unreachable. The previous flex-chain reasoning looked correct on paper but evidently isn't matching what the browser is actually doing.

## Why I'm not just patching CSS again
Two attempts have already failed. Continuing to guess will keep failing. This plan **leads with instrumentation** so the next change is informed by browser-reported computed heights, not whiteboard reasoning. The fix phase is short and will be exact, not exploratory.

## Compliance Notes (Global Rules)

- **Plan approval workflow** — written to `./plans/`, awaiting explicit approval before any implementation. The user's request for ASAP turnaround is acknowledged; approval is the only gate.
- **No silent fallbacks** — diagnostic logs are explicit (named `[K8S-SCROLL-DBG]`) and will be removed when the fix is verified. They do not dress up a regression as success.
- **Demo / vendor / sibling rules** — pure desktop CSS + JS instrumentation in `web/kubernetes/`. No Go-side or vendor changes. Rebuild not required.
- **Mobile parity (`mobile-rules.md`)** — mobile uses a different shell entirely; not affected. Phase 3 verifies no mobile regression.
- **Plan traceability + verification** — matrix at the bottom; final phase has explicit pass/fail criteria.
- **L8UI generic-only** — instrumentation is project-local (`web/kubernetes/`); nothing under `web/l8ui/` is touched.

## Current State (verified via `Read`)

DOM (from `web/sections/kubernetes.html`):
```html
<div class="section-container k8s-section l8-section">  <!-- BOTH classes on same element -->
    <div class="section-content">
        <div class="k8s-content">
            <div class="k8s-toolbar">…</div>
            <div class="k8s-category-bar">…</div>
            <div class="k8s-service-bar">…</div>
            <div class="k8s-table-area" id="k8s-table-area">
                <!-- Layer8DTable mounts here -->
                <!--   .l8-table-wrapper (flex:1, min-height:0, overflow:hidden) -->
                <!--     .l8-pagination -->
                <!--     .l8-table-container (flex:1, min-height:0, overflow:auto) -->
                <!--       <table>  ←  <thead> sticky -->
            </div>
        </div>
    </div>
</div>
```

Computed CSS chain (from `base-core.css` + `kubernetes.css`):

| Element | display | flex | overflow | height | min-h |
|---|---|---|---|---|---|
| `.main-content` | (grid) | — | overflow-y:auto | — | — |
| `#content-area` | — | — | — | 100% | — |
| `.section-container.k8s-section` (merged) | flex column | — | overflow-y:auto | 100% | 0 |
| `.section-content` | flex column | flex:1 | — | — | 0 |
| `.k8s-content` | flex column | flex:1 | — | — | 0 |
| `.k8s-table-area` | flex column | flex:1 | — | — | 0 |
| `.l8-table-wrapper` | flex column | flex:1 | overflow:hidden | — | 0 |
| `.l8-table-container` | — | flex:1 | overflow:auto | — | 0 |

The chain *should* propagate a bounded height to `.l8-table-container`, where the body would scroll. Two prime suspects when this fails in practice:

1. **Double scroll-context interception.** Both `.main-content` AND `.section-container` have `overflow-y: auto`. If `.main-content` does not actually receive a bounded height from the grid layout above it (e.g. its grid track is `auto` rather than `1fr`/fixed), then `#content-area`'s `height:100%` resolves against a content-fitting parent → unbounded → the K8s subtree expands → there is nothing bounded for `.l8-table-container` to scroll inside. The scroll then happens at `.section-container` or `.main-content` level — with the entire table content moving, header included — which the user perceives as "I can't scroll the rows" because what's actually scrolling is everything else around the table.

2. **Layer8DTable mount-point convention mismatch.** When `Layer8DTable.create` mounts inside `#k8s-table-area`, it inserts `.l8-table-wrapper`. If `.k8s-table-area` is *not* effectively `display:flex` at the moment of insertion (e.g. some other style override or a class being missing on the element node), the wrapper's `flex:1` resolves to natural-height — table grows to fit all rows — `.l8-table-container` never bounds, never scrolls.

3. **A third element sits between expected parent and child.** Some renderer (kubernetes-init.js / kubernetes-tables.js / kubernetes-overview.js) may wrap the table in an extra div that breaks the flex chain.

I cannot tell which one is real without runtime computed-style data. Phase 0 collects exactly that.

## Phase 0 — Diagnostic instrumentation

Add a one-shot diagnostic that logs the computed bounding box and key style properties of every element in the chain whenever the K8s section is rendered. The log fires on the first render and on every category/service change. Self-contained, zero impact on production behavior other than console output.

Implementation:
1. New file `web/kubernetes/kubernetes-scroll-debug.js`. ~80 lines. Exposes `window.K8sScrollDebug.snapshot(label)`.
2. The function walks a fixed list of selectors:
   ```
   .main-content
   #content-area
   .section-container.k8s-section
   .section-content
   .k8s-content
   .k8s-table-area
   .k8s-table-area .l8-table-wrapper
   .k8s-table-area .l8-table-container
   .k8s-table-area .l8-table
   ```
   For each element it logs: `tagName.classes`, `clientHeight`, `scrollHeight`, `offsetHeight`, computed `display`, computed `flex`, computed `overflowY`, computed `minHeight`, computed `height`.
3. Output format (one line per element):
   ```
   [K8S-SCROLL-DBG][<label>] section-container.k8s-section.l8-section client=856 scroll=2104 offset=856 display=flex flex= overflowY=auto minHeight=0px height=100%
   ```
4. Hook points (in `kubernetes-init.js` and `kubernetes-tables.js`):
   - On initial K8s section show: `K8sScrollDebug.snapshot('init')`.
   - On `K8sCategoryNav.activate`: `K8sScrollDebug.snapshot('cat:' + key)`.
   - In `K8sTables.create` after `table.init()`: `K8sScrollDebug.snapshot('table:' + service.key)`.
5. Wire `kubernetes-scroll-debug.js` into `app.html` immediately before `kubernetes-init.js`.

The `[K8S-SCROLL-DBG]` prefix makes the logs filterable in DevTools and trivial to grep when removed.

**What we learn from the output:**
- If `.l8-table-container` has `clientHeight === scrollHeight`, it is not constrained — scroll never engages there.
- If a parent element shows `clientHeight > viewport`, that element is the one swallowing the scroll.
- If `.k8s-table-area` shows `display !== flex`, the wrapper's `flex:1` doesn't resolve.
- If the chain has unexpected elements (a wrapping div introduced by a renderer), they appear in DevTools' Elements panel — the diagnostic narrows where to look.

## Phase 1 — Apply targeted fix based on data

The fix branch depends on what Phase 0 reveals. Three predicted branches and the corresponding patches; the plan commits to one only after Phase 0 output is reviewed.

### Branch A — `.l8-table-container` has `clientHeight === scrollHeight` (table not bounded)
Cause: chain isn't propagating bounded height to the table's scroll viewport.
Fix candidates in order:
1. Confirm `#k8s-table-area` is `display:flex` at runtime; if a style override removes it, add a `!important` on `.k8s-table-area { display: flex; flex-direction: column; }`. Comment the override as "scroll-critical, do not remove".
2. If `Layer8DTable` inserts an extra wrapper div without flex, give `#k8s-table-area > *:first-child` `flex:1; min-height:0;` as a defensive rule. (Would also be filed as a follow-up in `l8ui` for shared benefit.)

### Branch B — Outer `.main-content` or `.section-container` shows unbounded height
Cause: scroll is happening at the outer level, not the inner table viewport.
Fix candidates:
1. Verify `.main-content` (grid track) has a bounded sizing. If the grid template uses `auto` for the content row, change to `1fr` (in `base-core.css`) — but only after ruling out Branch A, since this affects every section, not just K8s.
2. Optionally remove `overflow-y: auto` from `.section-container` for the K8s case via `.k8s-section { overflow: hidden; }` — this prevents the outer scroll from intercepting wheel events when the inner table viewport is the intended scroll. **Important:** previous attempt added overflow-y:auto on `.k8s-table-area` and broke sticky; this branch is the inverse (remove outer overflow, keep inner) and is sticky-safe.

### Branch C — Unexpected element between `.k8s-table-area` and `.l8-table-wrapper`
Cause: some JS renderer wraps the table.
Fix: identify the wrapper, give it `display:flex; flex-direction:column; flex:1; min-height:0;` either by class rule or inline style.

In all branches, the diagnostic logs from Phase 0 must show, after the fix, that:
- `.l8-table-container.clientHeight < .l8-table-container.scrollHeight` (i.e. there IS overflow, hence scrolling)
- `.l8-table-container.clientHeight` is bounded by the viewport, not by content

## Phase 2 — Verify both scroll AND sticky together

The previous fix attempt traded sticky for scroll. This phase explicitly tests both:

1. Pods tab with ≥30 rows. Scroll the table body — confirm rows below the fold become reachable.
2. While scrolling, confirm the header row stays pinned (sticky).
3. Repeat for Workloads → Deployments and Nodes (tab structures slightly differ: Nodes has no namespace column).
4. Repeat after switching cluster — confirm new rows scroll correctly.
5. Resize the browser narrow and tall — confirm scroll still engages and header still sticks.

Branch failure mode: if the fix restores scroll but breaks sticky, the patch is wrong; revert and re-evaluate.

## Phase 3 — Remove the instrumentation

Once Phase 2 passes:
1. Remove `web/kubernetes/kubernetes-scroll-debug.js`.
2. Remove the `<script>` tag from `app.html`.
3. Remove the four `K8sScrollDebug.snapshot(...)` call sites in `kubernetes-init.js` and `kubernetes-tables.js`.
4. Verify with `grep K8sScrollDebug web/` returning empty.

Mobile parity: confirm the mobile K8s flow still works (it doesn't use any of these CSS classes, so this is a sanity check, not a real risk).

## Traceability Matrix

| # | Concern | Phase |
|---|---|---|
| 1 | Cannot scroll past visible rows in any K8s tab | Phase 0 (diagnose) + Phase 1 (fix) |
| 2 | Don't regress sticky headers | Phase 2 explicitly tests both |
| 3 | Don't regress mobile | Phase 3 verifies (no mobile changes) |
| 4 | Avoid guessing | Phase 0 produces data first |
| 5 | Clean up instrumentation | Phase 3 removes everything |

## Risks

- **Branch B's fix to `.main-content` grid sizing affects every section, not just K8s.** If Phase 0 selects Branch B, the change must be reviewed broadly and tested against at least one other section (Hosts, GPUs, Network) to confirm no regression. If it does regress, Branch B becomes K8s-scoped via a `.k8s-section` selector instead.
- **Layer8DTable internals could change.** The fix targets the current Layer8DTable structure. If Layer8DTable changes internally, the fix may need to move into `l8ui/edit_table/` rather than `web/kubernetes/`. Phase 1 documents this contingency.
- **Diagnostic logs in production.** They are intentional and time-bounded by Phase 3.

## Out of Scope

- Changing Layer8DTable's structure permanently.
- Refactoring `web/sections/kubernetes.html` DOM (e.g. splitting `section-container` and `k8s-section` onto separate elements). May be revisited if Phase 0 reveals the dual-class merge is the culprit, but that's a larger blast radius than the fix this issue requires.
- Anything on the new "Kubernetes Explorer" portal — that's a separate plan and a separate code path.

---

## Investigation State (paused — resume from here)

**Date paused:** 2026-04-26. Reason: image push to repository is currently broken; cannot redeploy to verify the fix in a running browser.

### Status by phase

| Phase | Status | Notes |
|---|---|---|
| 0 — Diagnostic instrumentation | ✅ Implemented and shipped | Files listed below. Cache-bust `?v=4` is in place. |
| 1 — Targeted fix | ✅ Implemented (Branch C confirmed by data) | One CSS rule added to `kubernetes.css`. Not yet verified in browser. |
| 2 — Verify scroll + sticky | ⏸ **BLOCKED** — needs redeploy to verify | Verification steps spelled out below. |
| 3 — Remove instrumentation | ⏸ Pending Phase 2 success | Removal checklist below. |

### What the runtime diagnostic showed (Phase 0 output, captured 2026-04-26)

The user pasted a `[K8S-SCROLL-DBG]` log from the running browser. Smoking gun:

```
[cat:workloads]/[table:pods]
.k8s-table-area      client=499  scroll=3712  display=flex     ← bounded (correct)
.k8s-table-area > *  client=3712 scroll=3712  display=block    ← BROKEN: #k8s-table-pods
.l8-table-wrapper    client=3712 scroll=3712  display=flex     ← inherits broken
.l8-table-container  client=3642 scroll=3642  display=flex     ← unbounded, no scroll
SUMMARY: bounded=false
```

Root cause: `kubernetes-init.js` line ~202 mounts content via an *unstyled* wrapper `<div id="k8s-table-{svc.key}">` inside `.k8s-table-area`. That wrapper is `display:block` with natural-content height, which kills the Layer8DTable's flex chain — `.l8-table-container` ends up with `clientHeight === scrollHeight`, so its `overflow:auto` has nothing to scroll. This matches **Branch C** in the plan above.

### Fix that is currently committed but NOT YET VERIFIED in browser

Single CSS rule added to `web/kubernetes/kubernetes.css`:

```css
.k8s-table-area > div {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
}
```

The comment block above the rule explains the diagnostic finding so future readers don't strip it out. Sticky-safe because we did NOT touch `.k8s-table-area`'s overflow.

### Files currently changed (uncommitted in probler `web/`)

```
web/app.html                                — added <script> for kubernetes-scroll-debug.js (TEMPORARY)
web/kubernetes/kubernetes-scroll-debug.js   — NEW, TEMPORARY (Phase 0)
web/kubernetes/kubernetes-init.js           — added 2× K8sScrollDebug.snapshot() calls (TEMPORARY)
web/kubernetes/kubernetes-tables.js         — added 1× K8sScrollDebug.snapshot() call (TEMPORARY)
web/kubernetes/kubernetes.css               — added .k8s-table-area > div rule (THE FIX, KEEP)
```

No Go-side changes, no vendor changes, no demo changes. Pure web/ tree.

### How to resume — exact step sequence

When the image push issue is resolved:

1. **Redeploy** webui_demo (CSS-only change; no rebuild of Go binaries needed).

2. **Hard-refresh** the K8s section in the browser. Open DevTools console.

3. **Verify the fix.** Click Workloads → Pods. Look for the `[K8S-SCROLL-DBG][table:pods]` log batch. The expected post-fix signature is:
   ```
   .k8s-table-area > *  client≈440  scroll=3712  display=flex   ← was: 3712/3712 block
   .l8-table-container  client≈380  scroll=3642  display=flex   ← was: 3642/3642
   SUMMARY: bounded=true                                          ← was: bounded=false
   ```
   Exact `client` numbers vary with viewport, but `client < scroll` and `bounded=true` are the must-haves.

4. **Manually verify scroll AND sticky together** (Phase 2 acceptance):
   - Pods tab with ≥30 rows: scroll the body, reach the last row.
   - While scrolling, the `<thead>` row stays pinned (sticky).
   - Repeat for Workloads → Deployments and Nodes.
   - Switch cluster — scroll still works in the new data.

5. **If verification passes, do Phase 3 cleanup**:
   - Delete `web/kubernetes/kubernetes-scroll-debug.js`.
   - In `web/app.html`, remove the two lines added for the diagnostic:
     ```html
     <!-- TEMPORARY scroll diagnostic — see plans/k8s-table-scroll-rca.md (removed in Phase 3). -->
     <script src="kubernetes/kubernetes-scroll-debug.js?v=4"></script>
     ```
   - In `web/kubernetes/kubernetes-init.js`, remove the two `if (window.K8sScrollDebug) { setTimeout(... snapshot ...) }` blocks (search for `K8sScrollDebug` to find them).
   - In `web/kubernetes/kubernetes-tables.js`, remove the same `K8sScrollDebug` block in `K8sTables.create`.
   - Verify cleanup: `grep -r K8sScrollDebug web/` returns empty.
   - Keep the `.k8s-table-area > div` CSS rule and its comment in `kubernetes.css` — that's the actual fix.

6. **If verification fails** (scroll doesn't engage OR sticky breaks):
   - Re-capture the `[K8S-SCROLL-DBG]` log post-fix.
   - The CSS rule may be hitting a specificity issue or the wrapper div may have inline styles overriding it. Inspect `#k8s-table-pods` in DevTools Elements panel; check for inline `style=` attribute or another rule overriding `display: flex`.
   - Possible follow-up: change the CSS selector to `.k8s-table-area > div[id^="k8s-table-"], .k8s-table-area > div#k8s-overview-area` for higher specificity, or apply the styles inline at the JS mount sites in `kubernetes-init.js`.

### What NOT to do on resume

- Do not delete `kubernetes-scroll-debug.js` until Phase 2 is verified — the post-fix log is the verification.
- Do not modify the `.k8s-table-area > div` rule based on hunches without first capturing a post-fix log.
- Do not "also fix sticky" preemptively — sticky was working before this regression and the current fix does not touch its scroll context.

### Pointer for future me / the user

The whole story is in this plan file. The task list (TaskList tool) has tasks #27–#30 reflecting Phase 0–3; #27 and #28 are completed, #29 is the verification gate, #30 is the cleanup. Resume by setting #29 to in_progress after the redeploy.

