# Probler Help

Probler is a datacenter management system: it discovers and monitors network devices, GPU servers,
Kubernetes clusters and alarms. Screens are written as "Section > Module > Service".

## Navigation
- Desktop: the left sidebar lists the sections. Mobile: the home screen shows one card per section;
  tap a card, then a sub-module, then a service.
- The AI Agent bubble (bottom right) is available on every screen. Type `@help <question>` for
  questions about how to use Probler, `@web <question>` for a live web search.
- Switch theme with the theme button in the header; switch portals (Probler, Kubernetes Explorer)
  with the portal switcher next to it.

## Dashboard
- Dashboard shows live KPI cards: Network Devices (online / offline), Kubernetes (clusters, nodes,
  pods), GPU Servers, and the top critical alarms. Cards update live; click a card to open its section.

## Inventory > Targets
Targets are what Probler polls (devices, GPU servers, clusters).
- See targets: Inventory, then pick the Inventory Type (Network Device, GPUS, Hosts, ...).
- Add a target: Inventory > Add Target > enter Target ID and Links ID (NetDev for network devices,
  GPU for GPU servers) > + Add Host > Host ID > + Add Protocol > protocol (SSH, SNMPV2, ...), address,
  port, credential > Save > Save Host > Save. Every host needs at least one protocol.
- Start / stop polling one target: the play/stop button on its row. All targets of a type:
  Start All / Stop All (asks for confirmation).
- Target details: click a row (Overview and Hosts tabs). Delete: the row's Delete button.

## Network Devices
- Network: table of every network device (name, IP, type, location, status, uptime) with filters,
  sorting, paging, print and CSV/Excel/PDF export.
- Device details: click a row. Tabs: Overview, Equipment, Interfaces, Routing, Physical Inventory
  (expandable tree), Performance (Summary, CPU, Memory, Temperature charts). The popup refreshes
  live while open.

## GPUs
- GPUs: table of GPU servers (IP, hostname, GPU model, GPU count, software, status).
- GPU server details: click a row. Tabs: Overview, GPUs, Software (desktop); mobile adds
  Performance and Processes.

## Hosts & VMs
- Hosts & VMs > Hypervisors / Virtual Machines. (No hypervisor inventory service is deployed yet,
  so these tables are empty.)

## Kubernetes
- Kubernetes: pick the cluster at the top. Overview shows a card per category; click a card to open it.
- Categories: Workloads (Pods, Deployments, StatefulSets, DaemonSets, ReplicaSets, Jobs, CronJobs,
  HPAs), Networking, Storage, Configuration, Access Control, Nodes, Namespaces, vCluster, Istio,
  CRDs, Events. Each resource opens a table; click a row for Overview / All Fields / JSON tabs.
- Kubernetes Explorer portal (portal switcher > Kubernetes Explorer): rail of every resource kind,
  cluster and namespace selectors, resource tables, and a Related tab in the detail popup.

## Topologies
- Topologies: select a topology (e.g. "Network Layer 1") to draw its nodes and links. Zoom with
  +/-/Reset, change the layout with the layout selector, and browse Nodes / Links / Legend tabs.

## Alarms & Events
- Alarms > Alarms > Active Alarms (table, kanban and chart views), Definitions (what creates an
  alarm from an event), Saved Filters.
- Alarms > Events: every event the services post (l8events).
- Alarms > Correlation > Correlation Rules; Alarms > Policies > Notification / Escalation Policies;
  Alarms > Archive > Archived Alarms.
- Create a definition / filter / rule / policy: open the service, Add, fill the form, Save.

## System
- System > Health: every running service (RX/TX, memory, CPU, uptime); click a row for details.
- System > Security > Users, Roles, Credentials, Events, Portals: add / edit / delete with the
  table buttons. Change your own password from the Security tab.
- System > Modules: enable or disable sections and services.
- System > Logs: browse the log files of every node.
- System > Data Import: templates, transfer and CSV/JSON/XML import into any model.

## Common tasks
- Export a table: the Export menu above any table (CSV, Excel, PDF) or Print.
- Find a record: type in the column filter row of the table.
- Change page size: the Show selector above the table.
