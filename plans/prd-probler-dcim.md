# Probler - Data Center Infrastructure Management (DCIM) Platform
# Product Requirements Document (PRD)

**Version:** 1.0
**Date:** February 2026
**Status:** Draft

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision & Goals](#2-product-vision--goals)
3. [Target Users & Use Cases](#3-target-users--use-cases)
4. [Architecture Overview](#4-architecture-overview)
5. [Section 1: Dashboard](#5-section-1-dashboard)
6. [Section 2: Inventory & Targets](#6-section-2-inventory--targets)
7. [Section 3: Network Devices](#7-section-3-network-devices)
8. [Section 4: GPUs](#8-section-4-gpus)
9. [Section 5: Hosts & Virtual Machines](#9-section-5-hosts--virtual-machines)
10. [Section 6: Kubernetes Clusters](#10-section-6-kubernetes-clusters)
11. [Section 7: Storage, Power & Temperature](#11-section-7-storage-power--temperature)
12. [Section 8: Topologies](#12-section-8-topologies)
13. [Section 9: Events & Alarms](#13-section-9-events--alarms)
14. [Section 10: Automation & Workflows](#14-section-10-automation--workflows)
15. [Section 11: Applications](#15-section-11-applications)
16. [Section 12: Analytics](#16-section-12-analytics)
17. [Section 13: System](#17-section-13-system)
18. [Data Models](#18-data-models)
19. [Backend Microservices](#19-backend-microservices)
20. [Security & Authentication](#20-security--authentication)
21. [Deployment & Infrastructure](#21-deployment--infrastructure)
22. [UI Framework & Patterns](#22-ui-framework--patterns)
23. [Mobile Parity](#23-mobile-parity)
24. [Non-Functional Requirements](#24-non-functional-requirements)

---

## 1. Executive Summary

Probler is a comprehensive **Data Center Infrastructure Management (DCIM)** platform built on a microservices architecture. It provides real-time monitoring, management, and automation across the full datacenter stack: network infrastructure, GPU compute clusters, virtualization (hypervisors and VMs), Kubernetes container orchestration, power distribution, environmental monitoring, and capacity planning.

The platform follows the core data pipeline philosophy: **Poll -> Parse -> Model -> Cache -> Persist**.

### Current State

| Section | Status |
|---------|--------|
| Dashboard | Implemented |
| Inventory & Targets | Implemented |
| Network Devices | Implemented |
| GPUs | Implemented |
| Hosts & Virtual Machines | Implemented |
| Kubernetes Clusters | Implemented |
| Storage, Power & Temperature | Planned |
| Topologies | Implemented |
| Events & Alarms | Planned |
| Automation & Workflows | Planned |
| Applications | Planned |
| Analytics | Planned |
| System (Health, Settings, Logs) | Implemented |

### Existing Assets

- **README.md**: Product overview, quick start, architecture, deployment guide
- **Landing page** (index.html): Marketing-oriented feature showcase, architecture diagram, demo access
- **Web application** (app.html): Fully functional 13-section sidebar navigation with 6 implemented sections
- **Mobile application** (m/app.html): Mobile-responsive counterpart
- **L8UI component library**: Shared desktop/mobile framework (tables, popups, charts, forms, module factory)

---

## 2. Product Vision & Goals

### Vision

A single-pane-of-glass for datacenter operations teams, providing unified visibility and control across all infrastructure domains — network, compute, storage, power, and environmental — from a single platform.

### Primary Goals

1. **Unified Monitoring**: Aggregate real-time telemetry from network devices, servers, VMs, containers, GPUs, power, and environmental systems into a single dashboard
2. **Deep Device Visibility**: Provide RFC 4133 Entity MIB-level physical inventory, interface-level statistics, and protocol-level routing state (BGP, OSPF, MPLS, SR) for every managed device
3. **Multi-Domain Correlation**: Correlate events and alarms across infrastructure domains to accelerate root cause analysis
4. **Horizontal Scalability**: Scale data collection (collectors, parsers) horizontally to support thousands of managed devices
5. **Platform Agnostic**: Deploy on bare metal, Docker, or Kubernetes with no code changes
6. **Model-Agnostic Services**: Services adapt to any data structure through the Layer 8 framework's introspection and ORM capabilities

### Non-Goals

- Real-time network packet capture/analysis (NetFlow, sFlow) — use dedicated tools
- Application Performance Monitoring (APM) — complementary to, not a replacement for, APM solutions
- Configuration management/provisioning (planned for Automation section, not core v1)

---

## 3. Target Users & Use Cases

### Primary Users

| Role | Needs |
|------|-------|
| **NOC Operators** | Real-time dashboards, alarm triage, device status, topology visualization |
| **Network Engineers** | BGP/OSPF state, interface stats, MPLS/SR tunnel status, traffic engineering |
| **Datacenter Managers** | Capacity planning, power/cooling efficiency (PUE), asset lifecycle tracking |
| **SRE / Platform Engineers** | Kubernetes cluster health, pod/deployment status, service discovery |
| **GPU Cluster Admins** | GPU utilization, temperature, ECC errors, MIG configuration, power limits |
| **Facilities Engineers** | Power distribution, UPS battery status, environmental sensors, generator state |

### Use Cases

1. **Network Operations Center (NOC)**: Real-time monitoring, fault management, alarm correlation, performance tracking
2. **Service Provider Networks**: MPLS VPN management, Segment Routing policy configuration, BGP route engineering
3. **AI/HPC Infrastructure**: GPU cluster utilization monitoring, thermal management, workload-aware power budgeting
4. **Cloud Infrastructure**: Kubernetes multi-cluster management, service discovery, automated scaling
5. **Facilities Management**: Power chain monitoring (utility -> UPS -> PDU -> rack), environmental compliance
6. **Capacity Planning**: Trend analysis, what-if scenarios, PUE optimization, carbon footprint tracking

---

## 4. Architecture Overview

### Core Data Pipeline

```
Poll -> Parse -> Model -> Cache -> Persist
```

1. **Poll**: Collectors poll managed devices via SNMP, SSH, REST, Redfish, Modbus, BACnet
2. **Parse**: Parsers transform raw protocol responses into normalized protobuf models
3. **Model**: Inventory services assemble parsed data into complete device state models
4. **Cache**: In-memory caches serve real-time queries with sub-millisecond latency
5. **Persist**: ORM service writes to PostgreSQL for historical queries and compliance

### Service Communication

All inter-service communication flows through **L8Bus**, a virtual network overlay (port 26000) providing:
- Service discovery
- gRPC/protobuf messaging
- Leader election for stateful services
- Delta updates for efficient cache synchronization

### Network Ports

| Port | Service |
|------|---------|
| 2443 | Web UI (HTTPS) |
| 26000 | L8Bus (probler VNet) |
| 26500 | Protocol control |
| 27000 | Logs VNet |

### API Prefix

All REST endpoints are served under `/probler/{serviceArea}/{serviceName}`.

---

## 5. Section 1: Dashboard

### Purpose
Real-time NOC overview showing aggregate health metrics across all infrastructure domains.

### Current Implementation

- **Network Devices card**: Total device count with online/offline status breakdown
- **Kubernetes Clusters card**: Cluster count and total pod metrics
- **Top Critical Alarms table**: Recent critical events (currently placeholder data)
- **Animated SVG hero**: Server rack visualization with data flow particles

### Data Sources

| Metric | Endpoint | Refresh |
|--------|----------|---------|
| Network device counts | `/0/NCache` | Real-time |
| K8s cluster metrics | `/1/KCache` | Real-time |
| Critical alarms | (planned) `/10/Alarm` | Real-time |

### Planned Enhancements

- GPU utilization summary card (aggregate across all racks)
- Host/VM summary card (hypervisors online, VM count, CPU allocation %)
- Power consumption card (total kW, PUE, headroom)
- Environmental card (average temperature, humidity alerts)
- Topology health card (link count, degraded links)
- Configurable widget layout (drag-and-drop grid)
- Time range selector for historical dashboard view

---

## 6. Section 2: Inventory & Targets

### Purpose
Manage the inventory of monitored targets — the devices, clusters, and systems that Probler polls.

### Current Implementation

- Embedded iframe of `targets/index.html`
- CRUD operations for polling targets (IP address, SNMP community, polling interval)
- Target status monitoring (reachable/unreachable)

### Endpoint

`/91/Targets` — Target management API

### Target Types

| Type | Protocol | Data Collected |
|------|----------|---------------|
| Network Device | SNMP v2c/v3, SSH | Equipment info, interfaces, routing, physical inventory |
| Kubernetes Cluster | K8s API | Nodes, pods, deployments, services, namespaces |
| Hypervisor | SSH, VMware API | Host specs, VM inventory, resource allocation |
| GPU Rack | REST/Redfish | GPU telemetry, node health, MIG config |
| Power Device | SNMP, Modbus | Voltage, current, power, energy |
| Environmental Sensor | BACnet, Modbus | Temperature, humidity |

### Planned Enhancements

- Migrate from iframe to native L8UI table with CRUD forms
- Bulk target import (CSV, auto-discovery via SNMP sweep)
- Target groups and tagging for organized polling schedules
- Credential vault integration (per-target SNMP v3 credentials, SSH keys)

---

## 7. Section 3: Network Devices

### Purpose
Comprehensive network device monitoring with deep hardware and protocol visibility.

### Current Implementation

**Main Table** — Server-side paginated list of all network devices:

| Column | Source Field |
|--------|-------------|
| IP Address | `equipmentinfo.ipAddress` |
| Device Type | `equipmentinfo.deviceType` (enum) |
| Status | `equipmentinfo.deviceStatus` (enum) |
| Uptime | `equipmentinfo.uptime` |
| Model | `equipmentinfo.model` |
| Vendor | `equipmentinfo.vendor` |
| Series | `equipmentinfo.series` |
| Family | `equipmentinfo.family` |
| Software Version | `equipmentinfo.version` |
| Firmware | `equipmentinfo.firmwareVersion` |
| Serial Number | `equipmentinfo.serialNumber` |
| Hardware | `equipmentinfo.hardware` |
| Interface Count | `equipmentinfo.interfaceCount` |
| Last Seen | `equipmentinfo.lastSeen` |

**Detail Modal** — 6 tabs accessed by clicking a table row:

1. **Overview**: Status badge, IP, uptime, last seen, location, contact info
2. **Equipment**: Full hardware identification (vendor, model, serial, firmware, software, sysOID)
3. **Interfaces**: Table of logical interfaces with name, type, status, speed, IP, MAC, MTU, VRF
4. **Routing**: BGP peers (state, AS, routes received/sent), OSPF neighbors (state, area, DR/BDR), VRF instances (RD, RT import/export, routing table)
5. **Physical Inventory**: Hierarchical tree view (RFC 4133 Entity MIB) — chassis -> modules -> slots -> ports, plus power supplies and fans with status indicators
6. **Performance**: Time-series charts for CPU usage %, memory usage %, temperature

### Data Source

| Endpoint | Model |
|----------|-------|
| `/0/NCache` | `NetworkDevice` / `NetworkDeviceList` |

### Device Types (Enum)

- Router, Switch, Firewall, Load Balancer, Access Point, Server, Storage, Gateway

### Device Status (Enum)

- Online, Offline, Warning, Critical, Maintenance, Partial

### Planned Enhancements

- Device comparison view (side-by-side specs and metrics)
- Interface utilization sparklines in the interfaces tab
- Configuration snapshot and diff viewer
- SNMP walk / CLI command execution from the UI
- Firmware compliance matrix (expected vs. actual version per device group)

---

## 8. Section 4: GPUs

### Purpose
Monitor GPU compute infrastructure — racks, nodes, and individual GPUs — with real-time telemetry and health status.

### Current Implementation

**Main Table** — GPU inventory list with columns for identification, status, utilization, temperature, and health.

**Hero Section** — Animated GPU card visualizations showing:
- H100 (high-end datacenter GPU)
- RTX 6000 (professional workstation)
- RTX 5900 (consumer high-end)
- Animated utilization bars (GPU %, memory %, temperature)
- Blinking LED status indicators (green = healthy, yellow = warning)

**Detail Modal** — GPU specifications, telemetry charts, health history.

### Data Model (from gpu.md specification)

#### Core Entities

| Entity | Key Fields |
|--------|-----------|
| **Rack** | rackId, name, location, status, labels |
| **Node** | nodeId, hostname, rackId, state (Running/Stopped/Rebooting/Maintenance/Failed/Provisioning), health, cpu, memory, storage, gpus[], nics[], sensors[] |
| **GPU** | gpuId, nodeId, model, serial, health (OK/Degraded/Failed/Resetting), utilization, temperature, power, clocks, eccErrors, migEnabled |
| **MIG Instance** | migId, profile, memory, computeSlices, state |
| **NIC** | nicId, type (IB/Eth), speedGbps, linkState, rx/tx counters |
| **Sensor** | temperature, power, fanSpeed, voltage |
| **Alert** | alertId, severity, resourceType, resourceId, code, message, timestamp, acknowledged |
| **Job** | jobId, status (Queued/Running/Succeeded/Failed/Canceled), progress, timestamps, result, errors |

#### API Endpoints (GPU Rack Simulator)

| Category | Endpoints |
|----------|-----------|
| **Inventory** | `GET /racks`, `GET /racks/{id}`, `GET /nodes/{id}`, `GET /gpus`, `GET /gpus/{id}` |
| **Telemetry** | `GET /gpus/{id}/telemetry`, `GET /telemetry/gpus?rackId=`, `GET /nodes/{id}/telemetry` |
| **Health** | `GET /nodes/{id}/health`, `GET /gpus/{id}/health` |
| **Control** | `POST /nodes/{id}/power`, `POST /nodes/{id}/reboot`, `POST /nodes/{id}/maintenance` |
| **GPU Control** | `POST /gpus/{id}/settings/power`, `POST /gpus/{id}/reset` |
| **MIG** | `GET /mig/profiles`, `POST /gpus/{id}/mig/configure` |
| **Firmware** | `GET /nodes/{id}/firmware`, `POST /nodes/{id}/firmware/update` |
| **Alerts** | `GET /alerts`, `POST /alerts/{id}/ack`, `GET /events/stream` |
| **Jobs** | `GET /jobs/{id}` |
| **Fault Injection** | `POST /faults/enable`, `POST /faults/disable` |

#### Telemetry Simulation Rules

- Configurable interval (default 5s)
- Utilization affects power consumption
- Power affects temperature
- Temperature affects health state
- ECC errors affect health state
- Deterministic mode via seed for repeatable testing

### Planned Enhancements

- GPU rack topology visualization (physical layout)
- MIG instance management UI (create/destroy MIG partitions)
- Power envelope management (per-rack kW limits)
- Workload-GPU affinity view
- ECC error trend analysis and predictive failure alerting

---

## 9. Section 5: Hosts & Virtual Machines

### Purpose
Monitor hypervisors and their virtual machines — resource allocation, health, and VM-to-host mapping.

### Current Implementation

**Tab Structure:**

| Tab | Content |
|-----|---------|
| **Hypervisors** (default) | Physical hypervisor hosts — Name, Model, CPU Count, Memory, VMs Running, Status |
| **Virtual Machines** | All VMs across hypervisors — VM Name, Hypervisor, CPU Allocated, Memory, State, IP Address |

**Hero Statistics:**
- 24 Hypervisors Online
- 3,456 Active VMs
- 82% CPU Allocated

**Interactions:**
- Tab switching with lazy-loaded tables
- Row click opens detail modal with full host/VM specifications
- Animated connection lines between hypervisor racks and VM cloud

### Supported Hypervisor Types

- VMware ESXi
- Microsoft Hyper-V
- KVM/QEMU

### Planned Enhancements

- VM migration tracking (vMotion/live migration events)
- Resource overcommit analysis (CPU, memory, storage)
- VM sprawl detection (idle/orphaned VMs)
- Host maintenance mode with VM evacuation planning
- Storage I/O metrics per VM

---

## 10. Section 6: Kubernetes Clusters

### Purpose
Multi-cluster Kubernetes monitoring — nodes, pods, workloads, services, and network policies.

### Current Implementation

**Cluster Selector** — Dropdown to switch between monitored clusters.

**Resource Tabs** (each shows a paginated table with resource count badge):

| Tab | Key Columns |
|-----|-------------|
| **Nodes** | Name, Status, Roles, Age, Version, Internal IP, OS, Kernel, Container Runtime |
| **Pods** | Namespace, Name, Ready (x/y), Status, Restarts (count + age), Age, IP, Node |
| **Deployments** | Namespace, Name, Ready, Up-to-date, Available, Age, Containers, Images |
| **StatefulSets** | Namespace, Name, Ready, Age, Containers, Images |
| **DaemonSets** | Namespace, Name, Desired, Current, Ready, Up-to-date, Available, Node Selector, Age |
| **Services** | Namespace, Name, Type, ClusterIP, External IP, Ports, Age, Selector |
| **Namespaces** | Name, Status, Age |
| **Network Policies** | Namespace, Name, Pod Selector, Age |

**Hero Metrics:**
- Cluster count (online)
- Total pods
- Total services

**Detail Modals** — Row click opens full resource spec with all Kubernetes-native fields.

### Data Source

| Endpoint | Model |
|----------|-------|
| `/1/KCache` | `K8sCluster` / `K8sClusterList` |

### Pod Status States

Running, Pending, Succeeded, Failed, Unknown, CrashLoopBackOff, Terminating, ContainerCreating, ImagePullBackOff, Error, Completed

### Custom Serializers

- **K8sReadyState**: Displays as `ready/total` (e.g., "2/3")
- **K8sRestartsState**: Displays as `count (time_ago)` (e.g., "5 (2d)")

### Planned Enhancements

- Cluster resource utilization charts (CPU/memory requests vs. limits vs. actual)
- Pod log streaming (tail -f equivalent)
- Event timeline per resource
- Helm release tracking
- Ingress/Gateway API visualization
- Multi-cluster resource comparison

---

## 11. Section 7: Storage, Power & Temperature

### Purpose
Monitor the physical infrastructure that keeps the datacenter running — power distribution chains, UPS systems, environmental sensors, cooling, and storage.

### Status: Planned

### Power Management Subsystems (from power.md specification)

#### 7a. EPMS (Electrical Power Monitoring System)

**What it manages**: Utility feeds, MV-LV switchgear, transformers, bus ducts, main distribution, panelboards, breakers, branch circuits.

**Telemetry Points**:
- Voltage (L-N, L-L per phase)
- Current per phase
- Frequency (Hz)
- Real power (kW), apparent power (kVA), reactive power (kVAR)
- Energy consumption (kWh)
- Power factor
- Total harmonic distortion (THD-V, THD-I)

**Control Actions**: Breaker open/close (where remote control exists), alarm threshold configuration.

**Alarms**: Breaker trip, overcurrent, undervoltage/overvoltage, comms loss, phase imbalance.

#### 7b. UPS Management

**What it manages**: UPS modules, rectifier/inverter states, battery strings, bypass mode, runtime estimates, load sharing in parallel UPS systems.

**Telemetry Points**:
- Input/output voltage and frequency
- Load percent
- Runtime estimate (seconds)
- Battery charge percent and temperature
- On-battery / on-bypass flags

**Control Actions**: Battery test, graceful shutdown, transfer to/from bypass.

**Alarms**: On battery, battery fault, overload, inverter fault, bypass active, comms loss.

#### 7c. PDU / RPP / Rack Power

**What it manages**: Rack PDUs (switched/monitored), branch circuits, outlet-level metering, remote outlet control, RPP panels.

**Telemetry Points**:
- Per-PDU: voltage, current, kW, kWh, power factor
- Per-outlet: state (on/off), current, energy
- Per-branch: current, breaker state

**Control Actions**: Outlet on/off/cycle, label assignment, overcurrent threshold.

**Alarms**: Outlet overcurrent, branch overload, PDU comm loss, breaker trip.

#### 7d. BMS (Building Management System)

**What it manages**: Generators, ATS/STS transfer switches, fuel systems, environmental sensors (temperature, humidity).

**Telemetry Points**:
- Generator: state (stopped/starting/running/fault), kW, RPM, coolant temp
- Fuel percent
- ATS position (utility/generator/bypass)
- Room temperature (C) and humidity (%)

**Control Actions**: Generator start/stop (test mode), ATS transfer test, environmental thresholds.

**Alarms**: Generator fault, transfer failed, low fuel, high temperature.

#### 7e. Storage Systems

**Planned Telemetry**:
- Storage array capacity (total, used, available)
- IOPS, throughput, latency
- Disk health (SMART status, predictive failure)
- RAID group status
- Replication lag

### Power Chain Visualization

The UI should visualize the complete power path:

```
Utility Feed -> ATS -> Transformer -> Main Switchgear -> UPS -> PDU -> Rack -> Server
```

Each hop shows real-time power metrics, allowing operators to trace power delivery from utility to device.

### Unified API Model

All power/environmental subsystems should be normalized into:
- `/devices` (typed: epms_meter, ups, pdu, generator, ats, sensor)
- `/topology` (power path graph)
- `/measurements` (time series)
- `/alarms` (events)
- `/commands` (control actions)

### Key Metrics

| Metric | Formula |
|--------|---------|
| **PUE** (Power Usage Effectiveness) | Total facility power / IT equipment power |
| **Headroom** | Rated capacity - actual load per breaker/panel |
| **Stranded Power** | Allocated - actual used (waste indicator) |
| **Runtime** | Battery capacity / current load (UPS) |

---

## 12. Section 8: Topologies

### Purpose
Visualize the network topology — device interconnections, link status, geographic positioning, and protocol overlays.

### Current Implementation

- Embedded iframe of `topo/index.html`
- Interactive network topology with zoom, pan, and link toggles
- Geographic device positioning using world-cities database
- Layer 2 and Layer 3 topology views
- Real-time link status and bandwidth utilization

**Hero Statistics:**
- 247 Nodes
- 1,842 Links
- L2/L3 Layers

### Data Source

L8Topology service discovers topology from:
- LLDP/CDP neighbor tables (Layer 2)
- BGP/OSPF/IS-IS adjacencies (Layer 3)
- MPLS LSP paths (tunnel overlay)
- Manual link definitions

### Planned Enhancements

- Migrate from iframe to native L8UI component
- Power path topology overlay (from Section 7 data)
- Alarm severity overlay on topology nodes/links (from Section 9)
- Traffic utilization heatmap on links
- Path trace tool (trace route between two nodes through topology)
- Topology diff (compare current vs. historical topology)
- Multi-layer view (physical, logical, service)

---

## 13. Section 9: Events & Alarms

### Purpose
Centralized alarm management, event correlation, and root cause analysis (RCA) across all infrastructure domains.

### Status: Planned

### Architecture Reference

This section follows the architecture defined in the **l8alarms** project PRD (`l8alarms/plans/prd-root-cause-analysis-alarms-events.md`), adapted for the Probler DCIM context.

### Core Capabilities

1. **Alarm Lifecycle**: Raise -> Acknowledge -> Clear -> Archive (with suppression during maintenance windows)
2. **Event Ingestion**: Raw events from all managed devices normalized into a common schema
3. **Topology-Aware RCA**: Correlate alarms using topological relationships from L8Topology
4. **Correlation Rules Engine**: Topological, temporal, pattern-based, and composite correlation strategies
5. **Notification & Escalation**: Policy-driven notifications with time-based escalation
6. **Maintenance Windows**: Scheduled suppression windows with device/group targeting

### Prime Objects (10)

| Entity | Service | Primary Key | Description |
|--------|---------|-------------|-------------|
| AlarmDefinition | AlmDef | definitionId | Templates for alarm conditions |
| Alarm | Alarm | alarmId | Active/historical alarm instances |
| Event | Event | eventId | Raw events from managed elements |
| CorrelationRule | CorrRule | ruleId | RCA correlation rules |
| NotificationPolicy | NotifPol | policyId | Notification triggering rules |
| EscalationPolicy | EscPolicy | policyId | Time-based escalation chains |
| MaintenanceWindow | MaintWin | windowId | Alarm suppression windows |
| AlarmFilter | AlmFilter | filterId | Saved filter/view configurations |
| ArchivedAlarm | ArcAlarm | alarmId | Archived alarm records |
| ArchivedEvent | ArcEvent | eventId | Archived event records |

### Child Types (embedded in parents)

- AlarmNote, AlarmStateChange (in Alarm)
- EventAttribute (in Event)
- CorrelationCondition (in CorrelationRule)
- NotificationTarget (in NotificationPolicy)
- EscalationStep (in EscalationPolicy)

### Alarm Severity Levels

- Critical, Major, Minor, Warning, Info, Clear

### Alarm States

- Active, Acknowledged, Cleared, Suppressed, Archived

### RCA Correlation Strategies

| Strategy | Description |
|----------|-------------|
| **Topological** | Query L8Topology for upstream/downstream neighbors; if parent node is alarmed, child alarms are symptoms |
| **Temporal** | Group alarms occurring within a configurable time window |
| **Pattern-Based** | Match specific alarm definition patterns (e.g., interface down + BGP peer down = link failure) |
| **Composite** | Combine multiple strategies (e.g., topological AND temporal) |

### UI Submodules

| Submodule | Views | Content |
|-----------|-------|---------|
| Alarms | Table, Kanban, Chart | Active alarms, alarm definitions, saved filters |
| Events | Table | Raw event log |
| Correlation | Table | Correlation rule management |
| Policies | Table | Notification and escalation policies |
| Maintenance | Table, Calendar | Maintenance window scheduling |
| Archive | Table | Historical alarm and event records |

### Integration with Other Sections

- **Topology (Section 8)**: Alarm severity overlay on topology nodes and links
- **Dashboard (Section 1)**: Top critical alarms widget
- **All device sections**: Alarm count badges on device rows, alarm tab in detail modals

---

## 14. Section 10: Automation & Workflows

### Purpose
DAG-based workflow orchestration for datacenter operations — from simple device reboots to complex multi-step provisioning.

### Status: Planned

### Planned Capabilities

1. **DAG Workflow Engine**: Define multi-step workflows as directed acyclic graphs
2. **Action Library**: Pre-built actions for common operations:
   - IPMI/Redfish power control (on, off, cycle, reset)
   - SNMP SET operations
   - SSH command execution
   - REST API calls to external systems
   - Kubernetes operations (scale, restart, drain)
3. **Trigger Types**: Manual, scheduled (cron), alarm-driven, threshold-driven
4. **Approval Gates**: Require human approval before high-risk steps
5. **Audit Trail**: Full execution history with step-by-step results
6. **Maintenance Calendar**: Schedule maintenance windows that integrate with alarm suppression (Section 9)

### Example Workflows

| Workflow | Steps |
|----------|-------|
| **Device Firmware Upgrade** | Pre-check health -> backup config -> upload firmware -> reboot -> verify health -> send notification |
| **K8s Node Drain** | Cordon node -> drain pods -> wait for reschedule -> perform maintenance -> uncordon |
| **Power Budget Reduction** | Identify low-priority workloads -> migrate VMs -> power down hosts -> verify capacity |
| **Incident Response** | Detect alarm -> correlate (Section 9) -> auto-ticket -> notify on-call -> escalate if unacked |

---

## 15. Section 11: Applications

### Purpose
Application-layer integrations and specialized network applications.

### Status: Planned

### Planned Capabilities

1. **Traffic Engineering (TE)**: MPLS/SR policy management, path computation, bandwidth optimization
2. **Application Topology**: Map application dependencies to infrastructure (which app runs on which VMs/pods on which hosts)
3. **Service Assurance**: Monitor application SLAs against infrastructure health
4. **Network Functions**: SDN controller integration, network function orchestration

### Traffic Engineering (Existing Capability — TE App Service)

The TE application is partially implemented as a standalone service (`te_app/`). It provides:
- Interactive global network topology with SR policy visualization
- BGP session monitoring and analytics
- MPLS label management (node SIDs 16000-23999, adjacency SIDs 24000-31999, service labels)
- RSVP-TE tunnel management
- Path computation and traffic steering

This should be integrated into the Applications section as the first application module.

---

## 16. Section 12: Analytics

### Purpose
Historical analysis, capacity forecasting, and optimization recommendations.

### Status: Planned

### Planned Capabilities

1. **Historical Trend Analysis**: Chart any time-series metric over custom time ranges
2. **Capacity Forecasting**: Predict when resources (power, compute, network bandwidth) will hit capacity
3. **What-If Planning**: Simulate scenarios:
   - "What happens if we add 250kW of GPU load?"
   - "What is our battery runtime if we lose a UPS module?"
   - "What is the impact of decommissioning 10 hypervisors?"
4. **PUE Optimization**: Track Power Usage Effectiveness trends and recommend improvements
5. **Carbon Footprint**: Energy consumption tracking and sustainability reporting
6. **Cost Analysis**: Power cost per rack/row/room, cost per workload
7. **Anomaly Detection**: Identify unusual patterns in telemetry data

### Key Dashboards

| Dashboard | Metrics |
|-----------|---------|
| **Power Efficiency** | PUE trend, kWh per rack, stranded power, headroom % |
| **Capacity** | Compute utilization trend, network bandwidth utilization, storage growth rate |
| **Reliability** | MTBF, MTTR, alarm frequency, device failure rate |
| **Environmental** | Temperature heatmap, humidity trends, cooling efficiency |

---

## 17. Section 13: System

### Purpose
Platform administration — health monitoring, configuration, logs, and user/role management.

### Current Implementation

**Tab Structure:**

| Tab | Content | Status |
|-----|---------|--------|
| **Health** | Embedded `health/index.html` — real-time service health, process performance, leader election status | Implemented |
| **Settings** | System configuration, theme preferences, maintenance windows | Placeholder |
| **Logs** | Embedded `logsui/index.html` — distributed log aggregation via L8LogFusion, filtering, real-time streaming | Implemented |

### Security Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/73/users` | User management |
| `/74/roles` | Role management |
| `/75/Creds` | Credential management |
| `/0/Health` | System health |

### Planned Enhancements

- Native L8UI settings page (migrate from placeholder)
- RBAC management UI (users, roles, permissions)
- Audit log viewer (who did what, when)
- API key management
- System backup/restore
- Plugin/module enable/disable

---

## 18. Data Models

### 18a. Network Device Model (`inventory.proto`)

The NetworkDevice is the most complex data model in the system, representing a complete physical and logical view of a network device.

**Hierarchy:**
```
NetworkDevice
├── EquipmentInfo (device identification, status, location)
├── Physical (map)
│   ├── Chassis
│   │   ├── Module[] (supervisor, line card, route processor, fabric, etc.)
│   │   │   ├── Cpu[] (model, cores, frequency, utilization%, temperature)
│   │   │   ├── Memory[] (type, size, frequency, utilization%)
│   │   │   └── Port[]
│   │   ├── PowerSupply[] (model, wattage, type, load%, voltage, current, temperature)
│   │   ├── Fan[] (speed RPM, max RPM, variable speed, temperature)
│   │   └── Slot[] (module + ports)
│   ├── Port[] -> Interface[]
│   └── PerformanceMetrics (CPU%, memory%, temperature, uptime, load average, processes, connections)
└── Logical (map)
    ├── Interface[] (name, type, status, speed, MAC, IP, MTU, VRF, TE, QoS, BGP, OSPF, MPLS, stats)
    └── VrfInstance[] (name, RD, RT import/export, BGP, OSPF, routing table)
```

**Routing Protocol Coverage:**
- BGP: Peers (state machine), routes (prefix, next-hop, AS path, communities, MED, local pref)
- OSPF: Neighbors (state machine), LSAs, areas (backbone/normal/stub/NSSA), DR/BDR
- MPLS: Labels (static/dynamic/LDP/RSVP/SR), FECs, LDP sessions, forwarding table
- SR: Policies (endpoint, color, binding SID), candidate paths, segment lists
- TE: Tunnels (P2P/P2MP/MP2MP), LSPs, RSVP sessions, bandwidth reservations
- QoS: Policies, class maps, policy maps, traffic shaping/policing

**Interface Types:** Ethernet (10M-100G), Serial, ATM, Frame Relay, Loopback, Management, Tunnel, VLAN, Bridge

**Component Status:** OK, Warning, Error, Critical, Offline, Not Present

### 18b. Kubernetes Model (`k8s.proto`)

```
K8sCluster
├── K8sNode (map) — name, status, roles, version, IPs, OS, kernel, runtime
├── K8sPod (map) — namespace, name, ready, status, restarts, age, IP, node
├── K8sDeployment (map) — namespace, name, ready, up-to-date, available, images
├── K8sStatefulSet (map) — namespace, name, ready, age, images
├── K8sDaemonSet (map) — namespace, name, desired/current/ready/up-to-date/available
├── K8sService (map) — namespace, name, type, clusterIP, externalIP, ports
├── K8sNamespace (map) — name, status, age
└── K8sNetworkPolicy (map) — namespace, name, pod selector, age
```

### 18c. Extended Kubernetes Model (`kubernetes.proto`)

Full Kubernetes API resource definitions mirroring the official API, including:
- PersistentVolumes / PersistentVolumeClaims / StorageClasses
- ConfigMaps / Secrets
- Ingress / Endpoints
- Roles / ClusterRoles / RoleBindings / ClusterRoleBindings / ServiceAccounts
- Jobs / CronJobs
- Complete PodSpec (containers, volumes, scheduling, security contexts)

### 18d. GPU Model (planned — from gpu.md)

- Rack, Node, GPU, MIG Instance, NIC, Sensor, Alert, Job

### 18e. Power & Environmental Model (planned — from power.md)

- Site / Building / Room / Row / Rack (location hierarchy)
- Device (meter, UPS, PDU, generator, ATS, sensor)
- Circuit / Feeder / Panel / Breaker
- Measurement (time series)
- Alarm / Event
- Command (control action)
- Topology (power path graph)

### 18f. Alarm & Event Model (planned — from l8alarms PRD)

- AlarmDefinition, Alarm, Event, CorrelationRule, NotificationPolicy, EscalationPolicy, MaintenanceWindow, AlarmFilter, ArchivedAlarm, ArchivedEvent

---

## 19. Backend Microservices

### Current Services

| Service | Directory | Purpose | Scaling | Port/Endpoint |
|---------|-----------|---------|---------|---------------|
| **Collector** | `prob/collector` | SNMP/SSH/REST polling of managed devices | Horizontal | L8Bus |
| **Parser** | `prob/parser` | Model-agnostic data transformation | Horizontal | L8Bus |
| **Inventory Box** | `prob/inv_box` | Network device inventory cache | Vertical | `/0/NCache` |
| **Inventory K8s** | `prob/inv_k8s` | Kubernetes cluster inventory cache | Vertical | `/1/KCache` |
| **ORM** | `prob/orm` | PostgreSQL persistence layer | Vertical | L8Bus |
| **Topology** | `prob/topology` | Layer 1/2/3 topology discovery | Vertical | `topo/index.html` |
| **VNet** | `prob/vnet` | Web UI server + API gateway | Vertical | Port 2443 |
| **NewUI** | `prob/newui` | Web UI static file server | Vertical | Port 2443 |
| **Log Agent** | `prob/log-agent` | Distributed log collection | Horizontal | L8Bus |
| **Log VNet** | `prob/log-vnet` | Log aggregation (L8LogFusion) | Vertical | Port 27000 |
| **Maintenance** | `prob/maint` | Maintenance page server | Vertical | — |
| **Protocol Control** | `prob/prctl` | Protocol testing and diagnostics | Vertical | Port 26500 |

### Planned Services

| Service | Purpose | Scaling |
|---------|---------|---------|
| **GPU Inventory** | GPU rack/node/GPU cache | Vertical |
| **GPU Collector** | Redfish/REST GPU telemetry polling | Horizontal |
| **Power Collector** | SNMP/Modbus power device polling | Horizontal |
| **Env Collector** | BACnet/Modbus environmental sensor polling | Horizontal |
| **Power Inventory** | Power chain cache (EPMS, UPS, PDU) | Vertical |
| **Env Inventory** | Environmental data cache | Vertical |
| **Alarm Engine** | Event correlation and RCA | Vertical |
| **Notification Service** | Alert notification delivery | Vertical |
| **Workflow Engine** | DAG workflow execution | Vertical |
| **Analytics Engine** | Forecasting and optimization | Vertical |
| **TE App** | Traffic engineering (existing, to integrate) | Vertical |
| **Host Collector** | VMware/HyperV/KVM hypervisor polling | Horizontal |
| **Host Inventory** | Hypervisor/VM inventory cache | Vertical |

---

## 20. Security & Authentication

### Current Implementation

- Bearer token-based authentication
- Session timeout: 30 minutes
- Two-factor authentication (TFA) support
- Default credentials: `admin / admin`
- Role-based access control (RBAC) with user/role management endpoints

### Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/auth` | Authentication (login, token refresh) |
| `/73/users` | User CRUD |
| `/74/roles` | Role CRUD |
| `/75/Creds` | Credential management (SNMP communities, SSH keys, API tokens) |

### Planned Enhancements

- OAuth2/JWT integration
- LDAP/Active Directory integration
- Per-section and per-device RBAC (view-only vs. control permissions)
- API key management for external integrations
- Audit logging (who accessed what, when)
- Network segmentation between management and polling planes

---

## 21. Deployment & Infrastructure

### Supported Platforms

| Platform | Use Case |
|----------|----------|
| **Bare Metal** | Small deployments, edge sites |
| **Docker Compose** | Development and testing |
| **Kubernetes** | Production deployment |

### Kubernetes Deployment

- **StatefulSets**: ORM, inventory services (require persistent state)
- **DaemonSets**: VNet overlay (runs on every node for service mesh)
- **Deployments**: Collectors, parsers (stateless, horizontally scalable)
- **Services**: Internal (ClusterIP) for inter-service, LoadBalancer for web UI

### Database

- PostgreSQL with connection pooling
- ORM service manages schema and migrations
- Credentials stored via `/75/Creds` endpoint

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_HOST` | Database host | `localhost` |
| `POSTGRES_PORT` | Database port | `5432` |
| `POSTGRES_DB` | Database name | `probler` |
| `VNET_PORT` | Web interface port | `443` |
| `LOG_LEVEL` | Logging level | `INFO` |

---

## 22. UI Framework & Patterns

### L8UI Component Library

All UI is built on the shared L8UI framework located in `go/prob/newui/web/l8ui/`.

**Core Components:**

| Component | Purpose |
|-----------|---------|
| **Layer8DTable** | Server-side paginated, sortable, filterable data tables |
| **Layer8DPopup** | Modal system for detail views and forms |
| **Layer8DConfig** | Configuration management and endpoint resolution |
| **Layer8DChart** | Chart rendering (bar, line, pie) with theme integration |
| **Layer8DViewFactory** | Dynamic view type system (table, kanban, chart, calendar) |
| **Layer8DModuleFactory** | Module initialization with namespace management |
| **Layer8DUtils** | HTML escaping, formatting, string utilities |

### Section Loading Pattern

Sections are loaded dynamically by `sections.js`:
1. Sidebar navigation click triggers `loadSection(sectionName)`
2. Section HTML is fetched from `sections/{name}.html`
3. HTML is injected into the main content area
4. Section callback (`sectionInitializers[name]`) fires to initialize JS components
5. Inline `<script>` tags do NOT execute (by design) — all JS is loaded via `app.html`

### Module Namespace Pattern

Each section uses a module namespace to avoid global conflicts:
- `Probler` — shared module config
- `ProblerNetwork` — network device enums, columns, renderers
- `ProblerGpus` — GPU enums, columns, renderers
- `ProblerHosts` — host/VM enums, columns, renderers
- `ProblerK8s` — Kubernetes enums, columns, renderers

### PostMessage Bridge

Iframe-based sections (dashboard, targets, topology) communicate with the main app via `postMessage`:
- `probler-popup-show` — open a Layer8DPopup from within an iframe
- `probler-popup-close` — close the popup
- `probler-popup-update` — update popup content

---

## 23. Mobile Parity

### Requirement

Every UI feature must have functional parity between desktop (`go/prob/newui/web/`) and mobile (`go/prob/newui/web/m/`). This includes not just the UI elements but also their behavioral effects on the application.

### Current Mobile Implementation

- `m/app.html` — mobile app shell
- `m/index.html` — mobile landing page
- Mobile-responsive navigation
- Auto-redirect from desktop to mobile based on user agent

### Parity Checklist for Each Section

- Desktop section HTML has a mobile counterpart
- Desktop detail modals have mobile equivalents
- Interactive features (sorting, filtering, tabs) work on both platforms
- Shared scripts are included in both `app.html` and `m/app.html`
- Section initializers exist for both platforms
- Navigation updates (enable/disable modules) propagate to both platforms

---

## 24. Non-Functional Requirements

### Performance

| Metric | Target |
|--------|--------|
| Dashboard load time | < 2 seconds |
| Table page render | < 500ms |
| Device detail modal open | < 1 second |
| Topology render (1000 nodes) | < 3 seconds |
| API response (cached) | < 100ms |
| API response (database) | < 500ms |

### Scalability

| Dimension | Target |
|-----------|--------|
| Managed network devices | 10,000+ |
| Kubernetes clusters | 50+ |
| GPU racks | 100+ |
| Concurrent UI sessions | 100+ |
| Time-series data points/sec | 100,000+ |

### Availability

- Service health endpoints on all microservices
- Kubernetes readiness and liveness probes
- Automatic leader election for stateful services
- Graceful degradation (if one section's backend is down, other sections continue working)

### Observability

- Structured JSON logging with configurable levels
- Request tracing across service boundaries
- Centralized log aggregation via L8LogFusion
- Health dashboard with service status indicators

### Browser Support

- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)
- Mobile: iOS Safari, Android Chrome

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Backend | Go 1.25.4 |
| Framework | Layer 8 (custom networking, ORM, introspection) |
| Communication | gRPC / Protocol Buffers |
| Database | PostgreSQL |
| Polling | SNMP (gosnmp), SSH, REST, Redfish, Modbus, BACnet |
| Frontend | Vanilla JavaScript (no framework dependencies) |
| Styling | CSS3 with Grid, Flexbox, CSS Custom Properties |
| Graphics | SVG (topology, animations) |
| Containerization | Docker |
| Orchestration | Kubernetes |
