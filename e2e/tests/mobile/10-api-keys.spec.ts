/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// API keys on the real mobile bundle (full parity with desktop): list, create
// with the show-once key and Copy, detail without the secret, edit, revoke and
// delete -- all through the shared l8ui L8SysApiKeysMobile component.

import { Page } from '@playwright/test';
import { test, expect, assertNoPageErrors } from '../../fixtures/test';
import { Api, safeCleanup } from '../../fixtures/api';
import { runTag } from '../../fixtures/formdata';
import { MobileNav, MobileTable } from '../../pages/MobileNav';

const KEYS = '/71/ApiKeys';
const KEY_RE = /^l8k_[0-9a-f-]{36}_[A-Za-z0-9_-]{43}$/;
const OWN_KEYS = { text: 'select * from L8ApiKey limit 50 page 0' };
const REPLICATION_TIMEOUT = 30_000;

type ApiKey = { keyId: string; name?: string; description?: string; status?: number };

async function keysNamed(api: Api, name: string): Promise<ApiKey[]> {
    const res = await api.send('GET', KEYS, OWN_KEYS);
    return ((res.json?.list || []) as ApiKey[]).filter((k) => k.name === name);
}

async function keyStatus(key: string): Promise<number> {
    const k = await Api.fromBearer(key);
    try {
        return (await k.send('GET', KEYS, OWN_KEYS)).status;
    } finally {
        await k.dispose();
    }
}

function topPopup(page: Page) {
    return page.locator('.mobile-popup-overlay.open').last();
}

async function openApiKeys(page: Page): Promise<MobileTable> {
    const nav = new MobileNav(page);
    await nav.waitForHome();
    const query = await nav.openService('system', 'Security', 'API Keys', 'L8ApiKey');
    expect(query, 'the API Keys list never queried').not.toBeNull();
    const table = new MobileTable(page);
    await table.waitForResolved();
    return table;
}

/** The card's status badge (in the header); the status is not repeated as a card row. */
function badge(page: Page, name: string) {
    return card(page, name).locator('.mobile-edit-table-card-header');
}

/** Narrows the card list to one name (server-side filter on the name column). */
async function filterByName(page: Page, table: MobileTable, name: string): Promise<void> {
    await page.locator('.mobile-edit-table-column-select').selectOption('name');
    await table.rerender(() => page.locator('.mobile-edit-table-search-input').fill(name));
}

/** The whole card (MobileTable.cards() returns its body rows; the name is in the header). */
function card(page: Page, name: string) {
    return page.locator('.mobile-edit-table-card').filter({ hasText: name });
}

test.describe('API keys (mobile)', () => {
    let tag: string;
    test.beforeEach(() => { tag = `${runTag()}-mkey`; });
    test.afterEach(async ({ api }) => {
        await safeCleanup(`API keys ${tag}*`, async () => {
            const res = await api.send('GET', KEYS, OWN_KEYS);
            for (const k of (res.json?.list || []) as ApiKey[]) {
                if (k.name && k.name.startsWith(tag)) {
                    await api.send('DELETE', KEYS, { text: `select * from L8ApiKey where keyId='${k.keyId}'` });
                }
            }
        });
    });

    test('1. list shows a seeded key as Active', async ({ mobile, api, consoleErrors }) => {
        const name = `${tag}-1`;
        const res = await api.send('POST', KEYS, { name });
        expect(res.status, res.text).toBe(200);
        const table = await openApiKeys(mobile);
        await filterByName(mobile, table, name);
        await expect(card(mobile, name)).toBeVisible({ timeout: 15000 });
        await expect(badge(mobile, name)).toContainText('Active');
        await expect(card(mobile, name).locator('.mobile-edit-table-card-label', { hasText: 'Status' })).toHaveCount(0);
        assertNoPageErrors(consoleErrors);
    });

    test('2. create shows the key once, Copy works, the key works', async ({ mobile, consoleErrors }) => {
        await mobile.context().grantPermissions(['clipboard-read', 'clipboard-write']);
        const name = `${tag}-2`;
        const table = await openApiKeys(mobile);
        await mobile.locator('[data-action="add"]').first().click();
        const add = topPopup(mobile);
        await expect(add.locator('.mobile-popup-title')).toHaveText('Add API Key');
        await add.locator('#m-apikey-name').fill(name);
        await add.locator('#m-apikey-lifetime').selectOption('30');
        await add.locator('.mobile-popup-btn-save').click();

        const box = topPopup(mobile).locator('.m-apikey-box');
        await expect(box, 'the show-once key popup did not open').toBeVisible({ timeout: 15000 });
        const key = (await box.innerText()).trim();
        expect(key).toMatch(KEY_RE);
        await topPopup(mobile).locator('[data-action="copy-key"]').click();
        await expect.poll(() => mobile.evaluate(() => navigator.clipboard.readText())).toBe(key);
        await expect.poll(() => keyStatus(key), { timeout: REPLICATION_TIMEOUT }).toBe(200);

        await topPopup(mobile).locator('[data-action="close-key"]').click();
        await expect(mobile.locator('.mobile-popup-overlay.open')).toHaveCount(0, { timeout: 5000 });
        await filterByName(mobile, table, name);
        await expect(card(mobile, name)).toBeVisible({ timeout: 15000 });
        assertNoPageErrors(consoleErrors);
    });

    test('3-6. detail has no secret; edit, revoke and delete', async ({ mobile, api, consoleErrors }) => {
        const name = `${tag}-3`;
        const created = await api.send('POST', KEYS, { name });
        expect(created.status, created.text).toBe(200);
        const key = created.json.list[0].key as string;
        const table = await openApiKeys(mobile);
        await filterByName(mobile, table, name);

        // 3. Detail: no key, no hash; name and description editable, the rest read-only.
        await card(mobile, name).click();
        let popup = topPopup(mobile);
        await expect(popup.locator('.mobile-popup-title')).toHaveText('API Key');
        const html = await popup.locator('.mobile-popup-body').innerHTML();
        expect(html).not.toContain('l8k_');
        expect(html.toLowerCase()).not.toContain('secrethash');
        await expect(popup.locator('#m-apikey-name')).toBeEditable();
        await expect(popup.locator('#m-apikey-description')).toBeEditable();
        const readOnly = popup.locator('.mobile-popup-body input[disabled]');
        expect(await readOnly.count()).toBeGreaterThan(0);

        // 4. Edit the description.
        await popup.locator('#m-apikey-description').fill(`${name} edited`);
        await popup.locator('.mobile-popup-btn-save').click();
        await expect.poll(async () => (await keysNamed(api, name))[0]?.description, {
            timeout: REPLICATION_TIMEOUT
        }).toBe(`${name} edited`);

        // 5. Revoke.
        await expect(mobile.locator('.mobile-popup-overlay.open')).toHaveCount(0, { timeout: 5000 });
        await card(mobile, name).click();
        popup = topPopup(mobile);
        await popup.locator('[data-action="revoke-key"]').click();
        await mobile.locator('.mobile-confirm-btn-danger').click();
        await expect.poll(() => keyStatus(key), { timeout: REPLICATION_TIMEOUT }).toBe(401);
        await expect(badge(mobile, name)).toContainText('Revoked', { timeout: 15000 });
        await card(mobile, name).click();
        await expect(topPopup(mobile).locator('[data-action="revoke-key"]')).toHaveCount(0);
        await mobile.evaluate(() => {
            (window as unknown as { Layer8MPopup: { closeAll(): void } }).Layer8MPopup.closeAll();
        });

        // 6. Delete.
        await card(mobile, name).locator('[data-action="delete"]').click();
        await mobile.locator('.mobile-confirm-btn-danger').click();
        await expect(card(mobile, name)).toHaveCount(0, { timeout: 15000 });
        expect(await keysNamed(api, name)).toEqual([]);
        assertNoPageErrors(consoleErrors);
    });
});
