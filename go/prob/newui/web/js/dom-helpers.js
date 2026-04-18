// Shared DOM helpers for detail modals
// Used by: gpu-modal.js, network-device-modal.js, hosts-modal-hypervisor.js, hosts-modal-vm.js

var ProblerDom = (function() {
    'use strict';

    var esc = function(v) {
        return typeof Layer8DUtils !== 'undefined' ? Layer8DUtils.escapeHtml(v) : String(v);
    };

    // Build a label/value detail row
    function detailRow(label, value) {
        return '<div class="detail-row">' +
            '<span class="detail-label">' + label + '</span>' +
            '<span class="detail-value">' + (value || '') + '</span>' +
        '</div>';
    }

    // Build a detail section with title and rows
    function detailSection(title, rowsHtml) {
        return '<div class="detail-section">' +
            '<div class="detail-section-title">' + title + '</div>' +
            rowsHtml +
        '</div>';
    }

    // Build a status badge span
    function statusBadge(statusText, statusClass) {
        return '<span class="' + (statusClass || 'status-' + (statusText || 'unknown')) + '">' +
            esc(statusText || 'Unknown') + '</span>';
    }

    // Build the standard popup title with status badge
    function popupTitle(name, statusText) {
        return '<div class="probler-popup-title-wrapper">' +
            '<h3 class="probler-popup-title">' + esc(name) + '</h3>' +
            '<span class="probler-popup-status-badge status-' + (statusText || 'unknown') + '">' +
            esc(statusText || 'Unknown') + '</span>' +
        '</div>';
    }

    // Build a performance bar (cpu/mem/storage usage)
    function performanceBar(label, valueText, percent) {
        var cls = percent < 60 ? 'low' : percent < 85 ? 'medium' : 'high';
        return detailRow(label, valueText) +
            '<div class="performance-bar">' +
            '<div class="performance-bar-fill ' + cls + '" style="width: ' + percent + '%"></div>' +
            '</div>';
    }

    // Build tab header HTML from array of {key, label} (optional: conditional)
    function tabHeaders(tabs) {
        return '<div class="probler-popup-tabs">' +
            tabs.map(function(t, i) {
                return '<div class="probler-popup-tab' + (i === 0 ? ' active' : '') +
                    '" data-tab="' + t.key + '">' + t.label + '</div>';
            }).join('') +
        '</div>';
    }

    // Wrap tab panes into content container
    function tabContent(panesHtml) {
        return '<div class="probler-popup-tab-content">' + panesHtml + '</div>';
    }

    // Build a single tab pane wrapper
    function tabPane(key, contentHtml, isActive) {
        return '<div class="probler-popup-tab-pane' + (isActive ? ' active' : '') +
            '" data-pane="' + key + '">' + contentHtml + '</div>';
    }

    // Update a hero subtitle with online/total stats
    function updateHeroStats(selector, counts, entityLabel) {
        if (!counts) return;
        var el = document.querySelector(selector);
        if (!el) return;
        var total = counts.Total || 0;
        var online = counts.Online || 0;
        var uptime = total > 0 ? ((online / total) * 100).toFixed(2) : 0;
        el.textContent = 'Real-time monitoring \u2022 ' + online + ' Active ' + entityLabel + ' \u2022 ' + uptime + '% Uptime';
    }

    return {
        esc: esc,
        detailRow: detailRow,
        detailSection: detailSection,
        statusBadge: statusBadge,
        popupTitle: popupTitle,
        performanceBar: performanceBar,
        tabHeaders: tabHeaders,
        tabContent: tabContent,
        tabPane: tabPane,
        updateHeroStats: updateHeroStats
    };
})();
