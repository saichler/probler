# Mobile Redesign Sync Plan

## Problem Statement
The desktop website (index.html) and app (app.html) were recently redesigned with a new visual language — parallax SVG hero headers, Figtree typography, glassmorphic effects, animated data flow particles, and a cohesive cyan accent design system. The mobile site (m/index.html) and mobile app (m/app.html) were not updated to match and still use the old design.

---

## Gap Analysis

### 1. Landing Page (index.html vs m/index.html)

| Aspect | Desktop (Redesigned) | Mobile (Old) | Gap |
|--------|---------------------|--------------|-----|
| Font | Figtree (variable 300-900) | Inter | **Mismatch** — must use Figtree |
| Primary button color | Cyan #0ea5e9 | Azure #0070f3 | **Mismatch** |
| Hero section | Large headline (4.7rem), animated SVG architecture diagram, proof items, badges | Simple title + description, badges | **Missing** animated architecture, proof items layout |
| Architecture section | Animated SVG with 3 microservice layers, connection arrows, data particles | None | **Missing entirely** |
| Components/features section | 4-grid sections (Platform Runtime, Data Pipeline, Ops Apps, Infra Controls) with clickable cards, modal popups | Simple flat list of 6 platform components | **Severely reduced** |
| Stats section | "20+ Microservices", "100% Go", "K8s Ready", "∞ Scalable" | None | **Missing** |
| Getting Started section | 4-step code blocks with prerequisites | None | **Missing** |
| Header | Glassmorphic blur, sticky, nav links (Architecture, Coverage, Start, Docs, GitHub, About, Developer), action buttons (Simulators, Demo, Run Locally) | Simple header with logo + Login button | **Severely reduced** |
| Footer | Full footer with links | Simple footer | **Minimal** |
| Modals | Interactive component detail modals (demos, docs, GitHub links) | None | **Missing** |
| Responsive | Full responsive CSS (landing-responsive.css) | Basic inline responsive | **Incomplete** |

### 2. App Shell (app.html vs m/app.html)

| Aspect | Desktop | Mobile | Gap |
|--------|---------|--------|-----|
| CSS variables | `--noc-cyan`, `--noc-black`, status colors, text hierarchy | `--layer8d-primary`, `--text-primary`, `--bg-primary` | **Different naming** — mobile should align with desktop variable names or share a common set |
| Header design | Parallax network illustration overlay, glassmorphic blur, "Powered by Layer 8" | Simple white bar with hamburger + logo + refresh | **Different design language** |
| Sidebar nav | Icon + text entries with cyan active highlight, section groups | Similar icon + text entries | **Close but styling may differ** |
| Section headers | Every section has animated SVG parallax hero (network topology, GPU cards, server racks, K8s clusters) | No section headers/heroes | **Missing entirely** — mobile sections jump straight to content |
| Parallax system | parallax.js with multi-layer scroll effects | None | **Missing** (acceptable for mobile performance) |

### 3. Dashboard Section

| Aspect | Desktop | Mobile | Gap |
|--------|---------|--------|-----|
| Hero header | Animated SVG with server racks, status LEDs, data flow particles | None | **Missing** |
| Metric cards | 3-column grid (Network Devices, Kubernetes, GPU Servers) with animated counters | 2-column grid (6 stat cards) with simple counts | **Different layout and design** |
| Top Critical Alarms | Table below metric cards | None | **Missing** |

### 4. Section Content Parity

| Desktop Section | Mobile Status | Detail |
|----------------|--------------|--------|
| Network Devices | Has table + detail modal | Functional but missing hero header |
| GPUs | Has table + detail modal | Functional but missing hero header |
| Hosts & VMs | Has tabs + tables + detail modals | Functional but missing hero header |
| Kubernetes | Has 8 resource types + detail modals | Functional but missing hero header |
| Inventory (Targets) | Has CRUD table | Functional |
| Events & Alarms (ALM) | Has 6 sub-modules | Functional |
| System | Has 5 sub-modules | Functional |
| **Infrastructure** | **Not implemented** | Desktop is placeholder too |
| **Topologies** | **Not implemented** | Desktop is placeholder/iframe |
| **Analytics** | **Not implemented** | Desktop is placeholder |
| **Applications** | **Not implemented** | Desktop is placeholder |
| **Automation** | **Not implemented** | Desktop is placeholder |

### 5. Detail Modals

Desktop detail modals have been redesigned with the new visual language. Mobile detail modals use `ProblerDetail.showTabbedPopup()` — need to verify styling alignment.

---

## Traceability Matrix

| # | Gap | Source | Phase |
|---|-----|--------|-------|
| 1 | Mobile landing page uses Inter font instead of Figtree | Landing Page §1 | Phase 1 |
| 2 | Mobile landing page uses #0070f3 button color instead of #0ea5e9 | Landing Page §1 | Phase 1 |
| 3 | Mobile landing page missing animated architecture diagram | Landing Page §1 | Phase 1 |
| 4 | Mobile landing page missing expanded component/features grid | Landing Page §1 | Phase 1 |
| 5 | Mobile landing page missing stats section | Landing Page §1 | Phase 1 |
| 6 | Mobile landing page missing Getting Started section | Landing Page §1 | Phase 1 |
| 7 | Mobile landing page header missing nav links and action buttons | Landing Page §1 | Phase 1 |
| 8 | Mobile landing page missing component detail modals | Landing Page §1 | Phase 1 |
| 9 | Mobile landing page missing proper responsive design from desktop | Landing Page §1 | Phase 1 |
| 10 | Mobile app header missing redesigned look (no parallax illustration) | App Shell §2 | Phase 2 |
| 11 | Mobile app sidebar styling alignment with desktop | App Shell §2 | Phase 2 |
| 12 | Mobile app CSS variable naming inconsistencies | App Shell §2 | Phase 2 |
| 13 | Mobile dashboard missing hero header SVG | Dashboard §3 | Phase 3 |
| 14 | Mobile dashboard metric cards layout differs from desktop | Dashboard §3 | Phase 3 |
| 15 | Mobile dashboard missing Top Critical Alarms table | Dashboard §3 | Phase 3 |
| 16 | Mobile sections missing hero headers with SVG illustrations | Section Headers §2 | Phase 3 |
| 17 | Mobile detail modal styling alignment | Detail Modals §5 | Phase 4 |
| 18 | Placeholder sections (infra, topo, analytics, apps, automation) not on mobile | Section Parity §4 | Deferred — desktop placeholders too |

---

## Implementation Phases

### Phase 1: Mobile Landing Page Redesign (m/index.html)

Rewrite `m/index.html` to match the desktop `index.html` redesign, adapted for mobile viewports.

**Files to modify:**
- `go/prob/newui/web/m/index.html` — complete rewrite

**Changes:**
1. Replace Inter font with Figtree (already available via `../l8ui/font/`)
2. Replace #0070f3 button color with #0ea5e9 (cyan accent)
3. Add mobile-optimized hero section matching desktop layout:
   - Large headline with proper typography hierarchy
   - Proof items (Runtime, Core Flow, Surface Area) — stack vertically on mobile
   - Badges row (Go 1.25, K8s Ready, Apache 2.0, DCIM, Microservices)
   - Action buttons (Run Locally, GitHub)
4. Add simplified architecture section — static SVG diagram (no complex animations on mobile for performance) showing the 3 microservice layers
5. Add component/features section — collapsible accordion or scrollable cards for the 4 grid sections (Platform Runtime, Data Pipeline, Ops Apps, Infra Controls)
6. Add stats section (20+ Microservices, 100% Go, K8s Ready, ∞ Scalable) — 2x2 grid on mobile
7. Add Getting Started section with code blocks (scrollable horizontally)
8. Update header — add hamburger menu with nav links (Architecture, Coverage, Start, Docs, GitHub)
9. Add simplified component detail modals (or expandable cards for mobile)
10. Ensure proper responsive behavior at all mobile breakpoints
11. Match desktop footer design

**Approach:** Read the desktop `index.html` and `landing-*.css` files. Create a mobile-optimized version that preserves the same content and visual hierarchy but adapts layout for touch/small screens. Use shared CSS where possible (reference `../css/landing-*.css` or create `m/css/landing-mobile.css` overrides).

### Phase 2: Mobile App Shell Alignment (m/app.html + CSS)

Update the mobile app shell to match the redesigned desktop look and feel.

**Files to modify:**
- `go/prob/newui/web/m/app/css/app-base.css` — update CSS variables to align with desktop
- `go/prob/newui/web/m/app/css/app-header.css` — redesign header
- `go/prob/newui/web/m/app/css/app-sidebar.css` — align sidebar styling
- `go/prob/newui/web/m/app.html` — update structure if needed

**Changes:**
1. **CSS variable alignment**: Ensure mobile CSS variables match desktop values:
   - Text colors: align `--text-primary` with desktop's `#0f172a`
   - Background colors: align with desktop's warm neutrals (#f7f6f2, #fcfbf8, #f1eee8)
   - Status colors: ensure exact match with desktop operational/warning/critical/offline
   - Shadows: match desktop's subtle shadow system
2. **Header redesign**:
   - Add subtle background pattern or gradient matching desktop header aesthetic
   - Ensure cyan accent consistency
   - Update "Probler" logo text styling to match desktop
3. **Sidebar navigation**:
   - Match desktop icon + text styling
   - Match active state (cyan background with border highlight)
   - Match hover/tap state colors
   - Ensure section grouping matches desktop
4. **Global component styling**:
   - Card borders and backgrounds matching desktop's warm neutral palette
   - Button styles matching desktop (cyan primary, proper hover states)
   - Badge/pill styling consistency

### Phase 3: Dashboard and Section Headers

Add visual polish to the dashboard and section entry points to match desktop's hero header design.

**Files to modify:**
- `go/prob/newui/web/m/app/sections/dashboard.html` — redesign dashboard
- `go/prob/newui/web/m/app/css/` — add section header styles (new file: `app-sections.css`)
- `go/prob/newui/web/m/app.html` — add CSS include for new stylesheet

**Changes:**
1. **Dashboard redesign**:
   - Add a simplified hero/banner at the top with the server rack illustration (static SVG, no animation) or a gradient banner with the Probler branding
   - Improve metric cards design — match desktop's card styling (subtle borders, proper shadows, icon treatment)
   - Add "Top Critical Alarms" summary below metric cards (compact list or mini-table)
   - Improve spacing and typography hierarchy
2. **Section hero headers** (mobile-adapted):
   - For each major section (Network, GPUs, Hosts, K8s), add a compact header banner (40-60px height) with:
     - Section icon and title
     - Subtle gradient or accent color bar matching the desktop section theme
     - Optional: very simplified SVG illustration (single-color silhouette, no animation)
   - These should be lightweight — no parallax, no complex animations
   - Implemented as reusable HTML/CSS pattern, not per-section custom code
3. **Section-specific styling**:
   - Network: cyan/teal accent
   - GPUs: green accent
   - Hosts: blue accent
   - Kubernetes: blue/purple accent (K8s brand colors)
   - ALM/Alarms: amber/red accent

### Phase 4: Detail Modal and Component Polish

Ensure detail modals and interactive components match the redesigned desktop aesthetic.

**Files to modify:**
- `go/prob/newui/web/m/app/css/app-details.css` — update detail popup styling
- `go/prob/newui/web/m/app/js/details/*.js` — minor HTML template updates if needed

**Changes:**
1. **Detail modal styling**:
   - Match desktop's card-based layout within modals
   - Tab styling — match desktop tab design (underline active tab, proper spacing)
   - Section headers — match desktop's muted uppercase labels
   - Data rows — match desktop's label/value layout and typography
   - Performance bars — match desktop's color coding (operational/warning/critical)
   - Tables within modals — match desktop's compact table styling
2. **Status indicators**:
   - Ensure status dots/badges use the same colors and styling as desktop
   - Match status badge pill design (font size, padding, border-radius)
3. **Typography cleanup**:
   - Ensure all detail text uses Figtree at proper weights
   - Match desktop's heading/label/value size hierarchy

### Phase 5: End-to-End Verification

Verify all changes across the mobile site and app.

**Landing page (m/index.html):**
- [ ] Page loads without errors
- [ ] Figtree font renders correctly
- [ ] Hero section displays properly at 320px, 375px, 414px widths
- [ ] Architecture diagram is visible and properly sized
- [ ] Component cards are scrollable/expandable
- [ ] Stats section displays in 2x2 grid
- [ ] Getting Started code blocks scroll horizontally
- [ ] All links (GitHub, Docs, Demo) work
- [ ] Login button navigates to login page
- [ ] Color scheme matches desktop (cyan accent, warm neutrals)

**Mobile app (m/app.html):**
- [ ] Login and authentication flow works
- [ ] Header displays with updated styling
- [ ] Sidebar opens/closes smoothly with updated design
- [ ] All 13 navigation items visible and tappable
- [ ] Active state highlighting works (cyan)

**Dashboard:**
- [ ] Hero banner/header displays
- [ ] 6 metric cards load with real data
- [ ] Top Critical Alarms section shows data
- [ ] Cards are responsive at various widths

**Sections (for each: Network, GPUs, Hosts, K8s, Inventory, Alarms, System):**
- [ ] Section loads without errors
- [ ] Section header/banner displays
- [ ] Table data loads (not blank)
- [ ] Row click opens detail modal
- [ ] Detail modal tabs work
- [ ] Detail content is populated
- [ ] Back navigation works
- [ ] Visual styling matches the redesigned desktop aesthetic

**Cross-cutting:**
- [ ] No console errors on any page
- [ ] All pages render correctly in iOS Safari and Chrome Android
- [ ] Touch targets are 48px minimum
- [ ] Scroll behavior is smooth
- [ ] Dark mode (if supported) works with updated variables

---

## Out of Scope

- **Placeholder sections** (infrastructure, topologies, analytics, applications, automation) — these are placeholders on desktop too; no mobile implementation needed until desktop is functional
- **Iframe-based sections** (dashboard iframe, targets iframe, topo iframe) — these are legacy; the direct integration versions are what mobile uses
- **Complex animations** — parallax scrolling and animated SVG particles are not appropriate for mobile performance; use static or CSS-only alternatives
- **Desktop layout changes** — this plan only syncs mobile to match the existing desktop redesign
