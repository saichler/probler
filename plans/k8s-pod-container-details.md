# K8s Pod Detail — Container Information

## Problem
The Workloads → Pods detail popup is missing per-container information: image, imagePullPolicy, ports, env, resources, volumeMounts. Today the proto exposes only pod-level metadata (namespace, name, status, ready, restarts, age, ip, node), so even the `JSON` tab in the detail popup has nothing more to show.

## Scope check (what data lives where today)

| Layer | What it has |
|---|---|
| `proto/k8s.proto::K8SPod` | namespace, name, ready, status, restarts, age, ip, node, nominated_node, readiness_gates, cluster_name, key. **No container info.** |
| `l8collector/.../Enrich.go::enrichPod` | computes `_k.ready`, `_k.restarts`, `_k.nominatednode`. **Does not touch `spec.containers`.** |
| `l8parser/.../boot/k8s/pod.go` | forwards the proto fields above. |
| Desktop `kubernetes-detail.js` (K8SPod section) | `Identity`, `Status`, `Scheduling` only. No Containers section. |
| Mobile `m/js/details/k8s-detail.js` (K8SPod) | `Status` + identity keys. No Containers section. |

## Approach options considered

| Option | Pros | Cons |
|---|---|---|
| A. Flatten to comma-separated columns (`images`, `imagePullPolicies`, `ports`) | Smallest change | Loses per-container association — for multi-container pods, you can't tell which port belongs to which container; cannot show env/resources/volumeMounts richly |
| B. **One JSON-encoded `containers_json` string field on K8sPod, parsed and rendered by the UI** | Preserves full per-container structure; one parser path; clean detail rendering as a nested table; trivially extensible (add more fields without proto churn) | UI has to JSON.parse on render; slightly larger row payload |
| C. `repeated K8sContainer containers = N` nested message | Most semantic | Parser's `CTableToInstances` is row-flat; no clean way to populate a repeated nested message from a single CTable row without new rule logic; broader change |

**Choosing B.** It matches the existing pattern (e.g. Deployment's `containers`, `images` strings), preserves structure, and avoids inventing a new parser rule for nested repeated fields.

## Compliance Notes (Global Rules)

- **Plan approval workflow** — written to `./plans/`, awaiting approval.
- **Never edit vendor** — Go changes go to `l8collector` source; probler re-vendors after push.
- **Protobuf additive change (`prime-object-references`/general)** — new field on `K8SPod`, no field renumbering, no removal. Old clients keep working.
- **Protobuf generation (`protobuf-generation.md`)** — must run `proto/make-bindings.sh` after the proto edit.
- **No silent fallbacks** — when `containers_json` is empty/missing, the Containers section shows "—" (not a fake row); when JSON.parse fails, the UI logs `console.warn` and shows the raw string in a code block.
- **Mobile parity (`mobile-rules.md`)** — desktop and mobile detail popups both get a Containers section.
- **Plan duplication audit** — desktop and mobile each render the table; the parsing helper (parse + escape) is small enough that a copy-per-platform is cleaner than a new shared module. Documented in this plan.
- **Plan traceability** — matrix below; final phase is end-to-end verification.
- **Layer8 framework rules** — JSON-encoded string field is a primitive `string` from the proto's perspective; no special parser handling beyond what's already there.

## Design

### New proto field on K8SPod

```protobuf
message K8SPod {
  // ...existing fields...
  string readiness_gates = 10;

  // JSON-encoded array of container specs, populated by enrichPod from
  // spec.containers / spec.initContainers / status.containerStatuses.
  // Schema (per container, all fields optional):
  //   {
  //     "name": "...",
  //     "image": "...",
  //     "imagePullPolicy": "Always" | "IfNotPresent" | "Never",
  //     "ports": [{"containerPort": 8080, "protocol": "TCP", "name": "http"}],
  //     "env":   [{"name": "FOO", "value": "bar"}],
  //     "resources": {
  //       "requests": {"cpu": "100m", "memory": "128Mi"},
  //       "limits":   {"cpu": "500m", "memory": "256Mi"}
  //     },
  //     "volumeMounts": [{"name": "data", "mountPath": "/data", "readOnly": false}],
  //     "kind": "container" | "init",
  //     "ready": true,
  //     "state": "Running" | "Waiting" | "Terminated",
  //     "restartCount": 0
  //   }
  string containers_json = 11;

  string cluster_name = 100;
  string key = 101;
}
```

### Collector enrichment (`l8collector/.../Enrich.go::enrichPod`)

Extend `enrichPod` to walk `spec.containers`, `spec.initContainers`, and merge runtime info from `status.containerStatuses` (keyed by container name). Emit a JSON-encoded array as `out["containers_json"]`.

```go
// (rough skeleton)
type podContainer struct {
    Name            string                    `json:"name,omitempty"`
    Image           string                    `json:"image,omitempty"`
    ImagePullPolicy string                    `json:"imagePullPolicy,omitempty"`
    Ports           []map[string]interface{}  `json:"ports,omitempty"`
    Env             []map[string]interface{}  `json:"env,omitempty"`
    Resources       map[string]interface{}    `json:"resources,omitempty"`
    VolumeMounts    []map[string]interface{}  `json:"volumeMounts,omitempty"`
    Kind            string                    `json:"kind,omitempty"`
    Ready           *bool                     `json:"ready,omitempty"`
    State           string                    `json:"state,omitempty"`
    RestartCount    int                       `json:"restartCount,omitempty"`
}

func enrichPodContainers(obj map[string]interface{}, out map[string]interface{}) {
    statusByName := map[string]map[string]interface{}{}
    if statuses, ok := nestedSlice(obj, "status", "containerStatuses"); ok {
        for _, e := range statuses {
            m, _ := e.(map[string]interface{})
            statusByName[fmt.Sprint(m["name"])] = m
        }
    }
    list := []podContainer{}
    list = appendContainers(obj, "containers", "container", statusByName, list)
    list = appendContainers(obj, "initContainers", "init", statusByName, list)
    if len(list) == 0 {
        return
    }
    if buf, err := json.Marshal(list); err == nil {
        out["containers_json"] = string(buf)
    }
}
```

Sensible field-omit semantics (`omitempty`) keep the JSON small for the common case.

### Pollaris (`l8parser/.../boot/k8s/pod.go`)

Add `_k.containers_json` to the `Fields` slice with column header `CONTAINERS_JSON`, increment `ColCount`. The parser already handles plain string fields; no rule change needed.

### Bindings regeneration

Run `proto/make-bindings.sh` (per `protobuf-generation.md`) — this regenerates ALL bindings, not just K8s. No other proto edits, so the diff to `go/types/k8s.pb.go` is the only meaningful change.

### Desktop UI (`web/kubernetes/kubernetes-detail.js`)

Add a "Containers" section to the K8SPod sectioned overview. Render as a vertically stacked group of mini-tables, one per container, with sub-tables for Ports / Env / VolumeMounts / Resources.

```js
detailSections.K8SPod = [
    { title: 'Identity', keys: ['clusterName', 'namespace', 'name', 'key'] },
    { title: 'Status', keys: ['status', 'ready', 'restarts', 'age'] },
    { title: 'Scheduling', keys: ['ip', 'node', 'nominatedNode', 'readinessGates'] },
    { title: 'Containers', custom: 'containers' }   // ← new
];

// In buildSectionedOverview, when section.custom === 'containers',
// call renderContainers(item.containersJson) instead of the generic
// keys loop.
```

`renderContainers(jsonStr)` does:
1. If empty/null → render `<span class="k8s-detail-empty">—</span>`.
2. `try { JSON.parse(jsonStr) } catch { console.warn(...); show raw }`.
3. For each container, render a card with: name (heading), image, imagePullPolicy, kind (pill: "init" / "container"), state badge, ready, restartCount, then collapsible/inline tables for Ports / Env / Resources / VolumeMounts.

All rendering paths use `escapeHtml` (already present in the file).

### Mobile UI (`web/m/js/details/k8s-detail.js`)

Mirror the same Containers tab/section. Mobile uses `Layer8MPopup` tabs already; add a `Containers` tab whose body is a vertical list of container cards (same content as desktop but stacked, no fixed-width tables).

### CSS

Add classes under `web/kubernetes/kubernetes.css`:
- `.k8s-detail-container-card` — wrapper for one container
- `.k8s-detail-container-header` — name + kind pill + state badge
- `.k8s-detail-container-meta` — image / imagePullPolicy
- `.k8s-detail-container-subtable` — small table reused for ports/env/etc.

All styles use `--layer8d-*` tokens (per `l8ui-theme-compliance`).

## Phase Breakdown

### Phase 1 — Proto + bindings
- Add `containers_json = 11` to K8sPod in `proto/k8s.proto`.
- Run `proto/make-bindings.sh`.
- Verify `go build ./...` passes for probler.

### Phase 2 — Collector enrichment
- Add `podContainer` type + `enrichPodContainers(obj, out)` in `l8collector/.../Enrich.go`.
- Call it from the existing `enrichPod` after the current ready/restarts logic.
- Add a guard log `[K8S-ENRICH-POD] containers=N initContainers=M jsonBytes=X` to make it easy to confirm in the field.
- `go build ./...` passes for l8collector.

### Phase 3 — Pollaris pod.go
- Add `_k.containers_json` to `Fields`, `CONTAINERS_JSON` to `Headers`, bump `ColCount`.
- `go build ./...` passes for l8parser.

### Phase 4 — Desktop detail popup
- Update `detailSections.K8SPod` to include a `custom: 'containers'` section.
- Implement `renderContainers(jsonStr)` and dispatch from `buildSectionedOverview`.
- New CSS classes in `kubernetes.css`.
- `node -c` passes on the touched JS.

### Phase 5 — Mobile detail popup
- Add Containers tab (or section, depending on existing mobile structure) to `web/m/js/details/k8s-detail.js`.
- Same rendering helper, mobile-friendly markup.

### Phase 6 — Mobile column / row passthrough check
- Verify the row data fetched on mobile actually includes `containersJson` (the JSON name of `containers_json`). No mobile column needs to *show* it in the table — only the detail popup uses it — but the row transform must not strip it.

### Phase 7 — End-to-end verification
For both desktop and mobile:
1. Open Workloads → Pods.
2. Click any pod → detail popup → Overview tab.
3. Confirm Containers section lists every container with correct image, imagePullPolicy, ports, env, resources, volumeMounts, ready/state.
4. Confirm init containers (if any) are labelled `init` and grouped correctly.
5. Confirm a pod with one container, a pod with multiple containers, and a pod with init containers all render.
6. Check the JSON tab — `containersJson` shows up as a string; nothing else regressed.
7. Check that pods with empty `containers_json` (the field absent) render "—" in the Containers section, not garbage or `[object Object]`.

## Traceability Matrix

| # | Requirement | Phase |
|---|---|---|
| 1 | Show image | Phase 2 (extract) + Phase 4 (render) + Phase 5 (mobile) |
| 2 | Show imagePullPolicy | Phase 2 + 4 + 5 |
| 3 | Show ports | Phase 2 + 4 + 5 |
| 4 | Show env, resources, volumeMounts ("& etc.") | Phase 2 + 4 + 5 |
| 5 | Init containers identified separately | Phase 2 (kind="init") + Phase 4 (pill) |
| 6 | Per-container ready/state/restartCount | Phase 2 (status merge) + Phase 4 |
| 7 | Mobile parity | Phase 5 + Phase 6 |
| 8 | Empty / malformed handling | Phase 4/5 (non-silent-fallback) |
| Verify | All combinations render | Phase 7 |

## Risks / Open Questions

- **Row payload size** — a pod with many containers and large env blocks could push the JSON string to several KB. The Layer8DTable does not display this column (only the detail popup uses it), so per-row render cost is unaffected, but L8Query responses get larger. If this turns out to be material, a follow-up could move container details to a lazy fetch on detail-open.
- **`omitempty` on `imagePullPolicy`** — K8s defaults it to `IfNotPresent` (or `Always` for `:latest` images) when the manifest omits it. The collector emits exactly what `spec.containers[*].imagePullPolicy` contains; the UI shows `—` when empty. We do not synthesize the K8s default — the user sees what the manifest declared.
- **JSON serialization quirks** — protobuf escapes nothing for `string` fields, but `json.Marshal` will. Strings like image names with special chars round-trip cleanly. Verified in head-of-mind walkthrough; will confirm in Phase 7.

## Affected Sibling Projects (push + re-vendor)

- `l8collector` — Phase 2 enrichment.
- `l8parser` — Phase 3 pollaris field addition.

After implementation: push siblings, re-vendor probler, rebuild `parser_demo` and `adcon`/`collector` (whichever runs the K8s collector).
