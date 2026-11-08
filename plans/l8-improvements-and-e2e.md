# Plan: Layer 8 Improvements + KIND/Playwright E2E Suite (with l8opensim)

Sources: `../l8book/improvements.md`, `../l8book/ai/layer-8-guide-lines.md`
(SystemServicesRequired, K8sRules, PostImplementationE2ETesting, LocalRunViaKind, PlanRequirements,
MobileRules), `../l8book/ai/layer-8-arch.md`. Reference implementation: `../l8erp/e2e`, `../l8erp/k8s`.

Goal: apply the cross-project improvements to probler, build an e2e suite that drives **every page,
popup and UI function** (desktop + real mobile bundle) against probler deployed on KIND, with live
data coming from l8opensim simulators. Then loop run → fix → re-run until the whole suite is green.

---

## 0. Current state (audit)

| Area | Finding |
|------|---------|
| l8ui submodule | At `6375ae8`, 17 commits behind upstream `../l8ui` `b65b787`. Missing live-by-default tables, five live slots, query-body registration and the listener-leak fix (`45a3b4a`, `d703fcc`, `b65b787`). |
| Go deps | `l8common`, `l8web` and others are pinned to Sept 2026. They need a bump for `system.Activate` behaviour and `server.SetServiceTimeout`. |
| System services | `go/prob/alarms/main.go` already calls `system.Activate`. **`go/prob/orm/main.go:46` calls `services.ActivateEvents` directly, which breaks the SystemServicesRequired rule** (a second activation diverges the caches). |
| UI type registration | `go/prob/newui/main.go` registers `EventRecordList` only. `EventRecord`, `NotifyRecord`/`List` and `IntegrationConfig`/`List` are not registered. |
| Dashboard live | `dashboard/dashboard-init.js:257` uses bare `Layer8DWebSocket.subscribe(...)` inside a `typeof` guard. It needs a live slot (`registerQuery` + `listen`, one `liveOwner` per entry), and the guard has to go (FailFastNoSilentFallback). |
| l8agent | Probler doesn't use l8agent, so improvements §3 (AgentConfig, `help.md`, `AgntChat` timeout, `hostAliases`) **do not apply**. This is recorded here so it isn't counted as missing. |
| KIND | `k8s/kind-start.sh` exists, but every workload in `probler-kind.yaml` and `probler-local.yaml` has `imagePullPolicy: Always`. That silently throws away images loaded with `kind load`. There is no `seed-mocks.sh`, and the script doesn't seed or wait for endpoints. |
| Local run | `go/build-demo.sh`, `go/run-demo.sh` and `go/demo/` still exist. LocalRunViaKind says KIND is the only local path (see Open Question 2). |
| E2E | No `e2e/` directory. |
| Data sources | l8opensim covers network devices (17 vendor profiles), GPU servers (DGX A100/H100, HGX H200), servers and storage. It has nothing for k8s, hypervisors or VMs. Probler's K8s collector (`adcon`, `L8PKubectl`) can point at **the KIND cluster itself**. The Hosts section (`js/hosts.js:45`) builds its tables from `const hypervisorData = []`, which has no backend, so its row-click modals can't be reached with real data (see Phase 6.4). |
| Simulator networking | The simulator has to run as root on the host (TUN + `opensim` netns + host routes via `10.254.0.2`). Collector pods are not `hostNetwork`, so traffic goes pod → kindnet SNAT → docker bridge → host route → sim netns. This is untested and needs a FORWARD rule between `br-<kind>` and `veth-sim-host`. |

### Duplication audit (PlanRequirements)
- Login/session, nav, table, popup and section-load waits are written once in `e2e/fixtures` and `e2e/pages`. Specs never repeat that logic.
- Target registration: `go/prob/common/commands/addDevices.go` already builds the `L8PTargetList` for the `base` and `gpus` ranges. The e2e seeding **reuses `prctl` / those builders** and does not hand-write target JSON in a shell script.
- No existing behavioural code is duplicated more than twice by this plan, so no extraction Phase 0 is required. If Phase 5 turns up duplicated modal logic between desktop and mobile while fixing bugs, fix it once in the shared component.

---

## Phase 1: Framework bumps
1. Update the l8ui submodule in `go/prob/newui/web/l8ui` to upstream `b65b787` or later. Diff upstream before touching anything (memory: alm UI is a copy of l8alarms' `ui/web`, so re-sync `web/alm` from `../l8alarms` if the upstream changed).
2. Re-vendor Go deps: bump `l8common`, `l8web`, `l8utils`, `l8services`, `l8types`, `l8bus`, `l8srlz`, `l8alarms`, `l8events` to the current upstream (`go get ...@latest && go mod tidy && go mod vendor`). Do not hand-copy anything into `vendor` (feedback_vendor_workflow). If an upstream fix is missing, stop and ask the user to push it.
3. `go build ./...` and `go vet ./...` in `go/`, then run `go/tests`.

## Phase 2: Backend improvements
1. `go/prob/orm/main.go`: remove `services.ActivateEvents(...)`. Events and notify must be activated exactly once, through `system.Activate` (already in `alarms/main.go`, which owns them). Verify with
   `grep -rn "ActivateEvents\|ActivateNotify\|ActivateIntegrationConfig" go --include=*.go | grep -v vendor/`, which should return nothing.
2. `go/prob/newui/main.go` `RegisterTypes`: register `EventRecord`/`EventRecordList` (`EventId`), `NotifyRecord`/`List` (`NotifyId`) and `IntegrationConfig`/`List` (`IntegrationId`).
3. Check `alarms/main.go` ordering: `system.Activate` runs once, after the project's own services.

## Phase 3: UI improvements (desktop + mobile)
1. **Dashboard live slot** (`dashboard/dashboard-init.js`): replace the three `subscribe` calls with one slot owner per entry:
   `DashboardStats.liveOwner = {}`, then `Layer8DWebSocket.registerQuery('dashboard', owner, endpoint, query, {onReconnect})` for each KPI query, plus `Layer8DWebSocket.listen('dashboard', owner, model, debouncedReload)` for `NetworkDevice`, `GpuDevice` and `K8SCluster`. Remove the `typeof Layer8DWebSocket` guard.
2. Look for other custom screens that build their own queries and join them to a live slot the same way: the k8s overview KPIs (`kubernetes/kubernetes-overview-kpis.js`), `js/live-popup.js`, `js/health-detail-live.js` and `k8s-explorer/`.
3. Shell script audit against the l8erp bug list: make sure `app.html` and `m/app.html` include `layer8-query-builder.js`, `layer8-form-chips.js`, `layer8-field-parsers.js`, `layer8-period-selector.js`, `layer8-inline-table-state.js`, `layer8-reference-config-resolver.js` and `layer8-datepicker-grid.js`, or the l8ui `b65b787` equivalents. Also check the `nsMap` namespace casing in `js/app.js` and that every enum part file is listed in `m/app.html`. The Phase 4 inventory generator reports load failures, so treat that report as the source of truth.
4. **Mobile parity:** make the same live-slot change in `m/sections/dashboard.html`'s initializer in `m/js/app-core.js`. Trace each model and field from protobuf to transform to columns before writing anything (feedback_mobile_parity_enforcement).
5. Optional (theme gotchas in arch.md): grep project CSS for `color: white`/`#fff` on primary backgrounds and for redefinitions of the aliased tokens (`--bg-primary`, `--text-primary`, ...). Fix the hits.

## Phase 4: KIND infrastructure
1. Set `imagePullPolicy: IfNotPresent` in `k8s/probler-kind.yaml` and `k8s/probler-local.yaml`. GKE and baremetal stay unchanged.
2. Add `k8s/build-images.sh`. It builds every service image locally (reusing each `go/prob/<svc>/build.sh` Docker step, **without push**) under the names `kind-start.sh` loads.
3. Add `k8s/seed-mocks.sh`, modelled on l8erp:
   - wait for `/login.json`
   - `POST /auth` as `operator`/`Oper123!`
   - wait until `GET /probler/91/Targets` (L8Query body) stops returning 404/000
   - register targets by reusing `prctl`: `prctl localhost add devices base`, `... gpus`, and a K8s cluster target pointing at the KIND cluster's in-cluster kubeconfig (`creates/CreateCluster.go`, credential `lab`). That last one needs a credential entry with the kind kubeconfig (see Open Question 3).
   - wait until `NetworkDevice`, `GpuDevice` and `K8SCluster` queries return at least one row, so the specs never pass against an empty cluster.
4. Add `k8s/sim-start.sh` / `sim-stop.sh` (wrapping `../l8opensim/go/simulator`, run with sudo):
   - build the simulator if it's missing, `modprobe tun`, raise the fd limit, start it with `-port 8080`
   - `POST /api/v1/devices`: 19 network devices at `10.20.30.1/24` (`round_robin`, category "Network Devices") and 3 GPU servers at `20.20.30.1/24` (category "GPU Servers"). These match the `base`/`gpus` ranges in `addDevices.go`.
   - add the FORWARD/iptables (nft) rule between the kind docker bridge and `veth-sim-host`
   - smoke check: `docker exec probler-control-plane ping -c1 10.20.30.1`, then an SNMP get from the collector pod
   - the ranges deliberately avoid 10.244/16, 10.96/12 and 172.18/16
5. Update `k8s/kind-start.sh`: optionally build the images, start the simulators, create the cluster, load the images, deploy in 3 phases, then run `seed-mocks.sh`. Update `kind-stop.sh` to also stop the simulators. Keep the single-node layout; the script comment explains why port mapping lives on the control plane.
6. Update `k8s/README.md` with the "Local Development Setup" steps: `sim-start` → `kind-start` → `cd e2e && npm test` → `kind-stop`.

## Phase 5: E2E suite (`e2e/`, port of the l8erp skeleton)
**Layout:** `playwright.config.ts`, `package.json`, `tsconfig.json`, `README.md`, `fixtures/` (env, api, test, globals, inventory(.json), queries), `pages/` (LoginPage, DesktopNav, DesktopTable, Popup, MobileNav, plus probler-specific DeviceModal, K8sExplorer, IframeSection), `drivers/` (table, forms, crud), `tools/` (`shell-loader.js`, `generate-inventory.js`), `tests/desktop/`, `tests/mobile/`.

**Config:**
- base URL `https://localhost:2443`, prefix `/probler`, user `operator`/`Oper123!`, with env overrides `PROBLER_*`
- `ignoreHTTPSErrors`, `workers: 2`, `retries: 1`, `video: on-first-retry`, trace `retain-on-failure`
- projects: `desktop` (Desktop Chrome at 1600x1000) and `mobile` (Pixel 7, loading `/m/app.html`)

**Rules (non-negotiable, from the guidelines):**
- Worker-scoped `api`, `desktopSession` and `mobileSession`, plus `freshApp`/`freshMobile`.
- No fixed sleeps. `lint:sleep` and `lint:scratch` are enforced.
- Section-load wait uses the stale tag plus the inline opacity.
- Clean up through the API in `afterEach`, keyed by a run code.
- Never assert exact counts on live data.
- Known gaps are marked `test.fail()`, never skipped.

**Generated coverage:** `tools/generate-inventory.js` loads `app.html` and `m/app.html` in a DOM stub and reads the `Probler*` namespaces, `probler-config.js`, the `alm-config.js` modules, `LAYER8M_NAV_CONFIG` and the mobile registries into `fixtures/inventory.json`. The sweep specs iterate over it, so coverage grows on its own when configs change.

### Desktop specs (`tests/desktop/`)
| Spec | Covers |
|------|--------|
| 00-shell-integrity | Every `<script>`/`<link>` in `app.html` returns 200, no page errors, required globals defined, inventory generator reports zero load failures |
| 01-auth | `index.html` landing, `login.html` redirect, l8ui login (good and bad password), logout, token reuse |
| 02-auth-screens | register / forgot-password / reset-password pages render, captcha widget present |
| 03-landing-and-modals | Landing page: about, demo and developer modals (`modals/*.html`) open and close; `about.html`, sponsor button/card |
| 04-navigation | Every `data-section` (dashboard, network, gpus, hosts, kubernetes, inventory, topologies, alarms, system, analytics, applications, automation, infrastructure) loads with no console errors. Placeholders render their placeholder. |
| 05-dashboard | KPI widgets show non-zero device/GPU/cluster counts from sim data, charts render, widget click-through navigates. Live: a mutation through the API updates the KPIs with no reload. |
| 06-network | Device table: paging, sort, filter, refresh. Row click opens the device modal; **every tab** (overview, interfaces, physical tree, performance charts, routing) renders data; the tree expands and collapses; the modal closes. |
| 07-gpus | GPU table features. GPU modal: every tab and every metric chart. |
| 08-hosts | Hypervisor and VM tabs and tables render. The row-click modals are covered by the Phase 6.4 decision. |
| 09-kubernetes | Overview cards plus cluster filter. Every resource table (pods, deployments, sts, ds, rs, jobs, cronjobs, hpa, services, ingress, nodes, ...) and the detail popup for each. Pod container details. |
| 10-k8s-explorer | `k8s-explorer.html` portal: tree/nav, resource hero, header parity, detail panes |
| 11-inventory-targets | Targets UI: list, add a target (CRUD with run-coded IP), edit, start/stop action, host detail, delete (cleanup) |
| 12-topologies | Topo section: topology list loads, WebGL canvas renders with no GL errors, layout switch, node click details |
| 13-alarms | ALM module: Alarms, Events, Correlation rules, Policies (notification/escalation), Archive, Filters. Tables, forms, CRUD on the editable models, reference pickers, alarm detail popup, ack/clear actions. |
| 14-system | SYS: Health (table, detail popup, live health, memory-dump button), Security (users, roles, credentials CRUD), Modules (dependency graph), Logs (tree browser plus viewer), Data import |
| 15-service-coverage | Inventory sweep: every service in every module opens, its table renders columns from config, and its first row opens a popup when it has one |
| 16-api-contract | Every inventory endpoint answers an L8Query `page 0` with no 4xx/5xx; KPI counts come from page 0 |
| 17-table-features | Sort, filter, paging, page-size, column filter, export (CSV) across the representative tables |
| 18-view-system | View switcher (table/chart/…) for every service with `alternateViews` |
| 19-realtime | Websocket connects. Register, then mutate from a second client, then the callback fires. An open table shows another client's add and delete (Targets / ALM model). Only the 5 most recently used components stay live. |
| 20-theme-and-permissions | Theme toggle persists across sections and pages (on `freshApp`). Permission-aware UI with a view-only account (create a `viewer` user in setup), with operator as the control. |

### Mobile specs (`tests/mobile/`, real `/m/app.html`)
| Spec | Covers |
|------|--------|
| 00-shell-integrity | Scripts resolve, globals defined, no page errors |
| 01-auth-and-home | Mobile `index.html`, login, home nav cards |
| 02-service-coverage | Every `LAYER8M_NAV_CONFIG` module and sub-module (matched by **label**). Card tables (`mobile-table-*` / `mobile-edit-table-*`) render and paginate. |
| 03-details | Mobile detail popups: network device, GPU, GPU single, host, k8s, health (`m/js/details/*`) with every tab/section |
| 04-crud | Targets, ALM editable models, security users/roles/credentials: create, edit, delete on mobile forms |
| 05-dashboard-live | Mobile dashboard KPIs plus live update |
| 06-view-system-and-theme | View switcher, theme toggle |
| 07-parity | Each desktop service with a mobile counterpart shows the same row for the same key. Sections without a mobile counterpart (CLAUDE.md list: analytics, applications, automation, infrastructure, matrix, topologies, alarms) are `test.fail()` parity markers. |

## Phase 6: Run → fix → re-run until green
1. Run `00-shell-integrity` first (desktop and mobile). It finds missing-script bugs fastest.
2. Full run: `cd e2e && npm test`. Triage each failure into one of four kinds:
   - **App bug**: fix it in `go/prob/newui/web/` (and `m/` for parity).
   - **Backend bug**: fix it in `go/prob/...`.
   - **Framework bug**: report it to the user for an upstream push (l8ui is a submodule; never patch vendor).
   - **Test bug**: fix the spec.
3. Fix loop (web assets are baked into the image):
   - rebuild the image
   - `kind load docker-image saichler/<img>:latest --name probler`
   - `kubectl --context kind-probler -n probler delete pod <pod>`
   - wait for Ready
   - re-run the failed slice (`-g`), then the full suite
4. Hosts (no backend data): pick the user's answer to Open Question 4. Until then the hypervisor/VM modal tests are `test.fail()` with a reason, not skipped.
5. Exit criterion: **two consecutive full runs** (desktop + mobile) green with `retries: 1` and no test passing only on retry. `lint:sleep` and `lint:scratch` must be clean.

## Phase 7: Final verification
- `kind-stop.sh`, then `sim-start.sh`, then `kind-start.sh` (fresh cluster, clean data), then `npm test`: green.
- Grep checks from the guidelines: no `zzz-*` files, no sleeps, `scope: 'worker'` present, no direct `Activate*` calls for events/notify.
- Manual smoke of each section on desktop and mobile: navigate, data loads, row click, forms submit.
- Update CLAUDE.md "Build & Run" (KIND + e2e flow) and the memory notes.
- Commit locally only. Never push (feedback_never_push).

---

## Traceability matrix
| # | Section | Gap / Action Item | Platform | Phase |
|---|---------|-------------------|----------|-------|
| 1 | All | l8ui submodule behind (live slots, query-body register, leak fix) | Desktop+Mobile | 1.1 |
| 2 | Alarms | `web/alm` resync with l8alarms if upstream changed | Desktop+Mobile | 1.1 |
| 3 | Backend | Go deps bump (l8common/l8web/...) | Backend | 1.2 |
| 4 | Backend | orm calls `ActivateEvents` directly | Backend | 2.1 |
| 5 | Backend | UI missing EventRecord/NotifyRecord/IntegrationConfig registration | Backend | 2.2 |
| 6 | Dashboard | Custom queries not on a live slot; `typeof` guard | Desktop | 3.1 |
| 7 | Dashboard | Same, mobile | Mobile | 3.4 |
| 8 | K8s/Health/Explorer | Custom live screens join live slot | Desktop | 3.2 |
| 9 | Shell | Missing shared scripts / nsMap / enum parts | Desktop+Mobile | 3.3, 5 (00 spec) |
| 10 | CSS | Theme alias / hardcoded white audit | Desktop+Mobile | 3.5 |
| 11 | l8agent items (§3) | Not applicable, probler has no agent | n/a | 0 (recorded) |
| 12 | K8s | `imagePullPolicy: Always` on kind/local | Infra | 4.1 |
| 13 | K8s | Local image build without push | Infra | 4.2 |
| 14 | K8s | `seed-mocks.sh` with endpoint wait + data wait | Infra | 4.3 |
| 15 | Sim | l8opensim start/stop + device creation + routing | Infra | 4.4 |
| 16 | K8s | kind-start/stop orchestration + README | Infra | 4.5, 4.6 |
| 17 | Local run | go/demo + run-demo.sh vs KIND-only rule | Infra | Open Q2 |
| 18 | E2E | Skeleton, fixtures, inventory generator, lints | Desktop+Mobile | 5 |
| 19 | Landing/Auth | index, login, auth screens, landing modals | Desktop+Mobile | 5 (01-03, m01) |
| 20 | Dashboard | KPIs, charts, live | Desktop+Mobile | 5 (05, m05) |
| 21 | Network | Table + device modal all tabs | Desktop+Mobile | 5 (06, m03) |
| 22 | GPUs | Table + modal all tabs | Desktop+Mobile | 5 (07, m03) |
| 23 | Hosts | Tables + modals (no backend data) | Desktop+Mobile | 5 (08, m03), 6.4 |
| 24 | Kubernetes | Overview, all resource tables + popups | Desktop+Mobile | 5 (09, m03) |
| 25 | K8s Explorer | Portal page | Desktop | 5 (10) |
| 26 | Targets | CRUD + actions | Desktop+Mobile | 5 (11, m04) |
| 27 | Topologies | WebGL topo section | Desktop | 5 (12) |
| 28 | Alarms | ALM all modules, CRUD, actions | Desktop | 5 (13) |
| 29 | System | Health, security CRUD, modules, logs, import | Desktop+Mobile | 5 (14, m02, m04) |
| 30 | Placeholders | analytics/applications/automation/infrastructure | Desktop | 5 (04) |
| 31 | All | Service sweep, API contract, table features, views | Desktop+Mobile | 5 (15-18, m02, m06) |
| 32 | All | Realtime + 5 live slots | Desktop | 5 (19) |
| 33 | All | Theme + permissions (viewer) | Desktop+Mobile | 5 (20, m06) |
| 34 | Parity | Desktop sections missing on mobile flagged | Mobile | 5 (m07) |
| 35 | All | Run → fix → re-run to green, 2 consecutive green runs | Desktop+Mobile | 6 |
| 36 | All | Fresh-cluster verification + docs | All | 7 |

## Open questions (answer before or during implementation)
1. **sudo for the simulator.** `sim-start.sh` needs root for TUN, netns, routes and the FORWARD rule. Should it call `sudo` (you type the password), or do you prefer a one-time sudoers entry for the simulator binary?
2. **`go/demo` / `run-demo.sh`.** The guidelines (LocalRunViaKind) say to remove them in favour of KIND only, but this project's CLAUDE.md still documents them. Remove them, or keep them?
3. **K8s target for e2e.** Point the `adcon`/K8s collector at the KIND cluster itself (needs a `lab` credential holding the kind kubeconfig in the security config)? The alternative is to leave the Kubernetes section with whatever the admission controller pushes.
4. **Hosts section.** Its tables have no data source (`hypervisorData = []`). Options: (a) add mock hypervisor/VM data so the modals can be tested, (b) wire a real backend later and keep the modal tests as `test.fail()`, (c) remove the section.

---

## Execution results (2026-11-08)

Decisions taken for the open questions: (1) `sudo` from `k8s/sim-start.sh`; (2) `go/demo` kept
(CLAUDE.md still documents it); (3) K8s data comes from probler-admission observing the KIND cluster
itself, no extra target needed; (4) Hosts & VMs stays a `test.fail()` known gap.

### Fixed in probler
| Area | Fix |
|------|-----|
| Framework | l8ui submodule -> `b65b787`; Dockerfiles move every layer8 module to `@latest` after `tidy` (l8topology/l8alarms pinned pre-`L8Register` l8ql/l8utils, images did not compile) |
| Build | `k8s/build-images.sh` rebuilds the security/postgres plugin images (toolchain must match: plugin go1.27.1 vs builder go1.27.3) |
| Backend | orm no longer calls `ActivateEvents`; UI registers EventRecord/NotifyRecord/IntegrationConfig/L8ImportTemplate; `ImprtTmpl` ORM service activated (in probler-alarms, next to the other L8SG services); web server joins the logs vnet (SYS > Logs was 404); topology re-runs Layer 1 discovery every 60s (single startup attempt raced NCache, topology stayed empty) |
| UI | dashboard + mobile dashboard on a stable live slot; sidebar active state synced in `loadSection` (dashboard cards); `sys.html` Modules container id + Portals service; targets iframe + k8s-explorer shells missing table deps (`renderers`, `query-builder`, `column-factory`, explorer websocket) -> explorer tables never fetched; primary keys for targets / every K8s table; targets `//` prefix (307s); dashboard token read from sessionStorage; device / GPU detail popups refresh in place instead of closing on every pushed update; `typeof Layer8DWebSocket` guards removed; Probler inventory endpoint `/91/Targets` |
| Mobile | `MobileSystem` registry; Security Events/Portals parity; read-only detail popups (Events, Active/Archived Alarms); nodes `idField: 'name'`; mobile CSS no longer shadows the l8ui theme tokens (dark mode never applied); network/GPU detail popups re-show fresh data; dashboard KPIs fixed (`/10/Alarm`, K8s pods, Hosts placeholder) |

### Upstream bugs found (need fixes + push in the owning repo; tracked by `test.fail()`)
| Repo / file | Bug | Proposed fix |
|-------------|-----|--------------|
| l8orm `plugins/postgres/Read.go:167` | `hash<<32 \| int64(hashString(aaaId))` -- int32 sign extension wipes the query hash for ~half of sessions: every query of such a session returns its first cached result | `int64(uint32(hashString(aaaId)))` |
| l8orm `plugins/postgres/Postgres.go invalidateIndex` | stamp = `time.Now().Unix()`: a query cached in the same second as a write is never invalidated (deleted rows keep showing while polled) | monotonic counter |
| l8orm `persist/OrmCache.go cacheFetch` | returns before `cache.Fetch` when the cache is empty, so a live table over an empty model never registers for pushes | register even when empty |
| l8parser `service/ParsingCenter.go JobComplete` | when `CTableToInstances` yields 0 instances it PATCHes the bare element (ClusterName only): keyless phantom record per empty K8s resource type | skip the fallback for multi-instance polls |
| l8inventory / l8utils cache notifications | K8s pushes carry only the FIRST field of the composite primary key (`primaryKey: "Home"` = ClusterName) and no `record` -- even for a real pod change (verified with `kubectl annotate`). Popups matched by the record key never see them; tables re-fetch on every push | carry the full composite key (and the record) |
| l8pollaris `targets/TargetCallback.go` | `addressValidation` never released (no DELETE case, kept on failed tx): a deleted target's address can never be re-added | release on delete / failed commit |
| l8ui `sys/l8sys-init.js` | `origOpenAdd/Edit/Delete.call(SYS, ...)` -- `SYS` undefined: Add/Edit/Delete throw for Portals (and any non user/role/creds model); app.js then ends the session | `.call(L8Sys, ...)` |
| l8ui `m/js/layer8m-nav-data.js` | read-only services without `onRowClick` open nothing on tap (desktop opens a view-only popup) | default to `showRecordDetails` for readOnly too |
| l8secure plugin `probler/probler.json` | no `logConfig.logDirectory` (worked around in `newui/main.go`) | add `"logDirectory": "/data/logs/probler"` |
| probler (needs push) | no `ModConfig` service: `SysModuleConfig` exists only in l8erp's protos | shared type in l8types or a probler proto |

### Known gaps (`test.fail()`)
Hosts & VMs (no backend service), ModConfig save, Portals CRUD, K8s phantom records, empty-model live
registration, l8orm session cache collision, target address reuse.

### Live detail popups (follow-up round)
Every detail popup now stays open on a pushed update: desktop network / GPU / Kubernetes /
k8s-explorer refresh in place (`LivePopup.refreshInPlace`, active tab kept, explorer Related tab
re-injected; the explorer's duplicate, never-released subscription removed); mobile network / GPU /
Kubernetes / health re-fetch and re-show. Specs: `desktop/27-live-popups`, `mobile/06-live-popups`.
K8s popups will only receive real pushes once the composite-key notification bug above is fixed.

### Not done / follow-up
- Desktop GPU popup lacks the Performance and Processes tabs the mobile GPU popup has.
- Inventory caches push `update` notifications without a `record`, so live tables re-fetch on every push.
