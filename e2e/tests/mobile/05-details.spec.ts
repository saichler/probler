/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// Mobile detail popups, for EVERY service in the mobile nav config: open the
// service, tap the first card (when the live cluster has data for it), and
// walk every tab of the resulting Layer8MPopup. One test per (module,
// sub-module), mirroring 01-service-coverage.

import { test, expect, assertNoPageErrors } from '../../fixtures/test';
import { MOBILE_MODULES } from '../../fixtures/inventory';
import { MobileNav, MobileTable, exerciseMobileTabs } from '../../pages/MobileNav';
import { phantomModels } from '../../fixtures/api';

for (const mod of MOBILE_MODULES) {
    for (const sub of mod.subModules) {
        const services = sub.services.filter((s) => !!s.model);
        if (services.length === 0) continue;
        test(`mobile ${mod.moduleKey} / ${sub.subModuleKey}: detail popups`, async ({ mobile, api, consoleErrors }) => {
            test.setTimeout(Math.max(120_000, services.length * 30_000));
            test.fail(mod.moduleKey === 'hosts', 'Hosts & VMs has no backend service yet');
            const nav = new MobileNav(mobile);
            const table = new MobileTable(mobile);
            const problems: string[] = [];
            let opened = 0;
            // Keyless K8s placeholder records (upstream l8parser bug, tracked by
            // desktop 09-kubernetes) have no id to open.
            const phantoms = await phantomModels(api, services);
            for (const svc of services) {
                if (phantoms.has(svc.model)) continue;
                const where = `${mod.moduleKey}/${sub.subModuleKey}/${svc.key}`;
                await mobile.evaluate(() => {
                    const w = window as unknown as { Layer8MPopup: { closeAll(): void }; Layer8MNav: { showHome(): void } };
                    w.Layer8MPopup.closeAll();
                    w.Layer8MNav.showHome();
                });
                await nav.waitForHome();
                const query = await nav.openService(mod.moduleKey, sub.subModuleLabel, svc.label, svc.model);
                if (query === null) { problems.push(`${where}: service never queried`); continue; }
                let state: string;
                try {
                    state = await table.waitForResolved();
                } catch (e) {
                    problems.push(`${where}: ${(e as Error).message.split('\n')[0]}`);
                    continue;
                }
                if (state !== 'cards') continue; // no data for this resource in KIND
                await table.cards().first().click();
                const overlay = mobile.locator('.mobile-popup-overlay.open');
                const shown = await expect(overlay.first()).toBeVisible({ timeout: 15000 }).then(() => true, () => false);
                if (!shown) { problems.push(`${where}: tapping a card opened no popup`); continue; }
                await exerciseMobileTabs(mobile);
                opened++;
            }
            expect(problems, problems.join('\n')).toEqual([]);
            test.info().annotations.push({ type: 'popups', description: `${opened}/${services.length}` });
            assertNoPageErrors(consoleErrors);
        });
    }
}

test.describe('mobile dashboard', () => {
    test('KPIs match the API and join the dashboard live slot @smoke', async ({ freshMobile: mobile, api }) => {
        const devices = await api.total('/0/NCache', 'NetworkDevice');
        const gpus = await api.total('/2/GCache', 'GpuDevice');
        await expect.poll(() => mobile.locator('#stat-devices').innerText()).toBe(String(devices));
        await expect.poll(() => mobile.locator('#stat-gpus').innerText()).toBe(String(gpus));
        await expect.poll(async () => Number(await mobile.locator('#stat-k8s').innerText()) || 0,
            { message: 'K8s pods KPI is empty' }).toBeGreaterThan(0);
        const ids = await mobile.evaluate(() =>
            (window as unknown as { Layer8DWebSocket: { liveIds(): string[] } }).Layer8DWebSocket.liveIds());
        expect(ids).toContain('dashboard');
    });
});
