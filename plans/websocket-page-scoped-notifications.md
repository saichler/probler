# Fix: Network Devices table blinks constantly at scale (30K devices)

## Problem

On probler live (30K network devices), the Network Devices table's first page
re-renders constantly. A table must react to a change notification only when
the changed element is part of the page it displays, and the server must not
send the notification to the client otherwise.

## Root cause

1. **`l8inventory` broadcasts a record-less notification on every write.**
   `InventoryService.notifyWs` (`l8inventory/go/inv/service/InventoryService.go:103-152`,
   called from Post/Put/Patch/Delete at :175/:192/:209/:226) multicasts an
   `L8NotificationSet` to `websock` with no `AaaIds` and no `NotificationList`.
2. **`l8web` treats empty `AaaIds` as "send to everyone".**
   `WebSocketManager.OnNotification` (`l8web/go/web/server/WebSocketManager.go:228-235`)
   writes it to every connection.
3. **The client re-fetches on every record-less message.**
   `Layer8DWebSocket.applyChange` (`l8ui/shared/layer8d-websocket.js:272`) returns
   `missingRecord` before checking whether the row is on the page, and
   `Layer8DTable._handleChangeNotification` (`l8ui/edit_table/layer8d-table-data.js:240`)
   re-fetches and fully re-renders the page. Every device write anywhere in the
   30K is a page-1 re-fetch + re-render in every open browser.

Contributing:

4. **Inventory's targeted notification is switched off.** `InventoryCenter`
   creates its `DCache` with a `nil` listener (`InventoryCenter.go:92-93`), and
   `DCache` forwards the cache's targeted client notification only when the
   listener is a vnic (`DCachePost.go:35`, `DCachePatch.go:32`,
   `DCacheDelete.go:32`). `notifyWs` is therefore inventory's only live path.
5. **Subscription matching is not page-scoped.** `matchingSubscriberAaaIds`
   (`l8utils/go/utils/cache/notifications.go:74-87`) runs only
   `Query.Match()` -- the WHERE clause, `true` when there is none
   (`l8ql/.../interpreter/Query.go:291`). The cache stores the query's full
   sorted key list (`internalQuery.data`) and slices the page from it on each
   fetch (`internalCache.go:149-160`), but the page is never recorded on the
   subscription and notifications never consult it. An unfiltered page-1 view
   matches all 30K devices.

## Target behavior

A subscriber gets a notification only when:
- **update / delete**: the changed key is one of the keys on its displayed page;
- **add**: the new element sorts into its displayed page range (or the page is
  not full).

The client patches an updated row in place (no full re-render). An add or
delete on the displayed page re-fetches that page, which re-registers and
refreshes the server's page snapshot. Blinking then happens only when the
displayed page's own elements change -- the intended behavior.

## Phase 1 -- l8utils: page-scoped subscriptions

Files: `go/utils/cache/Subscriptions.go`, `Fetch.go`, `notifications.go`.

1. Extend `Subscription` with the displayed page snapshot:
   - `PageKeys map[string]bool` -- primary keys of the page returned by the fetch.
   - `First, Last interface{}` -- sort values (or keys, when no sort-by) of the
     page's first/last element; `Full bool` -- page returned `limit` elements.
2. In `Cache.Fetch`, register **after** `iCache.fetch` (today it registers
   before), building the snapshot from the returned values via `KeysFor` and
   `q.SortByValue`. Unregister stays before the fetch. A re-fetch (paging,
   filter, or the client's re-fetch after an add/delete) replaces the snapshot.
3. Replace `matchingSubscriberAaaIds(value)` with
   `matchingSubscriberAaaIds(value, key, nType)`:
   - always require `s.Query.Match(value)` (WHERE) as today;
   - Put/Patch/Delete: require `s.PageKeys[key]`;
   - Post: require `!s.Full` or the new element's sort value within
     `[First, Last]` (respecting `q.Descending()`).
   Callers: `createClientNotification` (Post/Put/Delete) and
   `createClientNotificationForPatch` already have `key`/type at hand.
4. Aggregate queries and queries with `limit 0` (no paging) keep today's
   WHERE-only matching.
5. Known limitation (documented, not fixed): an update that changes the
   sort-by field of an element *outside* the page so that it would now sort
   into it is not delivered; it shows on the next re-fetch.

Tests (`go/tests`): 30K-item cache, page-1 subscription with no WHERE;
assert an update to an off-page key yields no client notification, an
on-page key yields one; add in/out of range; delete in/out of page; re-fetch
of page 2 moves the snapshot; WHERE filter still applies.

## Phase 2 -- l8services: dedicated websocket notifier on DCache

Passing the vnic as `DCache`'s listener would also start the
`PropertyChangeNotification` delta queue (`DCache.go:74-87`) -- replication
behavior inventory does not have today. Decouple the two:

1. Add `wsNotifier ifs.IVNic` to `DCache` and
   `SetWebSocketNotifier(vnic ifs.IVNic)` (on `ifs.IDistributedCache` if the
   interface is used by callers; otherwise on the concrete type via an
   interface assertion in l8inventory).
2. In `DCachePost/Patch/Delete`, multicast `cn` to `websock` when either the
   listener is a vnic (today's behavior) or `wsNotifier` is set.
3. Bump l8utils (Phase 1) in l8services.

## Phase 3 -- l8inventory: remove the broadcast, use the cache's targeted notification

1. `InventoryCenter`: after creating `this.elements`, call
   `SetWebSocketNotifier(vnic)`.
2. `InventoryService`: delete `notifyWs` and its four call sites, and the
   now-unused `WsServiceName/WsServiceArea` constants and imports.
3. Bump l8services and l8utils.
4. Test: Post/Patch/Delete on an InventoryService with a registered page-1
   subscription -> exactly one targeted `websock` multicast carrying the
   record for on-page keys, none for off-page keys.

## Phase 4 -- l8web: never broadcast an untargeted notification

1. `WebSocketManager.OnNotification`: when `AaaIds` is empty, drop the
   notification (log at debug) instead of writing to every connection. Every
   remaining sender (`l8services` base/dcache, `l8orm` OrmCache) forwards a
   cache-built `cn`, which is only created with non-empty `AaaIds`; `notifyWs`
   (removed in Phase 3) was the only empty-`AaaIds` sender.
2. Test: empty-`AaaIds` notification reaches no connection.

## Phase 5 -- l8ui: on-page check first; re-fetch on page membership change (desktop)

l8ui is a shared submodule: change it upstream in the l8ui repo, then bump
probler's submodule.

1. `shared/layer8d-websocket.js` `applyChange`: find the row index first; if
   the key is not on the page and the action is update/delete, return a no-op
   (even without a record), so a stray message never triggers a re-fetch.
   For an on-page update with a record, replace in place (as today).
   For an add, or a delete of an on-page row, return `refetch: true` instead
   of unshifting/splicing locally (the local unshift ignores sort order and
   leaves the server snapshot stale).
2. `edit_table/layer8d-table-data.js` `_handleChangeNotification`: re-fetch on
   `refetch` or `missingRecord`; `updateRow` for an in-place update.
3. `tests/live-changes.test.js`: off-page update/delete without record -> no
   re-fetch; on-page update -> single row update; add / on-page delete -> one
   re-fetch.

## Phase 6 -- l8ui: mobile parity

1. `m/js/layer8m-table-realtime.js`: same handling as Phase 5.2 for the
   `refetch` / `missingRecord` / in-place results of the shared
   `applyChange` (`fetchData(this.currentPage)` at :35 today).
2. Check `m/js/layer8m-data-source.js` and `shared/layer8d-data-source.js`
   for their own change handling and align them.
3. Mobile cases added to the same tests.

## Phase 7 -- probler: bump and verify

1. Bump l8utils, l8services, l8inventory, l8web in `go/go.mod` (after the
   upstream repos are pushed by the user -- service images pull non-`main.go`
   packages from GitHub) and the l8ui submodule.
2. KIND + l8opensim e2e (`e2e/`): new desktop + mobile spec on Network
   Devices page 1 -- while simulated devices keep updating, count page
   re-fetches over 60s: expect 0 when only off-page devices change; change an
   on-page device and expect exactly one in-place row update and no re-fetch.
   Watch the websocket frames in the spec: no frames for off-page keys.
3. Scale check on a 30K setup (probler live or l8opensim scaled up): page 1
   stays still; per-connection websocket frame rate drops to on-page changes
   only.

## Order and ownership

l8utils -> l8services -> l8inventory -> l8web (independent of the chain) ->
l8ui -> probler. Each repo is committed locally; the user reviews and pushes
before the next repo's dependency bump (vendor workflow: never copy into
`vendor/` by hand).

## Traceability

| # | Gap | Phase |
|---|-----|-------|
| 1 | `notifyWs` broadcasts record-less notifications on every inventory write | 3 |
| 2 | Empty `AaaIds` broadcasts to all connections | 4 |
| 3 | Client re-fetches on record-less messages before checking page membership | 5, 6 |
| 4 | Inventory's targeted `cn` dropped (`nil` DCache listener) | 2, 3 |
| 5 | Subscription matching is WHERE-only, not page-scoped | 1 |
| 6 | Local unshift on add ignores sort order and leaves server snapshot stale | 5, 6 |
