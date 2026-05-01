# Make Registry.RegisterType Idempotent (l8utils)

## Problem

`Registry.RegisterType` is documented as idempotent — its doc-comment in
`l8utils/go/utils/registry/Registry.go:108-110` reads:

> Returns true if this is a new registration, false if the type already exists.

This implies that registering a type a second time is a no-op. **It is not.**
The implementation chain is:

```
Registry.RegisterType(t)
  → TypesMap.Put(t.Name(), t)                         (TypesMap.go:33)
      → info, _ := NewInfo(value)                     // ← always builds a fresh Info
      → m.impl.Put(key, info)                         // ← SyncMap.Put always overwrites
```

`NewInfo` constructs `&Info{typ, serializers: empty map}`. `SyncMap.Put`
(`l8utils/go/utils/maps/SyncMap.go:45-54`) does `m[key] = value`
unconditionally and returns `!ok` only as an after-the-fact signal of whether
the key existed before.

Net effect: every second-and-subsequent `RegisterType` for the same type silently
discards the previous `Info` along with anything attached to it — most importantly,
serializers added via `info.AddSerializer(...)`.

### Concrete failure mode (READY=0/0 in probler)

`prob/parser/main.go` does, in order:

1. `Registry().Register(&K8SReadyState{})` — creates `Info_A`.
2. `Registry().Info("K8SReadyState"); info.AddSerializer(&Ready{})` — attaches
   STRING serializer to `Info_A`.
3. Later: `service.Activate(K8sPod, …)` →
   `ParsingService.Activate` → `Introspector.Inspect(K8sPod)` →
   `inspectStruct` walks every nested struct field, hitting
   `Ready *K8SReadyState`, and calling
   `Introspector.addAttribute → registry.RegisterType(K8SReadyState)`
   (`l8reflect/.../introspecting/Helpers.go:26`).
4. `RegisterType` overwrites `Info_A` with a fresh, serializer-less `Info_B`.

When CTableToInstances later asks the registry for the K8SReadyState STRING
serializer to convert `"1/2"` → `*K8SReadyState`, it gets `nil` and the field
silently stays unset — the UI shows `0/0`.

The same class of bug will recur for every future serializer registered before
the framework introspects a parent type that contains the serialized type.

## Goal

Make the implementation honor the documented contract: when `RegisterType` is
called for an already-registered type, the existing `Info` (and any serializers
attached to it) MUST be preserved. No caller should ever lose state by
re-registering a type.

## Surface Area Audit

`Registry.RegisterType` and `TypesMap.Put` callers (live source, excluding
vendor and tests):

| Project | File | Behavior |
|---|---|---|
| l8utils | `registry/Registry.go::registerPrimitives` (×8) | Once at NewRegistry — first registration always new |
| l8utils | `registry/Registry.go::registerBase` (×17) | Once at NewRegistry — first registration always new |
| l8utils | `registry/Registry.go::Register/RegisterType/NewOf` | Public entry points |
| l8reflect | `introspecting/Helpers.go:26` (`addAttribute`) | **Re-registers nested struct types during inspection** ← root cause site |
| l8reflect | `introspecting/Helpers.go:105` (`inspectStruct` redundant call) | Re-registers the parent struct type |
| l8parser, l8collector, l8inventory, l8services, l8bus, l8pollaris | many `Register(&proto{})` calls | First-registration calls; some may be re-issued by parallel services on the same vnic |
| Application code (probler, l8erp, etc.) | many `Register(&proto{})` calls | Same as above |

None of these consumers WANT overwrite semantics. The introspector calls
RegisterType defensively to ensure the type is in the registry at all; service
activation calls Register to declare the proto types they handle. None of them
intend to wipe associated state. Therefore the fix is safe — it strictly aligns
behavior with documented intent.

### Consumers of `Info.serializers` map

| Site | What it does | Fix benefit |
|---|---|---|
| `l8reflect/properties/Setter.go:122-129` | When setting a string value into a struct field, looks up `info.Serializer(STRING)` and calls `Unmarshal` to convert | Serializer survives introspection — string→struct conversion works |
| `l8utils/utils/resources/Resources.go:128` | Copies `Serializer(BINARY)` from one resources to another | Unaffected (BINARY serializers are added during NewRegistry / registerBase, before any user RegisterType) |
| `l8parser/.../CTableToInstances.go` (probler-vendored, after this plan) | String→struct via STRING serializer — see `parser-string-to-struct-serializer.md` | Same benefit as Setter.go |

## Approach

Two-step, smallest-possible change:

1. **Add `PutIfAbsent` to `SyncMap`** — preserves existing value, returns
   whether a new entry was inserted. Atomic under the existing lock.
2. **Change `TypesMap.Put` to use `PutIfAbsent`** — when the type name already
   has an `Info`, leave it (and its serializers) in place. The existing bool
   return semantics ("true if newly registered") become correct as a side
   effect.

`Registry.RegisterType` itself does not need to change — only its callee.

### Why not just guard inside `TypesMap.Put` with a Get-then-Put?

A `Get`-then-`Put` pair has a TOCTOU race under concurrent registration. The
introspector and service activations can run from different goroutines on the
same vnic. The atomic `PutIfAbsent` primitive avoids the race and is a
generally useful addition to `SyncMap`.

## Design

### SyncMap.PutIfAbsent

```go
// PutIfAbsent inserts the key/value pair only if the key is not already
// present. Returns true if the value was inserted, false if the key already
// had a value (which is preserved untouched). Atomic under the map's lock.
func (this *SyncMap) PutIfAbsent(key, value interface{}) bool {
    if this == nil {
        return false
    }
    this.s.Lock()
    defer this.s.Unlock()
    if _, ok := this.m[key]; ok {
        return false
    }
    this.m[key] = value
    return true
}
```

### TypesMap.Put (new behavior)

```go
func (m *TypesMap) Put(key string, value reflect.Type) (bool, error) {
    // Preserve existing Info (and any serializers attached to it) on
    // re-registration of the same type. This honors the documented
    // contract on Registry.RegisterType: "Returns true if this is a new
    // registration, false if the type already exists."
    if m.impl.Contains(key) {
        return false, nil
    }
    info, err := NewInfo(value)
    if err != nil {
        return false, err
    }
    return m.impl.PutIfAbsent(key, info), nil
}
```

`Contains` is a quick early-out for the common case; `PutIfAbsent` is the
race-safe authoritative check. (We could use `PutIfAbsent` alone, but the
`NewInfo` allocation is then wasted on every re-registration; the early
`Contains` keeps the hot path allocation-free.)

### What `Registry.RegisterType` returns now

Already correct. The bool return is "was this a new registration", and the new
implementation makes that bool reflect reality when the type pre-existed.
Existing test at `l8utils/go/tests/Registry_test.go:137-145` already asserts
`false` is returned when re-registering a primitive — that test will continue
to pass.

## Files Affected

| File | Change |
|---|---|
| `l8utils/go/utils/maps/SyncMap.go` | + `PutIfAbsent(key, value) bool` method |
| `l8utils/go/utils/registry/TypesMap.go` | `Put` returns `(false, nil)` when key exists; otherwise uses `PutIfAbsent` |
| `l8utils/go/tests/SyncMap_test.go` (new file or extend existing) | Test `PutIfAbsent` insert and preserve cases |
| `l8utils/go/tests/TypesMap_test.go` | Test that re-Put preserves existing Info identity (and serializer state) |
| `l8utils/go/tests/Registry_test.go` | Add regression test: Register → AddSerializer → RegisterType (same type) → assert serializer still resolvable |

No dependent project source needs to change. After the l8utils release is
vendored, behavior changes at every call site automatically.

## Risk / Compatibility

- **Behavior change:** any caller currently relying on `RegisterType` to *reset*
  an `Info` will see a regression. The audit found no such caller in any
  sibling repo. The behavior change matches the documented contract that
  callers were told to expect.
- **Concurrency:** `PutIfAbsent` is implemented under the same lock as `Put`,
  preserving the existing thread-safety guarantees.
- **Performance:** one extra `Contains` (read-locked) on the hot path of
  re-registration. Negligible — re-registration is bounded by the number of
  introspected types in the process.
- **Wire format / proto compat:** none affected.

## Traceability Matrix

| # | Section | Gap / Action Item | Phase |
|---|---|---|---|
| 1 | Problem | `TypesMap.Put` always creates new `Info` and overwrites | Phase 2 |
| 2 | Problem | `SyncMap` lacks atomic `PutIfAbsent` primitive | Phase 1 |
| 3 | Problem | Doc-comment on `RegisterType` doesn't match implementation | Phase 2 (made true by impl change; no comment edit needed) |
| 4 | Surface Area Audit | Confirm no caller relies on overwrite | Phase 0 |
| 5 | Design | New `SyncMap.PutIfAbsent` is atomic and lock-correct | Phase 1 |
| 6 | Design | New `TypesMap.Put` uses Contains+PutIfAbsent (no race, no wasted allocation) | Phase 2 |
| 7 | Files Affected | Add unit test for `PutIfAbsent` (insert + preserve) | Phase 1 |
| 8 | Files Affected | Add unit test for `TypesMap.Put` idempotency (Info identity preserved) | Phase 2 |
| 9 | Files Affected | Add regression test at registry level: Register → AddSerializer → RegisterType (same type) → serializer still resolvable | Phase 3 |
| 10 | Risk | Verify thread-safety unchanged | Phase 1 |
| 11 | Cross-project | Re-vendor l8utils into every dependent project | Phase 4 |
| 12 | Verification | Probler READY=0/0 fixed end-to-end | Phase 5 |
| 13 | Verification | Other introspected types' wire BINARY serializers still work (no resources copy regression) | Phase 5 |
| 14 | Verification | All existing l8utils tests still pass | Phase 1 + Phase 2 |
| 15 | Verification | Sibling repos' tests still pass after re-vendor | Phase 4 |

## Phase Breakdown

### Phase 0 — Audit & Pre-flight (no code changes)

1. Verify the surface-area audit table above against the current state of every
   sibling repo — re-grep for `RegisterType` and `Registry().Register(` and
   spot-check any new call site introduced since this plan was drafted.
2. Confirm no test in any repo intentionally relies on `RegisterType` resetting
   an `Info`. Search pattern:
   ```bash
   for repo in l8utils l8reflect l8parser l8collector l8inventory l8secure \
              l8bus l8services l8pollaris l8srlz; do
     grep -rn "RegisterType\|TypesMap" \
       /home/saichler/proj/src/github.com/saichler/$repo/go/tests \
       --include="*.go" 2>/dev/null
   done
   ```
3. Confirm `l8utils/go/tests/Registry_test.go:137-145` (the "re-registering int
   returns false" assertion) still passes under the new behavior — yes, because
   `Registry_test` only checks the bool return, which the new impl preserves.

Exit criteria: audit table validated; no rule-breaking test found; ready to code.

### Phase 1 — `SyncMap.PutIfAbsent`

Files: `l8utils/go/utils/maps/SyncMap.go`, `l8utils/go/tests/`

1. Add `PutIfAbsent(key, value interface{}) bool` to `SyncMap` per the design
   above. Implement under the existing `s.Lock()/Unlock()` pair.
2. Add unit tests:
   - `TestSyncMapPutIfAbsent_Insert` — empty map, PutIfAbsent returns true,
     subsequent Get returns the inserted value.
   - `TestSyncMapPutIfAbsent_Preserve` — pre-populate via `Put`, then
     `PutIfAbsent` with a different value, returns false, `Get` still returns
     the original value.
   - `TestSyncMapPutIfAbsent_NilReceiver` — nil receiver returns false, no
     panic.
3. `cd l8utils/go && go test ./tests/...` — confirm all tests pass.

Exit criteria: `SyncMap.PutIfAbsent` exists, tested, and l8utils builds clean.

### Phase 2 — `TypesMap.Put` idempotent

Files: `l8utils/go/utils/registry/TypesMap.go`, `l8utils/go/tests/`

1. Replace `TypesMap.Put` body with the design above:
   - If `m.impl.Contains(key)`: `return false, nil` (no allocation, no
     overwrite).
   - Otherwise build a fresh `Info` and insert via `m.impl.PutIfAbsent`.
2. Add `TestTypesMapPut_PreservesExistingInfo`:
   - Create a `TypesMap`, `Put("Foo", reflect.TypeOf(Foo{}))`.
   - Get `info1 := tm.Get("Foo")`. Stash a sentinel into `info1.serializers`.
   - Call `Put("Foo", reflect.TypeOf(Foo{}))` again — assert it returns
     `(false, nil)`.
   - Get `info2 := tm.Get("Foo")`. Assert `info1 == info2` (same pointer) AND
     the sentinel survived.
3. `go test ./tests/...` — confirm all existing TypesMap tests still pass and
   the new one passes.

Exit criteria: `TypesMap.Put` is idempotent under both functional and pointer-
equality assertions; existing tests green.

### Phase 3 — Registry-level regression test

Files: `l8utils/go/tests/Registry_test.go`

1. Add `TestRegisterTypeIdempotent_PreservesSerializer`:
   - Construct a fresh `Registry`.
   - `Register(&Foo{})`.
   - `info, _ := r.Info("Foo")`. `info.AddSerializer(&fakeSerializer{mode:STRING})`.
   - `r.RegisterType(reflect.TypeOf(Foo{}))` — assert returns `(false, nil)`.
   - `info2, _ := r.Info("Foo")`. Assert
     `info2.Serializer(ifs.STRING) != nil` and is the same instance.
2. `go test ./tests/...` — green.

Exit criteria: registry-level proof that the serializer wipe is gone.

### Phase 4 — Cross-project re-vendor

For each consumer that depends on l8utils — `l8reflect`, `l8services`,
`l8bus`, `l8pollaris`, `l8parser`, `l8collector`, `l8inventory`, `l8secure`,
`l8srlz`, application repos `l8erp`, `probler`, others — and assuming the
l8utils change has been pushed and tagged:

1. In each repo's go module root:
   ```bash
   cd <repo>/go
   rm -rf go.sum go.mod vendor
   go mod init
   GOPROXY=direct GOPRIVATE=github.com go mod tidy
   go mod vendor
   ```
2. `go build ./...` — confirm clean.
3. `go test ./tests/...` (where tests exist) — confirm clean.

For probler specifically:

1. Re-vendor as above.
2. Rebuild every demo binary that links the registry:
   `cd go && ./build-demo.sh` (or rebuild parser_demo / orm_demo / k8s_demo /
   collector_demo individually).

Exit criteria: every dependent repo builds and passes its existing tests with
the new l8utils.

### Phase 5 — End-to-End Verification

For probler with the K8s pollaris flow:

1. Bring up the demo (`cd go && ./run-demo.sh`).
2. Wait for the K8s collector to run and emit pod data.
3. **Pods table** — verify the `READY` column shows real `count/outof` values
   (e.g. `1/1`, `2/3`) and not `0/0`. Verify on at least 5 pods.
4. **Pod detail popup** — open a pod, verify the Ready section reflects the
   same value.
5. **Restart count** — confirm `K8SRestartsState` works the same way (parser
   main.go is wired symmetrically via the same Ready-style serializer pattern;
   if a `Restarts` serializer is also registered, it should now survive
   activation).
6. **Other K8s resources** — sanity check Deployments, DaemonSets,
   StatefulSets — their tables and details should still render correctly
   (no regression from the introspector / registry change).
7. **Other modules** — sanity check probler's network device and GPU sections.
   These depend on the same `Resources().Registry()` and were previously
   working via overwrite-tolerant patterns; confirm no regression.
8. **L8erp / l8topology / siblings** — if available, smoke-test login + a
   couple of CRUD flows to confirm the registry change didn't ripple.

For sibling repos that have integration tests:

9. Run each repo's `go/tests/` end-to-end suite and confirm pass.

Sections to verify:

- [ ] Probler: Pods table READY column renders count/outof
- [ ] Probler: Pod detail Ready section
- [ ] Probler: Pod RESTARTS column / detail (if/when wired)
- [ ] Probler: Deployments / DaemonSets / StatefulSets tables + details
- [ ] Probler: Network devices section
- [ ] Probler: GPUs section
- [ ] Probler: K8s explorer portal
- [ ] l8utils: tests green
- [ ] l8reflect: tests green
- [ ] l8parser: tests green
- [ ] l8collector: tests green
- [ ] l8inventory: tests green
- [ ] l8services: tests green
- [ ] l8bus: tests green

Exit criteria: every checkbox above ticked. The READY=0/0 bug is closed; no
regression observed in any consumer; the registry contract now matches its
documentation.
