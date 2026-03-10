# Mobile v2 Desktop Parity Plan — Field-Level Specification

## Section 1: Network Devices

### 1.1 Table Columns

| # | Desktop Key | Desktop Label | Desktop Filter/Sort Key | Mobile v2 Key | Mobile v2 Label | Match? |
|---|-------------|---------------|------------------------|---------------|-----------------|--------|
| 1 | `name` | Device Name | `equipmentinfo.sysName` | `name` | Device Name | YES |
| 2 | `ipAddress` | IP Address | `equipmentinfo.ipAddress` | `ipAddress` | IP Address | YES |
| 3 | `deviceType` | Type | `equipmentinfo.deviceType` | `deviceType` | Type | YES |
| 4 | `location` | Location | `equipmentinfo.location` | `location` | Location | YES |
| 5 | `status` | Status | `equipmentinfo.deviceStatus` | `status` | Status | YES |
| 6 | `uptime` | Uptime | `equipmentinfo.uptime` | `uptime` | Uptime | YES |

**Table config**: Desktop uses `serverSide: true`, endpoint `/0/NCache`, model `NetworkDevice`, pageSize 15, `readOnly` (no CRUD buttons). Desktop applies `transformDeviceData()` to flatten nested `equipmentinfo` fields into top-level keys.

**Mobile v2 status**: Columns match. `readOnly: true` set in nav config. Filter/sort keys use `equipmentinfo.*` paths — mobile Layer8MTable must use same server-side filter/sort keys.

### 1.2 Enums

| Enum | Desktop Values | Mobile v2 Values | Match? |
|------|---------------|------------------|--------|
| DEVICE_STATUS | 0=unknown, 1=online, 2=offline, 3=warning, 4=critical, 5=maintenance, 6=partial | 0=Unknown, 1=Online, 2=Offline, 3=Warning, 4=Critical, 5=Maintenance, 6=Partial | YES |
| DEVICE_TYPE | 0=unknown, 1=Router, 2=Switch, 3=Firewall, 4=Server, 5=Access Point, 6=Server | 0=Unknown, 1=Router, 2=Switch, 3=Firewall, 4=Server, 5=Access Point | MISMATCH: Desktop maps 6→Server too |

**Action**: Add `6: 'Server'` to mobile DEVICE_TYPE enum.

### 1.3 Data Transform

Desktop `transformDeviceData()` flattens `device.equipmentinfo.*` fields into a flat object. The transform extracts these fields from the raw API response:

| Flat Field | Source Path | Used In |
|------------|-------------|---------|
| `id` | `device.id` | Row ID |
| `name` | `equipment.sysName \|\| device.id` | Table + Modal |
| `sysName` | `equipment.sysName` | Modal |
| `ipAddress` | `equipment.ipAddress \|\| device.id` | Table + Modal |
| `deviceType` | `equipment.deviceType` (mapped) | Table |
| `location` | `equipment.location` | Table + Modal |
| `status` | `equipment.deviceStatus` (mapped) | Table + Modal |
| `uptime` | `equipment.uptime` (formatted) | Table + Modal |
| `model` | `equipment.model \|\| equipment.hardware` | Modal |
| `vendor` | `equipment.vendor` | Modal |
| `series` | `equipment.series` | Modal |
| `family` | `equipment.family` | Modal |
| `software` | `equipment.software` | Modal |
| `serialNumber` | `equipment.serialNumber` | Modal |
| `firmware` | `equipment.firmwareVersion \|\| equipment.version` | Modal |
| `version` | `equipment.version` | Modal |
| `hardware` | `equipment.hardware` | Modal |
| `sysOid` | `equipment.sysOid` | Modal |
| `interfaces` | `equipment.interfaceCount \|\| physicals[*].ports.length` | Modal |
| `lastSeen` | `new Date().toISOString()` | Modal |
| `vendorTypeOid` | `equipment.vendorTypeOid` | Modal |
| `physicalAlias` | `equipment.physicalAlias` | Modal |
| `assetId` | `equipment.assetId` | Modal |
| `isFru` | `equipment.isFru` | Modal |
| `manufacturingDate` | `equipment.manufacturingDate` | Modal |
| `manufacturerName` | `equipment.manufacturerName` | Modal |
| `identificationUris` | `equipment.identificationUris` | Modal |
| `logicals` | `device.logicals` | Modal (interfaces, routing) |
| `physicals` | `device.physicals` | Modal (physical inventory, perf) |
| `latitude` | `equipment.latitude` | Modal |
| `longitude` | `equipment.longitude` | Modal |

**Mobile v2 status**: The mobile `network-device-detail.js` accesses the raw `item` object, not the transformed one. Must verify that Layer8MNavData passes the transformed data or that the detail code handles the nested structure correctly.

### 1.4 Detail Modal — Tab-by-Tab Comparison

#### Tab 1: Overview

| # | Desktop Label | Desktop Path | Mobile v2 Label | Mobile v2 Path | Match? |
|---|---------------|-------------|-----------------|----------------|--------|
| 1 | Device Name | `device.name` | Name | `item.name \|\| item.equipmentinfo?.sysName` | YES |
| 2 | System Name | `device.sysName` | — | — | MISSING |
| 3 | IP Address | `device.ipAddress` | IP Address | `item.ipAddress \|\| item.equipmentinfo?.ipAddress` | YES |
| 4 | Device Type | `device.deviceType` | Type | `item.deviceType` | YES |
| 5 | Status | `device.status` (badge) | Status | `item.status` | YES |
| 6 | Last Seen | `device.lastSeen` | — | — | MISSING |
| 7 | Location | `device.location` | Location | `item.location \|\| item.equipmentinfo?.location` | YES |
| 8 | Coordinates | `device.latitude, device.longitude` | — | — | MISSING |
| 9 | Uptime | `device.uptime` | Uptime | `item.uptime` | YES |
| 10 | Interfaces | `device.interfaces` | — | — | MISSING |

**Actions**: Add System Name, Last Seen, Coordinates, Interfaces count to mobile Overview tab.

#### Tab 2: Equipment

| # | Desktop Label | Desktop Path | Mobile v2 Label | Mobile v2 Path | Match? |
|---|---------------|-------------|-----------------|----------------|--------|
| 1 | Vendor | `device.vendor` | Vendor | `item.vendor \|\| eq.vendor` | YES |
| 2 | Model | `device.model` | Model | `item.model \|\| eq.model` | YES |
| 3 | Series | `device.series` | Series | `item.series \|\| eq.series` | YES |
| 4 | Family | `device.family` | Family | `item.family \|\| eq.family` | YES |
| 5 | Serial Number | `device.serialNumber` | Serial | `item.serialNumber \|\| eq.serialNumber` | YES |
| 6 | Interfaces | `device.interfaces` | — | — | MISSING |
| 7 | Software | `device.software` | Software | `eq.software` | YES |
| 8 | Hardware | `device.hardware` | Hardware | `eq.hardware` | YES |
| 9 | Version | `device.version` | Version | `eq.version` | YES |
| 10 | Firmware Version | `device.firmware` | Firmware | `eq.firmwareVersion` | YES |
| 11 | System OID | `device.sysOid` | System OID | `eq.sysOid` | YES |
| 12 | Device Type | `device.deviceType` | — | — | MISSING (in Equipment) |
| 13 | Management IP | `device.ipAddress` | — | — | MISSING (in Equipment) |
| 14 | Manufacturer | `device.manufacturerName` | Manufacturer | `eq.manufacturerName` | YES (only if populated) |
| 15 | Manufacturing Date | `device.manufacturingDate` (hex decoded) | Mfg Date | `eq.manufacturingDate` | YES but desktop decodes hex |
| 16 | Asset ID | `device.assetId` | Asset ID | `eq.assetId` | YES |
| 17 | Physical Alias | `device.physicalAlias` | — | — | MISSING |
| 18 | Vendor Type OID | `device.vendorTypeOid` | — | — | MISSING |
| 19 | Field Replaceable | `device.isFru` (Yes/No) | FRU | `eq.isFru` | YES |
| 20 | Identification URIs | `device.identificationUris` | — | — | MISSING |

**Actions**: Add Interface Count, Device Type, Management IP, Physical Alias, Vendor Type OID, Identification URIs to mobile Equipment tab. Add hex decode for Manufacturing Date.

#### Tab 3: Interfaces

Desktop renders a table of interfaces collected from `device.physicals[*].ports[*].interfaces[*]` and `device.logicals[*].interfaces[*]`.

| # | Desktop Column | Desktop Path | Mobile v2 Column | Match? |
|---|---------------|-------------|-----------------|--------|
| 1 | Name | `iface.name \|\| iface.id` | Name | YES |
| 2 | Status | `iface.status` (badge up/down) | Status | YES |
| 3 | Admin | `iface.adminStatus` (Up/Down badge) | — | MISSING |
| 4 | Type | `iface.interfaceType` (mapped: 1=Ethernet...15=Bridge) | — | MISSING |
| 5 | IP Address | `iface.ipAddress` | — | MISSING |
| 6 | MAC Address | `iface.macAddress` (monospace) | — | MISSING |
| 7 | Speed | `iface.speed` (formatted Gbps/Mbps/Kbps) | Speed | YES |
| 8 | MTU | `iface.mtu` | MTU | YES |
| 9 | RX Bytes | `iface.statistics.rxBytes` (formatted) | RX | YES (formatBytes) |
| 10 | TX Bytes | `iface.statistics.txBytes` (formatted) | TX | YES (formatBytes) |
| 11 | RX Pkts | `iface.statistics.rxPackets` | — | MISSING |
| 12 | TX Pkts | `iface.statistics.txPackets` | — | MISSING |

Desktop also has `INTERFACE_TYPE_NAMES` mapping: 1=Ethernet, 2=Fast Ethernet, 3=GigE, 4=10GigE, 5=25GigE, 6=40GigE, 7=100GigE, 8=Serial, 9=ATM, 10=Frame Relay, 11=Loopback, 12=Management, 13=Tunnel, 14=VLAN, 15=Bridge.

**Actions**: Add Admin Status, Type (with INTERFACE_TYPE_NAMES), IP Address, MAC Address, RX Pkts, TX Pkts columns to mobile interfaces table.

#### Tab 4: Routing

Desktop shows VRFs with BGP and OSPF subsections. Mobile v2 has this tab — need to compare fields.

**VRF Section:**

| # | Desktop Field | Desktop Path | Mobile v2 | Match? |
|---|---------------|-------------|-----------|--------|
| 1 | VRF Name | `vrf.vrfName` | VRF Name (title) | YES |
| 2 | Status | `vrf.status` (1=Active, 2=Inactive, 3=Admin Down) | Status | YES |
| 3 | Route Distinguisher | `vrf.routeDistinguisher` | RD | YES |

**BGP Peers Table (if `vrf.bgpInfo.bgpEnabled`):**

| # | Desktop Column | Desktop Path | Mobile v2 | Match? |
|---|---------------|-------------|-----------|--------|
| 1 | Heading | `BGP — AS {bgpInfo.asNumber}` | `BGP AS {asNumber}` | YES |
| 2 | Peer ID | `peer.peerId` | Peer ID | YES |
| 3 | Peer IP | `peer.peerIp` | Peer IP | YES |
| 4 | Peer AS | `peer.peerAs` | Peer AS | YES |
| 5 | Type | `peer.peerType` (1=iBGP, 2=eBGP) | Type | YES |
| 6 | State | `peer.state` (0-6 mapped, 6=Established=green) | State | YES |
| 7 | Routes Received | `peer.routesReceived` | Routes | YES |

**OSPF Section (if `vrf.ospfInfo.ospfEnabled`):**

| # | Desktop Field | Desktop Path | Mobile v2 | Match? |
|---|---------------|-------------|-----------|--------|
| 1 | Heading | `OSPF — Router ID {ospf.routerId}` | `OSPF Router {routerId}` | YES |
| 2 | Area ID | `ospf.areaId` | Area | YES |
| 3 | Cost | `ospf.cost` | Cost | YES |
| 4 | Priority | `ospf.priority` | Priority | YES |
| 5 | Retransmit Interval | `ospf.retransmitInterval` + 's' | — | MISSING |

**OSPF Neighbors Table:**

| # | Desktop Column | Desktop Path | Mobile v2 | Match? |
|---|---------------|-------------|-----------|--------|
| 1 | Neighbor ID | `nbr.neighborId` | Neighbor | YES |
| 2 | Neighbor IP | `nbr.neighborIp` | IP | YES |
| 3 | State | `nbr.state` (0-8 mapped, 8=Full=green) | State | YES |

**Actions**: Add OSPF Retransmit Interval to mobile.

#### Tab 5: Performance

Desktop has 4 sub-tabs: Summary, CPU (chart), Memory (chart), Temperature (chart per component).

| # | Desktop Sub-tab | Desktop Content | Mobile v2 | Match? |
|---|----------------|----------------|-----------|--------|
| 1 | Summary | uptime, loadAverage, activeConnections, runningProcesses | Flat perfBars for CPU, Memory, Temp | PARTIAL |
| 2 | CPU | Line chart (Layer8DChart) of `perf.cpuUsagePercent[]` time series | — | MISSING (no charts) |
| 3 | Memory | Line chart of `perf.memoryUsagePercent[]` time series | — | MISSING (no charts) |
| 4 | Temperature | Line charts per physical component with `temperature[]` time series | — | MISSING (no charts) |

Mobile v2 shows flat performance bars (current value only). Desktop shows time-series charts.

**Actions**: Mobile can show current values as perfBars (already done) but lacks time-series charts. Charts require Layer8MChart integration. Add Summary fields (Load Average, Active Connections, Running Processes).

#### Tab 6: Physical Inventory

Desktop has a **Physical Inventory** tab using `ProblerTree` component with `device.physicals` data (expanded tree, max 600px height).

| Desktop | Mobile v2 | Match? |
|---------|-----------|--------|
| Physical Inventory tree (ProblerTree) | — | MISSING entire tab |

**Actions**: Add Physical Inventory tab to mobile using tree display or collapsible list of physical components.

---

## Section 2: GPUs

### 2.1 Table Columns

| # | Desktop Key | Desktop Label | Formatter | Mobile v2 Key | Mobile v2 Label | Match? |
|---|-------------|---------------|-----------|---------------|-----------------|--------|
| 1 | `name` | GPU Name | — | `name` | GPU Name | YES |
| 2 | `model` | Model | — | `model` | Model | YES |
| 3 | `hostName` | Host | — | `hostName` | Host | YES |
| 4 | `status` | Status | — | `status` | Status | YES |
| 5 | `utilization` | GPU % | `value + '%'` | `utilization` | GPU % | YES |
| 6 | `memoryUsed` | Memory | `memoryUsed/memoryTotal GB` | `memoryUsed` | Memory | YES |
| 7 | `temperature` | Temp | `value + '°C'` | `temperature` | Temp | YES |
| 8 | `powerDraw` | Power | `powerDraw/powerLimit W` | `powerDraw` | Power | YES |

**Status**: All columns match.

### 2.2 Detail Modal — Tab-by-Tab

#### Tab 1: Overview

| # | Desktop Label | Desktop Path | Mobile v2 Label | Mobile v2 Path | Match? |
|---|---------------|-------------|-----------------|----------------|--------|
| 1 | GPU Name | `gpu.name` | Name | `gpu.name` | YES |
| 2 | Model | `gpu.model` | Model | `gpu.model` | YES |
| 3 | Vendor | `gpu.vendor` | Vendor | `gpu.vendor` | YES |
| 4 | Architecture | `gpu.architecture` | Architecture | `gpu.architecture` | YES |
| 5 | Status | `gpu.status` (badge) | Status | `gpu.status` | YES |
| 6 | Bus ID | `gpu.busId` | — | — | MISSING |
| 7 | Host Name | `gpu.hostName` | Host | `gpu.hostName` | YES |
| 8 | Serial Number | `gpu.serialNumber` | Serial | `gpu.serialNumber` | YES |
| 9 | Last Seen | `gpu.lastSeen` | — | — | MISSING |
| 10 | Compute Mode | `gpu.computeMode` | Compute Mode | `gpu.computeMode` | YES |
| 11 | ECC Enabled | `gpu.eccEnabled` (Yes/No) | — | — | MISSING (in Overview) |
| 12 | Quick metrics (4 cards) | utilization, memory, temp, power | — | — | MISSING (cards style) |

**Actions**: Add Bus ID, Last Seen, ECC Enabled to mobile Overview.

#### Tab 2: Hardware (Desktop) vs Hardware (Mobile)

| # | Desktop Label | Desktop Path | Mobile v2 Label | Mobile v2 Path | Match? |
|---|---------------|-------------|-----------------|----------------|--------|
| 1 | CUDA Cores | `gpu.cudaCores` (toLocaleString) | CUDA Cores | `gpu.cudaCores` | YES |
| 2 | Tensor Cores | `gpu.tensorCores` | Tensor Cores | `gpu.tensorCores` | YES |
| 3 | RT Cores | `gpu.rtCores` (if > 0) | — | — | MISSING |
| 4 | Clock Speed | `gpu.clockSpeed` MHz (Max: `clockSpeedMax`) | — | — | MISSING |
| 5 | Architecture | `gpu.architecture` | — | — | MISSING (in Hardware) |
| 6 | Total Memory | `gpu.memoryTotal` GB `gpu.vramType` | VRAM | `gpu.memoryTotal` | PARTIAL (no vramType) |
| 7 | Memory Type | `gpu.vramType` | VRAM Type | `gpu.vramType` | YES |
| 8 | PCIe Generation | Gen `gpu.pcieGen` | PCIe | Gen `gpu.pcieGen` | YES |
| 9 | PCIe Lanes | x`gpu.pcieLanes` | — | — | MISSING |
| 10 | Bus ID | `gpu.busId` | — | — | MISSING (in Hardware) |
| 11 | Driver Version | `gpu.driverVersion` | — | — | MISSING (in Hardware, shown in Software) |
| 12 | CUDA Version | `gpu.cudaVersion` | — | — | MISSING (in Hardware, shown in Software) |
| 13 | VBIOS Version | `gpu.vbios` | — | — | MISSING |
| 14 | Serial Number | `gpu.serialNumber` | — | — | MISSING (in Hardware) |
| 15 | Compute Mode | `gpu.computeMode` | — | — | MISSING (in Hardware) |
| 16 | ECC Support | `gpu.eccEnabled` (Enabled/Disabled) | ECC | `gpu.eccEnabled` | YES |
| 17 | Power Limit | `gpu.powerLimit` W | — | — | MISSING (in Hardware) |
| 18 | Fan Speed | `gpu.fanSpeed` % | — | — | MISSING (in Hardware) |

**Actions**: Add RT Cores, Clock Speed/Max, Architecture, PCIe Lanes, Bus ID, VBIOS, Power Limit, Fan Speed to mobile Hardware tab. Add `vramType` label to VRAM display.

#### Tab 3: Performance

| # | Desktop Metric | Desktop Path | Mobile v2 | Match? |
|---|---------------|-------------|-----------|--------|
| 1 | GPU Utilization bar | `gpu.utilization` % | GPU Usage perfBar | YES |
| 2 | Memory Usage bar | `memoryUsed/memoryTotal` GB (%) | Memory perfBar | YES |
| 3 | Temperature bar | `gpu.temperature` °C | Temperature perfBar | YES |
| 4 | Power Draw bar | `powerDraw/powerLimit` W (%) | Power perfBar | YES |
| 5 | Clock Speed bar | `clockSpeed/clockSpeedMax` MHz | Clock perfBar | YES |
| 6 | Fan Speed bar | `gpu.fanSpeed` % | Fan Speed perfBar | YES |

**Status**: Performance tab matches (mobile uses perfBars, desktop uses performance-bar CSS).

#### Tab 4: Processes (Desktop) — MISSING in Mobile

Desktop shows `gpu.processes[]` array:
- Title: "Active Processes ({count})"
- Per process: PID, Name, Memory Usage (memoryUsage/1024 GB with 2 decimals)
- Empty state: "No active processes"

Mobile v2 has a "Software" tab instead showing Driver Version and CUDA Version.

**Actions**:
1. Rename mobile "Software" tab to "Processes"
2. Move Driver/CUDA/VBIOS info to Hardware tab
3. Add processes list: PID, Name, Memory (from `gpu.processes[]`)
4. Show "No active processes" if empty

---

## Section 3: Hosts & VMs

### 3.1 Hypervisor Table Columns

| # | Desktop Key | Label | Formatter | Mobile v2 Key | Label | Match? |
|---|-------------|-------|-----------|---------------|-------|--------|
| 1 | `name` | Host Name | — | `name` | Host Name | YES |
| 2 | `type` | Type | — | `type` | Type | YES |
| 3 | `cluster` | Cluster | — | `cluster` | Cluster | YES |
| 4 | `status` | Status | — | `status` | Status | YES |
| 5 | `cpuUsage` | CPU % | `+%` | `cpuUsage` | CPU % | YES |
| 6 | `memoryUsage` | Memory % | `+%` | `memoryUsage` | Mem % | YES |
| 7 | `vmCount` | VMs | `vmRunning/vmCount` | `vmCount` | VMs | YES |
| 8 | `datacenter` | Datacenter | — | `datacenter` | Datacenter | YES |

### 3.2 VM Table Columns

| # | Desktop Key | Label | Formatter | Mobile v2 Key | Label | Match? |
|---|-------------|-------|-----------|---------------|-------|--------|
| 1 | `name` | VM Name | — | `name` | VM Name | YES |
| 2 | `os` | Operating System | — | `os` | OS | YES |
| 3 | `hypervisor` | Host | — | `hypervisor` | Host | YES |
| 4 | `status` | Status | — | `status` | Status | YES |
| 5 | `cpuUsage` | CPU % | `+%` | `cpuUsage` | CPU % | YES |
| 6 | `memory` | Memory | `memoryUsed/memory GB` | `memory` | Memory | YES |
| 7 | `diskUsage` | Disk % | `+%` | `diskUsage` | Disk % | YES |
| 8 | `ipAddress` | IP Address | — | `ipAddress` | IP Address | YES |

### 3.3 Hypervisor Detail Modal

#### Tab 1: Overview

| # | Desktop Label | Path | Mobile v2 | Match? |
|---|---------------|------|-----------|--------|
| 1 | Host Name | `hypervisor.name` | Hostname | YES |
| 2 | Hostname | `hypervisor.hostname` | — | MISSING (separate from name) |
| 3 | IP Address | `hypervisor.ipAddress` | IP Address | YES |
| 4 | Type | `hypervisor.type` | Type | YES |
| 5 | Version | `hypervisor.version` | Version | YES |
| 6 | Status | `hypervisor.status` (badge) | — | MISSING |
| 7 | Datacenter | `hypervisor.datacenter` | Datacenter | YES |
| 8 | Cluster | `hypervisor.cluster` | Cluster | YES |
| 9 | Uptime | `hypervisor.uptime` days | — | MISSING |
| 10 | Last Seen | `hypervisor.lastSeen` | — | MISSING |
| 11 | VMs | `vmRunning running / vmCount total` | — | MISSING |

**Actions**: Add Hostname, Status badge, Uptime, Last Seen, VM summary to mobile HV Overview.

#### Tab 2: Hardware

| # | Desktop Label | Path | Mobile v2 | Match? |
|---|---------------|------|-----------|--------|
| 1 | Manufacturer | `hypervisor.manufacturer` | Manufacturer | YES |
| 2 | Model | `hypervisor.model` | Model | YES |
| 3 | BIOS Version | `hypervisor.biosVersion` | — | MISSING |
| 4 | CPU Model | `hypervisor.cpuModel` | CPU Model | YES |
| 5 | Total Cores | `hypervisor.cpuCores` | Cores | YES |
| 6 | Total Threads | `hypervisor.cpuThreads` | — | MISSING |
| 7 | Total Memory | `hypervisor.memoryTotal` GB | — | — | shown in Resources |
| 8 | Used Memory | `hypervisor.memoryUsed` GB | — | — | shown in Resources |
| 9 | Total Storage | `hypervisor.storageTotal` TB | — | — | shown in Resources |
| 10 | Used Storage | `hypervisor.storageUsed` TB | — | — | shown in Resources |
| 11 | Datastores | `hypervisor.datastores` | — | MISSING |

**Actions**: Add BIOS Version, CPU Threads, Datastores to mobile Hardware/Resources.

#### Tab 3: Resources (Desktop) vs Resources (Mobile — partial)

| # | Desktop Label | Path | Mobile v2 | Match? |
|---|---------------|------|-----------|--------|
| 1 | CPU Usage bar | `cpuUsage% (cpuCores cores)` | CPU Usage perfBar | YES |
| 2 | Memory Usage bar | `memoryUsed/memoryTotal GB (memoryUsage%)` | Memory perfBar | PARTIAL (no absolute values) |
| 3 | Storage Usage bar | `storageUsed/storageTotal TB (%)` | Storage perfBar | YES |
| 4 | Network Interfaces | `hypervisor.networkInterfaces` | — | MISSING |
| 5 | Virtual Switches | `hypervisor.vSwitches` | — | MISSING |

**Actions**: Add absolute memory values, Network Interfaces, Virtual Switches.

#### Tab 4: Virtual Machines (Desktop) — MISSING in Mobile

| # | Desktop Label | Path | Mobile v2 | Match? |
|---|---------------|------|-----------|--------|
| 1 | Total VMs | `hypervisor.vmCount` | Shown in "VMs & Network" | PARTIAL |
| 2 | Running | `hypervisor.vmRunning` (green) | Running VMs | YES |
| 3 | Stopped | `hypervisor.vmStopped` (gray) | Stopped VMs | YES |

Mobile v2 has a combined "VMs & Network" tab. Desktop has a dedicated "Virtual Machines" tab.

**Actions**: Split mobile "VMs & Network" into separate "Resources" tab (with perf bars + network info) and "Virtual Machines" tab to match desktop 4-tab structure.

### 3.4 VM Detail Modal

#### Tab 1: Overview

| # | Desktop Label | Path | Mobile v2 | Match? |
|---|---------------|------|-----------|--------|
| 1 | VM Name | `vm.name` | Hostname | YES |
| 2 | Hostname | `vm.hostname` | — | MISSING |
| 3 | Operating System | `vm.os` | OS | YES |
| 4 | Status | `vm.status` (badge) | Status | YES |
| 5 | Purpose | `vm.purpose` | Purpose | YES |
| 6 | Owner | `vm.owner` | — | MISSING |
| 7 | Hypervisor | `vm.hypervisor` | Hypervisor | YES |
| 8 | Uptime | `vm.uptime` days | — | MISSING |
| 9 | Created Date | `vm.createdDate` | — | MISSING |
| 10 | Last Seen | `vm.lastSeen` | — | MISSING |
| 11 | Tags | `vm.tags.join(', ')` | — | MISSING |
| 12 | Notes | `vm.notes` (full width) | — | MISSING |

**Actions**: Add Hostname, Owner, Uptime, Created Date, Last Seen, Tags, Notes.

#### Tab 2: Resources

| # | Desktop Label | Path | Mobile v2 | Match? |
|---|---------------|------|-----------|--------|
| 1 | vCPU Cores | `vm.cpuCores` | CPU Cores | YES |
| 2 | Memory | `vm.memory` GB | Total Memory | YES |
| 3 | Disk Space | `vm.diskTotal` GB | Total Disk | YES |
| 4 | CPU Usage bar | `vm.cpuUsage` % | CPU % perfBar | YES |
| 5 | Memory Usage bar | `memoryUsed/memory GB (memoryUsage%)` | Memory perfBar | PARTIAL |
| 6 | Disk Usage bar | `diskUsed/diskTotal GB (diskUsage%)` | Disk perfBar | PARTIAL |
| 7 | Network Throughput | `vm.networkThroughput` Mbps | — | MISSING |

**Actions**: Add absolute values to memory/disk bars, add Network Throughput.

#### Tab 3: Network

| # | Desktop Label | Path | Mobile v2 | Match? |
|---|---------------|------|-----------|--------|
| 1 | IP Address | `vm.ipAddress` | IP Address | YES |
| 2 | MAC Address | `vm.macAddress` | MAC | YES |
| 3 | VLAN | `vm.vlan` | VLAN | YES |
| 4 | Network Throughput | `vm.networkThroughput` Mbps | — | MISSING |

**Actions**: Add Network Throughput.

#### Tab 4: Backup & Snapshots (Desktop) — MISSING in Mobile

| # | Desktop Label | Path | Mobile v2 | Match? |
|---|---------------|------|-----------|--------|
| 1 | Backup Status | `vm.backupStatus` | — | MISSING |
| 2 | Last Backup | `vm.lastBackup` | — | MISSING |
| 3 | Snapshot Count | `vm.snapshotCount` | — | MISSING |

Mobile v2 has "Operations" tab with Uptime, Snapshots, Backup Status, Last Backup, Owner, Created Date — this partially covers it.

**Actions**: Rename mobile "Operations" tab to "Backup & Snapshots" to match desktop. Move Uptime/Owner/Created to Overview.

---

## Section 4: Kubernetes

### 4.1 Table Columns

Desktop defines 8 resource type tables. Mobile v2 defines 6 (missing Namespace, NetworkPolicy).

#### K8sNode Columns

| # | Desktop Key | Label | Mobile v2 Key | Label | Match? |
|---|-------------|-------|---------------|-------|--------|
| 1 | `name` | NAME | `name` | NAME | YES |
| 2 | `roles` | ROLES | `roles` | ROLES | YES |
| 3 | — | — | `status` | STATUS | Desktop renders status via row click badge, not column |
| 4 | `age` | AGE | `age` | AGE | YES |
| 5 | `version` | VERSION | `version` | VERSION | YES |
| 6 | `internalIp` | INTERNAL-IP | `internalIp` | INTERNAL-IP | YES |
| 7 | `externalIp` | EXTERNAL-IP | — | — | MISSING |
| 8 | `osImage` | OS-IMAGE | — | — | MISSING |
| 9 | `kernelVersion` | KERNEL-VERSION | — | — | MISSING |
| 10 | `containerRuntime` | CONTAINER-RUNTIME | — | — | MISSING |

**Actions**: Add externalIp, osImage, kernelVersion, containerRuntime columns.

#### K8sPod Columns

| # | Desktop Key | Label | Mobile v2 Key | Label | Match? |
|---|-------------|-------|---------------|-------|--------|
| 1 | `namespace` | NAMESPACE | `namespace` | NAMESPACE | YES |
| 2 | `name` | NAME | `name` | NAME | YES |
| 3 | `ready` | READY (custom renderer) | `ready` | READY (custom) | YES |
| 4 | `status` | STATUS (custom renderer) | `status` | STATUS (custom) | YES |
| 5 | `restarts` | RESTARTS (custom renderer) | `restarts` | RESTARTS (custom) | YES |
| 6 | `age` | AGE | `age` | AGE | YES |
| 7 | `ip` | IP | — | — | MISSING |
| 8 | `node` | NODE | `node` | NODE | YES |
| 9 | `nominatedNode` | NOMINATED NODE | — | — | MISSING |
| 10 | `readinessGates` | READINESS GATES | — | — | MISSING |

**Actions**: Add ip, nominatedNode, readinessGates columns.

#### K8sDeployment Columns

| # | Desktop Key | Label | Mobile v2 Key | Match? |
|---|-------------|-------|---------------|--------|
| 1 | `namespace` | NAMESPACE | `namespace` | YES |
| 2 | `name` | NAME | `name` | YES |
| 3 | `ready` | READY | `ready` | YES |
| 4 | `upToDate` | UP-TO-DATE | `upToDate` | YES |
| 5 | `available` | AVAILABLE | `available` | YES |
| 6 | `age` | AGE | `age` | YES |
| 7 | `containers` | CONTAINERS | — | MISSING |
| 8 | `images` | IMAGES | — | MISSING |
| 9 | `selector` | SELECTOR | — | MISSING |

**Actions**: Add containers, images, selector columns.

#### K8sStatefulSet Columns

| # | Desktop Key | Label | Mobile v2 Key | Match? |
|---|-------------|-------|---------------|--------|
| 1 | `namespace` | NAMESPACE | `namespace` | YES |
| 2 | `name` | NAME | `name` | YES |
| 3 | `ready` | READY | `ready` | YES |
| 4 | `age` | AGE | `age` | YES |
| 5 | `containers` | CONTAINERS | — | MISSING |
| 6 | `images` | IMAGES | — | MISSING |

**Actions**: Add containers, images columns.

#### K8sDaemonSet Columns

| # | Desktop Key | Label | Mobile v2 Key | Match? |
|---|-------------|-------|---------------|--------|
| 1 | `namespace` | NAMESPACE | `namespace` | YES |
| 2 | `name` | NAME | `name` | YES |
| 3 | `desired` | DESIRED | `desired` | YES |
| 4 | `current` | CURRENT | `current` | YES |
| 5 | `ready` | READY | `ready` | YES |
| 6 | `upToDate` | UP-TO-DATE | — | MISSING |
| 7 | `available` | AVAILABLE | — | MISSING |
| 8 | `nodeSelector` | NODE SELECTOR | — | MISSING |
| 9 | `age` | AGE | `age` | YES |
| 10 | `containers` | CONTAINERS | — | MISSING |
| 11 | `images` | IMAGES | — | MISSING |
| 12 | `selector` | SELECTOR | — | MISSING |

**Actions**: Add upToDate, available, nodeSelector, containers, images, selector columns.

#### K8sService Columns

| # | Desktop Key | Label | Mobile v2 Key | Match? |
|---|-------------|-------|---------------|--------|
| 1 | `namespace` | NAMESPACE | `namespace` | YES |
| 2 | `name` | NAME | `name` | YES |
| 3 | `type` | TYPE | `type` | YES |
| 4 | `clusterIp` | CLUSTER-IP | `clusterIp` | YES |
| 5 | `externalIp` | EXTERNAL-IP | — | MISSING |
| 6 | `ports` | PORT(S) | `ports` | YES |
| 7 | `age` | AGE | `age` | YES |
| 8 | `selector` | SELECTOR | — | MISSING |

**Actions**: Add externalIp, selector columns.

#### K8sNamespace — MISSING entirely in mobile v2 columns

Desktop columns: `name`, `status`, `age`

**Actions**: Create K8sNamespace column definition.

#### K8sNetworkPolicy — MISSING entirely in mobile v2 columns

Desktop columns: `namespace`, `name`, `podSelector`, `age`

**Actions**: Create K8sNetworkPolicy column definition.

### 4.2 K8s Detail Modals — ALL MISSING in mobile v2

Desktop has 8 detail modal types. Mobile v2 has NONE.

| Resource | Desktop Tabs | Desktop Detail Source |
|----------|-------------|---------------------|
| Node | 8 tabs: Overview, Labels, Annotations, Addresses, Resources, Conditions, System Info, Images | `/0/exec` POST job `nodedetails` |
| Pod | 7 tabs: Overview, Metadata, Spec, Containers, Volumes, Conditions, Status | `/0/exec` POST job `poddetails` |
| Deployment | 6 tabs: Overview, Metadata, Spec, Template, Conditions, Status | `/0/exec` POST job `deploymentdetails` |
| StatefulSet | 3 tabs: Overview, Template, Status | Inline data from cluster |
| DaemonSet | 3 tabs: Overview, Template, Status | Inline data from cluster |
| Service | 3 tabs: Overview, Ports, Status | Inline data from cluster |
| Namespace | 1 section (no tabs): name, cluster, status | Inline data |
| NetworkPolicy | 1 section (no tabs): name, namespace, pod selector, rules counts | Inline data |

**Actions**: Create `m/v2/js/details/k8s-detail.js` with detail functions for all 8 resource types. Each must match the desktop tab structure and field set exactly. For Node/Pod/Deployment, must POST to `/0/exec` with the correct job name and argument format.

---

## Section 5: System

### 5.1 Health Service

**Desktop behavior (l8health.js):**
- READ-ONLY Layer8DTable (no CRUD)
- Endpoint: `/0/Health`, model: `L8Health`
- Server-side sort/filter
- Data transform: flattens `alias`, `stats.*`, `startTime` into display values

**Table columns:**

| # | Desktop Key | Label | Filter/Sort Key | Mobile v2 Config |
|---|-------------|-------|----------------|-----------------|
| 1 | `service` | Service | `alias` | `readOnly: true` in nav config |
| 2 | `rx` | RX | `stats.rxMsgCount` | |
| 3 | `rxData` | RX Data | `stats.rxDataCont` | |
| 4 | `tx` | TX | `stats.txMsgCount` | |
| 5 | `txData` | TX Data | `stats.txDataCount` | |
| 6 | `memory` | Memory | `stats.memoryUsage` | |
| 7 | `cpuPercent` | CPU % | `stats.cpuUsage` | |
| 8 | `upTime` | Up Time | `startTime` | |
| 9 | `lastPulse` | Last Pulse | `stats.lastMsgTime` | |

**Actions**: Create `m/v2/modules/system/health-columns.js` with these 9 columns and corresponding data transform.

**Health Detail Modal (4 tabs):**

| Tab | Fields |
|-----|--------|
| Overview | Service Name, Alias, Start Time (ISO), Up Time (HH:MM:SS), Memory Usage, CPU Usage, Last Pulse |
| Network | RX Messages, RX Data (formatted), RX Data (bytes), TX Messages, TX Data (formatted), TX Data (bytes), Last Message (ISO), Time Since Last |
| Resources | Memory Formatted, Memory Raw bytes, CPU Percentage, CPU Raw, Data Object |
| Services | List of registered services with areas (serviceToAreas map) |

**Pprof Button:**
- Button label: "Memory & CPU"
- POST to health endpoint with `{ aUuid, pprofCollect: true }`
- 5-second countdown modal
- Downloads `{alias}-memory.dat` and `{alias}-cpu.dat` (base64 decoded blobs)

**Actions**: Create health detail popup and pprof button for mobile. This is a custom detail — cannot use standard Layer8MForms.

### 5.2 Security (Users, Roles, Credentials)

All 3 are EDITABLE with full CRUD. Desktop uses custom CRUD implementations (not standard Layer8D forms).

**Users columns:** userId, fullName, Assigned Roles (custom render: comma-separated tags)
**Users form:** userId (required), fullName (required), password (new only), roles checkboxes (from /74/roles)

**Roles columns:** roleId, roleName, Rules Count (custom render)
**Roles form:** roleId, roleName, nested rules table (each rule: ruleId, elemType from /registry, allowed, actions checkboxes, attributes key/value pairs)

**Credentials columns:** id, name, Items Count (custom render)
**Credentials form:** id, name, nested credential items table (each item: key, aside, yside, zside — all masked with show/hide toggle)

**Actions**: These use heavily custom CRUD UIs (nested stacked modals, dynamic checkboxes, registry fetches). Creating mobile equivalents requires custom Layer8MPopup implementations, not just Layer8MForms. Create `m/v2/modules/system/security-columns.js` and `m/v2/js/details/security-crud.js`.

### 5.3 Modules

Desktop uses `Layer8DToggleTree` + `L8SysModulesMap` dependency graph.

**Actions**: The SYS module JS files are already included in mobile v2 `app.html` (l8sys-modules.js, l8sys-dependency-graph.js, etc.). The nav config has `customInit: 'L8SysModules'`. Need to verify L8SysModules works in mobile context.

### 5.4 Logs

Desktop uses custom tree + paginated file viewer. Endpoint: `/87/logs` with L8Query `mapreduce`.

**Actions**: The l8logs.js is NOT included in mobile v2 app.html. Need to add it and verify it works in mobile popup context.

### 5.5 Data Import

Desktop uses 3-tab system (Templates, Transfer, Execute). Files are included in mobile v2 app.html.

**Actions**: Verify data import works in mobile context via `customInit: 'L8DataImport'`.

---

## Section 6: Alarms & Events (ALM Module)

### 6.1 Mobile v2 Status

Nav config is done (10 services, correct endpoints, correct readOnly flags). But NO mobile enums, columns, or forms exist.

**Actions**: Create full ALM mobile module registry:

1. `m/v2/modules/alm/alm-enums.js` — 14 enums (see ALM extraction for complete values)
2. `m/v2/modules/alm/alm-columns.js` — 10 column sets matching desktop exactly
3. `m/v2/modules/alm/alm-forms.js` — 10 form definitions matching desktop exactly (including inline tables for notes, conditions, targets, steps)
4. `m/v2/modules/alm/alm-reference-registry.js` — 8 reference entries
5. `m/v2/modules/alm-index.js` — Registry creation

Each column/form must use the exact field keys from the desktop ALM files (documented in ALM extraction above).

---

## Section 7: Inventory (Targets)

### 7.1 Mobile v2 Status

Nav config points to `/91/Targets` with model `L8PTarget`. But mobile has NO targets-specific columns, forms, or CRUD logic.

Desktop targets is an iframe-based section with 740 lines of CRUD logic including:
- Inventory type filter dropdown
- Nested hosts/protocol configuration (3 levels of stacked modals)
- Bulk state change
- Protocol default ports
- Credentials lookup from `/75/Creds`
- Custom detail modal (2 tabs: Overview, Hosts & Protocols)

**Desktop table columns:** targetId, addresses (extracted from hosts configs), linksId, hosts (count badge), state (enum badge)

**Desktop enums:**
- PROTOCOLS: 0-8 (Invalid, SSH, SNMPV2, SNMPV3, RESTCONF, NETCONF, GRPC, Kubectl, GraphQL)
- INVENTORY_TYPES: 0-7 (Invalid, Network Device, GPUS, Hosts, VM, K8s Cluster, Storage, Power)
- TARGET_STATES: 0-4 (Invalid, Down, Up, Maintenance, Offline)

**Actions**: Create:
1. `m/v2/modules/targets/targets-enums.js`
2. `m/v2/modules/targets/targets-columns.js`
3. `m/v2/js/details/targets-crud.js` — Full CRUD with nested host/protocol management
4. `m/v2/modules/targets-index.js` — Registry

---

## Section 8: Dashboard

Dashboard is section-based (`section: 'dashboard'`). The `onSectionLoad` callback is configured but not implemented.

Desktop dashboard (iframe-based) shows:
- Hero header with animated SVG
- Metric cards (Network Devices count, K8s counts)
- Top Critical Alarms table

**Actions**: Implement `onSectionLoad` callback in app-core.js. Create mobile dashboard section with metric cards and alarms table.

---

## Section 9: Topologies

Desktop is iframe-based WebGL visualization. Not feasible on mobile.

**Actions**: Show simplified list view or "View on Desktop" message. Low priority.

---

## Traceability Matrix

Every gap and action item from the analysis above, mapped to the phase that addresses it. Any row without a phase is a planning error.

| # | Section | Gap / Action Item | Phase |
|---|---------|-------------------|-------|
| 1 | 1.2 Enums | Add `6: 'Server'` to mobile DEVICE_TYPE enum | 1 |
| 2 | 1.3 Transform | Add `transformDeviceData()` to mobile MobileNetwork module | 1 |
| 3 | 1.3 Transform | Wire transform into Layer8MModuleRegistry (`getTransformData`) | 1 |
| 4 | 1.4 Overview | Add System Name, Last Seen, Coordinates, Interfaces to mobile Overview | 1 |
| 5 | 1.4 Equipment | Add Interface Count, Device Type, Management IP, Physical Alias, Vendor Type OID, Identification URIs | 1 |
| 6 | 1.4 Equipment | Add hex decode for Manufacturing Date | 1 |
| 7 | 1.4 Interfaces | Add Admin Status, Type (INTERFACE_TYPE_NAMES), IP Address, MAC Address, RX Pkts, TX Pkts | 1 |
| 8 | 1.4 Routing | Add OSPF Retransmit Interval | 1 |
| 9 | 1.4 Performance | Add Summary fields (Load Average, Active Connections, Running Processes) | 10 |
| 10 | 1.4 Performance | Add CPU, Memory, Temperature time-series charts | 10 |
| 11 | 1.4 Physical | Add Physical Inventory tab (ProblerTree) | 10 |
| 12 | 2.2 GPU Overview | Add Bus ID, Last Seen, ECC Enabled | 1 |
| 13 | 2.2 GPU Hardware | Add RT Cores, Clock Speed/Max, Architecture, PCIe Lanes, Bus ID, VBIOS, Power Limit, Fan Speed, vramType label | 1 |
| 14 | 2.2 GPU Processes | Rename Software tab to Processes, move Driver/CUDA/VBIOS to Hardware, add processes list | 1 |
| 15 | 3.3 HV Overview | Add Hostname, Status badge, Uptime, Last Seen, VM summary | 1 |
| 16 | 3.3 HV Hardware | Add BIOS Version, CPU Threads, Datastores | 1 |
| 17 | 3.3 HV Resources | Add absolute memory values, Network Interfaces, Virtual Switches | 1 |
| 18 | 3.3 HV VMs tab | Split "VMs & Network" into separate Resources + Virtual Machines tabs | 1 |
| 19 | 3.4 VM Overview | Add Hostname, Owner, Uptime, Created Date, Last Seen, Tags, Notes | 1 |
| 20 | 3.4 VM Resources | Add absolute memory/disk values, Network Throughput | 1 |
| 21 | 3.4 VM Network | Add Network Throughput | 1 |
| 22 | 3.4 VM Backup | Rename Operations to Backup & Snapshots, move Uptime/Owner/Created to Overview | 1 |
| 23 | 4.1 K8sNode | Add externalIp, osImage, kernelVersion, containerRuntime columns | 2 |
| 24 | 4.1 K8sPod | Add ip, nominatedNode, readinessGates columns | 2 |
| 25 | 4.1 K8sDeployment | Add containers, images, selector columns | 2 |
| 26 | 4.1 K8sStatefulSet | Add containers, images columns | 2 |
| 27 | 4.1 K8sDaemonSet | Add upToDate, available, nodeSelector, containers, images, selector columns | 2 |
| 28 | 4.1 K8sService | Add externalIp, selector columns | 2 |
| 29 | 4.1 K8sNamespace | Create K8sNamespace column definition | 2 |
| 30 | 4.1 K8sNetworkPolicy | Create K8sNetworkPolicy column definition | 2 |
| 31 | 4.2 K8s Details | Create detail modals for all 8 K8s resource types | 3 |
| 32 | 6.1 ALM | Create alm-enums.js (14 enums) | 4 |
| 33 | 6.1 ALM | Create alm-columns.js (10 column sets) | 4 |
| 34 | 6.1 ALM | Create alm-forms.js (10 form definitions) | 4 |
| 35 | 6.1 ALM | Create alm-reference-registry.js (8 entries) | 4 |
| 36 | 6.1 ALM | Create alm-index.js (registry) | 4 |
| 37 | 5.1 Health | Create health-columns.js (9 columns + data transform) | 5 |
| 38 | 5.1 Health | Create health detail popup (4 tabs) | 5 |
| 39 | 5.1 Health | Create pprof button (5s countdown, binary downloads) | 5 |
| 40 | 5.2 Security | Create security-columns.js (Users, Roles, Credentials columns + forms) | 6 |
| 41 | 5.2 Security | Create security-crud.js (custom CRUD with nested modals) | 6 |
| 42 | 7.1 Targets | Create targets-enums.js | 7 |
| 43 | 7.1 Targets | Create targets-columns.js | 7 |
| 44 | 7.1 Targets | Create targets-crud.js (nested host/protocol management) | 7 |
| 45 | 7.1 Targets | Create targets-index.js (registry) | 7 |
| 46 | 8 Dashboard | Implement onSectionLoad callback, create mobile dashboard section | 8 |
| 47 | 5.3 Modules | Verify L8SysModules works in mobile context, fix container IDs | 9 |
| 48 | 5.4 Logs | Add l8logs.js + l8logs.css to mobile app.html, fix customInit | 9 |
| 49 | 5.5 Data Import | Verify L8DataImport works in mobile context | 9 |
| 50 | 9 Topologies | Show "View on Desktop" message | Deferred — not feasible on mobile (WebGL) |

---

## Implementation Priority

| Phase | Scope | Files to Create/Modify |
|-------|-------|----------------------|
| **1** | Fix existing detail modals (Network, GPU, Host/VM) — add all missing fields. Add NetworkDevice data transform to MobileNetwork + wire `getTransformData` into registry. Fix DEVICE_TYPE enum. | Modify 4 detail JS files, network-enums.js, network-columns.js, layer8m-module-registry.js |
| **2** | Fix existing K8s columns — add all missing columns per resource type, add Namespace + NetworkPolicy | Modify k8s-columns.js, k8s-enums.js |
| **3** | Create K8s detail modals (8 resource types) | New k8s-detail.js, k8s-detail-simple.js |
| **4** | Create ALM module registry (enums, columns, forms, reference registry) | 5 new files |
| **5** | Create Health columns + detail modal + pprof button | 2-3 new files |
| **6** | Create Security CRUD for mobile | 2-3 new files |
| **7** | Create Targets CRUD for mobile | 3-4 new files |
| **8** | Dashboard section loader | Modify app-core.js |
| **9** | Verify SYS custom modules work on mobile (Modules, Logs, Data Import) — add missing includes, fix customInit strings, fix container IDs | Modify app.html, nav-config-system.js |
| **10** | Network device Physical Inventory tab + Performance charts | Modify network-device-detail.js, detail-helpers.js, app.html |
| **11** | End-to-end verification | No code changes — testing only |

---

## Phase 11: End-to-End Verification

For every section affected by this plan, navigate to it on mobile v2 and verify:

1. **Table data loads** (not blank cards/rows)
2. **Row click opens detail/modal** (not silent)
3. **Detail content is populated** (fields not empty)
4. **CRUD operations work** where applicable (create, edit, delete)

### Sections to verify:

- [ ] **Monitoring > Network Devices** — table loads with transformed data, row click opens 6-tab detail (Overview, Equipment, Interfaces, Routing, Physical, Performance), charts render
- [ ] **Monitoring > GPUs** — table loads, row click opens 4-tab detail (Overview, Hardware, Processes, Performance)
- [ ] **Monitoring > Hypervisors** — table loads, row click opens 4-tab detail (Overview, Hardware, Resources, Virtual Machines)
- [ ] **Monitoring > Virtual Machines** — table loads, row click opens 4-tab detail (Overview, Resources, Network, Backup & Snapshots)
- [ ] **Monitoring > Pods** — table loads, row click opens 7-tab detail via `/0/exec`
- [ ] **Monitoring > Nodes** — table loads, row click opens 8-tab detail via `/0/exec`
- [ ] **Monitoring > Deployments** — table loads, row click opens 6-tab detail via `/0/exec`
- [ ] **Monitoring > StatefulSets** — table loads, row click opens 3-tab detail
- [ ] **Monitoring > DaemonSets** — table loads, row click opens 3-tab detail
- [ ] **Monitoring > Services** — table loads, row click opens 3-tab detail
- [ ] **Monitoring > Namespaces** — table loads, row click opens detail
- [ ] **Monitoring > Network Policies** — table loads, row click opens detail
- [ ] **Alarms & Events > Alarms** — table loads, row click opens detail, CRUD works
- [ ] **Alarms & Events > Alarm Definitions** — table loads, CRUD works
- [ ] **Alarms & Events > Events** — table loads (read-only)
- [ ] **Alarms & Events > Correlation Rules** — table loads, CRUD works
- [ ] **Alarms & Events > Notification Policies** — table loads, CRUD works
- [ ] **Alarms & Events > Escalation Policies** — table loads, CRUD works
- [ ] **Alarms & Events > Maintenance Windows** — table loads, CRUD works
- [ ] **Infrastructure > Targets** — table loads, CRUD works (create/edit/delete target)
- [ ] **System > Health** — table loads with transformed data, row click opens 4-tab detail, pprof download works
- [ ] **System > Security > Users** — table loads, CRUD works
- [ ] **System > Security > Roles** — table loads, CRUD works
- [ ] **System > Security > Credentials** — table loads, CRUD works
- [ ] **System > Modules** — toggle tree renders, enable/disable works
- [ ] **System > Logs** — file tree renders, log file opens in popup
- [ ] **System > Data Import** — 3-tab interface renders (Templates, Transfer, Import)
- [ ] **Dashboard** — section loads with metric cards
