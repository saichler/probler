/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// GPU section: the simulated DGX/HGX servers are listed and every GPU server's
// detail popup renders all tabs.

import { test, expect, assertNoPageErrors } from '../../fixtures/test';
import { DesktopNav } from '../../pages/DesktopNav';
import { DesktopTable } from '../../pages/DesktopTable';
import { exerciseAllTabs, Popup } from '../../pages/Popup';

const CONTAINER = '#gpu-table';

test.describe('GPUs', () => {
    test.beforeEach(async ({ app }) => {
        await new DesktopNav(app).openSection('gpus');
    });

    test('the table lists the simulated GPU servers and agrees with the API @smoke', async ({ app, api }) => {
        const table = new DesktopTable(app, CONTAINER);
        expect(await table.waitForResolved()).toBe('rows');
        const total = await api.total('/2/GCache', 'GpuDevice');
        await expect(table.rows()).toHaveCount(Math.min(total, 15));
        await expect(table.rows().filter({ hasText: '20.20.30.' }).first()).toBeVisible();
    });

    test('every GPU server popup renders all tabs', async ({ app }) => {
        const table = new DesktopTable(app, CONTAINER);
        await table.waitForResolved();
        const count = await table.rows().count();
        const popup = new Popup(app);
        for (let i = 0; i < count; i++) {
            await table.rows().nth(i).locator('td').nth(1).click();
            await popup.waitForOpen();
            const tabs = await exerciseAllTabs(app);
            for (const t of ['overview', 'gpus', 'software']) expect(tabs).toContain(t);
            await popup.close();
        }
    });

    test('a sortable header re-sorts the table', async ({ app }) => {
        const table = new DesktopTable(app, CONTAINER);
        await table.waitForResolved();
        const header = table.root.locator('.l8-table-header-row th').filter({ has: app.locator('.l8-sort-indicator') }).first();
        await expect(header).toBeVisible();
        expect(await table.rerender(() => header.click()), 'sorting never re-rendered').toBe(true);
    });

    test.afterEach(async ({ consoleErrors }) => {
        assertNoPageErrors(consoleErrors);
    });
});
