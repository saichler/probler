(function() {
    'use strict';
    // Endpoints from desktop alm-config.js (alarm services in area 10;
    // events come from l8events at /76/Events, not from l8alarms)
    window.PROBLER_NAV_CONFIG_ALM = {
        alarms: {
            subModules: [
                { key: 'alarms', label: 'Alarms', icon: 'alarms-active' },
                { key: 'events', label: 'Events', icon: 'events' },
                { key: 'correlation', label: 'Correlation', icon: 'correlation' },
                { key: 'policies', label: 'Policies', icon: 'policies' },
                { key: 'archive', label: 'Archive', icon: 'archive' }
            ],
            services: {
                'alarms': [
                    // readOnly: Alarm has no POST/PUT HTTP route (see AlarmService.go);
                    // state changes are PATCH-only, matching desktop alm-config.js
                    { key: 'active-alarms', label: 'Active Alarms', icon: 'alarms-active', endpoint: '/10/Alarm', model: 'Alarm', idField: 'alarmId', supportedViews: ['table', 'kanban', 'chart'], readOnly: true },
                    { key: 'alarm-definitions', label: 'Definitions', icon: 'alarms', endpoint: '/10/AlmDef', model: 'AlarmDefinition', idField: 'definitionId' },
                    { key: 'alarm-filters', label: 'Saved Filters', icon: 'alarms', endpoint: '/10/AlmFilter', model: 'AlarmFilter', idField: 'filterId' }
                ],
                'events': [
                    { key: 'events', label: 'Events', icon: 'events', endpoint: '/76/Events', model: 'EventRecord', idField: 'eventId', readOnly: true }
                ],
                'correlation': [
                    { key: 'rules', label: 'Correlation Rules', icon: 'correlation', endpoint: '/10/CorrRule', model: 'CorrelationRule', idField: 'ruleId' }
                ],
                'policies': [
                    { key: 'notification', label: 'Notification', icon: 'policies', endpoint: '/10/NotifPol', model: 'NotificationPolicy', idField: 'policyId' },
                    { key: 'escalation', label: 'Escalation', icon: 'policies', endpoint: '/10/EscPolicy', model: 'EscalationPolicy', idField: 'policyId' }
                ],
                'archive': [
                    { key: 'archived-alarms', label: 'Archived Alarms', icon: 'archive', endpoint: '/10/ArcAlarm', model: 'ArchivedAlarm', idField: 'alarmId', readOnly: true }
                ]
            }
        }
    };
})();
