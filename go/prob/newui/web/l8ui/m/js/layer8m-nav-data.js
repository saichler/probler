/*
© 2025 Sharon Aicler (saichler@gmail.com)

Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
/**
 * Layer8MNav - Data Loading and Registry Lookup
 * Handles service data loading, column/form definitions
 */
(function() {
    'use strict';

    // Set active table callback
    const setActiveTable = (table) => { window._Layer8MNavActiveTable = table; };

    window.Layer8MNavData = {
        /**
         * Load service data into table
         */
        loadServiceData(serviceConfig) {
            const container = document.getElementById('service-table-container');
            if (!container) return;

            // Get form definition for this service
            const formDef = this.getServiceFormDef(serviceConfig);
            const columns = this.getServiceColumns(serviceConfig);
            const transformData = this.getServiceTransformData(serviceConfig);

            // Build table config
            const tableConfig = {
                endpoint: Layer8MConfig.resolveEndpoint(serviceConfig.endpoint),
                modelName: serviceConfig.model,
                columns: columns,
                rowsPerPage: 15,
                getItemId: (item) => item[serviceConfig.idField] || item.id
            };

            // Add transform if available
            if (transformData) {
                tableConfig.transformData = transformData;
            }

            // Add CRUD callbacks only for non-readOnly services
            if (!serviceConfig.readOnly) {
                tableConfig.statusField = 'status';
                tableConfig.addButtonText = `Add ${serviceConfig.label.replace(/s$/, '')}`;
                tableConfig.onAdd = () => Layer8MNavCrud.openServiceForm(serviceConfig, formDef, null);
                tableConfig.onEdit = (id, item) => Layer8MNavCrud.openServiceForm(serviceConfig, formDef, item);
                tableConfig.onDelete = (id, item) => Layer8MNavCrud.deleteServiceRecord(serviceConfig, id, item);
                tableConfig.onRowClick = (item, id) => Layer8MNavCrud.showRecordDetails(serviceConfig, formDef, item);
            }

            const activeTable = new Layer8MEditTable('service-table-container', tableConfig);
            setActiveTable(activeTable);
        },

        /**
         * Get columns for a service from registered mobile module registries
         */
        getServiceColumns(serviceConfig) {
            if (serviceConfig.model) {
                // Try all registered mobile module registries
                const registries = [
                    window.MobileHCM, window.MobileFIN, window.MobileSCM,
                    window.MobileSales, window.MobileMfg, window.MobileCrm,
                    window.MobileBi, window.MobileDoc, window.MobileComp,
                    window.MobilePrj, window.MobileEcom, window.MobileSYS
                ];
                for (const reg of registries) {
                    if (reg && reg.getColumns) {
                        const columns = reg.getColumns(serviceConfig.model);
                        if (columns) return columns;
                    }
                }
            }

            // Fallback to defaults
            return [
                { key: serviceConfig.idField, label: 'ID', sortKey: serviceConfig.idField },
                { key: 'name', label: 'Name', sortKey: 'name' },
                { key: 'status', label: 'Status', sortKey: 'status', render: (item) => Layer8MRenderers.renderBoolean(item.status) }
            ];
        },

        /**
         * Get transform data function for a service from registered registries
         */
        getServiceTransformData(serviceConfig) {
            if (serviceConfig.model) {
                const registries = [
                    window.MobileHCM, window.MobileFIN, window.MobileSCM,
                    window.MobileSales, window.MobileMfg, window.MobileCrm,
                    window.MobileBi, window.MobileDoc, window.MobileComp,
                    window.MobilePrj, window.MobileEcom, window.MobileSYS
                ];
                for (const reg of registries) {
                    if (reg && reg.getTransformData) {
                        const transform = reg.getTransformData(serviceConfig.model);
                        if (transform) return transform;
                    }
                }
            }
            return null;
        },

        /**
         * Get form definition for a service from registered mobile module registries
         */
        getServiceFormDef(serviceConfig) {
            if (serviceConfig.model) {
                // Try all registered mobile module registries
                const registries = [
                    window.MobileHCM, window.MobileFIN, window.MobileSCM,
                    window.MobileSales, window.MobileMfg, window.MobileCrm,
                    window.MobileBi, window.MobileDoc, window.MobileComp,
                    window.MobilePrj, window.MobileEcom, window.MobileSYS
                ];
                for (const reg of registries) {
                    if (reg && reg.getFormDef) {
                        const formDef = reg.getFormDef(serviceConfig.model);
                        if (formDef) return formDef;
                    }
                }
            }

            // Fallback to generic form
            return {
                title: serviceConfig.label,
                sections: [
                    {
                        title: 'Basic Information',
                        fields: [
                            { key: 'name', label: 'Name', type: 'text', required: true },
                            { key: 'description', label: 'Description', type: 'textarea' },
                            { key: 'status', label: 'Status', type: 'select', options: { 1: 'Active', 0: 'Inactive' } }
                        ]
                    }
                ]
            };
        }
    };

})();
