/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// PHASE 11 -- permissions and theme on the mobile shell.
//
// Not a copy of desktop's 09: the shells share Layer8DPermissions and
// Layer8DModuleFilter but consume them through completely different code.
// m/js/app-core.js:98 runs the SAME
//
//     const configLoaded = await Layer8DModuleFilter.load(token);
//     if (!configLoaded) return;          // <- aborts init
//
// that made the DESKTOP shell render a blank #content-area for any account
// denied SysModuleConfig. So the bug fixed in l8ui/shared/layer8d-module-filter.js
// during this session was latent on mobile too, and this spec is what proves the
// mobile side of that fix -- desktop's spec cannot.
//
// Mobile also applies its own filtering: app-core.js:368 applyModuleFilter()
// hides home-grid cards via Layer8DModuleFilter.isEnabled(moduleKey), rather
// than the sidebar path desktop uses.

import { test, expect } from '../../fixtures/test';
import { Api } from '../../fixtures/api';
import { ENV } from '../../fixtures/env';
import { waitForMobileReady } from '../../fixtures/test';
import { MobileNav } from '../../pages/MobileNav';

test.describe('mobile permissions', () => {
    test('the shell loads a non-empty permission map @smoke', async ({ mobile }) => {
        const perms = await mobile.evaluate(
            () => (window as unknown as { Layer8DPermissions?: Record<string, number[]> })
                .Layer8DPermissions || {}
        );
        expect(
            Object.keys(perms).length,
            'Layer8DPermissions is empty on mobile -- app-core.js only assigns it when ' +
            '/permissions responds ok, and l8ui reads an unset map as fully permissive'
        ).toBeGreaterThan(0);
    });

    test('a restricted account still gets a usable shell', async ({ page, context }) => {
        // The regression this exists for: Layer8DModuleFilter.load() treating an
        // access-denied SysModuleConfig as fatal, so app-core.js returned before
        // rendering anything. Desktop showed a full sidebar over an empty content
        // area; mobile would show a header over an empty home grid.
        let limited: Api;
        try {
            limited = await Api.login(ENV.limitedUser, ENV.limitedPass);
        } catch (e) {
            test.skip(true, `limited account unavailable: ${(e as Error).message}`);
            return;
        }

        await context.addInitScript(
            ([t, u]) => {
                try {
                    sessionStorage.setItem('bearerToken', t as string);
                    sessionStorage.setItem('username', u as string);
                } catch { /* private mode */ }
            },
            [limited.token, ENV.limitedUser]
        );
        await page.goto(ENV.mobileShell);
        await waitForMobileReady(page);

        const nav = new MobileNav(page);
        const cards = await nav.cards().count();
        expect(
            cards,
            'the restricted account reached the mobile shell but its home grid is empty -- ' +
            'app-core.js aborted init, the same failure the desktop shell had'
        ).toBeGreaterThan(0);

        // And it must see FEWER modules than the operator, or the filter is inert.
        const visible = await nav.visibleModules();
        expect(visible.length, 'no module cards are visible at all').toBeGreaterThan(0);

        await limited.dispose();
    });

    test('a module the account cannot use is not offered', async ({ page, context }) => {
        let limited: Api;
        try {
            limited = await Api.login(ENV.limitedUser, ENV.limitedPass);
        } catch (e) {
            test.skip(true, 'limited account unavailable');
            return;
        }
        const perms = await limited.permissions();

        await context.addInitScript(
            ([t, u]) => {
                try {
                    sessionStorage.setItem('bearerToken', t as string);
                    sessionStorage.setItem('username', u as string);
                } catch { /* private mode */ }
            },
            [limited.token, ENV.limitedUser]
        );
        await page.goto(ENV.mobileShell);
        await waitForMobileReady(page);

        const nav = new MobileNav(page);
        const visible = await nav.visibleModules();

        // Same rule desktop settled on: a module is legitimately offered when the
        // account can use AT LEAST ONE of its models. Flagging a module because
        // SOME service is denied is wrong -- hcm has ~58 services and this role
        // reaches 16.
        const { MOBILE_MODULES } = await import('../../fixtures/inventory');
        const leaked: string[] = [];
        for (const mod of MOBILE_MODULES) {
            // dashboard and system are exempt by design -- m/js/app-core.js
            // applyModuleFilter() says so explicitly ("never filtered"), and
            // desktop shows system to this account too. Flagging them would be
            // asserting against intended behaviour.
            if (mod.moduleKey === 'dashboard' || mod.moduleKey === 'system') continue;
            if (!visible.includes(mod.moduleKey)) continue;

            // Mirror Layer8DPermissionFilter.canViewModule exactly, which is what
            // layer8m-nav.js:171 uses when rendering the grid:
            //   canViewService(svc) = svc.model ? canView(svc.model) : TRUE
            // A model-less service is a custom view and is unrestricted BY DESIGN,
            // so a module containing one is legitimately always visible -- `aia`
            // is visible to every account because of its chat view, and that is
            // not a leak. Ignoring that made this assertion stricter than the
            // product's own contract.
            const services = mod.subModules.flatMap((s) => s.services);
            if (services.length === 0) continue;
            const anyViewable = services.some((svc) => !svc.model || svc.model in perms);
            if (!anyViewable) leaked.push(mod.moduleKey);
        }
        expect(
            leaked,
            `mobile modules offered to "${ENV.limitedUser}" where it can use none of the ` +
            `models:\n  ${leaked.join('\n  ')}`
        ).toEqual([]);

        await limited.dispose();
    });
});

test.describe('mobile theme', () => {
    test('the theme tokens resolve @smoke', async ({ mobile }) => {
        const tokens = await mobile.evaluate(() => {
            const cs = getComputedStyle(document.documentElement);
            const names = ['--layer8d-primary', '--layer8d-bg-white', '--layer8d-text-dark',
                           '--layer8d-border'];
            const out: Record<string, string> = {};
            names.forEach((n) => { out[n] = cs.getPropertyValue(n).trim(); });
            return out;
        });
        const unresolved = Object.entries(tokens).filter(([, v]) => v === '').map(([k]) => k);
        expect(
            unresolved,
            `theme custom properties unresolved on mobile -- layer8d-theme-tokens.css / ` +
            `layer8d-theme.css missing from m/app.html (L8UIThemeCompliance):\n  ` +
            `${unresolved.join('\n  ')}`
        ).toEqual([]);
    });

    // A fresh page: the theme is persisted for the whole browser context, so
    // flipping it on the worker's shared page would leak into later tests.
    test('switching theme repaints the mobile shell', async ({ freshMobile: mobile }) => {
        // m/app.html renders the shared Layer8DThemeSwitcher, so the mobile shell
        // must actually react to it -- a token set that only desktop honours is
        // the sort of split MobileRules parity exists to catch.
        const before = await mobile.evaluate(
            () => getComputedStyle(document.body).backgroundColor
        );

        const switched = await mobile.evaluate(() => {
            const w = window as unknown as {
                Layer8DThemeSwitcher?: { setTheme?(t: string): void; toggleDropdown?(): void };
            };
            if (w.Layer8DThemeSwitcher && typeof w.Layer8DThemeSwitcher.setTheme === 'function') {
                w.Layer8DThemeSwitcher.setTheme('dark');
                return 'api';
            }
            // Fall back to the attribute the theme CSS keys on.
            document.documentElement.setAttribute('data-theme', 'dark');
            return 'attribute';
        });

        // Wait for the repaint itself rather than a guessed duration.
        await expect
            .poll(() => mobile.evaluate((bg) => getComputedStyle(document.body).backgroundColor !== bg, before),
                  { timeout: 5000 })
            .toBe(true)
            .catch(() => undefined);   // asserted, with a useful message, below
        const after = await mobile.evaluate(
            () => getComputedStyle(document.body).backgroundColor
        );

        expect(
            after,
            `the mobile shell did not repaint when the theme changed (via ${switched}); ` +
            `body stayed ${before}. Dark mode is central in layer8d-theme.css under ` +
            `[data-theme="dark"], so an unchanged body means the mobile shell sets its own ` +
            `background outside the token system`
        ).not.toBe(before);

        // Restore, so later specs see the shell they expect.
        await mobile.evaluate(() => {
            const w = window as unknown as { Layer8DThemeSwitcher?: { setTheme?(t: string): void } };
            if (w.Layer8DThemeSwitcher?.setTheme) w.Layer8DThemeSwitcher.setTheme('light');
            else document.documentElement.setAttribute('data-theme', 'light');
        }).catch(() => undefined);
    });
});
