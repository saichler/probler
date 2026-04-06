# Plan: L8 Ecosystem Interactive Visualization for Probler

## Context
Probler depends on 18 L8 ecosystem projects across 15 services, but none of the existing 4 docs in `docs/` show the **project-level dependency mapping** — which L8 projects exist, how they layer, and how each Probler service maps onto them. This visualization will be the definitive "how Probler uses L8" reference.

## Output
Single self-contained HTML file: `docs/probler-l8-ecosystem.html`
Zero external dependencies. ~1500-1800 lines.

---

## Page Structure (6 sections, vertical scroll)

### Section 1: Hero Card
- Title, description, summary stats: **18 L8 Projects | 15 Services | 3-Node K8s Cluster**
- Layer category chips (Core, Infrastructure, Application, UI)
- Reuse existing hero pattern from `docs/probler-architecture-visualization.html`

### Section 2: L8 Ecosystem Dependency Graph (centerpiece)
- **Inline SVG** with 4 horizontal tier bands:
  - **UI Layer** (top): l8ui
  - **Application Layer**: l8pollaris, l8collector, l8parser, l8inventory, l8topology, l8logfusion, l8events, l8alarms, l8notify
  - **Infrastructure Layer**: l8bus, l8web, l8services, l8orm
  - **Core Layer** (bottom): l8types, l8utils, l8srlz, l8reflect, l8ql
- Rounded-rect nodes per project, colored by layer
- SVG path edges showing inter-project dependencies (solid=direct, dashed=indirect)
- **Hover**: dim unrelated nodes/edges, show tooltip with description + sub-packages
- **Click**: select project, cross-highlight in matrix below

### Section 3: Service-to-L8 Mapping Matrix
- CSS Grid: rows = 16 Probler services (15 + common), columns = 18 L8 projects
- Filled colored dots where a dependency exists, colored by L8 layer
- **Hover cell**: tooltip explaining the relationship
- **Click row**: highlight that service's L8 deps in the ecosystem graph above
- **Click column**: highlight which services use that L8 project

### Section 4: K8s Deployment Topology
- Flexbox card groups organized by workload type (3 columns):
  - **DaemonSets** (runs everywhere): vnet, webui, logs, box, gpu
  - **StatefulSets** (persistent state): alarms, orm, topology
  - **Scaled Deployments** (size-tiered): collector (6/4/2), parser (6/4/2)
- Each card: service name, namespace, replica info, network config
- **Click card**: cross-highlights service in matrix and ecosystem graph

### Section 5: Data Flow Pipeline
- Horizontal SVG pipeline: External Sources → Collector → Parser → Inventory → ORM → Topology/Alarms → Web UI
- L8Bus backbone line running beneath all services
- Color-coded by which L8 framework powers each stage

### Section 6: 3-Node Cluster Deployment Overlay (new)
A physical-view diagram showing the actual 3-node Kubernetes cluster with every pod placed on the nodes where it runs, overlaid with L8 component annotations and data flow arrows.

**Layout**: 3 tall columns (one per node), each showing the pods running on that node. Horizontal overlay lines show L8Bus connectivity and data flow across nodes.

**Per-node column contents (top to bottom)**:

Node label bar (hostname/IP, role, probler-size label if set)

**DaemonSet pods (run on ALL 3 nodes)** — shown as a shared horizontal band:
- `probler-vnet` (port 25998, hostNetwork) — **L8Bus overlay backbone**
- `probler-logs` (port 12888, hostNetwork) — **L8LogFusion log vnet**
- `probler-webui2` (hostNetwork) — **L8Web server + L8UI frontend**
- `probler-box` — **L8Inventory** network device collector
- `probler-gpu` — **L8Inventory** GPU collector
- `probler-k8s` — **L8Inventory** K8s cluster collector
- `probler-log-agent` — **L8LogFusion** node log collector (reads /data/logs/probler)
- `probler-maint` (hostNetwork) — maintenance service
- `probler-webui` (hostNetwork) — legacy web UI

**Scheduled pods (based on probler-size label)** — shown per-node:
- Collector pods: 6 on large, 4 on medium, 2 on small — **L8Collector + L8Pollaris**
- Parser pods: 6 on large, 4 on medium, 2 on small — **L8Parser + L8Pollaris**

**StatefulSet pods (single replica, placed by K8s scheduler)** — shown on one node only:
- `probler-orm` — **L8ORM + L8Events**, persists to PostgreSQL at /data/postgres/problerdb
- `probler-alarms` — **L8Alarms**, persists to /data/postgres/probleralarms
- `probler-topo` — **L8Topology** discovery

**Overlay layers (drawn across all 3 nodes)**:

1. **L8Bus Virtual Network** (port 25998) — a horizontal backbone line connecting all 3 vnet pods. All services on each node connect to their local vnet pod, which meshes with vnet pods on other nodes. Annotate: "l8bus/go/overlay/vnet — inter-service RPC, service discovery, health checks"

2. **L8LogFusion Network** (port 12888) — a separate horizontal line connecting all 3 log-vnet pods. Log-agent pods feed into their local log-vnet pod. Annotate: "l8logfusion — distributed log collection & aggregation"

3. **Data flow arrows**:
   - External sources (SNMP, K8s API, GPU metrics) → enter each node's collector/inventory pods
   - Collector → Parser (via L8Bus)
   - Parser → Inventory services (via L8Bus)
   - Inventory → ORM (via L8Bus, cross-node if ORM is on different node)
   - ORM → Alarms + Topology (via L8Bus)
   - All → WebUI (via L8Bus, user accesses any node's WebUI)

4. **Shared storage** — `/data` hostPath on each node, with labeled sub-paths:
   - `/data/postgres/problerdb` — ORM database (on ORM node only)
   - `/data/postgres/probleralarms` — Alarms database (on alarms node only)
   - `/data/logs/probler` — log files (all nodes, read by log-agent)
   - `/data/logsdb/probler` — log database
   - `/data/.26000{u,r,c}` — L8Bus state files (port 26000 = probler vnet internal)
   - `/data/.27000{u,r,c}` — L8Bus state files (port 27000 = logs vnet internal)

**Visual approach**:
- SVG with 3 node columns as large rounded rectangles
- Pod badges inside each node, colored by K8s workload type (DaemonSet=red, StatefulSet=orange, Deployment=green)
- Each pod badge has a small L8 project icon/label showing which L8 framework powers it
- L8Bus backbone as a thick teal line with `l8bus` label connecting nodes
- LogFusion backbone as a thinner blue line with `l8logfusion` label
- Data flow arrows as curved paths with labels
- Storage volumes shown as cylinder icons at the bottom of each node

**Interactivity**:
- Hover a pod → tooltip shows: container image, namespace, ports, L8 dependencies, data paths
- Click a pod → highlights the same service in the matrix (Section 3) and ecosystem graph (Section 2)
- Hover an overlay line → tooltip describes the L8 project and protocol
- Click "Show Data Flow" toggle → animates dashed arrows showing data movement direction

---

## Interactivity (Vanilla JS, no external libraries)

Single global state object tracks `selectedService` and `selectedL8Project`. One `updateHighlights()` function applies `.dimmed`/`.highlighted` CSS classes across all sections simultaneously.

- All SVG nodes and matrix cells get `data-service` / `data-l8` attributes
- Tooltip: single repositioned `<div>`, content from embedded JS data model
- Transitions: CSS `opacity 0.3s ease`, `border-color 0.2s ease`
- Sticky nav bar with section jump links

---

## Color Scheme

Extend existing palette from `docs/probler-architecture-visualization.html`:

| Layer | Color | Soft Background |
|-------|-------|-----------------|
| L8 Core | `#0f766e` (teal) | `#def7f2` |
| L8 Infrastructure | `#0369a1` (blue) | `#e0f2fe` |
| L8 Application | `#4338ca` (indigo) | `#eef2ff` |
| L8 UI | `#9333ea` (purple) | `#faf5ff` |
| Probler Services | `#2563eb` (blue) | `#eaf2ff` |
| K8s DaemonSet | `#dc2626` (red) | `#fef2f2` |
| K8s StatefulSet | `#ea580c` (orange) | `#fff7ed` |
| K8s Deployment | `#16a34a` (green) | `#f0fdf4` |

---

## L8 Ecosystem Projects (data to include)

### Core Layer (5 projects)
| Project | Description | Sub-packages |
|---------|-------------|-------------|
| l8types | Core type definitions and interfaces | ifs, sec, l8api, l8health, l8web, l8sysconfig |
| l8utils | Utility libraries | logger, registry, resources, ipsegment, shared |
| l8srlz | Serialization framework | object |
| l8reflect | Type reflection/introspection | introspecting |
| l8ql | Query language | (indirect dependency) |

### Infrastructure Layer (4 projects)
| Project | Description | Sub-packages |
|---------|-------------|-------------|
| l8bus | Event bus + virtual network overlays | vnic, vnet, health |
| l8web | HTTP client/server framework | client, server |
| l8services | Service lifecycle management | manager, csvexport |
| l8orm | Object-relational mapping | (indirect dependency) |

### Application Layer (9 projects)
| Project | Description | Sub-packages |
|---------|-------------|-------------|
| l8pollaris | Polling and targeting engine | pollaris, targets, l8tpollaris |
| l8collector | SNMP data collection framework | common, service |
| l8parser | Configuration parsing framework | service |
| l8inventory | Inventory management framework | service |
| l8topology | Network topology discovery | discover, topo_list, l8topo |
| l8logfusion | Log aggregation and fusion | agent/logs, agent/logserver, l8logf |
| l8events | Event processing | services, l8events |
| l8alarms | Alarm management | services, ui |
| l8notify | Notification system | (indirect dependency) |

### UI Layer (1 project)
| Project | Description | Sub-packages |
|---------|-------------|-------------|
| l8ui | Shared UI component library | 40+ JS modules: tables, forms, popups, charts, kanban, calendar, gantt, timeline, tree-grid, wizard, dashboard, navigation, CRUD, factories |

---

## Probler Service → L8 Dependency Matrix

| Service | l8types | l8utils | l8srlz | l8reflect | l8bus | l8web | l8services | l8pollaris | l8collector | l8parser | l8inventory | l8topology | l8logfusion | l8events | l8alarms |
|---------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| collector | * | | | | * | | | * | * | | | | | | |
| parser | * | | | | * | | | * | | * | | | | | |
| inv_box | * | | | | * | | | * | | | * | | | | |
| inv_gpu | * | | | | * | | | * | | | * | | | | |
| inv_k8s | * | | | | * | | | | | | * | | | | |
| topology | * | | | | * | | | | | | | * | | | |
| orm | * | | | | * | | | * | | | | | | * | |
| alarms | * | | | | * | | | | | | | | | | * |
| newui | * | * | | | * | * | * | * | | | | * | * | * | * |
| vnet | | | | | * | | | | | | | | | | |
| log-agent | | * | | | * | | | | | | | | * | | |
| log-vnet | | | | | * | | | | | | | | * | | |
| maint | | * | | | | | | | | | | | | | |
| prctl | * | | | | | * | | * | | | | | | | |
| common | * | * | * | * | | * | * | * | | | | | | | |

---

## K8s Deployment Data (from k8s/*.yaml)

### DaemonSets (9 — run on all 3 nodes)
| Service | Namespace | Image | hostNetwork | Port | L8 Framework |
|---------|-----------|-------|:-----------:|------|-------------|
| vnet | probler-vnet | saichler/probler-vnet | **yes** | 25998 | l8bus (vnet overlay) |
| logs | probler-logs | saichler/logs-vnet | **yes** | 12888 | l8logfusion (log vnet) |
| webui2 | probler-webui2 | saichler/probler-webui2 | **yes** | — | l8web + l8ui |
| webui | probler-webui | saichler/probler-webui | **yes** | — | l8web + l8ui |
| maint | probler-maint | saichler/probler-maint | **yes** | — | l8utils |
| box | probler-box | saichler/probler-inv-box | no | — | l8inventory + l8pollaris |
| gpu | probler-gpu | saichler/probler-inv-gpu | no | — | l8inventory + l8pollaris |
| k8s | probler-k8s | saichler/probler-inv-k8s | no | — | l8inventory |
| log-agent | probler-log-agent | saichler/probler-logagent | no | — | l8logfusion (reads /data/logs/probler) |

### StatefulSets (3 — single replica each)
| Service | Namespace | Image | L8 Framework | Persistence |
|---------|-----------|-------|-------------|-------------|
| orm | probler-orm | saichler/probler-orm | l8orm + l8events | /data/postgres/problerdb |
| alarms | probler-alarms | saichler/probler-alarms | l8alarms | /data/postgres/probleralarms |
| topo | probler-topo | saichler/probler-topo | l8topology | — |

### Scaled Deployments (6 — size-tiered via nodeSelector)
| Service | Namespace | Node Label | Replicas | Image | L8 Framework |
|---------|-----------|-----------|----------|-------|-------------|
| collector-large | probler-collector | probler-size: large | 6 | saichler/probler-collector | l8collector + l8pollaris |
| collector-medium | probler-collector | probler-size: medium | 4 | saichler/probler-collector | l8collector + l8pollaris |
| collector-small | probler-collector | probler-size: small | 2 | saichler/probler-collector | l8collector + l8pollaris |
| parser-large | probler-parser | probler-size: large | 6 | saichler/probler-parser | l8parser + l8pollaris |
| parser-medium | probler-parser | probler-size: medium | 4 | saichler/probler-parser | l8parser + l8pollaris |
| parser-small | probler-parser | probler-size: small | 2 | saichler/probler-parser | l8parser + l8pollaris |

**Total pod count**: 9 DaemonSets × 3 nodes = 27 + 3 StatefulSets + 24 Deployment replicas = **54 pods**

### Deployment Order (from deploy.sh)
1. vnet → 2. logs → 3. parser → 4. collector → 5. box → 6. gpu → 7. k8s → 8. orm → 9. alarms → 10. webui2

(topo and log-agent currently commented out)

### Shared Storage (/data hostPath on every node)
- `/data/postgres/problerdb` — ORM PostgreSQL database
- `/data/postgres/probleralarms` — Alarms PostgreSQL database
- `/data/logs/probler` — Application log files (written by all services, read by log-agent)
- `/data/logsdb/probler` — Log database
- `/data/.26000{u,r,c}` — L8Bus probler vnet state files
- `/data/.27000{u,r,c}` — L8Bus logs vnet state files

---

## Data Flow Pipeline

```
External Sources          L8 Processing Pipeline                    Outputs
─────────────────    ─────────────────────────────────────    ──────────────
                     ┌───────────┐   ┌────────┐
Network Devices ────>│ Collector │──>│ Parser │──┐
(SNMP)               │(l8collector)  │(l8parser)│  │
                     └───────────┘   └────────┘  │   ┌───────────┐
                                                  ├──>│ Inv Box   │──┐
K8s Clusters ────────────────────────────────────>│   │(l8inventory)│  │
(API)                                             │   └───────────┘  │
                                                  │   ┌───────────┐  │   ┌─────────┐
GPU Hosts ───────────────────────────────────────>│   │ Inv GPU   │──├──>│   ORM   │──┐
(Metrics)                                             │(l8inventory)│  │   │(l8orm)  │  │
                                                      └───────────┘  │   └─────────┘  │
                                                      ┌───────────┐  │                │
                                                      │ Inv K8s   │──┘   ┌──────────┐ │
                                                      │(l8inventory)│     │ Topology │<┘
                                                      └───────────┘      │(l8topology)│
                                                                         └──────────┘
                                                                              │
                     ┌──────────────────────────────────────────┐             │
                     │          L8Bus Virtual Network            │             │
                     │    (all services communicate via l8bus)   │<────────────┘
                     └──────────────────────────────────────────┘
                              │              │
                     ┌────────┘     ┌────────┘
                     v              v
               ┌──────────┐  ┌──────────┐     ┌──────────────┐
               │  Alarms  │  │  Events  │     │   Web UI     │
               │(l8alarms)│  │(l8events)│     │(l8ui + l8web)│
               └──────────┘  └──────────┘     └──────────────┘
```

---

## Implementation Approach

- **Technology**: Single HTML file with embedded `<style>` and `<script>`. Zero external dependencies.
- **SVG**: Hand-crafted inline SVG for the ecosystem graph and data flow pipeline (not dynamically generated), enabling CSS class manipulation for interactivity.
- **Matrix**: CSS Grid with `data-*` attributes on each cell for JS-driven highlighting.
- **K8s Cards**: Flexbox cards grouped by workload type.
- **JS Architecture**: Data model as JS objects at top of script block. Single `state` object + `updateHighlights()` function for cross-section interactivity.
- **Responsive**: SVG viewBox scales naturally. Matrix gets horizontal scroll on narrow screens. K8s cards reflow via media queries.

---

## Verification
1. Open `docs/probler-l8-ecosystem.html` in a browser
2. Verify all 18 L8 projects appear in the ecosystem graph with correct layer placement
3. Verify matrix shows all 15+1 services with correct dependency dots
4. Click an L8 project node — matrix column and connected edges highlight
5. Click a service in the matrix — ecosystem graph, K8s card, and cluster node highlight
6. Verify K8s cards show correct workload types and replica counts
7. Verify 3-node cluster diagram shows:
   - All 9 DaemonSets on every node
   - StatefulSets on one node only
   - Collector/Parser pods distributed by node size
   - L8Bus backbone (port 25998) connecting all 3 nodes
   - LogFusion backbone (port 12888) connecting all 3 nodes
   - Data flow arrows from external sources through the pipeline to UI
   - Storage volumes labeled correctly (/data/postgres/*, /data/logs/*)
8. Verify cross-section interactivity: clicking a pod in Section 6 highlights the service in Sections 2-4
9. Verify responsive behavior on narrow screens
10. Verify tooltips appear on hover with correct descriptions
