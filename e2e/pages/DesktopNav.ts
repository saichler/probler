/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// Page object for the desktop shell's navigation.
//
// Selectors come from the markup Layer8SectionGenerator emits
// (l8ui/shared/layer8-section-generator.js) and the shell body copied from
// l8erp's app.html (AppHtmlBodyFromL8erp): sidebar `.nav-link[data-section]`,
// content in `#content-area`, module tabs `.l8-module-tab[data-module]`,
// sub-nav `.l8-subnav-item[data-service]`, and one table container per service
// at `{moduleKey}-{serviceKey}-table-container`.

import { Page, Locator, expect } from '@playwright/test';
import { DesktopTable, STALE } from './DesktopTable';

/**
 * Tags the section currently on screen as stale.
 *
 * sections.js replaces #content-area's innerHTML on every load, so a container
 * WITHOUT the tag is, by construction, markup rendered after this call. The
 * shared-page fixture calls this at the start of every test, which makes the
 * test's first openSection() a real reload even when that section is already
 * showing -- a test never inherits another test's filters, open views or
 * half-edited state.
 */
export async function markSectionStale(page: Page): Promise<void> {
    await page.evaluate((attr) => {
        document.querySelectorAll('#content-area .section-container')
            .forEach((c) => c.setAttribute(attr, '1'));
    }, STALE);
}

export class DesktopNav {
    constructor(private page: Page) {}

    contentArea(): Locator {
        return this.page.locator('#content-area');
    }

    sidebarLink(section: string): Locator {
        return this.page.locator(`.nav-link[data-section="${section}"]`);
    }

    /** Sections whose sidebar entry is currently visible to this user. */
    async visibleSections(): Promise<string[]> {
        return this.page.$$eval('.nav-link[data-section]', (links) =>
            links
                .filter((l) => {
                    const li = l.closest('li') as HTMLElement | null;
                    return !li || li.style.display !== 'none';
                })
                .map((l) => l.getAttribute('data-section') || '')
                .filter(Boolean)
        );
    }

    /**
     * Shows a sidebar section, loading it only when it is not already loaded.
     *
     * Re-clicking the active section re-fetches its HTML, re-runs every module
     * initializer and re-queries the default service -- once per service in a
     * sweep that was ~1,500 needless reloads per run. A section that is active
     * and not tagged stale is exactly what a reload would produce, so it is
     * used as-is.
     *
     * When a load is needed, completion is detected without timing: the old
     * container is tagged before the click, so a visible untagged container is
     * the NEW markup, and the inline opacity back at '1' is sections.js's own
     * last step (its swap runs 200ms after the click, the fade-in 50ms after
     * that). The inline value, not the computed one: the 0.5s opacity
     * transition keeps the computed value near 1 at the start of the fade-out,
     * which is how the old opacity poll returned before the swap had begun.
     */
    async openSection(section: string): Promise<void> {
        const link = this.sidebarLink(section);
        const loaded = await this.page.evaluate(({ name, attr }) => {
            const l = document.querySelector(`.nav-link[data-section="${name}"]`);
            const area = document.getElementById('content-area');
            const c = document.querySelector('#content-area .section-container');
            return !!l && l.classList.contains('active') && !!area && area.style.opacity !== '0' &&
                   !!c && !c.hasAttribute(attr);
        }, { name: section, attr: STALE });
        if (loaded) return;

        await markSectionStale(this.page);
        await link.click();
        await expect(link).toHaveClass(/active/, { timeout: 15000 });
        await expect(
            this.contentArea().locator(`.section-container:not([${STALE}])`),
            `section "${section}" never replaced the previous section's markup`
        ).toBeVisible({ timeout: 15000 });
        await expect
            .poll(
                () => this.contentArea().evaluate((el) => (el as HTMLElement).style.opacity),
                { timeout: 15000, message: `section "${section}" never finished fading in` }
            )
            .toBe('1');
    }

    moduleTab(moduleKey: string): Locator {
        return this.page.locator(`.l8-module-tab[data-module="${moduleKey}"]`);
    }

    moduleContent(moduleKey: string): Locator {
        return this.page.locator(`.l8-module-content[data-module="${moduleKey}"]`);
    }

    subnavItem(moduleKey: string, serviceKey: string): Locator {
        return this.moduleContent(moduleKey).locator(`.l8-subnav-item[data-service="${serviceKey}"]`);
    }

    tableContainer(moduleKey: string, serviceKey: string): Locator {
        return this.page.locator(`#${moduleKey}-${serviceKey}-table-container`);
    }

    viewSwitcherSlot(moduleKey: string, serviceKey: string): Locator {
        return this.page.locator(`#${moduleKey}-${serviceKey}-view-switcher`);
    }

    /** Switches module tab, if the section has more than one. */
    async openModule(moduleKey: string): Promise<void> {
        const tab = this.moduleTab(moduleKey);
        const content = this.moduleContent(moduleKey);

        // Click, then confirm, and retry the click if the pane did not activate.
        //
        // A single click with one assertion was the suite's most persistent
        // flake: `.l8-module-content[data-module="X"]` never gaining `active`
        // has hit inventory, shopfloor, campaigns and dashboards across runs.
        // A tab click can be swallowed -- by a floating view-switcher menu, a
        // date-picker overlay, or a section still swapping its DOM -- and one
        // lost click in a spec that navigates 50 times was a hard failure.
        //
        // This retries the app's own path rather than forcing state, and still
        // FAILS if the pane genuinely never activates, so a real navigation bug
        // is reported exactly as before. Each attempt waits on the `active`
        // class itself, so a click that lands costs no extra time.
        for (let attempt = 0; attempt < 3; attempt++) {
            if (await content.evaluate((el) => el.classList.contains('active')).catch(() => false)) {
                return;
            }
            if (attempt > 0) {
                // Something is plausibly covering the tab; clear it the way the
                // app would before trying again.
                await this.page.keyboard.press('Escape').catch(() => undefined);
            }
            if ((await tab.count()) && (await tab.isVisible().catch(() => false))) {
                await tab.click({ timeout: 5000 }).catch(() => undefined);
            }
            const active = await expect(content).toHaveClass(/active/, { timeout: 4000 })
                .then(() => true, () => false);
            if (active) return;
        }
        await expect(content).toHaveClass(/active/, { timeout: 10000 });
    }

    /**
     * Forces the active table to re-fetch, and waits for it to re-render.
     *
     * layer8d-module-navigation.js exposes refreshCurrentTable() on each module
     * namespace; calling it is how the app itself refreshes after a write, so
     * the test uses the same path rather than reloading the page. Returns
     * false when the table did not re-render.
     */
    async refreshCurrentTable(namespace: string, table: DesktopTable): Promise<boolean> {
        return table.rerender(() => this.page.evaluate((ns: string) => {
            const w = window as unknown as Record<string, { refreshCurrentTable?: () => void }>;
            w[ns]?.refreshCurrentTable?.();
        }, namespace));
    }

    /**
     * Clicks a service's sub-nav item. Does not wait for a request -- use a
     * QueryRecorder for that, because the module's DEFAULT service is loaded
     * during initialize() and re-clicking an already-initialised service does
     * not re-fetch, so "a request arrives after this click" is simply false for
     * a healthy default service.
     */
    async openService(moduleKey: string, serviceKey: string): Promise<void> {
        const item = this.subnavItem(moduleKey, serviceKey);
        if (await item.count()) {
            if (await item.isVisible()) await item.click();
        }
    }
}
