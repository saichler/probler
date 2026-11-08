/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// Every sidebar section loads through sections.js, renders its markup, and
// raises no uncaught exception, console error or failed request while its
// initializer runs. Sections come from app.html's data-section values (via the
// generated inventory), so a new sidebar entry is covered automatically.

import { test, expect, assertNoPageErrors, waitForQuiet } from '../../fixtures/test';
import { INVENTORY } from '../../fixtures/inventory';
import { DesktopNav } from '../../pages/DesktopNav';

const SECTIONS = INVENTORY.desktop.sections.map((s) => s.section);

test.describe('desktop navigation', () => {
    for (const section of SECTIONS) {
        test(`section "${section}" loads cleanly @smoke`, async ({ app, consoleErrors }) => {
            const nav = new DesktopNav(app);
            await nav.openSection(section);
            // Section initializers fetch their data after the fade-in; the shell
            // does no background polling, so a quiet network means they settled.
            await waitForQuiet(app);
            await expect(nav.contentArea().locator('.section-container')).toBeVisible();
            assertNoPageErrors(consoleErrors);
            expect(consoleErrors.failedRequests, consoleErrors.failedRequests.join('\n')).toEqual([]);
        });
    }

    test('the sidebar highlights exactly the open section', async ({ app }) => {
        const nav = new DesktopNav(app);
        for (const section of ['network', 'dashboard']) {
            await nav.openSection(section);
            await expect(app.locator('.nav-link.active')).toHaveCount(1);
            await expect(nav.sidebarLink(section)).toHaveClass(/active/);
        }
    });
});
