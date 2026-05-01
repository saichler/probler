# Parser: invoke registered STRING serializers when assigning into struct fields

## Severity
Medium-high. Affects every K8s resource whose proto carries a custom-struct field that the collector emits as a formatted string. Concretely:

- `K8sPod.ready` → `K8sReadyState{Count, Outof}` — collector emits `"1/2"` → field stays `nil` → UI shows "0/0"
- `K8sPod.restarts` → `K8sRestartsState{Count, Ago}` — collector emits `"3 5h12m"` → field stays `nil` → UI shows "0"
- Any future K8s/Istio/probler field where a string value is parsed into a struct via a registered `serializers.X{}` (the pattern is documented in `prob/parser/main.go` via `info.AddSerializer(...)` calls).

These have been broken since the collector started emitting K8s data — visible everywhere the rendered field is "(empty)" or "0/0".

## Root Cause

Trace (verified by reading source, not guessing):

1. `l8collector/.../Enrich.go::enrichPod` produces `_k.ready = "1/2"` — plain string.
2. Pollaris `boot/k8s/pod.go` forwards it as the `READY` column in the CTable.
3. `l8parser/.../CTableToInstances.go::Parse` decodes the cell into a Go `string` value.
4. `Parse` calls `setFieldValue(field, val)` to write the string into the proto field `Ready *K8SReadyState`.
5. `setFieldValue` has these branches:
   ```go
   if valRef.Kind() == reflect.String { /* enum lookup */ }
   if valRef.Type().AssignableTo(field.Type()) { ... }
   if valRef.Type().ConvertibleTo(field.Type()) { ... }
   if field.Kind() == reflect.String { /* fallback string conversion */ }
   ```
   For `string → *K8SReadyState`:
   - Enum lookup fails (not an enum)
   - `string.AssignableTo(*K8SReadyState)` → false
   - `string.ConvertibleTo(*K8SReadyState)` → false
   - `field.Kind() == reflect.String` → false (it's `reflect.Ptr`)
   - **Nothing fires.** Field stays `nil`.
6. JSON-marshal of nil pointer → `"ready": null` (or omitted entirely).
7. UI column renderer falls into its `count=0, outof=0` else branch → "0/0".

The conversion logic exists — `serializers.Ready{}.Unmarshal([]byte("1/2"))` returns `&K8SReadyState{Count:1, Outof:2}` correctly. It's registered against the `K8SReadyState` type at parser activation in `prob/parser/main.go`:

```go
info, _ := nic.Resources().Registry().Info("K8SReadyState")
info.AddSerializer(&serializers.Ready{})
```

But the registered serializer is only consulted by `l8reflect/properties/Setter.go` during property-path writes (e.g. PATCH against an L8Query path). The CTable → instance pipeline doesn't go through Setter; it does direct reflection in `setFieldValue`, which doesn't know about the registry.

## Fix Design

Extend `setFieldValue` to consult the registry's STRING-mode serializer when the source is a string and the target is a struct or pointer-to-struct whose type has a registered serializer.

Concrete change to `l8parser/go/parser/rules/CTableToInstances.go`:

```go
// New signature: takes IResources so we can reach the registry.
func setFieldValue(field reflect.Value, val interface{}, resources ifs.IResources) {
    valRef := reflect.ValueOf(val)

    // Existing string → enum fast path (Phase 3 of k8s-table-fixes).
    if valRef.Kind() == reflect.String {
        if v, ok := enumValueForField(field, valRef.String()); ok {
            field.SetInt(int64(v))
            return
        }
    }

    // NEW: string → registered-serializer struct.
    // Mirrors l8reflect/properties/Setter.go's pattern. Only fires when:
    //   • the source is a string,
    //   • the target is a Ptr or Struct (not a primitive),
    //   • the target's Elem type has a STRING-mode serializer registered.
    // Failures fall through to the existing logic so unrelated parsers
    // are unaffected.
    if valRef.Kind() == reflect.String && resources != nil {
        if newVal, ok := serializerStringToStruct(field, valRef.String(), resources); ok {
            field.Set(newVal)
            return
        }
    }

    if valRef.Type().AssignableTo(field.Type()) { ... }
    if valRef.Type().ConvertibleTo(field.Type()) { ... }
    if field.Kind() == reflect.String { ... }
}

// serializerStringToStruct looks up a STRING-mode serializer for the
// field's type (or its Elem type for pointers) and returns the
// reflect.Value of the unmarshalled instance. Returns (zero, false)
// when no serializer is registered or the unmarshal fails.
func serializerStringToStruct(field reflect.Value, raw string, resources ifs.IResources) (reflect.Value, bool) {
    typ := field.Type()
    if typ.Kind() == reflect.Ptr {
        typ = typ.Elem()
    }
    if typ.Kind() != reflect.Struct {
        return reflect.Value{}, false
    }
    typeName := typ.Name()
    if typeName == "" {
        return reflect.Value{}, false
    }
    info, err := resources.Registry().Info(typeName)
    if err != nil || info == nil {
        return reflect.Value{}, false
    }
    serializer := info.Serializer(ifs.STRING)
    if serializer == nil {
        return reflect.Value{}, false
    }
    inst, sErr := serializer.Unmarshal([]byte(raw), resources)
    if sErr != nil || inst == nil {
        return reflect.Value{}, false
    }
    return reflect.ValueOf(inst), true
}
```

Threading change in `Parse`:
```go
setFieldValue(field, val, resources)
```
The `resources` parameter is already available in `Parse`'s signature; it just needs to be forwarded.

## Compliance Notes (Global Rules)

- **Plan approval workflow (`plan-approval-workflow.md`)** — written to `./plans/`, awaiting explicit approval.
- **Plan traceability and verification (`plan-traceability-and-verification.md`)** — Traceability Matrix + Phase 4 verification.
- **Plan-duplication-audit (`plan-duplication-audit.md`)** — the new helper mirrors the pattern that already exists in `l8reflect/properties/Setter.go`. Could the two share an extracted function? Possibly — but the Setter version is wired into a much larger property-path flow with state we don't have here. A small targeted helper in the parser is cheaper than introducing cross-cutting infrastructure. Documented as Risk #2.
- **Never-edit-vendor (`never-edit-vendor.md`)** — change goes in the `l8parser` source tree, NOT `probler/go/vendor/`. Probler picks it up after re-vendor.
- **No silent fallbacks (`report-infra-bugs.md`)** — every failure path returns `(zero, false)` and falls through to the existing logic; nothing produces a synthetic value. When the unmarshal genuinely fails (malformed input), the field stays `nil` (same as today) but `console.warn`-equivalent (Go: `fmt.Printf` debug log) is emitted so the failing field is visible. Optional log line is in Phase 1.
- **No Go generics (`no-go-generics.md`)** — pure `reflect.Value` + interface-based; no generics.
- **L8UI generic-only (`l8ui-no-project-specific-code.md`)** — no l8ui touch.
- **Mobile parity (`mobile-rules.md`)** — N/A (parser is Go-side, no mobile).
- **Maintainability (`maintainability.md`)** — `CTableToInstances.go` grows by ~30 lines; well under 500.
- **Cleanup test binaries (`cleanup-test-binaries.md`)** — verification phase uses `go build ./...` (no leftover binaries).
- **Follow user issue (`follow-instructions-verify-user-issue.md`)** — the user reported "READY always 0/0"; the plan traces that exact symptom to `setFieldValue` and proposes the targeted fix.

## Phase Breakdown

### Phase 1 — Extend `setFieldValue` in `l8parser`
1. Edit `l8parser/go/parser/rules/CTableToInstances.go`:
   - Add `serializerStringToStruct(field, raw, resources)` helper.
   - Update `setFieldValue` signature to take `resources ifs.IResources` (a third parameter).
   - Update `Parse` (the only caller) to forward `resources` to every `setFieldValue` call.
   - Insert the new branch BEFORE the `AssignableTo` / `ConvertibleTo` checks but AFTER the existing enum lookup.
2. Optional debug log when a serializer is found but `Unmarshal` errors:
   ```go
   fmt.Printf("[CTABLE->INSTANCE-WARN] serializer for %s failed on %q: %s\n", typeName, raw, sErr)
   ```
   Off by default if it gets noisy in production; keeps the parser non-silent for genuine errors.
3. Build with `(cd l8parser/go && go build ./...)` — must compile clean.

Acceptance: `go build ./...` clean; no behavior change for non-string-source / non-registered-serializer paths.

### Phase 2 — (Optional) thin unit test
`go/tests` for l8parser are out of scope for this plan unless the project already tests CTable→Instances flow. If so:
1. Test feeding a `CTable` row with a string column whose target field has a registered STRING serializer (e.g. a fake `Pair{X int32; Y int32}` type).
2. Assert the field receives the unmarshalled struct, not `nil`.
3. Test the negative paths: no serializer → fall through; Unmarshal error → fall through with optional warn log.

If l8parser doesn't currently have parser-rule tests, defer to existing manual end-to-end (Phase 4).

### Phase 3 — Push + re-vendor + rebuild
1. Commit + push the `l8parser` change.
2. Re-vendor probler:
   ```bash
   cd ~/proj/src/github.com/saichler/probler/go
   rm -rf go.sum go.mod vendor && go mod init github.com/saichler/probler/go
   GOPROXY=direct GOPRIVATE=github.com go mod tidy && go mod vendor
   ```
3. Rebuild `parser_demo` (the parser binary that runs the K8s pipeline). The collector and inventory binaries don't need a rebuild — they don't run the parser.
4. Redeploy.

### Phase 4 — End-to-end verification
1. **K8s Explorer Pods view (and classic K8s section's Pods tab):** READY column shows real `<count>/<total>` values (e.g. "1/1", "2/2", "0/3"). Pods with the same status field rendering use the column renderer in `web/probler/k8s/k8s-columns.js` which already handles both shape variants.
2. **Restarts column:** shows `<count> <ago>` text where applicable, not "0".
3. **Probler dashboard "Nodes & Pods" KPI:** real values (driven by the orthogonal dashboard fix landing in this same wave; not parser-dependent — should already work after that JS-only edit).
4. **Other K8s resources:** spot-check one or two that don't have custom serializers (e.g. K8sNode, K8sService) — they should render unchanged. The new branch only fires when a serializer is registered for the field's type, so unrelated fields are untouched.
5. **Existing parser consumers (non-K8s):** spot-check Network Devices / GPUs sections — they don't use string→struct serializers in their CTables, so they should be unaffected. Sanity check: open a network device row, fields render the same as before.

## Traceability Matrix

| # | Concern | Phase |
|---|---|---|
| 1 | READY shows 0/0 (K8sPod.ready) | Phase 1 (parser fix) + Phase 4 (verify) |
| 2 | RESTARTS empty/zero (K8sPod.restarts) | Phase 1 + Phase 4 |
| 3 | Other K8s resources with registered struct serializers | Phase 1 (generic) + Phase 4 (spot-check) |
| 4 | No regression for non-serializer-backed fields | Phase 1 falls through unchanged + Phase 4 spot-check |
| 5 | No regression in non-K8s parser consumers | Phase 1 (additive branch) + Phase 4 spot-check |
| 6 | Registry lookup error doesn't crash | Phase 1 returns `(zero, false)` on error |
| 7 | Push + re-vendor + rebuild | Phase 3 |
| 8 | Dashboard "Nodes & Pods = 0" — orthogonal | Already fixed in `web/dashboard/dashboard-init.js` |

## Risks / Open Questions

1. **Reflection cost.** `setFieldValue` runs once per row × per column. The new path adds a registry lookup + (when matched) a serializer call. Registry lookups are typed `map[string]*Info` reads — O(1). Serializer calls are unavoidable given the conversion. No measurable hit expected at K8s row counts (≤ a few thousand per refresh).
2. **Helper duplication with `l8reflect/properties/Setter.go`.** The two helpers do similar work but feed different downstream code paths. Extracting a shared helper into `l8reflect` would mean a third refactor on top. Defer that consolidation; document the intentional duplication in code comments so future readers see the link.
3. **Wire-format mismatch for non-K8s callers.** If a non-K8s parser has a string column whose target field happens to be a struct with a STRING-mode serializer, the new path will *also* fire there. This is a feature, not a bug — the serializer was registered precisely to allow this conversion — but it changes behavior in places that may have been silently broken. Verification phase explicitly checks the only known non-K8s consumers.
4. **Empty / malformed input.** When the string is empty or the format doesn't match the serializer's expectations, the serializer's `Unmarshal` returns an error (or a nil instance). The fix falls through — same observable behavior as today (nil field, "0/0" rendering). No worse than the current state. The optional warn log makes the failure visible during dev.

## Out of Scope

- New tests in `l8parser/go/tests/` if no existing tests for parser rules — defer.
- Refactoring `l8reflect/properties/Setter.go` to share a helper with the parser — defer.
- Re-encoding the K8s data flow to avoid string-as-format altogether (e.g. having the collector emit a struct directly) — too large a change for this fix.
- Any UI changes — column renderers already handle the parsed struct correctly.

## Affected Files

- `l8parser/go/parser/rules/CTableToInstances.go` — extend `setFieldValue` + add `serializerStringToStruct`. ~30 lines added.
- (Re-vendor) `probler/go/vendor/github.com/saichler/l8parser/...` — automatic via `go mod vendor`.
- (Rebuild) `parser_demo` binary.

No probler-source Go changes. No proto changes. No vendor edits. No l8ui changes. No demo touch.

## Verification (Phase 4 detail)

After deploy + hard refresh:
1. Open `/probler/app.html` → Kubernetes section → Pods tab. READY column shows real values.
2. Open `/probler/k8s-explorer.html` → Pods. Same.
3. Hover/inspect a row's underlying L8Query response in DevTools — `ready` is now `{count, outof}` not `null`.
4. Open Restarts column on a pod that's been restarted — shows `<count> <ago>`.
5. Open Network Devices section → values render unchanged.
6. Check the parser binary log for `[CTABLE->INSTANCE-WARN]` lines — should be absent unless K8s emits a malformed value somewhere.
