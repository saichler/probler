# Mobile GPU Parity Plan

## Problem Statement

The mobile GPU implementation is fundamentally incompatible with the actual data model and missing most desktop features:

1. **Data model mismatch**: Mobile columns/detail read flat fields (`gpu.name`, `gpu.utilization`, `gpu.memoryUsed`) that don't exist on the protobuf. The actual `GpuDevice` has nested `deviceInfo` (GpuDeviceInfo) and a `gpus` map (map[string]*Gpu) where each Gpu has time-series arrays, not scalars.
2. **No transformData**: Desktop has `transformGpuDeviceData()` that flattens the nested structure for the table. Mobile has nothing — raw nested objects hit the columns.
3. **Wrong detail model**: Mobile detail popup (`showGpuDetail`) treats the item as a single flat GPU. Desktop has a two-level model: device popup (Overview, GPUs list, Software) → click GPU row → stacked GPU detail popup (Info, Utilization, Thermal, Memory, Clocks, Processes).
4. **No charts**: Desktop renders 11 time-series charts (GPU util, memory util, encoder, decoder, temp, memory temp, power, fan, VRAM, SM clock, mem clock). Mobile shows only static performance bars.
5. **Missing health diagnostics**: PCIe, Memory, Thermal, Power, NVLink, InfoROM health statuses not shown.
6. **Missing fields**: ECC errors, thermal thresholds, compute capability, NUMA node, persistence mode.

## Data Flow Trace (Desktop)

### Table Flow
1. Server returns `GpuDevice` with nested structure: `{id, deviceInfo: {hostname, ipAddress, ...}, gpus: {key: Gpu}, system, health, topology}`
2. `transformGpuDeviceData(device)` flattens to: `{id, ipAddress, hostname, gpuModel, gpuCount, driverVersion, cudaVersion, dcgmVersion, status, gpus: [array], ...}`
3. `ProblerGpus.columns.GpuDevice` renders the flat fields
4. `onRowClick` passes the transformed (flat + gpus array) device to `showGPUDetailModal`

### Detail Flow (Level 1 — Device)
1. `showGPUDetailModal(device)` — 3 tabs: Overview, GPUs (count), Software
2. Overview: Server info (hostname, IP, vendor, serial, location, status) + GPU summary (count, model, CPU, uptime)
3. GPUs tab: Table with columns: #, Device Name, UUID, PCI Bus, VRAM Total, VRAM Used, GPU Util, Temp, Power, Health
4. Each row is clickable → `showGpuDetailPopup(index)`
5. Software tab: Driver, CUDA, DCGM versions + OS/kernel

### Detail Flow (Level 2 — Individual GPU, stacked popup)
1. `showGpuDetailPopup(gpuIndex)` reads from `window._gpuDetailList[gpuIndex]`
2. 6 tabs: Info, Utilization, Thermal & Power, Memory, Clocks, Processes
3. Info: Hardware details + Health statuses (6 component health indicators) + Thresholds + ECC errors
4. Utilization: 4 time-series charts (GPU %, Memory %, Encoder %, Decoder %)
5. Thermal: 4 time-series charts (Temp, Mem Temp, Power, Fan)
6. Memory: 1 time-series chart (VRAM Used)
7. Clocks: 2 time-series charts (SM Clock, Mem Clock)
8. Processes: Table (PID, Name, Type, Memory Used)
9. Charts are lazy-rendered on tab activation (deferred init pattern)

## Mobile Adaptation Design

### Key Decisions
- Mobile does NOT support stacked popups. Instead of device → GPU drill-down, we use a **single popup with more tabs** covering both device-level and per-GPU info.
- For devices with multiple GPUs, the GPU tabs show a **GPU selector** (horizontal pill bar) at the top of each GPU-specific tab.
- Charts use the existing `Layer8DChart` line chart (already loaded in mobile `app.html`).
- The `renderTimeSeriesChart` function from `network-device-modal-perf.js` is already available on mobile via `network-device-detail.js`. We reuse the same pattern.

### Mobile Popup Tab Structure
```
Tab 1: Overview     — Device info (hostname, IP, vendor, serial, location, status, GPU count, model)
Tab 2: GPUs         — Per-GPU info card list (name, UUID, PCI bus, VRAM, health indicators)
Tab 3: Performance  — GPU selector + time-series charts (GPU util, mem util, temp, power)
Tab 4: Software     — Driver, CUDA, DCGM, OS, kernel versions
Tab 5: Processes    — GPU selector + process table
```

This gives full feature coverage without stacked modals. The GPU selector on Performance/Processes tabs lets users switch between GPUs on multi-GPU devices.

## Phase Breakdown

### Phase 1: Fix Mobile Columns & Add transformData (~3 files)

**Files:**
- `m/modules/monitoring/gpus-columns.js` — rewrite to match actual protobuf fields (post-transform)
- `m/modules/monitoring/gpus-enums.js` — add `mapDeviceStatus`, `mapHealthStatus`, align with desktop enums
- `m/nav-configs/probler-nav-config-monitoring.js` — add `transformData` to GPU service config

**Column changes:**
Desktop columns (post-transform): ipAddress, hostname, gpuModel, gpuCount, driverVersion, cudaVersion, dcgmVersion, status

Mobile columns should match:
```javascript
MobileGpus.columns = {
    GpuDevice: [
        ...col.col('hostname', 'Hostname'),
        ...col.col('ipAddress', 'IP Address'),
        ...col.col('gpuModel', 'GPU Model'),
        ...col.number('gpuCount', 'GPUs'),
        ...col.col('driverVersion', 'Driver'),
        ...col.col('cudaVersion', 'CUDA'),
        ...col.status('status', 'Status', enums.DEVICE_STATUS_VALUES, render.deviceStatus)
    ]
};
```

**transformData function** (in nav config or separate file):
```javascript
transformData: function(device) {
    var info = device.deviceInfo || {};
    var gpusMap = device.gpus || {};
    var gpusList = Object.values(gpusMap);
    var firstGpu = gpusList[0] || {};
    return {
        id: device.id,
        ipAddress: info.ipAddress || device.id,
        hostname: info.hostname || device.id,
        gpuModel: stripQuotes(firstGpu.deviceName) || info.model || '',
        gpuCount: info.gpuCount || gpusList.length || 0,
        driverVersion: info.driverVersion || '',
        cudaVersion: info.cudaVersion || '',
        dcgmVersion: info.dcgmVersion || '',
        status: mapDeviceStatus(info.deviceStatus),
        lastSeen: info.lastSeen || '',
        uptime: info.uptime || '',
        vendor: info.vendor || '',
        serialNumber: info.serialNumber || '',
        location: info.location || '',
        osVersion: info.osVersion || '',
        kernelVersion: info.kernelVersion || '',
        gpus: gpusList,
        system: device.system || {},
        health: device.health || {}
    };
}
```

**Enum changes:**
- Add `mapDeviceStatus(status)` matching desktop (7 states: online/offline/warning/critical/maintenance/partial/unknown)
- Add `mapHealthStatus(status)` matching desktop (4 states: healthy/warning/critical/unknown)
- Add `DEVICE_STATUS` and `DEVICE_STATUS_CLASSES` matching desktop

### Phase 2: Rewrite GPU Detail Popup (~1 file)

**File:** `m/js/details/gpu-detail.js` — complete rewrite

The new `showGpuDetail(device)` receives the **transformed device** (same as desktop's `showGPUDetailModal`), not a flat GPU object.

**Tab 1: Overview**
- Server section: Hostname, IP, Vendor, Serial Number, Location, Status
- GPU Summary section: GPU Count, GPU Model, CPU Sockets (if available), CPU Cores (if available), Uptime, Last Seen

**Tab 2: GPUs**
- For each GPU in `device.gpus[]`: card with Device Name, UUID, PCI Bus ID, VRAM Total, VRAM Used (latest), GPU Util (latest), Temp (latest), Power (latest), Health status
- Health sub-section per GPU: PCIe, Memory, Thermal, Power, NVLink, InfoROM statuses
- Thresholds: Shutdown temp, Slowdown temp, Power limit
- ECC: Corrected count, Uncorrected count

**Tab 3: Performance** (charts rendered on tab activation)
- GPU selector pill bar (if multiple GPUs)
- 4 time-series charts: GPU Utilization %, Memory Utilization %, Temperature, Power Draw
- Uses `renderTimeSeriesChart()` (already available from network-device-detail.js)
- Charts lazy-rendered via `onTabChange` callback

**Tab 4: Software**
- Driver Version, CUDA Version, DCGM Version
- OS Version, Kernel Version

**Tab 5: Processes**
- GPU selector pill bar (if multiple GPUs)
- Process list: PID, Name, Type, Memory Used

**Helper functions needed:**
- `gpuStripQuotes(str)` — strip embedded protobuf quotes
- `gpuLatestValue(timeSeries)` — get latest value from L8TimeSeriesPoint array
- `formatMiB(mib)` — format MiB to human-readable
- `gpuSelectorHtml(gpus, containerId)` — render horizontal GPU selector pills
- Chart rendering via existing `renderTimeSeriesChart`

### Phase 3: Verify renderTimeSeriesChart Availability

The `renderTimeSeriesChart` function is defined in `m/js/details/network-device-detail.js` (already loaded). Verify it's available globally when `gpu-detail.js` runs. If it's inside an IIFE scope, extract it to `detail-helpers.js` or make it globally accessible.

**Check:** `network-device-detail.js` defines `renderTimeSeriesChart` — is it inside the IIFE or global?

If inside IIFE: move `renderTimeSeriesChart` and `formatChartTimestamp` to `detail-helpers.js` so all detail files can use them.

### Phase 4: End-to-End Verification

1. Navigate to GPU section on mobile
2. Verify table loads with correct columns (hostname, IP, model, count, driver, CUDA, status)
3. Verify status badges render correctly (not raw enum numbers)
4. Tap a GPU device row → verify detail popup opens
5. Check Overview tab: all device-level fields populated
6. Check GPUs tab: per-GPU cards with health indicators, VRAM, utilization values
7. Check Performance tab: charts render on tab activation (not blank)
8. Check Software tab: driver/CUDA/DCGM/OS versions
9. Check Processes tab: process list or empty state

## Traceability Matrix

| # | Gap | Phase |
|---|-----|-------|
| 1 | Mobile columns reference non-existent flat fields | Phase 1 |
| 2 | No transformData to flatten nested protobuf structure | Phase 1 |
| 3 | Mobile enums missing mapDeviceStatus (7 states) | Phase 1 |
| 4 | Mobile enums missing mapHealthStatus (4 states) | Phase 1 |
| 5 | Detail popup treats item as flat GPU, not nested device | Phase 2 |
| 6 | No device-level Overview tab (hostname, IP, vendor, serial) | Phase 2 |
| 7 | No GPU list with per-GPU hardware details | Phase 2 |
| 8 | No per-GPU health diagnostics (6 component statuses) | Phase 2 |
| 9 | No thermal thresholds (shutdown/slowdown temp) | Phase 2 |
| 10 | No ECC error counts | Phase 2 |
| 11 | No time-series charts (11 chart types on desktop) | Phase 2 |
| 12 | No Software tab (driver, CUDA, DCGM, OS) | Phase 2 |
| 13 | No GPU selector for multi-GPU devices | Phase 2 |
| 14 | Processes tab reads wrong field names | Phase 2 |
| 15 | renderTimeSeriesChart availability on mobile | Phase 3 |
| 16 | End-to-end smoke test | Phase 4 |
