// Kubernetes Tables — Generic server-side paginated table builder
(function() {
    'use strict';

    window.K8sTables = window.K8sTables || {};

    var activeTables = {};

    K8sTables.create = function(containerId, service, clusterFilter) {
        var columns = ProblerK8s.columns[service.model];
        if (!columns) {
            console.error('K8sTables: No columns defined for model ' + service.model);
            return null;
        }

        var endpoint = Layer8DConfig.resolveEndpoint(service.endpoint);
        var baseWhere = clusterFilter ? 'clusterName=' + clusterFilter : '';

        var table = new Layer8DTable({
            containerId: containerId,
            endpoint: endpoint,
            modelName: service.model,
            columns: columns,
            pageSize: 50,
            serverSide: true,
            sortable: true,
            filterable: true,
            baseWhereClause: baseWhere,
            showActions: false,
            onRowClick: function(item) {
                K8sDetail.show(item, service);
            }
        });
        table.init();

        activeTables[containerId] = table;
        return table;
    };

    K8sTables.setClusterFilter = function(clusterName) {
        var where = clusterName ? 'clusterName=' + clusterName : '';
        Object.keys(activeTables).forEach(function(id) {
            var table = activeTables[id];
            if (table && typeof table.setBaseWhereClause === 'function') {
                table.setBaseWhereClause(where);
            }
        });
    };

    K8sTables.destroyAll = function() {
        Object.keys(activeTables).forEach(function(id) {
            var table = activeTables[id];
            if (table && typeof table.destroy === 'function') {
                table.destroy();
            }
        });
        activeTables = {};
    };

    K8sTables.get = function(containerId) {
        return activeTables[containerId] || null;
    };

})();
