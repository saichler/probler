# GPU Rack Management API Simulator (GPURackSim) - Full System Documentation

## Purpose

This system simulates a GPU rack management API used in modern data
centers.\
It allows testing automation, schedulers, orchestration, monitoring, and
capacity systems without real hardware.

The simulator behaves like a real GPU infrastructure control plane: -
Inventory and topology - Telemetry and health - Power/reset/maintenance
controls - Async jobs - Alerts/events - Fault injection - Deterministic
scenarios

------------------------------------------------------------------------

# 1. System Goals

### Primary goals

-   Realistic GPU rack API simulation
-   Deterministic behavior via seed
-   Async operations using job model
-   Failure and chaos simulation
-   Multi-rack and multi-node support
-   High-scale telemetry generation

### Non-goals

-   Perfect vendor parity (NVIDIA/HPE/etc)
-   Real physics thermal modeling
-   Performance benchmarking replacement

------------------------------------------------------------------------

# 2. Core Entities

## Rack

Represents a physical rack.

Fields: - rackId - name - location - status - labels

## Node

Server inside rack.

Fields: - nodeId - hostname - rackId - state - health - cpu - memory -
storage - gpus\[\] - nics\[\] - sensors\[\]

States: - RUNNING - STOPPED - REBOOTING - MAINTENANCE - FAILED -
PROVISIONING

## GPU

Fields: - gpuId - nodeId - model - serial - health - utilization -
temperature - power - clocks - eccErrors - migEnabled

GPU health: - OK - DEGRADED - FAILED - RESETTING

## MIG Instance (optional)

-   migId
-   profile
-   memory
-   computeSlices
-   state

## NIC

-   nicId
-   type (IB/Eth)
-   speedGbps
-   linkState
-   rx/tx counters

## Sensors

-   temperature
-   power
-   fanSpeed
-   voltage

## Alert

-   alertId
-   severity
-   resourceType
-   resourceId
-   code
-   message
-   timestamp
-   acknowledged

## Job

Async operations.

States: - QUEUED - RUNNING - SUCCEEDED - FAILED - CANCELED

------------------------------------------------------------------------

# 3. Architecture

## Components

### API Layer

-   REST + optional gRPC
-   JSON
-   Pagination support
-   Auth optional

### State Store

-   In-memory default
-   Persistent optional (Postgres/SQLite)

### Simulation Engine

-   Generates telemetry
-   Applies state transitions
-   Runs async jobs
-   Injects faults

### Scenario Engine

Loads YAML/JSON scenarios.

Schedules: - failures - reboots - spikes - alerts

### Metrics & Events

-   Prometheus metrics
-   Webhooks optional
-   SSE event stream

------------------------------------------------------------------------

# 4. Determinism

Simulator must support seed: - Same seed → same behavior - Same request
order → identical results - Without seed → random realistic mode

------------------------------------------------------------------------

# 5. API Specification

Base path:

    /api/v1

All IDs are strings.

------------------------------------------------------------------------

# 6. Inventory APIs

## List racks

GET /racks

## Get rack

GET /racks/{rackId}

## List nodes in rack

GET /racks/{rackId}/nodes

## Get node

GET /nodes/{nodeId}

## List GPUs

GET /gpus?rackId=&nodeId=

## Get GPU

GET /gpus/{gpuId}

------------------------------------------------------------------------

# 7. Telemetry APIs

## GPU telemetry

GET /gpus/{gpuId}/telemetry

Returns: - utilizationPct - memoryUsedMiB - temperatureC - powerWatts -
clocks - eccErrors - timestamp

## Bulk GPU telemetry

GET /telemetry/gpus?rackId=

Supports: - paging - interval aggregation

## Node telemetry

GET /nodes/{nodeId}/telemetry

------------------------------------------------------------------------

# 8. Health APIs

## Node health

GET /nodes/{nodeId}/health

## GPU health

GET /gpus/{gpuId}/health

Health derived from: - telemetry - faults - state

------------------------------------------------------------------------

# 9. Control Operations

## Power control

POST /nodes/{nodeId}/power { "action":"ON\|OFF\|CYCLE" }

## Reboot

POST /nodes/{nodeId}/reboot { "mode":"GRACEFUL\|FORCE" }

## Maintenance

POST /nodes/{nodeId}/maintenance { "enabled": true, "reason": "upgrade"
}

Behavior: - maintenance drains node - alerts may be suppressed -
scheduler integration optional

------------------------------------------------------------------------

# 10. GPU Controls

## Set power limit

POST /gpus/{gpuId}/settings/power

## Reset GPU

POST /gpus/{gpuId}/reset

Modes: - SOFT - HARD

Behavior: - temporary telemetry loss - health degraded during reset

------------------------------------------------------------------------

# 11. MIG Simulation

## Profiles

GET /mig/profiles

## Configure

POST /gpus/{gpuId}/mig/configure

Returns async job.

------------------------------------------------------------------------

# 12. Firmware Simulation

GET /nodes/{nodeId}/firmware

POST /nodes/{nodeId}/firmware/update

Async job. May require reboot.

------------------------------------------------------------------------

# 13. Alerts & Events

## Active alerts

GET /alerts

## Acknowledge

POST /alerts/{alertId}/ack

## Event stream

GET /events/stream

Includes: - state changes - job updates - faults - telemetry anomalies

------------------------------------------------------------------------

# 14. Jobs

GET /jobs/{jobId}

Fields: - status - progress - timestamps - result - errors

------------------------------------------------------------------------

# 15. Error Model

HTTP: - 400 invalid - 404 not found - 409 conflict - 429 rate limit -
500 simulated failure - 503 temporary unavailable

Error body: { "error":{ "code":"STATE_CONFLICT", "message":"Node in
maintenance" } }

------------------------------------------------------------------------

# 16. Telemetry Simulation Rules

-   Configurable interval (default 5s)
-   Utilization affects power
-   Power affects temperature
-   Temperature affects health
-   ECC errors affect health

------------------------------------------------------------------------

# 17. Timing Defaults

-   reboot: 60-180s
-   gpu reset: 5-20s
-   mig reconfig: 30-120s
-   firmware: 2-15m

------------------------------------------------------------------------

# 18. Fault Injection

Types: - timeout - telemetry drop - gpu failure - ecc errors - link
flap - overheating - node crash

API: POST /faults/enable POST /faults/disable

Rule example: { "resource":"gpu-1", "fault":"ECC", "probability":0.2 }

------------------------------------------------------------------------

# 19. Scenario File Example

``` yaml
seed: 12345
racks:
  - rackId: rack-1
    nodes:
      - nodeId: node-1
        state: RUNNING
        gpus:
          - gpuId: gpu-1
            model: H100

events:
  - at: t+10m
    action: injectFault
    target: gpu-1
    type: ECC
```

------------------------------------------------------------------------

# 20. Observability

## Logs

-   structured JSON
-   request logs
-   job logs

## Metrics

-   request latency
-   jobs running
-   alerts active
-   gpu health counts

## Tracing optional

OpenTelemetry support.

------------------------------------------------------------------------

# 21. Security (optional)

Modes: - none - api key - jwt

Roles: - viewer - operator - admin

------------------------------------------------------------------------

# 22. Deployment Modes

### Developer

-   single process
-   memory store
-   deterministic

### CI

-   container
-   fixed scenarios
-   health endpoint

### Shared lab

-   persistent DB
-   auth enabled
-   multi-tenant

------------------------------------------------------------------------

# 23. Compatibility Expectations

Clients expect: - idempotent operations - retries safe - async jobs -
pagination - stable schemas

------------------------------------------------------------------------

# 24. Version

GET /version

Response: { "name":"GPURackSim", "version":"1.0", "apiVersion":"v1" }

------------------------------------------------------------------------

# 25. Summary

This simulator enables full lifecycle testing of GPU data center
automation against a realistic API without real hardware.

It should behave like a real vendor GPU rack manager: inventory,
telemetry, health, jobs, alerts, failures, and recovery.
