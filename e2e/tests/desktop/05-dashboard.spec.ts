/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// Dashboard KPI cards show the live counts the API reports (from l8opensim
// devices and the KIND cluster itself), the cards navigate, and the alarms
// widget renders.

import { test, expect, assertNoPageErrors, waitForQuiet } from '../../fixtures/test';
import { DesktopNav } from '../../pages/DesktopNav';

async function cardValue(page: import('@playwright/test').Page, id: string): Promise<string> {
    return (await page.locator(`#${id} .metric-card-value`).innerText()).trim();
}

test.describe('dashboard', () => {
    test.beforeEach(async ({ app }) => {
        const nav = new DesktopNav(app);
        await nav.openSection('dashboard');
        await waitForQuiet(app);
    });

    test('network card matches the API total @smoke', async ({ app, api }) => {
        const total = await api.total('/0/NCache', 'NetworkDevice');
        expect(total).toBeGreaterThan(0);
        await expect.poll(() => cardValue(app, 'dashboard-card-network')).toBe(total.toLocaleString('en-US'));
        await expect(app.locator('#dashboard-card-network .metric-card-details')).toContainText('Online');
    });

    test('GPU card matches the API total', async ({ app, api }) => {
        const total = await api.total('/2/GCache', 'GpuDevice');
        expect(total).toBeGreaterThan(0);
        await expect.poll(() => cardValue(app, 'dashboard-card-gpus')).toBe(total.toLocaleString('en-US'));
    });

    test('Kubernetes card shows the cluster with nodes and pods', async ({ app, api }) => {
        const clusters = await api.query('/10/KCluster', 'select * from K8SCluster');
        expect(clusters.list.length).toBeGreaterThan(0);
        await expect.poll(() => cardValue(app, 'dashboard-card-k8s')).toBe(String(clusters.list.length));
        await expect(app.locator('#dashboard-card-k8s .metric-card-details')).toContainText(/\d+ Nodes/);
        await expect(app.locator('#dashboard-card-k8s .metric-card-details')).toContainText(/\d+ Pods/);
    });

    test('the alarms widget renders a table', async ({ app }) => {
        const table = app.locator('#alarms-table .l8-table, #alarms-table .l8-empty-state');
        await expect(table.first()).toBeVisible();
    });

    for (const [card, section] of [
        ['dashboard-card-network', 'network'], ['dashboard-card-gpus', 'gpus'], ['dashboard-card-k8s', 'kubernetes']
    ]) {
        test(`clicking ${card} navigates to ${section}`, async ({ app }) => {
            const target = app.locator(`#${card}`);
            const navTo = await target.getAttribute('data-section');
            expect(navTo, `${card} has no data-section`).toBe(section);
            await target.click();
            await expect(app.locator(`.nav-link[data-section="${section}"]`)).toHaveClass(/active/);
        });
    }

    test.afterEach(async ({ consoleErrors }) => {
        assertNoPageErrors(consoleErrors);
    });
});
