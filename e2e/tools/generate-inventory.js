/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// Generates fixtures/inventory.json from the REAL module configs in
// go/prob/newui/web, for both shells.
//
// Why generated rather than hand-written: the suite's contract is "do not drop
// the ball on any functionality". A hand-maintained list of 200+ services goes
// stale the first time someone adds a service, and the spec that would have
// caught the regression silently stops covering it. Regenerating from the
// shipped configs means a new service is covered the moment it is declared.
//
//   node tools/generate-inventory.js
//
// Re-run after any change to a *-config.js, a nav config, or a shell's script
// tags, and commit the result.

'use strict';

const fs = require('fs');
const path = require('path');
const { loadShell } = require('./shell-loader');

const WEB = path.resolve(__dirname, '../../go/prob/newui/web');
const OUT = path.resolve(__dirname, '../fixtures/inventory.json');

// Desktop sidebar section key -> module namespace global.
// Derived from the sidebar's data-section values in app.html and the
// `namespace:` of each <module>-config.js -- NOT copied from app.js's own
// nsMap, which is known to disagree with the real namespace casing.
function discoverDesktopSections(webRoot, globals) {
    const html = fs.readFileSync(path.join(webRoot, 'app.html'), 'utf8');
    const sections = [...html.matchAll(/data-section="([a-z0-9-]+)"/g)].map((m) => m[1]);
    const unique = [...new Set(sections)];

    // Map each section to the namespace object whose config file lives in a
    // directory matching that section, falling back to a case-insensitive
    // match on the namespace name itself.
    const nsNames = Object.keys(globals).filter((k) => {
        const v = globals[k];
        return v && typeof v === 'object' && v.modules && !Array.isArray(v.modules);
    });

    // probler: the l8ui-module sections. The custom sections (network, gpus,
    // hosts, kubernetes, inventory, topologies) are services of the `Probler`
    // namespace and are resolved by service key in buildDesktop().
    const aliases = { alarms: 'Alm', system: 'L8Sys' };

    const out = {};
    for (const section of unique) {
        if (section === 'dashboard') { out[section] = null; continue; }
        const want = aliases[section] || section;
        const ns = nsNames.find((n) => n.toLowerCase() === want.toLowerCase());
        out[section] = ns || null;
    }
    return out;
}

// Flattens a form definition into the shape specs need: every field, with the
// metadata that decides how to render it, fill it, and assert on it.
function extractForm(formDef) {
    if (!formDef || !Array.isArray(formDef.sections)) return null;
    const sections = formDef.sections.map((sec) => ({
        title: sec.title || '',
        fields: (sec.fields || []).map((f) => ({
            key: f.key,
            label: f.label || '',
            type: f.type || 'text',
            required: f.required === true,
            readOnly: f.readOnly === true,
            hidden: f.hidden === true,
            lookupModel: f.lookupModel || null,
            // select/enum options, so formdata.ts can pick a valid value
            options: f.options && typeof f.options === 'object'
                ? Object.keys(f.options).map(Number).filter((n) => !isNaN(n))
                : null,
            // inlineTable child schema
            columns: Array.isArray(f.columns)
                ? f.columns.map((c) => ({
                    key: c.key, label: c.label || '', type: c.type || 'text',
                    hidden: c.hidden === true, lookupModel: c.lookupModel || null
                }))
                : null
        }))
    }));
    const all = sections.flatMap((s) => s.fields);
    return {
        title: formDef.title || '',
        sections,
        fieldCount: all.length,
        fieldTypes: [...new Set(all.map((f) => f.type))].sort(),
        lookupModels: [...new Set(all.map((f) => f.lookupModel).filter(Boolean))].sort(),
        inlineTables: all.filter((f) => f.type === 'inlineTable').map((f) => f.key),
        requiredKeys: all.filter((f) => f.required && !f.readOnly).map((f) => f.key),
        readOnlyKeys: all.filter((f) => f.readOnly).map((f) => f.key)
    };
}

// A service of a custom probler section: same shape as a module service so
// the generic accessors work, flagged customView so generic sweeps skip it.
function customService(x) {
    return {
        key: x.key, label: x.label, endpoint: x.endpoint || null, model: x.model || null,
        viewType: 'table', alternateViews: [], readOnly: x.readOnly === true, customView: true,
        realtime: false, viewConfig: null, baseWhereClause: null, containerId: null,
        primaryKey: null, columns: [], form: null
    };
}

function buildDesktop() {
    const { globals, scripts, failures } = loadShell(WEB, 'app.html');
    const sectionNs = discoverDesktopSections(WEB, globals);

    // Custom probler sections: each is one service of a Probler module.
    const P = globals.Probler;
    for (const [section, ns] of Object.entries(sectionNs)) {
        if (ns || !P) continue;
        for (const [moduleKey, mod] of Object.entries(P.modules)) {
            if ((mod.services || []).some((s) => s.key === section)) {
                sectionNs[section] = { ns: 'Probler', moduleKey, serviceKey: section };
            }
        }
    }

    const sections = [];
    for (const [section, nsRef] of Object.entries(sectionNs)) {
        if (!nsRef) { sections.push({ section, namespace: null, custom: false, modules: [] }); continue; }
        if (typeof nsRef === 'object') {
            const mod = P.modules[nsRef.moduleKey];
            const svc = mod.services.find((s) => s.key === nsRef.serviceKey);
            if (section === 'kubernetes' && Array.isArray(P.k8sCategories)) {
                // The kubernetes section is one custom view over these resource
                // categories (category tab -> service tab -> table -> popup).
                sections.push({
                    section, namespace: 'Probler', custom: true,
                    modules: P.k8sCategories.map((cat) => ({
                        moduleKey: cat.key, label: cat.label,
                        services: (cat.services || []).map((x) => customService(x))
                    }))
                });
                continue;
            }
            sections.push({
                section, namespace: 'Probler', custom: true,
                modules: [{ moduleKey: nsRef.moduleKey, label: mod.label, services: [customService(svc)] }]
            });
            continue;
        }
        const ns = nsRef;
        const M = globals[ns];
        const modules = Object.entries(M.modules).map(([moduleKey, mod]) => ({
            moduleKey,
            label: mod.label,
            services: (mod.services || []).map((s) => ({
                key: s.key,
                label: s.label,
                endpoint: s.endpoint,
                model: s.model,
                viewType: s.viewType || 'table',
                alternateViews: s.alternateViews || s.supportedViews || [],
                readOnly: s.readOnly === true,
                customView: s.customView === true,
                realtime: s.realtime === true,
                viewConfig: s.viewConfig || null,
                baseWhereClause: typeof s.baseWhereClause === 'string' ? s.baseWhereClause : null,
                // Container the section generator emits for this service.
                containerId: `${moduleKey}-${s.key}-table-container`,
                primaryKey: (M.getServicePrimaryKey && M.getServicePrimaryKey(s.model)) || null,
                columns: (M.getServiceColumns ? (M.getServiceColumns(s.model) || []) : [])
                    .map((c) => ({
                        key: c.key, label: c.label || '', type: c.type || null,
                        sortKey: c.sortKey || null, filterKey: c.filterKey || null,
                        hasRender: typeof c.render === 'function',
                        hasEnum: !!(c.enumValues || c.enumOptions)
                    })),
                form: extractForm(M.getServiceFormDef ? M.getServiceFormDef(s.model) : null)
            }))
        }));
        sections.push({ section, namespace: ns, custom: false, modules });
    }
    return { scripts, failures, sections };
}

function buildMobile() {
    const { globals, scripts, failures } = loadShell(WEB, 'm/app.html');
    const nav = globals.LAYER8M_NAV_CONFIG;
    const modules = [];
    if (nav && Array.isArray(nav.modules)) {
        for (const m of nav.modules) {
            const cfg = nav[m.key];
            const subModules = [];
            if (cfg && cfg.services) {
                for (const [subKey, services] of Object.entries(cfg.services)) {
                    // The sub-module CARD shows the label, not the key. A spec
                    // that filters cards by key silently matches nothing for
                    // every hyphenated key ('general-ledger' vs 'General
                    // Ledger'), so capture both.
                    const subDef = (cfg.subModules || []).find((x) => x.key === subKey);
                    subModules.push({
                        subModuleKey: subKey,
                        subModuleLabel: (subDef && subDef.label) || subKey,
                        services: services.map((s) => {
                            // Mobile resolves columns/forms through the
                            // Layer8MModuleRegistry objects on window, keyed by
                            // model -- not through the nav config itself.
                            let columns = [], form = null;
                            for (const k of Object.keys(globals)) {
                                if (!k.startsWith('Mobile')) continue;
                                const reg = globals[k];
                                if (!reg || typeof reg.hasModel !== 'function') continue;
                                try {
                                    if (!reg.hasModel(s.model)) continue;
                                    columns = (reg.getColumns(s.model) || []).map((c) => ({
                                        key: c.key, label: c.label || '',
                                        primary: c.primary === true, secondary: c.secondary === true,
                                        hidden: c.hidden === true
                                    }));
                                    form = extractForm(reg.getFormDef(s.model));
                                } catch { /* registry threw -- reported via failures */ }
                                break;
                            }
                            return {
                                key: s.key,
                                label: s.label,
                                endpoint: s.endpoint,
                                model: s.model,
                                idField: s.idField || null,
                                readOnly: s.readOnly === true,
                                alternateViews: s.supportedViews || s.alternateViews || [],
                                columns,
                                form
                            };
                        })
                    });
                }
            }
            modules.push({
                moduleKey: m.key, label: m.label,
                hasSubModules: m.hasSubModules === true, subModules
            });
        }
    }
    return { scripts, failures, navPresent: !!nav, modules };
}

// Every other HTML shell the web server serves (iframe sections, portals,
// landing and auth pages): audited for scripts that throw at load.
const EXTRA_SHELLS = ['index.html', 'm/index.html', 'about.html', 'k8s-explorer.html',
    'targets/index.html', 'topo/index.html', 'dashboard/index.html',
    'l8ui/login/index.html', 'l8ui/login/forgot-password.html', 'l8ui/login/reset-password.html'];

function buildExtraShells() {
    return EXTRA_SHELLS.map((shell) => {
        const { scripts, failures } = loadShell(WEB, shell);
        return { shell, scripts, failures };
    });
}

function main() {
    const desktop = buildDesktop();
    const mobile = buildMobile();
    const shells = buildExtraShells();

    const inventory = {
        generatedFrom: 'go/prob/newui/web',
        generatedBy: 'e2e/tools/generate-inventory.js',
        desktop, mobile, shells
    };
    fs.writeFileSync(OUT, JSON.stringify(inventory, null, 2) + '\n');

    const dServices = desktop.sections.reduce(
        (a, s) => a + s.modules.reduce((b, m) => b + m.services.length, 0), 0);
    const mServices = mobile.modules.reduce(
        (a, m) => a + m.subModules.reduce((b, s) => b + s.services.length, 0), 0);

    console.log('wrote', path.relative(process.cwd(), OUT));
    console.log('  desktop: %d scripts, %d sections, %d services, %d load failure(s)',
        desktop.scripts.length, desktop.sections.length, dServices, desktop.failures.length);
    desktop.failures.forEach((f) => console.log('     DESKTOP LOAD FAILURE', f.src, '->', f.error));
    console.log('  mobile:  %d scripts, %d modules, %d services, %d load failure(s)',
        mobile.scripts.length, mobile.modules.length, mServices, mobile.failures.length);
    mobile.failures.forEach((f) => console.log('     MOBILE LOAD FAILURE', f.src, '->', f.error));
    for (const sh of shells) {
        sh.failures.forEach((f) => console.log('     %s LOAD FAILURE', sh.shell, f.src, '->', f.error));
    }
    console.log('  other shells: %d audited', shells.length);
}

main();
