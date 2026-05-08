# Probler - Data Center Infrastructure Management (DCIM) Platform

[![Go Version](https://img.shields.io/badge/Go-1.26.1-blue.svg)](https://golang.org/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-Ready-green.svg)](https://kubernetes.io/)
[![DCIM](https://img.shields.io/badge/DCIM-Solution-green.svg)](#)

A microservices-based data center infrastructure management (DCIM) platform built on the [Layer 8](https://github.com/saichler) framework. Probler provides infrastructure discovery, modeling, and operations across network devices, GPUs, Kubernetes clusters, hypervisors/VMs, alarms, and topology — through a unified web interface with both desktop and mobile layouts.

Core data pipeline: **Poll → Parse → Model → Cache → Persist**.

**Live demo**: [probler.dev](https://www.probler.dev) (credentials: `admin / admin`)

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
| **Alarms** | `go/prob/alarms/` | Alarm management and correlation |
| **Admission Control** | `go/prob/adcon/` | Kubernetes admission controller and webhook |
| **Topology** | `go/prob/topology/` | Network topology discovery |
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
       v
┌─────────────┐    ┌─────────────┐    ┌──────────────┐
│   Web UI    │    │   Alarms    │    │  Topology    │
│ (port 2443) │    │ (Correlate) │    │ (Discovery)  │
└─────────────┘    └─────────────┘    └──────────────┘
```

All services communicate over the Layer8 virtual network (L8Bus) on port 26000. Log aggregation uses a separate overlay on port 27000.

## Web Interface

The web UI is a single-page application built on the L8UI component library with both desktop and mobile layouts.

### Sections

- **Dashboard** — Real-time device statistics, health metrics, alarm monitoring
- **Network Devices** — Network device inventory with SNMP-based monitoring, hardware and performance metrics, multi-tab detail modals (Basic Info, Hardware, Performance, Physical, Routing)
- **GPUs** — GPU device inventory and monitoring with detail modals
- **Hosts** — Hypervisor and VM management with tabbed detail views
- **Kubernetes** — K8s cluster overview including pods, nodes, deployments, services, namespaces, and other resource types
- **Inventory** — Consolidated infrastructure inventory
- **Alarms** — Alarm aggregation and correlation
- **Topologies** — Interactive network topology visualization
- **Analytics** — Infrastructure analytics and reporting
- **Infrastructure** — Physical infrastructure management
- **Matrix** — Cross-domain correlation matrix
- **Applications** — Application mapping and dependencies
- **Automation** — Workflow automation and orchestration
- **System** — Security, health monitoring, module management, logs, and data import (L8UI SYS module)

### Authentication

- Default credentials: `admin / admin`
- Two-factor authentication support
- Session timeout (configurable, default 30 minutes)

## Quick Start

### Prerequisites

- Go 1.26.1+
- Docker
- PostgreSQL
- Kubernetes cluster (for production deployment)

### Local Development

```bash
# Clone the repository
git clone https://github.com/saichler/probler.git
cd probler

# Build all demo binaries
cd go && ./build-demo.sh

# Run demo locally
./run-demo.sh

# Access the web interface
# https://localhost:2443
```

### Kubernetes Deployment

```bash
# Deploy all services
cd k8s && ./deploy.sh

# Verify deployment
kubectl get pods -n probler

# Undeploy
./un-deploy.sh
```

### Docker Images

```bash
# Build all Docker images
cd go && ./build-all-images.sh
```

## Project Structure

```
probler/
├── go/                              # Go backend
│   ├── go.mod                       # Module (Go 1.26.1)
│   ├── prob/                        # Service packages
│   │   ├── adcon/                   # Admission control / webhook
│   │   ├── alarms/                  # Alarm management
│   │   ├── collector/               # SNMP data collection
│   │   ├── common/                  # Shared constants & utilities
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
│   │   │       ├── sections/        # Section HTML (16 sections)
│   │   │       ├── css/             # Stylesheets
│   │   │       ├── js/              # Core JavaScript
│   │   │       ├── probler/         # Module configs & column/enum defs
│   │   │       ├── kubernetes/      # K8s-specific UI components
│   │   │       ├── l8ui/            # L8UI shared component library
│   │   │       └── m/               # Mobile UI
│   │   ├── orm/                     # PostgreSQL persistence
│   │   ├── parser/                  # Data transformation
│   │   ├── prctl/                   # CLI control tool
│   │   ├── topology/                # Network topology
│   │   └── vnet/                    # Virtual network overlay
│   ├── types/                       # Generated protobuf Go types
│   ├── serializers/                 # Custom serializers
│   ├── tests/                       # Tests & mock data
│   ├── build-demo.sh                # Build all demo binaries
│   ├── run-demo.sh                  # Run demo locally
│   └── build-all-images.sh          # Build Docker images
├── proto/                           # Protocol buffer definitions
│   ├── inventory.proto              # NetworkDevice, EquipmentInfo, Physical, Logical
│   ├── gpu.proto                    # GPU device types
│   ├── k8s.proto                    # K8sReadyState, K8sRestartsState
│   ├── k8s-resources.proto          # K8s resource definitions
│   ├── kubernetes-common.proto      # Shared K8s types (ObjectMeta, etc.)
│   ├── kubernetes-workloads.proto   # Deployments, StatefulSets, DaemonSets, Jobs
│   ├── kubernetes-networking-storage-rbac.proto # Services, Ingress, PV, RBAC
│   ├── protocols.proto              # TE tunnels, SR policies, MPLS
│   ├── istio.proto                  # Istio service mesh types
│   ├── vcluster.proto               # Virtual cluster definitions
│   └── make-bindings.sh             # Regenerate .pb.go files
├── k8s/                             # Kubernetes manifests
│   ├── deploy.sh                    # Deploy all services
│   ├── un-deploy.sh                 # Remove all services
│   ├── clean.sh                     # Undeploy, wipe data, redeploy
│   └── *.yaml                       # Per-service manifests (19 manifests)
├── postgres/                        # PostgreSQL setup
├── docs/                            # Documentation
├── plans/                           # Implementation plans
└── LICENSE                          # Apache 2.0
```

## Technology Stack

### Backend
- **Go 1.26.1** — All microservices
- **Layer8 Framework** — Service mesh, virtual networking, ORM, introspection
- **Protocol Buffers** — Data model definitions and serialization
- **PostgreSQL** — Persistence (databases: `problerdb`, `probleralarms`)
- **SNMP** — Network device polling

### Frontend
- **L8UI** — Shared component library (tables, forms, popups, charts, dashboards, SYS module)
- **Vanilla JavaScript** — No framework dependencies
- **CSS3** — Responsive design with dark/light theme support
- **Desktop + Mobile** — Dual-layout web interface

### Infrastructure
- **Docker** — Containerized services
- **Kubernetes** — StatefulSets, DaemonSets, per-service namespaces, admission control
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

The web UI reads `login.json` for API endpoints and app configuration.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes
4. Push and open a Pull Request

## License

Apache License 2.0 — see [LICENSE](LICENSE).

---

*Built on the [Layer 8 Ecosystem](https://github.com/saichler) — &copy; 2024–2026 Sharon Aicler (saichler@gmail.com)*
