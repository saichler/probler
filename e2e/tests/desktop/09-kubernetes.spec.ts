/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// Kubernetes section, driven by Probler.k8sCategories through the generated
// inventory: every category tab, every resource service tab, its table, and --
// whenever the KIND cluster has that resource -- the first row's detail popup
// with every tab. Data is the KIND cluster itself, observed by the admission
// controller (probler-admission).

import { test, expect, assertNoPageErrors, waitForQuiet } from '../../fixtures/test';
import { Page } from '@playwright/test';
import { DESKTOP_SECTIONS } from '../../fixtures/inventory';
import { DesktopNav } from '../../pages/DesktopNav';
import { DesktopTable } from '../../pages/DesktopTable';
import { exerciseAllTabs, Popup } from '../../pages/Popup';
import { phantomModels } from '../../fixtures/api';

const K8S = DESKTOP_SECTIONS.find((s) => s.section === 'kubernetes')!;

async function openCategory(page: Page, key: string) {
    const tab = page.locator(`.k8s-category-tab[data-category="${key}"]`);
    await tab.click();
    await expect(tab).toHaveClass(/active/);
}

async function openService(page: Page, key: string) {
    // A category with a single resource renders no service tab bar.
    const tab = page.locator(`#k8s-service-tabs .k8s-service-tab[data-service="${key}"]`);
    if (!(await tab.count())) return;
    await tab.click();
    await expect(tab).toHaveClass(/active/);
}

const ALL_K8S_SERVICES = K8S.modules.flatMap((m) => m.services);

test.describe('kubernetes', () => {
    test.beforeEach(async ({ app }) => {
        await new DesktopNav(app).openSection('kubernetes');
        await expect(app.locator('#k8s-cluster-dropdown')).toBeVisible();
    });

    test('the cluster selector lists the KIND cluster @smoke', async ({ app, api }) => {
        const clusters = await api.query('/10/KCluster', 'select * from K8SCluster');
        const options = await app.locator('#k8s-cluster-dropdown option').allInnerTexts();
        for (const c of clusters.list) expect(options).toContain(String((c as { name: string }).name));
    });

    test('the overview shows a card per category and each card navigates', async ({ app }) => {
        await openCategory(app, 'overview');
        const cards = app.locator('.k8s-overview-card-wrap[data-category]');
        await expect(cards.first()).toBeVisible();
        const keys = await cards.evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.category!));
        const expected = K8S.modules.map((m) => m.moduleKey).filter((k) => k !== 'overview');
        expect([...keys].sort()).toEqual([...expected].sort());

        // The widget inside the wrapper carries the onclick.
        await cards.first().locator('.layer8d-widget').click();
        await expect(app.locator(`.k8s-category-tab[data-category="${keys[0]}"]`)).toHaveClass(/active/);
    });

    for (const cat of K8S.modules.filter((m) => m.services.length > 0)) {
        test(`${cat.moduleKey}: every resource table and popup works`, async ({ app, api, consoleErrors }) => {
            test.setTimeout(Math.max(120_000, cat.services.length * 25_000));
            // Phantom-record models are tracked by the dedicated test.fail below.
            const phantoms = await phantomModels(api, cat.services);
            await openCategory(app, cat.moduleKey);
            const problems: string[] = [];
            let opened = 0;
            for (const svc of cat.services) {
                if (phantoms.has(svc.model!)) continue;
                await openService(app, svc.key);
                const table = new DesktopTable(app, `#k8s-table-${svc.key}`);
                let state: 'rows' | 'empty';
                try {
                    state = await table.waitForResolved();
                } catch (e) {
                    problems.push(`${svc.key} (${svc.model}): ${(e as Error).message.split('\n')[0]}`);
                    continue;
                }
                if (state === 'empty') continue; // KIND has none of this resource
                await table.rows().first().locator('td').first().click();
                const popup = new Popup(app);
                await popup.waitForOpen();
                const tabs = await exerciseAllTabs(app);
                if (tabs.length === 0) problems.push(`${svc.key}: detail popup has no tabs`);
                await popup.close();
                opened++;
            }
            expect(problems, problems.join('\n')).toEqual([]);
            assertNoPageErrors(consoleErrors);
            test.info().annotations.push({ type: 'popups', description: `${opened}/${cat.services.length}` });
        });
    }

    test('the K8s inventory holds no keyless placeholder records', async ({ api }) => {
        // KNOWN UPSTREAM BUG: l8parser ParsingCenter.JobComplete PATCHes the bare
        // element (ClusterName only) when CTableToInstances yields no instances.
        test.fail(true, 'l8parser posts a ClusterName-only element for empty K8s resource lists');
        const phantoms = await phantomModels(api, ALL_K8S_SERVICES);
        expect([...phantoms], 'models holding a keyless placeholder record').toEqual([]);
    });

    test('workloads has data from the KIND cluster', async ({ app }) => {
        await openCategory(app, 'workloads');
        await openService(app, 'pods');
        const table = new DesktopTable(app, '#k8s-table-pods');
        expect(await table.waitForResolved(), 'KIND always runs kube-system pods').toBe('rows');
        await expect(table.rows().filter({ hasText: 'kube-system' }).first()).toBeVisible();
    });

    test('changing the cluster re-queries with the cluster filter', async ({ app }) => {
        await openCategory(app, 'workloads');
        await openService(app, 'pods');
        await new DesktopTable(app, '#k8s-table-pods').waitForResolved();
        const dropdown = app.locator('#k8s-cluster-dropdown');
        const value = await dropdown.inputValue();
        const req = app.waitForRequest((r) => decodeURIComponent(r.url()).includes(`clusterName=${value}`));
        await dropdown.dispatchEvent('change');
        await req;
        await waitForQuiet(app);
    });

    test.afterEach(async ({ consoleErrors }) => {
        assertNoPageErrors(consoleErrors);
    });
});
