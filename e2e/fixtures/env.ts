/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// Environment configuration for the e2e suite.
//
// Defaults target the KIND cluster stood up by k8s/kind-start.sh, addressed
// through the stable host port mapping in k8s/kind-cluster.yaml (containerPort
// 2443 -> hostPort 2443; probler-webui2 runs with hostNetwork). KIND hands the
// node a fresh IP on every recreate, so the suite points at localhost:<port>
// and never at a node IP.

function env(name: string, fallback: string): string {
    const v = process.env[name];
    return v === undefined || v === '' ? fallback : v;
}

export const ENV = {
    /** Root of the deployed app. Self-signed cert -- see ignoreHTTPSErrors. */
    baseURL: env('PROBLER_BASE_URL', 'https://localhost:2443'),

    /** API prefix from login.json `app.apiPrefix`. */
    apiPrefix: env('PROBLER_API_PREFIX', '/probler'),

    /**
     * Credentials from ../l8secure/go/secure/plugin/probler/probler.json.
     * `operator` carries the wildcard allow rule and no TFA -- the right account
     * for full-coverage runs (prctl and k8s/seed-mocks.sh use it too).
     */
    user: env('PROBLER_USER', 'operator'),
    pass: env('PROBLER_PASS', 'Oper123!'),

    /** The platform's view-only account (GET everywhere, no writes). */
    readOnlyUser: env('PROBLER_READONLY_USER', 'viewer'),
    readOnlyPass: env('PROBLER_READONLY_PASS', 'Viewer123!'),

    /**
     * The narrow account for the "restricted account" specs. probler ships no
     * module-scoped role, so it is the view-only account by default.
     */
    limitedUser: env('PROBLER_LIMITED_USER', env('PROBLER_READONLY_USER', 'viewer')),
    limitedPass: env('PROBLER_LIMITED_PASS', env('PROBLER_READONLY_PASS', 'Viewer123!')),

    /**
     * A second writing account (role operator) for the chat specs: the peer
     * that sends to and receives from `user`. Seeded in probler.json.
     */
    chatPeerUser: env('PROBLER_CHAT_PEER_USER', 'operator2'),
    chatPeerPass: env('PROBLER_CHAT_PEER_PASS', 'Oper123!'),
    chatPeerName: env('PROBLER_CHAT_PEER_NAME', 'Second Operator'),
    userName: env('PROBLER_USER_NAME', 'Default Operator'),

    /**
     * The key-manager account (role admin) for the admin-backed API-key specs.
     * admin needs TFA in a normal image, so these only work against a TEST
     * security image (`../l8secure/build-images.sh probler <arch> test`).
     * Against a normal image Api.login throws "requires TFA" -- the intended
     * signal that a non-test image is deployed.
     */
    adminUser: env('PROBLER_ADMIN_USER', 'admin'),
    adminPass: env('PROBLER_ADMIN_PASS', 'abAdmin123!'),

    /** Shell paths. Mobile is the real mobile bundle, never a resized desktop. */
    desktopShell: '/app.html',
    mobileShell: '/m/app.html',
    loginShell: '/l8ui/login/index.html',

    /** Portal shells served by the same web server (login.json app.portals). */
    portals: ['/k8s-explorer.html'],

    /** How long a freshly-restarted cluster is given to answer. */
    apiTimeoutMs: Number(env('PROBLER_API_TIMEOUT_MS', '30000'))
};

export function apiUrl(endpoint: string): string {
    const path = endpoint.startsWith(ENV.apiPrefix) ? endpoint : ENV.apiPrefix + endpoint;
    return ENV.baseURL + path;
}
