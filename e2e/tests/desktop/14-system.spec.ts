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
import { Api, safeCleanup } from '../../fixtures/api';
import { ENV } from '../../fixtures/env';
import { openUserPage } from '../../pages/Chat';
import { runTag } from '../../fixtures/formdata';
import { DesktopNav } from '../../pages/DesktopNav';
import { Popup } from '../../pages/Popup';
import { DesktopTable } from '../../pages/DesktopTable';

const SYS_MODULES: { moduleKey: string; containerId: string; label: string }[] = [
    { moduleKey: 'health',     containerId: 'health-table-container',     label: 'Health' },
    { moduleKey: 'modules',    containerId: 'modules-settings-container', label: 'Modules' },
    { moduleKey: 'logs',       containerId: 'logs-table-container',       label: 'Logs' },
    { moduleKey: 'dataimport', containerId: 'dataimport-container',       label: 'Data Import' }
];

const SECURITY_SERVICES = ['users', 'roles', 'credentials', 'apikeys', 'events'];

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

    // #38: the form's inputs are l8sys-cred-*, and the save read #sys-cred-*, so
    // every save stopped at "Please fill in ID and Name". Managing credentials
    // needs the admin role (the operator has no Add button and no DELETE), so
    // this runs on an admin page -- a TEST security image (admin without TFA).
    test('Security / credentials: Add saves a credential', async ({ browser }) => {
        const id = `${runTag()}-cred`;
        const admin = await Api.login(ENV.adminUser, ENV.adminPass);
        const { page, close } = await openUserPage(browser, ENV.adminUser, ENV.adminPass);
        const pageErrors: string[] = [];
        page.on('pageerror', (e) => pageErrors.push(e.message));
        try {
            const nav = new DesktopNav(page);
            await nav.openSection('system');
            await nav.openModule('security');
            await nav.openService('security', 'credentials');
            const table = new DesktopTable(page, 'security', 'credentials');
            await table.waitForResolved();
            await table.addButton().click();
            const popup = new Popup(page);
            await popup.waitForOpen();
            await popup.fill('l8sys-cred-id', id);
            await popup.fill('l8sys-cred-name', `${id} name`);
            await popup.saveButton().click();
            await popup.waitForClosed();
            await expect.poll(async () =>
                (await admin.query('/75/Creds', `select * from L8Credentials where id='${id}'`)).list.length,
            { timeout: 15000, message: 'the saved credential is not stored' }).toBe(1);
            expect(pageErrors, 'uncaught page errors').toEqual([]);
        } finally {
            await safeCleanup(`credential ${id}`, () => admin.deleteById('/75/Creds', 'L8Credentials', 'id', id));
            await close();
            await admin.dispose();
        }
    });

    test('Security / portals: Add opens a form', async ({ freshApp: app }) => {
        // Runs on its own page (freshApp): an uncaught error here would make
        // app.js end the session of the worker's shared page.
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
