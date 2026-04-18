(function() {
    'use strict';

    // Probler-local loader for per-type action permissions.
    // Populates window.Layer8DPermissions so Layer8DServiceRegistry and
    // layer8d-table-render gate Add/Edit/Delete buttons automatically.
    // On any failure we warn and leave Layer8DPermissions unset — downstream
    // code treats that as permissive mode, matching l8erp's degraded-state behavior.
    window.ProblerPermissions = {
        load: async function() {
            try {
                var token = sessionStorage.getItem('bearerToken');
                if (!token) { console.warn('ProblerPermissions.load: no bearerToken'); return; }
                var resp = await fetch('/permissions', {
                    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
                });
                if (resp.ok) {
                    window.Layer8DPermissions = await resp.json();
                }
            } catch (e) {
                console.warn('ProblerPermissions.load failed:', e);
            }
        }
    };
})();
