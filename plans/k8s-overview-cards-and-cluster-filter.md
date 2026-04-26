# K8s Overview cards + cluster filter UX

## PRD compliance checklist

Per `prd-compliance.md`, this PRD must comply with the global rules at
`../l8book/rules` and the Layer 8 ecosystem architecture (`l8erp` reference).
Each rule that applies to this change is listed below with how the PRD
satisfies it.

| Rule | Applies? | How this PRD complies |
|------|----------|------------------------|
| `prd-compliance.md` | Yes | This explicit checklist; no Layer-8 architecture deviations introduced. |
| `plan-approval-workflow.md` | Yes | Plan written to `./plans/`; awaiting user approval before any implementation. |
| `plan-traceability-and-verification.md` | Yes | Traceability matrix + final verification phase (Phase 6). |
| `plan-duplication-audit.md` | Yes | Phase 5 Step-2 extracts a shared `kubernetes-overview-kpis.js` module before mobile is built; per-platform glue stays config-only. |
| `platform-conversion-data-flow.md` | Yes | Phase 5 Step-0 feature inventory + Step-1 data-flow trace before any mobile code. |
| `mobile-rules.md` | Yes | Phase 5 mirrors every desktop UX behavior on mobile; no platform-only feature. |
| `prd-compliance.md` (UI rules → l8ui) | Yes | Phase 3 uses `Layer8DWidget.renderEnhancedStatsGrid`; Phase 5 uses `Layer8MWidget`. No custom card grid or table for KPI rendering. |
| `layer8d-widget.md` / `layer8m-*` | Yes | Dashboard cards rendered by the l8ui widget primitives, not custom HTML. |
| `l8query-rules.md` | Yes | All GETs use `?body=` with an L8Query string and `select *` for detail-style fetches. |
| `js-protobuf-field-names.md` | Yes | L8Query field names use the protobuf JSON name (`name`, lowercase) not the Go name (`Name`). |
| `protobuf-model-names.md` | Yes | Type names used (`K8SCluster`, `K8SClusterSummary`) match the protobuf definitions. |
| `proto-list-convention.md` | N/A | No new list types introduced. |
| `proto-enum-zero-value.md` | N/A | No new enums introduced. |
| `prime-object-references.md` | Yes | `K8SCluster` references `K8SClusterSummary` as an embedded child (no cross-prime-object struct refs). |
| `maintainability.md` | Yes | New files target ≤ 250 lines; split strategy noted if growth approaches 500. Shared abstraction extracted in Phase 5 Step-2. |
| `l8ui-theme-compliance.md` | Yes | Layout uses `--layer8d-*` tokens via `Layer8DWidget`; no hardcoded colors. |
| `l8ui-no-project-specific-code.md` | Yes | KPI definitions and Overview glue live under `web/kubernetes/` and `web/m/` (probler), not in shared l8ui. |
| `desktop-script-loading-order.md` / `mobile-script-loading-order.md` | Yes | New `web/kubernetes/kubernetes-overview*.js` loaded after l8ui widget scripts; equivalent on mobile. |
| `protobuf-generation.md` | Yes | Phase 0 runs `proto/make-bindings.sh` after editing `k8s.proto`. |
| `k8s-yaml-required-entries.md` / `deployment-artifacts.md` | N/A | No new K8s services or images. |
| `mock-data-generation.md` | N/A | No new mock data; UI tests use live data. |
| `run-local-script.md` | N/A | No new run-local sequence introduced. |
| `never-edit-vendor.md` | Yes | All edits are in source repos (`probler` + minor proto regen); no vendor edits. |
| `demo-directory-sync.md` | Yes | `go/demo/` is auto-generated; no edits planned there. |

## Goal

Replace the current empty "Overview" tab with a single-cluster summary view that
makes the existing 11 K8s sub-tabs (Workloads, Networking, Storage, …) easier
to navigate, and make the existing cluster dropdown the global filter for every
sub-tab table.

## What the user will see

Top of the K8s section (always visible):
- Cluster dropdown (selecting a cluster sets a global `selectedCluster` state).

Overview tab (default):
- Title: "Cluster: <selectedCluster>" with cluster meta (k8s version, platform).
- A grid of **11 category cards**, one per other category tab. Each card shows:
  - Category icon + label
  - The 1–3 most-relevant counts (e.g. Workloads: `pods running/total`,
    `deployments available/total`; Storage: `PVs`, `PVCs bound/total`,
    `StorageClasses`; etc.).
  - Click anywhere on the card → activate that category's tab (no separate
    selection of a sub-service; user can pick a sub-service inside the category
    once the tab is active, like today).

Other category tabs (Workloads / Networking / …):
- Existing layout (sub-tabs + table).
- Every L8Query the table issues is automatically filtered with
  `clusterName=<selectedCluster>`.
- Switching the dropdown → re-fetch every visible table.

## Data flow

```
adcon (one per cluster, in the K8s pod)
  └── periodically (every 30s) reads counts from the shared informer caches
        nodes/pods/deployments/.../events
      computes K8SClusterSummary counts
      builds K8SCluster{Name, K8sVersion, Platform, Summary}
      vnic.Multicast / Leader -> (KCluster, 10) PATCH

inv_k8s K8SCluster cache
  └── stores one row per cluster, keyed by Name

UI Overview tab
  └── on tab activation + on dropdown change:
        GET /probler/10/KCluster?body=select * from K8SCluster where name=<selectedCluster>
        render cards from the returned Summary using Layer8DWidget
```

L8Query field names use the protobuf JSON name (`name`, lowercase) per
`l8query-rules.md` / `js-protobuf-field-names.md`.

`K8SClusterSummary` already has count fields for nodes/pods/deployments/
services/namespaces/PVCs/ingresses/jobs and a single `IstioInstalled` bool.
Other categories (configmaps, secrets, RBAC, vCluster, CRDs, events,
networkpolicies, endpointslices, statefulsets/daemonsets/replicasets/cronjobs/
hpas, storageclasses) are missing. Need to extend the proto.

## Phase 0 — proto extension (l8probler / probler proto)

Extend `K8SClusterSummary` in `proto/k8s.proto` to cover every category card.
Group fields by category. Use plain `int32` counts; for categories with a
"healthy/total" notion, add both fields. Keep backward compat — only add new
fields with new tag numbers.

New fields (additions only — existing tags unchanged):

```proto
// Workloads (existing: pods, deployments)
int32 total_statefulsets = 17;
int32 ready_statefulsets = 18;
int32 total_daemonsets = 19;
int32 ready_daemonsets = 20;
int32 total_replicasets = 21;
int32 total_cronjobs = 22;
int32 active_cronjobs = 23;
int32 total_hpas = 24;

// Networking (existing: services, ingresses)
int32 total_networkpolicies = 25;
int32 total_endpoints = 26;
int32 total_endpointslices = 27;
int32 total_ingressclasses = 28;

// Storage (existing: PVCs)
int32 total_persistentvolumes = 29;
int32 bound_persistentvolumes = 30;
int32 total_storageclasses = 31;

// Configuration
int32 total_configmaps = 32;
int32 total_secrets = 33;
int32 total_resourcequotas = 34;
int32 total_limitranges = 35;
int32 total_poddisruptionbudgets = 36;

// Access Control
int32 total_serviceaccounts = 37;
int32 total_roles = 38;
int32 total_clusterroles = 39;
int32 total_rolebindings = 40;
int32 total_clusterrolebindings = 41;

// vCluster
int32 total_vclusters = 42;

// Istio per-resource counts.
// NOTE: existing field `bool istio_installed = 16;` is KEPT (its tag stays
// reserved for backward compat). The new fields below are additive — UI uses
// the new counts, and `istio_installed` can be derived as
// `any(total_istio_*) > 0` if needed.
int32 total_istio_virtualservices = 43;
int32 total_istio_destinationrules = 44;
int32 total_istio_gateways = 45;
int32 total_istio_serviceentries = 46;
int32 total_istio_peerauthentications = 47;
int32 total_istio_authorizationpolicies = 48;
int32 total_istio_sidecars = 49;
int32 total_istio_envoyfilters = 50;

// CRDs / Events
int32 total_crds = 51;
int32 total_events = 52;
int32 warning_events = 53;
```

Tag `16` (`istio_installed`) is preserved — no field is renamed, removed, or
renumbered. Per `proto-enum-zero-value.md` and proto best practices, all
changes are additive.

Run `proto/make-bindings.sh` (sibling change in proto repo if needed).

## Phase 1 — adcon: populate K8SCluster + Summary

In `prob/adcon/main.go`:

1. After `pollaris.Activate(nic)` and `service.Activate(K8sC_Links_ID, nic)`,
   start a goroutine that:
   - Builds (or reuses) the client-go `kubernetes.Clientset` already used by
     the K8s collector. Reuse the **shared informers** the collector maintains
     so the summary path doesn't issue duplicate API calls.
   - Calls `discovery.ServerVersion()` once on startup for
     `K8sVersion`/`Platform`.
   - On a **30 s cadence**:
     - Reads counts for each resource type from the shared informer caches
       (no extra `List` calls).
     - Builds `&K8SCluster{Name: clusterName, K8sVersion, Platform, Summary: {…}}`.
     - Posts it to `(KCluster, 10)` via the local vnic, using whichever
       primitive matches the cache's transaction config (likely
       `vnic.Leader(name, area, PATCH, msg)` or `vnic.Multicast`).
2. Counts MUST be done from a per-cluster client (each cluster's adcon counts
   its own cluster only). Do not aggregate across clusters in adcon.
3. If the K8s collector does not yet expose its informers in a way adcon can
   read, the smallest unblocking change is to expose a getter on the K8s
   collector (e.g. `k8sclient.SharedInformers()`); fall back to dedicated
   `List` calls **only** until that getter is available, then switch.

## Phase 2 — UI: cluster dropdown as the global filter

`web/kubernetes/kubernetes-init.js` already has a dropdown and a
`selectedCluster` variable. Lock it down as the source of truth:

1. The dropdown renders above the category tabs (it does today). Keep it
   visible regardless of which category tab is active.
2. On change:
   - Update `selectedCluster`.
   - Tell `K8sTables.setClusterFilter(selectedCluster)` to refresh every
     active table's `baseWhereClause`.
   - If the Overview tab is active, re-fetch the cluster summary and
     re-render the cards.
3. On initial section load, default `selectedCluster` to the first cluster in
   the dropdown (current behavior). Persist the chosen cluster across tab
   switches inside the K8s section (already the case via the closure variable;
   confirm no resets).

`web/kubernetes/kubernetes-tables.js`: `setClusterFilter` already exists. Keep
the `K8sCluster` exception from line 17 (cluster table itself doesn't filter
on `clusterName`) — Overview cards don't use it, so this only matters if a
"Clusters" table re-appears.

## Phase 3 — Overview tab: replace table with Layer8DWidget grid

Replace the Overview category's only service (`cluster-summary` → Clusters
table) with a `Layer8DWidget`-driven Overview view. Per
`prd-compliance.md` / `layer8d-widget.md`, dashboard KPI cards must use
`Layer8DWidget.renderEnhancedStatsGrid(kpis, iconMap)`, not a custom HTML grid.

1. New category-bucket renderer: when `activeCategory.key === 'overview'`,
   skip the existing service-sub-tab + `K8sTables.create` path entirely.
2. New file `web/kubernetes/kubernetes-overview.js`:
   - Pure config + glue (no card rendering primitives — those live in
     `Layer8DWidget`). Target ≤ 250 lines; if it grows past 400, split into
     `kubernetes-overview-config.js` (KPI definitions) and
     `kubernetes-overview.js` (fetch + nav glue) per `maintainability.md`.
   - `K8sOverview.show(containerId, clusterName)`:
     - Fetches `select * from K8SCluster where name=<clusterName>` from
       `/probler/10/KCluster` (lowercase `name` per `l8query-rules.md`).
     - If the response is empty, render a single placeholder card with the
       message **"Cluster not yet reported — waiting for adcon"** and an
       auto-retry (refetch after 5 s). Don't render the KPI grid until a row
       arrives.
     - On a non-empty response, build a `kpis` array of 11 entries (one per
       other category) — each entry contains:
       - `label`, `icon` (from `Probler.k8sCategories`),
       - 1–3 stat values pulled from `K8SClusterSummary` (running/total etc.),
       - `onClick` callback that activates the corresponding category tab.
     - Call `Layer8DWidget.renderEnhancedStatsGrid(kpis, iconMap)` to render
       the grid.
   - Category navigation: expose the existing `selectCategory` function from
     `kubernetes-init.js` (e.g. `window.K8sCategoryNav.activate(catKey)`); the
     widget `onClick` calls into it.
3. Card-to-stats mapping (each from `K8SClusterSummary` after Phase 0):
   - Workloads: `pods running/total`, `deployments available/total`.
   - Networking: `services`, `ingresses`, `network policies`.
   - Storage: `PVs bound/total`, `PVCs bound/total`, `StorageClasses`.
   - Configuration: `configmaps`, `secrets`, `pdbs`.
   - Access Control: `roles`, `clusterroles`, `rolebindings`.
   - Nodes: `ready/total`.
   - Namespaces: `total`.
   - vCluster: `total`.
   - Istio: `virtualservices`, `gateways`, `peerauthentications`.
   - CRDs: `total`.
   - Events: `total`, `warning`.

No new card CSS — `Layer8DWidget` ships its own theme-token styles. Only add
container-level layout if needed (and confirm it stays inside
`--layer8d-*` tokens per `l8ui-theme-compliance.md`).

## Phase 4 — Wire dropdown → Overview

`kubernetes-init.js`:

- Existing dropdown `change` handler: if Overview is active, call
  `K8sOverview.show(containerId, selectedCluster)`. Otherwise just call
  `K8sTables.setClusterFilter(selectedCluster)` (current behavior).
- When user clicks a category tab via card or top tabs, the existing
  `selectCategory` flow runs and uses `selectedCluster` as the
  `baseWhereClause` filter for tables (already true).

## Phase 5 — Mobile parity

Mirror the same UX in `web/m/`. Per `platform-conversion-data-flow.md`, do a
Step-0 feature inventory + data-flow trace before writing code.

### Step 0 — feature inventory of the desktop Overview

| # | Element | Mobile equivalent | Status |
|---|---------|-------------------|--------|
| 1 | Cluster dropdown above category tabs | Cluster picker chip in mobile K8s header | implement |
| 2 | Tab strip with category buttons | Existing mobile category nav | reuse |
| 3 | Overview KPI grid via `Layer8DWidget` | KPI grid via `Layer8MWidget` | implement |
| 4 | Empty-state placeholder + 5 s retry | Same | implement |
| 5 | KPI click → activate category section | Mobile nav: navigate to category | implement |
| 6 | Sub-tab tables filtered by `selectedCluster` | Mobile section L8Queries filtered by `selectedCluster` | implement |

### Step 1 — data flow trace (desktop → mobile)

| Path | Desktop | Mobile |
|------|---------|--------|
| Cluster list source | GET `/probler/10/KCluster?body=select * from K8SCluster` (no filter) | Same |
| Cluster summary source | GET `/probler/10/KCluster?body=select * from K8SCluster where name=<cluster>` | Same |
| KPI primitive | `Layer8DWidget.renderEnhancedStatsGrid` | `Layer8MWidget` (mobile equivalent) |
| Category navigation | `selectCategory(cat)` in `kubernetes-init.js` | Mobile nav-config category routing |
| Sub-table filter | `K8sTables.setClusterFilter(clusterName)` → `baseWhereClause` | Mobile `Layer8MTable` `baseWhereClause` (or equivalent) |

### Step 2 — duplication audit

Behavioral logic that would otherwise be duplicated across desktop/mobile is
extracted to a shared, platform-agnostic module:

- `web/kubernetes/kubernetes-overview-kpis.js` (new, **shared**) — exports the
  KPI definitions: `(category → {label, icon, statsFn(summary)})`. Both
  desktop and mobile import from this module.
- Per-platform glue stays small (≤ ~80 lines): only the fetch call, the
  empty-state retry, and the platform-specific widget invocation
  (`Layer8DWidget` vs `Layer8MWidget`) plus the platform's category-nav call.
- Per `plan-duplication-audit.md`, this is the "extract-before-second-instance"
  step — the mobile renderer is built on the shared config from day one.

### Step 3 — implementation

1. Add a cluster picker chip at the top of the mobile K8s section, sourced
   from the same K8SCluster list query as desktop.
2. Replace the mobile Overview list with `Layer8MWidget`, fed by the shared
   `kubernetes-overview-kpis.js` definitions.
3. Tapping a KPI card navigates to the matching mobile category section.
4. Sub-section mobile L8Queries inherit the `clusterName=<selected>` filter
   the same way desktop does.

## Phase 6 — End-to-end verification

1. With one cluster: dropdown shows that cluster; Overview shows cards with
   counts; clicking each card opens the right category; sub-tab tables show
   only that cluster's data.
2. With two clusters (post a second cluster from a second adcon, or add a
   second target with a different `clusterName` for testing):
   - Dropdown lists both clusters.
   - Switching dropdown re-renders Overview cards with the other cluster's
     counts.
   - Switching to Workloads → Pods after switching cluster shows the other
     cluster's pods.
3. Confirm the cluster-name primary key fix from the prior phase still holds
   (rows are unique per `(ClusterName, Key/Name)`).

## Traceability matrix

| # | Requirement / Rule | Phase |
|---|---------------------|-------|
| 1 | Restore cluster dropdown driving all tabs | Phase 2 |
| 2 | Overview shows summary cards instead of a table | Phase 3 |
| 3 | One card per other category, clickable to that category | Phase 3 |
| 4 | adcon fills K8SCluster + Summary for the selected cluster's data | Phase 0 + Phase 1 |
| 5 | Sub-tab L8Query filters by `selectedCluster` | Phase 2 |
| 6 | Mobile parity (with feature inventory + data-flow trace) | Phase 5 |
| 7 | KPI cards rendered via `Layer8DWidget` / `Layer8MWidget` (l8ui rule) | Phase 3 + Phase 5 |
| 8 | L8Query field names use JSON casing (`name`) | Phase 3 (Overview fetch) |
| 9 | Proto change is additive (tag 16 preserved) | Phase 0 |
| 10 | Shared KPI config (no desktop/mobile duplication) | Phase 5 Step 2 |
| 11 | Empty-cluster placeholder + retry | Phase 3 |
| 12 | End-to-end verification | Phase 6 |

## Touch list

| File | Phase | Why |
|------|-------|-----|
| `proto/k8s.proto` (+ regenerate `go/types/k8s.pb.go`) | 0 | Extend `K8SClusterSummary` (additive only; tag 16 preserved) |
| `prob/adcon/main.go` | 1 | Periodic K8SCluster summary publisher reading from shared informers |
| `web/probler/probler-config.js` | 3 | Mark Overview category as "custom view" (or remove its single service) |
| `web/kubernetes/kubernetes-init.js` | 2, 3, 4 | Special-case Overview, expose category nav, wire dropdown |
| `web/kubernetes/kubernetes-overview.js` (new) | 3 | Fetch + empty-state + Layer8DWidget invocation (no card primitives) |
| `web/kubernetes/kubernetes-overview-kpis.js` (new, **shared**) | 3, 5 | Per-category KPI definitions; consumed by desktop and mobile |
| `web/m/sections/kubernetes.html` and `web/m/js/kubernetes-*.js` | 5 | Mobile parity using `Layer8MWidget` + shared KPI config |
| `vendor/.../l8parser` etc. | n/a | No sibling-project changes anticipated |

No CSS additions (theme tokens come from `Layer8DWidget` / `Layer8MWidget`).

## Decisions baked in

1. **Card count granularity** — 11 category cards (one per other category
   tab). Not 40 service cards.
2. **Summary refresh cadence** — 30 s.
3. **Counts source in adcon** — reuse the K8s collector's existing shared
   informers; only fall back to dedicated `List` calls until a getter for
   those informers is available, then switch.
4. **Empty-cluster behavior** — if `Name` has no cached row yet, the Overview
   shows a single placeholder card "Cluster not yet reported — waiting for
   adcon" and auto-retries every 5 s until a row arrives.
