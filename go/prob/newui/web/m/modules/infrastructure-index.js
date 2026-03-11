/**
 * Mobile Infrastructure Module Registry
 * Registers infrastructure sub-modules with Layer8MModuleRegistry
 * Note: Inventory uses Layer8MEditTable (CRUD), Topologies uses custom view
 */
(function() {
    'use strict';

    window.MobileInfra = window.MobileInfra || {};

    MobileInfra.columns = {
        L8PTarget: [
            ...Layer8ColumnFactory.col('name', 'Name'),
            ...Layer8ColumnFactory.col('host', 'Host'),
            ...Layer8ColumnFactory.col('port', 'Port'),
            ...Layer8ColumnFactory.col('community', 'Community'),
            ...Layer8ColumnFactory.col('version', 'Version')
        ]
    };

    MobileInfra.primaryKeys = {
        L8PTarget: 'targetId'
    };

    MobileInfra.enums = {};
    MobileInfra.render = {};

    Layer8MModuleRegistry.create('MobileInfra', {
        'Inventory': MobileInfra
    });

})();
