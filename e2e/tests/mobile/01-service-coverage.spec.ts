/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// Full mobile service sweep -- every service in LAYER8M_NAV_CONFIG.
//
// The desktop counterpart of this file proves the desktop shell; this one is
// not a copy of it, because the shells genuinely differ: mobile drills
// home -> module -> sub-module -> service through nav cards instead of tabs and
// sub-nav, renders cards instead of a table, and resolves columns through
// Layer8MModuleRegistry rather than Layer8DServiceRegistry.
//
// MobileRules requires desktop/mobile functional parity; running both sweeps
// and diffing the failures is what makes a parity gap visible instead of
// something someone notices on a phone months later.

import { test, expect, assertNoPageErrors } from '../../fixtures/test';
import { MobileNav, MobileTable } from '../../pages/MobileNav';
import { MOBILE_MODULES } from '../../fixtures/inventory';

// One test per (module, sub-module), mirroring the desktop sweep's granularity.
//
// Grouping a whole module into one test does not work here: mobile reaches a
// service by drilling home -> module -> sub-module -> service and then waiting
// on its query, so a module-sized test walks 29 (financial), 30 (scm) or 58
// (hcm) of those in one go and blows the 120s budget every time. Worse, the
// timeout tears the context down mid-flight, and every later test in that
// worker reports "Target page, context or browser has been closed" -- which
// reads like a product failure and is not one.
for (const mod of MOBILE_MODULES) {
    for (const sub of mod.subModules) {
        test(`mobile ${mod.moduleKey} / ${sub.subModuleKey}: all ${sub.services.length} service(s) load`,
        async ({ mobile, consoleErrors }) => {
            // Each service is a four-step drill-down plus a query wait; scale
            // with the count rather than trusting one flat budget.
            test.setTimeout(Math.max(120_000, sub.services.length * 20_000));
            // KNOWN GAP: Hosts & VMs has no backend service (see 00-shell-integrity).
            test.fail(mod.moduleKey === 'hosts', 'Hosts & VMs has no backend service yet');
            const nav = new MobileNav(mobile);
            const table = new MobileTable(mobile);
            const problems: string[] = [];

            {
                for (const svc of sub.services) {
                    const where = `${mod.moduleKey}/${sub.subModuleKey}/${svc.key} (${svc.model})`;

                    // A service with no model is a custom view (the AI chat, the
                    // module-settings tree): it renders its own UI and issues no
                    // L8Query by design, so a data sweep has nothing to assert.
                    // The desktop counterpart skips service.customView likewise.
                    if (!svc.model) continue;

                    // sub.subModuleLabel, never subModuleKey: the drill-down
                    // finds the sub-module card by its visible text.
                    const query = await nav.openService(
                        mod.moduleKey, sub.subModuleLabel, svc.label, svc.model
                    );

                    if (query === null) {
                        problems.push(
                            `${where}: no L8Query was issued -- the drill-down never reached ` +
                            `the service, or the view threw before fetching`
                        );
                        await nav.goHome();
                        continue;
                    }

                    if (!query.includes(`from ${svc.model}`)) {
                        problems.push(`${where}: wrong model in query -> "${query}"`);
                    }
                    if (!/limit \d+ page \d+/.test(query)) {
                        problems.push(`${where}: query is not paginated -> "${query}"`);
                    }

                    try {
                        const state = await table.waitForResolved();
                        if (state === 'error') {
                            problems.push(`${where}: the card list rendered its error state`);
                        }
                        if (state === 'cards') {
                            const labels = await table.firstCardLabels();
                            if (labels.length === 0) {
                                problems.push(`${where}: cards rendered with no field labels`);
                            }
                        }
                    } catch (e) {
                        problems.push(`${where}: ${(e as Error).message.split('\n')[0]}`);
                    }

                    // Back to the home grid for the next service.
                    await nav.goHome();
                }
            }

            expect(problems, `mobile service failures:\n  ${problems.join('\n  ')}`).toEqual([]);
            assertNoPageErrors(consoleErrors);
        });
    }
}
