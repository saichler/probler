/*
© 2025 Sharon Aicler (saichler@gmail.com)

Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
/**
 * L8DataImport - Data Import System tab for the System section.
 * Renders three inner sub-tabs: Templates, Transfer, Import.
 */
(function() {
    'use strict';

    window.L8DataImport = {};

    var activeTab = 'templates';

    function initialize() {
        var container = document.getElementById('dataimport-container');
        if (!container) return;
        container.innerHTML = renderLayout();
        bindTabEvents(container);
        showTab('templates');
    }

    function renderLayout() {
        return '<div class="l8di-tabs">' +
            '<button class="l8di-tab active" data-tab="templates">Templates</button>' +
            '<button class="l8di-tab" data-tab="transfer">Transfer</button>' +
            '<button class="l8di-tab" data-tab="import">Import</button>' +
        '</div>' +
        '<div class="l8di-content">' +
            '<div class="l8di-pane active" data-tab="templates" id="l8di-templates-pane"></div>' +
            '<div class="l8di-pane" data-tab="transfer" id="l8di-transfer-pane"></div>' +
            '<div class="l8di-pane" data-tab="import" id="l8di-import-pane"></div>' +
        '</div>';
    }

    function bindTabEvents(container) {
        var tabs = container.querySelectorAll('.l8di-tab');
        tabs.forEach(function(tab) {
            tab.addEventListener('click', function() {
                showTab(tab.getAttribute('data-tab'));
            });
        });
    }

    function showTab(tabName) {
        activeTab = tabName;
        var container = document.getElementById('dataimport-container');
        if (!container) return;

        container.querySelectorAll('.l8di-tab').forEach(function(t) {
            t.classList.toggle('active', t.getAttribute('data-tab') === tabName);
        });
        container.querySelectorAll('.l8di-pane').forEach(function(p) {
            p.classList.toggle('active', p.getAttribute('data-tab') === tabName);
        });

        if (tabName === 'templates' && window.L8DITemplates) {
            L8DITemplates.initialize();
        } else if (tabName === 'transfer' && window.L8DITransfer) {
            L8DITransfer.initialize();
        } else if (tabName === 'import' && window.L8DIExecute) {
            L8DIExecute.initialize();
        }
    }

    function getHeaders() {
        var headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};
        headers['Content-Type'] = 'application/json';
        return headers;
    }

    L8DataImport.initialize = initialize;
    L8DataImport.showTab = showTab;
    L8DataImport.getHeaders = getHeaders;
})();
