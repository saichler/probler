/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// API contract for every model the UI can reach.
//
// Distinct from the service sweep: that one asks "does the browser render it",
// this one asks "does the server answer it, in the shape the UI assumes". When
// both are run, a failure in exactly one of them localises the bug instantly --
// UI-side if the API passes, backend-side if it doesn't.
//
// Runs against the live cluster with no browser, so it is fast enough to cover
// all 250+ models exhaustively in a single test.

import { test, expect } from '../../fixtures/test';
import { Api, sessionCollides } from '../../fixtures/api';
import { allModels, NO_BACKEND_MODELS } from '../../fixtures/inventory';

test.describe('API contract', () => {
    test.describe.configure({ timeout: 300_000 });

    test('every model answers a paginated select', async ({ api }) => {
        const models = allModels();
        expect(models.length).toBeGreaterThan(0);

        const failures: string[] = [];
        for (const m of models) {
            try {
                const res = await api.listFirstPage(m.endpoint, m.model, 5);
                if (!Array.isArray(res.list)) {
                    failures.push(`${m.model} (${m.endpoint}): response has no "list" array`);
                }
            } catch (e) {
                failures.push(`${m.model} (${m.endpoint}): ${(e as Error).message}`);
            }
        }
        expect(
            failures,
            `models the API could not serve:\n  ${failures.join('\n  ')}`
        ).toEqual([]);
    });

    test('page-1 metadata carries a Total for every model', async ({ api }) => {
        // Layer8DTablePaginationMetadata: the server computes key counts only
        // on page 1, and the whole pagination UI depends on that being present.
        const missing: string[] = [];
        for (const m of allModels()) {
            try {
                const res = await api.query(m.endpoint, `select * from ${m.model} limit 1 page 0`);
                // A model with no rows returns no metadata block at all, which
                // the pagination UI reads as `counts.Total || 0` -- correct for
                // an empty table. Asserting a Total there just makes the spec
                // fail on a freshly loaded cluster (it caught
                // L8AgentChatConversation, which is empty until someone chats).
                // The regression this test exists for is a model that HAS rows
                // and still reports no Total.
                if ((res.list || []).length === 0) continue;
                if (res.metadata?.keyCount?.counts?.Total === undefined) {
                    missing.push(`${m.model} (${m.endpoint})`);
                }
            } catch (e) {
                missing.push(`${m.model}: ${(e as Error).message}`);
            }
        }
        expect(missing, `models returning no page-1 Total:\n  ${missing.join('\n  ')}`).toEqual([]);
    });

    test('page 2 does not report a total of zero', async ({ api }) => {
        // The regression Layer8DTablePaginationMetadata says has recurred four
        // times: reading metadata on page 2+ overwrites the real total with 0.
        // Only meaningful for models with more than one page of data.
        const broken: string[] = [];
        for (const m of allModels()) {
            let total = 0;
            try {
                total = await api.total(m.endpoint, m.model);
            } catch { continue; }
            if (total <= 10) continue;

            const p2 = await api.query(m.endpoint, `select * from ${m.model} limit 10 page 1`);
            if (p2.list.length === 0) {
                broken.push(`${m.model}: total=${total} but page 1 (0-based) returned no rows`);
            }
        }
        expect(broken, `paging failures:\n  ${broken.join('\n  ')}`).toEqual([]);
    });

    test('a bare GET without an L8Query is rejected', async ({ api }) => {
        // L8QueryRules Rule 1. If this ever starts succeeding, the rule has
        // been silently relaxed and every "no body" bug becomes invisible.
        await expect(api.query('/10/AlmDef', '')).rejects.toThrow();
    });

    test('Hosts & VMs models are served', async ({ api }) => {
        // KNOWN GAP: no backend service exists for these yet (js/hosts.js
        // renders empty tables). Flips to passing once one is added.
        test.fail(true, 'Hosts & VMs has no backend service yet');
        for (const model of NO_BACKEND_MODELS) {
            await api.listFirstPage('/0/NCache', model, 1);
        }
    });

    test('the health service reports services', async ({ api }) => {
        const health = await api.health();
        expect(health.list.length, 'the Health service returned nothing').toBeGreaterThan(0);
    });

    test('the ORM query cache keeps different filters apart for every session', async () => {
        // KNOWN UPSTREAM BUG: see sessionCollides() in fixtures/api.ts.
        test.fail(true, 'l8orm readWithIndex: int32 sign extension erases the query hash for ~half of sessions');
        let collided = 0;
        for (let i = 0; i < 16; i++) {
            const s = await Api.rawLogin();
            if (await sessionCollides(s)) collided++;
            await s.dispose();
        }
        expect(collided, `${collided}/16 sessions saw every filter return the same cached result`).toBe(0);
    });
});
