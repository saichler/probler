/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// Page objects for the real mobile bundle at /m/app.html.
//
// PostImplementationE2ETesting is explicit that mobile means the mobile bundle
// at its own URL, never a resized desktop viewport -- the two shells load
// different script sets (341 vs 388 files here) and diverge in exactly the
// places a resized desktop would hide.
//
// Selectors from l8ui/m/js/layer8m-nav.js (`.nav-card[data-module]`,
// `.nav-card-grid`, `.nav-back-btn`, `.data-list-title`) and
// l8ui/m/js/layer8m-table.js (`.mobile-table-cards`, `.mobile-table-card-row`,
// `.mobile-table-empty`, `.mobile-table-pagination`).

import { Locator, Page, expect } from '@playwright/test';

export class MobileNav {
    constructor(private page: Page) {}

    cardGrid(): Locator { return this.page.locator('.nav-card-grid'); }
    cards(): Locator { return this.page.locator('.nav-card'); }
    backButton(): Locator { return this.page.locator('.nav-back-btn, .data-list-back-btn').first(); }
    title(): Locator { return this.page.locator('.nav-title, .data-list-title').first(); }
    emptyState(): Locator { return this.page.locator('.nav-empty-state'); }

    moduleCard(moduleKey: string): Locator {
        return this.page.locator(`.nav-card[data-module="${moduleKey}"]`);
    }

    /** A card by its visible label -- sub-module and service cards carry no data-module. */
    cardByLabel(label: string): Locator {
        return this.page.locator('.nav-card').filter({ hasText: label }).first();
    }

    /**
     * The mobile view switcher slot (layer8m-nav-data.js renders into
     * #service-view-switcher using the SAME shared Layer8ViewSwitcher as
     * desktop, so the markup is .l8-view-toggle + .l8-view-menu-item
     * [data-view-type]).
     */
    viewSwitcherSlot(): Locator { return this.page.locator('#service-view-switcher'); }

    /** The container a mobile service view renders into. */
    serviceContainer(): Locator { return this.page.locator('#service-table-container'); }

    async waitForHome(timeout = 20000): Promise<void> {
        await expect(this.cardGrid()).toBeVisible({ timeout });
    }

    /**
     * Returns to the home grid through the app's own navigation.
     *
     * Replaces reloading /m/app.html between services, which re-downloaded the
     * whole bundle and re-ran boot (~2s) for every one of ~260 services. Home is
     * identified by its MODULE cards -- sub-module and service grids reuse
     * .nav-card-grid, but only home cards carry data-module.
     */
    async goHome(): Promise<void> {
        await this.page.evaluate(() => {
            const w = window as unknown as { Layer8MNav?: { showHome(): void } };
            w.Layer8MNav?.showHome();
        });
        await expect(this.page.locator('.nav-card[data-module]').first()).toBeVisible({ timeout: 15000 });
    }

    async openModule(moduleKey: string): Promise<void> {
        await this.moduleCard(moduleKey).click();
        // A module with a single sub-module/service opens its table directly
        // (layer8m-nav.js), so either the next card grid or the service
        // container proves the navigation happened.
        await expect(this.page.locator('.nav-card-grid, #service-table-container').first())
            .toBeVisible({ timeout: 15000 });
    }

    /** True when the current screen is a service table, not a card grid. */
    async onServiceScreen(): Promise<boolean> {
        return (await this.serviceContainer().count()) > 0 && this.serviceContainer().isVisible();
    }

    async openByLabel(label: string): Promise<void> {
        await this.cardByLabel(label).click();
    }

    async back(): Promise<void> {
        await this.backButton().click();
    }

    /** Module keys currently rendered on the home grid. */
    async visibleModules(): Promise<string[]> {
        return this.page.$$eval('.nav-card[data-module]', (els) =>
            els
                .filter((e) => (e as HTMLElement).style.display !== 'none')
                .map((e) => e.getAttribute('data-module') || '')
                .filter(Boolean)
        );
    }

    /**
     * Drills home -> module -> sub-module -> service and returns the L8Query
     * the shell issued, or null if it never issued one.
     */
    async openService(
        moduleKey: string, subModuleLabel: string, serviceLabel: string, model: string
    ): Promise<string | null> {
        const queryPromise = this.page
            .waitForRequest(
                (req) => req.url().includes('body=') &&
                         decodeURIComponent(req.url()).includes(`from ${model} `),
                { timeout: 20000 }
            )
            .catch(() => null);

        await this.openModule(moduleKey);
        if (await this.onServiceScreen()) {
            const direct = await queryPromise;
            if (!direct) return null;
            const b = new URL(direct.url()).searchParams.get('body');
            return b ? (JSON.parse(b).text as string) : null;
        }
        // Each level replaces the grid, so wait for the card of the NEXT level
        // to be on screen before clicking it; a click aimed at the previous
        // grid's markup is silently lost.
        const sub = this.cardByLabel(subModuleLabel);
        await sub.waitFor({ state: 'visible', timeout: 10000 }).catch(() => undefined);
        if (await sub.count()) await sub.click();
        const svc = this.cardByLabel(serviceLabel);
        await svc.waitFor({ state: 'visible', timeout: 10000 }).catch(() => undefined);
        if (await svc.count()) await svc.click();

        const req = await queryPromise;
        if (!req) return null;
        const body = new URL(req.url()).searchParams.get('body');
        return body ? (JSON.parse(body).text as string) : null;
    }
}

export class MobileTable {
    constructor(private page: Page) {}

    // Mobile has TWO card table components and the nav uses the editable one:
    // Layer8MTable emits `mobile-table-*`, Layer8MEditTable emits
    // `mobile-edit-table-*`, and layer8m-nav-data.js renders services through
    // the latter (AddingModule: "Mobile: new Layer8MEditTable(containerId,
    // config)"). Matching only `mobile-table-*` found a fully rendered 43KB
    // table and reported "never resolved" for every service in the app.
    cards(): Locator {
        return this.page.locator(
            '.mobile-table-cards .mobile-table-card-row, ' +
            '.mobile-edit-table-cards .mobile-edit-table-card-row'
        );
    }
    wrapper(): Locator { return this.page.locator('.mobile-table-wrapper, .mobile-edit-table-wrapper'); }
    empty(): Locator { return this.page.locator('.mobile-table-empty, .mobile-edit-table-empty'); }
    error(): Locator { return this.page.locator('.mobile-table-error, .mobile-edit-table-error'); }
    loading(): Locator { return this.page.locator('.mobile-table-loading, .mobile-edit-table-loading'); }
    pagination(): Locator { return this.page.locator('.mobile-table-pagination, .mobile-edit-table-pagination'); }
    filters(): Locator { return this.page.locator('.mobile-table-filters, .mobile-edit-table-filters'); }

    /**
     * Runs `action` and waits until the card list has rendered again: the
     * current cards are tagged first, and the list has re-rendered once no
     * tagged card is left and the list resolved into cards, empty or error.
     * Returns false when nothing re-rendered within `timeout`.
     */
    async rerender(action: () => Promise<unknown>, timeout = 20000): Promise<boolean> {
        await this.cards().evaluateAll((els) => els.forEach((e) => e.setAttribute('data-e2e-stale', '1')));
        await action();
        const gone = await expect(this.page.locator('[data-e2e-stale]'))
            .toHaveCount(0, { timeout })
            .then(() => true, () => false);
        if (!gone) return false;
        await this.waitForResolved(timeout).catch(() => undefined);
        return true;
    }

    /** Same three-way resolution as the desktop table, plus the error card. */
    async waitForResolved(timeout = 20000): Promise<'cards' | 'empty' | 'error'> {
        await expect
            .poll(
                async () => {
                    if (await this.cards().count() > 0) return 'cards';
                    if (await this.error().count() > 0) return 'error';
                    if (await this.empty().count() > 0) return 'empty';
                    return 'pending';
                },
                { timeout, message: 'mobile table never resolved into cards, empty, or error' }
            )
            .not.toBe('pending');

        if (await this.cards().count() > 0) return 'cards';
        if (await this.error().count() > 0) return 'error';
        return 'empty';
    }

    /** Field labels on the first card -- catches the DEFAULT_COLUMNS fallback. */
    async firstCardLabels(): Promise<string[]> {
        const first = this.cards().first();
        if (!(await first.count())) return [];
        const labels = await first
            .locator('.mobile-table-card-label, .mobile-edit-table-card-label')
            .allInnerTexts();
        return labels.map((l) => l.replace(/:$/, '').trim()).filter(Boolean);
    }
}

/**
 * Opens every tab of the open mobile popup in turn (Layer8MPopup renders
 * `.mobile-popup-tab[data-tab]`), asserting each becomes active and the popup
 * keeps rendering content. Returns the tab ids visited.
 */
export async function exerciseMobileTabs(page: Page): Promise<string[]> {
    const overlay = page.locator('.mobile-popup-overlay.open').last();
    await expect(overlay).toBeVisible();
    const ids = (await overlay.locator('.mobile-popup-tab[data-tab]')
        .evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.tab || ''))).filter(Boolean);
    for (const id of ids) {
        const tab = overlay.locator(`.mobile-popup-tab[data-tab="${id}"]`);
        await tab.scrollIntoViewIfNeeded();
        await tab.click();
        await expect(tab, `mobile popup tab "${id}" never became active`).toHaveClass(/active/);
        await expect.poll(async () => (await overlay.innerText()).trim().length,
            { message: `mobile popup tab "${id}" rendered nothing` }).toBeGreaterThan(0);
    }
    return ids;
}
