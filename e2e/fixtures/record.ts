/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// Seeding and cleanup of real records against the live cluster.
//
// PostImplementationE2ETesting's first hygiene rule: every spec that creates
// real data deletes it, wrapped so a cleanup failure never masks the test's own
// result -- otherwise the cluster accumulates orphans across runs and starts
// breaking OTHER specs' assumptions.
//
// `RecordBin` is the bookkeeping: register everything created, drain in
// afterEach. Registration happens BEFORE the value is used, so a spec that
// dies mid-way still gets its row cleaned up.

import { Api, safeCleanup } from './api';
import { DesktopService } from './inventory';
import { buildPayload, runTag, DerivedPayload } from './formdata';

export interface SeededRecord {
    id: string;
    tag: string;
    data: Record<string, unknown>;
}

/** Tracks every record a spec created so afterEach can remove them. */
export class RecordBin {
    private items: { endpoint: string; model: string; pk: string; id: string }[] = [];

    add(service: DesktopService, id: string): void {
        if (!service.primaryKey) return;
        this.items.push({
            endpoint: service.endpoint, model: service.model,
            pk: service.primaryKey, id
        });
    }

    /** Removes everything registered. Never throws. */
    async drain(api: Api): Promise<void> {
        for (const it of this.items.splice(0)) {
            await safeCleanup(`${it.model} ${it.id}`, () =>
                api.deleteById(it.endpoint, it.model, it.pk, it.id)
            );
        }
    }

    get size(): number {
        return this.items.length;
    }
}

export interface SeedOutcome {
    record: SeededRecord | null;
    /** Populated when the record could not be created; names the reason. */
    skipped: string | null;
}

/**
 * Creates one record for a service through the API.
 *
 * Seeding through the API rather than the UI is deliberate: a spec about the
 * EDIT form should not fail because the ADD form is broken. The create path has
 * its own spec.
 */
export async function seedRecord(
    api: Api, service: DesktopService, bin: RecordBin,
    refCache: Map<string, string | null>
): Promise<SeedOutcome> {
    if (!service.form) return { record: null, skipped: 'service declares no form' };
    if (!service.primaryKey) return { record: null, skipped: 'service declares no primary key' };

    const tag = runTag();
    let payload: DerivedPayload;
    try {
        payload = await buildPayload(api, service.form, tag, refCache);
    } catch (e) {
        return { record: null, skipped: `payload build failed: ${(e as Error).message}` };
    }
    if (payload.underivable.length > 0) {
        return {
            record: null,
            skipped: payload.underivable.map((u) => `${u.key} (${u.reason})`).join('; ')
        };
    }

    try {
        await api.post(service.endpoint, payload.data);
    } catch (e) {
        return { record: null, skipped: `POST rejected: ${(e as Error).message}` };
    }

    // The server generates the primary key (ServiceCallback Auto-Generate ID),
    // so the id is read back rather than assumed.
    const marker = findMarkerField(payload.data, tag);
    if (!marker) return { record: null, skipped: 'no identifiable field to read the record back by' };

    const found = await api.query<Record<string, unknown>>(
        service.endpoint, `select * from ${service.model} where ${marker.key}=${marker.value}`
    );
    const row = found.list[0];
    if (!row) return { record: null, skipped: 'record was POSTed but could not be read back' };

    const id = String(row[service.primaryKey] ?? '');
    if (!id) return { record: null, skipped: 'record has no primary key value' };

    bin.add(service, id);
    return { record: { id, tag, data: payload.data }, skipped: null };
}

/** A text field carrying the run tag, usable as a where-clause to find the row. */
function findMarkerField(
    data: Record<string, unknown>, tag: string
): { key: string; value: string } | null {
    for (const [k, v] of Object.entries(data)) {
        // formdata.ts guarantees tagged text values contain no spaces, so the
        // whole value is usable verbatim in an unquoted L8Query where-clause.
        if (typeof v === 'string' && v.includes(tag) && !v.includes(' ')) {
            return { key: k, value: v };
        }
    }
    return null;
}
