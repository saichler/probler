# Kubernetes UI Explorer Redesign

## Source
This plan operationalizes the direction in `kubernetes-ui-redesign-notes.md`. The diagnosis ("two stacked tab bars + 41 resource types is past what tabs can handle") and the destination (left rail + cluster/namespace context bar + action-oriented overview + related-resource drill-down + favorites/recents) are kept verbatim. What changes is the rollout: bigger phases are split, missing concerns (mobile, URL state, search backend) get explicit phases, and reusable shell pieces are pulled into `l8ui` so future Probler/L8erp/L8topology sections inherit the same layout for free.

## Strategic Position

This redesign is mostly a **shell** change — data, services, and detail-popup contracts are untouched. It is also the first time Probler will need a non-trivial multi-pane navigator inside a single section, so it is the right opportunity to extract the navigator pieces into `l8ui` rather than build them as one-off K8s code. Every l8ui abstraction proposed below is justified by ≥2 concrete current/near-future consumers; nothing speculative.

## Compliance Notes (Global Rules)

- **Plan approval workflow** — written to `./plans/`, awaiting explicit approval before any implementation begins.
- **Plan-duplication-audit** — every shared piece below is justified by at least two consumers (named in §"L8UI Abstractions"). Project-specific code is reduced to configuration objects passed to factories.
- **L8UI generic-only (`l8ui-no-project-specific-code.md`)** — the new components live under `web/l8ui/...`. They take config (groups, services, filter definitions, action handlers); they do not import anything project-specific.
- **L8UI theme compliance** — all CSS uses `--layer8d-*` tokens; no per-component dark-mode blocks.
- **Mobile rules (`mobile-rules.md`)** — Phase 0 makes an explicit mobile decision. Phase 8 audits mobile parity.
- **Plan traceability** — matrix at the bottom maps every recommendation in the source notes to a phase.
- **Maintainability** — every new file <500 lines; each l8ui abstraction is its own JS file under `web/l8ui/`.
- **Never edit vendor** — no Go-side changes here. If counts or search need new backend endpoints, those will land in sibling Go projects in their own commits and re-vendor cycles.
- **Never edit demo** — `go/demo/` is auto-generated; not touched.
- **Single-responsibility / configuration vs logic** — module-specific files become pure configuration; shell behavior lives in shared code.
- **No silent fallbacks** — counts that fail to load show "—" with a `console.warn`; missing namespaces in the dropdown surface as the ungrouped option, not as "default".

## L8UI Abstractions Introduced

Each abstraction is generic, project-agnostic, and lives under `web/l8ui/...`. The justification column lists current and near-term consumers across the Layer8 ecosystem (probler, l8erp, l8topology, etc.).

| New component | Purpose | Justified by |
|---|---|---|
| **`Layer8DExplorer`** (`l8ui/explorer/`) | Two-pane shell: collapsible-tree left rail + main content slot. Handles selection, expand/collapse state, optional badges (counts, status dots), keyboard navigation. Wraps existing `Layer8DToggleTree` for the tree itself, adds the rail chrome and content-pane orchestration. | Probler K8s (this plan); Probler Network section (which today uses tabs and would benefit); L8erp's hypothetical multi-section browser; L8topology graph + side-list pattern. |
| **`Layer8DContextBar`** (`l8ui/context_bar/`) | Top toolbar that holds a configurable set of context selectors (cluster, namespace, project, scope, …) plus an optional search box. Persists selection in `Layer8DRouter` (below) and emits change events. | Probler K8s (cluster + namespace + search); Probler Hosts (cluster filter); L8erp HCM (department + active-only toggle); any module that needs persistent filter context across views. |
| **`Layer8DRouter`** (`l8ui/shared/layer8d-router.js`) | Tiny URL-hash state sync utility: register named keys, push/replace state, listen for changes. No framework dep. | Every section that wants deep links — K8s (cluster+ns+resource), L8erp (open-record-by-ID), L8logs (path+offset). Required by Phase 2 here. |
| **`Layer8DActionCard`** (`l8ui/dashboard/layer8d-action-card.js`) | Thin wrapper over existing `Layer8DWidget` that adds a typed action target ("on click, open service X with baseWhereClause Y"). Replaces the per-handler boilerplate the K8s overview currently writes inline. | K8s overview (this plan's Phase 4); Probler dashboard widgets that today wire `onClick` ad-hoc; future L8erp KPI cards on the home dashboard. |
| **`Layer8DRelatedResources`** (`l8ui/related/`) | Declarative panel that, given a source entity and a list of relationships, fetches related entities and renders clickable summaries. Each relationship is `{label, lookupModel, baseWhereClause(item), idColumn}`. | K8s pod-to-deployment/node/PVCs (this plan's Phase 6); Network device-to-hosts; Employee-to-manager/reports; Sales order-to-line-items. |
| **`Layer8DFavorites`** + **`Layer8DRecents`** (`l8ui/shared/layer8d-favorites.js`, `layer8d-recents.js`) | LocalStorage-backed lists keyed by namespace string. Pure utility — UI integration is per-consumer. | K8s explorer (this plan's Phase 7); L8erp recently-viewed records; L8logs recent files. |

Notes:
- We deliberately do NOT introduce a new "search engine" abstraction. Search semantics differ enough per domain that a thin in-component search box per consumer is honest. What we extract is the **input chrome** (placeholder, keyboard shortcut, dropdown of jump suggestions) — that's part of `Layer8DContextBar`.
- We do NOT replace `Layer8DToggleTree`. Explorer composes it.
- We do NOT replace `Layer8DWidget`. Action card composes it.

Each abstraction includes desktop and mobile variants in the same file or a sibling `m/` file, following existing l8ui conventions.

## Design

### 1. Layer8DExplorer

Conceptual API:
```js
const explorer = new Layer8DExplorer({
    containerId: 'k8s-explorer',
    groups: [
        { key: 'overview', label: 'Overview', icon: '◉' },
        { key: 'workloads', label: 'Workloads', icon: '⚙', count: 8, items: [
            { key: 'pods', label: 'Pods', count: 1247, status: 'warning' },
            { key: 'deployments', label: 'Deployments', count: 42 },
            ...
        ]},
        ...
    ],
    favorites: [...],   // optional
    recents: [...],     // optional
    onSelect: (groupKey, itemKey) => { ... },
    selected: { group: 'workloads', item: 'pods' }
});
explorer.render();
explorer.setSelected({group, item});
explorer.setCounts({pods: 1247, deployments: 42, ...});  // partial OK
```

Internals: composes `Layer8DToggleTree` for the tree, layers a content `<slot>` to the right, manages collapsed-group state in localStorage so it survives navigation.

**CSS**: theme-token only. Rail width is configurable (default 260px), collapsible to icon-only via a chevron control.

### 2. Layer8DContextBar

Conceptual API:
```js
const bar = new Layer8DContextBar({
    containerId: 'k8s-context-bar',
    contexts: [
        {
            key: 'cluster',
            label: 'Cluster',
            type: 'select',
            optionsFetcher: () => fetchClusters(),
            persistTo: 'k8s.cluster'  // Layer8DRouter key
        },
        {
            key: 'namespace',
            label: 'Namespace',
            type: 'select',
            optionsFetcher: (ctx) => fetchNamespaces(ctx.cluster),
            allowAll: true,
            persistTo: 'k8s.namespace'
        }
    ],
    search: {
        placeholder: 'Search resources...',
        suggestionsFetcher: (q, ctx) => k8sSuggest(q, ctx),
        onSelect: (suggestion) => navigateToResource(suggestion)
    },
    onChange: (ctx) => { /* whole-context delta */ }
});
```

Built on existing `Layer8DReferencePicker` for the actual select inputs (single-source-of-truth for that pattern). Search box is plain `<input>` plus a popover suggestion list.

### 3. Layer8DRouter

Tiny utility:
```js
Layer8DRouter.set('k8s.cluster', 'home');
Layer8DRouter.set('k8s.namespace', 'kube-system');
Layer8DRouter.get('k8s.cluster');                 // 'home'
Layer8DRouter.subscribe('k8s.cluster', fn);
Layer8DRouter.snapshot();                         // {k8s.cluster, k8s.namespace, ...}
```

URL hash format: `#k8s.cluster=home&k8s.namespace=kube-system&k8s.resource=pods`. No framework, ~80 lines.

### 4. Layer8DActionCard

```js
Layer8DActionCard.render({
    icon: '⚠',
    label: 'Pending Pods',
    value: 12,
    severity: 'warning',
    target: {
        groupKey: 'workloads',
        itemKey: 'pods',
        baseWhereClause: 'status=2'
    },
    onClick: (target) => k8sExplorer.navigateTo(target)
});
```

Dispatcher pattern is the same as today's overview — what's extracted is the boilerplate (status class lookup, click forwarding, badge rendering).

### 5. Layer8DRelatedResources

```js
Layer8DRelatedResources.render({
    container: detailBody,
    entity: pod,
    relations: [
        { label: 'Owner Deployment', lookupModel: 'K8SDeployment',
          baseWhereClause: (p) => `name=${ownerName(p)}`, max: 1 },
        { label: 'Node', lookupModel: 'K8SNode',
          baseWhereClause: (p) => `name=${p.node}`, max: 1 },
        { label: 'PersistentVolumeClaims', lookupModel: 'K8SPersistentVolumeClaim',
          baseWhereClause: (p) => `namespace=${p.namespace}`, filter: matchPVCs },
        ...
    ],
    onSelectRelated: (entity, model) => K8sDetail.show(entity, lookupService(model))
});
```

Each row in the panel is a clickable summary that opens the related entity's detail popup. Empty-state and parse-failure follow the non-silent-fallback rule.

### 6. Layer8DFavorites / Layer8DRecents

Pure utilities, no UI:
```js
Layer8DFavorites.add('k8s', { type: 'pods', label: 'Pods' });
Layer8DFavorites.list('k8s');
Layer8DFavorites.remove('k8s', 'pods');

Layer8DRecents.touch('k8s', { type: 'pod', id: 'kube-system/coredns', label: '…' });
Layer8DRecents.list('k8s', 10);
```

Storage namespace per consumer prevents collisions across sections.

## Phase Breakdown

### Phase 0 — Foundations (no user-visible change)

**0a. Mobile strategy decision (write-down only).**
Mobile already uses `Layer8MNav` card-based hierarchical navigation, which is functionally what the desktop explorer is becoming. Decision: **mobile keeps its current navigator**; this redesign is desktop-only. Phase 8 will verify no regressions on mobile. This is documented in this plan and in a comment in the K8s mobile module.

**0b. Add `Layer8DRouter`** to `l8ui/shared/`. ~80 lines, hash-based, no framework. Tested by manual browser-back round-trip.

**0c. Audit existing `Layer8DToggleTree` API** to confirm it can host the rail tree. If it lacks per-node `count` or `status` decoration, propose a thin extension as a separate l8ui PR before Phase 1 starts.

### Phase 1 — `Layer8DExplorer` (l8ui) + K8s explorer shell

1. Implement `Layer8DExplorer` in `l8ui/explorer/` (component + CSS + optional mobile sibling). API as in §1 above.
2. Replace `.k8s-category-bar` + `.k8s-service-bar` in `web/sections/kubernetes.html` with an Explorer container.
3. Refactor `web/kubernetes/kubernetes-init.js` to feed the existing `Probler.k8sCategories` definitions into `Layer8DExplorer.groups`. Remove the old tab-rendering code.
4. Existing `K8sTables.create(serviceKey)` and `K8sDetail.show(item, service)` are untouched — only the navigation event source changes (from tab click to explorer select).
5. CSS housekeeping: drop `.k8s-category-bar` / `.k8s-service-bar` rules; the new layout's chrome is owned by `Layer8DExplorer`.

Acceptance: every K8s tab still opens the same content as before; the only visible change is the navigator chrome.

### Phase 2 — Cluster + Namespace context bar

1. Implement `Layer8DContextBar` in `l8ui/context_bar/`.
2. Replace the existing inline cluster dropdown in `kubernetes-init.js` with a `Layer8DContextBar` config that registers `cluster` and `namespace` contexts.
3. Wire context-bar `onChange` to update each table's `baseWhereClause` and refetch:
   - For cluster-scoped: `cluster_name='X'`
   - For namespace+cluster: `cluster_name='X' and namespace='Y'`
   - "All namespaces" → cluster only
4. Persist selection through `Layer8DRouter` so a refresh keeps the operator's context.

Acceptance: refreshing the page on Pods view in `home/kube-system` returns to the same view; switching namespace updates every K8s tab; "All namespaces" works for cluster-scoped tabs (Nodes, Namespaces, CRDs, PVs, StorageClasses, ClusterRoles, ClusterRoleBindings).

### Phase 3 — Counts beside groups (use existing summary)

1. Use the existing 30-second `K8SCluster` summary (already published by adcon). For each group, compute the count from summary fields (`total_pods`, `total_deployments`, `total_services`, …).
2. Push counts into `Layer8DExplorer.setCounts({pods: 1247, ...})` whenever the cluster summary refreshes.
3. **No per-resource fetches.** Stale-by-≤30s is acceptable here and was already accepted for Overview.
4. Empty count → render no badge (not "0"), per non-silent-fallback rule.

Acceptance: counts appear next to each group/item; switching clusters updates counts; counts go away when summary fails to load (with a `console.warn`).

### Phase 4 — Action-oriented Overview (Layer8DActionCard)

1. Implement `Layer8DActionCard` in `l8ui/dashboard/`.
2. Rewrite `web/kubernetes/kubernetes-overview.js` to use `Layer8DActionCard.render` for every KPI, supplying a `target` of `{groupKey, itemKey, baseWhereClause}`.
3. Defined targets (initial set, all derivable from `K8SClusterSummary`):
   - **Pending Pods** → Pods view, `status=2` (K8S_POD_STATUS_PENDING)
   - **Failing Pods** → Pods view, `status in (4,6,9,10)` (Failed/CrashLoop/ImagePull/Error)
   - **Unavailable Deployments** → Deployments view, `available!=ready`
   - **Failing Jobs** → Jobs view, `condition=2` (FAILED)
   - **Warning Events** → Events view, `type='Warning'`
   - **Storage** group totals → PV view (no filter)
   - **Top namespaces by pod count** — defer to Phase 5 (needs server-side aggregation).
4. Card click invokes `k8sExplorer.navigateTo(target.groupKey, target.itemKey)` and the table receives the `baseWhereClause` before mounting.

Acceptance: Overview is no longer a pile of count tiles — every card is a verb. Click-through opens the right pre-filtered view. Refreshing the URL after a click preserves the filtered state.

### Phase 5 — Search

This phase is held until a search backend decision is made. Two options, both small, but they have different cost models:

- **5a. Client-side fuzzy search over the current page's loaded rows.** Limited to what the user has already fetched; useful only for refining an open table. Trivial to implement.
- **5b. Server-side jump-to-resource** — a new lightweight K8s search service (or an L8Query pattern fanning out across the K8s caches) that returns `{resourceType, namespace, name}` matches. Bigger work; correct answer for the operator workflow described in the source notes.

We will land 5a first (within this redesign) and write a separate plan for 5b.

Acceptance for 5a: typing in the context-bar search filters the current table by name (or label, if present) without re-fetching.

### Phase 6 — Related-resource drill-down (Layer8DRelatedResources)

1. Implement `Layer8DRelatedResources` in `l8ui/related/`.
2. Add a new "Related" tab to the K8s detail popup (renders `Layer8DRelatedResources`).
3. Define relationships per type (initial set, kept conservative):
   - **Pod**: Owner (Deployment / DaemonSet / StatefulSet / Job derived from `metadata.ownerReferences` once we plumb it through), Node (by `spec.nodeName`), Service (by label match), PVC (by `spec.volumes[*].persistentVolumeClaim.claimName`).
   - **Deployment**: ReplicaSets (by ownerRef), Pods (transitively), HPAs (by `spec.scaleTargetRef`).
   - **Service**: Endpoints (same ns/name), EndpointSlices (label `kubernetes.io/service-name`), Ingresses (back-ref).
   - **Namespace**: a curated list of "all resources in this namespace" with one-click jumps.

Several of these relations need new server-side support (ownerReferences index, label-match queries). Each relation declaration documents whether it works with the current backend or needs a follow-up. Phase 6 ships only the relations that work without backend changes; the others are stub-marked "(coming soon)" so the UI doesn't lie about completeness.

Acceptance: pod detail shows Node + PVCs + matching Services. Deployment detail shows HPA + Pods. Empty relations show "—". Backend-blocked relations are marked clearly, not silently empty.

### Phase 7 — Favorites + Recents

1. Implement `Layer8DFavorites` and `Layer8DRecents` in `l8ui/shared/`.
2. K8s consumer: explorer rail gains a "Favorites" group at the top (pinned resource types) and a "Recent" group (recently selected resource types + recently opened object IDs).
3. Right-click on a rail item or a "★" affordance toggles a favorite. Selecting any rail item calls `Layer8DRecents.touch`. Opening any detail popup also calls `Layer8DRecents.touch` with the object key.

Acceptance: pinning Pods, refreshing the page, Pods stays at the top of the rail. Recent items decay (capped at e.g. 10).

### Phase 8 — End-to-end verification

For desktop:
1. Open Kubernetes section. Confirm explorer rail renders with all groups and counts.
2. Pick a cluster + namespace; refresh; confirm same context restored.
3. Click each Overview action card; confirm the right tab opens with the right baseline filter and the URL reflects it.
4. Open a pod detail; confirm the Related tab shows Node + PVCs (others stubbed).
5. Pin Pods; refresh; confirm Favorites group has Pods at top.
6. Use the search box; confirm filter narrows the current table.
7. Resize the window narrow; confirm the rail collapses to icons (or a hamburger) gracefully.

For mobile:
- No structural change. Just walk through every K8s tab on mobile and confirm the existing `Layer8MNav` flow still works (no regression from the desktop redesign).

## Traceability Matrix

| # | Source notes recommendation | Phase |
|---|---|---|
| 1 | Replace tab-on-tab with left explorer rail | Phase 1 |
| 2 | Add global resource search | Phase 5 (5a in this plan; 5b in a follow-up) |
| 3 | Promote namespace to first-class filter | Phase 2 |
| 4 | Reduce information architecture | Phase 1 (group definitions in the explorer config — uses the merge proposed in the notes, with my pushback that **Namespaces stays standalone** in a "Tenancy" group rather than under "Platform") |
| 5 | Make Overview the real landing experience | Phase 4 |
| 6 | Related-resource drill-down | Phase 6 |
| 7 | Favorites + Recents | Phase 7 |
| Toolbar | Cluster + Namespace + Search in a top toolbar | Phase 2 (cluster/ns) + Phase 5 (search) |
| Detail | Right-side drawer (notes) — kept as popup for now to avoid breaking K8sDetail.show callers; can revisit in a separate plan | Deferred (intentional) |
| Saved views | Mentioned in Phase 4 of the source notes | Deferred — separate plan if user demand emerges |
| URL state | Not in source notes; required for namespace-pivoting workflows | Phase 0b (`Layer8DRouter`) |
| Mobile | Not in source notes | Phase 0a decision + Phase 8 verification |
| L8UI extraction | Not in source notes; per `plan-duplication-audit` | Each abstraction is created in the phase that first uses it |

## Risk / Open Questions

1. **`Layer8DToggleTree` extension** — the component may need per-node `count` and `status` decoration support. Phase 0c determines this; if needed, becomes a small pre-PR.
2. **Cross-section l8ui consumers materializing** — every l8ui abstraction in this plan is justified by ≥1 immediate consumer (K8s) and named near-term consumers. If those don't materialize, the abstractions are still useful but become at-cost in maintenance. Acceptable risk.
3. **URL state collisions** — `Layer8DRouter` namespaces by section prefix (`k8s.*`); if other sections also need it, they pick their own prefix. Documented.
4. **Counts-from-summary is stale by ≤30s** — explicit and acceptable. Counts that need real-time accuracy can opt-in to per-resource refetches in a future PR.
5. **Backend work for relationships and search 5b** — gated to follow-up plans, not this one.

## Affected Sibling Projects

None for this plan. All changes are inside probler's `web/` tree (and inside `web/l8ui/` for the new abstractions). Backend work for relationships and search 5b will be filed as separate plans against `l8inventory` / probler service binaries.

## Out of Scope

- Switching K8s detail from popup → right-side drawer (worth doing later; not blocking).
- New backend services for relationships and full-fan search (Phases 5b and the harder relationships in Phase 6).
- Any change to `K8sTables.create` or `K8sDetail.show` signatures — they remain stable.
- Mobile redesign — current mobile navigator stays.
