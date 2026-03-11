(function() {
    'use strict';
    // Endpoints from desktop alm-config.js (service area 10)
    window.PROBLER_NAV_CONFIG_ALM = {
        alarms: {
            subModules: [
                { key: 'alarms', label: 'Alarms', icon: 'alarms-active' },
                { key: 'events', label: 'Events', icon: 'events' },
                { key: 'correlation', label: 'Correlation', icon: 'correlation' },
                { key: 'policies', label: 'Policies', icon: 'policies' },
                { key: 'maintenance', label: 'Maintenance', icon: 'maintenance' },
                { key: 'archive', label: 'Archive', icon: 'archive' }
            ],
            services: {
                'alarms': [
                    { key: 'active-alarms', label: 'Active Alarms', icon: 'alarms-active', endpoint: '/10/Alarm', model: 'Alarm', idField: 'alarmId', supportedViews: ['table', 'kanban', 'chart'] },
                    { key: 'alarm-definitions', label: 'Definitions', icon: 'alarms', endpoint: '/10/AlmDef', model: 'AlarmDefinition', idField: 'definitionId' },
                    { key: 'alarm-filters', label: 'Saved Filters', icon: 'alarms', endpoint: '/10/AlmFilter', model: 'AlarmFilter', idField: 'filterId' }
                ],
                'events': [
                    { key: 'events', label: 'Events', icon: 'events', endpoint: '/10/Event', model: 'Event', idField: 'eventId', readOnly: true }
                ],
                'correlation': [
                    { key: 'rules', label: 'Correlation Rules', icon: 'correlation', endpoint: '/10/CorrRule', model: 'CorrelationRule', idField: 'ruleId' }
                ],
                'policies': [
                    { key: 'notification', label: 'Notification', icon: 'policies', endpoint: '/10/NotifPol', model: 'NotificationPolicy', idField: 'policyId' },
                    { key: 'escalation', label: 'Escalation', icon: 'policies', endpoint: '/10/EscPolicy', model: 'EscalationPolicy', idField: 'policyId' }
                ],
                'maintenance': [
                    { key: 'windows', label: 'Maintenance Windows', icon: 'maintenance', endpoint: '/10/MaintWin', model: 'MaintenanceWindow', idField: 'windowId', supportedViews: ['table', 'calendar'] }
                ],
                'archive': [
                    { key: 'archived-alarms', label: 'Archived Alarms', icon: 'archive', endpoint: '/10/ArcAlarm', model: 'ArchivedAlarm', idField: 'alarmId', readOnly: true },
                    { key: 'archived-events', label: 'Archived Events', icon: 'archive', endpoint: '/10/ArcEvent', model: 'ArchivedEvent', idField: 'eventId', readOnly: true }
                ]
            }
        }
    };
})();
