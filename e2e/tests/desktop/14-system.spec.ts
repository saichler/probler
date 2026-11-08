/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// The built-in SYS module: Health, Modules, Logs, Data Import, Security.
//
// AppHtmlBodyFromL8erp lists the container ids these modules render into and
// warns that a mismatched id produces a silently empty tab -- the same class of
// failure as a missing script tag, and just as invisible without a test.
// The ids below are read from sections/system.html.

import { test, expect, assertNoPageErrors } from '../../fixtures/test';
import { DesktopNav } from '../../pages/DesktopNav';
import { Popup } from '../../pages/Popup';
import { DesktopTable } from '../../pages/DesktopTable';
import { KNOWN_BROKEN_CRUD } from '../../fixtures/inventory';

const SYS_MODULES: { moduleKey: string; containerId: string; label: string }[] = [
    { moduleKey: 'health',     containerId: 'health-table-container',     label: 'Health' },
    { moduleKey: 'modules',    containerId: 'modules-settings-container', label: 'Modules' },
    { moduleKey: 'logs',       containerId: 'logs-table-container',       label: 'Logs' },
    { moduleKey: 'dataimport', containerId: 'dataimport-container',       label: 'Data Import' }
];

const SECURITY_SERVICES = ['users', 'roles', 'credentials', 'events'];

test.describe('system section', () => {
    test.beforeEach(async ({ app }) => {
        await new DesktopNav(app).openSection('system');
    });

    test('every SYS container id in the section HTML exists @smoke', async ({ app }) => {
        const missing: string[] = [];
        for (const m of SYS_MODULES) {
            if (!(await app.locator(`#${m.containerId}`).count())) missing.push(m.containerId);
        }
        for (const s of SECURITY_SERVICES) {
            const id = `security-${s}-table-container`;
            if (!(await app.locator(`#${id}`).count())) missing.push(id);
        }
        expect(
            missing,
            `SYS containers absent from the rendered section -- a mismatched id here ` +
            `produces a silently empty tab:\n  ${missing.join('\n  ')}`
        ).toEqual([]);
    });

    for (const m of SYS_MODULES) {
        test(`${m.label} renders content`, async ({ app, consoleErrors }) => {
            const nav = new DesktopNav(app);
            await nav.openModule(m.moduleKey);

            const container = app.locator(`#${m.containerId}`);
            await expect(container).toBeVisible({ timeout: 20000 });

            await expect
                .poll(async () => (await container.innerHTML()).trim().length, {
                    timeout: 25000,
                    message: `${m.label} container stayed empty -- its module never rendered`
                })
                .toBeGreaterThan(0);

            assertNoPageErrors(consoleErrors);
        });
    }

    test('Health lists running services and agrees with the API', async ({ app, api }) => {
        const nav = new DesktopNav(app);
        await nav.openModule('health');

        const container = app.locator('#health-table-container');
        await expect(container.locator('.l8-table tbody tr, .l8-empty-state')).not.toHaveCount(0, {
            timeout: 25000
        });

        const fromApi = await api.health();
        if (fromApi.list.length > 0) {
            await expect(
                container.locator('.l8-table tbody tr'),
                'the API reports healthy services but the Health tab shows none'
            ).not.toHaveCount(0);
        }
    });

    for (const svc of SECURITY_SERVICES) {
        test(`Security / ${svc} renders`, async ({ app, consoleErrors }) => {
            const nav = new DesktopNav(app);
            await nav.openModule('security');

            const item = app.locator(`.l8-subnav-item[data-service="${svc}"]`);
            if (await item.count()) await item.click();

            const container = app.locator(`#security-${svc}-table-container`);
            await expect
                .poll(async () => (await container.innerHTML()).trim().length, {
                    timeout: 25000,
                    message: `Security/${svc} container stayed empty`
                })
                .toBeGreaterThan(0);

            assertNoPageErrors(consoleErrors);
        });
    }

    test('Modules toggle tree renders the module hierarchy', async ({ app }) => {
        const nav = new DesktopNav(app);
        await nav.openModule('modules');
        const container = app.locator('#modules-settings-container');
        await expect(
            container.locator(// Layer8DToggleTree emits l8-toggle-* class names; none of
            // .layer8d-toggle-tree / .toggle-tree / .tree-node exist anywhere in
            // l8ui, so the original list could only ever fail.
            '.l8-toggle-node, .l8-toggle-row').first(),
            'the Modules tab rendered no tree'
        ).toBeVisible({ timeout: 25000 });
    });

    test('Security / portals: Add opens a form', async ({ freshApp: app }) => {
        // KNOWN UPSTREAM BUG (see KNOWN_BROKEN_CRUD): l8ui l8sys-init.js calls
        // origOpenAdd.call(SYS, ...) and SYS is undefined. The uncaught error
        // makes app.js end the session, so this runs on its own page (freshApp),
        // never the worker's shared one.
        test.fail(true, KNOWN_BROKEN_CRUD.L8Portal);
        const nav = new DesktopNav(app);
        await nav.openSection('system');
        await nav.openModule('security');
        await nav.openService('security', 'portals');
        const table = new DesktopTable(app, 'security', 'portals');
        await table.waitForResolved();
        await table.addButton().click();
        await new Popup(app).waitForOpen(5000);
    });
});
