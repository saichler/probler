# Mobile Components Architecture Plan

## Overview

This document outlines the plan to create mobile-optimized components that mirror the desktop app's reusable component architecture. Each mobile component will have the same capabilities as its desktop counterpart, adapted for touch interfaces and smaller screens.

---

## Desktop to Mobile Component Mapping

| Desktop Component | Desktop Location | Mobile Component | Mobile Location |
|-------------------|------------------|------------------|-----------------|
| ProblerTable | `view_table/table.js` | MobileTable | `m/app/js/mobile-table.js` |
| L8Table | `edit_table/table.js` | MobileEditTable | `m/app/js/mobile-edit-table.js` |
| ProblerPopup | `popup/popup.js` | MobilePopup | `m/app/js/mobile-popup.js` |
| ProblerConfirm | `confirm/confirm.js` | MobileConfirm | `m/app/js/mobile-confirm.js` |
| ProblerTree | `js/tree.js` | MobileTree | `m/app/js/mobile-tree.js` |
| getAuthHeaders | Multiple files | MobileAuth | `m/app/js/mobile-auth.js` |
| Config loaders | `*/config.js` | MobileConfig | `m/app/js/mobile-config.js` |

---

## Component 1: MobileTable (View Table)

**Desktop Equivalent:** `ProblerTable` in `view_table/table.js`

### Purpose
Card-based data display component with server-side pagination, filtering, and sorting for read-only data viewing.

### Configuration Options (same as desktop)
```javascript
{
    // Container
    containerId: string,

    // Data source
    endpoint: string,              // API endpoint (e.g., '/probler/0/NCache')
    modelName: string,             // L8Query model name (e.g., 'NetworkDevice')

    // Columns/Fields
    columns: [{
        key: string,               // Data field key
        label: string,             // Display label
        formatter: function,       // Value formatter
        filterKey: string,         // Override key for filtering
        sortKey: string,           // Override key for sorting
        enumValues: object,        // Enum mapping for filters
        primary: boolean,          // Show in card header
        secondary: boolean         // Show in card body
    }],

    // Pagination
    rowsPerPage: number,           // Default: 15
    serverSide: boolean,           // Default: true

    // Filtering
    filterable: boolean,           // Default: true
    filterDebounceMs: number,      // Default: 1000
    searchFields: [string],        // Fields for text search
    filters: [{                    // Filter chip configurations
        key: string,
        label: string,
        type: 'chips' | 'select',
        options: [{ value, label }]
    }],
    baseWhereClause: string,       // Base WHERE clause

    // Sorting
    sortable: boolean,             // Default: true
    defaultSort: { column, direction },

    // Display
    statusField: string,           // Field for status badge
    renderCard: function,          // Custom card renderer
    emptyMessage: string,

    // Callbacks
    transformData: function,       // Transform API response
    onDataLoaded: function,        // After data loaded
    onCardClick: function,         // Card tap handler
    onError: function
}
```

### Key Methods
```javascript
class MobileTable {
    constructor(containerId, config)

    // Data
    fetchData(page)
    refresh()
    reset()
    getData()

    // Pagination
    goToPage(page)
    getStats()

    // Filtering
    setFilter(key, value)
    clearFilters()
    setBaseWhereClause(clause)

    // Query
    buildQuery(page, pageSize)

    // Rendering
    render()
    renderCards()
    renderPagination()
    renderFilters()

    // Internal
    getAuthHeaders()
    showLoading()
    showError(message)
    showEmpty()
}
```

### Mobile Adaptations
- Card-based layout instead of table rows
- Touch-friendly filter chips instead of column header inputs
- Sticky search bar
- Swipe gestures for pagination (optional)
- Pull-to-refresh support
- Bottom pagination controls

### CSS File
`m/app/css/mobile-table.css`

---

## Component 2: MobileEditTable (Edit Table)

**Desktop Equivalent:** `L8Table` in `edit_table/table.js`

### Purpose
Card-based data management component with CRUD operations (Add, Edit, Delete, Toggle).

### Configuration Options (extends MobileTable)
```javascript
{
    // All MobileTable options plus:

    // Actions
    showActions: boolean,          // Default: true
    actions: ['edit', 'delete', 'toggle'],
    addButtonText: string,         // Default: "Add"

    // Callbacks
    onAdd: function,               // Add button handler
    onEdit: function(item),        // Edit action handler
    onDelete: function(item),      // Delete action handler
    onToggleState: function(item), // Toggle action handler
    getItemState: function(item),  // Get item state for toggle

    // Confirmation
    confirmDelete: boolean,        // Default: true
    deleteConfirmMessage: string
}
```

### Key Methods
```javascript
class MobileEditTable extends MobileTable {
    // Additional methods
    showAddForm()
    showEditForm(item)
    deleteItem(item)
    toggleItem(item)

    // Action rendering
    renderActions(item)
    renderAddButton()
}
```

### Mobile Adaptations
- Floating action button (FAB) for Add
- Swipe-to-reveal actions on cards
- Full-screen edit forms
- Action sheet for item actions (Edit/Delete/Toggle)

### CSS File
`m/app/css/mobile-edit-table.css`

---

## Component 3: MobilePopup (Modal/Popup)

**Desktop Equivalent:** `ProblerPopup` in `popup/popup.js`

### Purpose
Full-screen modal component for displaying detailed content, forms, and nested views.

### Configuration Options
```javascript
{
    // Content
    title: string,
    titleHtml: string,             // Custom title with badges
    content: string,               // HTML content

    // Size (mobile: always full-screen on small devices)
    size: 'small' | 'medium' | 'large' | 'full',

    // Footer
    showFooter: boolean,           // Default: true
    saveButtonText: string,        // Default: "Save"
    cancelButtonText: string,      // Default: "Cancel"

    // Styling
    noPadding: boolean,

    // Callbacks
    onShow: function,
    onSave: function,
    onClose: function,

    // Identification
    id: string
}
```

### API Methods
```javascript
window.MobilePopup = {
    show(config),
    close(),
    closeAll(),
    updateContent(html),
    updateTitle(title),
    getBody(),
    getStack()
}
```

### Mobile Adaptations
- Slide-up animation (bottom sheet style)
- Full-screen on phones, centered modal on tablets
- iOS-style drag-to-dismiss
- Safe area insets support
- Hardware back button support
- Nested modal stack with proper z-index

### CSS File
`m/app/css/mobile-popup.css`

---

## Component 4: MobileConfirm (Confirmation Dialog)

**Desktop Equivalent:** `ProblerConfirm` in `confirm/confirm.js`

### Purpose
Confirmation dialog for destructive actions.

### Configuration Options
```javascript
{
    type: 'danger' | 'warning' | 'info',
    title: string,
    message: string,
    detail: string,
    confirmText: string,           // Default: "Confirm"
    cancelText: string,            // Default: "Cancel"
    onConfirm: function,
    onCancel: function
}
```

### API Methods
```javascript
window.MobileConfirm = {
    show(config),
    danger(title, message, onConfirm),
    warning(title, message, onConfirm),
    info(title, message, onConfirm)
}
```

### Mobile Adaptations
- Action sheet style on iOS
- Bottom-aligned buttons (easier thumb reach)
- Haptic feedback on confirm
- Swipe-to-dismiss

### CSS File
`m/app/css/mobile-confirm.css`

---

## Component 5: MobileTree (Tree View)

**Desktop Equivalent:** `ProblerTree` in `js/tree.js`

### Purpose
Hierarchical tree view for displaying nested data structures.

### Configuration Options
```javascript
{
    containerId: string,
    data: object | array,
    expandAll: boolean,            // Default: false
    maxHeight: string,             // Default: '100%'
    onNodeClick: function
}
```

### Key Methods
```javascript
class MobileTree {
    constructor(containerId, config)

    init()
    render()
    renderNode(node, path, level)
    expandAll()
    collapseAll()
    toggleNode(path)
}
```

### Mobile Adaptations
- Larger tap targets for expand/collapse
- Indentation optimized for mobile
- Collapsible by default (save space)
- Smooth expand/collapse animations

### CSS File
`m/app/css/mobile-tree.css`

---

## Component 6: MobileAuth (Authentication Utilities)

**Desktop Equivalent:** `getAuthHeaders()` pattern across files

### Purpose
Centralized authentication utilities.

### API Methods
```javascript
window.MobileAuth = {
    // Headers
    getAuthHeaders(),
    getBearerToken(),

    // Session
    isAuthenticated(),
    getUsername(),

    // API calls
    makeAuthenticatedRequest(url, options),

    // Session management
    login(username, password),
    logout(),

    // Events
    onSessionExpired: function
}
```

### Features
- Automatic 401 handling with redirect
- Token refresh support (if applicable)
- Session storage management
- Centralized error handling

### File
`m/app/js/mobile-auth.js`

---

## Component 7: MobileConfig (Configuration Loader)

**Desktop Equivalent:** `config.js` pattern in each section

### Purpose
Centralized API configuration loading.

### API Methods
```javascript
window.MobileConfig = {
    // Loading
    async load(),
    isLoaded(),

    // Getters
    getApiPrefix(),
    getCachePath(),
    getEndpoint(name),

    // Full config
    getConfig()
}
```

### Configuration Structure
```javascript
{
    api: {
        prefix: '/probler',
        cachePath: '/0/NCache',
        usersPath: '/73/users',
        rolesPath: '/74/roles',
        credsPath: '/75/Creds',
        targetsPath: '/91/Targets',
        registryPath: '/registry',
        healthPath: '/0/Health'
    }
}
```

### File
`m/app/js/mobile-config.js`

---

## File Structure

```
m/app/
├── css/
│   ├── app-base.css           (existing)
│   ├── app-header.css         (existing)
│   ├── app-nav.css            (existing)
│   ├── mobile-table.css       (NEW)
│   ├── mobile-edit-table.css  (NEW)
│   ├── mobile-popup.css       (NEW)
│   ├── mobile-confirm.css     (NEW)
│   └── mobile-tree.css        (NEW)
├── js/
│   ├── app-core.js            (existing)
│   ├── app-components.js      (existing)
│   ├── mobile-auth.js         (NEW)
│   ├── mobile-config.js       (NEW)
│   ├── mobile-table.js        (NEW)
│   ├── mobile-edit-table.js   (NEW)
│   ├── mobile-popup.js        (NEW)
│   ├── mobile-confirm.js      (NEW)
│   └── mobile-tree.js         (NEW)
└── sections/
    ├── dashboard.html         (refactor to use components)
    ├── network.html           (refactor to use MobileTable)
    ├── kubernetes.html        (refactor to use components)
    ├── events.html            (refactor to use components)
    └── ...
```

---

## Implementation Order

### Phase 1: Core Infrastructure
1. `mobile-config.js` - Configuration loading
2. `mobile-auth.js` - Authentication utilities
3. `mobile-popup.css` + `mobile-popup.js` - Modal component
4. `mobile-confirm.css` + `mobile-confirm.js` - Confirmation dialog

### Phase 2: Data Display
5. `mobile-table.css` + `mobile-table.js` - View table component
6. Refactor `network.html` to use MobileTable
7. Refactor `dashboard.html` to use components

### Phase 3: Data Management
8. `mobile-edit-table.css` + `mobile-edit-table.js` - Edit table component
9. `mobile-tree.css` + `mobile-tree.js` - Tree view component

### Phase 4: Section Implementation
10. Implement remaining sections using components
11. Integration testing
12. Performance optimization

---

## Usage Examples

### MobileTable Usage
```javascript
const deviceTable = new MobileTable('devices-container', {
    endpoint: MobileConfig.getApiPrefix() + MobileConfig.getCachePath(),
    modelName: 'NetworkDevice',
    rowsPerPage: 15,
    searchFields: ['equipmentinfo.sysName', 'Id'],
    filters: [{
        key: 'equipmentinfo.deviceStatus',
        type: 'chips',
        options: [
            { value: '', label: 'All' },
            { value: 'DEVICE_STATUS_ONLINE', label: 'Online' },
            { value: 'DEVICE_STATUS_OFFLINE', label: 'Offline' }
        ]
    }],
    columns: [
        { key: 'name', label: 'Name', primary: true },
        { key: 'ip', label: 'IP Address', secondary: true },
        { key: 'status', label: 'Status', statusField: true }
    ],
    transformData: transformDeviceData,
    onCardClick: (item) => showDeviceDetail(item)
});

deviceTable.fetchData(1);
```

### MobilePopup Usage
```javascript
MobilePopup.show({
    title: 'Device Details',
    content: generateDeviceDetailHtml(device),
    size: 'large',
    showFooter: false,
    onShow: () => initDetailTabs()
});
```

### MobileConfirm Usage
```javascript
MobileConfirm.danger(
    'Delete Device',
    'Are you sure you want to delete this device?',
    () => deleteDevice(deviceId)
);
```

---

## Testing Checklist

For each component:
- [ ] Server-side pagination works with large datasets (30K+)
- [ ] Filtering sends queries to server (not client-side)
- [ ] Debounce prevents excessive API calls
- [ ] Loading states display correctly
- [ ] Error states handle gracefully
- [ ] Empty states show appropriate message
- [ ] Touch interactions are responsive
- [ ] Works on iOS Safari
- [ ] Works on Android Chrome
- [ ] Works on tablets (larger screens)
- [ ] Accessibility: screen reader compatible
- [ ] Performance: smooth scrolling and animations
