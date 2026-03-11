/**
 * Mobile Kubernetes Module - Column Definitions
 * Desktop Equivalent: probler/k8s/k8s-columns.js
 */
(function() {
    'use strict';

    const col = window.Layer8ColumnFactory;
    const render = MobileK8s.render;

    MobileK8s.columns = {
        K8sNode: [
            ...col.col('name', 'NAME'),
            ...col.col('roles', 'ROLES'),
            ...col.custom('status', 'STATUS', (item) => render.nodeStatus(item.status)),
            ...col.col('age', 'AGE'),
            ...col.col('version', 'VERSION'),
            ...col.col('internalIp', 'INTERNAL-IP'),
            ...col.col('externalIp', 'EXTERNAL-IP'),
            ...col.col('osImage', 'OS-IMAGE'),
            ...col.col('kernelVersion', 'KERNEL-VERSION'),
            ...col.col('containerRuntime', 'CONTAINER-RUNTIME')
        ],

        K8sPod: [
            ...col.col('namespace', 'NAMESPACE'),
            ...col.col('name', 'NAME'),
            ...col.custom('ready', 'READY', (item) => render.podReady(item.ready)),
            ...col.custom('status', 'STATUS', (item) => render.podStatus(item.status)),
            ...col.custom('restarts', 'RESTARTS', (item) => render.restarts(item.restarts)),
            ...col.col('age', 'AGE'),
            ...col.col('ip', 'IP'),
            ...col.col('node', 'NODE'),
            ...col.col('nominatedNode', 'NOMINATED NODE'),
            ...col.col('readinessGates', 'READINESS GATES')
        ],

        K8sDeployment: [
            ...col.col('namespace', 'NAMESPACE'),
            ...col.col('name', 'NAME'),
            ...col.col('ready', 'READY'),
            ...col.col('upToDate', 'UP-TO-DATE'),
            ...col.col('available', 'AVAILABLE'),
            ...col.col('age', 'AGE'),
            ...col.col('containers', 'CONTAINERS'),
            ...col.col('images', 'IMAGES'),
            ...col.col('selector', 'SELECTOR')
        ],

        K8sStatefulSet: [
            ...col.col('namespace', 'NAMESPACE'),
            ...col.col('name', 'NAME'),
            ...col.col('ready', 'READY'),
            ...col.col('age', 'AGE'),
            ...col.col('containers', 'CONTAINERS'),
            ...col.col('images', 'IMAGES')
        ],

        K8sDaemonSet: [
            ...col.col('namespace', 'NAMESPACE'),
            ...col.col('name', 'NAME'),
            ...col.col('desired', 'DESIRED'),
            ...col.col('current', 'CURRENT'),
            ...col.col('ready', 'READY'),
            ...col.col('upToDate', 'UP-TO-DATE'),
            ...col.col('available', 'AVAILABLE'),
            ...col.col('nodeSelector', 'NODE SELECTOR'),
            ...col.col('age', 'AGE'),
            ...col.col('containers', 'CONTAINERS'),
            ...col.col('images', 'IMAGES'),
            ...col.col('selector', 'SELECTOR')
        ],

        K8sService: [
            ...col.col('namespace', 'NAMESPACE'),
            ...col.col('name', 'NAME'),
            ...col.col('type', 'TYPE'),
            ...col.col('clusterIp', 'CLUSTER-IP'),
            ...col.col('externalIp', 'EXTERNAL-IP'),
            ...col.col('ports', 'PORT(S)'),
            ...col.col('age', 'AGE'),
            ...col.col('selector', 'SELECTOR')
        ],

        K8sNamespace: [
            ...col.col('name', 'NAME'),
            ...col.col('status', 'STATUS'),
            ...col.col('age', 'AGE')
        ],

        K8sNetworkPolicy: [
            ...col.col('namespace', 'NAMESPACE'),
            ...col.col('name', 'NAME'),
            ...col.col('podSelector', 'POD-SELECTOR'),
            ...col.col('age', 'AGE')
        ]
    };

    MobileK8s.primaryKeys = {
        K8sNode: 'nodeId',
        K8sPod: 'podId',
        K8sDeployment: 'deploymentId',
        K8sStatefulSet: 'statefulSetId',
        K8sDaemonSet: 'daemonSetId',
        K8sService: 'serviceId',
        K8sNamespace: 'namespaceId',
        K8sNetworkPolicy: 'networkPolicyId'
    };

})();
