/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// Page object for Layer8DReferencePicker.
//
// Selectors from l8ui/reference_picker/layer8d-reference-picker-render.js:
// `.layer8d-refpicker-list` holds rows carrying `data-id` and `data-display`,
// with `.layer8d-refpicker-search` for filtering, `.layer8d-refpicker-select-btn`
// to confirm, `.layer8d-refpicker-clear-btn` to unset, and
// `.layer8d-refpicker-pagination` for paging.

import { Locator, Page, expect } from '@playwright/test';

export class ReferencePicker {
    constructor(private page: Page) {}

    root(): Locator { return this.page.locator('.layer8d-refpicker-list').last(); }
    search(): Locator { return this.page.locator('.layer8d-refpicker-search').last(); }
    rows(): Locator { return this.root().locator('[data-id]'); }
    empty(): Locator { return this.page.locator('.layer8d-refpicker-empty'); }
    selectBtn(): Locator { return this.page.locator('.layer8d-refpicker-select-btn').last(); }
    clearBtn(): Locator { return this.page.locator('.layer8d-refpicker-clear-btn').last(); }
    closeBtn(): Locator { return this.page.locator('.layer8d-refpicker-close').last(); }
    pagination(): Locator { return this.page.locator('.layer8d-refpicker-pagination').last(); }
    title(): Locator { return this.page.locator('.layer8d-refpicker-title').last(); }

    async waitForOpen(timeout = 15000): Promise<void> {
        await expect(this.page.locator('.layer8d-refpicker-list, .layer8d-refpicker-empty').last())
            .toBeVisible({ timeout });
    }

    /**
     * Resolves once the picker has settled into rows or its empty state.
     * A picker that shows neither never issued or never rendered its query --
     * the same distinction the table specs draw.
     */
    async waitForResolved(timeout = 20000): Promise<'rows' | 'empty'> {
        await expect
            .poll(
                async () => {
                    if (await this.rows().count() > 0) return 'rows';
                    if (await this.empty().count() > 0) return 'empty';
                    return 'pending';
                },
                { timeout, message: 'the reference picker rendered neither rows nor an empty state' }
            )
            .not.toBe('pending');
        return (await this.rows().count()) > 0 ? 'rows' : 'empty';
    }

    /** Selects the first offered row; returns its id and display text. */
    async selectFirst(): Promise<{ id: string; display: string } | null> {
        const first = this.rows().first();
        if (!(await first.count())) return null;
        const id = (await first.getAttribute('data-id')) || '';
        const display = (await first.getAttribute('data-display')) || (await first.innerText());
        await first.click();
        if (await this.selectBtn().count()) {
            await this.selectBtn().click().catch(() => undefined);
        }
        return { id, display: display.trim() };
    }

    async close(): Promise<void> {
        if (await this.closeBtn().count()) {
            await this.closeBtn().click().catch(() => undefined);
        }
    }
}
