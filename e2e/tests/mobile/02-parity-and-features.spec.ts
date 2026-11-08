/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// Mobile table features and desktop/mobile parity.
//
// MobileRules: "Every feature must work on both platforms... A feature
// includes all downstream effects." The parity test below does not eyeball
// screenshots -- it compares the two shells' own configs, so a service that
// exists on one side and not the other is reported by name.

import { test, expect, assertNoPageErrors } from '../../fixtures/test';
import { MobileNav, MobileTable } from '../../pages/MobileNav';
import { desktopServices, mobileServices, NO_BACKEND_MODELS } from '../../fixtures/inventory';

test.describe('mobile table features', () => {
    test('network devices render as cards and agree with the API @smoke', async ({ mobile, api }) => {
        const nav = new MobileNav(mobile);
        const table = new MobileTable(mobile);

        await nav.waitForHome();
        const query = await nav.openService('network', 'Network Devices', 'Network Devices', 'NetworkDevice');
        expect(query, 'the mobile Network Devices view never issued a query').not.toBeNull();

        const total = await api.total('/0/NCache', 'NetworkDevice');
        const state = await table.waitForResolved();

        if (total === 0) {
            expect(state).toBe('empty');
            return;
        }
        expect(state, `the API reports ${total} devices but mobile rendered no cards`).toBe('cards');

        // Card labels must be the configured columns, not the fallback.
        const labels = await table.firstCardLabels();
        expect(labels.length, 'cards rendered with no labels').toBeGreaterThan(0);
    });

    test('paging loads a different set of cards', async ({ mobile, api }) => {
        const total = await api.total('/0/NCache', 'NetworkDevice');
        expect(total, 'needs more than one page of network devices').toBeGreaterThan(15);

        const nav = new MobileNav(mobile);
        const table = new MobileTable(mobile);
        await nav.waitForHome();
        await nav.openService('network', 'Network Devices', 'Network Devices', 'NetworkDevice');
        await table.waitForResolved();

        const first = await table.cards().allInnerTexts();

        // Layer8MEditTable is what the nav renders -- see MobileNav.cards().
        const next = mobile.locator('.mobile-table-pagination [data-action="next"], ' +
                                    '.mobile-table-pagination-controls [data-page], ' +
                                    '.mobile-edit-table-pagination [data-action="next"], ' +
                                    '.mobile-edit-table-pagination-controls [data-page]').last();
        await expect(next, 'no pagination control rendered').toBeVisible();
        await next.click();
        // Wait for different cards, not just any re-render: a live re-render of
        // page 1 (pushed update) would satisfy a plain re-render wait.
        await expect.poll(async () => (await table.cards().allInnerTexts()).join('|'),
            { message: 'tapping next-page never showed page 2' }).not.toBe(first.join('|'));

        const second = await table.cards().allInnerTexts();
        expect(second, 'page 2 rendered no cards').not.toEqual([]);
        expect(second, 'page 2 shows the same cards as page 1').not.toEqual(first);
    });

    test('tapping a card opens its detail popup', async ({ mobile }) => {
        const nav = new MobileNav(mobile);
        const table = new MobileTable(mobile);
        await nav.waitForHome();
        await nav.openService('network', 'Network Devices', 'Network Devices', 'NetworkDevice');

        const state = await table.waitForResolved();
        test.skip(state !== 'cards', 'no cards to tap');

        await table.cards().first().click();
        await expect(
            mobile.locator('.mobile-popup, .probler-popup-overlay, .layer8m-popup').first(),
            'tapping a card opened no detail popup'
        ).toBeVisible({ timeout: 20000 });
    });

    test('back navigation returns to the module grid', async ({ mobile }) => {
        const nav = new MobileNav(mobile);
        await nav.waitForHome();
        await nav.openModule('alarms');
        await expect(nav.cards().first()).toBeVisible();
        await nav.back();
        await expect(nav.moduleCard('alarms')).toBeVisible({ timeout: 15000 });
    });

    test.afterEach(async ({ consoleErrors }) => {
        assertNoPageErrors(consoleErrors);
    });
});

test.describe('desktop / mobile parity', () => {
    // Section key on desktop vs module key on mobile -- same business area,
    // different naming in the two configs.
    const SECTION_TO_MODULE: Record<string, string> = {
        alarms: 'alarms', system: 'system', network: 'network', gpus: 'gpus',
        hosts: 'hosts', kubernetes: 'kubernetes', inventory: 'inventory', topologies: 'topologies'
    };

    // Custom views are compared by presence, not by model: a service that
    // renders its own UI declares no data model on mobile (customInit) and may
    // still name one on desktop (customView: true, as aia/chat does). Comparing
    // the model strings made an equivalent pair look like a gap in BOTH
    // directions. 03-service-coverage and 14-inline-tables already skip these.
    test('every desktop service has a mobile counterpart', () => {
        const mobileModels = new Set(mobileServices().map((x) => `${x.moduleKey}|${x.service.model}`));
        const mobileKeys = new Set(mobileServices().map((x) => `${x.moduleKey}|${x.service.key}`));

        const gaps: string[] = [];
        for (const { section, service } of desktopServices()) {
            const moduleKey = SECTION_TO_MODULE[section];
            if (!moduleKey) continue;
            if (service.customView && !service.model) {
                // A model-less custom section (hosts, topologies): the mobile
                // module must exist; its content is compared by the section specs.
                if (![...mobileKeys].some((k) => k.startsWith(`${moduleKey}|`))) {
                    gaps.push(`${section}/${service.key} (custom view)`);
                }
                continue;
            }
            if (!mobileModels.has(`${moduleKey}|${service.model}`)) {
                gaps.push(`${section}/${service.key} (${service.model})`);
            }
        }
        expect(
            gaps,
            `services reachable on desktop but not on mobile -- MobileRules requires ` +
            `functional parity:\n  ${gaps.join('\n  ')}`
        ).toEqual([]);
    });

    test('every mobile service has a desktop counterpart', () => {
        const desktopModels = new Set(
            desktopServices().map((x) => `${SECTION_TO_MODULE[x.section] || x.section}|${x.service.model}`)
        );
        // The desktop Kubernetes overview + cluster selector render K8SCluster
        // (kubernetes-overview.js / kubernetes-init.js), not as a table service.
        desktopModels.add('kubernetes|K8SCluster');

        const desktopKeys = new Set(
            desktopServices().map((x) => `${SECTION_TO_MODULE[x.section] || x.section}|${x.service.key}`)
        );

        const gaps: string[] = [];
        for (const { moduleKey, service } of mobileServices()) {
            if (moduleKey === 'system' || moduleKey === 'dashboard') continue;
            if (service.model && NO_BACKEND_MODELS.includes(service.model)) continue; // known gap
            // No model => custom view on the mobile side; compare by key.
            if (!service.model) {
                // A model-less custom view (topology map, module settings):
                // the desktop must offer the same section.
                if (![...desktopKeys].some((k) => k.startsWith(`${moduleKey}|`))) {
                    gaps.push(`${moduleKey}/${service.key} (custom view)`);
                }
                continue;
            }
            if (!desktopModels.has(`${moduleKey}|${service.model}`)) {
                gaps.push(`${moduleKey}/${service.key} (${service.model})`);
            }
        }
        expect(
            gaps,
            `services reachable on mobile but not on desktop:\n  ${gaps.join('\n  ')}`
        ).toEqual([]);
    });

    test('mobile idField values are JSON names, not Go field names', () => {
        // JsProtobufFieldNames calls this a five-times regression: an idField
        // with Go casing makes getItemId return undefined, and every row tap
        // silently does nothing.
        const wrong = mobileServices()
            .filter((x) => x.service.idField && /^[A-Z]/.test(x.service.idField))
            .map((x) => `${x.moduleKey}/${x.service.key}: idField "${x.service.idField}"`);
        expect(
            wrong,
            `idField must be the protobuf JSON name (lowercase first letter):\n  ${wrong.join('\n  ')}`
        ).toEqual([]);
    });
});
