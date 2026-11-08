/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// Alarms & Events (ALM, l8alarms UI + l8events): every module tab switches,
// the Events table carries the EventRecords the services post, and rows in
// every ALM table open their detail popup. CRUD on the editable models is in
// 21-crud / 22-crud-all-models; alternate views in 18-view-system.

import { test, expect, assertNoPageErrors } from '../../fixtures/test';
import { DESKTOP_SECTIONS } from '../../fixtures/inventory';
import { DesktopNav } from '../../pages/DesktopNav';
import { DesktopTable } from '../../pages/DesktopTable';
import { Popup } from '../../pages/Popup';

const ALM = DESKTOP_SECTIONS.find((s) => s.section === 'alarms')!;

test.describe('alarms & events', () => {
    test('every ALM module tab switches @smoke', async ({ app }) => {
        const nav = new DesktopNav(app);
        await nav.openSection('alarms');
        for (const m of ALM.modules) {
            await nav.openModule(m.moduleKey);
            await expect(nav.moduleContent(m.moduleKey)).toHaveClass(/active/);
        }
    });

    for (const m of ALM.modules) {
        test(`${m.moduleKey}: rows open their detail popup`, async ({ app, consoleErrors }) => {
            const nav = new DesktopNav(app);
            await nav.openSection('alarms');
            await nav.openModule(m.moduleKey);
            for (const svc of m.services) {
                await nav.openService(m.moduleKey, svc.key);
                const table = new DesktopTable(app, m.moduleKey, svc.key);
                if ((await table.waitForResolved()) === 'empty') continue;
                await table.rows().first().locator('td').first().click();
                const popup = new Popup(app);
                await popup.waitForOpen();
                await expect.poll(async () => (await popup.body().innerText()).trim().length,
                    { message: `${svc.key}: the detail popup is empty` }).toBeGreaterThan(0);
                await popup.close();
            }
            assertNoPageErrors(consoleErrors);
        });
    }

    test('the Events table shows events posted by the services', async ({ app, api }) => {
        const total = await api.total('/76/Events', 'EventRecord');
        expect(total, 'no EventRecord reached l8events -- system.Activate did not run').toBeGreaterThan(0);
        const nav = new DesktopNav(app);
        await nav.openSection('alarms');
        await nav.openModule('events');
        expect(await new DesktopTable(app, 'events', 'events').waitForResolved()).toBe('rows');
    });
});
