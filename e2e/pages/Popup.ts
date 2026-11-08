/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// Page object for Layer8DPopup and the forms rendered inside it.
//
// Selectors from l8ui/popup/layer8d-popup.js: `.probler-popup-overlay`,
// `-container`, `-header`, `-title`, `-body`, `-footer`, `-close`,
// and `.probler-popup-tab[data-tab]` / `.probler-popup-tab-pane[data-pane]`.
//
// StackedPopupDomScoping applies here as much as in the app: popups stack and
// duplicate ids, so every lookup is scoped to the LAST overlay rather than
// resolved globally.

import { Locator, Page, expect } from '@playwright/test';

export class Popup {
    /** Why the last save() returned null, when the click itself failed. */
    lastSaveError = '';

    constructor(private page: Page) {}

    /** The topmost popup -- stacked popups duplicate ids. */
    root(): Locator {
        return this.page.locator('.probler-popup-overlay').last();
    }

    body(): Locator { return this.root().locator('.probler-popup-body'); }
    title(): Locator { return this.root().locator('.probler-popup-title'); }
    // layer8d-popup.js builds the footer buttons as plain `btn btn-primary`
    // / `btn btn-secondary`; there is no .probler-popup-save element.
    saveButton(): Locator { return this.root().locator('.probler-popup-footer .btn-primary'); }
    cancelButton(): Locator { return this.root().locator('.probler-popup-footer .btn-secondary'); }
    closeButton(): Locator { return this.root().locator('.probler-popup-close'); }
    tabs(): Locator { return this.root().locator('.probler-popup-tab'); }

    async waitForOpen(timeout = 15000): Promise<void> {
        await expect(this.root()).toBeVisible({ timeout });
        await expect(this.body()).toBeVisible({ timeout });
    }

    async waitForClosed(timeout = 15000): Promise<void> {
        await expect(this.page.locator('.probler-popup-overlay')).toHaveCount(0, { timeout });
    }

    async close(): Promise<void> {
        if (await this.root().count()) {
            await this.closeButton().click();
            await this.waitForClosed();
        }
    }

    /** Labels of every field the form rendered, in order. */
    async fieldLabels(): Promise<string[]> {
        const labels = await this.body().locator('label').allInnerTexts();
        return labels.map((l) => l.replace(/\s*\*$/, '').trim()).filter(Boolean);
    }

    input(name: string): Locator {
        return this.body().locator(`[name="${name}"]`);
    }

    async fill(name: string, value: string): Promise<void> {
        const el = this.input(name);
        await expect(el, `form field "${name}" is not present in the popup`).toBeVisible();
        await el.fill(value);
    }

    async select(name: string, value: string): Promise<void> {
        await this.input(name).selectOption(value);
    }

    /**
     * Activates whichever tab contains `selector`, if the form is tabbed.
     *
     * A form with more than one section renders as tabs, and only the active
     * `.probler-popup-tab-pane` is displayed. Everything inside an inactive
     * pane reports a 0x0 bounding box -- so a perfectly healthy control there
     * looks invisible and unclickable (PlatformConversionDataFlow's "Hidden
     * Container Rendering"). Returns false when nothing matched.
     */
    async revealTabContaining(selector: string): Promise<boolean> {
        const paneId = await this.root().evaluate((root, sel) => {
            const el = root.querySelector(sel);
            if (!el) return null;
            const pane = el.closest('.probler-popup-tab-pane');
            return pane ? pane.getAttribute('data-pane') : null;
        }, selector);
        if (!paneId) return false;

        const tab = this.root().locator(`.probler-popup-tab[data-tab="${paneId}"]`);
        if (!(await tab.count())) return false;
        await tab.click().catch(() => undefined);
        // Done when the pane is the one on screen, not after a fixed pause.
        return expect(this.root().locator(`.probler-popup-tab-pane[data-pane="${paneId}"]`))
            .toBeVisible({ timeout: 5000 })
            .then(() => true, () => false);
    }

    async openTab(tabId: string): Promise<void> {
        await this.root().locator(`.probler-popup-tab[data-tab="${tabId}"]`).click();
        await expect(
            this.root().locator(`.probler-popup-tab-pane[data-pane="${tabId}"]`)
        ).toBeVisible();
    }

    /**
     * Saves and waits for the write to land.
     *
     * Returns null when the click could not be delivered or no write followed
     * -- never throws. The rejection is attached to the waiter at creation
     * because a bare waitForResponse whose click then fails rejects LATER,
     * unhandled, and Playwright attributes that to the test even though the
     * click error was caught.
     */
    async save(): Promise<{ status: number; body: unknown } | null> {
        // Ignore 3xx: the write is redirected first, and matching the redirect
        // reports HTTP 307 as if it were the outcome -- so a create looks
        // "successful" while the real response (and any error) is never seen.
        const responsePromise = this.page
            .waitForResponse(
                (r) => ['POST', 'PUT'].includes(r.request().method()) &&
                       !(r.status() >= 300 && r.status() < 400),
                { timeout: 20000 })
            .catch(() => null);

        // A date field leaves .layer8d-datepicker-overlay across the popup,
        // which silently swallows the click on Save.
        await this.page.evaluate(() => {
            document.querySelectorAll('.layer8d-datepicker-overlay').forEach((e) => e.remove());
        }).catch(() => undefined);

        try {
            await this.saveButton().click({ timeout: 10000 });
        } catch (e) {
            this.lastSaveError = (e as Error).message.split('\n')[0];
            return null;
        }
        const res = await responsePromise;
        if (!res) return null;
        return { status: res.status(), body: await res.json().catch(() => null) };
    }

    /** Values shown in a read-only (view) form, keyed by label. */
    async readOnlyValues(): Promise<Record<string, string>> {
        return this.body().evaluate((el) => {
            const out: Record<string, string> = {};
            el.querySelectorAll('label').forEach((label) => {
                const key = (label.textContent || '').replace(/\s*\*$/, '').trim();
                const group = label.parentElement;
                if (!group) return;
                const display = group.querySelector('span, input, select, textarea');
                if (display) {
                    out[key] =
                        (display as HTMLInputElement).value ?? (display.textContent || '').trim();
                }
            });
            return out;
        });
    }
}

/**
 * Opens every tab of the top-most probler popup in turn and asserts its pane
 * becomes visible and renders something. Returns the tab ids visited. Used by
 * every detail-popup spec so "all popup functionality" means every tab, not
 * just the default one.
 */
export async function exerciseAllTabs(page: Page): Promise<string[]> {
    const root = page.locator('.probler-popup-overlay').last();
    const tabs = root.locator('.probler-popup-tab');
    const ids = (await tabs.evaluateAll((els) => els.map((e) => e.getAttribute('data-tab') || '')))
        .filter(Boolean);
    for (const id of ids) {
        const tab = root.locator(`.probler-popup-tab[data-tab="${id}"]`);
        const pane = root.locator(`.probler-popup-tab-pane[data-pane="${id}"]`);
        for (let attempt = 0; attempt < 3; attempt++) {
            await tab.click();
            const active = await expect(tab).toHaveClass(/active/, { timeout: 3000 }).then(() => true, () => false);
            if (active) break;
        }
        await expect(tab, `popup tab "${id}" never became active`).toHaveClass(/active/);
        if (await pane.count()) {
            await expect(pane, `popup pane "${id}" not visible`).toBeVisible();
            await expect
                .poll(async () => (await pane.innerHTML()).trim().length, {
                    message: `popup pane "${id}" rendered nothing`
                })
                .toBeGreaterThan(0);
        }
    }
    return ids;
}
