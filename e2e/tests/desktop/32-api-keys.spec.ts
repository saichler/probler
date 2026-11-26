/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// API keys (l8secure ApiKeys service, area 71) end to end: the HTTPS API
// contract, the admin-backed cases (key manager, owner lifecycle, role change,
// per-user cap), and the desktop UI (System > Security > API Keys).
//
// Every key name carries a run tag; keys and throwaway users are removed in
// afterEach through safeCleanup. The admin-backed cases need a TEST security
// image (admin without TFA, ../l8secure/build-images.sh probler <arch> test):
// against a normal image Api.login(ENV.adminUser) throws "requires TFA", which
// is a setup failure, not a test to skip.

import { test, expect, assertNoPageErrors } from '../../fixtures/test';
import { Api, safeCleanup } from '../../fixtures/api';
import { ENV } from '../../fixtures/env';
import { runTag } from '../../fixtures/formdata';
import { desktopServicesPerModule } from '../../fixtures/inventory';
import { DesktopNav } from '../../pages/DesktopNav';
import { DesktopTable } from '../../pages/DesktopTable';
import { Popup } from '../../pages/Popup';

const KEYS = '/71/ApiKeys';
const USERS = '/73/users';
const KEY_RE = /^l8k_[0-9a-f-]{36}_[A-Za-z0-9_-]{43}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ACTIVE = 1;
const REVOKED = 2;
const DAY = 86400;
const REPLICATION_TIMEOUT = 30_000;

type ApiKey = {
    keyId: string; userId?: string; name?: string; description?: string; key?: string; secretHash?: string;
    status?: number; createdAt?: string; expiresAt?: string; lastUsedAt?: string;
};

const keyQuery = (keyId: string) => ({ text: `select * from L8ApiKey where keyId='${keyId}'` });
const OWN_KEYS = { text: 'select * from L8ApiKey limit 50 page 0' };

/** Creates a key through the API and returns the create response's record. */
async function createKey(api: Api, name: string, extra: Record<string, unknown> = {}): Promise<ApiKey> {
    const res = await api.send('POST', KEYS, { name, ...extra });
    expect(res.status, `create key "${name}": ${res.text}`).toBe(200);
    const rec = res.json?.list?.[0] as ApiKey | undefined;
    expect(rec, `create key "${name}" returned no list[0]: ${res.text}`).toBeTruthy();
    return rec!;
}

async function getKey(api: Api, keyId: string): Promise<ApiKey | undefined> {
    const res = await api.send('GET', KEYS, keyQuery(keyId));
    expect(res.status, `GET key ${keyId}: ${res.text}`).toBe(200);
    return (res.json?.list || [])[0];
}

/** Status of one authenticated call made with the raw key as the bearer. */
async function keyStatus(key: string): Promise<number> {
    const k = await Api.fromBearer(key);
    try {
        return (await k.send('GET', KEYS, OWN_KEYS)).status;
    } finally {
        await k.dispose();
    }
}

async function deleteKey(api: Api, keyId: string): Promise<void> {
    const res = await api.send('DELETE', KEYS, keyQuery(keyId));
    if (res.status !== 200) throw new Error(`DELETE key ${keyId}: HTTP ${res.status} ${res.text}`);
}

/** Removes every key of `api`'s user whose name starts with `prefix`. */
async function deleteKeysNamed(api: Api, prefix: string): Promise<void> {
    const res = await api.send('GET', KEYS, OWN_KEYS);
    for (const k of (res.json?.list || []) as ApiKey[]) {
        if (k.name && k.name.startsWith(prefix)) await deleteKey(api, k.keyId);
    }
}

test.describe('API keys: HTTPS API contract', () => {
    let tag: string;
    test.beforeEach(() => { tag = `${runTag()}-key`; });
    test.afterEach(async ({ api }) => {
        await safeCleanup(`API keys ${tag}*`, () => deleteKeysNamed(api, tag));
    });

    test('1. create returns the raw key once; GET never returns key or hash', async ({ api }) => {
        const rec = await createKey(api, `${tag}-1`);
        expect(rec.key).toMatch(KEY_RE);
        expect(rec.keyId).toMatch(UUID_RE);
        expect(rec.secretHash ?? '').toBe('');
        expect(rec.key!.slice(4, 40)).toBe(rec.keyId);

        const got = await getKey(api, rec.keyId);
        expect(got, 'the created key is not readable by its owner').toBeTruthy();
        expect(got!.key ?? '').toBe('');
        expect(got!.secretHash ?? '').toBe('');
    });

    test('2. a key authenticates like its owner; 2a last_used_at; 2b replicated', async ({ api }) => {
        const rec = await createKey(api, `${tag}-2`);
        // 2b: the key is written by the security service and used on the web
        // node right away; it must become usable there (replicated principal).
        await expect.poll(() => keyStatus(rec.key!), {
            timeout: REPLICATION_TIMEOUT, message: 'the new key never authenticated on the web node'
        }).toBe(200);

        const k = await Api.fromBearer(rec.key!);
        try {
            const first = desktopServicesPerModule()[0].service;
            const data = await k.send('GET', first.endpoint!, { text: `select * from ${first.model} limit 10 page 0` });
            expect(data.status, `GET ${first.endpoint} with the key: ${data.text}`).toBe(200);
            expect(await k.permissions(), 'the key does not carry its owner\'s permissions')
                .toEqual(await api.permissions());
        } finally {
            await k.dispose();
        }

        // 2a (Decision M gate): one successful use writes last_used_at, and the
        // write reaches the store. If this fails: stop and report, do not weaken.
        await expect.poll(async () => Number((await getKey(api, rec.keyId))?.lastUsedAt || 0), {
            timeout: REPLICATION_TIMEOUT, message: 'last_used_at was never written after the key was used'
        }).toBeGreaterThan(0);
    });

    test('3. bad keys get a bare 401; positional parsing', async ({ api }) => {
        const rec = await createKey(api, `${tag}-3`);
        const key = rec.key!;
        const secret = key.slice(41);
        const flipped = secret[0] === 'A' ? 'B' : 'A';
        const bad = [
            key.slice(0, 41) + flipped + secret.slice(1),               // wrong secret
            'l8k_' + rec.keyId.slice(0, 20) + '_' + secret,             // short id
            'l8k_' + '00000000-0000-4000-8000-000000000000' + '_' + secret, // unknown id
            key.slice(0, 40) + key.slice(41)                            // no "_" after the id
        ];
        for (const b of bad) {
            const k = await Api.fromBearer(b);
            try {
                const res = await k.send('GET', KEYS, OWN_KEYS);
                expect(res.status, `a bad key was accepted: ${b.slice(0, 50)}...`).toBe(401);
                expect(res.text.toLowerCase()).not.toMatch(/revoked|expired|secret|hash|unknown/);
            } finally {
                await k.dispose();
            }
        }
        // Positional parsing: every real key works, including one whose secret
        // contains "_" or "-" (the base64url alphabet).
        const more = [rec];
        while (!more.some((r) => /[_-]/.test(r.key!.slice(41))) && more.length < 6) {
            more.push(await createKey(api, `${tag}-3-${more.length}`));
        }
        for (const r of more) {
            await expect.poll(() => keyStatus(r.key!), { timeout: REPLICATION_TIMEOUT }).toBe(200);
        }
    });

    test('4. a key session cannot manage keys, but can list them', async ({ api }) => {
        const rec = await createKey(api, `${tag}-4`);
        await expect.poll(() => keyStatus(rec.key!), { timeout: REPLICATION_TIMEOUT }).toBe(200);
        const k = await Api.fromBearer(rec.key!);
        try {
            const post = await k.send('POST', KEYS, { name: `${tag}-4-minted` });
            expect(post.status).toBe(400);
            expect(post.text).toContain('API-key session');
            const patch = await k.send('PATCH', KEYS, { keyId: rec.keyId, status: REVOKED });
            expect(patch.status).toBe(400);
            expect(patch.text).toContain('API-key session');
            const del = await k.send('DELETE', KEYS, keyQuery(rec.keyId));
            expect(del.status).toBe(400);
            expect(del.text).toContain('API-key session');

            const list = await k.send('GET', KEYS, OWN_KEYS);
            expect(list.status).toBe(200);
            expect((list.json?.list || []).map((x: ApiKey) => x.keyId)).toContain(rec.keyId);
        } finally {
            await k.dispose();
        }
    });

    test('5. expiry: past and beyond the maximum are refused, 0 gets 90 days', async ({ api }) => {
        const now = Math.floor(Date.now() / 1000);
        expect((await api.send('POST', KEYS, { name: `${tag}-5a`, expiresAt: now - 60 })).status).toBe(400);
        expect((await api.send('POST', KEYS, { name: `${tag}-5b`, expiresAt: now + 400 * DAY })).status).toBe(400);
        const rec = await createKey(api, `${tag}-5c`, { expiresAt: 0 });
        expect(Math.abs(Number(rec.expiresAt) - (Number(rec.createdAt) + 90 * DAY))).toBeLessThanOrEqual(60);
    });

    test('6. keys are issued only for yourself', async ({ api }) => {
        const res = await api.send('POST', KEYS, { name: `${tag}-6`, userId: ENV.chatPeerUser });
        expect(res.status).toBe(400);
    });

    test('7. another non-manager cannot see or revoke my key', async ({ api }) => {
        const rec = await createKey(api, `${tag}-7`);
        const peer = await Api.login(ENV.chatPeerUser, ENV.chatPeerPass);
        try {
            const seen = await peer.send('GET', KEYS, keyQuery(rec.keyId));
            expect(seen.status).toBe(200);
            expect(seen.json?.list || [], 'operator2 can see operator\'s key').toEqual([]);
            const revoke = await peer.send('PATCH', KEYS, { keyId: rec.keyId, status: REVOKED });
            expect(revoke.status).toBe(400);
        } finally {
            await peer.dispose();
        }
        await expect.poll(() => keyStatus(rec.key!), { timeout: REPLICATION_TIMEOUT }).toBe(200);
    });

    test('8. a view-only account cannot create keys', async () => {
        const viewer = await Api.login(ENV.readOnlyUser, ENV.readOnlyPass);
        try {
            const res = await viewer.send('POST', KEYS, { name: `${tag}-8` });
            expect(res.status, `viewer created a key: ${res.text}`).not.toBe(200);
        } finally {
            await viewer.dispose();
        }
    });

    test('9. revoke stops the key; revoked cannot be re-activated', async ({ api }) => {
        const rec = await createKey(api, `${tag}-9`);
        await expect.poll(() => keyStatus(rec.key!), { timeout: REPLICATION_TIMEOUT }).toBe(200);
        expect((await api.send('PATCH', KEYS, { keyId: rec.keyId, status: REVOKED })).status).toBe(200);
        await expect.poll(() => keyStatus(rec.key!), { timeout: REPLICATION_TIMEOUT }).toBe(401);
        expect((await api.send('PATCH', KEYS, { keyId: rec.keyId, status: ACTIVE })).status).toBe(400);
    });

    test('10. delete stops the key and removes it', async ({ api }) => {
        const rec = await createKey(api, `${tag}-10`);
        await expect.poll(() => keyStatus(rec.key!), { timeout: REPLICATION_TIMEOUT }).toBe(200);
        await deleteKey(api, rec.keyId);
        await expect.poll(() => keyStatus(rec.key!), { timeout: REPLICATION_TIMEOUT }).toBe(401);
        expect(await getKey(api, rec.keyId)).toBeUndefined();
    });
});

test.describe('API keys: admin-backed (test image)', () => {
    let admin: Api;
    let tag: string;
    let userId: string;
    const password = 'Thrw-Away1!';

    test.beforeAll(async () => {
        admin = await Api.login(ENV.adminUser, ENV.adminPass);
    });
    test.afterAll(async () => { await admin?.dispose(); });

    test.beforeEach(async () => {
        tag = `${runTag()}-akey`;
        userId = `${tag}-user`.toLowerCase();
        const res = await admin.send('POST', USERS, {
            userId, fullName: `E2E ${tag}`, password: { hash: password }, roles: { operator: true }
        });
        expect(res.status, `create throwaway user: ${res.text}`).toBe(200);
    });
    test.afterEach(async () => {
        await safeCleanup(`keys of ${userId}`, async () => {
            const res = await admin.send('GET', KEYS, { text: `select * from L8ApiKey where userId='${userId}'` });
            for (const k of (res.json?.list || []) as ApiKey[]) await deleteKey(admin, k.keyId);
        });
        await safeCleanup(`user ${userId}`, async () => {
            await admin.send('DELETE', USERS, { text: `select * from L8User where userId='${userId}'` });
        });
    });

    async function owner(): Promise<Api> {
        return Api.login(userId, password);
    }

    async function getUser(): Promise<Record<string, unknown>> {
        const res = await admin.send('GET', USERS, { text: `select * from L8User where userId='${userId}'` });
        expect(res.status).toBe(200);
        return res.json.list[0];
    }

    test('10a. the key manager sees every key (no hash), revokes it, but cannot issue for others', async ({ api }) => {
        const rec = await createKey(api, `${tag}-a`);
        const seen = await getKey(admin, rec.keyId);
        expect(seen, 'admin (no apikey-own rule) cannot see operator\'s key').toBeTruthy();
        expect(seen!.secretHash ?? '', 'apikey-hash must apply to admin too').toBe('');
        expect((await admin.send('PATCH', KEYS, { keyId: rec.keyId, status: REVOKED })).status).toBe(200);
        await expect.poll(() => keyStatus(rec.key!), { timeout: REPLICATION_TIMEOUT }).toBe(401);
        expect((await admin.send('POST', KEYS, { name: `${tag}-a2`, userId })).status).toBe(400);
        await safeCleanup(`key ${rec.keyId}`, () => deleteKey(api, rec.keyId));
    });

    test('10b. a password change keeps the keys (Decision B)', async () => {
        const o = await owner();
        try {
            const rec = await createKey(o, `${tag}-b`);
            await expect.poll(() => keyStatus(rec.key!), { timeout: REPLICATION_TIMEOUT }).toBe(200);
            // The operator role denies writes on L8User, so the change goes
            // through admin with the current password as proof (the same
            // contract as l8security-change-password.js).
            const res = await admin.send('PATCH', USERS, { userId, password: { hash: password }, newPassword: 'Thrw-Away2!' });
            expect(res.status, `password change: ${res.text}`).toBe(200);
            expect(await keyStatus(rec.key!)).toBe(200);
        } finally {
            await o.dispose();
        }
    });

    test('10c. a password reset keeps the keys (Decision B)', async () => {
        test.fail(true, 'the reset flow needs a captcha and delivers its token only by email, ' +
            'so the suite cannot complete a reset; 10b covers the password-change half of Decision B');
        const resetToken: string | null = null;
        expect(resetToken, 'no way to obtain a reset token from the suite').not.toBeNull();
    });

    test('10d. a suspended or locked-out owner stops the key (Decision K)', async () => {
        const o = await owner();
        const rec = await createKey(o, `${tag}-d`);
        await o.dispose();
        await expect.poll(() => keyStatus(rec.key!), { timeout: REPLICATION_TIMEOUT }).toBe(200);

        expect((await admin.send('PATCH', USERS, { userId, accountStatus: 4 })).status).toBe(200);
        await expect.poll(() => keyStatus(rec.key!), { timeout: REPLICATION_TIMEOUT }).toBe(401);
        expect((await admin.send('PATCH', USERS, { userId, accountStatus: 1 })).status).toBe(200);
        await expect.poll(() => keyStatus(rec.key!), { timeout: REPLICATION_TIMEOUT }).toBe(200);

        const hourAhead = Math.floor(Date.now() / 1000) + 3600;
        expect((await admin.send('PATCH', USERS, { userId, lockoutUntil: hourAhead })).status).toBe(200);
        await expect.poll(() => keyStatus(rec.key!), { timeout: REPLICATION_TIMEOUT }).toBe(401);
        // PATCH ignores a zero value, so clearing the lockout is a PUT of the record.
        const user = await getUser();
        expect((await admin.send('PUT', USERS, { ...user, lockoutUntil: 0 })).status).toBe(200);
        await expect.poll(() => keyStatus(rec.key!), { timeout: REPLICATION_TIMEOUT }).toBe(200);
    });

    // A user delete is an L8Query delete with no per-record callback (the delete
    // contract), so the key records stay; a key manager deletes them (plan R1).
    test('10e. deleting the owner stops the keys', async () => {
        const o = await owner();
        const rec = await createKey(o, `${tag}-e`);
        await o.dispose();
        await expect.poll(() => keyStatus(rec.key!), { timeout: REPLICATION_TIMEOUT }).toBe(200);

        const del = await admin.send('DELETE', USERS, { text: `select * from L8User where userId='${userId}'` });
        expect(del.status, `delete user: ${del.text}`).toBe(200);
        await expect.poll(() => keyStatus(rec.key!), { timeout: REPLICATION_TIMEOUT }).toBe(401);

        const cleanup = await admin.send('DELETE', KEYS, keyQuery(rec.keyId));
        expect(cleanup.status, `delete the leftover key: ${cleanup.text}`).toBe(200);
    });

    test('10f. a role change follows the owner (Decision A)', async () => {
        const o = await owner();
        const rec = await createKey(o, `${tag}-f`);
        await o.dispose();
        await expect.poll(() => keyStatus(rec.key!), { timeout: REPLICATION_TIMEOUT }).toBe(200);
        const canPost = async () => {
            const k = await Api.fromBearer(rec.key!);
            try {
                return ((await k.permissions()).L8ApiKey || []).includes(1);
            } finally {
                await k.dispose();
            }
        };
        expect(await canPost()).toBe(true);

        const user = await getUser();
        expect((await admin.send('PUT', USERS, { ...user, roles: { viewer: true } })).status).toBe(200);
        await expect.poll(canPost, { timeout: REPLICATION_TIMEOUT, message: 'the key kept the old role' }).toBe(false);
        expect((await admin.send('PUT', USERS, { ...user, roles: { operator: true } })).status).toBe(200);
        await expect.poll(canPost, { timeout: REPLICATION_TIMEOUT, message: 'the key did not get the role back' }).toBe(true);
    });

    test('10g. the per-user active-key cap (Decision L)', async () => {
        const o = await owner();
        try {
            const made: ApiKey[] = [];
            for (let i = 0; i < 10; i++) made.push(await createKey(o, `${tag}-g${i}`));
            const over = await o.send('POST', KEYS, { name: `${tag}-g10` });
            expect(over.status, 'the 11th active key was accepted').toBe(400);
            expect((await o.send('PATCH', KEYS, { keyId: made[0].keyId, status: REVOKED })).status).toBe(200);
            await createKey(o, `${tag}-g11`);
        } finally {
            await o.dispose();
        }
    });
});

test.describe('API keys: desktop UI', () => {
    let tag: string;
    test.beforeEach(() => { tag = `${runTag()}-ukey`; });
    test.afterEach(async ({ api }) => {
        await safeCleanup(`API keys ${tag}*`, () => deleteKeysNamed(api, tag));
    });

    async function openApiKeys(app: import('@playwright/test').Page): Promise<DesktopTable> {
        const nav = new DesktopNav(app);
        await nav.openSection('system');
        await nav.openModule('security');
        await nav.openService('security', 'apikeys');
        const table = new DesktopTable(app, 'security', 'apikeys');
        await table.waitForResolved();
        return table;
    }

    /** Creates a key through the UI and returns the key shown once. */
    async function createInUi(app: import('@playwright/test').Page, table: DesktopTable, name: string): Promise<string> {
        const popup = new Popup(app);
        await table.addButton().click();
        await popup.waitForOpen();
        await popup.fill('name', name);
        await popup.select('l8sys-apikey-lifetime', '30');
        await popup.saveButton().click();
        const box = app.locator('.probler-popup-overlay').last().locator('.l8sys-apikey-box');
        await expect(box, 'the show-once key popup did not open').toBeVisible({ timeout: 15000 });
        const key = (await box.innerText()).trim();
        expect(key).toMatch(KEY_RE);
        return key;
    }

    async function keyIdByName(api: Api, name: string): Promise<string> {
        let id = '';
        await expect.poll(async () => {
            const res = await api.send('GET', KEYS, OWN_KEYS);
            id = ((res.json?.list || []) as ApiKey[]).find((k) => k.name === name)?.keyId || '';
            return id;
        }, { timeout: REPLICATION_TIMEOUT }).not.toBe('');
        return id;
    }

    test('11-12. create shows the key once, Copy works, the key works, edit never shows it', async ({ app, api, consoleErrors }) => {
        await app.context().grantPermissions(['clipboard-read', 'clipboard-write']);
        const table = await openApiKeys(app);
        const name = `${tag}-11`;
        const key = await createInUi(app, table, name);

        const top = app.locator('.probler-popup-overlay').last();
        await top.locator('[data-action="copy-key"]').click();
        await expect.poll(() => app.evaluate(() => navigator.clipboard.readText())).toBe(key);
        await top.locator('[data-action="close-key"]').click();
        await new Popup(app).waitForClosed();

        await table.filterBy('name', name);
        const keyId = await keyIdByName(api, name);
        await expect(table.rowById(keyId)).toContainText('Active', { timeout: 15000 });
        await expect.poll(() => keyStatus(key), { timeout: REPLICATION_TIMEOUT }).toBe(200);

        // 12: the edit popup carries neither the key nor the hash.
        await table.editButton(keyId).click();
        const popup = new Popup(app);
        await popup.waitForOpen();
        const html = await popup.body().innerHTML();
        expect(html).not.toContain('l8k_');
        expect(html.toLowerCase()).not.toContain('secrethash');
        await popup.close();
        assertNoPageErrors(consoleErrors);
    });

    test('13. revoke through the UI', async ({ app, api, consoleErrors }) => {
        const table = await openApiKeys(app);
        const name = `${tag}-13`;
        const key = await createInUi(app, table, name);
        await app.locator('.probler-popup-overlay').last().locator('[data-action="close-key"]').click();
        await new Popup(app).waitForClosed();
        await table.filterBy('name', name);
        const keyId = await keyIdByName(api, name);

        await table.editButton(keyId).click();
        const popup = new Popup(app);
        await popup.waitForOpen();
        await popup.body().locator('[data-action="revoke-key"]').click();
        await expect(popup.title()).toHaveText('Revoke API Key');
        await popup.saveButton().click();
        await popup.waitForClosed();

        await expect(table.rowById(keyId)).toContainText('Revoked', { timeout: 15000 });
        await expect.poll(() => keyStatus(key), { timeout: REPLICATION_TIMEOUT }).toBe(401);
        await table.editButton(keyId).click();
        await popup.waitForOpen();
        await expect(popup.body().locator('[data-action="revoke-key"]')).toHaveCount(0);
        await popup.close();
        assertNoPageErrors(consoleErrors);
    });

    test('14. delete through the UI', async ({ app, api, consoleErrors }) => {
        const table = await openApiKeys(app);
        const name = `${tag}-14`;
        await createInUi(app, table, name);
        await app.locator('.probler-popup-overlay').last().locator('[data-action="close-key"]').click();
        await new Popup(app).waitForClosed();
        await table.filterBy('name', name);
        const keyId = await keyIdByName(api, name);

        await table.deleteButton(keyId).click();
        const popup = new Popup(app);
        await popup.waitForOpen();
        await popup.saveButton().click();
        await popup.waitForClosed();
        await expect(table.rowById(keyId)).toHaveCount(0, { timeout: 15000 });
        assertNoPageErrors(consoleErrors);
    });

    test('15. the show-once popup is readable in dark mode', async ({ freshApp: app, consoleErrors }) => {
        await app.evaluate(() => {
            (window as unknown as { Layer8DThemeSwitcher: { setTheme(n: string): void } })
                .Layer8DThemeSwitcher.setTheme('dark');
        });
        const table = await openApiKeys(app);
        await createInUi(app, table, `${tag}-15`);
        const top = app.locator('.probler-popup-overlay').last();
        const box = top.locator('.l8sys-apikey-box');
        const colors = await box.evaluate((el) => {
            const s = getComputedStyle(el);
            return { color: s.color, background: s.backgroundColor };
        });
        expect(colors.color).not.toBe(colors.background);
        expect(colors.background, 'the key box kept a light background in dark mode').not.toBe('rgb(255, 255, 255)');
        await expect(top.locator('.l8sys-apikey-warning')).toBeVisible();
        await top.locator('[data-action="close-key"]').click();
        assertNoPageErrors(consoleErrors);
    });

    test('16. the shared status renderer shows Expired', async ({ app }) => {
        const out = await app.evaluate(() => {
            const now = Math.floor(Date.now() / 1000);
            const r = (window as unknown as {
                L8Security: { render: { apiKeyStatus(v: number, item: unknown): string } }
            }).L8Security.render;
            return {
                expired: r.apiKeyStatus(1, { status: 1, expiresAt: now - 60 }),
                active: r.apiKeyStatus(1, { status: 1, expiresAt: now + 600 })
            };
        });
        expect(out.expired).toContain('Expired');
        expect(out.active).toContain('Active');
    });
});
