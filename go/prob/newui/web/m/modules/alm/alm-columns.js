/**
 * Mobile ALM Module - Column Definitions
 * Desktop Equivalents: alarms-columns.js, events-columns.js, correlation-columns.js,
 *   policies-columns.js, maintenance-columns.js
 */
(function() {
    'use strict';

    const col = window.Layer8ColumnFactory;
    const render = MobileAlm.render;

    MobileAlm.columns = {
        // ── Alarms ──────────────────────────────────────────────────
        Alarm: [
            ...col.id('alarmId'),
            ...col.col('name', 'Name'),
            ...col.status('severity', 'Severity', null, render.severity),
            ...col.status('state', 'State', null, render.state),
            ...col.col('nodeName', 'Node'),
            ...col.datetime('firstOccurrence', 'First Occurrence'),
            ...col.col('occurrenceCount', 'Count'),
            ...col.boolean('isRootCause', 'Root Cause'),
            ...col.col('symptomCount', 'Symptoms')
        ],

        AlarmDefinition: [
            ...col.id('definitionId'),
            ...col.col('name', 'Name'),
            ...col.status('status', 'Status', null, render.definitionStatus),
            ...col.status('defaultSeverity', 'Default Severity', null, render.severity),
            ...col.col('eventPattern', 'Event Pattern'),
            ...col.col('thresholdCount', 'Threshold')
        ],

        AlarmFilter: [
            ...col.id('filterId'),
            ...col.col('name', 'Name'),
            ...col.col('owner', 'Owner'),
            ...col.boolean('isShared', 'Shared'),
            ...col.boolean('isDefault', 'Default')
        ],

        // ── Events ──────────────────────────────────────────────────
        Event: [
            ...col.id('eventId', 'Event ID'),
            ...col.enum('eventType', 'Event Type', null, render.eventType),
            ...col.status('processingState', 'Processing State', null, render.processingState),
            ...col.status('severity', 'Severity', null, render.severity),
            ...col.col('nodeName', 'Node Name'),
            ...col.col('message', 'Message'),
            ...col.col('category', 'Category'),
            ...col.datetime('occurredAt', 'Occurred At')
        ],

        // ── Correlation ─────────────────────────────────────────────
        CorrelationRule: [
            ...col.id('ruleId', 'Rule ID'),
            ...col.col('name', 'Name'),
            ...col.enum('ruleType', 'Rule Type', null, render.ruleType),
            ...col.status('status', 'Status', null, render.ruleStatus),
            ...col.col('priority', 'Priority'),
            ...col.col('timeWindowSeconds', 'Time Window (s)'),
            ...col.col('minSymptomCount', 'Min Symptoms'),
            ...col.boolean('autoSuppressSymptoms', 'Auto Suppress')
        ],

        // ── Policies ────────────────────────────────────────────────
        NotificationPolicy: [
            ...col.id('policyId', 'Policy ID'),
            ...col.col('name', 'Name'),
            ...col.status('status', 'Status', null, render.policyStatus),
            ...col.status('minSeverity', 'Min Severity', null, render.severity),
            ...col.col('cooldownSeconds', 'Cooldown (s)'),
            ...col.col('maxNotificationsPerHour', 'Max/Hour')
        ],

        EscalationPolicy: [
            ...col.id('policyId', 'Policy ID'),
            ...col.col('name', 'Name'),
            ...col.status('status', 'Status', null, render.policyStatus),
            ...col.status('minSeverity', 'Min Severity', null, render.severity)
        ],

        // ── Maintenance ─────────────────────────────────────────────
        MaintenanceWindow: [
            ...col.id('windowId', 'Window ID'),
            ...col.col('name', 'Name'),
            ...col.status('status', 'Status', null, render.windowStatus),
            ...col.date('startTime', 'Start Time'),
            ...col.date('endTime', 'End Time'),
            ...col.enum('recurrence', 'Recurrence', null, render.recurrenceType),
            ...col.boolean('suppressAlarms', 'Suppress Alarms'),
            ...col.col('createdBy', 'Created By')
        ],

        // ── Archive ─────────────────────────────────────────────────
        ArchivedAlarm: [
            ...col.id('alarmId'),
            ...col.col('name', 'Name'),
            ...col.status('severity', 'Severity', null, render.severity),
            ...col.status('state', 'State', null, render.state),
            ...col.col('nodeName', 'Node'),
            ...col.datetime('firstOccurrence', 'First Occurrence'),
            ...col.datetime('archivedAt', 'Archived At'),
            ...col.col('archivedBy', 'Archived By')
        ],

        ArchivedEvent: [
            ...col.id('eventId', 'Event ID'),
            ...col.enum('eventType', 'Event Type', null, render.eventType),
            ...col.status('severity', 'Severity', null, render.severity),
            ...col.col('nodeName', 'Node Name'),
            ...col.col('message', 'Message'),
            ...col.datetime('occurredAt', 'Occurred At'),
            ...col.datetime('archivedAt', 'Archived At'),
            ...col.col('archivedBy', 'Archived By')
        ]
    };

    MobileAlm.primaryKeys = {
        Alarm: 'alarmId',
        AlarmDefinition: 'definitionId',
        AlarmFilter: 'filterId',
        Event: 'eventId',
        CorrelationRule: 'ruleId',
        NotificationPolicy: 'policyId',
        EscalationPolicy: 'policyId',
        MaintenanceWindow: 'windowId',
        ArchivedAlarm: 'alarmId',
        ArchivedEvent: 'eventId'
    };

})();
