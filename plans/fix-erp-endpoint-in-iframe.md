# Plan: Fix /erp/ endpoint in inventory iframe

## Root Cause

`Layer8DConfig.load()` on line 40 of `layer8d-config.js` fetches `login.json` using a **relative path**:
```javascript
const response = await fetch('login.json');
```

The inventory section runs inside an **iframe** at `targets/index.html`. In that iframe context, the relative path `login.json` resolves to `targets/login.json` — which does not exist. The fetch returns 404, the catch block silently falls back to `DEFAULT_CONFIG.apiPrefix = '/erp'`, and everything appears to work but hits the wrong endpoint.

## Fix (two parts)

### Part 1: Remove hardcoded default apiPrefix from `layer8d-config.js`

Remove `apiPrefix: '/erp'` from `DEFAULT_CONFIG`. If `login.json` fails to load, `resolveEndpoint()` should throw or return an obviously broken path — not silently use `/erp/`. This applies to both probler and l8erp.

```javascript
// Before:
const DEFAULT_CONFIG = {
    dateFormat: 'mm/dd/yyyy',
    apiPrefix: '/erp'
};

// After:
const DEFAULT_CONFIG = {
    dateFormat: 'mm/dd/yyyy',
    apiPrefix: ''
};
```

With an empty prefix, a failed config load produces endpoints like `/0/CsvExport` (no prefix) which will 404 visibly instead of silently hitting the wrong service.

Also change the `load()` catch/warning to `console.error` so failures are loud.

### Part 2: Fix iframe config loading in `targets.js`

The iframe's `config.js` already successfully loads `../login.json` and gets `apiPrefix: '/probler'`. Add a `setPrefix(prefix)` method to `Layer8DConfig` and have `targets.js` use the already-loaded value instead of calling `Layer8DConfig.load()` (which can't find `login.json` from the iframe path).

In `layer8d-config.js`, add:
```javascript
function setPrefix(prefix) {
    currentConfig.apiPrefix = prefix;
    configLoaded = true;
}
```
Export it in the `window.Layer8DConfig` object.

In `targets.js`, replace `await Layer8DConfig.load()` with:
```javascript
if (typeof Layer8DConfig !== 'undefined' && TARGETS_CONFIG) {
    Layer8DConfig.setPrefix(TARGETS_CONFIG.apiPrefix);
}
```

## Apply to both projects
- `layer8d-config.js` — remove default apiPrefix, add `setPrefix()`, make failure loud (probler + l8erp)
- `targets.js` — call `setPrefix()` with already-loaded config (probler only)
