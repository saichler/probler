/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// Typed accessors over the generated inventory.
//
// inventory.json is produced by tools/generate-inventory.js from the shipped
// module configs. Specs iterate these lists rather than naming services by
// hand, so a newly added service is covered on the next `npm run inventory`
// instead of silently falling outside the suite.

import { readFileSync } from 'fs';
import { join } from 'path';

export interface FormField {
    key: string;
    label: string;
    type: string;
    required: boolean;
    readOnly: boolean;
    hidden: boolean;
    lookupModel: string | null;
    options: number[] | null;
    columns: { key: string; label: string; type: string; hidden: boolean; lookupModel: string | null }[] | null;
}

export interface FormDef {
    title: string;
    sections: { title: string; fields: FormField[] }[];
    fieldCount: number;
    fieldTypes: string[];
    lookupModels: string[];
    inlineTables: string[];
    requiredKeys: string[];
    readOnlyKeys: string[];
}

export interface ColumnDef {
    key: string;
    label: string;
    type: string | null;
    sortKey: string | null;
    filterKey: string | null;
    hasRender: boolean;
    hasEnum: boolean;
}

export interface DesktopService {
    key: string;
    label: string;
    endpoint: string;
    model: string;
    viewType: string;
    alternateViews: string[];
    readOnly: boolean;
    customView: boolean;
    containerId: string;
    primaryKey: string | null;
    realtime: boolean;
    viewConfig: Record<string, unknown> | null;
    baseWhereClause: string | null;
    columns: ColumnDef[];
    form: FormDef | null;
}

export interface DesktopModule {
    moduleKey: string;
    label: string;
    services: DesktopService[];
}

export interface DesktopSection {
    section: string;
    namespace: string | null;
    modules: DesktopModule[];
}

export interface MobileService {
    key: string;
    label: string;
    endpoint: string;
    model: string;
    idField: string | null;
    readOnly: boolean;
    alternateViews: string[];
    columns: { key: string; label: string; primary: boolean; secondary: boolean; hidden: boolean }[];
    form: FormDef | null;
}

export interface MobileModule {
    moduleKey: string;
    label: string;
    hasSubModules: boolean;
    subModules: { subModuleKey: string; subModuleLabel: string; services: MobileService[] }[];
}

interface Inventory {
    desktop: {
        scripts: string[];
        failures: { src: string; error: string }[];
        sections: DesktopSection[];
    };
    mobile: {
        scripts: string[];
        failures: { src: string; error: string }[];
        navPresent: boolean;
        modules: MobileModule[];
    };
}

// Read at runtime rather than imported as a JSON module: the file carries every
// field of all 254 forms (5+ MB), and `resolveJsonModule` would make tsc infer a
// literal type for the whole thing on every typecheck.
export const INVENTORY: Inventory = JSON.parse(
    readFileSync(join(__dirname, 'inventory.json'), 'utf8')
) as Inventory;

/** Sections that actually own a module namespace (excludes dashboard/system). */
export const DESKTOP_SECTIONS: DesktopSection[] =
    INVENTORY.desktop.sections.filter((s) => s.namespace !== null);

/** Flat (section, module, service) triples -- the desktop coverage universe. */
export function desktopServices(): {
    section: string; moduleKey: string; service: DesktopService;
}[] {
    const out: { section: string; moduleKey: string; service: DesktopService }[] = [];
    for (const s of DESKTOP_SECTIONS) {
        for (const m of s.modules) {
            for (const svc of m.services) {
                out.push({ section: s.section, moduleKey: m.moduleKey, service: svc });
            }
        }
    }
    return out;
}

/** One representative service per module -- the fast smoke subset. */
export function desktopServicesPerModule(): {
    section: string; moduleKey: string; service: DesktopService;
}[] {
    const out: { section: string; moduleKey: string; service: DesktopService }[] = [];
    for (const s of DESKTOP_SECTIONS) {
        for (const m of s.modules) {
            if (m.services.length > 0) {
                out.push({ section: s.section, moduleKey: m.moduleKey, service: m.services[0] });
            }
        }
    }
    return out;
}

export const MOBILE_MODULES: MobileModule[] =
    INVENTORY.mobile.modules.filter((m) => m.subModules.length > 0);

export function mobileServices(): {
    moduleKey: string; subModuleKey: string; service: MobileService;
}[] {
    const out: { moduleKey: string; subModuleKey: string; service: MobileService }[] = [];
    for (const m of MOBILE_MODULES) {
        for (const sub of m.subModules) {
            for (const svc of sub.services) {
                out.push({ moduleKey: m.moduleKey, subModuleKey: sub.subModuleKey, service: svc });
            }
        }
    }
    return out;
}

/** Services declaring a non-table view, for the view-system specs. */
export function desktopServicesWithAlternateViews() {
    return desktopServices().filter(
        (x) => x.service.alternateViews.length > 0 || x.service.viewType !== 'table'
    );
}

/**
 * Models that have no backend service yet (KNOWN GAP: Hosts & VMs is a UI
 * placeholder). Excluded from the API sweeps; a dedicated test.fail() tracks them.
 */
export const NO_BACKEND_MODELS = ['Hypervisor', 'VirtualMachine'];

/**
 * Services whose CRUD is broken by a known UPSTREAM bug and is tracked by a
 * dedicated test.fail() instead of the generic sweeps. Empty today: the l8ui
 * l8sys-init.js `.call(SYS, ...)` bug that broke L8Portal is fixed upstream.
 */
export const KNOWN_BROKEN_CRUD: Record<string, string> = {};

/** Distinct (endpoint, model) pairs over BOTH shells -- the API coverage universe. */
export function allModels(): { endpoint: string; model: string; label: string }[] {
    const seen = new Set<string>();
    const out: { endpoint: string; model: string; label: string }[] = [];
    const add = (endpoint: string | null | undefined, model: string | null | undefined, label: string) => {
        if (!endpoint || !model || NO_BACKEND_MODELS.includes(model)) return;
        const k = `${endpoint}|${model}`;
        if (seen.has(k)) return;
        seen.add(k);
        out.push({ endpoint, model, label });
    };
    for (const { service } of desktopServices()) add(service.endpoint, service.model, service.label);
    for (const { service } of mobileServices()) add(service.endpoint, service.model, service.label);
    return out;
}

/** Distinct (endpoint, model) pairs -- the API coverage universe. */
export function desktopModels(): { endpoint: string; model: string; label: string }[] {
    const seen = new Set<string>();
    const out: { endpoint: string; model: string; label: string }[] = [];
    for (const { service } of desktopServices()) {
        const k = `${service.endpoint}|${service.model}`;
        if (seen.has(k)) continue;
        seen.add(k);
        out.push({ endpoint: service.endpoint, model: service.model, label: service.label });
    }
    return out;
}


/** Every service that declares a form -- the form-rendering universe. */
export function desktopServicesWithForms() {
    return desktopServices().filter((x) => x.service.form && x.service.form.fieldCount > 0);
}

/** Every service whose form contains at least one inline (child) table. */
export function desktopServicesWithInlineTables() {
    return desktopServices().filter((x) => (x.service.form?.inlineTables.length || 0) > 0);
}

/** Every distinct lookupModel referenced by any desktop form. */
export function desktopLookupModels(): string[] {
    const set = new Set<string>();
    for (const { service } of desktopServices()) {
        service.form?.lookupModels.forEach((m) => set.add(m));
    }
    return [...set].sort();
}

/** Every distinct form field type in use. */
export function desktopFieldTypes(): string[] {
    const set = new Set<string>();
    for (const { service } of desktopServices()) {
        service.form?.fieldTypes.forEach((t) => set.add(t));
    }
    return [...set].sort();
}

/** One service per field type -- a representative for type-behaviour specs. */
export function serviceForEachFieldType(): Map<string, { section: string; moduleKey: string; service: DesktopService }> {
    const out = new Map<string, { section: string; moduleKey: string; service: DesktopService }>();
    for (const x of desktopServices()) {
        for (const t of x.service.form?.fieldTypes || []) {
            if (!out.has(t)) out.set(t, x);
        }
    }
    return out;
}

/** Services declaring realtime -- the WebSocket universe. */
export function desktopRealtimeServices() {
    return desktopServices().filter((x) => x.service.realtime);
}

export function mobileServicesWithForms() {
    return mobileServices().filter((x) => x.service.form && x.service.form.fieldCount > 0);
}
