// Kubernetes Section — Server-side paginated, 12 category tabs.
// Cluster dropdown is the global filter for every sub-tab and the Overview.
(function() {
    'use strict';

    var categories = Probler.k8sCategories || [];
    var activeCategory = null;
    var activeService = null;
    var selectedCluster = '';
    var OVERVIEW_KEY = 'overview';
    var OVERVIEW_CONTAINER_ID = 'k8s-overview-area';

    window.initializeKubernetes = function() {
        fetchClusterList(function(clusters) {
            renderClusterDropdown(clusters);
            renderCategoryTabs();
            if (categories.length > 0) {
                selectCategory(categories[0]);
            }
        });
    };

    // K8sCategoryNav lets the Overview cards (and any other component) jump
    // to a category tab by key.
    window.K8sCategoryNav = {
        activate: function(catKey) {
            var cat = findCategory(catKey);
            if (cat) selectCategory(cat);
        },
        getSelectedCluster: function() { return selectedCluster; }
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
                onSelectedClusterChanged();
            });
        }
    }

    // onSelectedClusterChanged is the single place that fans out the
    // selected-cluster change to every visible piece of UI: the Overview
    // card grid and any active sub-tab table.
    function onSelectedClusterChanged() {
        if (typeof K8sTables !== 'undefined' && K8sTables.setClusterFilter) {
            K8sTables.setClusterFilter(selectedCluster);
        }
        if (activeCategory && activeCategory.key === OVERVIEW_KEY) {
            if (typeof K8sOverview !== 'undefined') {
                K8sOverview.show(OVERVIEW_CONTAINER_ID, selectedCluster);
            }
        } else if (activeService) {
            // Re-render the active sub-tab so the new filter applies.
            loadServiceTable(activeService);
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
        activeService = null;

        var tabs = document.querySelectorAll('.k8s-category-tab');
        for (var i = 0; i < tabs.length; i++) {
            tabs[i].classList.toggle('active', tabs[i].getAttribute('data-category') === cat.key);
        }

        // Overview tab is a custom view — KPI cards driven by K8SCluster summary,
        // not the regular sub-tabs + Layer8DTable path.
        if (cat.key === OVERVIEW_KEY) {
            renderOverviewSubTabs();
            renderOverview();
            return;
        }

        renderServiceSubTabs(cat);

        if (cat.services && cat.services.length > 0) {
            selectService(cat.services[0]);
        }
    }

    function renderOverviewSubTabs() {
        var container = document.getElementById('k8s-service-tabs');
        if (container) container.innerHTML = '';
    }

    function renderOverview() {
        var tableArea = document.getElementById('k8s-table-area');
        if (!tableArea) return;
        tableArea.innerHTML = '<div id="' + OVERVIEW_CONTAINER_ID + '"></div>';
        if (typeof K8sOverview !== 'undefined') {
            K8sOverview.show(OVERVIEW_CONTAINER_ID, selectedCluster);
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
