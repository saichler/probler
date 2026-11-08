/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// Derives valid values for any form definition, from its field types.
//
// This is what makes write coverage across 250+ models tractable. The
// alternative -- a hand-written fixture per model -- is 250 fixtures that go
// stale the moment a proto field changes, which is the same staleness problem
// the generated inventory exists to avoid.
//
// Two representations are needed, and they are NOT the same:
//
//   uiValue()   what a human types into the rendered control
//   apiValue()  what the form stores and the server persists
//
// SharedComponentsReference's Data Collection table is the authority on the
// difference: currency is stored as cents, percentage as a decimal, hours as
// total minutes, date as a unix timestamp (0 meaning "Current"), checkbox as
// 1/0, reference as the bare id, and period as a {periodType, periodYear,
// periodValue} object. Filling a currency field with "1500" and then asserting
// the API holds 1500 would be wrong -- it holds 150000.

import { FormField, FormDef, desktopModels } from './inventory';
import { Api } from './api';

/** Marker for a field this module cannot produce a value for. */
export interface Underivable {
    key: string;
    type: string;
    reason: string;
}

const TAG = 'E2E';

/** A per-run suffix, so parallel workers never collide on unique keys. */
export function runTag(): string {
    return `${TAG}${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 1000)}`;
}

/** Endpoint for a model, resolved from the generated inventory. */
const MODEL_ENDPOINTS: Map<string, string> = new Map(
    desktopModels().map((m) => [m.model, m.endpoint])
);

export function endpointForModel(model: string): string | null {
    return MODEL_ENDPOINTS.get(model) ?? null;
}

/**
 * Fetches an existing id for a reference field's lookup model.
 * Returns null when the model has no rows -- the caller decides whether that
 * makes the whole record underivable (required) or just omittable (optional).
 */
export async function resolveReference(
    api: Api, lookupModel: string, cache: Map<string, string | null>
): Promise<string | null> {
    if (cache.has(lookupModel)) return cache.get(lookupModel)!;

    const endpoint = endpointForModel(lookupModel);
    if (!endpoint) {
        cache.set(lookupModel, null);
        return null;
    }
    try {
        const res = await api.listFirstPage<Record<string, unknown>>(endpoint, lookupModel, 1);
        const row = res.list[0];
        if (!row) {
            cache.set(lookupModel, null);
            return null;
        }
        // The id column is the first key ending in "Id"; the registry's
        // idColumn would be better but is not in the form definition.
        const idKey = Object.keys(row).find((k) => /Id$/i.test(k));
        const id = idKey ? String(row[idKey]) : null;
        cache.set(lookupModel, id);
        return id;
    } catch {
        cache.set(lookupModel, null);
        return null;
    }
}

/** What a user types into the rendered control for this field. */
export function uiValue(field: FormField, tag: string): string | null {
    switch (field.type) {
        case 'text':
        case 'textarea':
            // No spaces: L8Query has no string quoting, so the value has to be
            // a single token for `where key=value` to match it exactly later.
            return `${tag}-${field.key}`.slice(0, 40);
        case 'number':
            return '7';
        case 'money':
            return '15.00';            // stored as 1500 cents
        case 'url':
            return 'https://example.com/e2e';
        case 'ein':
            return '123456789';
        case 'ssn':
            return '123456789';
        case 'date':
        case 'datetime':
            return '01/15/2026';
        case 'time':
            return '09:30';
        case 'checkbox':
            return null;               // toggled, not typed
        case 'select':
            return null;               // selected by option value
        case 'reference':
            return null;               // chosen through the picker
        case 'file':
        case 'inlineTable':
        case 'period':
            return null;               // composite / non-text controls
        default:
            return `${tag}`;
    }
}

/**
 * What the record should hold once saved -- the API representation.
 * Returns undefined for fields this module deliberately omits.
 */
export function apiValue(field: FormField, tag: string, refId: string | null): unknown {
    switch (field.type) {
        case 'text':
        case 'textarea':
            return `${tag}-${field.key}`.slice(0, 40);
        case 'number':
            return 7;
        case 'money':
            return { amount: 1500 };   // cents
        case 'url':
            return 'https://example.com/e2e';
        case 'ein':
        case 'ssn':
            return '123456789';
        case 'date':
        case 'datetime':
            return 1768435200;         // 2026-01-15, unix seconds
        case 'time':
            return 34200;              // 09:30 in seconds
        case 'checkbox':
            return true;
        case 'select':
            // Enum zero is UNSPECIFIED by ProtobufRules, so never pick it.
            return field.options?.find((o) => o !== 0) ?? 1;
        case 'reference':
            return refId ?? undefined;
        case 'period':
            return { periodType: 1, periodYear: 2026, periodValue: 1 };
        case 'inlineTable':
            return [];                 // children are exercised by their own spec
        case 'file':
            return undefined;          // requires a real upload
        default:
            return undefined;
    }
}

export interface DerivedPayload {
    data: Record<string, unknown>;
    /** Required fields no value could be produced for. */
    underivable: Underivable[];
}

/**
 * Builds a POST payload for a form definition.
 *
 * A required `reference` whose lookup model is empty, or a required `file`,
 * makes the record underivable -- reported by name rather than guessed at, so
 * a skipped model is visible instead of silently uncovered.
 */
export async function buildPayload(
    api: Api, form: FormDef, tag: string, refCache: Map<string, string | null>
): Promise<DerivedPayload> {
    const data: Record<string, unknown> = {};
    const underivable: Underivable[] = [];

    for (const section of form.sections) {
        for (const field of section.fields) {
            if (field.readOnly || field.hidden) continue;

            let refId: string | null = null;
            if (field.type === 'reference' && field.lookupModel) {
                refId = await resolveReference(api, field.lookupModel, refCache);
                if (!refId && field.required) {
                    underivable.push({
                        key: field.key, type: field.type,
                        reason: `required reference to "${field.lookupModel}", which has no rows`
                    });
                    continue;
                }
            }
            if (field.type === 'file' && field.required) {
                underivable.push({
                    key: field.key, type: field.type,
                    reason: 'required file upload'
                });
                continue;
            }

            const v = apiValue(field, tag, refId);
            if (v !== undefined) data[field.key] = v;
        }
    }
    return { data, underivable };
}

/** The subset of a payload that a spec can type into the UI without a picker. */
export function typeableFields(form: FormDef): FormField[] {
    return form.sections
        .flatMap((s) => s.fields)
        .filter((f) => !f.readOnly && !f.hidden && uiValue(f, TAG) !== null);
}
