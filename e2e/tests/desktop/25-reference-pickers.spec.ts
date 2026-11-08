/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// PHASE 5 -- reference pickers: all 90 lookup models.
//
// Two layers of assertion, because they fail differently:
//
//   static   every lookupModel named by a form has a reference registry entry
//            (ReferenceRegistryCompleteness). A missing entry produces
//            "Reference input missing required config: <field>" -- or worse,
//            silence.
//   live     opening the picker actually queries the lookup model and offers
//            rows, and selecting one stores the ID while displaying the label.
//
// The second matters because a registry entry can name an idColumn or
// displayColumn that does not exist on the model, which the static check cannot
// see and which renders a picker full of blank rows.
//
// Read-only: pickers are opened and closed, nothing is saved.

import { test, expect, assertNoPageErrors } from '../../fixtures/test';
import {
    desktopServices, desktopLookupModels, DesktopService
} from '../../fixtures/inventory';
import { openService, expectNoProblems, Problems, dismissTransientOverlays } from '../../drivers/table';
import { openAddForm } from '../../drivers/forms';
import { ReferencePicker } from '../../pages/ReferencePicker';
import { endpointForModel } from '../../fixtures/formdata';

/** First service whose form references each lookup model, so each is reachable. */
function servicesCoveringLookups(): Map<string, {
    section: string; moduleKey: string; service: DesktopService; field: string;
}> {
    const out = new Map<string, {
        section: string; moduleKey: string; service: DesktopService; field: string;
    }>();
    // Only writable services: a picker opens from an Add/Edit form, and a
    // read-only service (probler's Alarm, EventRecord) has neither -- its view
    // shows the referenced value, which 24-form-rendering covers.
    for (const x of desktopServices().filter((s) => !s.service.readOnly)) {
        for (const section of x.service.form?.sections || []) {
            for (const f of section.fields) {
                if (f.type !== 'reference' || !f.lookupModel || f.hidden) continue;
                if (out.has(f.lookupModel)) continue;
                out.set(f.lookupModel, {
                    section: x.section, moduleKey: x.moduleKey,
                    service: x.service, field: f.key
                });
            }
        }
    }
    return out;
}

const COVERAGE = servicesCoveringLookups();

test.describe('reference registry', () => {
    test('every lookupModel named by a form has a registry entry @smoke', async ({ app }) => {
        const models = desktopLookupModels();
        expect(models.length, 'no lookup models found in the inventory').toBeGreaterThan(0);

        const unregistered = await app.evaluate((list: string[]) => {
            const w = window as unknown as {
                Layer8DReferenceRegistry: { get(m: string): unknown };
            };
            return list.filter((m) => !w.Layer8DReferenceRegistry.get(m));
        }, models);

        expect(
            unregistered,
            `lookupModel(s) with no Layer8DReferenceRegistry entry -- these produce ` +
            `"Reference input missing required config":\n  ${unregistered.join('\n  ')}`
        ).toEqual([]);
    });

    test('every registered lookup model resolves to a real endpoint', () => {
        const missing = desktopLookupModels().filter((m) => !endpointForModel(m));
        expect(
            missing,
            `lookupModel(s) the UI references but no service exposes -- a picker for ` +
            `these can never load:\n  ${missing.join('\n  ')}`
        ).toEqual([]);
    });

    test('every lookup model answers a query', async ({ api }) => {
        test.setTimeout(240_000);
        const failures: string[] = [];
        for (const model of desktopLookupModels()) {
            const endpoint = endpointForModel(model);
            if (!endpoint) continue; // reported by the test above
            try {
                await api.listFirstPage(endpoint, model, 1);
            } catch (e) {
                failures.push(`${model} (${endpoint}): ${(e as Error).message.split('\n')[0]}`);
            }
        }
        expect(failures, `lookup models the API cannot serve:\n  ${failures.join('\n  ')}`).toEqual([]);
    });
});

// One test per lookup model, driving the real picker.
for (const [lookupModel, where] of COVERAGE) {
    test(`picker for ${lookupModel} (via ${where.section}/${where.service.key}.${where.field})`,
        async ({ app, api, consoleErrors }) => {
            const problems: Problems = [];
            const label = `${where.section}/${where.moduleKey}/${where.service.key}.${where.field} -> ${lookupModel}`;

            const ctx = await openService(app, where.section, where.moduleKey, where.service);
            const item = ctx.nav.subnavItem(where.moduleKey, where.service.key);
            test.skip(!(await item.count()) || !(await item.isVisible()),
                'service not visible to this account');

            await ctx.table.waitForResolved().catch(() => undefined);
            if (!(await openAddForm(ctx.table, ctx.popup, label, problems))) {
                test.skip(true, 'no Add form to open the picker from');
                return;
            }

            // A multi-section form is tabbed; a field in an inactive pane is
            // 0x0 and never becomes clickable.
            await ctx.popup.revealTabContaining(`[name="${where.field}"]`);
            // A date field elsewhere in the form may have opened the datepicker,
            // whose overlay covers the whole popup and swallows this click.
            await dismissTransientOverlays(app);

            // The picker is opened from the field's own control.
            const field = ctx.popup.body().locator(`[name="${where.field}"]`).first();
            expect(await field.count(), `${label}: the reference field did not render`).toBeGreaterThan(0);

            // If the field is still not interactable after revealing its tab,
            // report WHY rather than dying on an opaque click timeout.
            if (!(await field.isVisible().catch(() => false))) {
                const diag = await ctx.popup.body().evaluate((el, key) => {
                    const nodes = Array.from(el.querySelectorAll(`[name="${key}"]`)) as HTMLElement[];
                    return nodes.map((n) => {
                        const cs = getComputedStyle(n);
                        const r = n.getBoundingClientRect();
                        let hiddenAncestor = '';
                        let p: HTMLElement | null = n;
                        while (p) {
                            if (getComputedStyle(p).display === 'none') {
                                hiddenAncestor = `${p.tagName}.${(p.className || '').toString().slice(0, 30)}`;
                                break;
                            }
                            p = p.parentElement;
                        }
                        return { display: cs.display, w: r.width, h: r.height, hiddenAncestor };
                    });
                }, where.field);
                problems.push(
                    `${label}: the reference field never became visible -> ${JSON.stringify(diag)}`
                );
                await ctx.popup.close().catch(() => undefined);
                expectNoProblems(problems, 'reference picker failures');
                return;
            }

            await field.click();
            const picker = new ReferencePicker(app);
            try {
                await picker.waitForOpen(12000);
            } catch {
                problems.push(`${label}: clicking the reference field opened no picker`);
                await ctx.popup.close().catch(() => undefined);
                expectNoProblems(problems, 'reference picker failures');
                return;
            }

            const state = await picker.waitForResolved().catch(() => 'pending' as const);
            if (state === 'pending') {
                problems.push(`${label}: the picker never rendered rows or an empty state`);
            }

            // If the lookup model has data, the picker must offer it.
            const endpoint = endpointForModel(lookupModel);
            if (endpoint && state === 'empty') {
                const total = await api.total(endpoint, lookupModel).catch(() => 0);
                if (total > 0) {
                    problems.push(
                        `${label}: the picker is empty although ${lookupModel} has ${total} row(s)`
                    );
                }
            }

            // Selecting must store the ID and display something human-readable.
            if (state === 'rows') {
                const picked = await picker.selectFirst();
                if (!picked) {
                    problems.push(`${label}: could not select a row`);
                } else {
                    // The picker writes the field once it closes; wait for
                    // the value to land rather than for a fixed pause.
                    await expect.poll(() => field.inputValue().catch(() => ''), { timeout: 5000 })
                        .not.toBe('')
                        .catch(() => undefined);   // reported below
                    const stored = await field.inputValue().catch(() => '');
                    if (!stored) {
                        problems.push(`${label}: selecting a row stored no value in the field`);
                    }
                    // ref.idOnly() registers displayColumn === idColumn on
                    // purpose, for models with no human-readable label. Showing
                    // the id there is correct, not a misconfiguration.
                    const idOnly = await app.evaluate((m: string) => {
                        const w = window as unknown as {
                            Layer8DReferenceRegistry: {
                                get(x: string): { idColumn?: string; displayColumn?: string } | undefined;
                            };
                        };
                        const cfg = w.Layer8DReferenceRegistry.get(m);
                        return !!cfg && cfg.idColumn === cfg.displayColumn;
                    }, lookupModel);

                    if (!idOnly && (picked.display === '' || picked.display === picked.id)) {
                        problems.push(
                            `${label}: the picker showed the raw id as its display value -- ` +
                            `the registry's displayColumn is probably wrong for ${lookupModel}`
                        );
                    }
                }
            }

            await picker.close();
            await ctx.popup.close().catch(() => undefined);

            expectNoProblems(problems, 'reference picker failures');
            assertNoPageErrors(consoleErrors, ['required', 'validation']);
        });
}
