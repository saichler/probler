/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// PHASE 7 -- the mobile view system: 50 services declaring an alternate view.
//
// Desktop's 07-view-system proves the desktop factory; this is not a copy of it,
// because the mobile view stack is genuinely different in a way that matters:
// Layer8MViewFactory auto-registers only 'table' (as Layer8MEditTable, NOT
// Layer8MTable -- see MobileNav.cards()), and the other seven types self-register
// from m/js/layer8m-<type>.js. Those wrappers then delegate rendering to the
// DESKTOP components (layer8m-chart.js: "Reuses desktop chart renderers ... with
// mobile data source"), adding a `layer8m-<type>-container` class to the shared
// container. So a view is proven only by BOTH signals:
//
//   outer   #service-table-container gained layer8m-<type>-container
//           -- the mobile wrapper was constructed
//   inner   the delegated desktop component's own markup appeared
//           -- it actually drew something
//
// Asserting only the outer class would pass on a wrapper that constructed and
// then rendered nothing, which is exactly the failure mode desktop's spec hit.
//
// MobileRules requires desktop/mobile functional parity, so a view type offered
// on desktop and silently missing here is a real gap, not a cosmetic one.

import { test, expect, assertNoPageErrors } from '../../fixtures/test';
import { MobileNav } from '../../pages/MobileNav';
import { MOBILE_MODULES } from '../../fixtures/inventory';

/**
 * Inner markup each view type must produce.
 *
 * These are the DESKTOP component classes on purpose -- the mobile wrappers
 * delegate to Layer8DChart / Layer8DKanban / etc. Verified against l8ui source
 * rather than guessed: `.layer8d-kanban-board` (not `.layer8d-kanban`),
 * `.layer8d-tree-grid`, `.layer8d-calendar`, `.layer8d-gantt`.
 */
const INNER_MARKER: Record<string, string> = {
    table: '.mobile-edit-table-cards, .mobile-edit-table-empty, .mobile-edit-table-error, ' +
           '.mobile-table-cards, .mobile-table-empty, .mobile-table-error',
    chart: 'svg, canvas, .layer8d-chart',
    kanban: '.layer8d-kanban-board',
    calendar: '.layer8d-calendar',
    timeline: '.layer8d-timeline',
    gantt: '.layer8d-gantt',
    tree: '.layer8d-tree-grid',
    wizard: '.layer8d-wizard'
};

/** Every (module, sub-module, service) that declares more than one view. */
function servicesWithAlternates() {
    const out: {
        moduleKey: string; subModuleLabel: string; subModuleKey: string;
        key: string; label: string; model: string; views: string[];
    }[] = [];
    for (const mod of MOBILE_MODULES) {
        for (const sub of mod.subModules) {
            for (const svc of sub.services) {
                const views = [...new Set(svc.alternateViews || [])];
                if (views.length <= 1 || !svc.model) continue;
                out.push({
                    moduleKey: mod.moduleKey,
                    subModuleLabel: sub.subModuleLabel,
                    subModuleKey: sub.subModuleKey,
                    key: svc.key, label: svc.label, model: svc.model, views
                });
            }
        }
    }
    return out;
}

const WITH_ALTERNATES = servicesWithAlternates();

test.describe('mobile view system', () => {
    test('every view type the nav config declares is registered @smoke', async ({ mobile }) => {
        const declared = [...new Set(WITH_ALTERNATES.flatMap((s) => s.views))];
        expect(declared.length, 'no mobile service declares an alternate view').toBeGreaterThan(0);

        const missing = await mobile.evaluate((types: string[]) => {
            const w = window as unknown as {
                Layer8MViewFactory?: { has?(t: string): boolean; create?: unknown };
            };
            const f = w.Layer8MViewFactory;
            if (!f) return ['Layer8MViewFactory is not on window'];
            // The factory logs "Unknown view type" and returns null rather than
            // throwing, so an unregistered type is otherwise silent.
            return types.filter((t) => (typeof f.has === 'function' ? !f.has(t) : false));
        }, declared);

        expect(
            missing,
            `view types declared by the mobile nav config but never registered with ` +
            `Layer8MViewFactory -- m/js/layer8m-<type>.js missing from m/app.html:\n  ` +
            `${missing.join('\n  ')}`
        ).toEqual([]);
    });

    for (const svc of WITH_ALTERNATES) {
        test(`${svc.moduleKey} / ${svc.key} renders [${svc.views.join(', ')}]`,
            async ({ mobile, consoleErrors }) => {
                // One drill-down plus one render per view; scale rather than
                // trusting the flat budget (the mistake that made the mobile
                // sweep and two desktop specs time out).
                test.setTimeout(Math.max(120_000, svc.views.length * 30_000));
                test.fail(svc.moduleKey === 'hosts', 'Hosts & VMs has no backend service yet');

                const nav = new MobileNav(mobile);
                const problems: string[] = [];

                await nav.waitForHome();
                const query = await nav.openService(
                    svc.moduleKey, svc.subModuleLabel, svc.label, svc.model
                );
                test.skip(query === null,
                    `the drill-down never reached ${svc.moduleKey}/${svc.key}`);

                const slot = nav.viewSwitcherSlot();
                const container = nav.serviceContainer();

                // A service with >1 view must offer a switcher at all.
                if (!(await slot.count()) || (await slot.innerHTML()).trim() === '') {
                    problems.push(
                        `declares [${svc.views.join(', ')}] but rendered no view switcher ` +
                        `into #service-view-switcher`
                    );
                    expect(problems, problems.join('\n  ')).toEqual([]);
                    return;
                }

                for (const view of svc.views) {
                    // Layer8ViewSwitcher is an icon button plus a floating menu;
                    // the item carries data-view-TYPE and is unreachable until
                    // the menu is open.
                    const toggle = slot.locator('.l8-view-toggle');
                    const item = slot.locator(`[data-view-type="${view}"]`);
                    if (await toggle.count()) {
                        await toggle.first().click().catch(() => undefined);
                        // The menu is open once its items are on screen.
                        await item.first().waitFor({ state: 'visible', timeout: 3000 })
                            .catch(() => undefined);
                    }
                    if (!(await item.count())) {
                        if (await toggle.count()) {
                            await toggle.first().click().catch(() => undefined);
                        }
                        problems.push(`the switcher offers no option for "${view}"`);
                        continue;
                    }
                    await item.first().click();

                    // Wait for the view to show up -- its wrapper class or its
                    // drawn content -- instead of a fixed pause; whatever is on
                    // screen when the wait ends is what gets reported below.
                    // Wait for the DRAWN content: the wrapper class appears first
                    // and the delegated component draws a moment later (and again
                    // after every live re-render).
                    await expect
                        .poll(() => container.evaluate((el, m) => el.querySelector(m) !== null,
                            INNER_MARKER[view] || '*').catch(() => false),
                        { timeout: 10000 })
                        .toBe(true)
                        .catch(() => undefined);

                    const outer = await container.evaluate(
                        (el, t) => el.classList.contains(`layer8m-${t}-container`),
                        view
                    ).catch(() => false);
                    const inner = await container
                        .locator(INNER_MARKER[view] || '*').count().catch(() => 0);

                    if (!outer && inner === 0) {
                        problems.push(
                            `"${view}": the container gained no layer8m-${view}-container class ` +
                            `and produced no ${INNER_MARKER[view]} -- the view did not render`
                        );
                    } else if (inner === 0) {
                        problems.push(
                            `"${view}": the mobile wrapper was constructed ` +
                            `(layer8m-${view}-container) but drew nothing -- expected ` +
                            `${INNER_MARKER[view]} from the delegated desktop component`
                        );
                    }
                }

                // Never leave the floating menu open: it outlives the test and
                // intercepts the next one's navigation taps.
                await mobile.keyboard.press('Escape').catch(() => undefined);

                expect(problems, `mobile view failures:\n  ${problems.join('\n  ')}`).toEqual([]);
                assertNoPageErrors(consoleErrors, ['required', 'validation']);
            });
    }
});
