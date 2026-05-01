# K8s Table Display Fixes

## Background
With the cluster dropdown now acting as a global filter (see `k8s-overview-cards-and-cluster-filter.md`) and the composite-primary-key fix landed, the K8s tabs render the right rows but several columns and behaviors are still wrong. This plan addresses seven user-reported issues end-to-end.

## Reported Issues

| # | Where | Symptom | Root cause |
|---|-------|---------|------------|
| 1 | All K8s tabs | Redundant "Cluster" column | Column was useful before the global cluster filter; now noise |
| 2 | All K8s tabs | Cannot scroll past the bottom of the visible page | `.k8s-section` is missing flex set-up; flex:1+min-height:0 chain on `.k8s-content` / `.k8s-table-area` is broken |
| 3 | Workloads → Pods | STATUS column always "Unknown" | `K8SPod.status` is enum `K8SPodStatus`, but K8s API returns a string ("Running"…). Parser's `setFieldValue` cannot convert string → typed-int32 enum, so it stays at 0 (UNSPECIFIED), which the UI shows as "Unknown" |
| 4 | Workloads → Deployments | UP-TO-DATE empty | Field path `status.updatedReplicas` is omitted by K8s when 0; encoder produces no value, parser skips. No fallback enrichment |
| 5 | Workloads → Deployments | AVAILABLE empty or "[]" | Same as #4 for `status.availableReplicas`. The "[]" comes from `sliceToString` returning "[]" when the decoder gives back an empty slice for a missing/array-typed field |
| 6 | Workloads → DaemonSets | DESIRED / CURRENT / READY show "[]"; UP-TO-DATE blank | Proto fields are `string`, K8s API returns int64, the assignment falls through `setFieldValue`'s ConvertibleTo path producing rune garbage; for missing fields the decoder yields `[]interface{}{}` which renders as "[]" |
| 7 | Nodes | STATUS column always "Unknown" | The Node pollaris does not collect status at all (no `STATUS` column in `node.go::Fields`). The UI column exists but reads from a field that is never populated |

## Compliance Notes (Global Rules)

- **Plan approval workflow** — written to `./plans/`, awaiting explicit approval before implementation.
- **Never edit vendor** — all Go fixes go in `l8parser` / `l8collector` source projects; probler re-vendors after the user pushes.
- **No silent fallbacks (`report-infra-bugs.md`)** — UI status renderers will NOT silently coerce unrecognized values into a benign default. Specifically:
  - When a Pod/Node status enum value is `0` (UNSPECIFIED) AND the upstream string was non-empty, the renderer logs `console.warn("K8s status: unrecognized value '<raw>' for <model>.<field>")` and renders the raw value with a neutral badge — NOT silently mapping to "Unknown".
  - "—" is reserved for *explicitly absent* server fields (raw value is null/undefined or the empty string). Missing-by-design ≠ silently-failing-mapping.
  - The collector enrichment functions (`enrichDeployment`, `enrichDaemonSet`, `enrichNode`) use `intOr(obj, 0, …)` which returns 0 only when the path genuinely doesn't exist; this is documented in the Phase 5/4 implementation notes so future readers know an emitted "0" is real, not a swallowed error.
- **Mobile parity (`mobile-rules.md`)** — every desktop column / CSS / behavior change in this plan has a mobile counterpart in Phase 7.
- **Plan duplication audit (`plan-duplication-audit.md`)** — 14+ K8s column tables share the same "Cluster" column. The Cluster removal is already a single line per table (no extraction needed). Pod/Node string→enum logic IS extracted into a shared `enumRegistry` in Phase 3, reused by both tabs. The four count-enrichment fixes each touch one well-named function in `l8collector/.../Enrich.go`; no new shared abstraction warranted.
- **Plan traceability (`plan-traceability-and-verification.md`)** — every issue maps to a phase in the matrix below; final phase smoke-tests the affected tabs.
- **Protobuf field names (`js-protobuf-field-names.md`)** — UI column keys use protobuf JSON names. Verified (`clusterName` matches `string cluster_name = 100`).
- **No Go generics (`no-go-generics.md`)** — the enum registry uses plain `map[string]map[string]int32` and `RegisterEnum(typeName string, values map[string]int32)` — no type parameters.
- **L8UI generic-only (`l8ui-no-project-specific-code.md`)** — all UI changes are scoped to `web/probler/k8s/`, `web/kubernetes/`, and `web/m/...`. Nothing under `web/l8ui/`.
- **Demo directory sync (`demo-directory-sync.md`)** — no edits to `go/demo/`.

## Design Decisions

### 1) Cluster column removal
Pure UI change. Drop `clusterName` entries from every column array in:
- `web/probler/k8s/k8s-columns.js`
- `web/probler/k8s/k8s-columns-ext.js`
- mobile equivalents (under `web/m/...`) once located in Phase 6.

The K8sCluster overview table itself is gone (Overview now shows cards), but K8sCluster column defs may still be referenced elsewhere — verify before deletion.

### 2) Scroll fix
Add `.k8s-section { display: flex; flex-direction: column; min-height: 0; height: 100%; }`. The flex chain `section → content → table-area` then propagates `flex: 1` correctly so the inner Layer8DTable receives a bounded height and its own scroll engages. If the inner table still does not scroll, set `overflow-y: auto` on `.k8s-table-area` as a final fallback.

### 3 & 7) Pod / Node STATUS — string → enum conversion in parser
Two-part fix in `l8parser`:

**Part A (general):** Extend `setFieldValue` in `CTableToInstances.go` so that when the source value is a string and the target is an enum-typed int32 (a Go integer type whose name is non-empty and not a primitive `int32`), it consults a registry of `<EnumTypeName>_value` maps and assigns the integer. This is a generic mechanism: callers register a string-key/value map per enum type at parser activation, the parser looks up the field's type name, finds the map, and resolves "Running" → 1.

Implementation surface:
```go
// l8parser/go/parser/rules/EnumRegistry.go (new file)
var enumRegistry = map[string]map[string]int32{}

func RegisterEnum(typeName string, values map[string]int32) {
    enumRegistry[typeName] = values
}

func enumValueFor(field reflect.Value, raw string) (int32, bool) { ... }
```

In `setFieldValue`, before the rune-producing `ConvertibleTo` short-circuit, add:
```go
if valRef.Kind() == reflect.String && field.Kind() == reflect.Int32 {
    if v, ok := enumValueFor(field, valRef.String()); ok {
        field.SetInt(int64(v))
        return
    }
}
```

**Part B (K8s):** Register the maps `K8SPodStatus_value` and `K8SNodeStatus_value` (already generated by protoc) at parser boot. In probler this is done in `prob/parser/main.go` (or wherever the K8s parser activates) — call `rules.RegisterEnum("K8SPodStatus", types.K8SPodStatus_value)` and the same for `K8SNodeStatus`.

K8s status mapping:
- Pod: K8s `status.phase` returns `"Pending" | "Running" | "Succeeded" | "Failed" | "Unknown"` → existing `K8SPodStatus_value` keys are uppercase, e.g. `K8S_POD_STATUS_RUNNING`. Need a normalization helper that maps `"Running"` → `K8S_POD_STATUS_RUNNING` (uppercase + prefix). Either:
  (a) register a custom map `{"Running": 1, "Pending": 2, …}` instead of the generated one, or
  (b) run a `strings.ToUpper` + prefix transform in `enumValueFor`.

  Option (a) is simpler and explicit; do that.

- Node: K8s nodes don't have `status.phase`. The pollaris must be extended (see Phase 4) to compute a status string from `status.conditions[type=Ready].status` ("True" → "Ready", anything else → "NotReady"). Then the same string→enum conversion handles it.

### 4 & 5) Deployment UP-TO-DATE / AVAILABLE
Add enrichment in `l8collector/.../Enrich.go::enrichDeployment`:
```go
out["uptodate"]  = fmt.Sprint(intOr(obj, 0, "status", "updatedReplicas"))
out["available"] = fmt.Sprint(intOr(obj, 0, "status", "availableReplicas"))
```
Update `boot/k8s/deploy.go::Fields` to use `_k.uptodate` and `_k.available` instead of the raw `status.updatedReplicas` / `status.availableReplicas` paths.

### 6) DaemonSet DESIRED / CURRENT / READY / UP-TO-DATE
Extend `enrichDaemonSet` to also pre-stringify the three direct counts:
```go
out["desired"] = fmt.Sprint(intOr(obj, 0, "status", "desiredNumberScheduled"))
out["current"] = fmt.Sprint(intOr(obj, 0, "status", "currentNumberScheduled"))
out["ready"]   = fmt.Sprint(intOr(obj, 0, "status", "numberReady"))
// uptodate / available already enriched
```
Update `boot/k8s/ds.go::Fields` to use `_k.desired`, `_k.current`, `_k.ready`.

This eliminates the rune/`[]` artifacts entirely — proto string fields receive proto strings.

### 7) Node STATUS pollaris addition
Add a node-status enrichment:
```go
func enrichNode(obj, out) {
    // existing roles/internalip/externalip ...
    out["status"] = nodeReadyStatus(obj)
}

func nodeReadyStatus(obj) string {
    conds, _ := nestedSlice(obj, "status", "conditions")
    for _, c := range conds {
        m, _ := c.(map[string]interface{})
        if fmt.Sprint(m["type"]) == "Ready" {
            if fmt.Sprint(m["status"]) == "True" {
                return "Ready"
            }
            return "NotReady"
        }
    }
    return "Unknown"
}
```

Update `boot/k8s/node.go::Fields` and `Headers` to include `_k.status` / `STATUS` immediately after `ROLES`. Bump `ColCount`.

The proto already declares `K8SNodeStatus status = 2`; the parser will consume the string → enum conversion from §3.

## Phase Breakdown

### Phase 1 — Remove Cluster column from K8s tables
Files:
- `web/probler/k8s/k8s-columns.js` — drop the `{ key: 'clusterName', label: 'CLUSTER' …}` entry from every column array (≈14 occurrences).
- `web/probler/k8s/k8s-columns-ext.js` — same sweep.
- Mobile equivalent files (same sweep — see Phase 6).

Verify the K8sCluster columns array stays as-is (it's the cluster list itself; the Overview no longer uses it but other code may).

### Phase 2 — Fix table scrolling
File: `web/kubernetes/kubernetes.css`.

Add to `.k8s-section`:
```css
.k8s-section {
    padding: 0;
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
}
```
If the inner Layer8DTable still overflows, also add `overflow-y: auto` to `.k8s-table-area`.

### Phase 3 — Generic string → enum conversion in parser (`l8parser`)
1. Create `go/parser/rules/EnumRegistry.go` with `RegisterEnum` and `enumValueFor`.
2. Extend `setFieldValue` in `CTableToInstances.go` to short-circuit string → int32-enum via the registry.
3. Unit-test path: parser test that registers a sample enum and asserts the field is set.

### Phase 4 — Node STATUS pollaris (`l8parser` + `l8collector`)
1. In `l8collector/.../Enrich.go`, add `nodeReadyStatus` and call from `enrichNode`.
2. In `l8parser/.../boot/k8s/node.go`, add `_k.status` field and `STATUS` header; bump `ColCount`.
3. Register `K8SNodeStatus_value` (custom-keyed: `Ready→1`, `NotReady→2`) at parser activation in probler's parser binary.

### Phase 5 — Deployment + DaemonSet count enrichment (`l8collector`)
1. Extend `enrichDeployment` with `uptodate` and `available`.
2. Extend `enrichDaemonSet` with `desired`, `current`, `ready` (uptodate/available already there).
3. Update `boot/k8s/deploy.go` and `boot/k8s/ds.go` to consume `_k.*` paths instead of raw `status.*`.

### Phase 6 — Pod STATUS string → enum (probler parser binary)
Register `K8SPodStatus_value` (custom-keyed: `Pending→2`, `Running→1`, `Succeeded→3`, `Failed→4`, `Unknown→5`) at parser activation. The generic registry from Phase 3 does the rest.

### Phase 7 — Mobile parity sweep
For every change in Phases 1, 2, 3 (UI-visible only), apply the equivalent in:
- `web/m/...` mobile columns / sections (Cluster column removal).
- Mobile K8s section CSS (scroll fix mirrored).
- Mobile detail popups that show STATUS / counts.

If the mobile code path doesn't yet exist for a given K8s tab, document the gap explicitly and defer.

### Phase 8 — End-to-End Verification
For every affected tab:
1. Open the K8s section, verify Cluster column is gone.
2. Resize the browser so the table overflows; confirm scroll engages and reaches the last row.
3. Workloads → Pods: confirm STATUS shows real values (Running, Pending, etc.) and the badge color is correct.
4. Workloads → Deployments: UP-TO-DATE and AVAILABLE show numeric strings, not blank or "[]".
5. Workloads → DaemonSets: DESIRED, CURRENT, READY, UP-TO-DATE, AVAILABLE all show numbers.
6. Nodes: STATUS shows "Ready" / "NotReady" with correct badge color.
7. Repeat the relevant checks on mobile.

## Traceability Matrix

| # | Issue | Phase |
|---|-------|-------|
| 1 | Remove Cluster column (desktop) | Phase 1 |
| 2 | Table scroll | Phase 2 |
| 3 | Pod STATUS string → enum | Phases 3 + 6 |
| 4 | Deployment UP-TO-DATE | Phase 5 |
| 5 | Deployment AVAILABLE | Phase 5 |
| 6 | DaemonSet counts | Phase 5 |
| 7 | Node STATUS | Phase 4 (collector enrichment + pollaris) + Phase 3 (string→enum) |
| Mobile | Mobile parity for #1, #2, status renders | Phase 7 |
| Verify | All tabs render correctly | Phase 8 |

## Risks / Open Questions

- **Generic enum registry** — adding string→enum conversion to `setFieldValue` could affect non-K8s parsers if a string accidentally matches an enum key. Mitigation: only fires when target is `int32` AND the field's type name has a registered map AND the string is in the map; misses fall through.
- **Empty-slice "[]" behavior** — root cause is a decoder behavior I haven't fully traced. Phase 5's enrichment side-steps it for the user-visible tabs, but other K8s fields could still hit it. If any other column shows "[]" after Phase 5, file a follow-up to trace `object.NewDecode` for missing keys.
- **Mobile coverage** — per CLAUDE.md, "Most desktop detail modals (hosts, gpus, kubernetes) have no mobile equivalent yet." Phase 7 may have nothing to port for tabs that don't exist on mobile; the audit list will reflect that.

## Affected Sibling Projects (must be pushed and re-vendored)

- `l8parser` — Phase 3 enum registry, Phase 4 / 5 / 6 boot updates.
- `l8collector` — Phase 4 / 5 enrichment additions.

After implementation: push siblings, re-vendor probler, rebuild `parser_demo` and `adcon` (which transitively includes the collector and parser packages) and `k8s_demo` (which uses inventory but no direct change here).
