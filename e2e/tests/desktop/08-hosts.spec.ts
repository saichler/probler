/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// Hosts & VMs section: both module tabs switch and render their tables.
// KNOWN GAP: there is no backend service for hypervisors/VMs (js/hosts.js
// builds both tables from empty arrays), so the detail popups cannot be
// reached with real data; those tests are test.fail() until a service exists.

import { test, expect, assertNoPageErrors } from '../../fixtures/test';
import { DesktopNav } from '../../pages/DesktopNav';
import { DesktopTable } from '../../pages/DesktopTable';
import { Popup } from '../../pages/Popup';

test.describe('hosts & VMs', () => {
    test.beforeEach(async ({ app }) => {
        await new DesktopNav(app).openSection('hosts');
    });

    test('the hypervisors and VMs tabs switch and render tables @smoke', async ({ app }) => {
        const nav = new DesktopNav(app);
        for (const [mod, container] of [['hypervisors', '#hypervisors-table'], ['vms', '#vms-table']]) {
            await nav.openModule(mod);
            const table = new DesktopTable(app, container);
            await table.waitForResolved();
            expect((await table.columnLabels()).length, `${mod} table has no columns`).toBeGreaterThan(0);
        }
    });

    for (const [mod, container] of [['hypervisors', '#hypervisors-table'], ['vms', '#vms-table']]) {
        test(`a ${mod} row opens its detail popup`, async ({ app }) => {
            test.fail(true, 'Hosts & VMs has no backend service yet: the tables have no rows');
            const nav = new DesktopNav(app);
            await nav.openModule(mod);
            const table = new DesktopTable(app, container);
            expect(await table.waitForResolved(), `${mod} has no rows`).toBe('rows');
            await table.rows().first().locator('td').nth(1).click();
            await new Popup(app).waitForOpen(5000);
        });
    }

    test.afterEach(async ({ consoleErrors }) => {
        assertNoPageErrors(consoleErrors);
    });
});
