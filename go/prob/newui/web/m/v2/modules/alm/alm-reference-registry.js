/**
 * Mobile ALM Module - Reference Registry
 * Desktop Equivalent: js/reference-registry-alm.js
 */
(function() {
    'use strict';

    if (typeof Layer8DReferenceRegistry === 'undefined') return;

    var ref = window.Layer8RefFactory;

    Layer8DReferenceRegistry.register({
        Alarm: {
            idColumn: 'alarmId',
            displayColumn: 'name',
            selectColumns: ['alarmId', 'name', 'severity', 'state'],
            displayLabel: 'Alarm'
        },
        ...ref.simple('AlarmDefinition', 'definitionId', 'name', 'Definition'),
        ...ref.simple('AlarmFilter', 'filterId', 'name', 'Filter'),
        Event: {
            idColumn: 'eventId',
            displayColumn: 'message',
            selectColumns: ['eventId', 'message', 'eventType'],
            displayLabel: 'Event'
        },
        ...ref.simple('CorrelationRule', 'ruleId', 'name', 'Rule'),
        ...ref.simple('NotificationPolicy', 'policyId', 'name', 'Notification Policy'),
        ...ref.simple('EscalationPolicy', 'policyId', 'name', 'Escalation Policy'),
        ...ref.simple('MaintenanceWindow', 'windowId', 'name', 'Maintenance Window')
    });

})();
