/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// The public landing page (served at /) and its dynamically loaded modals
// (modals/*-modal.html via js/landing.js): Demo, Developer, About.

import { test, expect, waitForQuiet } from '../../fixtures/test';
import { Page } from '@playwright/test';

function capture(page: Page) {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`${e.name}: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('response', (r) => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
    return errors;
}

test.describe('landing page', () => {
    test('loads with no errors @smoke', async ({ page }) => {
        const errors = capture(page);
        await page.goto('/');
        await expect(page.locator('header')).toBeVisible();
        await waitForQuiet(page);
        // Google Fonts are external and may be unreachable from CI.
        expect(errors.filter((e) => !e.includes('fonts.g')), errors.join('\n')).toEqual([]);
    });

    for (const m of [
        { name: 'demo', open: 'showDemoCredentials', id: '#demoModal', close: 'closeDemoModal' },
        { name: 'developer', open: 'openDeveloperModal', id: '#developerModal', close: 'closeDeveloperModal' },
        { name: 'about', open: 'openAboutModal', id: '#aboutModal', close: 'closeAboutModal' }
    ]) {
        test(`the ${m.name} modal opens, renders and closes`, async ({ page }) => {
            const errors = capture(page);
            await page.goto('/');
            await page.waitForFunction((fn) => typeof (window as unknown as Record<string, unknown>)[fn] === 'function', m.open);

            const trigger = page.locator(`a[onclick^="${m.open}"]`).first();
            if (await trigger.count()) {
                await trigger.click();
            } else {
                await page.evaluate((fn) => (window as unknown as Record<string, () => void>)[fn](), m.open);
            }
            const modal = page.locator(m.id);
            await expect(modal, `${m.name} modal never became visible`).toBeVisible();
            await expect.poll(async () => (await modal.innerText()).trim().length).toBeGreaterThan(10);

            await page.evaluate((fn) => (window as unknown as Record<string, () => void>)[fn](), m.close);
            await expect(modal).toBeHidden();
            expect(errors.filter((e) => !e.includes('fonts.g')), errors.join('\n')).toEqual([]);
        });
    }

    test('the demo modal leads to the login page', async ({ page, context }) => {
        await page.goto('/');
        await page.locator('a[onclick^="showDemoCredentials"]').first().click();
        await expect(page.locator('#demoModal')).toBeVisible();
        const popupPromise = context.waitForEvent('page');
        await page.evaluate(() => (window as unknown as { proceedToDemo(): void }).proceedToDemo());
        const login = await popupPromise;
        await login.waitForLoadState('domcontentloaded');
        // The web server serves the directory index at /l8ui/login/.
        expect(login.url()).toMatch(/\/l8ui\/login\/(index\.html)?$/);
        await login.close();
    });

    test('login.html redirects to the l8ui login page', async ({ page }) => {
        await page.goto('/login.html');
        await page.waitForURL(/\/l8ui\/login\/(index\.html)?$/, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('input[type="password"]').first()).toBeVisible();
    });
});
