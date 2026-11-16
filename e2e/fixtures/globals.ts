/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// Resolving an l8ui global by name, correctly.
//
// Two different declaration styles are in use, and they land in two different
// places:
//
//   window.Layer8DUtils = { ... }     -> a property of window
//   class Layer8DTable { ... }        -> a binding in the GLOBAL LEXICAL
//                                        environment, which is NOT a property
//                                        of window
//
// l8ui/edit_table/layer8d-table-core.js declares `class Layer8DTable` at top
// level of a classic script, so `window.Layer8DTable` is undefined while the
// bare identifier `Layer8DTable` resolves fine. Checking only window props
// reports a false missing for it -- and, worse, would report a false PASS for
// the reverse case if the lists ever diverged.
//
// `new Function(...)` bodies execute in global scope, so they see both.

import { Page } from '@playwright/test';

export async function missingGlobals(page: Page, names: string[]): Promise<string[]> {
    return page.evaluate((list: string[]) => {
        const w = window as unknown as Record<string, unknown>;
        return list.filter((name) => {
            if (typeof w[name] !== 'undefined') return false;
            try {
                // Resolves global lexical declarations (class/let/const).
                const probe = new Function(`return typeof ${name};`) as () => string;
                return probe() === 'undefined';
            } catch {
                // CSP blocked the probe -- fall back to the window check alone.
                return true;
            }
        });
    }, names);
}

/** Globals every desktop shell must have once all its scripts have run. */
export const DESKTOP_REQUIRED_GLOBALS = [
    'Layer8DConfig', 'Layer8DUtils', 'Layer8DRenderers', 'Layer8DReferenceRegistry',
    'Layer8QueryBuilder', 'Layer8EnumFactory', 'Layer8RefFactory', 'Layer8ColumnFactory',
    'Layer8FormFactory', 'Layer8SvgFactory', 'Layer8ModuleConfigFactory',
    'Layer8SectionGenerator', 'Layer8SectionConfigs', 'Layer8DNotification',
    'Layer8DInputFormatter', 'Layer8FieldParsers', 'Layer8FormatDisplay',
    'Layer8DFormsFields', 'Layer8FormChips', 'Layer8PeriodSelector',
    'Layer8DFormsData', 'Layer8DFormsPickers', 'Layer8InlineTableState',
    'Layer8ReferenceConfigResolver', 'Layer8DFormsModal', 'Layer8DForms',
    'Layer8DPopup', 'Layer8DDatePicker', 'Layer8DatepickerGrid',
    'Layer8DReferencePicker', 'Layer8DTable', 'Layer8CsvExport',
    'Layer8DDataSource', 'Layer8DViewFactory', 'Layer8ViewSwitcher',
    'Layer8DServiceRegistry', 'Layer8DModuleCRUD', 'Layer8DModuleNavigation',
    'Layer8DToggleTree', 'Layer8DModuleFilter', 'Layer8DPermissionFilter',
    'Layer8ModuleFactoryCore', 'Layer8DModuleFactory', 'Layer8DWebSocket',
    // probler
    'Probler', 'ProblerNetwork', 'ProblerGpus', 'ProblerHosts', 'ProblerK8s',
    'ProblerPermissions', 'Alm', 'L8Sys', 'LivePopup', 'loadSection',
    'initializeDashboard', 'initializeNetworkDevices', 'initializeGPUs', 'initializeHosts',
    'initializeKubernetes', 'initializeAlm', 'initializeL8Sys',
    // Chat (l8chat)
    'Layer8Markdown', 'L8ChatApi', 'L8ChatStore', 'L8ChatLive', 'L8ChatSession', 'L8ChatFiles', 'L8ChatStatus',
    'L8ChatSidebar', 'L8ChatConvList', 'L8ChatComposer', 'L8ChatThread', 'L8ChatGroupDialog', 'L8ChatConvDialog',
    'PROBLER_CHAT_ENDPOINTS', 'L8ChatBubble'
];

/** Globals the mobile bundle must have -- its own plus the shared desktop ones. */
export const MOBILE_REQUIRED_GLOBALS = [
    'Layer8MConfig', 'Layer8MAuth', 'Layer8MUtils', 'Layer8MPopup', 'Layer8MConfirm',
    'Layer8MTable', 'Layer8MEditTable', 'Layer8MForms', 'Layer8MDatePicker',
    'Layer8MReferencePicker', 'Layer8MReferenceRegistry', 'Layer8MRenderers',
    'Layer8MModuleRegistry', 'Layer8MNav', 'Layer8MNavCrud', 'Layer8MNavData',
    'Layer8MDataSource', 'Layer8MViewFactory',
    'Layer8DConfig', 'Layer8DUtils', 'Layer8DRenderers', 'Layer8DReferenceRegistry',
    'Layer8QueryBuilder', 'Layer8EnumFactory', 'Layer8RefFactory', 'Layer8ColumnFactory',
    'Layer8FormFactory', 'Layer8FormChips', 'Layer8FieldParsers', 'Layer8PeriodSelector',
    'Layer8InlineTableState', 'Layer8ReferenceConfigResolver', 'Layer8DatepickerGrid',
    'Layer8ViewSwitcher', 'Layer8DToggleTree', 'Layer8DModuleFilter', 'Layer8DWebSocket',
    // probler
    'MobileApp', 'LAYER8M_NAV_CONFIG', 'ProblerPermissions', 'MobileMonitoring', 'MobileALM',
    'MobileTargets',
    // Chat (l8chat)
    'Layer8Markdown', 'L8ChatApi', 'L8ChatStore', 'L8ChatLive', 'L8ChatSession', 'L8ChatFiles', 'L8ChatStatus',
    'L8ChatSidebar', 'L8ChatConvList', 'L8ChatComposer', 'L8ChatThread', 'L8ChatGroupDialog', 'L8ChatConvDialog',
    'PROBLER_CHAT_ENDPOINTS', 'L8ChatMobile', 'L8ChatBubbleMobile'
];
