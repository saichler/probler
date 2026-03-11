/**
 * Shared detail popup helpers for all probler mobile detail modals
 */
(function() {
    'use strict';

    window.ProblerDetail = {};

    ProblerDetail.esc = function(text) {
        if (text == null || text === '' || text === '--') return '--';
        var div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    };

    ProblerDetail.row = function(label, value, small) {
        var v = (value == null || value === '' || value === '--') ? '--' : ProblerDetail.esc(String(value));
        var style = small ? ' style="font-size: 0.75rem;"' : '';
        return '<div class="detail-row">' +
            '<span class="detail-label">' + label + '</span>' +
            '<span class="detail-value"' + style + '>' + v + '</span></div>';
    };

    ProblerDetail.perfBar = function(label, pct, unit) {
        var color = pct > 80 ? 'var(--layer8d-error, #e53e3e)' :
                    pct > 60 ? 'var(--layer8d-warning, #dd6b20)' :
                               'var(--layer8d-success, #38a169)';
        return '<div style="margin-bottom: 12px;">' +
            '<div style="display: flex; justify-content: space-between; margin-bottom: 4px;">' +
                '<span class="detail-label">' + label + '</span>' +
                '<span class="detail-value">' + pct + (unit || '') + '</span>' +
            '</div>' +
            '<div style="height: 8px; background: var(--layer8d-border, #e2e8f0); border-radius: 4px; overflow: hidden;">' +
                '<div style="height: 100%; width: ' + Math.min(pct, 100) + '%; background: ' + color + '; border-radius: 4px;"></div>' +
            '</div></div>';
    };

    ProblerDetail.formatBytes = function(bytes) {
        if (!bytes) return '';
        var n = Number(bytes);
        if (isNaN(n) || n === 0) return '0';
        if (n >= 1073741824) return (n / 1073741824).toFixed(2) + ' GB';
        if (n >= 1048576) return (n / 1048576).toFixed(1) + ' MB';
        if (n >= 1024) return (n / 1024).toFixed(0) + ' KB';
        return n + ' B';
    };

    ProblerDetail.formatIfSpeed = function(bps) {
        if (!bps || bps === 0) return '--';
        var n = Number(bps);
        if (n >= 1000000000) return (n / 1000000000) + ' Gbps';
        if (n >= 1000000) return (n / 1000000) + ' Mbps';
        if (n >= 1000) return (n / 1000) + ' Kbps';
        return n + ' bps';
    };

    ProblerDetail.formatUptime = function(centiseconds) {
        if (!centiseconds) return '--';
        var s = Math.floor(parseInt(centiseconds) / 100);
        var d = Math.floor(s / 86400);
        var h = Math.floor((s % 86400) / 3600);
        var m = Math.floor((s % 3600) / 60);
        if (d > 0) return d + 'd ' + h + 'h';
        if (h > 0) return h + 'h ' + m + 'm';
        return m + 'm';
    };

    ProblerDetail.formatMemKB = function(kb) {
        if (kb < 1024) return kb + ' KB';
        if (kb < 1048576) return (kb / 1024).toFixed(1) + ' MB';
        return (kb / 1048576).toFixed(2) + ' GB';
    };

    ProblerDetail.capitalize = function(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    };

    /**
     * Show a tabbed detail popup using Layer8MPopup
     */
    ProblerDetail.showTabbedPopup = function(title, tabs, onShow, onTabChange) {
        if (typeof Layer8MPopup !== 'undefined') {
            var opts = {
                title: title,
                size: 'large',
                showFooter: false,
                tabs: tabs
            };
            if (onShow) opts.onShow = onShow;
            if (onTabChange) opts.onTabChange = onTabChange;
            Layer8MPopup.show(opts);
        }
    };

})();
