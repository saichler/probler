// Kubernetes Detail — Generic read-only detail popup for any K8s resource
(function() {
    'use strict';

    window.K8sDetail = window.K8sDetail || {};

    K8sDetail.show = function(item, service) {
        if (!item) return;

        var title = (service.label || service.model) + ': ' +
            (item.name || item.key || '');
        if (item.namespace) {
            title = item.namespace + '/' + item.name;
        }

        var columns = ProblerK8s.columns[service.model] || [];
        var html = buildDetailHtml(item, columns, service);

        Layer8DPopup.show({
            title: title,
            content: html,
            size: 'large',
            showFooter: false
        });
    };

    function buildDetailHtml(item, columns, service) {
        var html = '<div class="k8s-detail-view">';
        html += '<div class="k8s-detail-section">';
        html += '<h3 class="k8s-detail-section-title">Resource Details</h3>';
        html += '<table class="k8s-detail-table">';

        for (var i = 0; i < columns.length; i++) {
            var col = columns[i];
            var value = getNestedValue(item, col.key);
            var displayValue;

            if (col.render) {
                displayValue = col.render(item);
            } else if (value === null || value === undefined || value === '') {
                displayValue = '<span class="k8s-detail-empty">-</span>';
            } else if (typeof value === 'object') {
                displayValue = escapeHtml(JSON.stringify(value));
            } else {
                displayValue = escapeHtml(String(value));
            }

            html += '<tr>';
            html += '<td class="k8s-detail-label">' + escapeHtml(col.label) + '</td>';
            html += '<td class="k8s-detail-value">' + displayValue + '</td>';
            html += '</tr>';
        }

        html += '</table>';
        html += '</div>';
        html += '</div>';
        return html;
    }

    function getNestedValue(obj, key) {
        if (!obj || !key) return undefined;
        var parts = key.split('.');
        var current = obj;
        for (var i = 0; i < parts.length; i++) {
            if (current === null || current === undefined) return undefined;
            current = current[parts[i]];
        }
        return current;
    }

    function escapeHtml(text) {
        if (typeof Layer8DUtils !== 'undefined' && Layer8DUtils.escapeHtml) {
            return Layer8DUtils.escapeHtml(text);
        }
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

})();
