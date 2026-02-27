# Remove Rounded Corners from L8UI Panels

## Context
The l8ui library uses `border-radius` on panel/container elements (popups, cards, tables, sections, charts, widgets). The user wants all panel containers to have sharp corners (border-radius: 0). Buttons, inputs, tags, badges, toggles, spinners, scrollbars, and circular elements are NOT affected.

## Approach
Set `--layer8d-radius-lg` to `0` in the theme, then fix hardcoded panel border-radius values across l8ui CSS files.

## Changes

### 1. Theme variable (`go/prob/newui/web/l8ui/shared/layer8d-theme.css`)
- Line 142: `--layer8d-radius-lg: 12px` → `--layer8d-radius-lg: 0`

### 2. Popup container (`go/prob/newui/web/l8ui/popup/layer8d-popup.css`)
- `.probler-popup-container` border-radius: `16px` → `0`
- `.probler-popup-header` border-radius: `16px 16px 0 0` → `0`

### 3. Popup content panels (`go/prob/newui/web/l8ui/popup/layer8d-popup-content.css`)
- `.detail-section` border-radius: `8px` → `0`
- `.perf-sub-tabs` border-radius: `8px` → `0`
- `.tree-view-container` border-radius: `8px` → `0`

### 4. Popup inline table (`go/prob/newui/web/l8ui/popup/layer8d-popup-inline-table.css`)
- `.form-inline-table` border-radius: `var(--layer8d-radius-md, 8px)` → `0`

### 5. Popup forms (`go/prob/newui/web/l8ui/popup/layer8d-popup-forms.css`)
- `.nested-table-container` border-radius: `var(--layer8d-radius-md, 8px)` → `0`
- `.checkbox-list` border-radius: `var(--layer8d-radius-md, 8px)` → `0`

### 6. Table (`go/prob/newui/web/l8ui/edit_table/layer8d-table.css`)
- Table header border-radius: `12px 12px 0 0` → `0`
- Table footer border-radius: `0 0 12px 12px` → `0`
- Pagination border-radius: `8px` → `0`

### 7. Section layout (`go/prob/newui/web/l8ui/shared/layer8-section-layout.css`)
- Section header frame border-radius: `16px 16px 0 0` → `0`
- Table container border-radius: `12px` → `0`
- HCM header/table border-radius values → `0`

### 8. Chart (`go/prob/newui/web/l8ui/chart/layer8d-chart.css`)
- Chart container border-radius: `8px` → `0`

### 9. Widget (`go/prob/newui/web/l8ui/dashboard/layer8d-widget.css`)
- Widget card border-radius: `10px` → `0`
- Widget header border-radius: `10px` → `0`

### 10. Notification (`go/prob/newui/web/l8ui/notification/layer8d-notification.css`)
- `.layer8d-notification` border-radius: `var(--layer8d-radius-lg, 12px)` → `0`
- `.notification-action-list` border-radius: `var(--layer8d-radius-md, 8px)` → `0`

### 11. Kanban (`go/prob/newui/web/l8ui/kanban/layer8d-kanban.css`)
- Column border-radius: `8px` → `0`
- Column header border-radius: `8px 8px 0 0` → `0`
- Column content border-radius: `0 0 8px 8px` → `0`
- Card border-radius: `6px` → `0`

### 12. Gantt (`go/prob/newui/web/l8ui/gantt/layer8d-gantt.css`)
- Timeline border-radius: `8px` → `0`

### 13. Calendar (`go/prob/newui/web/l8ui/calendar/layer8d-calendar.css`)
- Calendar grid border-radius: `8px` → `0`

### 14. Login (`go/prob/newui/web/l8ui/login/layer8d-login-base.css`)
- Login container border-radius: `16px` → `0`

### 15. Register (`go/prob/newui/web/l8ui/register/layer8d-register.css`)
- Registration container border-radius: `16px` → `0`

### 16. Reference picker (`go/prob/newui/web/l8ui/reference_picker/layer8d-reference-picker.css`)
- Modal popup border-radius: `8px` → `0`
- Header border-radius: `8px 8px 0 0` → `0`
- Footer border-radius: `0 0 8px 8px` → `0`

### 17. Timeline (`go/prob/newui/web/l8ui/timeline/layer8d-timeline.css`)
- Timeline card border-radius: `8px` → `0`

### 18. Tree grid (`go/prob/newui/web/l8ui/tree_grid/layer8d-tree-grid.css`)
- Tree item containers border-radius: `6px` → `0`

## NOT changed (explicitly out of scope)
- Buttons (`border-radius: var(--layer8d-radius-md)`)
- Form inputs/selects/textareas
- Tags and badges
- Status indicators
- Toggle switches and radio buttons (50%)
- Spinners and avatars (50%)
- Scrollbar thumbs
- Performance bar fills
- Wizard step circles (50%)
- Datepicker day cells
- Any `border-radius: 50%` (circular elements)

## Verification
Visually inspect the UI: all container/panel elements should have sharp corners. Buttons, inputs, tags, and circular elements should remain unchanged.
