# Real-Time Change Notifications via WebSocket

## Overview

Add push-based real-time data updates to l8ui. When a user views a table (or any view), changes to displayed records are pushed from the server and applied in-place — no polling, no refresh, no context loss.

## Rule Compliance

Reviewed against all 120 rules in `../l8book/rules/`. Applicable rules and their compliance:

| Rule | Status | Notes |
|------|--------|-------|
| plan-approval-workflow | Compliant | Written to `./plans/`, awaiting approval |
| plan-traceability-and-verification | Compliant | Traceability matrix + Phase 7 verification |
| plan-duplication-audit | Compliant | `Layer8DWebSocket` is shared by both platforms. Notification handler is ~30 lines per data source (same contract, no shared prototype chain — same pattern as `buildQuery`/`fetchData`). See Phase 6 audit. |
| never-edit-vendor | Compliant | All Go changes target sibling projects, not `go/vendor/` |
| l8ui-no-project-specific-code | Compliant | `Layer8DWebSocket` is generic — no project references |
| l8ui-theme-compliance | Compliant | CSS uses `var(--layer8d-warning)`, no hardcoded colors |
| protobuf-generation | Compliant | Phase 1.1 runs `make-bindings.sh` |
| proto-enum-zero-value | N/A | No new enums |
| mobile-rules (parity) | Compliant | Phase 6 covers mobile |
| no-go-generics | Compliant | No generics in Go code |
| desktop-script-loading-order | Compliant | Phase 4.2 specifies exact position |
| mobile-script-loading-order | Compliant | Phase 6.1 specifies exact position |
| maintainability (500-line limit) | Compliant | All new files are single-responsibility; largest is ~150 lines |
| security-provider-interface | Compliant | WebSocket auth uses existing `ISecurityProvider` token validation (Phase 3.3) |
| architecture-overview | Action needed | `Layer8DWebSocket` must be added to dependency graph after implementation |
| deployment-artifacts | N/A | No new deployable services — WebSocket endpoint is added to existing l8web |
| test-location-and-approach | N/A for l8utils/l8ql | Tests in l8utils and l8ql follow those projects' own conventions (library unit tests alongside source). Probler integration tests go in `go/tests/` per the rule |
| vendor-third-party-code | Compliant | Re-vendor steps included in Phase 1.4 and 3.5 |

## Architecture

```
Client (Browser)                          Server
─────────────────                         ──────
Layer8DTable                              l8utils Cache
  │                                         │
  ├─ fetchData() with register=true         │
  │   GET /probler/5/NetDev?body=...        │
  │                                         ├─ Stores subscription:
  │                                         │    query → token → {page, pageSize}
  │                                         │
  ├─ Layer8DWebSocket ◄──── WSS ────────── l8web WebSocket endpoint
  │   (single connection per tab/token)     │   (per-token connection registry)
  │                                         │
  │   On item change in cache:              │
  │                                         ├─ Cache detects change (Post/Put/Patch/Delete)
  │                                         ├─ Finds registered tokens whose page includes this item
  │                                         ├─ Sends notification via L8Bus → l8web server group
  │                                         ├─ l8web finds WebSocket for token → pushes message
  │                                         │
  │   ◄─── { type, model, primaryKey,  ◄───┘
  │          record, action }
  │
  ├─ Layer8DDataSource receives notification
  ├─ action=update: find by PK, replace in-place, apply transformData, re-render row
  ├─ action=add/delete: show popup "Page content changed, refresh?"
  │     User clicks Refresh → fetchData(currentPage)
  │     User clicks Ignore → disregard notifications until next manual refresh
  └─ If view-mode detail popup open for this record → updates popup too
```

## Design Decisions

1. **Notification carries the full record** — no secondary fetch needed, no flash of stale data
2. **Single WebSocket per tab** — each browser tab opens its own WebSocket keyed by its bearer token. Multiple tabs for the same user work independently
3. **Subscriptions keyed by token, not user** — each tab's bearer token is unique, so subscriptions are per-token. Tab 1 viewing page 1 and tab 2 viewing page 3 are independent subscriptions
4. **Subscription via L8Query** — `register=true` piggybacks on existing query; server knows exact model, filters, page
5. **In-place row update for field changes** — no table re-render, no scroll reset, no filter/sort state loss
6. **Popup for page structure changes** — when rows are added/deleted (shifting page boundaries), show "Page content changed, refresh?" instead of silently mutating. If user ignores, disregard further notifications until next manual refresh
7. **L8Bus broadcast to l8web group** — works with multiple l8web instances behind load balancer
8. **Unregister on page change** — when user navigates away or changes page, old subscription is replaced
9. **Edit mode is frozen in time** — detail popups in edit mode do NOT receive notifications. Only view-mode popups update live. Edit mode represents the user's point-in-time snapshot; FIFO between users is the natural conflict resolution
10. **Notifications go through transformData** — incoming records are run through the same `transformData` function used during normal fetch, so the data in `this.data` is always in the transformed format

## Notification Message Format

```json
{
  "action": "update",
  "modelType": "NetworkDevice",
  "primaryKey": "dev-001",
  "record": { ... full record ... }
}
```

Actions: `update`, `add`, `delete`

---

## Phase 1: L8Query — Add `register` keyword ✅ COMPLETE

**Project: l8ql** (`../l8ql`)

### 1.1 Protobuf field

**File: `../l8types/proto/api.proto`**
- Add `bool register = 15;` to the `L8Query` message

**Run:** `cd ../l8types/proto && ./make-bindings.sh`

### 1.2 IQuery interface

**File: `../l8types/go/ifs/API.go`**
- Add `Register() bool` method to the `IQuery` interface

**Run:** `make-bindings.sh` not needed (pure Go interface change). Re-vendor l8types into l8ql after this.

### 1.3 Parser keyword

**File: `../l8ql/go/gsql/parser/Query.go`**
- Add `Register = "register"` constant (~line 82)
- Add `Register` to `words` slice (~line 86)
- Add `register_` field to `parsed` struct
- In `split()`: extract `register_` via `getBoolTag(sql, Register)`
- In `init()`: set `this.pquery.Register = true` if `register_` is `"true"` or present as bare keyword

### 1.4 Interpreter implementation

**File: `../l8ql/go/gsql/interpreter/Query.go`**
- Add `Register() bool` method to the `Query` struct, returning `this.query.Register`
- This satisfies the `IQuery` interface contract added in 1.2

### 1.5 Tests

**File: `../l8ql/go/tests/Parser_test.go`**
- Add test: `select * from NetworkDevice limit 15 page 0 register=true`
- Verify `query.Register == true`
- Add test: query without register → `query.Register == false`

**File: `../l8ql/go/tests/Interpreter_test.go`**
- Add test: `select * from testproto where mystring=hello register=true` → verify `q.Register() == true`
- Add test: query without register → verify `q.Register() == false`

### 1.6 Re-vendor

After l8types and l8ql changes are committed:
```bash
cd go && rm -rf go.sum go.mod vendor && go mod init && GOPROXY=direct GOPRIVATE=github.com go mod tidy && go mod vendor
```

---

## Phase 2: l8utils Cache — Subscription Tracking ✅ COMPLETE

**Project: l8utils** (`../l8utils`)

### 2.1 Subscription data structure

**New file: `../l8utils/go/utils/cache/Subscriptions.go`** (estimated ~100 lines — well under 500-line limit per `maintainability.md`)

```go
// Subscription represents a single browser tab's interest in a model type.
type Subscription struct {
    Token     string // bearer token — unique per browser tab
    QueryHash string // hash of the L8Query for deduplication
    QueryText string // original L8Query text (for re-evaluation if needed)
}

// subscriptions is a per-Cache subscription list.
// Key: token → *Subscription (one subscription per token per cache).
// Each Cache is already per-model-type, so no model type key needed.
type subscriptions struct {
    mu   sync.RWMutex
    subs map[string]*Subscription // token → subscription
}
```

Methods on `subscriptions`:
- `register(sub *Subscription)` — add/replace subscription for a token (same token replaces previous query)
- `unregister(token string)` — remove subscription for a token
- `subscribers() []*Subscription` — return all active subscriptions (copy of slice)
- `hasSubscribers() bool` — quick check if any subscriptions exist

Design notes:
- Per-Cache, not global: each Cache instance (one per model type) has its own `subscriptions` field. This avoids a model-type key in the registry since the Cache already knows its `modelType`.
- One subscription per token per cache: if a browser tab changes pages or filters, the new subscription replaces the old one for that token. A tab can only view one page of one model at a time.
- `UnregisterAll(token)` across all caches: handled in Phase 3 at the l8web level — the WebSocket manager iterates all known caches on disconnect.

### 2.2 Cache integration

**File: `../l8utils/go/utils/cache/Cache.go`**

Add `subs *subscriptions` field to the `Cache` struct. Initialize in `NewCache()`.

Add public methods on `Cache`:
- `RegisterSubscription(token, queryHash, queryText string)` — called by service handler after Fetch when `q.Register()` is true. The token comes from the HTTP request context, not from the query itself.
- `UnregisterSubscription(token string)` — removes subscription for a token from this cache
- `Subscribers() []*Subscription` — returns all subscriptions for this cache's model type. Called by service handler after mutation to determine which tokens to notify.
- `HasSubscribers() bool` — quick check, avoids allocation when no subscriptions exist.

Mutation methods (Post.go, Put.go, Patch.go, Delete.go) are **not modified** in Phase 2. The subscription lookup and WebSocket forwarding are wired in Phase 3 at the l8web service handler level, which:
1. Calls cache mutation method → gets L8NotificationSet
2. Calls `cache.Subscribers()` → gets list of tokens to notify
3. Sends targeted notification via WebSocket to each token

This avoids changing the mutation method signatures (which would be a breaking change across all callers) and keeps subscription awareness at the service handler level where the token context is available.

### 2.3 Tests

**File: `../l8utils/go/tests/CacheSubscriptions_test.go`**

- Test `register()` adds a subscription, `subscribers()` returns it
- Test `register()` with same token replaces previous subscription
- Test `unregister()` removes a specific token
- Test `subscribers()` returns copy (modifying returned slice doesn't affect registry)
- Test `hasSubscribers()` returns false when empty, true when populated
- Test concurrent register/unregister safety (goroutine stress test)

---

## Phase 3: AAAId in IQuery + l8web WebSocket Endpoint

Phase 3 adds the AAAId to IQuery so it flows from the REST handler all the way to the cache, enabling subscription keying by AAAId. The WebSocketManager also keys connections by AAAId (returned by ValidateToken), creating a direct mapping: cache subscription AAAId → WebSocket connection AAAId.

### 3.1 Add AAAId to L8Query proto

**Project: l8types** (`../l8types`)

**File: `../l8types/proto/api.proto`**

Add to the L8Query message:
```protobuf
string aaa_id = 16;
```

**Run:** `cd ../l8types/proto && ./make-bindings.sh`

### 3.2 Add AAAId to IQuery interface

**File: `../l8types/go/ifs/API.go`**

Add to the `IQuery` interface:
```go
AAAId() string
SetAAAId(string)
```

### 3.3 Interpreter implementation

**Project: l8ql** (`../l8ql`)

**File: `../l8ql/go/gsql/interpreter/Query.go`**

Add methods:
```go
func (this *Query) AAAId() string {
    return this.query.AaaId
}

func (this *Query) SetAAAId(aaaId string) {
    this.query.AaaId = aaaId
}
```

Note: AAAId is NOT parsed from query text — it is set programmatically by the REST handler before the query reaches the service. No parser changes needed.

### 3.4 Update l8utils cache subscriptions to use AAAId

**Project: l8utils** (`../l8utils`)

**File: `../l8utils/go/utils/cache/Subscriptions.go`**

Change `Token` field to `AAAId` in `Subscription` struct. Update map key from token to AAAId:
```go
type Subscription struct {
    AAAId     string
    QueryHash string
    QueryText string
    lastSeen  int64
}
```

**File: `../l8utils/go/utils/cache/Cache.go`**

Change `RegisterSubscription(token, queryHash, queryText string)` to `RegisterSubscription(aaaId, queryHash, queryText string)`.
Change `UnregisterSubscription(token string)` to `UnregisterSubscription(aaaId string)`.

### 3.5 l8web WebSocketManager keyed by AAAId

**Project: l8web** (`../l8web`)

The existing `WebSocketManager.go` stores connections in `map[string]*wsConn`. Change the key from bearer token to AAAId:
- In `HandleUpgrade`: call `ValidateToken(token, vnic)` which returns `(aaaId, ok)`. Store connection as `connections[aaaId]`.
- In `Remove`: takes AAAId parameter.
- In `OnNotification`: broadcasts to all connections (unchanged — client-side filtering by modelType).

Note: Multiple browser tabs for the same user share the same AAAId, so a new tab replaces the previous connection. For multi-tab support, the key can later be extended to `aaaId + tabId`.

### 3.6 Register WebSocket endpoint (already done)

The `/ws` endpoint and WebSocketManager are already registered in `WebService.go` Activate().

### 3.7 Re-vendor

After l8types, l8ql, l8utils, and l8web changes are committed, re-vendor in probler.

---

## Phase 4: l8ui Client — WebSocket Manager

**Project: l8ui** (`../l8ui`)

### 4.1 New shared component

**New file: `../l8ui/shared/layer8d-websocket.js`**

```javascript
window.Layer8DWebSocket = (function() {
    var ws = null;
    var listeners = {};  // modelType → [callback]
    var reconnectDelay = 1000;
    var maxReconnectDelay = 30000;

    function connect() {
        var token = sessionStorage.bearerToken;
        if (!token) return;

        var protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        var url = protocol + '//' + location.host + '/ws?token=' + token;

        ws = new WebSocket(url);

        ws.onopen = function() {
            reconnectDelay = 1000;
        };

        ws.onmessage = function(event) {
            var msg = JSON.parse(event.data);
            var cbs = listeners[msg.modelType];
            if (cbs) {
                cbs.forEach(function(cb) { cb(msg); });
            }
        };

        ws.onclose = function() {
            // Exponential backoff reconnect
            setTimeout(connect, reconnectDelay);
            reconnectDelay = Math.min(reconnectDelay * 2, maxReconnectDelay);
        };
    }

    return {
        init: function() { connect(); },

        subscribe: function(modelType, callback) {
            if (!listeners[modelType]) listeners[modelType] = [];
            listeners[modelType].push(callback);
            return function unsubscribe() {
                listeners[modelType] = listeners[modelType].filter(
                    function(cb) { return cb !== callback; }
                );
            };
        },

        disconnect: function() {
            if (ws) ws.close();
        }
    };
})();
```

### 4.2 Script loading order

**Desktop** — add to `desktop-script-loading-order.md` and all project `app.html` files.
Position: after `layer8d-config.js`, before factory components (needs auth token from sessionStorage, no other dependencies):
```html
<!-- JS: Layer8 Core -->
<script src="l8ui/shared/layer8d-config.js"></script>
<script src="l8ui/shared/layer8d-websocket.js"></script>   <!-- NEW -->
<script src="l8ui/shared/layer8d-utils.js"></script>
```

**Mobile** — add to `mobile-script-loading-order.md` and all project `m/app.html` files.
Position: reuse the same desktop file (it's framework-agnostic, uses only `sessionStorage.bearerToken` and `window.WebSocket`):
```html
<!-- JS: Shared Desktop Utilities (needed for currency cache, renderers) -->
<script src="../l8ui/shared/layer8d-config.js"></script>
<script src="../l8ui/shared/layer8d-websocket.js"></script>   <!-- NEW (shared with desktop) -->
<script src="../l8ui/shared/layer8d-utils.js"></script>
```

**Rule update**: After implementation, update `../l8book/rules/desktop-script-loading-order.md` and `../l8book/rules/mobile-script-loading-order.md` to include `layer8d-websocket.js` in their canonical loading orders. Also update `../l8book/rules/architecture-overview.md` to add `Layer8DWebSocket` to the dependency graph under "Layer8 Core", after `Layer8DConfig`.

### 4.3 Initialize on app startup

In each project's `app.js`, after successful auth:
```javascript
if (typeof Layer8DWebSocket !== 'undefined') {
    Layer8DWebSocket.init();
}
```

---

## Phase 5: l8ui Client — Data Source & Table Integration

### 5.1 Layer8DDataSource — register flag in query

**File: `../l8ui/shared/layer8d-data-source.js`**

In `buildQuery()`, if a new option `realtime: true` is set on the data source:
- Append `register=true` to the L8Query string

Add a new config option:
```javascript
var ds = new Layer8DDataSource({
    // ...existing options...
    realtime: true  // opt-in to change notifications
});
```

### 5.2 Layer8DDataSource — subscribe to WebSocket

In `fetchData()`, after a successful fetch with `realtime: true`:
- Subscribe to `Layer8DWebSocket` for the `modelName`
- Store the unsubscribe function
- On notification:
  - If `action === 'update'`: find item in `this.data` by primary key, replace, trigger callback
  - If `action === 'delete'`: remove item from `this.data`, trigger callback
  - If `action === 'add'`: only relevant if item falls within current page (server determines this)

Add method:
```javascript
Layer8DDataSource.prototype._handleChangeNotification = function(msg) {
    if (this._notificationsPaused) return;

    var pk = this.primaryKey || 'id';

    if (msg.action === 'update') {
        // Apply transformData (same pipeline as normal fetch)
        var record = this.transformData ? this.transformData(msg.record) : msg.record;
        var index = -1;
        for (var i = 0; i < this.data.length; i++) {
            if (this.data[i][pk] === msg.primaryKey) {
                index = i;
                break;
            }
        }
        if (index >= 0) {
            this.data[index] = record;
            if (this.onItemChanged) this.onItemChanged(record, index, 'update');
        }
    } else if (msg.action === 'delete' || msg.action === 'add') {
        // Page structure changed — ask user instead of silently mutating
        this._notificationsPaused = true;
        if (this.onPageStructureChanged) {
            this.onPageStructureChanged(msg.action, function refresh() {
                // User chose to refresh
                this._notificationsPaused = false;
                this.fetchData(this.currentPage);
            }.bind(this), function ignore() {
                // User chose to ignore — stay paused until next manual refresh
            }.bind(this));
        }
    }
};
```

The `onPageStructureChanged(action, onRefresh, onIgnore)` callback is wired by the table/view to show a non-intrusive popup: "Page content changed — rows were {added/deleted}. Refresh?" with Refresh and Ignore buttons. If the user ignores, `_notificationsPaused` stays `true` and all further notifications are discarded until the user manually refreshes (pagination, filter, sort, or explicit refresh).

### 5.3 Layer8DTable — in-place row update

**File: `../l8ui/edit_table/layer8d-table-render.js`**

Add method for surgical row update:
```javascript
Layer8DTable.prototype.updateRow = function(index, item) {
    var tbody = this.container.querySelector('tbody');
    if (!tbody) return;
    var existingRow = tbody.rows[index];
    if (!existingRow) return;

    var tempDiv = document.createElement('div');
    tempDiv.innerHTML = '<table><tbody>' + this.renderRow(item, index) + '</tbody></table>';
    var newRow = tempDiv.querySelector('tr');

    existingRow.replaceWith(newRow);
    this.reattachRowEvents(newRow, index);
};
```

**File: `../l8ui/edit_table/layer8d-table-data.js`**

Wire up the data source callbacks:
```javascript
// In init or fetchData, after setting up data source:

// In-place row update (field changes only — no page structure mutation)
this.dataSource.onItemChanged = function(record, index, action) {
    self.data[index] = record;
    self.updateRow(index, record);
};

// Page structure changed (add/delete shifted rows)
this.dataSource.onPageStructureChanged = function(action, onRefresh, onIgnore) {
    Layer8DNotification.warning(
        'Page content changed — rows were ' + action + 'd.',
        null,  // no detail list
        [
            { text: 'Refresh', onClick: onRefresh },
            { text: 'Ignore', onClick: onIgnore }
        ]
    );
};
```

Reset `_notificationsPaused = false` in `fetchData()` so that any manual page change (pagination, filter, sort) re-enables notifications.

### 5.4 Visual indicator for changed rows

When a row is updated in-place, briefly highlight it so the user notices the change:
```javascript
newRow.classList.add('layer8d-row-changed');
setTimeout(function() {
    newRow.classList.remove('layer8d-row-changed');
}, 2000);
```

**CSS (in `layer8d-table.css`):**
```css
.layer8d-row-changed {
    animation: layer8d-row-flash 2s ease-out;
}
@keyframes layer8d-row-flash {
    0% { background-color: var(--layer8d-warning); opacity: 0.3; }
    100% { background-color: transparent; }
}
```

### 5.5 Detail popup live update (view mode only)

**File: `../l8ui/shared/layer8d-forms-modal.js`**

When `openViewForm()` is called, subscribe to the WebSocket for that record's model+primaryKey. If a notification arrives for the open record:
- Apply `transformData` to the incoming record
- Re-render the form HTML with the new data
- Unsubscribe when the popup is closed

**Edit mode does NOT subscribe.** Edit mode is a point-in-time snapshot — the user's edits are in progress and FIFO between users is the natural conflict resolution. No notification, no warning, no merge logic. The last user to save wins.

### 5.6 Unsubscribe on cleanup

When a table is destroyed, a section is unloaded, or the user navigates away:
- Call the stored unsubscribe function to stop receiving notifications for that model
- The next `fetchData()` with `register=true` on the new page will create a new subscription

---

## Phase 6: Mobile Parity

### Duplication audit (per `plan-duplication-audit.md`)

Both `Layer8DDataSource` and `Layer8MDataSource` share the same data contract (`this.data` array, `this.transformData`, `this.primaryKey`, `buildQuery()`, `fetchData()`). The notification handler logic is ~30 lines added to each class's prototype, operating on the same `this.data` array with the same callbacks (`onItemChanged`, `onPageStructureChanged`). This is the same pattern as `buildQuery()` and `fetchData()` which are also implemented independently in each class with the same contract. No extraction needed — the classes have no shared prototype chain and the logic is small.

- **`Layer8DWebSocket`** (Phase 4.1) is shared between desktop and mobile — one file, included in both loading orders
- **Row/card update rendering** is the only platform-specific code — desktop updates `<tr>` elements, mobile updates card `<div>` elements

### 6.1 Mobile WebSocket manager

No new file needed. Include the desktop `layer8d-websocket.js` in mobile `m/app.html` (see Phase 4.2 loading order). `Layer8DWebSocket` uses only `sessionStorage.bearerToken` and the native `WebSocket` API — no desktop-specific dependencies.

### 6.2 Mobile data source integration

**File: `../l8ui/m/js/layer8m-data-source.js`**

- Add `realtime` option to constructor
- In `buildQuery()`: append `register=true` when `realtime` is set
- In `fetchData()`: subscribe to `Layer8DWebSocket` for `this.modelName`, reset `_notificationsPaused = false`
- Add `_handleChangeNotification` with the same contract as desktop: apply `transformData` on update, call `onItemChanged` for in-place updates, call `onPageStructureChanged` for add/delete with refresh/ignore callbacks

### 6.3 Mobile table integration

**File: `../l8ui/m/js/layer8m-table.js`**

Wire up `onItemChanged` from the data source. Platform-specific rendering only:
- **Update**: find card by `[data-id="${primaryKey}"]`, replace card HTML via `renderCard()`, add highlight animation
- **Delete**: remove card element, update count display
- **Add**: append new card, add highlight animation

**CSS (in `layer8m-table.css`):**
```css
.layer8m-card-changed {
    animation: layer8m-card-flash 2s ease-out;
}
@keyframes layer8m-card-flash {
    0% { background-color: var(--layer8d-warning); opacity: 0.3; }
    100% { background-color: transparent; }
}
```

---

## Phase 7: End-to-End Verification

1. Start probler locally with all services
2. Open Network Devices table on desktop — verify WebSocket connects
3. From a second browser/tab, modify a network device field via the API
4. Verify the first browser updates the row in-place without refresh
5. Verify the row highlight animation fires
6. Verify `transformData` is applied (transformed fields display correctly, not raw values)
7. Delete a device from the second tab — verify first tab shows "Page content changed" popup
8. Click "Refresh" — verify page re-fetches and notifications resume
9. Delete again — click "Ignore" — verify further notifications are discarded
10. Change page/filter/sort — verify notifications resume (paused state cleared)
11. Open a detail popup in **view mode** — modify record from second tab — verify popup updates live
12. Open a detail popup in **edit mode** — modify record from second tab — verify NO notification arrives
13. Open two browser tabs for same user — verify each tab has independent subscriptions (different pages work independently)
14. Verify mobile parity — repeat tests 3-12 on mobile UI
15. Verify WebSocket reconnects after disconnect (kill and restart l8web)
16. Verify unsubscribe on section navigation (no stale notifications from previous section)

---

## Traceability Matrix

| # | Component | Change | Phase |
|---|-----------|--------|-------|
| 1 | L8Query protobuf | Add `register` field | Phase 1.1 |
| 2 | IQuery interface | Add `Register() bool` to IQuery in l8types ifs | Phase 1.2 |
| 3 | L8Query parser | Parse `register=true` keyword | Phase 1.3 |
| 4 | L8Query interpreter | Add `Register()` method to interpreter Query | Phase 1.4 |
| 5 | L8Query parser tests | Verify register parsing | Phase 1.5 |
| 6 | l8utils cache | Subscription data structure (per-cache) | Phase 2.1 |
| 7 | l8utils cache | Cache integration (RegisterSubscription, Subscribers) | Phase 2.2 |
| 8 | l8utils cache | Subscription tests | Phase 2.3 |
| 9 | l8web | WebSocket connection manager | Phase 3.2 |
| 10 | l8web | WebSocket endpoint `/ws` with ISecurityProvider auth | Phase 3.3 |
| 11 | l8web | L8Bus notification → WebSocket forward | Phase 3.4 |
| 12 | l8ui | Layer8DWebSocket shared component | Phase 4.1 |
| 13 | l8ui | Desktop script loading order update | Phase 4.2 |
| 14 | l8ui | Mobile script loading order update (shared file) | Phase 4.2 |
| 15 | l8ui | App.js WebSocket init | Phase 4.3 |
| 16 | l8ui | DataSource register=true in query | Phase 5.1 |
| 17 | l8ui | DataSource subscribe + shared notification handler | Phase 5.2 |
| 18 | l8ui | Table in-place row update | Phase 5.3 |
| 19 | l8ui | Row change highlight animation | Phase 5.4 |
| 20 | l8ui | Detail popup live update | Phase 5.5 |
| 21 | l8ui | Unsubscribe on cleanup | Phase 5.6 |
| 22 | l8ui mobile | WebSocket manager (reuse desktop file) | Phase 6.1 |
| 23 | l8ui mobile | DataSource integration (shared handler) | Phase 6.2 |
| 24 | l8ui mobile | Table card update + highlight CSS | Phase 6.3 |
| 25 | l8book rules | Update desktop-script-loading-order.md | Phase 4.2 |
| 26 | l8book rules | Update mobile-script-loading-order.md | Phase 4.2 |
| 27 | l8book rules | Update architecture-overview.md dependency graph | Phase 4.2 |
| 28 | All | End-to-end verification | Phase 7 |

---

## Projects Affected

| Project | Changes | Dependency Order |
|---------|---------|-----------------|
| **l8types** | Add `register` field to L8Query proto | 1st (proto definition) |
| **l8ql** | Parse `register` keyword | 2nd (depends on l8types) |
| **l8utils** | Subscription registry in cache | 3rd (depends on l8types for notification types) |
| **l8web** | WebSocket endpoint + manager (auth via ISecurityProvider) | 4th (depends on l8utils for notifications) |
| **l8ui** | Client WebSocket + component integration | 5th (independent of Go changes, but needs server for testing) |
| **l8book** | Update 3 rule files (loading orders + architecture overview) | After l8ui (documents the new component) |
| **probler** | Re-vendor, app.js init, testing | Last (consumes all above) |

---

## Resolved Decisions

1. **Page structure changes (add/delete)**: Client shows a popup "Page content changed — rows were added/deleted. Refresh?" User can refresh (re-fetches current page) or ignore (disregards all further notifications until next manual action). This avoids the fragile page-boundary-shift problem entirely.
2. **Edit mode**: No notifications. Edit mode is frozen in time. Last user to save wins (FIFO). Only view-mode popups update live.
3. **Multi-tab**: Subscriptions keyed by bearer token, not user UUID. Each tab has its own token → its own WebSocket → its own subscriptions. Tabs are fully independent.

## Open Question for Review

1. **Throttling**: If a burst of changes hits the cache (e.g., bulk import), should notifications be batched/throttled to avoid flooding the WebSocket?
