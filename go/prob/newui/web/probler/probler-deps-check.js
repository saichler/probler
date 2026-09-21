(function() {
    'use strict';

    // Fail-fast dependency check.
    //
    // Every name below is called unguarded somewhere in the scripts this shell
    // loads, so a missing one is a hard bug -- an l8ui bump that drops or renames
    // a file, or a script tag that was never added. Without this check the symptom
    // is either a ReferenceError thrown from deep inside a table render, or worse,
    // a feature that silently does nothing because its call site happens to sit
    // behind a `typeof x !== 'undefined'` guard.
    //
    // Regenerate the lists by scanning the loaded scripts for unguarded
    // Layer8*/L8* member calls; do not hand-edit to make a failure go away.
    var REQUIRED_DESKTOP = [
        'L8DIExecute', 'L8DITemplates', 'L8DITransfer', 'L8DataImport', 'L8EventsAlarmDetail',
        'L8EventsAlarmTable', 'L8EventsEnums', 'L8EventsEventViewer', 'L8EventsStateActions',
        'L8Health', 'L8Logs', 'L8NotifyEnums', 'L8Security', 'L8Sys', 'Layer8ColumnFactory',
        'Layer8CsvExport', 'Layer8DCalendar', 'Layer8DCalendarEvents', 'Layer8DCalendarRender',
        'Layer8DChart', 'Layer8DChartBar', 'Layer8DChartLine', 'Layer8DChartPie',
        'Layer8DConfig', 'Layer8DDataSource', 'Layer8DDatePicker', 'Layer8DForms',
        'Layer8DFormsData', 'Layer8DFormsFields', 'Layer8DFormsModal', 'Layer8DFormsPickers',
        'Layer8DGantt', 'Layer8DGanttEvents', 'Layer8DGanttRender', 'Layer8DInputFormatter',
        'Layer8DKanban', 'Layer8DKanbanEvents', 'Layer8DKanbanRender', 'Layer8DModuleCRUD',
        'Layer8DModuleFactory', 'Layer8DModuleFilter', 'Layer8DModuleNavigation',
        'Layer8DNotification', 'Layer8DPermissionFilter', 'Layer8DPopup',
        'Layer8DPortalSwitcher', 'Layer8DReferencePicker', 'Layer8DReferenceRegistry',
        'Layer8DRenderers', 'Layer8DServiceRegistry', 'Layer8DTimeline', 'Layer8DToggleTree',
        'Layer8DTreeGrid', 'Layer8DTreeGridEvents', 'Layer8DTreeGridRender', 'Layer8DUtils',
        'Layer8DViewFactory', 'Layer8DWebSocket', 'Layer8DWidget', 'Layer8DWizard',
        'Layer8DWizardRender', 'Layer8DatepickerGrid', 'Layer8EnumFactory',
        'Layer8ExcelExport', 'Layer8FieldParsers', 'Layer8FileUpload', 'Layer8FormChips',
        'Layer8FormatDisplay', 'Layer8InlineTableState', 'Layer8ModuleConfigFactory',
        'Layer8ModuleFactoryCore', 'Layer8PdfExport', 'Layer8PeriodSelector',
        'Layer8QueryBuilder', 'Layer8ReferenceConfigResolver', 'Layer8SectionConfigs',
        'Layer8SvgFactory', 'Layer8ViewSwitcher'
    ];

    var REQUIRED_MOBILE = [
        'L8DIExecute', 'L8DITemplates', 'L8DITransfer', 'L8DataImport', 'L8EventsEnums',
        'L8EventsEventViewer', 'L8Logs', 'Layer8ColumnFactory', 'Layer8CsvExport',
        'Layer8DCalendar', 'Layer8DCalendarEvents', 'Layer8DCalendarRender', 'Layer8DChart',
        'Layer8DChartBar', 'Layer8DChartLine', 'Layer8DChartPie', 'Layer8DConfig',
        'Layer8DDataSource', 'Layer8DGantt', 'Layer8DGanttEvents', 'Layer8DGanttRender',
        'Layer8DKanban', 'Layer8DKanbanEvents', 'Layer8DKanbanRender', 'Layer8DModuleFilter',
        'Layer8DPopup', 'Layer8DReferenceRegistry', 'Layer8DTimeline', 'Layer8DToggleTree',
        'Layer8DTreeGrid', 'Layer8DTreeGridEvents', 'Layer8DTreeGridRender', 'Layer8DUtils',
        'Layer8DViewFactory', 'Layer8DWebSocket', 'Layer8DWizard', 'Layer8DWizardRender',
        'Layer8DatepickerGrid', 'Layer8EnumFactory', 'Layer8ExcelExport', 'Layer8FieldParsers',
        'Layer8FileUpload', 'Layer8FormChips', 'Layer8FormatDisplay', 'Layer8InlineTableState',
        'Layer8MAuth', 'Layer8MCalendar', 'Layer8MChart', 'Layer8MConfig', 'Layer8MConfirm',
        'Layer8MDataSource', 'Layer8MDatePicker', 'Layer8MEditTable', 'Layer8MForms',
        'Layer8MGantt', 'Layer8MKanban', 'Layer8MModuleRegistry', 'Layer8MNav',
        'Layer8MNavCrud', 'Layer8MNavData', 'Layer8MPopup', 'Layer8MReferencePicker',
        'Layer8MReferenceRegistry', 'Layer8MRenderers', 'Layer8MTable', 'Layer8MTimeline',
        'Layer8MTreeGrid', 'Layer8MUtils', 'Layer8MViewFactory', 'Layer8MWizard',
        'Layer8PdfExport', 'Layer8PeriodSelector', 'Layer8QueryBuilder',
        'Layer8ReferenceConfigResolver', 'Layer8ViewSwitcher'
    ];

    // Run at DOM-ready rather than synchronously. Some l8ui modules assign their
    // global after an init() that fires immediately when the document is already
    // parsed (l8ui/popup/layer8d-popup.js is one), so a synchronous check can race
    // them and report a false missing. Our listener is registered before app init's,
    // so this still fails before anything uses these globals.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', check);
    } else {
        check();
    }

    function check() {
    var isMobile = /(^|\/)m\//.test(window.location.pathname);
    var required = isMobile ? REQUIRED_MOBILE : REQUIRED_DESKTOP;

    var missing = required.filter(function(name) {
        return typeof window[name] === 'undefined';
    });

    if (missing.length === 0) return;

    var shell = isMobile ? 'mobile' : 'desktop';
    var msg = 'Probler ' + shell + ' shell: ' + missing.length + ' required global(s) not loaded: ' +
              missing.join(', ') + '. A script tag is missing from ' +
              (isMobile ? 'm/app.html' : 'app.html') + ', or the l8ui submodule no longer ' +
              'provides the file that defines it.';

    // Make it impossible to miss: log it, put it on screen, and throw.
    console.error(msg);
    try {
        var banner = document.createElement('div');
        banner.setAttribute('style', [
            'position:fixed', 'inset:0', 'z-index:2147483647',
            'background:#1a0000', 'color:#ff9b9b', 'padding:24px',
            'font:13px/1.5 monospace', 'overflow:auto', 'white-space:pre-wrap'
        ].join(';'));
        banner.textContent = 'Startup dependency check failed\n\n' + msg;
        (document.body || document.documentElement).appendChild(banner);
    } catch (e) {
        // If even this fails the throw below still surfaces it.
    }
    throw new Error(msg);
    }
})();
