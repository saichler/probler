/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// Layer8DTable features end to end, on the network devices table: 19 live
// l8opensim devices at page size 15, so paging, filtering, sorting, page size,
// export and row click all have real data to act on (an empty cluster would
// make every one of these pass vacuously -- k8s/seed-mocks.sh guarantees data).

import { test, expect, assertNoPageErrors } from '../../fixtures/test';
import { DesktopNav } from '../../pages/DesktopNav';
import { DesktopTable } from '../../pages/DesktopTable';
import { exerciseAllTabs, Popup } from '../../pages/Popup';

const SECTION = 'network';
const CONTAINER = '#network-devices-table';
const MODEL = 'NetworkDevice';
const ENDPOINT = '/0/NCache';

test.describe('table features (network devices)', () => {
    test.beforeEach(async ({ app }) => {
        await new DesktopNav(app).openSection(SECTION);
    });

    test('renders rows and the count agrees with the API @smoke', async ({ app, api }) => {
        const table = new DesktopTable(app, CONTAINER);
        const apiTotal = await api.total(ENDPOINT, MODEL);
        expect(apiTotal, 'the cluster has no network devices -- seed-mocks.sh did not run').toBeGreaterThan(0);
        expect(await table.waitForResolved()).toBe('rows');
        await expect(table.rows().first()).toBeVisible();
        await expect.poll(() => table.reportedTotal(), { message: 'pagination total disagrees with the API' })
            .toBe(apiTotal);
    });

    test('paging fetches the next page and keeps the total', async ({ app, api }) => {
        const total = await api.total(ENDPOINT, MODEL);
        const table = new DesktopTable(app, CONTAINER);
        await table.waitForResolved();
        const pageSize = await table.rows().count();
        expect(total, `needs more than one page (${pageSize}) of devices`).toBeGreaterThan(pageSize);

        const firstRows = await table.rows().allInnerTexts();
        const next = table.root.locator('.l8-page-nav [data-action="next"]');
        await expect(next).toBeVisible();
        // Wait for page 2 itself: a live re-render of page 1 (pushed update)
        // would satisfy a plain "re-rendered" wait.
        await next.click();
        await expect(table.pagination(), 'next-page never reached page 2').toContainText(/Page 2 of/i);
        // Capture page 2 inside the poll: a live re-render can empty the body
        // for a moment, so a separate read afterwards could land mid-render.
        let secondRows: string[] = [];
        await expect.poll(async () => {
            secondRows = await table.rows().allInnerTexts();
            return secondRows.length > 0 && secondRows.join('|') !== firstRows.join('|');
        }, { message: 'page 2 never showed different, non-empty rows' }).toBe(true);
        expect(await table.reportedTotal(), 'the total was lost when paging past page 1').toBe(total);
    });

    test('a column filter narrows the result set', async ({ app, api }) => {
        const sample = await api.listFirstPage<{ equipmentinfo?: { sysName?: string } }>(ENDPOINT, MODEL, 1);
        const sysName = sample.list[0]?.equipmentinfo?.sysName;
        expect(sysName, 'sample device has no sysName').toBeTruthy();

        const table = new DesktopTable(app, CONTAINER);
        await table.waitForResolved();
        expect(await table.filterBy('name', sysName!), 'filtering never re-rendered the table').toBe(true);

        await expect(table.rows().first()).toBeVisible({ timeout: 20000 });
        const texts = await table.rows().allInnerTexts();
        expect(
            texts.every((t) => t.toLowerCase().includes(sysName!.toLowerCase())),
            `filtering by "${sysName}" returned rows that do not match it`
        ).toBeTruthy();
    });

    test('sorting re-issues the query with sort-by', async ({ app }) => {
        const table = new DesktopTable(app, CONTAINER);
        await table.waitForResolved();
        const sortable = table.root.locator('.l8-table-header-row th')
            .filter({ has: app.locator('.l8-sort-indicator') }).first();
        await expect(sortable, 'no sortable column rendered').toBeVisible();

        const requestPromise = app.waitForRequest(
            (r) => { const u = decodeURIComponent(r.url()); return u.includes('sort-by') && u.includes(`from ${MODEL}`); },
            { timeout: 15000 });
        await sortable.click();
        const req = await requestPromise;
        const query = JSON.parse(new URL(req.url()).searchParams.get('body') || '{}').text as string;
        expect(query).toContain('sort-by');
        expect(query).toContain(`from ${MODEL}`);
    });

    test('row click opens the device popup and every tab renders', async ({ app }) => {
        const table = new DesktopTable(app, CONTAINER);
        await table.waitForResolved();
        const popup = new Popup(app);
        await table.rows().first().locator('td').nth(1).click();
        await popup.waitForOpen();
        const tabs = await exerciseAllTabs(app);
        expect(tabs.length, 'the device popup rendered no tabs').toBeGreaterThan(1);
        await popup.close();
    });

    test('CSV export produces a download', async ({ app }) => {
        const table = new DesktopTable(app, CONTAINER);
        await table.waitForResolved();
        const menu = table.root.locator('[data-action="export-menu"]').first();
        await expect(menu, 'no export control rendered').toBeVisible();
        await menu.click();
        const csv = table.root.locator('[data-action="export-csv"]').first();
        await csv.waitFor({ state: 'visible' });
        const downloadPromise = app.waitForEvent('download', { timeout: 30000 });
        await csv.click();
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/\.csv$/i);
    });

    test('changing page size re-queries with the new limit', async ({ app }) => {
        const table = new DesktopTable(app, CONTAINER);
        await table.waitForResolved();
        const select = table.root.locator('.l8-page-size-select');
        await expect(select, 'no page-size selector rendered').toBeVisible();
        const current = await table.rows().count();
        const options = (await select.locator('option').allInnerTexts()).map(Number);
        const bigger = options.filter((n) => n > current)[0];
        expect(bigger, 'no larger page size available').toBeTruthy();

        const requestPromise = app.waitForRequest(
            (r) => decodeURIComponent(r.url()).includes(`limit ${bigger} `), { timeout: 15000 });
        await select.selectOption(String(bigger));
        await requestPromise;
    });

    test.afterEach(async ({ consoleErrors }) => {
        assertNoPageErrors(consoleErrors);
    });
});
