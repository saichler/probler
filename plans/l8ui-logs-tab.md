# Plan: Re-introduce Logs Tab in the L8UI System Section

## Context
During the L8UI migration (Phase 5a+5b), the System section was rebuilt as `sys.html` with three tabs: Health, Security, and Modules. The old `system.html` had a fourth tab — **Logs** — which loaded `logsui/index.html` in an iframe. This tab was dropped during the migration. The Logs UI is a generic Layer 8 component (not probler-specific), so it belongs in the `l8ui/sys/` directory alongside Health, Security, and Modules.

## What the Logs UI Does (original iframe version)
The existing `logsui/` code (still present as dead iframe code) had a two-panel layout:
- **Left panel**: File system tree (directories + files)
- **Right panel**: Log content viewer with byte-based pagination (5KB pages)

## UX Change from Original
The new implementation changes the layout:
- **Tab content**: File system tree only (full width, cleaner browsing)
- **File click**: Opens log content in a **Layer8DPopup** (`size: 'xlarge'`), same pattern as Health detail modal
- **Popup content**: Pagination bar + terminal-style black log display with monospace text
- This gives the log viewer more screen real estate and keeps the tree always visible behind the popup

## Backend API Contract

### Service Registration (from `l8logfusion/go/agent/common/common.go`)
- **ServiceName**: `"logs"`
- **ServiceArea**: `87`
- **Model type**: `L8File` (from `l8logfusion/go/types/l8logf/logs.pb.go`)
- **Primary keys**: `Path`, `Name`
- **Registered in probler**: `go/prob/newui/main.go:98` — `nic.Resources().Registry().Register(&l8logf.L8File{})`

### Endpoint
Both API calls use the same endpoint with different query payloads:
```
GET {apiPrefix}/87/logs?body={URL-encoded JSON}
```
The `body` query parameter contains JSON: `{ "text": "<L8QL query>" }`

### API Call 1: Load File Tree
**Purpose**: Get the entire directory/file hierarchy
```
Query:  select * from l8file where path="*" mapreduce true
URL:    /probler/87/logs?body=%7B%22text%22%3A%22select%20*%20from%20l8file%20where%20path%3D%5C%22*%5C%22%20mapreduce%20true%22%7D
```
**Response** — `L8File` (recursive tree):
```json
{
  "isDirectory": true,
  "files": [
    {
      "isDirectory": true,
      "name": "192.168.86.220",
      "path": "/data/logdb",
      "files": [
        {
          "isDirectory": false,
          "name": "log.log",
          "path": "/data/logdb/192.168.86.220/logs"
        }
      ]
    }
  ]
}
```
**L8File protobuf fields** (JSON names):
- `isDirectory` (bool) — true for directories
- `name` (string) — file or directory name
- `path` (string) — parent directory path
- `files` ([]*L8File) — child entries (recursive, only for directories)
- `data` (*L8FileData) — file content (only populated by API Call 2)

### API Call 2: Load File Content (paginated)
**Purpose**: Read a specific page of a log file's content
```
Query:  select * from l8file where path=/data/logdb/192.168.86.220/logs and name = log.log limit 1 page 0 mapreduce true
```
- `path` = file's parent directory (from tree item's `.path`)
- `name` = filename (from tree item's `.name`)
- `page` = 0-indexed page number
- Server reads 5120 bytes (5KB) at offset `page * 5120`

**Response** — `L8File` with populated `data`:
```json
{
  "path": "/data/logdb/192.168.86.220/logs",
  "name": "log.log",
  "data": {
    "page": 0,
    "size": 524288,
    "content": "2025-01-15 10:23:45 INFO  Starting service...\n..."
  }
}
```
**L8FileData protobuf fields** (JSON names):
- `limit` (int32)
- `page` (int32) — current page number
- `size` (int32) — total file size in bytes
- `content` (string) — up to 5KB of file content for the requested page

### Pagination Logic (client-side)
```javascript
const bytesPerPage = 5120;  // 5KB per page
const totalPages = Math.ceil(data.data.size / bytesPerPage);
const startByte = currentPage * bytesPerPage + 1;
const endByte = Math.min(startByte + content.length - 1, data.data.size);
```

## Implementation Steps

### Step 1: Create `l8ui/sys/logs/l8logs.js` (~250 lines)
**New file**: `go/prob/newui/web/l8ui/sys/logs/l8logs.js`

Port the `logsui/app.js` logic into a namespaced `L8Logs` component following the same pattern as `L8Health`:

**Tab content — File tree only:**
- `window.L8Logs = { initialize: function() { ... } }`
- On init, build the file tree inside `logs-table-container` (full width, no split panel)
- Fetch tree via `makeAuthenticatedRequest()` using `Layer8DConfig.resolveEndpoint('/87/logs')`
- Render directories (expandable/collapsible) and files
- This is NOT the same as ProblerTree (`js/tree.js`) which renders JSON object trees. The log file tree is a file-system browser with different semantics.

**File click — Open Layer8DPopup with log content:**
- On file click, call `Layer8DPopup.show()` with `size: 'xlarge'`
- Popup title: file path + name (e.g., `"Log: /data/logdb/192.168.86.220/logs/log.log"`)
- Popup content: pagination bar (top) + black terminal-style `<pre>` for log text
- Fetch first page (page 0) immediately when popup opens
- Pagination buttons (First, Prev, Next, Last) update the popup content in-place
- `showFooter: false` (same as Health detail modal)

**Key functions:**
- `initialize()` — build tree container HTML, call `loadTreeData()`
- `loadTreeData()` — fetch tree from API, call `renderTree()`
- `renderTree(data)` / `createTreeItem(item)` — build DOM tree with expand/collapse
- `openLogFile(fileItem)` — call `Layer8DPopup.show()`, then `loadLogPage()`
- `loadLogPage(filePath, page)` — fetch page content, update popup innerHTML
- `buildPopupContent(content, page, totalSize)` — generate pagination bar + pre block

### Step 2: Create `l8ui/sys/logs/l8logs.css` (~120 lines)
**New file**: `go/prob/newui/web/l8ui/sys/logs/l8logs.css`

Extract relevant styles from `logsui/styles.css`, **excluding**:
- `*` universal selector (global reset)
- `body` rules
- `.app-container`, `.main-content`, `.section-container` rules
- `.log-header-frame` and parallax rules (header is already in `sys.html`)
- Scrollbar overrides (use page defaults)
- Two-column layout rules (no longer needed — tree is full width, content is in popup)

Prefix all class names with `l8logs-` to avoid collisions. Include:

**Tree styles (tab content):**
- `.l8logs-tree-container` — scrollable tree area
- `.l8logs-tree-item`, `.l8logs-tree-node` — tree item layout + hover/selected states
- `.l8logs-tree-children`, `.l8logs-tree-children.collapsed` — expand/collapse
- `.l8logs-folder-icon`, `.l8logs-file-icon` — emoji-based icons
- `.l8logs-tree-name` — file/directory label

**Popup content styles (inside Layer8DPopup):**
- `.l8logs-pagination-container` — flex bar with info + buttons
- `.l8logs-pagination-btn` — styled page nav buttons
- `.l8logs-log-content` — black background terminal area
- `.l8logs-log-display` — monospace `<pre>`, white text on black, `white-space: pre`

### Step 3: Update `sys.html`
**File**: `go/prob/newui/web/sections/sys.html`

Add a Logs tab button (after Modules):
```html
<button class="l8-module-tab" data-module="logs">
    <span class="tab-icon">📋</span>
    <span class="tab-label">Logs</span>
</button>
```

Add Logs content div (after modules content div):
```html
<div class="l8-module-content" data-module="logs">
    <div class="l8-table-container" id="logs-table-container"></div>
</div>
```

### Step 4: Update `l8sys-config.js`
**File**: `go/prob/newui/web/l8ui/sys/l8sys-config.js`

Add logs module to `L8Sys.modules`:
```javascript
'logs': {
    label: 'Logs',
    icon: '📋',
    services: []
}
```

### Step 5: Update `l8sys-init.js`
**File**: `go/prob/newui/web/l8ui/sys/l8sys-init.js`

Add `L8Logs.initialize()` call in the `initializeL8Sys` wrapper (line 37):
```javascript
if (window.L8Logs) L8Logs.initialize();
```

### Step 6: Update `app.html`
**File**: `go/prob/newui/web/app.html`

Add CSS include in `<head>`:
```html
<link rel="stylesheet" href="l8ui/sys/logs/l8logs.css">
```

Add JS include before `l8sys-init.js` (script loading order matters):
```html
<script src="l8ui/sys/logs/l8logs.js"></script>
```

### Step 7: Delete dead `logsui/` files
After the new component is working, delete the old iframe-based files:
- `go/prob/newui/web/logsui/app.js`
- `go/prob/newui/web/logsui/styles.css`
- `go/prob/newui/web/logsui/index.html`
- `go/prob/newui/web/logsui/parallax.js`
- `go/prob/newui/web/logsui/test.html`
- `go/prob/newui/web/logsui/console-test.html`
- `go/prob/newui/web/logsui/debug.html`

## Files Modified (Summary)

| Action | File |
|--------|------|
| **Create** | `l8ui/sys/logs/l8logs.js` |
| **Create** | `l8ui/sys/logs/l8logs.css` |
| **Edit** | `sections/sys.html` — add tab + content div |
| **Edit** | `l8ui/sys/l8sys-config.js` — add logs module |
| **Edit** | `l8ui/sys/l8sys-init.js` — add L8Logs.initialize() |
| **Edit** | `app.html` — add CSS + JS includes |
| **Delete** | `logsui/` directory (7 files) |

## Key Design Decisions
1. **Not reusing ProblerTree** — ProblerTree (`js/tree.js`) renders JSON object trees with type-based emoji mapping. The log file tree is a file-system browser (directories + files) with different semantics. Building a dedicated tree renderer inside l8logs.js is simpler and avoids coupling.
2. **Using `makeAuthenticatedRequest()`** — already global in `app.js`, provides auth + 401 redirect. No need to duplicate.
3. **Using `Layer8DConfig.resolveEndpoint()`** — consistent with all other l8ui components (Health, Network, K8s).
4. **CSS namespacing** — all classes prefixed with `l8logs-` to prevent style leaks (lesson from Phase 5d iframe CSS bug).

## Verification
1. Navigate to System section, verify all 4 tabs appear: Health, Security, Modules, Logs
2. Click Logs tab — file tree should load from the server (full width in tab content)
3. Expand a directory in the tree — child files/directories appear
4. Click a log file — Layer8DPopup opens (xlarge) with log content and pagination bar
5. Verify pagination info shows byte range and page number
6. Use pagination buttons (First, Prev, Next, Last) — popup content updates in-place
7. Close popup — tree is still visible and selection persists
8. Verify no CSS leaks to other tabs/sections
9. Verify the old `logsui/` iframe references are gone
