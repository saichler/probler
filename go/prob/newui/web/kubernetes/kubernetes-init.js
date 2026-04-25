// Kubernetes Section — Server-side paginated, 12 category tabs
(function() {
    'use strict';

    var categories = Probler.k8sCategories || [];
    var activeCategory = null;
    var activeService = null;
    var selectedCluster = '';

    window.initializeKubernetes = function() {
        fetchClusterList(function(clusters) {
            renderClusterDropdown(clusters);
            renderCategoryTabs();
            if (categories.length > 0) {
                selectCategory(categories[0]);
            }
        });
    };

    function fetchClusterList(callback) {
        var endpoint = Layer8DConfig.resolveEndpoint('/10/KCluster');
        var query = encodeURIComponent(JSON.stringify({ text: 'select * from K8SCluster' }));
        var url = endpoint + '?body=' + query;
        var headers = {};
        if (typeof getAuthHeaders === 'function') {
            headers = getAuthHeaders();
        }

        fetch(url, { method: 'GET', headers: headers })
            .then(function(resp) { return resp.ok ? resp.json() : { list: [] }; })
            .then(function(data) {
                var clusters = data.list || [];
                if (clusters.length > 0) {
                    selectedCluster = clusters[0].name || '';
                }
                callback(clusters);
            })
            .catch(function() { callback([]); });
    }

    function renderClusterDropdown(clusters) {
        var container = document.getElementById('k8s-cluster-selector');
        if (!container) return;

        if (clusters.length === 0) {
            container.innerHTML = '<span class="k8s-no-clusters">No clusters found</span>';
            return;
        }

        var html = '<label class="k8s-cluster-label">Cluster:</label>';
        html += '<select id="k8s-cluster-dropdown" class="k8s-cluster-dropdown">';
        for (var i = 0; i < clusters.length; i++) {
            var name = clusters[i].name || '';
            html += '<option value="' + name + '">' + name + '</option>';
        }
        html += '</select>';
        container.innerHTML = html;

        var dropdown = document.getElementById('k8s-cluster-dropdown');
        if (dropdown) {
            dropdown.addEventListener('change', function() {
                selectedCluster = dropdown.value;
                if (activeService) {
                    loadServiceTable(activeService);
                }
            });
        }
    }

    function renderCategoryTabs() {
        var container = document.getElementById('k8s-category-tabs');
        if (!container) return;

        var html = '';
        for (var i = 0; i < categories.length; i++) {
            var cat = categories[i];
            html += '<button class="k8s-category-tab" data-category="' + cat.key + '">';
            html += '<span class="k8s-cat-icon">' + (cat.icon || '') + '</span>';
            html += '<span class="k8s-cat-label">' + cat.label + '</span>';
            html += '</button>';
        }
        container.innerHTML = html;

        container.addEventListener('click', function(e) {
            var tab = e.target.closest('.k8s-category-tab');
            if (!tab) return;
            var key = tab.getAttribute('data-category');
            var cat = findCategory(key);
            if (cat) selectCategory(cat);
        });
    }

    function selectCategory(cat) {
        activeCategory = cat;

        var tabs = document.querySelectorAll('.k8s-category-tab');
        for (var i = 0; i < tabs.length; i++) {
            tabs[i].classList.toggle('active', tabs[i].getAttribute('data-category') === cat.key);
        }

        renderServiceSubTabs(cat);

        if (cat.services && cat.services.length > 0) {
            selectService(cat.services[0]);
        }
    }

    function renderServiceSubTabs(cat) {
        var container = document.getElementById('k8s-service-tabs');
        if (!container) return;

        if (!cat.services || cat.services.length <= 1) {
            container.innerHTML = '';
            return;
        }

        var html = '';
        for (var i = 0; i < cat.services.length; i++) {
            var svc = cat.services[i];
            html += '<button class="k8s-service-tab" data-service="' + svc.key + '">';
            html += svc.label;
            html += '</button>';
        }
        container.innerHTML = html;

        container.addEventListener('click', function(e) {
            var tab = e.target.closest('.k8s-service-tab');
            if (!tab) return;
            var key = tab.getAttribute('data-service');
            var svc = findService(key);
            if (svc) selectService(svc);
        });
    }

    function selectService(svc) {
        activeService = svc;

        var tabs = document.querySelectorAll('.k8s-service-tab');
        for (var i = 0; i < tabs.length; i++) {
            tabs[i].classList.toggle('active', tabs[i].getAttribute('data-service') === svc.key);
        }

        loadServiceTable(svc);
    }

    function loadServiceTable(svc) {
        var tableArea = document.getElementById('k8s-table-area');
        if (!tableArea) return;

        var containerId = 'k8s-table-' + svc.key;
        tableArea.innerHTML = '<div id="' + containerId + '"></div>';

        K8sTables.create(containerId, svc, selectedCluster);
    }

    function findCategory(key) {
        for (var i = 0; i < categories.length; i++) {
            if (categories[i].key === key) return categories[i];
        }
        return null;
    }

    function findService(key) {
        if (!activeCategory || !activeCategory.services) return null;
        for (var i = 0; i < activeCategory.services.length; i++) {
            if (activeCategory.services[i].key === key) return activeCategory.services[i];
        }
        return null;
    }

})();
