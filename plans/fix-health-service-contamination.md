# Fix: Health ServiceToAreas Contamination on VNic Reconnect

## Bug Summary

The ORM pod's UUID appears in the `Participants("Coll", 0)` list even though it does not run the Collector service. This causes `RoundRobin` to send targets to the ORM, which fails with "Cannot find active handler for service Coll area 0".

## Root Cause

A VNic reconnection causes `SysConfig().Services` to contain **all cluster-wide services** instead of only the locally activated ones. The contaminated service list is then sent to the VNet during the handshake, and the VNet records it as this VNic's services in the Health cache.

### Detailed Flow

1. **First connect** — VNic calls `syncServicesWithConfig()` which merges local `ServiceManager.Services()` into `SysConfig().Services`. At this point `SysConfig().Services` has only local services (e.g., `{Health: 0, Targets: 91}`).

2. **Handshake** — `ValidateConnection()` → `ExecuteProtocol()` sends `SysConfig().Services` to the VNet, then **overwrites** `SysConfig().Services` with the VNet's response (Protocol.go:96). After handshake, `SysConfig().Services` now contains **all cluster services** (including `Coll: 0`, `Health: 0`, `Targets: 91`, etc.).

3. **Reconnect** — If the connection drops, the VNic loops back to `connect()` (VirtualNetworkInterface.go:147-154). It calls `syncServicesWithConfig()` again, which merges local services into the already-contaminated `SysConfig().Services`. Since `SysConfig().Services` already contains `Coll: 0` from the previous handshake response, it stays.

4. **Second handshake** — `ValidateConnection()` sends the contaminated `SysConfig().Services` (containing `Coll: 0`) to the VNet.

5. **VNet records it** — `addHealthForVNic(config)` → `hp.Services = config.Services` → The ORM's Health record now claims it hosts `Coll` area `0`.

6. **RoundRobin picks it up** — `health.Participants("Coll", 0)` iterates all Health records, finds the ORM's UUID listed under `Coll: 0`, and includes it in the round-robin.

7. **Target sent to ORM** — The ORM receives a `POST` for `Coll` area `0`, has no handler, logs the error. The target is lost.

## Fix

The fix should be in `l8bus` — specifically ensuring that `SysConfig().Services` is never contaminated with remote services, and that only locally activated services are sent during the handshake.

### Option A: Reset SysConfig().Services before each reconnect (Minimal fix)

**File**: `l8bus/go/overlay/vnic/VirtualNetworkInterface.go`

In `syncServicesWithConfig()`, instead of merging local services into the existing (potentially contaminated) `SysConfig().Services`, **replace** it entirely with the local `ServiceManager.Services()`:

```go
func (this *VirtualNetworkInterface) syncServicesWithConfig() {
    // Always use only locally activated services for the handshake.
    // SysConfig().Services may contain stale remote services from a
    // previous connection's handshake response (Protocol.go overwrites it).
    this.resources.SysConfig().Services = this.resources.Services().Services()
}
```

This ensures that on reconnect, only locally activated services are sent to the VNet, regardless of what `SysConfig().Services` accumulated from previous connections.

### Option B: Don't overwrite SysConfig().Services in the handshake (Cleaner fix)

**File**: `l8types/go/nets/Protocol.go`

The handshake currently overwrites `config.Services` with the remote side's services (line 96). Instead, store the remote services in a separate field or discard them on the VNic side:

```go
// Read the remote side's services but don't overwrite our local services
remoteServices, err := ReadEncryptedBytes(conn, config, security)
if err != nil {
    conn.Close()
    return err
}
// Only apply remote services if this is the VNet side (IAmVnet)
// The VNic side should never adopt the VNet's service list
if config.IAmVnet {
    config.Services = BytesToServices(remoteServices)
}
```

This prevents the VNic's `SysConfig().Services` from ever being contaminated, making reconnects safe.

### Option C: Both (Belt and suspenders)

Apply both Option A and Option B. Option A protects against the current bug. Option B prevents the root contamination from happening at all, protecting against any future code that might read `SysConfig().Services` expecting it to be local-only.

## Recommendation

**Option C** — apply both fixes. Option A is the immediate safety net, Option B closes the hole permanently.

## Verification

1. Start system with multiple collector pods and the ORM pod
2. Verify Health records: each pod's `ServiceToAreas` should only contain its own locally activated services
3. Kill the ORM pod's VNet connection (or restart the VNet) to force a reconnect
4. After reconnect, verify the ORM's Health record still only shows `{Health: 0, Targets: 91}` — NOT `Coll: 0`
5. Trigger `InitTargets` and verify all round-robin destinations are collector UUIDs, not the ORM UUID
6. Verify all 30,019 targets reach collectors

## Affected Repositories

- `l8bus` — VirtualNetworkInterface.go (`syncServicesWithConfig`)
- `l8types` — nets/Protocol.go (`ExecuteProtocol`)
- `probler` — re-vendor after fixes
