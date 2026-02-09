# Plan: Phase 8 — Mobile Parity

## Context

Phases 0–7 of the L8UI migration are complete. The desktop UI is fully functional with l8ui layout for all sections. The mobile UI (`go/prob/newui/web/m/`) exists with its own component system (MobileTable, MobilePopup, MobileConfirm, MobileEditTable, MobileTree) and 9 sections. However, several sections are placeholders.

## Current Mobile Status

| Section | Status | Notes |
|---------|--------|-------|
| **Dashboard** | 95% | Network metrics work; GPU/Host/K8s show `--` |
| **Network** | 100% | Full MobileTable + detail popup + server-side data |
| **Kubernetes** | 95% | Cluster tabs + 8 resource types + detail modals with REST calls |
| **Events** | Placeholder | "Coming in Stage 3" — desktop is also placeholder |
| **Inventory** | 100% | Full CRUD with MobileEditTable |
| **GPUs** | Placeholder | Desktop uses mock data |
| **Hosts** | Placeholder | Desktop uses mock data with Hypervisors/VMs tabs |
| **Security** | 100% | Users/Roles/Credentials CRUD |
| **System** | 95% | Health table + Logs browser; Settings placeholder (same as desktop) |

## Scope — What Needs Parity

Only GPUs and Hosts need implementation. Everything else is already at parity or both desktop and mobile share the same limitation (Events placeholder, System Settings placeholder).

### Out of Scope
- **Events** — placeholder on both desktop and mobile, no API exists yet
- **System Settings** — placeholder on both platforms
- **Kubernetes** — already ~95% complete, minor delta acceptable
- **Dashboard GPU/Host/K8s metrics** — these show `--` because the data comes from mock generators (not APIs), so there's no server endpoint to query. We'll wire them up once real APIs exist. This is consistent on both platforms.

## Changes

### 1. `m/app/sections/gpus.html` — Full GPU section

Replace the placeholder with a functional section matching the desktop GPU feature set:

- **Header**: Green gradient (keep existing `#22c55e → #16a34a`)
- **MobileTable**: Client-side mode (`serverSide: false`), same mock data generator as desktop
- **Columns**: Name (primary), Model, Host, Status, GPU %, Memory, Temp, Power
- **Card renderer**: Custom card showing GPU name, model, host, status badge, utilization/memory/temp metrics
- **Detail popup**: MobilePopup with Overview, Performance, Hardware, and Software sections
- **Mock data**: Reuse `generateGPUMockData()` from desktop (inline or imported pattern)

**Key fields** (from desktop `gpus-columns.js`):
- `name`, `model`, `hostName`, `status`, `utilization`, `memoryUsed`/`memoryTotal`, `temperature`, `powerDraw`/`powerLimit`

**Structure** (inline `<style>` + `<div>` + `<script>`, same pattern as network.html/security.html):
```
<style>/* gpu-section-header, gpu-card styles */</style>
<div class="mobile-section mobile-gpu-section">
    <div class="section-header">GPU Computing</div>
    <div id="gpu-table-container"></div>
</div>
<script>
    // Mock data generator (subset of desktop gpus-mock-data.js)
    // MobileTable init with client-side data
    // Card renderer
    // Detail popup
    // initMobileGpus() function
</script>
```

### 2. `m/app/sections/hosts.html` — Full Hosts & VMs section

Replace the placeholder with a functional section matching the desktop Hosts feature set:

- **Header**: Purple gradient (keep existing `#8b5cf6 → #7c3aed`)
- **Tab switcher**: Hypervisors / Virtual Machines (same pattern as mobile security tabs)
- **MobileTable x2**: One for hypervisors, one for VMs (both client-side)
- **Mock data**: Reuse `generateHypervisorMockData()` and `generateVMMockData()` from desktop (inline)

**Hypervisor columns** (from desktop `hosts-columns.js`):
- `name` (primary), `type`, `cluster`, `status`, `cpuUsage`, `memoryUsage`, `vmCount`, `datacenter`

**VM columns** (from desktop `hosts-columns.js`):
- `name` (primary), `os`, `hypervisor`, `status`, `cpuUsage`, `memory`, `diskUsage`, `ipAddress`

**Hypervisor card renderer**: Name, type, cluster in header; status badge; CPU %, Memory %, VMs (running/total), datacenter
**VM card renderer**: Name, OS, hypervisor in header; status badge; CPU %, Memory (used/total GB), Disk %, IP

**Hypervisor detail popup**: Overview (hostname, type, version, datacenter, cluster, IP, manufacturer, model), Resources (CPU cores/usage, memory total/usage, storage total/used), VMs (count, running, stopped), Network (interfaces, vSwitches, datastores)
**VM detail popup**: Overview (hostname, OS, hypervisor, purpose, status, IP, MAC, VLAN), Resources (CPU cores/usage, memory/usage, disk total/used), Operations (uptime, snapshots, backup status, last backup, owner, created date)

**Structure** (same inline pattern):
```
<style>/* hosts section-header, tab styles */</style>
<div class="mobile-section mobile-hosts-section">
    <div class="section-header">Hosts & VMs</div>
    <div class="hosts-tabs">
        <button class="hosts-tab active" data-tab="hypervisors">Hypervisors</button>
        <button class="hosts-tab" data-tab="vms">Virtual Machines</button>
    </div>
    <div id="hosts-hypervisors" class="hosts-content active">
        <div id="hypervisors-table-container"></div>
    </div>
    <div id="hosts-vms" class="hosts-content">
        <div id="vms-table-container"></div>
    </div>
</div>
<script>
    // Mock data generators (from desktop hosts.js)
    // Tab switching
    // MobileTable x2 init
    // Card renderers
    // Detail popups
    // initMobileHosts() function
</script>
```

## Files Modified

| File | Action | Lines (est.) |
|------|--------|-------------|
| `m/app/sections/gpus.html` | Rewrite from placeholder | ~350 |
| `m/app/sections/hosts.html` | Rewrite from placeholder | ~450 |

## Files NOT Modified

- `m/app/js/app-core.js` — Already has `gpus` and `hosts` in section mapping + `initMobileGpus`/`initMobileHosts` dispatch
- `m/app.html` — No changes needed, sections are dynamically loaded
- All other mobile sections — already at parity

## Patterns to Follow

Each section should follow the established mobile patterns (network.html, security.html):
1. Inline `<style>` block for section-specific CSS
2. HTML structure with `mobile-section` wrapper and `section-header`
3. Inline `<script>` with IIFE or flat functions
4. `initMobileXxx()` function exposed to `window` for `app-core.js` dispatch
5. MobileTable with `serverSide: false` for mock/client-side data
6. Custom `renderCard` returning HTML card string
7. Detail popups via `MobilePopup.show({ ... })`
8. `escapeHtml()` utility defined locally (like other sections)

## File Size Compliance

Both files should stay well under 500 lines:
- `gpus.html`: ~60 lines CSS + ~30 lines HTML + ~260 lines JS = ~350 total
- `hosts.html`: ~70 lines CSS + ~40 lines HTML + ~340 lines JS = ~450 total

If hosts.html approaches 500 lines, the mock data generators can be shortened (fewer items: 15 hypervisors + 30 VMs instead of desktop's 25 + 50).

## Verification

1. Navigate to GPUs section from More menu → should show GPU table with mock data
2. Click a GPU card → detail popup shows all sections
3. Navigate to Hosts section → should show Hypervisors tab with data
4. Switch to VMs tab → should show VM table with data
5. Click a hypervisor card → detail popup shows all sections
6. Click a VM card → detail popup shows all sections
7. Filter/sort should work on all tables
8. No console errors on any section
