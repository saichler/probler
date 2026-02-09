# Plan: Phase 7 — Update Section HTML to L8UI Layout Pattern

## Context

Phases 0–6 of the L8UI migration are complete. The l8ui CSS framework (`layer8-section-layout.css`) provides reusable layout classes (`l8-section`, `l8-header-frame`, `l8-module-tabs`, `l8-module-content`, `l8-subnav`, `l8-service-view`, `l8-table-container`). Currently, `sys.html` is the only section using this pattern. The remaining active sections (GPUs, Hosts, Network, Kubernetes) use older custom CSS classes (`gpu-hero`, `hosts-hero`, `network-hero`, `k8s-hero`, `content-tab`, `tab-content`, etc.).

Phase 7 converts these section HTML files to use the l8ui layout classes, giving a consistent look and responsive behavior across all sections.

## Scope Assessment

| Section | Current State | Action |
|---------|--------------|--------|
| `gpus.html` | Custom hero + single table | **Convert** to l8ui layout |
| `hosts.html` | Custom hero + custom tabs (Hypervisors/VMs) | **Convert** to l8ui layout with module tabs |
| `network.html` | Custom hero + single table | **Convert** to l8ui layout |
| `kubernetes.html` | Custom hero + dynamic cluster content | **Convert** hero only; keep dynamic k8s layout |
| `inventory.html` | Custom hero + iframe (targets) | **Convert** hero only; keep iframe |
| `sys.html` | Already l8ui | **No change** |
| `dashboard.html` | Iframe only | **No change** (no table, no hero) |
| `topologies.html` | Iframe only | **No change** |
| `infrastructure.html` | Placeholder | **No change** |
| `events.html` | Placeholder | **No change** |
| `analytics.html` | Placeholder | **No change** |

## Critical Constraint: Container IDs

JS init files have **hardcoded container IDs**. These MUST NOT change unless the corresponding JS is also updated. Changing container IDs is high risk — the table simply won't appear if the ID doesn't match.

| Container ID | JS File | Must Preserve |
|---|---|---|
| `gpu-table` | `gpus-init.js:4` | Yes |
| `hypervisors-table` | `hosts.js:171` | Yes |
| `vms-table` | `hosts.js:200` | Yes |
| `network-devices-table` | `network-devices-init.js:76` | Yes |
| `.k8s-cluster-tabs` | `kubernetes-init.js:177` | Yes |
| `.k8s-main-content` | `kubernetes-init.js:178` | Yes |
| `#hero-cluster-count` | `kubernetes-tables.js` | Yes |
| `#hero-pod-count` | `kubernetes-tables.js` | Yes |
| `#hero-service-count` | `kubernetes-tables.js` | Yes |
| `.network-hero .hero-subtitle` | `network-devices-init.js:63` | Yes |
| `.gpu-hero` | `gpus-init.js:36` | Yes (parallax) |

## Changes

### 1. `sections/gpus.html` — Convert to l8ui layout

Replace the custom `gpu-hero` / `hero-background` / `hero-content` structure with l8ui's `l8-header-frame` / `l8-header-bg` / `l8-header-content` pattern, keeping the same SVG content. Replace `section-content gpu-content` with `l8-module-content` wrapping an `l8-table-container`.

**Key preservations:**
- SVG illustrations stay identical (just re-wrapped)
- Container ID `gpu-table` stays unchanged
- Class `gpu-hero` stays as an **additional** class on the header for parallax init compatibility
- GPU detail modal div stays at bottom

**Structure:**
```html
<div class="section-container gpu-section l8-section">
    <div class="l8-header-frame gpu-hero parallax-container">
        <div class="l8-header-bg parallax-layer" data-speed="0.5">
            <svg class="l8-illustration" viewBox="0 0 1200 150"><!-- existing SVG --></svg>
        </div>
        <div class="l8-header-content parallax-layer" data-speed="1">
            <div class="l8-header-title">
                <h1 class="l8-title">GPU Computing Infrastructure</h1>
                <p class="l8-subtitle">Real-time GPU monitoring - AI & ML Workloads</p>
            </div>
        </div>
    </div>
    <div class="section-content">
        <div class="l8-module-content active" data-module="gpus">
            <div class="l8-table-container" id="gpu-table"></div>
        </div>
    </div>
</div>
<!-- GPU Detail Modal (unchanged) -->
<div id="gpu-detail-modal" class="modal-overlay">...</div>
```

### 2. `sections/hosts.html` — Convert to l8ui layout with module tabs

Replace custom hero with l8ui header. Replace custom `.content-tabs` / `.content-tab` / `.tab-content` with l8ui `.l8-module-tabs` / `.l8-module-tab` / `.l8-module-content`.

**Key preservations:**
- SVG illustrations stay identical
- Container IDs `hypervisors-table` and `vms-table` unchanged
- Modal divs stay at bottom

**JS impact:** `hosts.js:initializeHosts()` uses `.content-tab` and `.tab-content` selectors for tab switching. These must be updated to `.l8-module-tab` and `.l8-module-content` respectively.

**Structure:**
```html
<div class="section-container hosts-section l8-section">
    <div class="l8-header-frame parallax-container">
        <div class="l8-header-bg parallax-layer" data-speed="0.5">
            <svg class="l8-illustration" viewBox="0 0 1200 150"><!-- existing SVG --></svg>
        </div>
        <div class="l8-header-content parallax-layer" data-speed="1">
            <div class="l8-header-title">
                <h1 class="l8-title">Virtual Infrastructure</h1>
                <p class="l8-subtitle">Hypervisor Management - VM Orchestration</p>
            </div>
        </div>
    </div>
    <div class="l8-module-tabs">
        <button class="l8-module-tab active" data-module="hypervisors">
            <span class="tab-icon">🖥️</span><span class="tab-label">Hypervisors</span>
        </button>
        <button class="l8-module-tab" data-module="vms">
            <span class="tab-icon">☁️</span><span class="tab-label">Virtual Machines</span>
        </button>
    </div>
    <div class="section-content">
        <div class="l8-module-content active" data-module="hypervisors">
            <div class="l8-table-container" id="hypervisors-table"></div>
        </div>
        <div class="l8-module-content" data-module="vms">
            <div class="l8-table-container" id="vms-table"></div>
        </div>
    </div>
</div>
<!-- Modals (unchanged) -->
```

**JS update in `hosts.js`:** Change `initializeHosts()` tab selectors:
- `.content-tab` → `.l8-module-tab`
- `.tab-content` → `.l8-module-content`
- `data-tab` → `data-module`
- `data-content` → `data-module`

### 3. `sections/network.html` — Convert to l8ui layout

Replace custom `network-hero` with l8ui header. Keep `network-hero` as additional class for hero-subtitle JS targeting.

**Key preservations:**
- SVG illustrations stay identical
- Container ID `network-devices-table` unchanged
- Class `network-hero` retained so `network-devices-init.js:63` querySelector `.network-hero .hero-subtitle` still works

**Structure:**
```html
<div class="section-container network-section l8-section">
    <div class="l8-header-frame network-hero parallax-container">
        <div class="l8-header-bg parallax-layer" data-speed="0.5">
            <svg class="l8-illustration" viewBox="0 0 1200 300"><!-- existing SVG --></svg>
        </div>
        <div class="l8-header-content parallax-layer" data-speed="1">
            <div class="l8-header-title">
                <h1 class="l8-title">Network Infrastructure</h1>
                <p class="l8-subtitle hero-subtitle">Real-time monitoring - 247 Active Devices - 99.98% Uptime</p>
            </div>
        </div>
    </div>
    <div class="section-content">
        <div class="l8-module-content active" data-module="network">
            <div class="l8-table-container" id="network-devices-table"></div>
        </div>
    </div>
</div>
```

**JS update in `network-devices-init.js`:** Change hero-subtitle selector from `.network-hero .hero-subtitle` to `.l8-header-title .hero-subtitle` (or keep `.network-hero` class on header div for compatibility — chosen above).

### 4. `sections/kubernetes.html` — Convert hero only

The K8s section has a dynamic layout (cluster tabs + resource tabs generated by JS). Only the hero header is converted to l8ui. The `k8s-content` / `k8s-layout` / `k8s-cluster-tabs` / `k8s-main-content` structure stays unchanged because `kubernetes-init.js` dynamically generates all content inside it.

**Key preservations:**
- All K8s dynamic structure unchanged
- Hero stat IDs (`hero-cluster-count`, `hero-pod-count`, `hero-service-count`) unchanged
- Modal divs unchanged

**Structure:**
```html
<div class="section-container k8s-section l8-section">
    <div class="l8-header-frame k8s-hero parallax-container">
        <div class="l8-header-bg parallax-layer" data-speed="0.5">
            <svg class="l8-illustration" viewBox="0 0 1200 150"><!-- existing SVG with stats --></svg>
        </div>
        <div class="l8-header-content parallax-layer" data-speed="1">
            <div class="l8-header-title">
                <h1 class="l8-title">Kubernetes Clusters</h1>
                <p class="l8-subtitle">Container Orchestration - Multi-Cluster Management</p>
            </div>
        </div>
    </div>
    <div class="k8s-content">
        <!-- Unchanged dynamic content -->
        <div class="k8s-layout">
            <div class="k8s-cluster-tabs"></div>
            <div class="k8s-main-content"></div>
        </div>
    </div>
    <!-- Modals (unchanged) -->
</div>
```

### 5. `sections/inventory.html` — Convert hero only

Inventory uses a custom `system-header-frame` hero with an iframe for the targets table. Convert the hero to l8ui layout. Keep the iframe unchanged.

**Structure:**
```html
<div class="section-container inventory-section l8-section">
    <div class="l8-header-frame parallax-container">
        <div class="l8-header-bg parallax-layer" data-speed="0.5">
            <svg class="l8-illustration" viewBox="0 0 1200 300"><!-- existing SVG --></svg>
        </div>
        <div class="l8-header-content parallax-layer" data-speed="1">
            <div class="l8-header-title">
                <div class="l8-icon"><!-- existing SVG icon --></div>
                <div>
                    <h1 class="l8-title">Inventory</h1>
                    <p class="l8-subtitle">Manage Targets and Infrastructure Assets</p>
                </div>
            </div>
        </div>
    </div>
    <div class="section-content" style="flex: 1; display: flex; flex-direction: column; min-height: 0;">
        <div style="padding: 0; flex: 1; min-height: 0;">
            <iframe id="targets-iframe" src="targets/index.html" style="width: 100%; height: 100%; border: none;" title="Inventory"></iframe>
        </div>
    </div>
</div>
```

### 6. `js/hosts.js` — Update tab selectors

Update `initializeHosts()` (lines 137-163) to use l8ui tab classes:

```javascript
// Change these selectors:
const tabs = document.querySelectorAll('.l8-module-tab');        // was .content-tab
const tabContents = document.querySelectorAll('.l8-module-content'); // was .tab-content

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const tabName = tab.dataset.module;  // was tab.dataset.tab
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(tc => tc.classList.remove('active'));
        tab.classList.add('active');
        const targetContent = document.querySelector(`.l8-module-content[data-module="${tabName}"]`);
        // ... rest unchanged
    });
});
```

### 7. CSS cleanup

The old section-specific hero CSS classes (`gpu-hero`, `hosts-hero`, `network-hero`, `k8s-hero`, `content-tabs`, `content-tab`, `tab-content`, etc.) can be simplified since the l8ui layout classes now handle the structure. However, we keep the gradient colors as overrides:

**`css/sections-gpus.css`:** Remove `.gpu-hero` layout rules (position, width, height, overflow, margin, border-radius, box-shadow) since `l8-header-frame` handles them. Keep the background gradient as an override on `.gpu-section .l8-header-frame`. Remove `.gpu-hero .hero-background`, `.gpu-hero .hero-content` (replaced by l8ui classes). Keep `.gpu-content` padding, animation rules, and modal styles.

**`css/sections-hosts.css`:** Same pattern — remove `.hosts-hero` layout rules, keep gradient override. Remove `.content-tabs`, `.content-tab`, `.tab-content` rules entirely (replaced by `l8-module-tabs`/`l8-module-tab`/`l8-module-content`).

**`css/components-misc.css`:** Check for `.network-hero`, `.hero-title`, `.hero-subtitle`, `.hero-background`, `.hero-content` rules — these may become dead code. Keep `.hero-subtitle` if still used by network init JS.

## Files Modified

| File | Action |
|------|--------|
| `sections/gpus.html` | Convert to l8ui layout |
| `sections/hosts.html` | Convert to l8ui layout with module tabs |
| `sections/network.html` | Convert to l8ui layout |
| `sections/kubernetes.html` | Convert hero to l8ui layout |
| `sections/inventory.html` | Convert hero to l8ui layout |
| `js/hosts.js` | Update tab selectors to l8ui classes |
| `css/sections-gpus.css` | Simplify — remove duplicate layout rules, keep gradients |
| `css/sections-hosts.css` | Simplify — remove custom tab CSS, keep gradients |

## Files NOT Modified

- `sections/sys.html` — already l8ui
- `sections/dashboard.html` — iframe only, no hero
- `sections/topologies.html` — iframe only
- `sections/infrastructure.html` — placeholder
- `sections/events.html` — placeholder
- `sections/analytics.html` — placeholder
- `js/gpus-init.js` — no selector changes needed (container ID preserved)
- `js/network-devices-init.js` — `.network-hero` class preserved on header
- `kubernetes/kubernetes-init.js` — k8s dynamic structure preserved

## Verification

1. Navigate to each section and verify:
   - Hero header renders with correct gradient, SVG illustrations, title/subtitle
   - Table(s) render with data (container IDs match)
   - Tab switching works (Hosts: Hypervisors/VMs)
   - Row clicks open detail modals
   - Parallax effect works on heroes (GPU, Network)
2. Verify responsive behavior at tablet (1024px) and mobile (768px) widths
3. Check browser console for JS errors
4. Verify no broken layout in the System section (unchanged)
