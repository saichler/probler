/**
 * Mobile ALM Module - Enum Definitions
 * Desktop Equivalent: probler/alm/alarms/alarms-enums.js, events/events-enums.js,
 *   correlation/correlation-enums.js, policies/policies-enums.js, maintenance/maintenance-enums.js
 */
(function() {
    'use strict';

    const factory = window.Layer8EnumFactory;
    const { createStatusRenderer, renderEnum } = Layer8DRenderers;

    // ── Alarms ──────────────────────────────────────────────────────

    // AlarmSeverity: 0=Unspecified, 1=Info, 2=Warning, 3=Minor, 4=Major, 5=Critical
    const ALARM_SEVERITY = factory.create([
        ['Unspecified', null, ''],
        ['Info', 'info', 'layer8d-status-info'],
        ['Warning', 'warning', 'layer8d-status-pending'],
        ['Minor', 'minor', 'layer8d-status-pending'],
        ['Major', 'major', 'layer8d-status-terminated'],
        ['Critical', 'critical', 'layer8d-status-terminated']
    ]);

    // AlarmState: 0=Unspecified, 1=Active, 2=Acknowledged, 3=Cleared, 4=Suppressed
    const ALARM_STATE = factory.create([
        ['Unspecified', null, ''],
        ['Active', 'active', 'layer8d-status-active'],
        ['Acknowledged', 'acknowledged', 'layer8d-status-pending'],
        ['Cleared', 'cleared', 'layer8d-status-inactive'],
        ['Suppressed', 'suppressed', 'layer8d-status-inactive']
    ]);

    // AlarmDefinitionStatus: 0=Unspecified, 1=Draft, 2=Active, 3=Disabled
    const ALARM_DEFINITION_STATUS = factory.create([
        ['Unspecified', null, ''],
        ['Draft', 'draft', 'layer8d-status-pending'],
        ['Active', 'active', 'layer8d-status-active'],
        ['Disabled', 'disabled', 'layer8d-status-inactive']
    ]);

    // EventType (Alarms module): 0-7
    const ALARM_EVENT_TYPE = factory.simple([
        'Unspecified', 'Trap', 'Syslog', 'Threshold', 'State Change',
        'Heartbeat', 'Configuration', 'Custom'
    ]);

    // ── Events ──────────────────────────────────────────────────────

    // EventType (Events module): 0-7
    const EVENT_TYPE = factory.simple([
        'Unspecified', 'Fault', 'Threshold', 'StateChange', 'ConfigChange',
        'Security', 'Performance', 'Syslog'
    ]);

    // EventProcessingState: 0-5
    const EVENT_PROCESSING_STATE = factory.create([
        ['Unspecified', null, ''],
        ['New', 'new', 'layer8d-status-pending'],
        ['Processing', 'processing', 'layer8d-status-pending'],
        ['Processed', 'processed', 'layer8d-status-active'],
        ['Discarded', 'discarded', 'layer8d-status-inactive'],
        ['Archived', 'archived', 'layer8d-status-inactive']
    ]);

    // ── Correlation ─────────────────────────────────────────────────

    const CORRELATION_RULE_TYPE = factory.simple([
        'Unspecified', 'Topological', 'Temporal', 'Pattern', 'Composite'
    ]);

    const CORRELATION_RULE_STATUS = factory.create([
        ['Unspecified', null, ''],
        ['Draft', 'draft', 'layer8d-status-pending'],
        ['Active', 'active', 'layer8d-status-active'],
        ['Disabled', 'disabled', 'layer8d-status-inactive']
    ]);

    const TRAVERSAL_DIRECTION = factory.simple([
        'Unspecified', 'Upstream', 'Downstream', 'Both'
    ]);

    const CONDITION_OPERATOR = factory.simple([
        'Unspecified', 'Equals', 'Not Equals', 'Contains', 'Regex',
        'Greater Than', 'Less Than', 'In'
    ]);

    // ── Policies ────────────────────────────────────────────────────

    const POLICY_STATUS = factory.create([
        ['Unspecified', null, ''],
        ['Active', 'active', 'layer8d-status-active'],
        ['Disabled', 'disabled', 'layer8d-status-inactive']
    ]);

    const NOTIFICATION_CHANNEL = factory.simple([
        'Unspecified', 'Email', 'Webhook', 'Slack', 'PagerDuty', 'Custom'
    ]);

    // ── Maintenance ─────────────────────────────────────────────────

    const MAINTENANCE_WINDOW_STATUS = factory.create([
        ['Unspecified', null, ''],
        ['Scheduled', 'scheduled', 'layer8d-status-pending'],
        ['Active', 'active', 'layer8d-status-active'],
        ['Completed', 'completed', 'layer8d-status-inactive'],
        ['Cancelled', 'cancelled', 'layer8d-status-terminated']
    ]);

    const RECURRENCE_TYPE = factory.simple([
        'Unspecified', 'None', 'Daily', 'Weekly', 'Monthly'
    ]);

    // ── Exports ─────────────────────────────────────────────────────

    window.MobileAlm = window.MobileAlm || {};

    MobileAlm.enums = {
        ALARM_SEVERITY: ALARM_SEVERITY.enum,
        ALARM_SEVERITY_CLASSES: ALARM_SEVERITY.classes,
        ALARM_STATE: ALARM_STATE.enum,
        ALARM_STATE_CLASSES: ALARM_STATE.classes,
        ALARM_DEFINITION_STATUS: ALARM_DEFINITION_STATUS.enum,
        ALARM_DEFINITION_STATUS_CLASSES: ALARM_DEFINITION_STATUS.classes,
        ALARM_EVENT_TYPE: ALARM_EVENT_TYPE.enum,
        EVENT_TYPE: EVENT_TYPE.enum,
        EVENT_PROCESSING_STATE: EVENT_PROCESSING_STATE.enum,
        EVENT_PROCESSING_STATE_CLASSES: EVENT_PROCESSING_STATE.classes,
        CORRELATION_RULE_TYPE: CORRELATION_RULE_TYPE.enum,
        CORRELATION_RULE_STATUS: CORRELATION_RULE_STATUS.enum,
        CORRELATION_RULE_STATUS_CLASSES: CORRELATION_RULE_STATUS.classes,
        TRAVERSAL_DIRECTION: TRAVERSAL_DIRECTION.enum,
        CONDITION_OPERATOR: CONDITION_OPERATOR.enum,
        POLICY_STATUS: POLICY_STATUS.enum,
        POLICY_STATUS_CLASSES: POLICY_STATUS.classes,
        NOTIFICATION_CHANNEL: NOTIFICATION_CHANNEL.enum,
        MAINTENANCE_WINDOW_STATUS: MAINTENANCE_WINDOW_STATUS.enum,
        MAINTENANCE_WINDOW_STATUS_CLASSES: MAINTENANCE_WINDOW_STATUS.classes,
        RECURRENCE_TYPE: RECURRENCE_TYPE.enum
    };

    MobileAlm.render = {
        severity: createStatusRenderer(ALARM_SEVERITY.enum, ALARM_SEVERITY.classes),
        state: createStatusRenderer(ALARM_STATE.enum, ALARM_STATE.classes),
        definitionStatus: createStatusRenderer(ALARM_DEFINITION_STATUS.enum, ALARM_DEFINITION_STATUS.classes),
        alarmEventType: (v) => renderEnum(v, ALARM_EVENT_TYPE.enum),
        eventType: (v) => renderEnum(v, EVENT_TYPE.enum),
        processingState: createStatusRenderer(EVENT_PROCESSING_STATE.enum, EVENT_PROCESSING_STATE.classes),
        ruleType: (v) => renderEnum(v, CORRELATION_RULE_TYPE.enum),
        ruleStatus: createStatusRenderer(CORRELATION_RULE_STATUS.enum, CORRELATION_RULE_STATUS.classes),
        traversalDirection: (v) => renderEnum(v, TRAVERSAL_DIRECTION.enum),
        conditionOperator: (v) => renderEnum(v, CONDITION_OPERATOR.enum),
        policyStatus: createStatusRenderer(POLICY_STATUS.enum, POLICY_STATUS.classes),
        notificationChannel: (v) => renderEnum(v, NOTIFICATION_CHANNEL.enum),
        windowStatus: createStatusRenderer(MAINTENANCE_WINDOW_STATUS.enum, MAINTENANCE_WINDOW_STATUS.classes),
        recurrenceType: (v) => renderEnum(v, RECURRENCE_TYPE.enum)
    };

})();
