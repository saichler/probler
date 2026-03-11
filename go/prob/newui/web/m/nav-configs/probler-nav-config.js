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
        },
        onSectionLoad(section, containerId) {
            if (section === 'dashboard') {
                // Render standalone stats in the section container (no duplicate IDs)
                var container = document.getElementById(containerId);
                if (!container) return;
                var origStats = document.getElementById('nav-stats');
                if (origStats) {
                    // Clone the entire grid wrapper to preserve nav-stats-grid layout
                    container.innerHTML = '<div class="nav-stats-grid">' + origStats.innerHTML + '</div>';
                    // Replace IDs to avoid duplicates
                    container.querySelectorAll('[id]').forEach(function(el) {
                        el.id = 'sec-' + el.id;
                    });
                    // Fetch stats into the new scoped IDs
                    if (typeof loadDashboardStats === 'function') {
                        loadDashboardStats('sec-');
                    }
                }
                return;
            }
            var url = 'sections/' + section + '.html?t=' + Date.now();
            fetch(url).then(function(r) { return r.text(); }).then(function(html) {
                var el = document.getElementById(containerId);
                if (!el) return;
                el.innerHTML = html;
                if (typeof MobileApp !== 'undefined') {
                    MobileApp.executeScripts(el);
                    MobileApp.initSection(section);
                }
            });
        }
    };
})();
