// Probler Module Initialization
// Validates that all submodule namespaces are loaded

(function() {
    var required = Probler.submodules || [];
    for (var i = 0; i < required.length; i++) {
        if (!window[required[i]]) {
            console.warn('Probler: missing submodule namespace ' + required[i]);
        }
    }
})();
