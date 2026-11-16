# Plan: AI Agent (l8agent) + chat bubble in probler

Improvements §3 (`../l8book/improvements.md`) was skipped as "not applicable" because probler had no
l8agent yet. That was wrong: every project gets the agent. Reference: l8erp (`go/erp/aia/activate.go`,
`go/erp/ui/web/app.html`, `js/app.js`, `m/app.html`).

## Blocker (needs you)
The agent reads its LLM credential from the security config. `l8secure/go/secure/plugin/probler/probler.json`
has only `lab`, `postgres`, `sim` -- no `TestLLM` (l8erp has it). My edits to that file are blocked by the
permission system, so either add the `TestLLM` credential entry (same shape as l8erp's, key `chat`) or allow
me to edit it. The plugin image is then rebuilt with `k8s/build-images.sh security` (+ all images, same toolchain).

## Phase 1: Backend
1. `AgentConfig` in a probler main.go (deployable without a push -- images build only main.go), activated in
   **probler-alarms** next to the other l8common ORM services (L8SG group, see ImprtTmpl):
   `ServiceArea 120`, `LLMCreds: "TestLLM"`, `LLMProvider: "openai"`, `LLMCredKey: "chat"`,
   `HelpDocs` (embedded `help.md`), `WebToolsURL: "https://tools.test-llm.dev"`, probler default prompts
   (Network Ops, GPU / AI infra, Kubernetes, Alarms triage, Executive summary).
2. `help.md`: screen paths ("Section > Module > Service") + step-by-step tasks for every probler section.
3. Web server main: `server.SetServiceTimeout("AgntChat", 120, 300)`; register the l8agent types
   (`L8AgentConversation` etc.) in `newui/main.go`.
4. k8s: `hostAliases` (192.168.1.121 -> llm/embed/muse/tools.test-llm.dev) on probler-alarms in the
   kind / local / baremetal manifests (not GKE).

## Phase 2: Desktop UI
1. `app.html`: l8agent CSS + scripts (enums, columns, forms, chat, bubble) in l8erp's order; markdown renderer.
2. `js/app.js`: `L8AgentBubble.init({ chatEndpoint: '/120/AgntChat' })` after boot (no typeof guard).
3. Conversations service (`L8AgentConversation`, `/120/AgntConvo`) wired into the desktop config
   (history list), not only mobile.

## Phase 3: Mobile parity
`m/app.html`: `l8ui/l8agent/m/*` bubble + chat CSS/JS; init in `m/js/app-core.js`; conversations in the
mobile nav config.

## Phase 4: E2E
- Shell integrity: l8agent globals (`L8AgentBubble`, chat) defined on both shells.
- Bubble renders, opens/closes, keeps state across section switches (desktop + mobile).
- Send a prompt -> a response arrives (LLM reachable from the pod via hostAliases); `@help` answers
  from help.md; conversation is persisted and listed in history; `AgntConvo` CRUD/cleanup.
- If the LLM endpoint is unreachable from this machine, the send/response test is a `test.fail()`
  with that reason (never skipped).

## Phase 5: Verify
Rebuild images, redeploy, full suite twice green + fresh cluster, commit locally (no push).

## Traceability
| # | Item | Platform | Phase |
|---|------|----------|-------|
| 1 | TestLLM credential in probler security config | Infra | Blocker |
| 2 | AgentConfig + help.md + WebToolsURL + prompts | Backend | 1.1-1.2 |
| 3 | AgntChat timeout, type registration | Backend | 1.3 |
| 4 | hostAliases (kind/local/baremetal) | Infra | 1.4 |
| 5 | Bubble + chat scripts, init | Desktop | 2.1-2.2 |
| 6 | Conversations history (AgntConvo) | Desktop | 2.3 |
| 7 | Bubble + chat + history | Mobile | 3 |
| 8 | E2E for bubble, chat, @help, history | Desktop+Mobile | 4 |
| 9 | Green x2 + fresh cluster, local commit | All | 5 |
