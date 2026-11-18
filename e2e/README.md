# Probler e2e suite (Playwright on KIND + l8opensim)

Real browser, real images, real data: Playwright drives the deployed web UI
(`app.html` and the real mobile bundle `m/app.html`) on a KIND cluster whose
collectors poll l8opensim simulated devices.

## Run

```bash
# 1. images (local build, no push) -- only when code changed
k8s/build-images.sh                # or: k8s/build-images.sh newui orm

# 2. simulators + cluster + seed (kind-start runs sim-start and seed-mocks)
k8s/kind-start.sh

# 3. tests
cd e2e
npm install
npx playwright install chromium    # once
npm run inventory                  # only after a *-config.js / nav config / shell change
npm test                           # desktop + mobile
npm run test:desktop | test:mobile | test:smoke
npm run lint:sleep && npm run lint:scratch

# 4. tear down (also stops the simulator unless KEEP_SIM=1)
k8s/kind-stop.sh
```

Overrides: `PROBLER_BASE_URL` (default `https://localhost:2443`), `PROBLER_USER`
/ `PROBLER_PASS` (operator / Oper123!), `PROBLER_READONLY_USER` / `_PASS`.

## Fix loop

Web assets and binaries are baked into the images:

```bash
k8s/build-images.sh newui
kind load docker-image registry.layer-8.dev:44443/probler/probler-webui2:latest --name probler
kubectl --context kind-probler -n probler delete pod probler-webui2-0
kubectl --context kind-probler -n probler wait --for=condition=Ready pod/probler-webui2-0 --timeout=120s
npx playwright test -g "<spec or title>"
```

The service Dockerfiles copy only `main.go` and resolve every other package
from GitHub, so a change outside a `main.go` must be pushed before a rebuild
picks it up.

## Layout

- `fixtures/` -- env, API client, worker-scoped sessions (`test.ts`), generated
  `inventory.json` (+ typed accessors), query recorder, globals check.
- `pages/` -- page objects (nav, tables, popups, mobile nav, probler sections).
- `drivers/` -- table/forms/CRUD drivers shared by specs.
- `tools/` -- `generate-inventory.js` loads both shells in a DOM stub and dumps
  the real module configs; it also reports any script that throws at load.
- `tests/desktop`, `tests/mobile`.

## Rules

- No fixed sleeps (`npm run lint:sleep`): wait on DOM/app state.
- One booted session per worker (`app`, `mobile`); `freshApp`/`freshMobile` only
  for boot/logout/theme specs.
- Clean up created data through the API in `afterEach`, keyed by a run code.
- Never assert exact counts on live data.
- Known gaps are `test.fail()` with a reason, never skipped.
- Scratch specs use a `zzz-` prefix and are never committed (`npm run lint:scratch`).
