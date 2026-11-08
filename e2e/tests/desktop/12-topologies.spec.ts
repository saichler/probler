/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// Topologies section: the l8topology WebGL viewer (topo/index.html iframe).
// Selecting the discovered topology renders nodes/links from the inventory,
// and the zoom / layout / side-panel controls work.

import { test, expect, assertNoPageErrors } from '../../fixtures/test';
import { FrameLocator, Page } from '@playwright/test';
import { DesktopNav } from '../../pages/DesktopNav';

function topo(page: Page): FrameLocator {
    return page.frameLocator('iframe[src*="topo/"]');
}

test.describe('topologies', () => {
    test.beforeEach(async ({ app }) => {
        await new DesktopNav(app).openSection('topologies');
        await expect(topo(app).locator('#topology-select option').nth(1)).toBeAttached({ timeout: 30000 });
    });

    test('the topology list loads and the WebGL canvas is present @smoke', async ({ app }) => {
        const t = topo(app);
        await expect(t.locator('#webgl-canvas')).toBeVisible();
        expect(await t.locator('#topology-select option').count()).toBeGreaterThan(1);
    });

    test('selecting a topology renders its nodes and links', async ({ app }) => {
        const t = topo(app);
        const value = await t.locator('#topology-select option').nth(1).getAttribute('value');
        await t.locator('#topology-select').selectOption(value!);
        await expect.poll(async () => Number((await t.locator('#node-count').innerText()).replace(/\D/g, '') || 0),
            { timeout: 30000, message: 'the selected topology rendered no nodes' }).toBeGreaterThan(0);
        await expect(t.locator('#nodes-list > *').first()).toBeVisible();
        await t.locator('.tab-btn', { hasText: /links/i }).click();
        await expect(t.locator('#links-list')).toBeVisible();
        await t.locator('.tab-btn', { hasText: /legend/i }).click();
    });

    test('zoom and layout controls respond', async ({ app }) => {
        const t = topo(app);
        const value = await t.locator('#topology-select option').nth(1).getAttribute('value');
        await t.locator('#topology-select').selectOption(value!);
        const zoom = t.locator('#zoom-level');
        const start = await zoom.innerText();
        await t.locator('#zoom-in-btn').click();
        await expect(zoom).not.toHaveText(start);
        await t.locator('#zoom-reset-btn').click();
        await expect(zoom).toHaveText(start);
        const layouts = await t.locator('#layout-select option').evaluateAll((o) => o.map((x) => (x as HTMLOptionElement).value));
        expect(layouts.length).toBeGreaterThan(1);
        for (const l of layouts) await t.locator('#layout-select').selectOption(l);
    });

    test.afterEach(async ({ consoleErrors }) => {
        assertNoPageErrors(consoleErrors);
    });
});
