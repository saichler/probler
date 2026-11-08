/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// Shell integrity: does the desktop shell load without killing an IIFE?
//
// This is the spec that catches the failure mode this project has actually
// shipped: a script tag missing from app.html, so a global is undefined, so an
// IIFE dies with `ReferenceError: <Global> is not defined`, and every table in
// the app renders empty with nothing in the UI to indicate why. Backend tests
// cannot see it -- the browser never even issues the request.
//
// VerifyAppHtmlScriptsAgainstLoadingOrder and FailFastNoSilentFallback both
// name this exact symptom. These tests are the executable form of those rules.

import { test, expect, assertNoPageErrors, waitForQuiet } from '../../fixtures/test';
import { INVENTORY } from '../../fixtures/inventory';
import { missingGlobals, DESKTOP_REQUIRED_GLOBALS } from '../../fixtures/globals';
import { ENV } from '../../fixtures/env';

test.describe('desktop shell integrity @smoke', () => {
    // A fresh boot, not the worker's shared page: errors raised while booting
    // are exactly what this test exists to catch.
    test('loads with no uncaught exception and no console error', async ({ freshApp, consoleErrors }) => {
        await expect(freshApp.locator('.app-container')).toBeVisible();
        // Deferred init (KPI fetches, module filter, websocket) has settled
        // once the network goes quiet; the shell does no background polling.
        await waitForQuiet(freshApp);
        assertNoPageErrors(consoleErrors);
    });

    test('every <script src> in app.html returns 200', async ({ app }) => {
        const failures = await app.evaluate(async () => {
            const srcs = Array.from(document.querySelectorAll('script[src]'))
                .map((s) => (s as HTMLScriptElement).getAttribute('src') || '');
            const bad: string[] = [];
            for (const src of srcs) {
                const res = await fetch(src, { method: 'HEAD' }).catch(() => null);
                if (!res || !res.ok) bad.push(`${src} -> ${res ? res.status : 'network error'}`);
            }
            return bad;
        });
        expect(failures, `script tags that do not resolve:\n  ${failures.join('\n  ')}`).toEqual([]);
    });

    test('no l8ui global referenced by a loaded script is undefined', async ({ app }) => {
        // Resolved through fixtures/globals.ts, which checks the global lexical
        // scope as well as window -- layer8d-table-core.js declares
        // `class Layer8DTable` at top level, so it is a global binding but not
        // a window property, and a window-only check reports a false missing.
        const missing = await missingGlobals(app, DESKTOP_REQUIRED_GLOBALS);
        expect(
            missing,
            `globals that no loaded script defines -- add the script tag to app.html, ` +
            `never a typeof guard at the call site (FailFastNoSilentFallback Rule 1):\n  ` +
            missing.join('\n  ')
        ).toEqual([]);
    });

    test('every module namespace declared by a config is on window', async ({ app }) => {
        const expected = INVENTORY.desktop.sections
            .map((s) => s.namespace)
            .filter((n): n is string => !!n);

        const missing = await app.evaluate((names: string[]) => {
            const w = window as unknown as Record<string, unknown>;
            return names.filter((n) => !w[n]);
        }, expected);

        expect(missing, `module namespaces missing from window: ${missing.join(', ')}`).toEqual([]);
    });

    test('every section initializer named by a config is a function', async ({ app }) => {
        const missing = await app.evaluate(() => {
            const w = window as unknown as Record<string, unknown>;
            const configs = (w.Layer8SectionConfigs as { getAll(): Record<string, { initFn?: string }> })
                .getAll();
            return Object.entries(configs)
                .map(([key, cfg]) => ({ key, fn: cfg.initFn }))
                .filter((x) => x.fn && typeof w[x.fn] !== 'function')
                .map((x) => `${x.key} -> ${x.fn}`);
        });
        expect(
            missing,
            `section initializers that never got defined (the module factory bailed ` +
            `before assigning them):\n  ${missing.join('\n  ')}`
        ).toEqual([]);
    });

    test('the generated inventory reports no load failure for this shell', () => {
        // tools/generate-inventory.js executes every script the shell declares.
        // A failure here is a file that throws at parse/IIFE time.
        expect(
            INVENTORY.desktop.failures,
            'scripts that threw while loading:\n  ' +
            INVENTORY.desktop.failures.map((f) => `${f.src} -> ${f.error}`).join('\n  ')
        ).toEqual([]);
    });

    test('portal shells load without an uncaught exception', async ({ page, context, api }) => {
        await context.addInitScript(
            ([t, u]) => {
                try {
                    sessionStorage.setItem('bearerToken', t as string);
                    sessionStorage.setItem('username', u as string);
                } catch { /* ignore */ }
            },
            [api.token, ENV.user]
        );

        const broken: string[] = [];
        for (const portal of ENV.portals) {
            const errors: string[] = [];
            const onError = (e: Error) => errors.push(`${e.name}: ${e.message}`);
            page.on('pageerror', onError);
            const res = await page.goto(portal, { waitUntil: 'networkidle' }).catch(() => null);
            page.off('pageerror', onError);

            if (!res || !res.ok()) broken.push(`${portal} -> HTTP ${res ? res.status() : 'no response'}`);
            errors.forEach((e) => broken.push(`${portal} -> ${e}`));
        }
        expect(broken, `portal shells with problems:\n  ${broken.join('\n  ')}`).toEqual([]);
    });
});
