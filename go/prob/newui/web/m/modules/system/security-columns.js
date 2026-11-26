/**
 * Mobile System Module - Security Columns & Forms
 * Desktop Equivalent: l8ui/sys/security/l8security-columns.js, l8security-forms.js
 */
(function() {
    'use strict';

    window.MobileSystem = window.MobileSystem || {};

    var col = window.Layer8ColumnFactory;
    var f = window.Layer8FormFactory;

    var ACCOUNT_STATUS = { 0: 'Unspecified', 1: 'Active', 2: 'Inactive', 3: 'Locked', 4: 'Suspended', 5: 'Pending Activation' };
    var ACCOUNT_STATUS_CLASSES = { 1: 'status-active', 2: 'status-terminated', 3: 'status-terminated', 4: 'status-pending', 5: 'status-pending' };
    var accountStatusRenderer = Layer8MRenderers.createStatusRenderer(ACCOUNT_STATUS, ACCOUNT_STATUS_CLASSES);

    // ── User columns ────────────────────────────────────────────────
    MobileSystem.columns.L8User = [
        ...col.col('userId', 'User ID'),
        ...col.col('fullName', 'Full Name'),
        ...col.col('email', 'Email'),
        ...col.custom('accountStatus', 'Status', function(item) { return accountStatusRenderer(item.accountStatus); }),
        ...col.custom('roles', 'Assigned Roles', function(item) {
            var roleIds = Object.keys(item.roles || {}).filter(function(r) { return item.roles[r]; });
            return roleIds.length > 0 ? roleIds.join(', ') : '-';
        }),
        ...col.col('portal', 'Portal'),
        ...col.date('lastLogin', 'Last Login')
    ];

    // ── Role columns ────────────────────────────────────────────────
    MobileSystem.columns.L8Role = [
        ...col.col('roleId', 'Role ID'),
        ...col.col('roleName', 'Role Name'),
        ...col.custom('rules', 'Rules Count', function(item) {
            return String(item.rules ? Object.keys(item.rules).length : 0);
        })
    ];

    // ── Credentials columns ─────────────────────────────────────────
    MobileSystem.columns.L8Credentials = [
        ...col.col('id', 'ID'),
        ...col.col('name', 'Name'),
        ...col.custom('creds', 'Items Count', function(item) {
            return String(item.creds ? Object.keys(item.creds).length : 0);
        })
    ];

    // ── Primary Keys ────────────────────────────────────────────────
    MobileSystem.primaryKeys.L8User = 'userId';
    MobileSystem.primaryKeys.L8Role = 'roleId';
    MobileSystem.primaryKeys.L8Credentials = 'id';
    MobileSystem.primaryKeys.L8Portal = 'portalId';

    // ── API Key columns: the shared l8ui component (L8SysApiKeysMobile) ──
    MobileSystem.columns.L8ApiKey = L8SysApiKeysMobile.columns;
    MobileSystem.primaryKeys.L8ApiKey = 'keyId';

    // ── Portal columns (desktop: l8security-columns.js L8Portal) ────
    MobileSystem.columns.L8Portal = [
        ...col.col('portalId', 'Portal ID'),
        ...col.custom('portals', 'Portals', function(item) {
            var keys = Object.keys(item.portals || {});
            return keys.length > 0 ? keys.join(', ') : '-';
        })
    ];

    // ── Integration Config (desktop: l8security-columns.js / -forms.js IntegrationConfig) ──
    var INTEGRATION_TYPES = { 0: 'Unspecified', 1: 'SMTP', 2: 'Webhook', 3: 'Slack', 4: 'PagerDuty', 5: 'Custom' };
    MobileSystem.primaryKeys.IntegrationConfig = 'integrationId';
    MobileSystem.columns.IntegrationConfig = [
        ...col.col('name', 'Name'),
        ...col.custom('type', 'Type', function(item) {
            return INTEGRATION_TYPES[item.type] || String(item.type || '');
        }),
        ...col.col('host', 'Host'),
        ...col.col('fromAddress', 'From Address')
    ];

    // ── Forms ───────────────────────────────────────────────────────
    MobileSystem.forms = MobileSystem.forms || {};

    MobileSystem.forms.IntegrationConfig = f.form('Integration Config', [
        f.section('Identity', [
            ...f.text('name', 'Name (e.g. "smtp")', true),
            ...f.select('type', 'Type', INTEGRATION_TYPES)
        ]),
        f.section('SMTP Settings', [
            ...f.text('host', 'SMTP Host'),
            ...f.number('port', 'SMTP Port'),
            ...f.checkbox('useTls', 'Use STARTTLS'),
            ...f.text('fromAddress', 'From Email Address'),
            ...f.text('fromName', 'From Display Name')
        ]),
        f.section('Credentials', [
            ...f.text('credentialKey', 'Credential Key (security store)')
        ]),
        f.section('Webhook / Advanced', [
            ...f.text('url', 'URL'),
            ...f.number('retryCount', 'Retry Count'),
            ...f.number('timeoutMs', 'Timeout (ms)')
        ])
    ]);

    MobileSystem.forms.L8User = f.form('User', [
        f.section('User Info', [
            ...f.text('userId', 'User ID', true),
            ...f.text('fullName', 'Full Name', true),
            ...f.text('password', 'Password')
        ])
    ]);

    MobileSystem.forms.L8Portal = f.form('Portal', [
        f.section('Portal Info', [
            ...f.text('portalId', 'Portal ID', true)
        ])
    ]);

    MobileSystem.forms.L8Role = f.form('Role', [
        f.section('Role Info', [
            ...f.text('roleId', 'Role ID', true),
            ...f.text('roleName', 'Role Name', true)
        ])
    ]);

    MobileSystem.forms.L8Credentials = f.form('Credentials', [
        f.section('Credentials Info', [
            ...f.text('id', 'ID', true),
            ...f.text('name', 'Name', true)
        ])
    ]);

    // ── Form Def Getter ─────────────────────────────────────────────
    MobileSystem.getFormDef = function(model) {
        return this.forms[model] || null;
    };

})();
