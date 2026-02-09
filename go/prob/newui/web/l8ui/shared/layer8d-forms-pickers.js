/*
© 2025 Sharon Aicler (saichler@gmail.com)

Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
/**
 * ERP Form Pickers Integration
 * Handles date pickers and reference pickers
 */
(function() {
    'use strict';

    // Store current form context for save handler
    let currentFormContext = null;

    // ========================================
    // DATE PICKER INTEGRATION
    // ========================================

    /**
     * Attach date pickers to all date inputs in a container
     */
    function attachDatePickers(container) {
        if (typeof Layer8DDatePicker === 'undefined') return;

        const dateInputs = container.querySelectorAll('input.date-input');
        dateInputs.forEach(input => {
            Layer8DDatePicker.attach(input);
        });

        const triggers = container.querySelectorAll('.date-picker-trigger');
        triggers.forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const inputId = trigger.dataset.for;
                const input = container.querySelector(`#${inputId}`);
                if (input) {
                    Layer8DDatePicker.open(input);
                }
            });
        });

        attachInputFormatters(container);
        attachReferencePickers(container);
    }

    /**
     * Attach input formatters to all formatted inputs in a container
     */
    function attachInputFormatters(container) {
        if (typeof Layer8DInputFormatter === 'undefined') return;
        Layer8DInputFormatter.attachAll(container);
    }

    // ========================================
    // REFERENCE PICKER INTEGRATION
    // ========================================

    /**
     * Find field definition from form definition by key
     */
    function findFieldDef(formDef, fieldKey) {
        if (!formDef || !formDef.sections) return null;
        for (const section of formDef.sections) {
            for (const field of section.fields) {
                if (field.key === fieldKey) {
                    return field;
                }
            }
        }
        return null;
    }

    /**
     * Look up endpoint for a model from module configs
     */
    function getEndpointForModel(modelName) {
        const namespaces = typeof Layer8DServiceRegistry !== 'undefined'
            ? Layer8DServiceRegistry.getRegisteredModules()
            : [];
        for (const ns of namespaces) {
            const mod = window[ns];
            if (!mod || !mod.modules) continue;
            for (const moduleKey in mod.modules) {
                const module = mod.modules[moduleKey];
                if (module.services) {
                    for (const service of module.services) {
                        if (service.model === modelName) {
                            return Layer8DConfig.resolveEndpoint(service.endpoint);
                        }
                    }
                }
            }
        }
        return null;
    }

    /**
     * Fetch display value for a reference field by ID
     */
    async function fetchReferenceDisplayValue(config, idValue) {
        if (!config.endpoint || !idValue) {
            return null;
        }

        const columns = config.selectColumns || [config.idColumn, config.displayColumn];
        const query = `select ${columns.join(',')} from ${config.modelName} where ${config.idColumn}=${idValue}`;

        try {
            const body = encodeURIComponent(JSON.stringify({ text: query }));
            const response = await fetch(config.endpoint + '?body=' + body, {
                method: 'GET',
                headers: typeof getAuthHeaders === 'function'
                    ? getAuthHeaders()
                    : { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                return null;
            }

            const data = await response.json();
            const items = data.list || [];

            if (items.length > 0) {
                const item = items[0];
                const displayValue = config.displayFormat
                    ? config.displayFormat(item)
                    : item[config.displayColumn];
                return { displayValue, item };
            }
            return null;
        } catch (error) {
            console.error('Error fetching reference display value:', error);
            return null;
        }
    }

    /**
     * Attach reference pickers to all reference inputs in a container
     */
    function attachReferencePickers(container) {
        if (typeof Layer8DReferencePicker === 'undefined') {
            return;
        }

        const refInputs = container.querySelectorAll('input.reference-input');
        refInputs.forEach(async input => {
            let config = {};
            try {
                config = JSON.parse(input.dataset.refConfig || '{}');
            } catch (e) {
                console.warn('Invalid reference config for', input.name);
                return;
            }

            if (!config.modelName || !config.idColumn || !config.displayColumn) {
                console.warn('Reference input missing required config:', input.name);
                return;
            }

            if (!config.endpoint) {
                config.endpoint = getEndpointForModel(config.modelName);
                if (!config.endpoint) {
                    return;
                }
            }

            // Get displayFormat from registry
            const lookupModel = input.dataset.lookupModel || config.modelName;
            if (lookupModel && typeof Layer8DReferenceRegistry !== 'undefined') {
                const registryConfig = Layer8DReferenceRegistry[lookupModel];
                if (registryConfig) {
                    if (registryConfig.displayFormat && !config.displayFormat) {
                        config.displayFormat = registryConfig.displayFormat;
                    }
                    if (registryConfig.selectColumns && !config.selectColumns) {
                        config.selectColumns = registryConfig.selectColumns;
                    }
                }
            }

            // Get from field definition
            const fieldKey = input.dataset.fieldKey || input.name;
            if (currentFormContext && currentFormContext.formDef) {
                const fieldDef = findFieldDef(currentFormContext.formDef, fieldKey);
                if (fieldDef && fieldDef.referenceConfig) {
                    if (fieldDef.referenceConfig.displayFormat) {
                        config.displayFormat = fieldDef.referenceConfig.displayFormat;
                    }
                    if (fieldDef.referenceConfig.selectColumns) {
                        config.selectColumns = fieldDef.referenceConfig.selectColumns;
                    }
                }
            }

            Layer8DReferencePicker.attach(input, config);

            // Fetch display value if ID exists
            const refId = input.dataset.refId;
            if (refId && refId !== '' && refId !== 'undefined') {
                const result = await fetchReferenceDisplayValue(config, refId);
                if (result) {
                    input.value = result.displayValue;
                    if (result.item) {
                        input.dataset.refItem = JSON.stringify(result.item);
                    }
                }
            }
        });
    }

    // ========================================
    // FORM CONTEXT MANAGEMENT
    // ========================================

    function setFormContext(formDef, serviceConfig) {
        currentFormContext = {
            formDef: formDef,
            serviceConfig: serviceConfig || null,
            isEdit: false,
            recordId: null,
            onSuccess: null
        };
    }

    function getFormContext() {
        return currentFormContext;
    }

    function updateFormContext(updates) {
        if (currentFormContext) {
            Object.assign(currentFormContext, updates);
        }
    }

    function clearFormContext() {
        currentFormContext = null;
    }

    // Export
    window.Layer8DFormsPickers = {
        attachDatePickers,
        attachInputFormatters,
        attachReferencePickers,
        fetchReferenceDisplayValue,
        getEndpointForModel,
        findFieldDef,
        setFormContext,
        getFormContext,
        updateFormContext,
        clearFormContext
    };

})();
