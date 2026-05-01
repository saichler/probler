# Kubernetes Explorer — New Portal

## Source
This plan supersedes `k8s-explorer-redesign.md`. The peer review concluded: **don't change the existing Kubernetes section.** Instead, ship a separate "Kubernetes Explorer" portal alongside the current Probler console. Operators choose by portal switcher; both coexist; neither blocks the other. The diagnosis and target experience are still those in `kubernetes-ui-redesign-notes.md`.

## Architecture Decision (locked in)

- **A. Portal-switcher within Probler.** Concretely, in this codebase a "portal" is a sibling HTML page served by the same web server, shared bearer token (sessionStorage), shared theme + l8ui includes. `Layer8DPortalSwitcher` already navigates between portals by URL (`window.location.href`). This is the cleanest, lowest-friction option — no separate auth, no separate bundle, no duplicate login flow.
- **A. Desktop-only.** Mobile users continue to use the existing Kubernetes section through the standard Probler mobile shell. The explorer portal is not registered on mobile; the portal switcher dropdown will simply not list it on the mobile shell. A mobile variant can be filed as a separate plan later.

## Spirit Preserved

Every recommendation from `kubernetes-ui-redesign-notes.md` lands in this plan — but only inside the new portal. The existing K8s section is **frozen** (defined below). Everything the original notes ask for happens in `k8s-explorer.html`:

1. Left explorer rail (replaces tab-on-tab) — Phase 2
2. Cluster + Namespace + Search top toolbar — Phase 3 + 6
3. Reduced information architecture — Phase 2 group definitions
4. Action-oriented Overview — Phase 5
5. Related-resource drill-down — Phase 7
6. Favorites + Recents — Phase 8
7. Counts beside groups — Phase 4

## Strategic Position

- **Existing Kubernetes section: frozen.** No new features land in `web/sections/kubernetes.html` / `web/kubernetes/*.js` / `web/probler/k8s/*.js`. Bug fixes only. This is the supported "classic" experience.
- **New Kubernetes Explorer portal: greenfield.** Free to choose any layout, any UX, any conventions. Not bound by tab-grid compatibility.
- **L8UI abstractions are shared.** The new portal builds shell components that are reusable across future Probler/L8erp/L8topology portals; we don't bake them into the explorer alone.

## Frozen-Section Contract (operational rule, lives in the plan and in CLAUDE.md after approval)

The existing K8s section accepts:
- Bug fixes that are equally applicable to both shells (e.g. status enum mappings, parser fixes, proto additions). These typically live in the data layer, not the UI.
- Security and accessibility fixes.

The existing K8s section does NOT accept:
- New views, new tabs, new categories.
- New filters or context bars.
- New navigation patterns.
- Any feature requested in `kubernetes-ui-redesign-notes.md` (those land only in the explorer).

If a future change is needed in both, this plan's owner has to decide explicitly — the default is "explorer only."

## L8UI Abstractions Introduced

Each is project-agnostic, lives under `web/l8ui/...`, and is justified by ≥2 named consumers. Same set as the previous plan; the rationale stands because the explorer portal is an even cleaner consumer than a retrofit would be.

| Component | Path | Justified by |
|---|---|---|
| **`Layer8DExplorer`** | `l8ui/explorer/` | K8s explorer portal; potential Probler Network explorer; L8topology side-list; L8erp module browser |
| **`Layer8DContextBar`** | `l8ui/context_bar/` | K8s explorer (cluster + namespace + search); Probler Hosts (cluster filter); L8erp HCM (department + active toggle) |
| **`Layer8DRouter`** | `l8ui/shared/layer8d-router.js` | K8s explorer deep links; L8erp open-record-by-ID; L8logs path+offset |
| **`Layer8DActionCard`** | `l8ui/dashboard/layer8d-action-card.js` | K8s explorer overview; future L8erp KPI dashboards; Probler dashboard widgets |
| **`Layer8DRelatedResources`** | `l8ui/related/` | K8s pod-to-deployment/node/PVCs; Probler network device-to-hosts; L8erp employee-to-manager/reports; sales-order-to-line-items |
| **`Layer8DFavorites`** + **`Layer8DRecents`** | `l8ui/shared/` | K8s explorer; L8erp recently-viewed records; L8logs recent files |

We deliberately do NOT introduce:
- A `Layer8DLayoutSwitcher` — the portal switcher already covers this need; a new abstraction for one consumer is over-engineering.
- A new search-engine abstraction — domain-specific. The input chrome (placeholder, dropdown of suggestions) lives in `Layer8DContextBar`; query semantics live in the explorer portal's glue code.
- A replacement for `Layer8DToggleTree` — `Layer8DExplorer` composes it.

## Compliance Notes (Global Rules)

- **Plan approval workflow** — written to `./plans/`, awaiting explicit approval before any implementation.
- **Plan-duplication-audit** — every l8ui abstraction has ≥2 named consumers. Project-specific code reduced to configuration objects passed to factories. The duplication that *could* arise (existing K8s section vs new portal) is bounded by the frozen-section contract above.
- **L8UI generic-only (`l8ui-no-project-specific-code.md`)** — new components live under `web/l8ui/...`; no project-specific imports.
- **L8UI theme compliance** — all CSS uses `--layer8d-*` tokens; no per-component dark-mode blocks.
- **Plan traceability** — matrix at the bottom maps every recommendation in the source notes to a phase.
- **Maintainability** — every new file <500 lines; each l8ui abstraction is its own JS file.
- **Never edit vendor / never edit demo** — no Go-side changes here. Backend work for relationships and full search will be filed as separate plans against `l8inventory` / probler service binaries.
- **No silent fallbacks** — counts that fail to load show no badge with a `console.warn`; missing namespaces in the dropdown surface as the ungrouped option, not synthesized as "default"; relationships that need backend work that isn't there yet show "—" with a console hint, never a fake row.
- **Layer8DPortalSwitcher (`shared`)** — used as-is. The new portal registers in `login.json` under `app.portals` (or via the L8Portal service when it's configured).
- **Login redirect** — both portals share `/login.html`. The explorer portal's `redirectUrl` in its own login.json (or via `?redirect=` query) points back to `/k8s-explorer.html` so users return to the right portal after auth.

## Architecture in Detail

### Portal page layout

New file: `web/k8s-explorer.html`. Same general shape as `app.html`:

```
+-----------------------------------------------------------+
| Header: logo  | [Cluster] [Namespace] [Search]  | portal▾ |
+-----------------------------------------------------------+
| ┌─────────────┐                                           |
| │ Explorer    │  Main content                             |
| │  Favorites  │                                           |
| │  Recents    │                                           |
| │  Overview   │                                           |
| │  Workloads  │                                           |
| │   Pods      │                                           |
| │   ...       │                                           |
| └─────────────┘                                           |
+-----------------------------------------------------------+
```

- **Header**: same theme as Probler. Hosts the `Layer8DContextBar` (cluster, namespace, search) and `Layer8DPortalSwitcher` (so users can jump back to the classic Probler console).
- **Left rail**: `Layer8DExplorer` instance fed by group/service definitions specific to K8s (Workloads, Networking, Storage, Config & Access, Tenancy, Mesh, Events).
- **Main content**: a single content slot. Selecting a rail item swaps the slot content. Selecting "Overview" shows the action-oriented dashboard.

### Reusing existing pieces

- `Layer8DTable` for resource lists.
- `K8sDetail.show(item, service)` for detail popups — the existing function is already independent of the section shell. The portal calls it as-is; no signature changes.
- `K8SCluster` summary endpoint (already published every 30s by adcon) drives counts and overview cards.
- `Layer8DConfig` for the API prefix; the portal does not duplicate URL construction.

### What's new code

| File | Purpose |
|---|---|
| `web/k8s-explorer.html` | Portal shell. |
| `web/k8s-explorer/css/k8s-explorer.css` | Layout chrome + per-portal tweaks. Uses `--layer8d-*` tokens. |
| `web/k8s-explorer/js/k8s-explorer-init.js` | Portal bootstrap: load config, init router/context-bar/explorer/content router. |
| `web/k8s-explorer/js/k8s-explorer-config.js` | Group/service definitions for the rail. |
| `web/k8s-explorer/js/k8s-explorer-overview.js` | Action-card overview page. |
| `web/k8s-explorer/js/k8s-explorer-resource-view.js` | Generic resource list view (reuses `Layer8DTable`). |
| `web/k8s-explorer/js/k8s-explorer-search.js` | Phase 6 search glue (client-side initially). |
| `web/k8s-explorer/js/k8s-explorer-related.js` | Phase 7 related-resources tab content. |
| `web/k8s-explorer/js/k8s-explorer-favorites.js` | Phase 8 favorites/recents wiring. |

Plus the l8ui abstractions in their own files, each <500 lines.

## Phase Breakdown

### Phase 0 — Foundations
- **0a.** Add `Layer8DRouter` (`l8ui/shared/layer8d-router.js`). ~80 lines. Hash-based, no framework. Exposed as `Layer8DRouter.{set, get, subscribe, snapshot}`.
  - **STATUS: Implemented.** Final API: `set/setMany/get/snapshot/subscribe/subscribeAll`. ~210 lines (slightly larger than the estimate due to defensive listener-error handling and a setMany batch-write path; still well under the 500-line guideline). `node -c` clean.
- **0b.** Audit `Layer8DToggleTree` for the per-node `count` and `status` decoration the explorer rail needs.
  - **STATUS: Audit complete. Decision: do NOT compose `Layer8DToggleTree`.**
  - Reason: ToggleTree is purpose-built for SYS module enable/disable UX — every node renders a checkbox + foundation badge + dependency cascade logic that the explorer rail does not need. The explorer needs single-selection highlighting, per-node count and status decoration, and a select-callback. Adapting ToggleTree would mean stripping ~80% of its code paths conditionally, which is messier than building the rail natively.
  - Phase 2 will implement `Layer8DExplorer`'s tree from scratch in `l8ui/explorer/`. Plan §"What we do NOT introduce" already mentioned not replacing ToggleTree; the audit confirms the inverse — we also don't compose it.
- **0c.** Register `Kubernetes Explorer` in `login.json` (`app.portals` map) so `Layer8DPortalSwitcher` lists it on the existing app. Initially the page can be a stub ("Coming soon") to validate the switcher path before any real UI exists.

### Phase 1 — Portal scaffold
1. Create `web/k8s-explorer.html` with the canonical Probler header + theme + l8ui include order. Body holds an empty header bar and an empty `<main>` slot.
2. Create `web/k8s-explorer/{css,js}/` directories.
3. Wire `Layer8DConfig.load()`, `requireAuth`, theme initialization. Reuse the same auth flow as `app.html`.
4. Verify the portal switcher round-trip: click switcher in the classic Probler app → land on `k8s-explorer.html` → click switcher → return to `app.html`. Bearer token persists; no re-login.

Acceptance: stub portal renders, theme matches, switcher works both ways.

### Phase 2 — `Layer8DExplorer` + rail with K8s groups (no content yet)
1. Implement `Layer8DExplorer` in `l8ui/explorer/`. API:
   ```js
   const exp = new Layer8DExplorer({
       containerId, groups, favorites, recents,
       onSelect: (groupKey, itemKey) => {},
       selected: { group, item }
   });
   exp.render();
   exp.setSelected({group, item});
   exp.setCounts({pods: 1247, ...});
   exp.setStatus({pods: 'warning', ...});
   ```
2. Create `k8s-explorer-config.js` with the group/service definitions. Group structure (per the source notes' info-architecture reduction, with my pushback that **Tenancy** stays distinct):
   - `Overview`
   - `Workloads` (Pods, Deployments, StatefulSets, DaemonSets, ReplicaSets, Jobs, CronJobs, HPA)
   - `Networking` (Services, Ingresses, NetworkPolicies, Endpoints, EndpointSlices, IngressClasses)
   - `Storage` (PVs, PVCs, StorageClasses)
   - `Config & Access` (ConfigMaps, Secrets, ResourceQuotas, LimitRanges, PDBs, ServiceAccounts, Roles, RoleBindings, ClusterRoles, ClusterRoleBindings)
   - `Tenancy` (Namespaces, vClusters, CRDs)
   - `Mesh` (Istio resources)
   - `Events`
3. Mount the explorer in the portal. No content swap yet — selection is a no-op log.

Acceptance: rail renders all groups, expand/collapse persists across reload, group keyboard nav works.

### Phase 3 — `Layer8DContextBar` + cluster + namespace
1. Implement `Layer8DContextBar` in `l8ui/context_bar/`. Built on existing `Layer8DReferencePicker` for the actual select inputs.
2. Configure two contexts in the portal: `cluster` and `namespace`. Selection is persisted via `Layer8DRouter` (`k8s.cluster=…&k8s.namespace=…`).
3. Cluster options come from the existing `K8SCluster` list. Namespace options come from `K8SNamespace` filtered by the selected cluster (server-side). "All namespaces" is supported.
4. The context bar emits a `change` event the portal subscribes to.

Acceptance: refreshing the page restores cluster + namespace; "All namespaces" works for cluster-scoped resource types (Nodes, Namespaces, CRDs, PVs, StorageClasses, ClusterRoles, ClusterRoleBindings).

### Phase 4 — Counts beside groups (use existing summary)
1. Subscribe to `K8SCluster` summary every 30s for the selected cluster.
2. Map summary fields (`total_pods`, `running_pods`, `total_deployments`, …) to explorer rail counts via `exp.setCounts({...})`.
3. Map status hints (e.g. `failed_pods > 0` → `warning` on the Pods row) via `exp.setStatus({...})`.
4. **No per-resource fetches.** Stale-by-≤30s is explicit and documented in the source notes' philosophy.
5. Empty count = no badge (not "0"). Failed summary fetch = no counts + `console.warn`.

Acceptance: counts appear next to each group/item; switching clusters refreshes counts; counts disappear cleanly when summary is unavailable.

### Phase 5 — Resource views + action-oriented Overview
1. Implement `k8s-explorer-resource-view.js`: given a service definition, renders a `Layer8DTable` in the main content slot. Uses the same column definitions as the classic K8s section (imported from `web/probler/k8s/k8s-columns.js` and `k8s-columns-ext.js`) — no duplication.
2. Wire context-bar `cluster` / `namespace` / search filters into each table's `baseWhereClause`:
   - `cluster_name='X'` for all
   - `namespace='Y'` when a namespace is selected and the resource is namespaced
3. Implement `Layer8DActionCard` in `l8ui/dashboard/`.
4. Implement `k8s-explorer-overview.js`: action cards for the workflows the source notes call out:
   - Pending Pods → Pods view, `status=2`
   - Failing Pods → Pods view, `status in (4,6,9,10)`
   - Unavailable Deployments → Deployments view, `available!=ready` (when expressible)
   - Failing Jobs → Jobs view, `condition=2`
   - Warning Events → Events view, `type='Warning'`
   - Storage health → PVs, no filter (drill-down is informational)
   - Top namespaces by pod count → deferred (needs server-side aggregation)
5. Card click: `Layer8DRouter.set('k8s.resource', ...)` + apply `baseWhereClause` to the resource view.

Acceptance: every Overview card opens the right pre-filtered view; the URL reflects it; back-button returns to the prior view.

### Phase 6 — Search (client-side)
1. The `Layer8DContextBar` search input emits keystrokes.
2. The portal applies a simple "name contains" client-side filter on the currently-loaded table page.
3. **Server-side jump-to-resource is deferred** to a separate plan; the search input documents the limitation in its placeholder ("Search current view...").

Acceptance: typing narrows the visible rows in the current resource view. Switching resource clears the search.

### Phase 7 — Related-resource drill-down
1. Implement `Layer8DRelatedResources` in `l8ui/related/`.
2. Add a "Related" tab to the K8s detail popup (the existing `K8sDetail.show` is extended *only* in the new portal's wrapper, not in the classic section's call site).
3. Initial relations (only those workable with the current backend):
   - Pod → Node (by `spec.nodeName`); PVC list (parsed from `containers_json` volume mounts when present).
   - Service → matching Pods (by namespace + label match — feasible client-side after a list fetch).
   - Namespace → "all resources in this namespace" via group jumps.
4. Relations that need backend work (ownerReferences index, full label-match queries) render as "(coming soon)" — the UI does not silently empty them.

Acceptance: pod detail Related tab shows Node + PVC names. Service Related tab shows matching pods. Operator can click through to those entities.

### Phase 8 — Favorites + Recents
1. Implement `Layer8DFavorites` and `Layer8DRecents` in `l8ui/shared/`. Pure utilities, localStorage-backed, namespaced by consumer.
2. Explorer portal: rail gains a Favorites group at the top (pinned resource types) and a Recents group (recently selected resource types + recently opened object IDs).
3. Right-click on a rail item or a "★" affordance toggles a favorite. Selecting any rail item calls `Recents.touch`. Opening any detail popup also calls `Recents.touch` with the object key.

Acceptance: pinning Pods, refreshing → Pods stays in Favorites at the top of the rail. Recents capped at 10, decays in LRU order.

### Phase 9 — End-to-end verification
For desktop:
1. From the classic Probler app, click portal switcher → land on Kubernetes Explorer. Verify auth persists.
2. Pick cluster + namespace → refresh → state restored.
3. Click each Overview card → correct pre-filtered resource view opens; URL reflects; back-button works.
4. Open a pod detail → Related tab shows Node + PVCs.
5. Pin Pods → refresh → still pinned.
6. Use the search box → current view narrows.
7. Switch back to classic Probler app → existing K8s section unchanged from before this plan.

For mobile:
- Verify the portal switcher does NOT show Kubernetes Explorer on mobile (or shows it disabled with a tooltip if that's better UX — implementation choice in Phase 0c).
- Verify the existing K8s mobile flow is unchanged.

## Traceability Matrix

| # | Source notes recommendation | Phase |
|---|---|---|
| 1 | Replace tab-on-tab with left explorer rail | Phase 2 (in the new portal; classic section keeps its tabs) |
| 2 | Add global resource search | Phase 6 (client-side; full server-side search is a follow-up plan) |
| 3 | Promote namespace to first-class filter | Phase 3 |
| 4 | Reduce information architecture | Phase 2 group definitions (with Tenancy split out from Platform per my evaluation pushback) |
| 5 | Make Overview the real landing experience | Phase 5 |
| 6 | Related-resource drill-down | Phase 7 |
| 7 | Favorites + Recents | Phase 8 |
| Toolbar (cluster + namespace + search) | Phase 3 + 6 |
| Detail panel (right-side drawer) | Deferred — popup retained for now to share `K8sDetail.show` with the classic section. A drawer variant can be a separate plan. |
| URL state | Phase 0a (`Layer8DRouter`) |
| Mobile | Decision in Phase 0c (off by default); no implementation in this plan |
| L8UI extraction | Each abstraction is created in the phase that first uses it |
| Existing K8s section unchanged | Frozen-section contract; verified in Phase 9 step 7 |

## Risk / Open Questions

1. **Auth redirect after login** — login.html currently redirects to `app.html`. When a user logs in from the explorer portal directly, they should land back there. The simplest fix: pass `?redirect=/k8s-explorer.html` to login. Phase 1 includes this.
2. **L8Portal service availability** — `Layer8DPortalSwitcher` falls back to login.json's portals map if the L8Portal service is not configured. This plan registers via login.json initially; service-side registration can come later without code changes.
3. **Column definitions are imported from the classic section's files** — that creates a soft dependency. If the classic section is ever removed (not planned), the explorer would need to keep its own copies. Acceptable risk; the column definitions are pure data and not coupled to the classic shell.
4. **Counts are stale by ≤30s** — explicit and acceptable per the source notes.
5. **Backend work for relationships and full search** — gated behind separate plans, never silently empty in the UI.
6. **Mobile expansion** — explicitly out of scope; a future plan can decide whether mobile gets its own variant.

## Affected Sibling Projects

None. All changes are inside probler's `web/` tree (and inside `web/l8ui/` for the new abstractions).

## Out of Scope (this plan)

- Modifying the existing Kubernetes section (frozen).
- Server-side search implementation (Phase 6 is client-side only).
- Full ownerReferences-based relationships in detail (Phase 7 is what's feasible without backend work).
- Mobile explorer.
- Switching K8s detail from popup to right-side drawer.
- Layer8DLayoutSwitcher or any new abstraction not directly used by this portal.
