# Kubernetes Explorer — Portal Header Parity

## Source / Context
The K8s Explorer portal currently has its own bespoke header chrome (smaller logo, 16px title, 11px subtitle, custom paddings). The user has asked for that header to "look & feel like Probler section title" — i.e. inherit the Probler app's typography, spacing, and accent treatment so the explorer portal feels like a first-class Probler surface and not a bolt-on.

The classic `.section-title` look has already been applied to the in-pane content titles (`.k8s-explorer-resource-title`, `.k8s-explorer-overview-title`) in a previous edit. This plan covers the **portal header chrome** (logo + title + subtitle lockup, plus the bar that contains them).

## Strategic Position
Pure CSS + tiny HTML class restructuring. No JS, no new components, no Go-side. The smallest possible change that makes the explorer header indistinguishable from the classic app header.

## Why a plan and not a one-shot edit
Three reasons:
1. The change touches both `web/k8s-explorer.html` and `web/k8s-explorer/css/k8s-explorer.css`, and the markup needs to align with the class names the existing `css/base-core.css` already styles. Picking the wrong class name silently inherits nothing.
2. The plan-approval-workflow rule applies — non-trivial UI redesign work goes through `./plans/`.
3. There are two viable options (mirror the app-header verbatim vs. apply only the section-title accent treatment to the portal title). The user's intent should be confirmed before code lands.

## Two Options

### Option A — Mirror the Probler app-header verbatim
Use the same class names the classic app uses, so `css/base-core.css`'s existing rules cascade into the explorer page for free. Concretely:

- Rename `.k8s-explorer-header` → reuse `.app-header`
- Rename `.k8s-explorer-header-left` → reuse `.header-left`
- Rename `.k8s-explorer-header-right` → reuse `.header-right`
- Wrap title + subtitle in a `.header-title` div with an `<h1>` (`.header-title h1` is already styled to 22px Figtree weight 700)
- Add a `<p class="header-subtitle">` (already styled to 11px muted Figtree)
- Drop the custom `.k8s-explorer-title` / `.k8s-explorer-subtitle` rules — they become dead code
- Logo gets `.header-logo` (42×42, vs. our current 32px)

Pros: ZERO custom CSS for the header — every future Probler header change automatically applies to the explorer too. Pixel-identical match.
Cons: implicit dependency on `css/base-core.css` being loaded on the page (which we already do in the current explorer html).

### Option B — Keep custom classes, copy the styles
Keep `.k8s-explorer-header*` classes and rewrite their CSS to mirror the app-header values (22px Figtree h1, 11px subtitle, 42px logo, 1px bottom border).

Pros: explorer header can diverge without touching shared CSS.
Cons: every future Probler header change is now a manual port. Two places to maintain — exactly the duplication that `plan-duplication-audit.md` warns against.

## Recommendation

**Option A.** It's the smaller change, has zero ongoing maintenance cost, and matches the spirit of "look & feel like Probler" (literal class-level reuse, not a copy). The frozen-section contract for the *classic K8s section* doesn't apply here — that contract is about not adding new features to that section. Reusing `.app-header`/`.header-left`/`.header-title` styles in a different page is the opposite of duplication.

The remaining bespoke parts of the explorer header (the context-bar slot in the middle, the portal switcher, the user menu) keep their explorer-local class names — they're not direct counterparts of anything in `app.html`.

## Compliance Notes (Global Rules)

- **Plan approval workflow (`plan-approval-workflow.md`)** — written to `./plans/`, awaiting explicit approval before implementation.
- **Plan traceability and verification (`plan-traceability-and-verification.md`)** — the Traceability Matrix at the bottom maps every concern to a phase, and Phase 3 + Phase 4 are explicit verification steps (visual diff vs. classic header; mobile no-regression sanity).
- **Plan-duplication-audit (`plan-duplication-audit.md`)** — Option A explicitly *removes* duplication (deletes ~30 lines of overlapping CSS); Option B is documented as the worse path because it would create exactly the duplication that rule warns against.
- **L8UI generic-only (`l8ui-no-project-specific-code.md`)** — no edits under `web/l8ui/`. The classes `.app-header`/`.header-*` live in `web/css/base-core.css` (project-specific Probler chrome) which is the right place.
- **L8UI theme compliance (`l8ui-theme-compliance.md`)** — N/A. The reused classes already use `--text-primary` / `--bg-card` / `--border-subtle` (Probler-specific tokens), which is correct for project-level chrome — the rule only constrains components under `web/l8ui/`.
- **No silent fallbacks (`report-infra-bugs.md`)** — N/A; this is a CSS class swap with no fallback logic in scope.
- **Maintainability (`maintainability.md`)** — file sizes shrink (we delete CSS rather than add); no file approaches the 500-line guideline.
- **Mobile parity (`mobile-rules.md`)** — explorer is desktop-only per Phase 0a of the explorer-portal plan. Phase 4 of this plan verifies the explorer remains hidden on mobile (no regression).
- **Follow user issue (`follow-instructions-verify-user-issue.md`)** — the user asked specifically about the portal-level page title in the header lockup; the plan addresses that exact scope and explicitly excludes the in-pane content titles (already updated in a prior edit) from re-touching.
- **Demo / vendor / sibling rules** — pure desktop UI, no Go / vendor / demo touch.

## Phase Breakdown

### Phase 1 — HTML class swap in `web/k8s-explorer.html`

Before:
```html
<header class="k8s-explorer-header">
    <div class="k8s-explorer-header-left">
        <img src="images/logo.gif" alt="Probler Logo" class="k8s-explorer-header-logo">
        <div>
            <h1 class="k8s-explorer-title">Kubernetes Explorer</h1>
            <p class="k8s-explorer-subtitle">Resource navigator</p>
        </div>
    </div>
    <div class="k8s-explorer-context-bar" id="k8s-explorer-context-bar"></div>
    <div class="k8s-explorer-header-right">…</div>
</header>
```

After:
```html
<header class="app-header k8s-explorer-header">
    <div class="header-left">
        <img src="images/logo.gif" alt="Probler Logo" class="header-logo">
        <div class="header-title">
            <h1>Kubernetes Explorer</h1>
            <p class="header-subtitle">Resource navigator</p>
        </div>
    </div>
    <div class="k8s-explorer-context-bar" id="k8s-explorer-context-bar"></div>
    <div class="header-right">…</div>
</header>
```

The retained `.k8s-explorer-header` class on the outer element is the hook for explorer-only tweaks (e.g. flex-shrink behavior in our specific shell layout).

### Phase 2 — CSS cleanup in `web/k8s-explorer/css/k8s-explorer.css`

- Delete the now-unused `.k8s-explorer-header-left`, `.k8s-explorer-header-logo`, `.k8s-explorer-title`, `.k8s-explorer-subtitle`, `.k8s-explorer-header-right` rules (their replacements are inherited from `css/base-core.css`).
- Keep `.k8s-explorer-header` but slim it: only the bits that don't already come from `.app-header` (e.g. our `gap`, `padding` if different, `flex-shrink: 0`).
- Audit the `.k8s-explorer-context-bar` slot — it currently has `flex: 1`, which fights with `.app-header`'s `justify-content: space-between`. Adjust if the context bar shows up in the wrong place after the swap.

### Phase 3 — Visual diff
Open both portals side-by-side:
- Logo size matches (42×42 in both)
- Title typography matches (22px Figtree weight 700, color `--text-primary`)
- Subtitle typography matches (11px muted)
- Bottom border line on the header is 1px `--border-subtle` (provided by `.app-header::after`)
- Spacing between logo and title matches (14px gap)

### Phase 4 — Mobile no-regression check
Mobile uses `Layer8MNav` — no header chrome on the explorer page. Verify the explorer portal is still hidden on mobile (Phase 0a decision in the redesign plan).

## Risks / Open Questions

1. **`.app-header` is grid-area positioned in the classic shell.** The classic app uses CSS Grid (`grid-area: header`) where the explorer uses flex column. `.app-header { grid-area: header }` is harmless in a flex context (the property is ignored). Verified by reading `css/base-core.css`.
2. **`.header-illustration` SVG.** The classic header has a decorative SVG inside `.app-header`. The explorer doesn't include this; that's intentional (the SVG is keyed to the classic dashboard). No action needed.
3. **Padding mismatch.** `.app-header` has `padding: 0 24px`; the explorer currently has `padding: 12px 20px`. After Option A the padding becomes 0 24px — slightly tighter top/bottom. The classic header relies on element sizes for vertical rhythm (logo 42px + theme-buttons 30-something px). Looks fine in the existing app; should look fine in the explorer too. If it feels cramped, override `.k8s-explorer-header` with `padding: 12px 24px`.
4. **The context bar in the middle.** Classic `.app-header` is a 2-column flex (left + right). The explorer adds a middle slot for `Layer8DContextBar`. After the swap, ensure `.k8s-explorer-context-bar` has `flex: 1` or sits as a third row gracefully on narrow viewports.

## Out of Scope

- Restyling the in-pane content titles (already done in a prior edit).
- Mobile header parity (no mobile explorer).
- Any change to the classic Probler app — frozen-section contract from the explorer-portal plan still applies.
- Renaming `Mesh` → `Istio`, adding an Istio overview card, or any other content-level change.

## Traceability Matrix

| # | Concern | Phase |
|---|---|---|
| 1 | Header logo size matches Probler | Phase 1 (`header-logo` class) |
| 2 | Header title typography matches Probler section title look | Phase 1 (`header-title h1`) |
| 3 | Header subtitle matches Probler | Phase 1 (`header-subtitle` class) |
| 4 | 1px bottom border line matches Probler | Phase 1 (`app-header::after`) |
| 5 | Context-bar slot still works | Phase 2 audit + visual diff |
| 6 | No regressions in classic app | Untouched (zero changes to `app.html` / classic CSS) |
| 7 | Plan duplication audit satisfied | Option A — reuses classes, removes CSS |

## Affected Files
- `web/k8s-explorer.html` — class swap (Phase 1)
- `web/k8s-explorer/css/k8s-explorer.css` — delete duplicated rules, slim retained ones (Phase 2)

No JS changes. No new files.

## Verification
After deploy + hard refresh:
1. Open `/probler/app.html` and `/probler/k8s-explorer.html` in two tabs side by side.
2. Compare headers — should look identical for logo + title + subtitle + bottom line.
3. Click portal switcher both ways; header in each portal stays consistent with that portal's chrome.
