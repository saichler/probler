(function() {
    'use strict';
    // Endpoints from login.json: /0/Health, /73/users, /74/roles, /75/Creds
    window.PROBLER_NAV_CONFIG_SYSTEM = {
        system: {
            subModules: [
                { key: 'health', label: 'Health', icon: 'health' },
                { key: 'security', label: 'Security', icon: 'security' },
                { key: 'modules', label: 'Modules', icon: 'system' },
                { key: 'logs', label: 'Logs', icon: 'logs' },
                { key: 'dataimport', label: 'Data Import', icon: 'system' }
            ],
            services: {
                // Health — READ-ONLY monitoring table
                // Desktop (l8health.js): Layer8DTable with NO CRUD controls
                // Columns: service, rx, rxData, tx, txData, memory, cpuPercent, upTime, lastPulse
                // Row click → 4-tab detail modal (Overview, Network, Resources, Services)
                // Special: "Memory & CPU" pprof button (5s countdown, downloads .dat files)
                'health': [
                    { key: 'services-health', label: 'Service Health', icon: 'health', endpoint: '/0/Health', model: 'L8Health', idField: 'serviceId', readOnly: true, supportedViews: ['table'], onRowClick: function(item) { if (typeof showHealthDetail === 'function') showHealthDetail(item); } }
                ],
                // Security — EDITABLE tables with full CRUD
                // Desktop (l8security.js): Layer8DTable with CREATE/EDIT/DELETE
                // Detail popups use Layer8DPopup with form rendering
                'security': [
                    { key: 'users', label: 'Users', icon: 'security', endpoint: '/73/users', model: 'L8User', idField: 'userId', supportedViews: ['table'],
                        onRowClick: function(item) { if (typeof MobileSecurityUsersCRUD !== 'undefined') MobileSecurityUsersCRUD.showDetails({ endpoint: '/73/users', label: 'Users', model: 'L8User', idField: 'userId' }, item); },
                        onAdd: function() { if (typeof MobileSecurityUsersCRUD !== 'undefined') MobileSecurityUsersCRUD.openAdd({ endpoint: '/73/users', label: 'Users', model: 'L8User', idField: 'userId' }); },
                        onEdit: function(id, item) { if (typeof MobileSecurityUsersCRUD !== 'undefined') MobileSecurityUsersCRUD.openEdit({ endpoint: '/73/users', label: 'Users', model: 'L8User', idField: 'userId' }, id); },
                        onDelete: function(id) { if (typeof MobileSecurityUsersCRUD !== 'undefined') MobileSecurityUsersCRUD.confirmDelete({ endpoint: '/73/users', label: 'Users', model: 'L8User', idField: 'userId' }, id); }
                    },
                    { key: 'roles', label: 'Roles', icon: 'security', endpoint: '/74/roles', model: 'L8Role', idField: 'roleId', supportedViews: ['table'],
                        onRowClick: function(item) { if (typeof MobileSecurityRolesCRUD !== 'undefined') MobileSecurityRolesCRUD.showDetails({ endpoint: '/74/roles', label: 'Roles', model: 'L8Role', idField: 'roleId' }, item); },
                        onAdd: function() { if (typeof MobileSecurityRolesCRUD !== 'undefined') MobileSecurityRolesCRUD.openAdd({ endpoint: '/74/roles', label: 'Roles', model: 'L8Role', idField: 'roleId' }); },
                        onEdit: function(id, item) { if (typeof MobileSecurityRolesCRUD !== 'undefined') MobileSecurityRolesCRUD.openEdit({ endpoint: '/74/roles', label: 'Roles', model: 'L8Role', idField: 'roleId' }, id); },
                        onDelete: function(id) { if (typeof MobileSecurityRolesCRUD !== 'undefined') MobileSecurityRolesCRUD.confirmDelete({ endpoint: '/74/roles', label: 'Roles', model: 'L8Role', idField: 'roleId' }, id); }
                    },
                    { key: 'credentials', label: 'Credentials', icon: 'security', endpoint: '/75/Creds', model: 'L8Credentials', idField: 'id', supportedViews: ['table'],
                        onRowClick: function(item) { if (typeof MobileSecurityCredentialsCRUD !== 'undefined') MobileSecurityCredentialsCRUD.showDetails({ endpoint: '/75/Creds', label: 'Credentials', model: 'L8Credentials', idField: 'id' }, item); },
                        onAdd: function() { if (typeof MobileSecurityCredentialsCRUD !== 'undefined') MobileSecurityCredentialsCRUD.openAdd({ endpoint: '/75/Creds', label: 'Credentials', model: 'L8Credentials', idField: 'id' }); },
                        onEdit: function(id, item) { if (typeof MobileSecurityCredentialsCRUD !== 'undefined') MobileSecurityCredentialsCRUD.openEdit({ endpoint: '/75/Creds', label: 'Credentials', model: 'L8Credentials', idField: 'id' }, id); },
                        onDelete: function(id) { if (typeof MobileSecurityCredentialsCRUD !== 'undefined') MobileSecurityCredentialsCRUD.confirmDelete({ endpoint: '/75/Creds', label: 'Credentials', model: 'L8Credentials', idField: 'id' }, id); }
                    }
                ],
                // Modules — custom toggle tree with dependency graph
                // Desktop (l8sys-modules.js): Layer8DToggleTree with enable/disable
                // Features: dependency enforcement, foundation badges, save/cancel/enable-all buttons
                // Dependency map visualization (L8SysModulesMap.js)
                'modules': [
                    { key: 'module-config', label: 'Module Config', icon: 'system', customInit: 'L8SysModules', customContainer: 'modules-settings-container' }
                ],
                // Logs — custom file tree + paginated log viewer
                // Desktop (l8logs.js): Tree view (directories/files) on left, content in popup
                // Features: 5KB page pagination with byte offsets, First/Prev/Next/Last nav
                // Endpoint: /87/logs with L8Query mapreduce
                'logs': [
                    { key: 'log-viewer', label: 'Log Viewer', icon: 'logs', customInit: 'L8Logs', customContainer: 'logs-table-container' }
                ],
                // Data Import — custom 3-tab interface
                // Desktop (l8dataimport.js): Templates | Transfer | Import sub-tabs
                // Features: import template CRUD, data source config, column mapping, import execution
                'dataimport': [
                    { key: 'data-import', label: 'Data Import', icon: 'system', customInit: 'L8DataImport', customContainer: 'dataimport-container' }
                ]
            }
        }
    };
})();
