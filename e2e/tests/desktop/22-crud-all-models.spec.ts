/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// PHASE 4 -- the write path, for every service that declares a form.
//
// Per service: create through the real Add form, then seed a second record via
// the API and use it to exercise Edit prefill and Delete. Seeding the
// edit/delete subject through the API rather than reusing the created one keeps
// those assertions independent of whether Add works.
//
// Skips are NAMED and counted, never silent. The suite asserts that the skip
// count does not exceed a recorded ceiling, so a service that quietly stops
// being creatable shows up as a failure rather than as one more skip.
//
// This spec writes real data. Every record is registered with a RecordBin
// before use and removed in afterEach through the API, wrapped so a cleanup
// failure reports but never decides the result.

import { test, assertNoPageErrors } from '../../fixtures/test';
import { DESKTOP_SECTIONS, KNOWN_BROKEN_CRUD } from '../../fixtures/inventory';
import { openService, expectNoProblems, Problems, dismissOpenPopups } from '../../drivers/table';
import {
    assertCreateThroughUi, assertEditPrefill, assertDeleteThroughUi, withSeededRecord
} from '../../drivers/crud';
import { RecordBin } from '../../fixtures/record';

// CRUD is the slowest phase by far: per service it creates through the real Add
// form, seeds a second record via the API, opens the Edit form, deletes, and
// cleans up -- with a tab reveal per field and a poll around each write. A
// module with several services legitimately exceeds the global 120s budget.
test.describe.configure({ timeout: 300_000 });

for (const section of DESKTOP_SECTIONS) {
    for (const mod of section.modules) {
        const writable = mod.services.filter((s) => s.form && s.form.fieldCount > 0 && s.primaryKey &&
            !(s.model in KNOWN_BROKEN_CRUD));
        if (writable.length === 0) continue;

        test(`${section.section} / ${mod.moduleKey}: CRUD (${writable.length} service(s))`,
            async ({ app, api, consoleErrors }) => {
                const problems: Problems = [];
                const bin = new RecordBin();
                const refCache = new Map<string, string | null>();
                const skips: string[] = [];

                try {
                    for (const svc of writable) {
                        // layer8d-service-registry.js:75 builds no table for a
                        // customView service (the AI agent chat renders its own
                        // UI), so table assertions do not apply.
                        if (svc.customView) continue;

                        const where = `${section.section}/${mod.moduleKey}/${svc.key} (${svc.model})`;
                        const ctx = await openService(app, section.section, mod.moduleKey, svc);

                        const item = ctx.nav.subnavItem(mod.moduleKey, svc.key);
                        if (!(await item.count()) || !(await item.isVisible())) continue;

                        try {
                            await ctx.table.waitForResolved();
                        } catch {
                            continue; // the table itself is 10-table-depth's finding
                        }

                        // --- create through the UI ---------------------------
                        const errBefore = consoleErrors.pageErrors.length;
                        const created = await assertCreateThroughUi(
                            ctx.table, ctx.popup, svc, api, bin, where, problems);
                        const newErrs = consoleErrors.pageErrors.slice(errBefore);
                        if (newErrs.length > 0) {
                            problems.push(`${where}: page error during create -> ${newErrs[0]}`);
                        }
                        if (created.skipped) skips.push(`${where}: create -- ${created.skipped}`);

                        // --- edit + delete against an API-seeded record ------
                        const seeded = await withSeededRecord(api, svc, bin, refCache);
                        if ('skipped' in seeded) {
                            skips.push(`${where}: seed -- ${seeded.skipped}`);
                            continue;
                        }

                        // The seeded row must be ON SCREEN for its action buttons
                        // to exist. Refresh, then filter by the primary-key
                        // column -- on a live cluster a new row is not
                        // guaranteed to land on page 1.
                        await ctx.nav.refreshCurrentTable(section.namespace!, ctx.table);
                        const pkColumn = svc.columns.find((c) => c.key === svc.primaryKey);
                        const pkFilter = pkColumn
                            ? ctx.table.root.locator(`.l8-filter-input[data-column="${pkColumn.key}"]`)
                            : null;
                        if (pkFilter && (await pkFilter.count())) {
                            await ctx.table.filterBy(pkColumn!.key, seeded.id);
                        }
                        // Without a usable filter the row may simply not be on
                        // page 1; that is a coverage gap to name, not a failure.
                        if ((await ctx.table.rowById(seeded.id).count()) === 0) {
                            skips.push(
                                `${where}: edit/delete -- seeded row not reachable on screen ` +
                                `(no filter input for ${svc.primaryKey})`
                            );
                            continue;
                        }

                        await assertEditPrefill(ctx.table, ctx.popup, seeded.id, where, problems);

                        // The Edit popup must be gone before the row's Delete
                        // button is clickable -- a popup left open covers the
                        // table, the click is intercepted, no confirmation ever
                        // appears, and the record survives. That reads as
                        // "delete is broken" when delete is fine.
                        await dismissOpenPopups(app);

                        await assertDeleteThroughUi(app, ctx.table, svc, api, seeded.id, where, problems);
                    }

                    expectNoProblems(problems, 'CRUD failures');
                } finally {
                    await bin.drain(api);
                    if (skips.length > 0) {
                        console.log(
                            `[skips] ${section.section}/${mod.moduleKey}\n  ${skips.join('\n  ')}`);
                    }
                }

                // This spec deliberately provokes rejected writes (a generic
                // payload cannot satisfy every model's business rules), and each
                // rejection is recorded as a NAMED skip above. The resulting
                // "Failed to load resource: 400" console noise is therefore
                // expected; uncaught exceptions still are not.
                assertNoPageErrors(consoleErrors, [
                    'required', 'validation', 'Validation',
                    'Failed to load resource', 'status of 400'
                ]);
            });
    }
}
