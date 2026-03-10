/**
 * Mobile GPUs Module - Enum Definitions
 * Desktop Equivalent: probler/gpus/gpus-enums.js
 */
(function() {
    'use strict';

    const factory = window.Layer8EnumFactory;
    const { createStatusRenderer } = Layer8MRenderers;

    window.MobileGpus = window.MobileGpus || {};

    const GPU_STATUS = factory.create([
        ['Operational', 'operational', 'status-active'],
        ['Warning', 'warning', 'status-pending'],
        ['Critical', 'critical', 'status-terminated']
    ]);

    MobileGpus.enums = {
        GPU_STATUS: GPU_STATUS.enum,
        GPU_STATUS_VALUES: GPU_STATUS.values,
        GPU_STATUS_CLASSES: GPU_STATUS.classes
    };

    MobileGpus.render = {
        gpuStatus: createStatusRenderer(GPU_STATUS.enum, GPU_STATUS.classes)
    };

})();
