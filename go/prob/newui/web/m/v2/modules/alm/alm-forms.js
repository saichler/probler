/**
 * Mobile ALM Module - Form Definitions
 * Desktop Equivalents: alarms-forms.js, events-forms.js, correlation-forms.js,
 *   policies-forms.js, maintenance-forms.js
 */
(function() {
    'use strict';

    var f = window.Layer8FormFactory;
    var enums = MobileAlm.enums;

    function ro(fields) {
        return fields.map(function(field) { field.readOnly = true; return field; });
    }

    MobileAlm.forms = {
        // ── Alarm ───────────────────────────────────────────────────
        Alarm: f.form('Alarm', [
            f.section('Alarm Details', [
                ...ro(f.text('name', 'Name')),
                ...ro(f.textarea('description', 'Description')),
                ...ro(f.reference('definitionId', 'Definition', 'AlarmDefinition')),
                ...f.select('severity', 'Severity', enums.ALARM_SEVERITY),
                ...f.select('state', 'State', enums.ALARM_STATE),
                ...ro(f.text('nodeId', 'Node ID')),
                ...ro(f.text('nodeName', 'Node Name')),
                ...ro(f.text('linkId', 'Link ID')),
                ...ro(f.text('location', 'Location')),
                ...ro(f.text('sourceIdentifier', 'Source Identifier'))
            ]),
            f.section('Timing', [
                ...f.datetime('firstOccurrence', 'First Occurrence'),
                ...f.datetime('lastOccurrence', 'Last Occurrence'),
                ...f.datetime('acknowledgedAt', 'Acknowledged At'),
                ...f.datetime('clearedAt', 'Cleared At')
            ]),
            f.section('Notes', [
                ...f.inlineTable('notes', 'Notes', [
                    { key: 'noteId', label: 'ID', hidden: true },
                    { key: 'author', label: 'Author', type: 'text' },
                    { key: 'text', label: 'Text', type: 'text', required: true },
                    { key: 'createdAt', label: 'Created', type: 'date' }
                ])
            ])
        ]),

        // ── Alarm Definition ────────────────────────────────────────
        AlarmDefinition: f.form('Alarm Definition', [
            f.section('Definition Details', [
                ...f.text('name', 'Name', true),
                ...f.textarea('description', 'Description'),
                ...f.select('status', 'Status', enums.ALARM_DEFINITION_STATUS),
                ...f.select('defaultSeverity', 'Default Severity', enums.ALARM_SEVERITY),
                ...f.text('eventPattern', 'Event Pattern'),
                ...f.text('nodeTypeFilter', 'Node Type Filter'),
                ...f.number('thresholdCount', 'Threshold Count'),
                ...f.number('thresholdWindowSeconds', 'Threshold Window (s)')
            ]),
            f.section('Auto-Clear Configuration', [
                ...f.checkbox('autoClearEnabled', 'Auto-Clear Enabled'),
                ...f.number('autoClearSeconds', 'Auto-Clear Seconds'),
                ...f.text('clearEventPattern', 'Clear Event Pattern')
            ]),
            f.section('Deduplication', [
                ...f.checkbox('dedupEnabled', 'Dedup Enabled'),
                ...f.text('dedupKeyExpression', 'Dedup Key Expression')
            ])
        ]),

        // ── Alarm Filter ────────────────────────────────────────────
        AlarmFilter: f.form('Alarm Filter', [
            f.section('Filter Details', [
                ...f.text('name', 'Name', true),
                ...f.text('owner', 'Owner', true),
                ...f.textarea('description', 'Description'),
                ...f.checkbox('isShared', 'Shared'),
                ...f.checkbox('isDefault', 'Default'),
                ...f.checkbox('rootCauseOnly', 'Root Cause Only'),
                ...f.checkbox('excludeSuppressed', 'Exclude Suppressed'),
                ...f.number('maxAgeHours', 'Max Age (hours)')
            ])
        ]),

        // ── Event ───────────────────────────────────────────────────
        Event: f.form('Event', [
            f.section('Event Details', [
                ...f.select('eventType', 'Event Type', enums.EVENT_TYPE, true),
                ...f.select('severity', 'Severity', enums.ALARM_SEVERITY),
                ...f.text('nodeId', 'Node ID', true),
                ...f.text('nodeName', 'Node Name'),
                ...f.text('sourceIdentifier', 'Source Identifier'),
                ...f.textarea('message', 'Message', true),
                ...f.textarea('rawData', 'Raw Data'),
                ...f.text('category', 'Category'),
                ...f.text('subcategory', 'Subcategory')
            ]),
            f.section('Processing', [
                ...f.select('processingState', 'Processing State', enums.EVENT_PROCESSING_STATE),
                ...f.reference('alarmId', 'Alarm', 'Alarm'),
                ...f.reference('definitionId', 'Alarm Definition', 'AlarmDefinition')
            ]),
            f.section('Timing', [
                ...f.datetime('occurredAt', 'Occurred At'),
                ...f.datetime('receivedAt', 'Received At'),
                ...f.datetime('processedAt', 'Processed At')
            ])
        ]),

        // ── Correlation Rule ────────────────────────────────────────
        CorrelationRule: f.form('Correlation Rule', [
            f.section('Rule Details', [
                ...f.text('name', 'Name', true),
                ...f.textarea('description', 'Description'),
                ...f.select('ruleType', 'Rule Type', enums.CORRELATION_RULE_TYPE, true),
                ...f.select('status', 'Status', enums.CORRELATION_RULE_STATUS),
                ...f.number('priority', 'Priority')
            ]),
            f.section('Topological', [
                ...f.select('traversalDirection', 'Traversal Direction', enums.TRAVERSAL_DIRECTION),
                ...f.number('traversalDepth', 'Traversal Depth')
            ]),
            f.section('Temporal', [
                ...f.number('timeWindowSeconds', 'Time Window (seconds)'),
                ...f.text('rootAlarmPattern', 'Root Alarm Pattern'),
                ...f.text('symptomAlarmPattern', 'Symptom Alarm Pattern')
            ]),
            f.section('Behavior', [
                ...f.number('minSymptomCount', 'Min Symptom Count'),
                ...f.checkbox('autoSuppressSymptoms', 'Auto Suppress Symptoms'),
                ...f.checkbox('autoAcknowledgeSymptoms', 'Auto Acknowledge Symptoms')
            ]),
            f.section('Conditions', [
                ...f.inlineTable('conditions', 'Conditions', [
                    { key: 'conditionId', label: 'ID', type: 'text', hidden: true },
                    { key: 'field', label: 'Field', type: 'text' },
                    { key: 'operator', label: 'Operator', type: 'select', options: enums.CONDITION_OPERATOR },
                    { key: 'value', label: 'Value', type: 'text' }
                ])
            ])
        ]),

        // ── Notification Policy ─────────────────────────────────────
        NotificationPolicy: f.form('Notification Policy', [
            f.section('Policy Details', [
                ...f.text('name', 'Name', true),
                ...f.textarea('description', 'Description'),
                ...f.select('status', 'Status', enums.POLICY_STATUS),
                ...f.select('minSeverity', 'Min Severity', enums.ALARM_SEVERITY),
                ...f.checkbox('notifyOnStateChange', 'Notify on State Change'),
                ...f.number('cooldownSeconds', 'Cooldown (seconds)'),
                ...f.number('maxNotificationsPerHour', 'Max Notifications/Hour')
            ]),
            f.section('Targets', [
                ...f.inlineTable('targets', 'Notification Targets', [
                    { key: 'targetId', label: 'ID', type: 'text', hidden: true },
                    { key: 'channel', label: 'Channel', type: 'select', options: enums.NOTIFICATION_CHANNEL },
                    { key: 'endpoint', label: 'Endpoint', type: 'text' },
                    { key: 'template', label: 'Template', type: 'textarea' }
                ])
            ])
        ]),

        // ── Escalation Policy ───────────────────────────────────────
        EscalationPolicy: f.form('Escalation Policy', [
            f.section('Policy Details', [
                ...f.text('name', 'Name', true),
                ...f.textarea('description', 'Description'),
                ...f.select('status', 'Status', enums.POLICY_STATUS),
                ...f.select('minSeverity', 'Min Severity', enums.ALARM_SEVERITY)
            ]),
            f.section('Escalation Steps', [
                ...f.inlineTable('steps', 'Escalation Steps', [
                    { key: 'stepId', label: 'ID', type: 'text', hidden: true },
                    { key: 'stepOrder', label: 'Order', type: 'number' },
                    { key: 'delayMinutes', label: 'Delay (min)', type: 'number' },
                    { key: 'channel', label: 'Channel', type: 'select', options: enums.NOTIFICATION_CHANNEL },
                    { key: 'endpoint', label: 'Endpoint', type: 'text' },
                    { key: 'messageTemplate', label: 'Message Template', type: 'text' }
                ])
            ])
        ]),

        // ── Maintenance Window ──────────────────────────────────────
        MaintenanceWindow: f.form('Maintenance Window', [
            f.section('Window Details', [
                ...f.text('name', 'Name', true),
                ...f.textarea('description', 'Description'),
                ...f.select('status', 'Status', enums.MAINTENANCE_WINDOW_STATUS),
                ...f.text('createdBy', 'Created By')
            ]),
            f.section('Schedule', [
                ...f.date('startTime', 'Start Time', true),
                ...f.date('endTime', 'End Time', true),
                ...f.select('recurrence', 'Recurrence', enums.RECURRENCE_TYPE),
                ...f.number('recurrenceInterval', 'Recurrence Interval')
            ]),
            f.section('Scope', [
                ...f.text('nodeIds', 'Node IDs'),
                ...f.text('nodeTypes', 'Node Types'),
                ...f.text('locations', 'Locations')
            ]),
            f.section('Behavior', [
                ...f.checkbox('suppressAlarms', 'Suppress Alarms'),
                ...f.checkbox('suppressNotifications', 'Suppress Notifications')
            ])
        ])
    };

})();
