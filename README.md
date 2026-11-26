# Probler - Data Center Infrastructure Management (DCIM) Platform

[![Go Version](https://img.shields.io/badge/Go-1.27.3-blue.svg)](https://golang.org/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-Ready-green.svg)](https://kubernetes.io/)
[![DCIM](https://img.shields.io/badge/DCIM-Solution-green.svg)](#)

A microservices-based data center infrastructure management (DCIM) platform built on the [Layer 8](https://github.com/saichler) framework. Probler provides infrastructure discovery, modeling, and operations across network devices, GPUs, Kubernetes clusters, hypervisors/VMs, alarms, and topology — through a unified web interface with both desktop and mobile layouts, and a built-in AI agent (**Tanto**) that answers questions about the live data.

Core data pipeline: **Poll → Parse → Model → Cache → Persist**.

**Live demo**: [probler.dev](https://www.probler.dev) (credentials: `admin / admin`)

## What's New (May – November 2026)

- **AI chat and the Tanto agent** — Five new [l8ai](https://github.com/saichler/l8ai) chat services (service area 81) replace the earlier l8agent pod and AIA section. A chat bubble is available on every desktop and mobile screen. It supports user-to-user conversations, groups, presence, file attachments, and conversations with **Tanto**, an LLM agent that queries Probler's models as the requesting user. Tanto can answer counts and summaries, read an attached file and act on it, attach CSV exports (for example, all network devices), answer `@help` from the built-in help docs, and run live `@web` searches. LLM providers and profiles come from l8secure, and the profile is picked per conversation.
- **Chat UI (l8ui `4452b2d`)** — LLM profile picker (`name · model`), collapsible side columns, maximize/restore, a movable desktop panel that remembers its position, markdown rendering (tables, nested lists, quotes) with HTML shown as text, and a copy button on every message.
- **Secret masking for the LLM** — Fields that must never reach the LLM (Kubernetes `Secret.data` and similar payloads) are annotated with `[(l8ai.AIMask) = true]`. The agent masks only those fields and no longer guesses from field names.
- **Shared model registration** — `go/prob/common/models` registers every Probler type and primary key once. The web server and the chat agent both use it, so the agent can describe and decode everything the UI serves.
- **Live detail popups** — Network, GPU, Kubernetes, and K8s Explorer popups now refresh in place on live updates and keep the active tab, instead of closing. Mobile popups re-fetch and re-render. The dashboard (desktop and mobile) uses a stable `dashboard` live slot.
- **Alarms** — The alarm UI (`web/alm`, synced from l8alarms) was refreshed: alarm state actions, updated events, archive and policies columns/forms/enums, and the maintenance screens were removed. System services (events, notify, integrations, data-import templates) are activated once, through `system.Activate`.
- **Topology** — Layer 1 discovery re-runs every 60 seconds, so a startup race with the inventory no longer leaves the topology empty.
- **KIND + l8opensim + Playwright e2e** — A full local test environment. KIND runs the real images, l8opensim simulates 19 network devices and 3 GPU servers, and K8s data comes from the KIND cluster itself. The Playwright suite has 30+ desktop specs and 9 mobile specs (see [Testing](#testing)).
- **Container registry** — Images moved from `docker.io/saichler` to Harbor at `registry.layer-8.dev:44443/probler/<image>`. Real-cluster manifests pull with the `harbor-pull` secret (created by `l8secure/harbor/harbor-pull-secret.sh`). Build scripts accept an optional image tag.
- **Kubernetes manifests** — Everything runs in a single `probler` namespace. The per-service YAML files were consolidated into one manifest per environment: `probler-kind.yaml`, `probler-local.yaml`, `probler-baremetal.yaml`, `probler-gke.yaml` and `probler-sharon-k8s.yaml`. The chat workloads are included in all of them.
- **Submodules** — `l8ui` is a proper git submodule again (it had been a copied directory), next to `l8-site-base` under `go/prob/newui/web/`. `setup-l8ui-submodule.sh` helps initialize them. A dependency check, `probler/probler-deps-check.js`, fails fast when a required l8ui script is missing.
- **Go 1.27.3**, with refreshed Layer 8 dependencies.

## Architecture

### Microservices

| Service | Directory | Purpose |
|---------|-----------|---------|
| **Collector** | `go/prob/collector/` | SNMP-based network device polling and data collection |
| **Parser** | `go/prob/parser/` | Model-agnostic data parsing and transformation |
| **Inventory Box** | `go/prob/inv_box/` | Network device inventory management |
| **Inventory GPU** | `go/prob/inv_gpu/` | GPU device inventory and monitoring |
| **Inventory K8s** | `go/prob/inv_k8s/` | Kubernetes cluster inventory |
| **ORM** | `go/prob/orm/` | PostgreSQL persistence layer |
| **Alarms** | `go/prob/alarms/` | Alarm management and correlation; owns the system services (events, notify, integrations, import templates) |
| **Admission Control** | `go/prob/adcon/` | Kubernetes admission controller and webhook |
| **Topology** | `go/prob/topology/` | Network topology discovery (periodic Layer 1 rediscovery) |
| **Chat Router** | `go/prob/chat-router/` | Conversation index and the public ChatMsg / ChatConv / ChatPeer / ChatSync services (l8ai, area 81) |
| **Chat** | `go/prob/chat/` | Chat instance: the single writer of the conversations the router assigns to it |
| **Chat Users** | `go/prob/chat-users/` | Presence (ChatStat) and groups (ChatGroup) |
| **Chat ORM** | `go/prob/chat-orm/` | Chat persistence on its own PostgreSQL database (`chatdb`) |
| **Chat Agent** | `go/prob/chat-agent/` | Tanto, the AI agent: answers in chat as the requesting user, using the conversation's LLM profile |
| **VNet** | `go/prob/vnet/` | Virtual network overlay (L8Bus, port 26000) |
| **Web UI** | `go/prob/newui/` | Web interface server (HTTPS, port 2443) |
| **Log Agent** | `go/prob/log-agent/` | Log collection agent |
| **Log VNet** | `go/prob/log-vnet/` | Log aggregation virtual network (port 27000) |
| **Maintenance** | `go/prob/maint/` | Maintenance page |
| **Prctl** | `go/prob/prctl/` | Protocol control CLI tool |

```
┌─────────────┐    ┌─────────────┐    ┌──────────────┐
│  Collector   │───>│   Parser    │───>│  Inv Box/GPU │
│ (SNMP Poll)  │    │ (Transform) │    │ (Inventory)  │
└─────────────┘    └─────────────┘    └──────────────┘
       │                  │                   │
       └──────────────────┼───────────────────┘
                          v
┌─────────────┐    ┌─────────────┐    ┌──────────────┐
│    VNet     │<───│     ORM     │───>│  PostgreSQL   │
│ (L8Bus Mesh)│    │ (Persist)   │    │  (Database)   │
└─────────────┘    └─────────────┘    └──────────────┘
       │
       ├───────────────────┬───────────────────┐
       v                   v                   v
┌─────────────┐    ┌─────────────┐    ┌──────────────┐
│   Web UI    │    │   Alarms    │    │  Topology    │
│ (port 2443) │    │ (Correlate) │    │ (Discovery)  │
└─────────────┘    └─────────────┘    └──────────────┘
       │
       v
┌──────────────────────────────────────────────────────┐
│  Chat (l8ai, area 81)                                 │
│  router · chat instances · users · chat-orm (chatdb)  │
│  chat-agent "Tanto" ──> LLM services                  │
└──────────────────────────────────────────────────────┘
```

All services communicate over the Layer8 virtual network (L8Bus) on port 26000. Log aggregation uses a separate overlay on port 27000.

## Web Interface

The web UI is a single-page application built on the L8UI component library, with both desktop (`app.html`) and mobile (`m/app.html`) layouts. A portal switcher in the header moves between **Probler** and the **Kubernetes Explorer** (`k8s-explorer.html`).

### Sections

- **Dashboard** — Live KPI cards (network devices online/offline, Kubernetes clusters/nodes/pods, GPU servers, top critical alarms)
- **Network Devices** — Network device inventory with SNMP-based monitoring and multi-tab live detail popups (Overview, Equipment, Interfaces, Routing, Physical Inventory, Performance)
- **GPUs** — GPU server inventory and monitoring with detail popups (Overview, GPUs, Software; mobile adds Performance and Processes)
- **Hosts** — Hypervisor and VM management with tabbed detail views (no backend service yet)
- **Kubernetes** — K8s cluster overview including pods, nodes, deployments, services, namespaces, and other resource types
- **Kubernetes Explorer** — A separate portal for browsing K8s resources, with Related-resource navigation
- **Inventory** — Polling targets (network devices, GPU servers, clusters): add, start/stop polling, details
- **Alarms** — Alarms, events, archive, and policies, with alarm state actions
- **Topologies** — Interactive network topology visualization
- **Analytics** — Infrastructure analytics and reporting
- **Infrastructure** — Physical infrastructure management
- **Matrix** — Cross-domain correlation matrix
- **Applications** — Application mapping and dependencies
- **Automation** — Workflow automation and orchestration
- **System** — Security, health monitoring, module management, logs, and data import (L8UI SYS module)

### AI Chat

The chat bubble (bottom right on every screen) opens the l8chat panel:

- Conversations with other users and groups, presence, and file attachments
- **Tanto**, the AI agent, which answers questions about live Probler data, for example "how many GPUs do we have?"
- `@help <question>` answers from the built-in help (`go/prob/chat-agent/help.md`)
- `@web <question>` runs a live web search
- A per-conversation LLM profile picker, markdown rendering, copy buttons, and a movable, maximizable panel on desktop

### Authentication

- Default credentials: `admin / admin`
- Two-factor authentication support
- Session timeout (configurable, default 30 minutes)

## Quick Start

### Prerequisites

- Go 1.27.3+
- Docker
- PostgreSQL
- KIND and Node.js (for local runs and e2e tests)
- Kubernetes cluster (for production deployment)

### Clone

```bash
git clone --recurse-submodules https://github.com/saichler/probler.git
cd probler
# or, in an existing clone:
git submodule update --init --recursive
```

### Local Run (KIND + l8opensim)

The recommended local environment is a KIND cluster that runs the real images, polling [l8opensim](https://github.com/saichler/l8opensim) simulated devices. It expects `../l8opensim` and `../l8secure` checked out next to this repository.

```bash
go/build-all-images.sh              # build all images (PARALLEL=4)
k8s/kind-start.sh                   # simulator (sudo) -> cluster -> deploy -> seed targets
# open https://localhost:2443
k8s/kind-stop.sh                    # also stops the simulator unless KEEP_SIM=1
```

| Script | What it does |
|--------|--------------|
| `go/build-all-images.sh [tag] [arch]` | Builds every service image |
| `k8s/sim-start.sh` / `sim-stop.sh` | Runs l8opensim: 19 network devices at `10.20.30.1/24` and 3 GPU servers at `20.20.30.1/24` |
| `k8s/sim-route-kind.sh` | Lets collector pods reach the simulator from the KIND docker bridge |
| `k8s/kind-start.sh` | Simulator → cluster → load images → deploy `probler-kind.yaml` in 3 phases → routes → seed. `SKIP_SIM=1` skips the simulator |
| `k8s/seed-mocks.sh` | Registers the simulator targets (`go run ./tests/seed`) and waits for live NetworkDevice / GpuDevice / K8SCluster data |
| `k8s/kind-stop.sh` | Stops the simulator and deletes the cluster |

> Service Dockerfiles copy only `main.go`. Every other package, including `github.com/saichler/probler/go/...`, is resolved from GitHub, so push a change outside a `main.go` before rebuilding the image.

The older binary demo (`go/build-demo.sh`, `go/run-demo.sh`) is still in the repo.

### Kubernetes Deployment

Each environment has a single manifest that deploys every service, including chat, into the `probler` namespace:

```bash
kubectl apply -f k8s/probler-local.yaml       # or probler-baremetal.yaml / probler-gke.yaml
kubectl get pods -n probler
```

Real clusters pull images from Harbor with the `harbor-pull` secret (`l8secure/harbor/harbor-pull-secret.sh`). The admission controller is deployed separately with `k8s/deploy-adm.sh` / `un-deploy-adm.sh`. See [k8s/README.md](k8s/README.md).

### Docker Images

```bash
# Multi-arch build + push of all images to registry.layer-8.dev:44443/probler (optional tag)
cd go && ./build-all-images.sh [tag]

# A single service
cd go/prob/<service> && ./build.sh [tag]
```

## Testing

`e2e/` contains a Playwright suite that drives the deployed UI (desktop and the real mobile bundle) against the KIND cluster:

```bash
cd e2e
npm install
npx playwright install chromium    # once
npm run inventory                  # only after a *-config.js / nav config / shell change
npm test                           # desktop + mobile
npm run test:desktop | test:mobile | test:smoke
```

Coverage includes shell integrity, auth screens, navigation, every section, API contracts, table features, the view system, real-time updates, theme and permissions, CRUD across all models, reference pickers, exports, live popups, and chat (Tanto counts, attachments, CSV, profiles, panels, markdown, copy). The rules: no fixed sleeps, cleanup through the API, no exact counts on live data, and known gaps are marked `test.fail()` instead of skipped. See [e2e/README.md](e2e/README.md).

Go unit tests and mock data live in `go/tests/`.

## Project Structure

```
probler/
├── go/                              # Go backend
│   ├── go.mod                       # Module (Go 1.27.3)
│   ├── prob/                        # Service packages
│   │   ├── adcon/                   # Admission control / webhook
│   │   ├── alarms/                  # Alarm management + system services
│   │   ├── chat/                    # l8ai chat instance
│   │   ├── chat-agent/              # Tanto AI agent (+ help.md)
│   │   ├── chat-orm/                # Chat persistence (chatdb)
│   │   ├── chat-router/             # Chat router
│   │   ├── chat-users/              # Chat presence & groups
│   │   ├── collector/               # SNMP data collection
│   │   ├── common/                  # Shared constants & utilities
│   │   │   └── models/              # Shared model registration (web + agent)
│   │   ├── inv_box/                 # Network device inventory
│   │   ├── inv_gpu/                 # GPU inventory
│   │   ├── inv_k8s/                 # Kubernetes inventory
│   │   ├── log-agent/               # Log collection
│   │   ├── log-vnet/                # Log aggregation
│   │   ├── maint/                   # Maintenance page
│   │   ├── newui/                   # Web UI server
│   │   │   └── web/                 # UI source (HTML/CSS/JS)
│   │   │       ├── app.html         # Desktop app shell
│   │   │       ├── index.html       # Marketing landing page
│   │   │       ├── k8s-explorer.html# Kubernetes Explorer portal
│   │   │       ├── sections/        # Section HTML
│   │   │       ├── css/             # Stylesheets
│   │   │       ├── js/              # Core JavaScript (incl. live-popup.js)
│   │   │       ├── probler/         # Module configs, column/enum defs, chat config
│   │   │       ├── alm/             # Alarms UI (synced from l8alarms)
│   │   │       ├── kubernetes/      # K8s-specific UI components
│   │   │       ├── k8s-explorer/    # K8s Explorer JS
│   │   │       ├── l8ui/            # L8UI component library (git submodule)
│   │   │       ├── l8-site-base/    # Shared site base (git submodule)
│   │   │       └── m/               # Mobile UI
│   │   ├── orm/                     # PostgreSQL persistence
│   │   ├── parser/                  # Data transformation
│   │   ├── prctl/                   # CLI control tool
│   │   ├── topology/                # Network topology
│   │   └── vnet/                    # Virtual network overlay
│   ├── types/                       # Generated protobuf Go types
│   ├── serializers/                 # Custom serializers
│   ├── tests/                       # Tests, mock data, seed tool (tests/seed)
│   └── build-all-images.sh          # Build & push Docker images
├── proto/                           # Protocol buffer definitions
│   ├── inventory.proto              # NetworkDevice, EquipmentInfo, Physical, Logical
│   ├── gpu.proto                    # GPU device types
│   ├── k8s.proto                    # K8sReadyState, K8sRestartsState
│   ├── k8s-resources.proto          # K8s resource definitions
│   ├── kubernetes-common.proto      # Shared K8s types (ObjectMeta, etc.)
│   ├── kubernetes-workloads.proto   # Deployments, StatefulSets, DaemonSets, Jobs
│   ├── kubernetes-networking-storage-rbac.proto # Services, Ingress, PV, RBAC (AIMask on secrets)
│   ├── protocols.proto              # TE tunnels, SR policies, MPLS
│   ├── istio.proto                  # Istio service mesh types
│   ├── vcluster.proto               # Virtual cluster definitions
│   └── make-bindings.sh             # Regenerate .pb.go files
├── k8s/                             # Kubernetes manifests & local env scripts
│   ├── probler-{kind,local,baremetal,gke,sharon-k8s}.yaml  # One manifest per environment
│   ├── kind-start.sh / kind-stop.sh # KIND lifecycle
│   ├── sim-*.sh                     # l8opensim simulator control
│   ├── seed-mocks.sh                # Seed simulator targets
│   └── deploy-adm.sh                # Admission controller
├── e2e/                             # Playwright e2e suite (desktop + mobile)
├── postgres/                        # PostgreSQL setup
├── docs/                            # Documentation
├── plans/                           # Implementation plans
└── LICENSE                          # Apache 2.0
```

## Technology Stack

### Backend
- **Go 1.27.3** — All microservices
- **Layer8 Framework** — Service mesh, virtual networking, ORM, introspection
- **l8ai** — Chat services and the LLM agent
- **Protocol Buffers** — Data model definitions and serialization
- **PostgreSQL** — Persistence (databases: `problerdb`, `probleralarms`, `chatdb`)
- **SNMP** — Network device polling

### Frontend
- **L8UI** — Shared component library (tables, forms, popups, charts, dashboards, chat, SYS module)
- **Vanilla JavaScript** — No framework dependencies
- **CSS3** — Responsive design with dark/light theme support
- **Desktop + Mobile** — Dual-layout web interface

### Infrastructure
- **Docker** — Containerized services, published to Harbor (`registry.layer-8.dev:44443`)
- **Kubernetes** — StatefulSets, DaemonSets, a single `probler` namespace, admission control
- **KIND + l8opensim** — Local cluster with simulated network and GPU devices
- **Playwright** — End-to-end UI testing
- **L8Bus** — Virtual network overlay for inter-service communication

## Configuration

Service constants are defined in `go/prob/common/defaults.go`:

| Constant | Value | Description |
|----------|-------|-------------|
| `PROBLER_VNET` | `26000` | Virtual network port |
| `LOGS_VNET` | `27000` | Log aggregation port |
| `PREFIX` | `/probler/` | API prefix |
| `DB_TARGETS_NAME` | `problerdb` | Main database |
| `DB_ALARMS_NAME` | `probleralarms` | Alarms database |

The web UI reads `login.json` for API endpoints and app configuration. Chat endpoints (`/81/ChatMsg`, `/81/ChatConv`, `/81/ChatPeer`, `/81/ChatSync`, `/81/ChatStat`, `/81/ChatGroup`, `/79/LlmProf`) are defined in `probler/probler-chat-config.js` and shared by both shells.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes
4. Push and open a Pull Request

## License

Apache License 2.0 — see [LICENSE](LICENSE).

---

*Built on the [Layer 8 Ecosystem](https://github.com/saichler) — &copy; 2024–2026 Sharon Aicler (saichler@gmail.com)*
