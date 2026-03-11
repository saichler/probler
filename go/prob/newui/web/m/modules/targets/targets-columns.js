/**
 * Mobile Targets Module - Column & Form Definitions
 * Desktop Equivalent: targets/targets.js columns
 */
(function() {
    'use strict';

    var col = window.Layer8ColumnFactory;
    var f = window.Layer8FormFactory;
    var render = MobileTargets.render;
    var enums = MobileTargets.enums;

    function getTargetAddresses(target) {
        if (!target.hosts) return '-';
        var addrs = [];
        var hosts = target.hosts;
        var keys = Object.keys(hosts);
        for (var i = 0; i < keys.length; i++) {
            var host = hosts[keys[i]];
            if (host && host.configs) {
                var ckeys = Object.keys(host.configs);
                for (var j = 0; j < ckeys.length; j++) {
                    var cfg = host.configs[ckeys[j]];
                    if (cfg && cfg.addr && addrs.indexOf(cfg.addr) === -1) {
                        addrs.push(cfg.addr);
                    }
                }
            }
        }
        return addrs.length > 0 ? addrs.join(', ') : '-';
    }

    MobileTargets.columns = {
        L8PTarget: [
            ...col.col('targetId', 'Target ID'),
            ...col.custom('addresses', 'Addresses', function(item) {
                return getTargetAddresses(item);
            }),
            ...col.col('linksId', 'Links ID'),
            ...col.custom('hosts', 'Hosts', function(item) {
                var count = item.hosts ? Object.keys(item.hosts).length : 0;
                return String(count);
            }),
            ...col.status('state', 'State', null, render.state),
            ...col.enum('inventoryType', 'Type', null, render.inventoryType)
        ]
    };

    MobileTargets.primaryKeys = {
        L8PTarget: 'targetId'
    };

    MobileTargets.forms = {
        L8PTarget: f.form('Target', [
            f.section('Target Details', [
                ...f.text('targetId', 'Target ID', true),
                ...f.text('linksId', 'Links ID'),
                ...f.select('state', 'State', enums.TARGET_STATES),
                ...f.select('inventoryType', 'Inventory Type', enums.INVENTORY_TYPES)
            ])
        ])
    };

    MobileTargets.getColumns = function(model) { return this.columns[model] || null; };
    MobileTargets.getFormDef = function(model) { return this.forms[model] || null; };
    MobileTargets.getTransformData = function() { return null; };

})();
