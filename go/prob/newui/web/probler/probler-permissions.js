(function() {
    'use strict';

    // Probler-local loader for per-type action permissions.
    // Populates window.Layer8DPermissions so Layer8DServiceRegistry and
    // layer8d-table-render gate Add/Edit/Delete buttons automatically.
    //
    // This fails loudly and does not fall back. Leaving Layer8DPermissions unset
    // puts downstream code into permissive mode, i.e. a failed permission fetch
    // would show MORE buttons than the user is entitled to, and it would look
    // exactly like a user who legitimately has full access. A hard failure here
    // is both safer and debuggable.
    window.ProblerPermissions = {
        load: async function() {
            var token = sessionStorage.getItem('bearerToken');
            if (!token) {
                throw new Error('ProblerPermissions.load: no bearerToken in sessionStorage — ' +
                                'permissions cannot be resolved (callers run after auth, so this ' +
                                'means the auth step did not complete)');
            }

            var resp = await fetch('/permissions', {
                headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
            });
            if (!resp.ok) {
                throw new Error('ProblerPermissions.load: /permissions returned HTTP ' + resp.status +
                                ' ' + resp.statusText);
            }

            var perms = await resp.json();
            if (perms === null || typeof perms !== 'object') {
                throw new Error('ProblerPermissions.load: /permissions returned ' + typeof perms +
                                ', expected an object keyed by model name');
            }
            window.Layer8DPermissions = perms;
        }
    };
})();
