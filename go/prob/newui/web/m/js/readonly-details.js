/**
 * Read-only detail popups for mobile services that have no custom detail view.
 *
 * l8ui's layer8m-nav-data.js wires Layer8MNavCrud.showRecordDetails only for
 * writable services; a readOnly service without its own onRowClick opens
 * nothing on tap, while the desktop opens a view-only popup for the same rows.
 * This restores parity: resolve the model's form from the module registries
 * and show the same read-only record view.
 */
(function() {
    'use strict';

    function formDefFor(model) {
        var regs = Layer8MModuleRegistry.all();
        for (var i = 0; i < regs.length; i++) {
            if (regs[i].hasModel(model)) {
                var formDef = regs[i].getFormDef(model);
                if (formDef) return formDef;
            }
        }
        throw new Error('ProblerMobileDetails: no form registered for model ' + model);
    }

    window.ProblerMobileDetails = {
        /** onRowClick for a readOnly nav service: the record, view-only. */
        readOnly: function(serviceConfig) {
            return function(item) {
                Layer8MNavCrud.showRecordDetails(serviceConfig, formDefFor(serviceConfig.model), item);
            };
        }
    };
})();
