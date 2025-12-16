// Namespace and Network Policy Generation Functions

// Generate detailed namespace data
function generateNamespaceDetails(namespace, cluster) {
    const creationTime = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);

    return {
        apiVersion: "v1",
        kind: "Namespace",
        metadata: {
            name: namespace.name,
            uid: generateUID(),
            resourceVersion: String(Math.floor(Math.random() * 9000000) + 1000000),
            creationTimestamp: creationTime.toISOString(),
            labels: {
                "kubernetes.io/metadata.name": namespace.name,
                "name": namespace.name
            },
            annotations: {
                "kubectl.kubernetes.io/last-applied-configuration": `{"apiVersion":"v1","kind":"Namespace","metadata":{"labels":{"name":"${namespace.name}"},"name":"${namespace.name}"}}`
            }
        },
        spec: {
            finalizers: ["kubernetes"]
        },
        status: {
            phase: namespace.status
        }
    };
}

// Generate detailed network policy data
function generateNetworkPolicyDetails(policy, cluster) {
    const creationTime = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);

    const policyTypes = policy.policyTypes ? policy.policyTypes.split(',').map(t => t.trim()) : ["Ingress"];

    const ingressRules = policy.ingressRules > 0 ? Array.from({length: policy.ingressRules}, (_, i) => ({
        from: [{ podSelector: { matchLabels: { access: "true" } } }],
        ports: [{ protocol: "TCP", port: 80 }]
    })) : [];

    const egressRules = policy.egressRules > 0 ? Array.from({length: policy.egressRules}, (_, i) => ({
        to: [{ podSelector: { matchLabels: { role: "db" } } }],
        ports: [{ protocol: "TCP", port: 5432 }]
    })) : [];

    return {
        apiVersion: "networking.k8s.io/v1",
        kind: "NetworkPolicy",
        metadata: {
            name: policy.name,
            namespace: policy.namespace,
            uid: generateUID(),
            resourceVersion: String(Math.floor(Math.random() * 9000000) + 1000000),
            generation: 1,
            creationTimestamp: creationTime.toISOString(),
            annotations: {
                "kubectl.kubernetes.io/last-applied-configuration": `{"apiVersion":"networking.k8s.io/v1","kind":"NetworkPolicy","metadata":{"name":"${policy.name}","namespace":"${policy.namespace}"}}`
            }
        },
        spec: {
            podSelector: { matchLabels: { app: policy.podSelector || "nginx" } },
            policyTypes: policyTypes,
            ingress: ingressRules.length > 0 ? ingressRules : undefined,
            egress: egressRules.length > 0 ? egressRules : undefined
        }
    };
}
