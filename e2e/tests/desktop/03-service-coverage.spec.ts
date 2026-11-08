/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// Full desktop service sweep -- every service in the generated inventory.
//
// This is the spec that makes "do not drop the ball on any functionality"
// enforceable. It is driven by fixtures/inventory.json, which tools/
// generate-inventory.js produces from the shipped module configs, so a service
// added to a *-config.js is covered on the next `npm run inventory` rather than
// quietly falling outside the suite.
//
// One test per module (not per service) so that the shell is loaded once and
// then walked -- 56 tests covering 256 services, instead of 256 cold starts.
//
// For each service it asserts, in order:
//   1. the sub-nav item exists,
//   2. clicking it makes the browser ISSUE the L8Query -- the check that
//      separates "server returned nothing" from "the view threw before it ever
//      fetched", which is the failure this codebase actually shipped,
//   3. the query is well-formed per L8QueryRules (protobuf type, paging),
//   4. the container resolves to rows or an explicit empty state,
//   5. when rows render, the columns are the configured ones and not the
//      DEFAULT_COLUMNS fallback that EnumRendererColumnCascade describes.

import { test, expect, assertNoPageErrors } from '../../fixtures/test';
import { DesktopNav } from '../../pages/DesktopNav';
import { DesktopTable } from '../../pages/DesktopTable';
import { DESKTOP_SECTIONS } from '../../fixtures/inventory';
import { QueryRecorder } from '../../fixtures/queries';

// Columns Layer8DServiceRegistry falls back to when a module's columns object
// is missing -- the signature of a dead enums/columns IIFE.
const DEFAULT_COLUMN_FALLBACK = ['ID', 'Name', 'Status'];

for (const section of DESKTOP_SECTIONS) {
    // probler's custom sections (network, gpus, hosts, kubernetes, inventory,
    // topologies) render their own UI and have dedicated specs.
    if ((section as { custom?: boolean }).custom) continue;
    for (const mod of section.modules) {
        if (mod.services.length === 0) continue;

        test(`${section.section} / ${mod.moduleKey}: all ${mod.services.length} service(s) load`,
            async ({ app, consoleErrors }) => {
                // Attached before any navigation: the module factory fetches
                // its DEFAULT service during initialize(), so that query is
                // already in flight by the time the first click happens.
                const queries = QueryRecorder.forPage(app);
                const nav = new DesktopNav(app);
                await nav.openSection(section.section);
                await nav.openModule(mod.moduleKey);

                const problems: string[] = [];

                for (const svc of mod.services) {
                    if (svc.customView) continue; // renders its own UI, not a table
                    const where = `${section.section}/${mod.moduleKey}/${svc.key} (${svc.model})`;

                    const item = nav.subnavItem(mod.moduleKey, svc.key);
                    if (!(await item.count())) {
                        problems.push(`${where}: no sub-nav item rendered`);
                        continue;
                    }
                    // Hidden by the permission or module filter is a legitimate
                    // state for a restricted account, not a failure.
                    if (!(await item.isVisible())) continue;

                    await nav.openService(mod.moduleKey, svc.key);
                    const query = await queries.waitForModel(svc.model);

                    if (query === null) {
                        problems.push(
                            `${where}: the view never issued an L8Query -- it threw before ` +
                            `fetching, or the container id did not match`
                        );
                        continue;
                    }

                    // L8QueryRules: `from` takes the protobuf type, and the
                    // table always pages.
                    if (!query.includes(`from ${svc.model}`)) {
                        problems.push(`${where}: query used the wrong model -> "${query}"`);
                    }
                    if (!/limit \d+ page \d+/.test(query)) {
                        problems.push(`${where}: query is not paginated -> "${query}"`);
                    }

                    const table = new DesktopTable(app, mod.moduleKey, svc.key);
                    let state: 'rows' | 'empty';
                    try {
                        state = await table.waitForResolved();
                    } catch (e) {
                        problems.push(`${where}: ${(e as Error).message.split('\n')[0]}`);
                        continue;
                    }

                    if (state === 'rows') {
                        const labels = await table.columnLabels();
                        const isFallback =
                            labels.length === DEFAULT_COLUMN_FALLBACK.length &&
                            DEFAULT_COLUMN_FALLBACK.every((l) => labels.includes(l));
                        if (isFallback) {
                            problems.push(
                                `${where}: rendered DEFAULT_COLUMNS (${labels.join(', ')}) -- the ` +
                                `module's columns/enums IIFE most likely threw`
                            );
                        }
                        if (labels.length === 0) {
                            problems.push(`${where}: rows rendered with no column headers`);
                        }
                    }
                }

                expect(problems, `service failures:\n  ${problems.join('\n  ')}`).toEqual([]);
                assertNoPageErrors(consoleErrors);
            });
    }
}
