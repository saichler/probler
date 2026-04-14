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

    // ── Forms ───────────────────────────────────────────────────────
    MobileSystem.forms = MobileSystem.forms || {};

    MobileSystem.forms.L8User = f.form('User', [
        f.section('User Info', [
            ...f.text('userId', 'User ID', true),
            ...f.text('fullName', 'Full Name', true),
            ...f.text('password', 'Password')
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
