# Kubernetes Explorer — Resource Hero Header (correction)

## Source / Context
A previous edit cycle styled the K8s Explorer's per-resource title (Pods, Deployments, Nodes, …) and the Overview title using a custom `.k8s-explorer-resource-title` / `.k8s-explorer-overview-title` rule modeled after the Probler **`.section-title`** class — the small bordered heading with a 3px cyan accent bar via `::before`.

That was the wrong pattern. Auditing every Probler section that uses the phrase "section title" reveals they all use the **`.l8-header-frame`** hero banner — a tall, gradient-backed, parallax-layered container with an animated SVG illustration, a 36px uppercase `h1.l8-title`, and an uppercase letter-spaced `p.l8-subtitle`. Examples (each has a bespoke illustration):

| Section | Title | Hero |
|---|---|---|
| GPUs | "GPU Computing Infrastructure" | Animated GPU cards + perf bars |
| Hosts | "Virtual Infrastructure" | Hypervisor + VM illustration |
| Network | "Network Infrastructure" | Switches + links illustration |
| Dashboard | "Datacenter Dashboard" | DC topology |
| Topologies | "Topologies" | Graph illustration |
| System | "System Administration" | Gear / dashboard motif |

`.section-title` is a **secondary heading** used inside dashboards (e.g. "Top Critical Alarms" inside the dashboard section). I conflated the two.

This plan retrofits the K8s Explorer to use the correct `.l8-header-frame` hero pattern.

## Strategic Position
The hero pattern already has an l8ui generator (`Layer8SectionGenerator` / `Layer8SectionConfigs` / `Layer8SvgFactory` in `web/l8ui/shared/`). The K8s Explorer just needs to use it. CSS for `.l8-header-frame`, `.l8-header-bg`, `.l8-header-content`, `.l8-title`, `.l8-subtitle` already lives in `web/l8ui/shared/layer8-section-layout.css`. **Zero new generic l8ui code.** Mostly project-local glue plus one K8s SVG illustration.

## Compliance Notes (Global Rules)

- **Plan approval workflow (`plan-approval-workflow.md`)** — written to `./plans/`, awaiting explicit approval.
- **Plan traceability and verification (`plan-traceability-and-verification.md`)** — Traceability Matrix at the bottom maps every concern to a phase. Phase 4 is explicit verification (visual diff vs. classic hero sections; no-regression check on existing explorer flows).
- **Plan-duplication-audit (`plan-duplication-audit.md`)** — explicitly *removes* duplication: drops the hand-copied `.k8s-explorer-resource-title` / `.k8s-explorer-overview-title` rules and reuses `.l8-header-frame`/`.l8-title`/`.l8-subtitle` straight from `web/l8ui/shared/layer8-section-layout.css`. Same approach the header-parity plan took.
- **L8UI generic-only (`l8ui-no-project-specific-code.md`)** — uses existing l8ui APIs (`Layer8SectionGenerator`, `Layer8SvgFactory`) without modification. Project-specific bits (the K8s illustration, the per-resource subtitle text) live under `web/k8s-explorer/`.
- **L8UI theme compliance (`l8ui-theme-compliance.md`)** — `.l8-header-frame` already uses `--layer8d-header-grad-*` and `--layer8d-text-dark/medium` tokens. The new K8s SVG illustration uses theme tokens for stroke/fill where it matters.
- **No silent fallbacks (`report-infra-bugs.md`)** — when `Layer8SvgFactory` doesn't have a K8s template registered yet, the rendered hero shows the generator's default SVG (a generic geometric pattern) rather than rendering blank. That matches existing l8ui behavior, not a new fallback.
- **Maintainability (`maintainability.md`)** — net delete of code (≈40 lines of `.k8s-explorer-resource-title` / `.k8s-explorer-overview-title` removed); ≈100 lines added for the SVG + glue. Both new files <500 lines.
- **Mobile parity (`mobile-rules.md`)** — explorer is desktop-only. `.l8-header-frame` already has responsive rules in `layer8-section-responsive.css`.
- **Follow user issue (`follow-instructions-verify-user-issue.md`)** — the user pointed at GPUs as the reference; the plan literally mirrors `.l8-header-frame` from `sections/gpus.html` rather than re-interpreting "section title" again.
- **Demo / vendor / sibling rules** — pure desktop UI, no Go / vendor / demo touch.

## Design Decisions

### 1. One shared K8s illustration, not 41 bespoke ones
Each Probler section has its own animated SVG in its `.l8-header-bg`. The classic sections are coarse-grained (one per top-level area), so each gets its own illustration. The K8s Explorer has 41 resource types — bespoke SVGs per type would be unmaintainable and visually incoherent.

**Decision:** one K8s-themed illustration shared across every K8s resource view (Pods, Deployments, …, Events). Title text differentiates them; the illustration sets the K8s "feel." A separate illustration for the Overview landing is reasonable and adds variety; that's optional.

The K8s illustration: hexagonal cluster cells (mimicking the Kubernetes logo's seven-spoked wheel), animated stroke pulses on the inter-cell connections, small status dots on nodes. Two-tone: primary (cyan) for active cells, muted for background. ~80 lines of SVG inline, registered via `Layer8SvgFactory.registerTemplate('k8s', fn)`.

### 2. Per-resource title + subtitle text
Title: human-readable resource type label, uppercase per the `.l8-title` style — same convention as classic sections.
Subtitle: short descriptor of what the operator is looking at.

Exact text per resource is generated from `K8sExplorerConfig.findItem(itemKey)` + a small subtitle map. Examples:

| Item | Title | Subtitle |
|---|---|---|
| `pods` | "Pods" | "Workload instances – container groups" |
| `deployments` | "Deployments" | "Rolling updates and replica management" |
| `services` | "Services" | "Stable network endpoints" |
| `nodes` | "Nodes" | "Cluster compute capacity" |
| `events` | "Events" | "Cluster activity stream" |

For the Overview pane: title "Kubernetes Overview", subtitle "Cluster health at a glance".

### 3. Where the scope pills go
Today the cluster/namespace pills sit beside the title. With a hero banner, that doesn't fit (the hero is centered text). **Decision:** scope pills move OUT of the title block and into a thin secondary row directly below the hero (still above the table). Same content, new home.

### 4. Lift `renderHero` into `Layer8SectionGenerator` as a public primitive
`Layer8SectionGenerator.generate(sectionKey)` produces the full section HTML — header + module tabs + content panes. The K8s Explorer's body structure (rail + main pane) is not tab-based, so we don't want the full generator output — only its hero block.

The generator's existing `_generateHeader` is private (underscore prefix). **Decision:** Phase 0 lifts an equivalent `renderHero({title, subtitle, svgKey?, svgContent?, gradientId?})` to the public API surface so the K8s Explorer (and any future portal that wants a hero standalone) gets it for free, and so future hero-markup changes auto-propagate to all consumers.

This is a generic, project-agnostic addition to `web/l8ui/shared/layer8-section-generator.js`. Justified by ≥2 consumers: the K8s Explorer (this plan) + any future portal that needs a hero outside the generator's full section template (e.g. another resource explorer in L8erp / L8topology). Strictly additive — does not touch existing `generate()` callers.

### 5. CSS to delete
- `.k8s-explorer-resource-title` (the cyan-bar copy)
- `.k8s-explorer-resource-title::before` (the cyan bar pseudo-element)
- `.k8s-explorer-overview-title`
- `.k8s-explorer-overview-title::before`
- The `.k8s-explorer-resource-header` / `.k8s-explorer-overview-header` margin tweaks they enabled

### 6. CSS to add
- `.k8s-explorer-resource-view` and `.k8s-explorer-overview` wrappers may need a small adjustment so the hero sits flush at the top (same way classic sections handle it via `.section-container`). The hero already has `margin: -7px -7px 20px -7px` to bleed past the section-container's 7px padding. The K8s Explorer's main pane has its own padding (`padding: 16px 20px`) which would prevent the bleed. Need to either remove the main-pane padding when a hero is mounted, or override the hero's margins inside the explorer.

## Phase Breakdown

### Phase 0 — Lift `renderHero` into `Layer8SectionGenerator` (l8ui)
1. In `web/l8ui/shared/layer8-section-generator.js`, expose a new public method:
   ```js
   Layer8SectionGenerator.renderHero({
       title: 'Pods',                       // required, becomes h1.l8-title
       subtitle: 'Workload instances',      // optional, becomes p.l8-subtitle
       svgKey: 'k8s-explorer',              // optional, resolved via Layer8SvgFactory.generate(svgKey)
       svgContent: '<svg>…</svg>',          // optional, raw SVG markup; takes precedence over svgKey
       gradientId: 'k8sGradient1'           // optional, defaults to 'sectionGradient1'
   })
   ```
   Returns an HTML string containing exactly the hero block:
   ```html
   <div class="l8-header-frame parallax-container">
       <div class="l8-header-bg parallax-layer" data-speed="0.5">…SVG…</div>
       <div class="l8-header-content parallax-layer" data-speed="1">
           <div class="l8-header-title">
               <h1 class="l8-title">Pods</h1>
               <p class="l8-subtitle">Workload instances</p>
           </div>
       </div>
   </div>
   ```
2. Internally, `_generateHeader` (the existing private one used by `generate()`) is rewritten to delegate to `renderHero`, so the two paths share one implementation. Existing `generate()` callers see no behavior change.
3. SVG resolution order, in `renderHero`:
   - If `svgContent` is provided → use it verbatim.
   - Else if `svgKey` is provided AND `Layer8SvgFactory.generate(svgKey)` returns non-empty → use it.
   - Else fall back to `_generateDefaultSvg(gradientId)` (existing behavior).
   This is a deliberate fallback chain, NOT a silent fallback that hides bugs — when `svgKey` resolves to an empty string the helper logs a `console.warn` so the missing template is visible during dev.
4. Add a JSDoc block on `renderHero` documenting the API and the SVG resolution chain.
5. No CSS change — `.l8-header-frame` etc. already exist.

Acceptance: calling `Layer8SectionGenerator.renderHero({title:'Test'})` from the browser console returns valid HTML; mounting it into a div renders a hero with the default gradient and default SVG. Existing `Layer8SectionGenerator.generate()` callers (every classic Probler section that uses the section generator) render identically to before.

**Justification (per `l8ui-no-project-specific-code.md`):** generic addition usable by any portal/module wanting a standalone hero. ≥2 named consumers: K8s Explorer (this plan), any future portal of similar shape (L8erp module browser hero, L8topology side-bar hero). No K8s-specific code touches `web/l8ui/`.

**Justification (per `plan-duplication-audit.md`):** alternative would be hand-rolling ~12 lines of identical hero markup inside the K8s Explorer (originally proposed in Risk #2 of the previous draft). That introduces drift the moment the generator's hero markup changes. Lifting once and reusing is the canonical anti-duplication move.

### Phase 1 — K8s illustration template
1. Create `web/k8s-explorer/js/k8s-explorer-svg.js` — a single `Layer8SvgFactory.registerTemplate('k8s-explorer', fn)` call. The function returns inline SVG markup for the cluster/hex motif. Theme-aware via `--layer8d-primary`, `--layer8d-text-medium`, etc.
2. Add the script include to `k8s-explorer.html` between `layer8-svg-factory.js` (which we'll need to include — see Phase 3) and the resource-view scripts.

Acceptance: `Layer8SvgFactory.generate('k8s-explorer')` returns valid SVG markup that fits a 1200×120 viewBox and uses the expected theme tokens.

### Phase 2 — Use `Layer8SectionGenerator.renderHero` from the explorer
1. In `k8s-explorer-resource-view.js`, call `Layer8SectionGenerator.renderHero({title: service.label, subtitle: K8sExplorerConfig.subtitleFor(service.key), svgKey: 'k8s-explorer'})` and inject the returned HTML into the main pane before the scope row + Layer8DTable mount.
2. In `k8s-explorer-overview.js`, same call with `{title: 'Kubernetes Overview', subtitle: '…', svgKey: 'k8s-explorer'}`.
3. No project-local `K8sExplorerHero` module is created — the public l8ui primitive replaces the planned helper. (One less file in `web/k8s-explorer/js/`, one less name to remember.)

Acceptance: each rail click swaps the hero with new title + subtitle text; the K8s SVG illustration stays the same; the underlying scope-row + table render right below.

### Phase 3 — Wire CSS dependencies
1. Add `<link rel="stylesheet" href="l8ui/shared/layer8-section-layout.css">` and `layer8-section-responsive.css` to `k8s-explorer.html` (currently only loaded by classic app.html). These hold `.l8-header-frame`, `.l8-title`, `.l8-subtitle`, parallax rules, responsive sizes.
2. Add `<script src="l8ui/shared/layer8-svg-factory.js">` to `k8s-explorer.html` (Phase 1's SVG template needs the factory).
3. Verify no rule collisions with the existing explorer chrome — `.l8-header-frame` is unused in the explorer today, so no conflict expected.

Acceptance: opening the K8s Explorer with no other change still renders normally (we've only loaded extra CSS that defines unused classes; no visual delta yet).

### Phase 4 — Apply hero to Overview + resource views
1. In `k8s-explorer-overview.js`, replace the current header markup
   ```html
   <div class="k8s-explorer-overview-header">
     <h2 class="k8s-explorer-overview-title">Overview</h2>
     <p class="k8s-explorer-overview-sub">…</p>
   </div>
   ```
   with the hero output: title "Kubernetes Overview", subtitle "Cluster health at a glance" (or similar — final text in Phase 6).
2. In `k8s-explorer-resource-view.js`, replace
   ```html
   <div class="k8s-explorer-resource-header">
     <h2 class="k8s-explorer-resource-title">Pods</h2>
     <div class="k8s-explorer-resource-scope">…</div>
   </div>
   ```
   with the hero output (title from `service.label`, subtitle from a per-item map) followed by a thin scope-pills row below.
3. Make the scope-pills row its own block (`.k8s-explorer-scope-row`) so it can be styled independently of the hero.

### Phase 5 — Remove the old cyan-bar styles
1. Delete the following from `web/k8s-explorer/css/k8s-explorer.css`:
   - `.k8s-explorer-resource-title` and its `::before`
   - `.k8s-explorer-overview-title` and its `::before`
   - `.k8s-explorer-overview-sub`
   - the `.k8s-explorer-resource-header` / `.k8s-explorer-overview-header` rules that exist solely to scaffold those titles
2. Add minimal new rules for `.k8s-explorer-scope-row` (small horizontal flex with the existing `.k8s-explorer-scope-pill`s).
3. Possibly tweak `.k8s-explorer-resource-view` / `.k8s-explorer-overview` to remove the top padding so the hero bleeds to the edges (matches classic).

### Phase 6 — Subtitle text + final polish
1. Author the per-item subtitle map in `k8s-explorer-config.js` (a small object keyed by item.key → subtitle string). Default fallback: `service.model + ' resources'`.
2. Sanity check on every K8s rail item that the hero renders without an obviously wrong subtitle.
3. Verify the Overview hero copy reads well alongside the action-card grid below it.

### Phase 7 — Verification
1. Visual diff: open `/probler/sections/gpus.html`-like page (any classic section with `.l8-header-frame`) and the K8s Explorer side-by-side. Hero size, title typography, subtitle styling, gradient direction, illustration weight should all match in proportion.
2. Resource flow check: click each rail item — hero updates with the right title; scope pills row updates with cluster + namespace + model pills.
3. Overview check: default landing renders with the hero + action-card grid.
4. Detail popup unaffected.
5. Mobile sanity: explorer remains hidden on mobile per the portal plan; the responsive CSS we just loaded is harmless when no `.l8-header-frame` element is on the page.

## Traceability Matrix

| # | Concern | Phase |
|---|---|---|
| 0 | Public hero primitive in l8ui (reusable beyond K8s) | Phase 0 |
| 1 | Stop using `.section-title` look on resource title | Phase 5 (delete) + Phase 4 (replace) |
| 2 | Use the actual `.l8-header-frame` hero pattern from GPUs etc. | Phase 0 (primitive) + Phase 4 (apply) |
| 3 | One K8s illustration, not 41 | Phase 1 |
| 4 | Title + subtitle copy per resource | Phase 6 |
| 5 | Scope pills relocated, not lost | Phase 4 (new row) + Phase 5 (CSS) |
| 6 | Reuse l8ui generic hero CSS, no duplication | Phase 0 (lift) + Phase 3 (load CSS) + Phase 5 (delete copy) |
| 7 | Overview gets the same treatment | Phase 4 |
| 8 | No regression in classic sections that use `generate()` | Phase 0 acceptance (byte-identical HTML check) |
| 9 | No regressions in detail popup, rail, context bar | Phase 7 |
| 10 | No mobile regression | Phase 7 |

## Risks / Open Questions

1. **The hero needs space.** `.l8-header-frame` is 120px tall plus a 20px bottom margin, eating ~140px of the main pane. On short viewports the table area gets cramped. The classic sections accept this trade. If the explorer feels too cramped after Phase 4, the hero can be styled shorter via `.k8s-explorer-resource-view .l8-header-frame { height: 80px; }` — explicit override, documented, single rule.
2. **Phase 0's refactor of `_generateHeader` to delegate to `renderHero`.** `generate()` callers (every classic section using the generator) must render byte-identical HTML before and after. Mitigation: make `_generateHeader(config)` a one-liner that calls `renderHero({title: config.title, subtitle: config.subtitle, svgContent: config.svgContent, gradientId: config.gradientId})`. Phase 0's acceptance test compares pre/post HTML output for an existing classic section (e.g. GPUs) to catch any regression.
3. **K8s SVG illustration design quality.** I'm not a designer; the proposed hex-cluster motif is a pragmatic placeholder. If your peer wants to replace it with a hand-designed illustration later, swapping the `Layer8SvgFactory` template is one line.
4. **Subtitle text drift.** The subtitle map is hand-curated. As K8s evolves and new resource types are added, someone has to keep the map in sync. Documented in Phase 6's comment block.

## Out of Scope

- Per-resource bespoke SVGs (deferred — one shared illustration is the right scope here).
- Animations beyond what the hero base CSS already provides (data-flow particles, parallax wobble — those are per-section flourishes the K8s explorer doesn't need yet).
- Restyling the rail or context bar (already done in earlier phases).
- Anything in the classic K8s section (frozen-section contract).
- Mobile (explorer is desktop-only).

## Affected Files
- `web/l8ui/shared/layer8-section-generator.js` — Phase 0: add public `renderHero({title, subtitle, svgKey, svgContent, gradientId})`; rewrite private `_generateHeader` to delegate to it. Generic addition; ≥2 named consumers.
- `web/k8s-explorer.html` — new `<link>` to `layer8-section-layout.css` + `layer8-section-responsive.css`; new `<script>` to `layer8-svg-factory.js` and `k8s-explorer-svg.js`.
- `web/k8s-explorer/js/k8s-explorer-svg.js` — NEW (~80–100 lines, K8s SVG illustration registered with `Layer8SvgFactory`).
- `web/k8s-explorer/js/k8s-explorer-resource-view.js` — replace title block with `Layer8SectionGenerator.renderHero(...)` call; add scope row.
- `web/k8s-explorer/js/k8s-explorer-overview.js` — same hero call for the Overview landing.
- `web/k8s-explorer/js/k8s-explorer-config.js` — add `subtitleFor(itemKey)` helper backed by a small map.
- `web/k8s-explorer/css/k8s-explorer.css` — delete cyan-bar styles, add `.k8s-explorer-scope-row`, possibly tweak `.k8s-explorer-resource-view` / `.k8s-explorer-overview` so the hero bleeds to the edges.

No project-specific code under `web/l8ui/`. No vendor / Go / demo / mobile changes.

## Verification (Phase 7 detail)

After deploy + hard refresh:
1. Open `/probler/app.html` → click "GPUs" in sidebar → note the hero look (gradient, title, subtitle).
2. Open `/probler/k8s-explorer.html` → default Overview landing should have a matching hero (title "Kubernetes Overview", subtitle text, K8s SVG illustration).
3. Click any rail item (Pods, Deployments, Nodes, …) → main pane swaps; the hero updates with the new title + subtitle. The K8s illustration stays the same.
4. Below the hero, a thin scope-pills row shows `[K8SPod] [cluster: Home] [namespace: kube-system]`.
5. Below the scope row, the Layer8DTable mounts and works as before (sticky header, scrolling, row click → detail popup).
6. Switch back to the main app → no visual change in any classic section.
