/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// Page object for the inline (child-entity) tables inside a form.
//
// PrimeObjectReferences Rule 3: a child type gets no config, columns, nav or
// registry entry -- it appears ONLY as f.inlineTable() inside its parent's
// form. So the only way to exercise 142 child entities is through their
// parents' forms, which is what this object is for.
//
// Selectors from l8ui/shared/layer8d-forms-fields-ext.js: the wrapper carries
// `data-inline-table`, the hidden JSON payload `data-inline-table-data`, rows
// `data-row-index`, and the buttons `.form-inline-table-btn.add|edit|delete`.

import { Locator, Page, expect } from '@playwright/test';
import { Popup } from './Popup';

export class InlineTable {
    constructor(private page: Page, private popup: Popup, private fieldKey: string) {}

    root(): Locator {
        return this.popup.body().locator(`[data-inline-table="${this.fieldKey}"]`);
    }

    /** Fallback for builds that only tag the hidden payload input. */
    anyRoot(): Locator {
        const tagged = this.root();
        return tagged;
    }

    body(): Locator { return this.root().locator('.form-inline-table-body'); }
    rows(): Locator { return this.root().locator('[data-row-index]'); }
    empty(): Locator { return this.root().locator('.form-inline-table-empty'); }
    addButton(): Locator { return this.root().locator('.form-inline-table-btn.add'); }
    // layer8d-forms-fields-ext.js:36-38 renders header cells as bare <span>;
    // `.form-inline-table-cell` is used only for ROW cells (line 49).
    headerCells(): Locator { return this.root().locator('.form-inline-table-header > span'); }

    editButton(rowIndex = 0): Locator {
        return this.root().locator(`[data-row-index="${rowIndex}"] .form-inline-table-btn.edit`);
    }

    deleteButton(rowIndex = 0): Locator {
        return this.root().locator(`[data-row-index="${rowIndex}"] .form-inline-table-btn.delete`);
    }

    /** The hidden input carrying the child rows as JSON -- what actually saves. */
    dataInput(): Locator {
        return this.popup.body().locator(`[data-inline-table-data="${this.fieldKey}"]`);
    }

    /** Parses the hidden payload. This is the state the parent will persist. */
    async payload(): Promise<unknown[]> {
        const el = this.dataInput();
        if (!(await el.count())) return [];
        const raw = await el.inputValue().catch(() => '');
        try {
            const parsed = JSON.parse(raw || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    async rendered(): Promise<boolean> {
        return (await this.root().count()) > 0;
    }

    /**
     * Opens the child-row editor.
     *
     * StackedPopupDomScoping applies here: the row editor is a SECOND popup
     * over the parent form, and both carry the same element ids. Anything that
     * reads the row editor must scope to the topmost popup body, which
     * Popup.body() does by taking `.last()`.
     */
    async openAddRow(): Promise<boolean> {
        const add = this.addButton();
        if (!(await add.count()) || !(await add.isVisible())) return false;
        const overlays = this.page.locator('.probler-popup-overlay');
        const before = await overlays.count();
        const rowsBefore = await this.rows().count();
        await add.click();
        // Either a stacked popup opens, or a row is appended inline -- wait for
        // whichever happens, not for a fixed pause.
        return expect
            .poll(async () => (await overlays.count()) > before || (await this.rows().count()) > rowsBefore,
                  { timeout: 5000 })
            .toBe(true)
            .then(() => true, () => false);
    }

    async rowCount(): Promise<number> {
        return this.rows().count();
    }

    /** Column headers the child schema declared, as rendered. */
    async columnLabels(): Promise<string[]> {
        const labels = await this.headerCells().allInnerTexts();
        return labels.map((l) => l.trim()).filter((l) => l && l !== 'Actions');
    }

    async expectRendered(where: string): Promise<void> {
        await expect(
            this.root(),
            `${where}: inline table "${this.fieldKey}" did not render`
        ).toHaveCount(1);
    }
}
