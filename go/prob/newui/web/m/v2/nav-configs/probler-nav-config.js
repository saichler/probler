(function() {
    'use strict';
    var mon = window.PROBLER_NAV_CONFIG_MONITORING;
    window.LAYER8M_NAV_CONFIG = {
        homeSectionTitle: 'Probler Sections',
        modules: window.LAYER8M_NAV_CONFIG_BASE.modules,
        // Each desktop section is a top-level module
        dashboard: mon.dashboard,
        inventory: mon.inventory,
        network: mon.network,
        gpus: mon.gpus,
        hosts: mon.hosts,
        kubernetes: mon.kubernetes,
        topologies: mon.topologies,
        alarms: window.PROBLER_NAV_CONFIG_ALM.alarms,
        system: window.PROBLER_NAV_CONFIG_SYSTEM.system,
        // Placeholders — no config object = "Coming Soon" card
        // infrastructure, automation, applications, analytics
        icons: window.LAYER8M_NAV_CONFIG_ICONS.icons,
        getIcon(key) {
            return this.icons[key] || this.icons['default'];
        }
    };
})();
