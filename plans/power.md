# Data Center Power Management APIs (Simulation-Oriented Summary)

Goal: a vendor-neutral, simulation-friendly API surface that mirrors how real data center power systems are managed.
This document summarizes each subsystem (EPMS, UPS, PDU/RPP, DCIM, BMS, Energy Optimizer) into:
- Southbound protocols you’ll see in the field
- Northbound APIs you can simulate (REST + event streams)
- Core resources + telemetry + control + alarms

-------------------------------------------------------------------------------

## 0) Common Concepts (Use Across All Subsystems)

### Canonical resources
- Site / Building / Room / Row / Rack
- Device (any managed endpoint: switchgear meter, UPS, PDU, ATS, generator controller, sensor gateway)
- Circuit / Feeder / Panel / Breaker
- Measurement (time series)
- Alarm/Event
- Command (control action + result)
- Topology (power path graph)

### Common telemetry shape (normalized)
Measurement:
- ts (RFC3339)
- device_id
- point (e.g., "voltage_l1", "current_l2", "real_power_kw", "energy_kwh", "frequency_hz", "pf", "thd")
- value (number/string)
- unit
- quality (good/bad/uncertain + reason)

### Common alarm shape (normalized)
Alarm/Event:
- ts
- source (device_id + point optional)
- severity (info/warn/major/critical)
- type (threshold, state_change, comms_loss, battery, breaker_trip, overload, transfer_switch, generator, etc.)
- description
- state (active/ack/cleared)
- correlation_id (optional)

### Security / auth (typical)
- Northbound: OAuth2/JWT + RBAC
- Southbound: SNMPv3 authPriv where possible, TLS for HTTPS, network segmentation

### Common Northbound API patterns
REST (read/command):
- GET /devices
- GET /devices/{id}
- GET /devices/{id}/measurements?from=&to=&point=
- GET /alarms?state=active&severity=critical
- POST /commands  (control actions)
- GET /commands/{id}

Event stream:
- Webhook callbacks (POST to subscriber URL)
- MQTT topics (preferred for sim; easy to scale)
- SSE / WebSocket stream for dashboards

-------------------------------------------------------------------------------

## 1) EPMS (Electrical Power Monitoring System)

### What it manages
- Utility feed / MV-LV switchgear
- Transformers, bus ducts, main distribution
- Panelboards, breakers, branch circuits
- Metering: V, A, kW, kVA, kWh, PF, harmonics/THD

### Southbound protocols you’ll see
- Modbus RTU/TCP (common metering / protection relays)
- SNMP (some gateways/meters)
- IEC 61850 (substation automation environments) and sometimes DNP3 (utility/SCADA contexts) :contentReference[oaicite:0]{index=0}

### Simulation Northbound API (suggested)
Resources:
- /epms/sites
- /epms/meters
- /epms/circuits
- /epms/topology/power-paths  (graph: sources -> feeders -> panels -> loads)

Telemetry points (typical):
- voltage_ln / voltage_ll per phase
- current per phase
- frequency
- real_power_kw, apparent_power_kva, reactive_power_kvar
- energy_kwh
- pf
- thd_v, thd_i (optional)

Control actions (often limited; mostly monitoring):
- Open/close breaker (only where remote control exists)
- Set alarm thresholds (meter-level)

Example endpoints:
- GET  /epms/meters
- GET  /epms/meters/{id}/measurements?point=real_power_kw&from=&to=
- GET  /epms/circuits/{id}/state
- POST /epms/commands { "action":"breaker_open", "breaker_id":"...", "reason":"sim test" }

Alarms:
- breaker_trip
- overcurrent
- undervoltage/overvoltage
- comms_loss
- phase_imbalance

-------------------------------------------------------------------------------

## 2) UPS Management (Uninterruptible Power Supply)

### What it manages
- UPS modules, rectifier/inverter states
- Battery strings / battery management
- Bypass mode, alarms, runtime estimates
- Load sharing in parallel UPS systems

### Southbound protocols you’ll see
- SNMP (very common via Network Management Cards) :contentReference[oaicite:1]{index=1}
- Modbus RTU/TCP (also common) :contentReference[oaicite:2]{index=2}

### Simulation Northbound API (suggested)
Resources:
- /ups/systems
- /ups/batteries
- /ups/inputs
- /ups/outputs

Telemetry points:
- input_voltage, input_freq
- output_voltage, output_freq
- load_percent
- runtime_seconds_est
- battery_charge_percent
- battery_temp_c
- on_battery (bool), on_bypass (bool)
- alarms_active_count

Control actions:
- start_battery_test
- initiate_graceful_shutdown (rare; often done via IT tooling)
- transfer_to_bypass / return_from_bypass (guard rails!)
- set_low_battery_alarm_threshold

Example endpoints:
- GET  /ups/systems
- GET  /ups/systems/{id}/status
- POST /ups/commands { "action":"start_battery_test", "ups_id":"..." }
- GET  /ups/systems/{id}/events?from=&to=

Alarms:
- on_battery
- battery_fault
- overload
- inverter_fault
- bypass_active
- comms_loss

-------------------------------------------------------------------------------

## 3) PDU / RPP / Rack Power (Distribution Near the Load)

### What it manages
- Rack PDUs (switched/monitored)
- Branch circuits, outlet-level metering (some models)
- Remote outlet control (power-cycle)
- RPP panels (floor distribution)

### Southbound protocols you’ll see
- SNMP (common)
- REST APIs (vendor-specific)
- Increasingly Redfish for rack power devices on some platforms :contentReference[oaicite:3]{index=3}
- Some PDUs expose JSON APIs :contentReference[oaicite:4]{index=4}
- Modbus (some RPP / metering gear) :contentReference[oaicite:5]{index=5}

### Simulation Northbound API (suggested)
Resources:
- /power/racks
- /power/pdus
- /power/pdus/{id}/outlets
- /power/rpps
- /power/circuits

Telemetry points:
- per-PDU: voltage, current, kw, kwh, pf
- per-outlet: state(on/off), current, energy (if supported)
- per-branch: current, breaker_state

Control actions:
- outlet_on/off/cycle (timeboxed)
- set_outlet_label
- set_overcurrent_threshold (if supported)

Example endpoints:
- GET  /power/pdus
- GET  /power/pdus/{id}/outlets
- POST /power/commands { "action":"outlet_cycle", "pdu_id":"...", "outlet":"12", "cycle_seconds":10 }
- GET  /power/pdus/{id}/measurements?point=current_a&from=&to=

Alarms:
- outlet_overcurrent
- branch_overload
- pdu_comm_loss
- breaker_trip

-------------------------------------------------------------------------------

## 4) DCIM (Data Center Infrastructure Management)

### What it manages (power-centric view)
- Aggregates EPMS + UPS + PDU telemetry
- Inventory + rack layout + capacity planning
- Correlation of power, cooling, space, assets
- Often "open collectors" ingest SNMP/Modbus/BACnet/MQTT :contentReference[oaicite:6]{index=6}
- Typically provides open APIs for integration :contentReference[oaicite:7]{index=7}

### Southbound protocols (ingest)
- SNMP, Modbus, BACnet, MQTT are common ingestion paths :contentReference[oaicite:8]{index=8}

### Simulation Northbound API (suggested)
Resources:
- /dcim/assets (servers, racks, PDUs, UPS, etc.)
- /dcim/locations
- /dcim/capacity/power (available, allocated, headroom)
- /dcim/power-model (links devices -> circuits -> racks -> assets)
- /dcim/reports (PUE snapshots, utilization)

Telemetry points (aggregated):
- rack_kw, row_kw, room_kw, site_kw
- headroom_kw per breaker/panel
- stranded_power_kw (allocated - used) (derived metric)

Control actions (usually orchestration-level, not electrical switching):
- assign_asset_to_rack
- set_capacity_limits (policy)
- create_maintenance_window

Example endpoints:
- GET  /dcim/assets?type=rack
- GET  /dcim/capacity/power?scope=rack&id=R12
- GET  /dcim/power-model/topology?scope=site&id=S1
- POST /dcim/policies { "type":"power_limit", "scope":"rack", "id":"R12", "limit_kw":12.0 }

Events:
- /dcim/events stream (fanout of alarms from subsystems)

-------------------------------------------------------------------------------

## 5) BMS (Building Management System) / Facilities Controls

### What it manages (power-adjacent)
- Generators, ATS/STS transfer switching
- Fuel levels, start/stop status
- Room environmental sensors (temp/humidity), and often HVAC/chillers (not power but tightly coupled)
- Integration gateways (Modbus<->BACnet etc.) are common in practice :contentReference[oaicite:9]{index=9}

### Southbound protocols you’ll see
- BACnet/IP or BACnet MS/TP (building automation)
- Modbus (meters/controllers)
- Sometimes SNMP via gateways

### Simulation Northbound API (suggested)
Resources:
- /bms/generators
- /bms/transfer-switches
- /bms/fuel-systems
- /bms/environments (rooms)

Telemetry points:
- generator_state (stopped/starting/running/fault)
- generator_kw, generator_rpm, coolant_temp
- fuel_percent
- ats_position (utility/generator/bypass)
- room_temp_c, humidity_pct

Control actions (high-risk; simulate carefully with guardrails):
- generator_start/stop (often manual-only in real life)
- ats_transfer_test (sim)
- set_env_thresholds

Example endpoints:
- GET  /bms/generators
- POST /bms/commands { "action":"generator_start", "generator_id":"G1", "mode":"test" }
- GET  /bms/transfer-switches/{id}/state

Alarms:
- generator_fault
- transfer_failed
- low_fuel
- high_temp

-------------------------------------------------------------------------------

## 6) Energy / Power Optimization Layer (Optional, Modern Add-On)

### What it does
- Forecast load, recommend capacity actions
- Cost-aware scheduling (time-of-use)
- Carbon-aware placement (if you model it)
- For GPU/AI clusters: enforce rack/site power envelopes

### Inputs (northbound ingest)
- From EPMS/UPS/PDU/DCIM: time series, alarms, topology
- From IT/workload: cluster utilization, job schedules

### Simulation Northbound API (suggested)
Resources:
- /optimizer/forecasts (kw forecast per scope)
- /optimizer/recommendations (actions + expected impact)
- /optimizer/policies (constraints, envelopes)
- /optimizer/whatif (simulation runs)

Example endpoints:
- POST /optimizer/whatif
  {
    "scope":"site",
    "id":"S1",
    "duration_minutes":60,
    "scenario":{
      "add_load_kw":250,
      "failure":"ups_module_loss",
      "ambient_temp_c":28
    }
  }

Outputs:
- predicted_headroom_kw
- predicted_runtime_seconds (if on battery)
- risk_score
- recommended_actions[] (shed noncritical, rebalance, migrate workloads, etc.)

-------------------------------------------------------------------------------

## 7) Minimal Simulation Interface (One Unified API for Your Simulator)

If you want one cohesive simulated "power management fabric", unify all subsystems under:
- /devices (typed devices: epms_meter, ups, pdu, rpp, generator, ats, sensor_gateway)
- /topology (power graph)
- /measurements (timeseries)
- /alarms (events)
- /commands (control plane)

Device types and common points:
- epms_meter: voltage/current/kw/kwh/pf/thd
- ups: load_pct, runtime_est, battery_charge, on_battery, on_bypass
- pdu: kw/kwh, outlet_state, outlet_current
- generator: state, kw, fuel
- ats: position, transfer_state

This keeps your simulation small but realistic while matching real-world integration styles.

-------------------------------------------------------------------------------

## 8) Notes on Real-World API Reality (Why this abstraction works)

- EPMS/UPS/PDU gear often speaks SNMP + Modbus; rack PDUs increasingly add REST and sometimes Redfish :contentReference[oaicite:10]{index=10}
- DCIM typically acts as an aggregator/collector over SNMP/Modbus/BACnet/MQTT and exposes open APIs for integration :contentReference[oaicite:11]{index=11}
- Utility/substation contexts may involve IEC 61850 or DNP3; you can model them as additional southbound adapters feeding the same normalized telemetry :contentReference[oaicite:12]{index=12}

-------------------------------------------------------------------------------

## 9) Suggested Next Step (If you want to implement quickly)

Implement 3 adapters in your simulator:
1) SNMP-like poller (simulate OIDs -> normalized points)
2) Modbus-like register map (simulate registers -> normalized points)
3) REST/Redfish-like device API (simulate per-device endpoints)

All of them publish into one internal bus:
- measurements topic
- alarms topic
- command-results topic

Then expose a single northbound REST + MQTT interface for your higher-level controller.

END
