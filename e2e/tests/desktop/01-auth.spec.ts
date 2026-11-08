/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// Authentication: the real login form, the token it stores, and what the
// server grants. SetupConfiguration puts the bearer token in
// sessionStorage.bearerToken; SecurityRules routes all AAA through the
// security provider, so /permissions is the authority on what the UI may show.

import { test, expect } from '../../fixtures/test';
import { Api } from '../../fixtures/api';
import { LoginPage } from '../../pages/LoginPage';
import { ENV } from '../../fixtures/env';

test.describe('authentication @smoke', () => {
    test('valid credentials store a bearer token and reach the app', async ({ page }) => {
        const login = new LoginPage(page);
        await login.goto();
        await login.login(ENV.user, ENV.pass);

        await expect(page).toHaveURL(/app\.html/, { timeout: 25000 });
        const token = await login.storedToken();
        expect(token, 'no bearerToken in sessionStorage after a successful login').toBeTruthy();
        expect((token || '').length).toBeGreaterThan(20);
    });

    test('invalid credentials are rejected and do not store a token', async ({ page }) => {
        const login = new LoginPage(page);
        await login.goto();
        await login.login(ENV.user, 'definitely-not-the-password');

        await expect(login.error()).toBeVisible({ timeout: 20000 });
        await expect(page).not.toHaveURL(/app\.html/);
        expect(await login.storedToken()).toBeFalsy();
    });

    test('the app redirects to login when no token is present', async ({ page }) => {
        await page.addInitScript(() => {
            try { sessionStorage.clear(); } catch { /* ignore */ }
        });
        await page.goto(ENV.desktopShell);
        await expect(page).toHaveURL(/login/i, { timeout: 25000 });
    });

    test('the API rejects a bad password with 401', async () => {
        await expect(Api.login(ENV.user, 'wrong')).rejects.toThrow(/401|auth failed/i);
    });

    test('/permissions returns a per-type action map for the operator', async ({ api }) => {
        const perms = await api.permissions();
        expect(Object.keys(perms).length, '/permissions returned an empty map').toBeGreaterThan(0);

        // The operator role carries a wildcard allow (elemType "*", action -999)
        // in erp.json, so every registered type should come back with GET.
        const withoutGet = Object.entries(perms)
            .filter(([, actions]) => !actions.includes(5))
            .map(([t]) => t);
        expect(withoutGet, `operator lacks GET on: ${withoutGet.join(', ')}`).toEqual([]);
    });

    // A fresh page: logging out ends the session, which must not happen to the
    // worker's shared page that later tests run on.
    test('logging out clears the session', async ({ freshApp: app }) => {
        const logout = app.locator('.logout-btn');
        await expect(logout).toBeVisible();
        await logout.click();
        await expect(app).toHaveURL(/login/i, { timeout: 20000 });
        const token = await app.evaluate(() => {
            try { return sessionStorage.getItem('bearerToken'); } catch { return null; }
        });
        expect(token).toBeFalsy();
    });
});
