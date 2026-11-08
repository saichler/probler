/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// Inventory section: the targets iframe (targets/index.html). Lists the
// l8opensim targets registered by k8s/seed-mocks.sh, filters by inventory
// type, opens the target detail popup (rendered by the parent through the
// probler-popup postMessage bridge), and runs add / toggle / delete through the
// UI on a run-coded target that is always cleaned up through the API.

import { test, expect, assertNoPageErrors, waitForQuiet } from '../../fixtures/test';
import { FrameLocator, Page } from '@playwright/test';
import { safeCleanup } from '../../fixtures/api';
import { DesktopNav } from '../../pages/DesktopNav';
import { exerciseAllTabs, Popup } from '../../pages/Popup';

const ENDPOINT = '/91/Targets';

function uniqueAddr(): string {
    const n = Date.now();
    return `10.99.${Math.floor(n / 250) % 250}.${(n % 250) + 1}`;
}

function apiTarget(id: string, addr: string) {
    return {
        targetId: id, linksId: 'NetDev', state: 1, inventoryType: 1,
        hosts: { [id]: { hostId: id, configs: { '1': { protocol: 1, addr, port: 22, credId: 'sim', timeout: '60' } } } }
    };
}

function frame(page: Page): FrameLocator {
    return page.frameLocator('#targets-iframe');
}

async function rowsResolved(page: Page) {
    const f = frame(page);
    await expect(f.locator('#targets-table-container tbody tr[data-row-index], #targets-table-container .l8-empty-state').first())
        .toBeVisible({ timeout: 30000 });
}

let readSeq = 0;
/**
 * Reads a target's server state. The query text varies per call on purpose:
 * KNOWN UPSTREAM BUG (l8orm plugins/postgres invalidateIndex) -- the index
 * stamp is time.Now().Unix(), so a query cached in the same second as a write
 * is never invalidated, and polling it keeps refreshing its TTL. A distinct
 * text per read bypasses that stale entry so the spec checks the real state.
 */
async function findTarget(api: { query: (e: string, q: string) => Promise<{ list: Record<string, unknown>[] }> }, id: string) {
    const r = await api.query(ENDPOINT, `select * from L8PTarget where targetId=${id} limit ${1 + (readSeq++ % 97)} page 0`);
    return r.list[0];
}

test.describe('inventory / targets', () => {
    const created: string[] = [];

    test.beforeEach(async ({ app }) => {
        await new DesktopNav(app).openSection('inventory');
        await rowsResolved(app);
    });

    test.afterEach(async ({ api, consoleErrors }) => {
        for (const id of created.splice(0)) {
            await safeCleanup(`target ${id}`, () => api.deleteById(ENDPOINT, 'L8PTarget', 'targetId', id));
        }
        assertNoPageErrors(consoleErrors);
    });

    test('lists the seeded network device targets @smoke', async ({ app }) => {
        const f = frame(app);
        await expect(f.locator('#targets-table-container tbody tr[data-row-index]').filter({ hasText: '10.20.30.1' }).first())
            .toBeVisible();
    });

    test('the inventory type filter switches to GPU targets', async ({ app }) => {
        const f = frame(app);
        const select = f.locator('#inventory-type-filter');
        await expect(select).toBeVisible();
        await select.selectOption('2');
        await expect(f.locator('#targets-table-container tbody tr[data-row-index]').filter({ hasText: '20.20.30.' }).first())
            .toBeVisible({ timeout: 20000 });
        await select.selectOption('1');
        await expect(f.locator('#targets-table-container tbody tr[data-row-index]').filter({ hasText: '10.20.30.' }).first())
            .toBeVisible({ timeout: 20000 });
    });

    test('a target row opens the detail popup with every tab', async ({ app }) => {
        await frame(app).locator('#targets-table-container tbody tr[data-row-index] td').first().click();
        const popup = new Popup(app);
        await popup.waitForOpen();
        const tabs = await exerciseAllTabs(app);
        expect(tabs).toEqual(expect.arrayContaining(['overview', 'hosts']));
        await popup.close();
    });

    test('add, toggle and delete a target through the UI', async ({ app, api }) => {
        const id = `e2e-target-${Date.now()}`;
        created.push(id);
        const f = frame(app);
        const popup = new Popup(app);

        await f.locator('.l8-btn-primary', { hasText: /add target/i }).click();
        await popup.waitForOpen();
        await popup.fill('target-id', id);
        await popup.fill('target-links-id', 'NetDev');
        // A target needs at least one host (the Targets service rejects
        // "invalid target, has no hosts"): + Add Host opens a stacked popup.
        const overlays = app.locator('.probler-popup-overlay');
        await popup.root().locator('.btn-small', { hasText: /add host/i }).click();
        await expect(overlays).toHaveCount(2);
        await popup.fill('host-id', id);
        // ...and every host needs a protocol config ("host has no configs").
        await popup.root().locator('.btn-small', { hasText: /add protocol/i }).click();
        await expect(overlays).toHaveCount(3);
        // Run-unique address: l8pollaris never releases an address (see the
        // known-gap test below), so a fixed one fails on every later run.
        await popup.fill('config-addr', uniqueAddr());
        await popup.saveButton().click();
        await expect(overlays).toHaveCount(2);
        await popup.saveButton().click();
        await expect(overlays).toHaveCount(1);
        await expect(popup.body()).toContainText(id);
        await popup.saveButton().click();
        await popup.waitForClosed();
        await expect.poll(() => findTarget(api, id).then((t) => !!t), { message: 'the added target never reached the API' })
            .toBe(true);

        // Find it in the table and toggle its state (Down -> Up).
        const before = (await findTarget(api, id))!.state;
        const row = f.locator('#targets-table-container tbody tr').filter({ hasText: id });
        const filter = f.locator('#targets-table-container .l8-filter-input[data-column="targetId"]');
        if (await filter.count()) await filter.fill(id);
        await expect(row).toHaveCount(1, { timeout: 20000 });
        await row.locator('.l8-btn-toggle').click();
        await expect.poll(() => findTarget(api, id).then((t) => t?.state), { message: 'toggling never changed the state' })
            .not.toBe(before);
        // Stop it again so the collector does not poll a fake address.
        await expect(row).toHaveCount(1, { timeout: 20000 });
        await row.locator('.l8-btn-toggle').click();
        await expect.poll(() => findTarget(api, id).then((t) => t?.state)).toBe(before);

        // Delete through the UI: the iframe asks the parent's confirm dialog.
        await row.locator('.l8-btn-danger').click();
        const confirm = app.locator('.confirm-actions .confirm-btn:not(.confirm-btn-cancel)');
        await expect(confirm).toBeVisible();
        await confirm.click();
        await expect.poll(() => findTarget(api, id).then((t) => !!t), { message: 'the deleted target is still in the API' })
            .toBe(false);
        created.splice(created.indexOf(id), 1);
    });

    test('Start All / Stop All ask for confirmation and can be cancelled', async ({ app }) => {
        const f = frame(app);
        for (const btn of ['#start-all-btn', '#stop-all-btn']) {
            await f.locator(btn).click();
            const cancel = app.locator('.confirm-actions .confirm-btn-cancel');
            await expect(cancel, `${btn} opened no confirmation`).toBeVisible();
            await cancel.click();
            await expect(cancel).toBeHidden();
        }
        await waitForQuiet(app);
    });

    test('a deleted target\'s address can be registered again', async ({ api }) => {
        // KNOWN UPSTREAM BUG (l8pollaris targets/TargetCallback.go): validateNewIP
        // stores every address in addressValidation and nothing removes it -- not
        // on DELETE, not when the transaction fails later -- so the address stays
        // "already exists" until probler-orm restarts.
        test.fail(true, 'l8pollaris never releases a target address');
        const addr = uniqueAddr();
        const first = `e2e-reuse-a-${Date.now()}`;
        const second = `e2e-reuse-b-${Date.now()}`;
        created.push(first, second);
        await api.post(ENDPOINT, apiTarget(first, addr));
        await api.deleteById(ENDPOINT, 'L8PTarget', 'targetId', first);
        await api.post(ENDPOINT, apiTarget(second, addr));
    });
});
