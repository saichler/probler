/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// Network section: every simulated device is listed, and the device detail
// popup renders all of its tabs (overview, equipment, interfaces, routing,
// physical inventory tree, performance charts) for real parsed SNMP data.

import { test, expect, assertNoPageErrors } from '../../fixtures/test';
import { DesktopNav } from '../../pages/DesktopNav';
import { DesktopTable } from '../../pages/DesktopTable';
import { exerciseAllTabs, Popup } from '../../pages/Popup';

const CONTAINER = '#network-devices-table';

test.describe('network devices', () => {
    test.beforeEach(async ({ app }) => {
        await new DesktopNav(app).openSection('network');
    });

    test('the table lists the simulated devices @smoke', async ({ app }) => {
        const table = new DesktopTable(app, CONTAINER);
        expect(await table.waitForResolved()).toBe('rows');
        const labels = await table.columnLabels();
        for (const l of ['Device Name', 'IP Address', 'Status']) {
            expect(labels.join('|').toLowerCase()).toContain(l.toLowerCase());
        }
        await expect(table.rows().filter({ hasText: '10.20.30.' }).first()).toBeVisible();
    });

    test('the device popup renders every tab for the first device', async ({ app }) => {
        const table = new DesktopTable(app, CONTAINER);
        await table.waitForResolved();
        await table.rows().first().locator('td').nth(1).click();
        const popup = new Popup(app);
        await popup.waitForOpen();
        const tabs = await exerciseAllTabs(app);
        for (const t of ['overview', 'equipment', 'physical', 'performance']) expect(tabs).toContain(t);
        await popup.close();
    });

    test('the physical inventory tree expands and collapses', async ({ app }) => {
        const table = new DesktopTable(app, CONTAINER);
        await table.waitForResolved();
        await table.rows().first().locator('td').nth(1).click();
        const popup = new Popup(app);
        await popup.waitForOpen();
        await popup.openTab('physical');
        const tree = popup.root().locator('#physical-inventory-tree');
        const toggle = tree.locator('.tree-expand-icon:not(.tree-no-children)').first();
        await expect(toggle, 'the physical tree rendered no expandable node').toBeVisible();
        const nodes = () => tree.locator('.tree-node').count();
        const before = await nodes();
        await toggle.click();
        await expect.poll(nodes, { message: 'expanding the tree changed nothing' }).not.toBe(before);
        const after = await nodes();
        await tree.locator('.tree-expand-icon:not(.tree-no-children)').first().click();
        await expect.poll(nodes, { message: 'toggling the tree back changed nothing' }).not.toBe(after);
        await popup.close();
    });

    test('every performance sub-tab renders, with charts for CPU and memory', async ({ app }) => {
        const table = new DesktopTable(app, CONTAINER);
        await table.waitForResolved();
        await table.rows().first().locator('td').nth(1).click();
        const popup = new Popup(app);
        await popup.waitForOpen();
        await popup.openTab('performance');
        const pane = popup.root().locator('.probler-popup-tab-pane[data-pane="performance"]');
        const subTabs = pane.locator('.perf-sub-tab[data-perf-tab]');
        const keys = await subTabs.evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.perfTab!));
        expect(keys.length, 'the performance tab has no sub-tabs').toBeGreaterThan(0);
        for (const key of keys) {
            await pane.locator(`.perf-sub-tab[data-perf-tab="${key}"]`).click();
            const sub = pane.locator(`.perf-sub-pane[data-perf-pane="${key}"]`);
            await expect(sub, `perf sub-tab ${key} never became active`).toHaveClass(/active/);
            await expect.poll(async () => (await sub.innerHTML()).trim().length,
                { message: `perf sub-tab ${key} is empty` }).toBeGreaterThan(0);
            if (key === 'cpu' || key === 'memory') {
                await expect(sub.locator('svg, canvas').first(), `no chart drawn for ${key}`).toBeVisible();
            }
        }
        await popup.close();
    });

    test('every device opens a popup without errors', async ({ app, consoleErrors }) => {
        test.setTimeout(240_000);
        const table = new DesktopTable(app, CONTAINER);
        await table.waitForResolved();
        // Largest page size so one page holds every simulated device.
        const select = table.root.locator('.l8-page-size-select');
        await expect(select).toBeVisible();
        const sizes = (await select.locator('option').allInnerTexts()).map(Number);
        const largest = String(Math.max(...sizes));
        if ((await select.inputValue()) !== largest) {
            expect(await table.rerender(() => select.selectOption(largest))).toBe(true);
        }
        const count = await table.rows().count();
        expect(count).toBeGreaterThan(0);
        const popup = new Popup(app);
        for (let i = 0; i < count; i++) {
            await table.rows().nth(i).locator('td').nth(1).click();
            await popup.waitForOpen();
            await exerciseAllTabs(app);
            await popup.close();
        }
        assertNoPageErrors(consoleErrors);
    });

    test.afterEach(async ({ consoleErrors }) => {
        assertNoPageErrors(consoleErrors);
    });
});
