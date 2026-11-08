/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// Detail popups stay open on a pushed update and refresh in place, keeping the
// tab the user is on (they used to close on every update -- several times a
// minute for a polled device). Runs on freshApp: the specs wrap the websocket
// subscribe() of their own page.

import { test, expect, assertNoPageErrors, waitForQuiet } from '../../fixtures/test';
import { Page, BrowserContext } from '@playwright/test';
import { ENV } from '../../fixtures/env';
import { DesktopNav } from '../../pages/DesktopNav';
import { DesktopTable } from '../../pages/DesktopTable';
import { Popup } from '../../pages/Popup';
import { recordSubscriptions, replayUpdate } from '../../fixtures/live';

async function activeTab(page: Page): Promise<string | null> {
    return page.locator('.probler-popup-overlay').last().locator('.probler-popup-tab.active').getAttribute('data-tab');
}

for (const dev of [
    // Collectors push only when a device's data changes, so real pushes are
    // data-dependent (often none for minutes): the update is replayed to the
    // popup's own subscription. The server->browser push path is covered by
    // 19-realtime.
    { section: 'network', container: '#network-devices-table', model: 'NetworkDevice', tab: 'interfaces', ip: '10.20.30.' },
    { section: 'gpus', container: '#gpu-table', model: 'GpuDevice', tab: 'software', ip: '20.20.30.' }
]) {
    test(`a ${dev.model} popup refreshes in place on an update and keeps its tab`, async ({ freshApp: app, consoleErrors }) => {
        await recordSubscriptions(app);
        await new DesktopNav(app).openSection(dev.section);
        const table = new DesktopTable(app, dev.container);
        expect(await table.waitForResolved()).toBe('rows');
        const id = ((await table.rows().filter({ hasText: dev.ip }).first().innerText())
            .match(/\d+\.\d+\.\d+\.\d+/))![0];
        // Exact cell match: '10.20.30.1' must not pick the '10.20.30.1x' rows.
        const exact = new RegExp('^\\s*' + id.replace(/\./g, '\\.') + '\\s*$');
        const row = table.rows().filter({ has: app.locator('td', { hasText: exact }) }).first();
        await expect(row).toBeVisible();
        await row.locator('td').nth(1).click();
        const popup = new Popup(app);
        await popup.waitForOpen();
        await popup.openTab(dev.tab);

        const refetch = app.waitForRequest((r) => decodeURIComponent(r.url()).includes(`where Id=${id}`));
        await replayUpdate(app, dev.model, id);
        await refetch;
        await waitForQuiet(app);

        await expect(app.locator('.probler-popup-overlay'), 'the popup closed on a pushed update').toHaveCount(1);
        expect(await activeTab(app), 'the refresh lost the active tab').toBe(dev.tab);
        await popup.close();
        assertNoPageErrors(consoleErrors);
    });
}

test('a K8s detail popup refreshes in place on an update for its record', async ({ freshApp: app, consoleErrors }) => {
    await recordSubscriptions(app);
    await new DesktopNav(app).openSection('kubernetes');
    await app.locator('.k8s-category-tab[data-category="workloads"]').click();
    const table = new DesktopTable(app, '#k8s-table-pods');
    expect(await table.waitForResolved()).toBe('rows');
    const row = table.rows().filter({ hasText: 'coredns' }).first();
    await row.locator('td').first().click();
    const popup = new Popup(app);
    await popup.waitForOpen();
    await popup.openTab('json');
    // Title is "Pods: <namespace>/<name>" -- exactly the pod's key.
    const key = (await popup.title().innerText()).split(': ').slice(1).join(': ').trim();

    const refetch = app.waitForRequest((r) => decodeURIComponent(r.url()).includes(`where key=${key} and clusterName=`));
    await replayUpdate(app, 'K8SPod', key);
    await refetch;
    await waitForQuiet(app);

    await expect(app.locator('.probler-popup-overlay'), 'the popup closed on an update').toHaveCount(1);
    expect(await activeTab(app), 'the refresh lost the active tab').toBe('json');
    await expect(popup.root().locator('.probler-popup-tab-pane[data-pane="json"]')).toContainText(key);
    await popup.close();
    assertNoPageErrors(consoleErrors);
});

async function bootExplorer(page: Page, context: BrowserContext, token: string) {
    await context.addInitScript(([t, u]) => {
        sessionStorage.setItem('bearerToken', t as string);
        sessionStorage.setItem('username', u as string);
    }, [token, ENV.user]);
    await page.goto('/k8s-explorer.html');
    await expect(page.locator('#k8s-explorer-rail .layer8d-explorer-item').first()).toBeAttached({ timeout: 30000 });
    await waitForQuiet(page);
}

test('a K8s explorer popup refreshes in place and keeps its Related tab', async ({ page, context, api }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await bootExplorer(page, context, api.token);
    await recordSubscriptions(page);
    await page.locator('#k8s-explorer-rail .layer8d-explorer-item[data-item="pods"] .layer8d-explorer-item-label').click();
    const table = new DesktopTable(page, '#k8s-explorer-table-pods');
    expect(await table.waitForResolved()).toBe('rows');
    await table.rows().filter({ hasText: 'coredns' }).first().locator('td').first().click();
    const popup = new Popup(page);
    await popup.waitForOpen();
    const related = popup.root().locator('.probler-popup-tab[data-tab="related"]');
    await expect(related, 'the explorer never injected its Related tab').toHaveCount(1);
    await related.click();
    await popup.openTab('json');
    // Title is "Pods: <namespace>/<name>" -- exactly the pod's key.
    const key = (await popup.title().innerText()).split(': ').slice(1).join(': ').trim();

    // One subscription for this record (the explorer wrapper used to add a
    // second one that closed the popup and was never released).
    const subs = await page.evaluate(() =>
        ((window as unknown as { __e2eSubs: { model: string }[] }).__e2eSubs).filter((s) => s.model === 'K8SPod').length);

    const refetch = page.waitForRequest((r) => decodeURIComponent(r.url()).includes(`where key=${key} and clusterName=`));
    await replayUpdate(page, 'K8SPod', key);
    await refetch;
    await waitForQuiet(page);

    await expect(page.locator('.probler-popup-overlay'), 'the popup closed on an update').toHaveCount(1);
    expect(await activeTab(page)).toBe('json');
    await expect(related, 'the Related tab was lost (or duplicated) by the refresh').toHaveCount(1);
    await popup.close();
    const after = await page.evaluate(() =>
        ((window as unknown as { __e2eSubs: { model: string }[] }).__e2eSubs).filter((s) => s.model === 'K8SPod').length);
    expect(after, 'refreshing must not add subscriptions').toBe(subs);
    expect(errors, errors.join('\n')).toEqual([]);
});
