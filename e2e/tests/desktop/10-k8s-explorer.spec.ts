/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// The Kubernetes Explorer portal (k8s-explorer.html, a second portal on the
// same web server): context bar, rail navigation over every resource, the
// resource tables and their detail popups.

import { test, expect, assertNoPageErrors, waitForQuiet } from '../../fixtures/test';
import { Page, BrowserContext } from '@playwright/test';
import { ENV } from '../../fixtures/env';
import { DesktopTable } from '../../pages/DesktopTable';
import { exerciseAllTabs, Popup } from '../../pages/Popup';
import { phantomModels } from '../../fixtures/api';
import { DESKTOP_SECTIONS } from '../../fixtures/inventory';

// Explorer rail items are keyed like the Kubernetes section's services.
const K8S_SERVICES = DESKTOP_SECTIONS.find((s) => s.section === 'kubernetes')!.modules.flatMap((m) => m.services);
const MODEL_OF = new Map(K8S_SERVICES.map((s) => [s.key, s.model]));

async function bootExplorer(page: Page, context: BrowserContext, token: string) {
    await context.addInitScript(([t, u]) => {
        sessionStorage.setItem('bearerToken', t as string);
        sessionStorage.setItem('username', u as string);
    }, [token, ENV.user]);
    await page.goto('/k8s-explorer.html');
    await expect(page.locator('#k8s-explorer-rail .layer8d-explorer-item').first()).toBeAttached({ timeout: 30000 });
    await waitForQuiet(page);
}

test.describe('k8s explorer portal', () => {
    test('boots with the context bar and rail @smoke', async ({ page, context, api }) => {
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(e.message));
        page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
        await bootExplorer(page, context, api.token);
        await expect(page.locator('#layer8d-context-bar-select-cluster')).toBeVisible();
        await expect(page.locator('#layer8d-context-bar-select-namespace')).toBeVisible();
        await expect(page.locator('#k8s-explorer-username')).toContainText(ENV.user);
        expect(await page.locator('#k8s-explorer-rail .layer8d-explorer-group').count()).toBeGreaterThan(1);
        expect(errors, errors.join('\n')).toEqual([]);
    });

    test('every rail item opens its resource table, and rows open popups', async ({ page, context, api }) => {
        test.setTimeout(600_000);
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(e.message));
        page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
        await bootExplorer(page, context, api.token);

        const items = page.locator('#k8s-explorer-rail .layer8d-explorer-item');
        const keys = await items.evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.item!));
        expect(keys.length, 'the rail lists no resources').toBeGreaterThan(10);

        // Keyless placeholder records (upstream l8parser bug) are tracked by
        // 09-kubernetes; their rows cannot be identified, so skip those items.
        const phantoms = await phantomModels(api, K8S_SERVICES);
        const problems: string[] = [];
        let withRows = 0;
        for (const key of keys) {
            if (phantoms.has(MODEL_OF.get(key) || '')) continue;
            const item = page.locator(`#k8s-explorer-rail .layer8d-explorer-item[data-item="${key}"]`);
            // Groups may be collapsed: expand the owning group first.
            if (!(await item.isVisible())) {
                const group = await item.getAttribute('data-group');
                await page.locator(`#k8s-explorer-rail .layer8d-explorer-group-header[data-group="${group}"]`).click();
            }
            await item.locator('.layer8d-explorer-item-label').click();
            const table = new DesktopTable(page, `#k8s-explorer-table-${key}`);
            let state: 'rows' | 'empty';
            try {
                state = await table.waitForResolved();
            } catch (e) {
                problems.push(`${key}: ${(e as Error).message.split('\n')[0]}`);
                continue;
            }
            if (state === 'empty') continue;
            withRows++;
            await table.rows().first().locator('td').first().click();
            const popup = new Popup(page);
            await popup.waitForOpen();
            await exerciseAllTabs(page);
            await popup.close();
        }
        expect(problems, problems.join('\n')).toEqual([]);
        expect(withRows, 'no explorer resource had any rows -- the KIND cluster is not being observed')
            .toBeGreaterThan(0);
        expect(errors, errors.join('\n')).toEqual([]);
    });

    test('the namespace selector scopes the resource table', async ({ page, context, api }) => {
        await bootExplorer(page, context, api.token);
        // A resource table must be open for the namespace scope to re-query.
        await page.locator('#k8s-explorer-rail .layer8d-explorer-item[data-item="pods"] .layer8d-explorer-item-label').click();
        await new DesktopTable(page, '#k8s-explorer-table-pods').waitForResolved();
        const ns = page.locator('#layer8d-context-bar-select-namespace');
        const options = await ns.locator('option').evaluateAll((o) => o.map((x) => (x as HTMLOptionElement).value));
        const kubeSystem = options.find((v) => v === 'kube-system');
        expect(kubeSystem, `namespaces offered: ${options.join(', ')}`).toBeTruthy();
        const req = page.waitForRequest((r) => decodeURIComponent(r.url()).includes('kube-system'));
        await ns.selectOption('kube-system');
        await req;
    });
});

test.describe('k8s explorer from the app', () => {
    test('the portal switcher lists the explorer', async ({ app, consoleErrors }) => {
        const btn = app.locator('#l8-portal-switcher-btn, .l8-portal-switcher-btn').first();
        await expect(btn).toBeVisible();
        await btn.click();
        await expect(app.getByText('Kubernetes Explorer').first()).toBeVisible();
        await app.keyboard.press('Escape');
        assertNoPageErrors(consoleErrors);
    });
});
