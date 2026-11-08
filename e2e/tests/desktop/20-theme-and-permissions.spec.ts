/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// Permission filtering and theming.
//
// The permission half matters because FailFastNoSilentFallback Rule 2 calls a
// degraded permission load a SECURITY bug, not a resilience feature: if
// /permissions fails and Layer8DPermissions stays unset, l8ui reads that as
// permissive and shows a restricted user more Add/Edit/Delete buttons than
// they are entitled to -- indistinguishable from legitimate full access.
//
// The theme half is L8UIThemeCompliance: components must resolve their colours
// from --layer8d-* tokens, and dark mode is central rather than per-component.

import { test, expect, assertNoPageErrors, waitForDesktopReady } from '../../fixtures/test';
import { DesktopNav } from '../../pages/DesktopNav';
import { Api } from '../../fixtures/api';
import { ENV } from '../../fixtures/env';
import { desktopServices, NO_BACKEND_MODELS } from '../../fixtures/inventory';
import { DesktopTable } from '../../pages/DesktopTable';
import type { Page, BrowserContext } from '@playwright/test';

/** Boots the desktop shell on `page` as `user`, the way the real login does. */
async function bootShellAs(page: Page, context: BrowserContext, user: string, token: string) {
    await context.addInitScript(
        ([t, u]) => {
            try {
                sessionStorage.setItem('bearerToken', t as string);
                sessionStorage.setItem('username', u as string);
            } catch { /* ignore */ }
        },
        [token, user]
    );
    await page.goto(ENV.desktopShell);
    await waitForDesktopReady(page);
}

test.describe('permissions', () => {
    test('the shell loaded a non-empty permission map @smoke', async ({ app }) => {
        const perms = await app.evaluate(() => {
            const w = window as unknown as { Layer8DPermissions?: Record<string, number[]> };
            return w.Layer8DPermissions || null;
        });
        expect(perms, 'Layer8DPermissions was never set -- /permissions failed silently').not.toBeNull();
        expect(Object.keys(perms as object).length).toBeGreaterThan(0);
    });

    test('every model the UI navigates to appears in the permission map', async ({ app }) => {
        const perms = (await app.evaluate(() => {
            const w = window as unknown as { Layer8DPermissions?: Record<string, number[]> };
            return w.Layer8DPermissions || {};
        })) as Record<string, number[]>;

        // Layer8DPermissionFilter.canView returns false for any model absent
        // from a non-empty map, which hides the service from the sub-nav.
        const models = [...new Set(desktopServices().map((x) => x.service.model))]
            .filter((m): m is string => !!m && !NO_BACKEND_MODELS.includes(m));
        const absent = models.filter((m) => !(m in perms));
        expect(
            absent,
            `models the UI can navigate to but /permissions never mentions -- these are ` +
            `hidden from the operator by canView():\n  ${absent.join('\n  ')}`
        ).toEqual([]);
    });

    test('a restricted account sees fewer sections than the operator', async ({ page, context }) => {
        let limited: Api;
        try {
            limited = await Api.login(ENV.limitedUser, ENV.limitedPass);
        } catch (e) {
            test.skip(true, `limited account unavailable: ${(e as Error).message}`);
            return;
        }

        await bootShellAs(page, context, ENV.limitedUser, limited.token);

        const nav = new DesktopNav(page);
        // The permission filter runs as part of that boot sequence, so the
        // readiness gate above already covers it.

        const perms = await limited.permissions();
        const visible = await nav.visibleSections();

        // The hr-clerk role is scoped to HCM, so a section whose EVERY model is
        // absent from its permission map must not be offered.
        //
        // "every", not "any": the original version flagged a section as soon as
        // one of its services was unpermitted, which contradicted its own
        // message and made `hcm` a permanent false positive -- that section has
        // ~58 services and this role legitimately reaches 16 of them. A section
        // the user can partly use belongs in the sidebar; hiding the individual
        // services inside it is the service-level filter's job, asserted
        // separately.
        const modelsBySection = new Map<string, string[]>();
        for (const x of desktopServices()) {
            if (!visible.includes(x.section)) continue;
            if (!modelsBySection.has(x.section)) modelsBySection.set(x.section, []);
            if (x.service.model && !NO_BACKEND_MODELS.includes(x.service.model)) {
                modelsBySection.get(x.section)!.push(x.service.model);
            }
        }
        const sections = [...modelsBySection.entries()]
            .filter(([, models]) => models.length > 0 && !models.some((m) => m in perms))
            .map(([section]) => section);
        expect(
            sections,
            `sections offered to "${ENV.limitedUser}" containing only models it has no ` +
            `permission for: ${sections.join(', ')}`
        ).toEqual([]);

        await limited.dispose();
    });

    // The view-only account against the operator, on the same service: the
    // operator's Add button proves the locator and the screen are right, so the
    // view-only assertion cannot pass just because nothing rendered.
    test('write buttons are hidden for a model the user cannot POST', async ({ app, page, context }) => {
        const operatorPerms = (await app.evaluate(() => {
            const w = window as unknown as { Layer8DPermissions?: Record<string, number[]> };
            return w.Layer8DPermissions || {};
        })) as Record<string, number[]>;
        const readOnly = await Api.login(ENV.readOnlyUser, ENV.readOnlyPass);
        const readOnlyPerms = await readOnly.permissions();

        const POST = 1;
        const target = desktopServices().filter((x) => !x.service.customView && !x.service.readOnly).find((x) => {
            const ro = readOnlyPerms[x.service.model];
            const op = operatorPerms[x.service.model];
            return ro && !ro.includes(POST) && op && op.includes(POST);
        });
        expect(
            target,
            `"${ENV.readOnlyUser}" has no navigable model it can view but not POST -- ` +
            `this test needs one (check its role in probler.json)`
        ).toBeTruthy();
        const { section, moduleKey, service } = target!;

        const opNav = new DesktopNav(app);
        await opNav.openSection(section);
        await opNav.openModule(moduleKey);
        await opNav.openService(moduleKey, service.key);
        const opTable = new DesktopTable(app, moduleKey, service.key);
        await opTable.waitForResolved();
        await expect(opTable.addButton(), `the operator gets no Add button on ${service.model}`)
            .not.toHaveCount(0);

        await bootShellAs(page, context, ENV.readOnlyUser, readOnly.token);
        const roNav = new DesktopNav(page);
        await roNav.openSection(section);
        await roNav.openModule(moduleKey);
        await roNav.openService(moduleKey, service.key);
        const roTable = new DesktopTable(page, moduleKey, service.key);
        await roTable.waitForResolved();
        await expect(
            roTable.addButton(),
            `${service.model} offers "${ENV.readOnlyUser}" an Add button although /permissions withholds POST`
        ).toHaveCount(0);

        await readOnly.dispose();
    });
});

test.describe('theme', () => {
    test('the theme tokens resolve @smoke', async ({ app }) => {
        const unresolved = await app.evaluate(() => {
            const names = [
                '--layer8d-primary', '--layer8d-bg-white', '--layer8d-bg-light',
                '--layer8d-bg-input', '--layer8d-text-dark', '--layer8d-text-medium',
                '--layer8d-border', '--layer8d-success', '--layer8d-warning', '--layer8d-error'
            ];
            const cs = getComputedStyle(document.documentElement);
            return names.filter((n) => !cs.getPropertyValue(n).trim());
        });
        expect(
            unresolved,
            `--layer8d-* tokens that resolve to nothing: ${unresolved.join(', ')}`
        ).toEqual([]);
    });

    // A fresh page: the theme is persisted for the whole browser context, so
    // flipping it on the worker's shared page would repaint every later test.
    test('switching to dark mode repaints the shell', async ({ freshApp, consoleErrors }) => {
        const app = freshApp;
        // The shell's theme control is Layer8DThemeSwitcher's picker: a button
        // that opens a menu of themes (app.html, .layer8d-theme-picker).
        const picker = app.locator('.layer8d-theme-picker').first();
        await expect(picker, 'the shell has no theme picker').toBeVisible();

        // Start from light so the switch to dark is a real change; the saved
        // or OS-preferred theme could already be dark.
        await app.evaluate(() => {
            (window as unknown as { Layer8DThemeSwitcher: { setTheme(n: string): void } })
                .Layer8DThemeSwitcher.setTheme('light');
        });
        const before = await app.evaluate(() => getComputedStyle(document.body).backgroundColor);
        await picker.locator('.layer8d-theme-btn').click();
        await picker.locator('.layer8d-theme-option[data-theme-name="dark"]').click();

        // Wait for the repaint itself rather than a guessed duration.
        await expect
            .poll(() => app.evaluate((bg) =>
                document.documentElement.getAttribute('data-theme') === 'dark' ||
                getComputedStyle(document.body).backgroundColor !== bg, before), { timeout: 5000 })
            .toBe(true)
            .catch(() => undefined);   // asserted, with a useful message, below

        const attr = await app.evaluate(() => document.documentElement.getAttribute('data-theme'));
        const after = await app.evaluate(() => getComputedStyle(document.body).backgroundColor);

        expect(
            attr === 'dark' || after !== before,
            'the theme toggle changed neither data-theme nor the rendered background'
        ).toBeTruthy();
        assertNoPageErrors(consoleErrors);
    });
});
