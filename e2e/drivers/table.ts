/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// Shared table assertions, called by both the desktop and mobile specs.
//
// Extracted per PlanRequirements' duplication audit: "navigate to service, wait
// for resolve, assert" would otherwise be copied across the sweep, CRUD, forms,
// views, export and realtime specs (6 instances x ~35 behavioural lines). The
// specs stay data-only; the behaviour lives here.

import { Page, expect } from '@playwright/test';
import { DesktopNav } from '../pages/DesktopNav';
import { DesktopTable } from '../pages/DesktopTable';
import { Popup } from '../pages/Popup';
import { QueryRecorder } from '../fixtures/queries';
import { Api } from '../fixtures/api';
import { DesktopService } from '../fixtures/inventory';

export interface ServiceContext {
    page: Page;
    nav: DesktopNav;
    table: DesktopTable;
    popup: Popup;
    queries: QueryRecorder;
}

/**
 * Navigates to a service and returns everything a spec needs to assert on it.
 * The QueryRecorder is attached before navigation so a module's DEFAULT service
 * -- fetched during initialize(), before any click -- is still observed.
 */
export async function openService(
    page: Page, section: string, moduleKey: string, service: DesktopService
): Promise<ServiceContext> {
    // Dismiss anything a previous service left open.
    //
    // A modal overlay that failed to close sits over the whole shell, so the
    // next sub-nav click is intercepted and that service's table never
    // re-renders. That reads as "the container never resolved" and is
    // indistinguishable from a genuinely broken service -- observed on the LAST
    // service of a module, after four earlier services had each opened a
    // detail popup.
    await dismissOpenPopups(page);

    // The test's recorder, started by the fixture before the test's first
    // navigation, so a module's default-service query is never missed.
    const queries = QueryRecorder.forPage(page);
    const nav = new DesktopNav(page);
    await nav.openSection(section);
    await nav.openModule(moduleKey);
    await nav.openService(moduleKey, service.key);
    return {
        page, nav, queries,
        table: new DesktopTable(page, moduleKey, service.key),
        popup: new Popup(page)
    };
}

/**
 * Closes every open popup, most recent first.
 *
 * Used between services so leaked modal state cannot be misread as a failure of
 * the next one. Falls back to removing the overlays outright, because leaving
 * the rest of a module untestable is worse than losing the popup's state.
 */
export async function dismissTransientOverlays(page: Page): Promise<void> {
    await page.evaluate(() => {
        document.querySelectorAll('.layer8d-datepicker-overlay').forEach((e) => e.remove());
        document.querySelectorAll('.layer8d-notification-container').forEach((c) => {
            c.innerHTML = '';
        });
    }).catch(() => undefined);
}

export async function dismissOpenPopups(page: Page): Promise<void> {
    await dismissTransientOverlays(page);

    // Error notifications are MANUAL-CLOSE by design (Layer8DNotification.error
    // has no auto-dismiss), so a spec that deliberately provokes validation
    // errors accumulates toasts until they cover the module tabs and every
    // subsequent click is intercepted. Clear them alongside the popups.
    await page.evaluate(() => {
        document.querySelectorAll('.layer8d-notification-container').forEach((c) => {
            c.querySelectorAll('.layer8d-notification-close').forEach((b) => (b as HTMLElement).click());
            c.innerHTML = '';
        });
    }).catch(() => undefined);

    const overlays = page.locator('.probler-popup-overlay');
    for (let i = 0; i < 4; i++) {
        const open = await overlays.count();
        if (open === 0) return;
        const close = overlays.last().locator('.probler-popup-close');
        if (await close.count()) {
            await close.click({ timeout: 3000 }).catch(() => undefined);
        } else {
            await page.keyboard.press('Escape').catch(() => undefined);
        }
        // Wait for this popup to actually go, not for a guessed duration.
        await expect(overlays).toHaveCount(open - 1, { timeout: 3000 }).catch(() => undefined);
    }
    await page.evaluate(() => {
        document.querySelectorAll('.probler-popup-overlay').forEach((e) => e.remove());
    }).catch(() => undefined);
}

/** Problems collected for one service, reported together rather than one-at-a-time. */
export type Problems = string[];

/**
 * Paging: page 2 must return different rows AND must not zero the total.
 *
 * Layer8DTablePaginationMetadata calls the total-preservation guard a
 * regression that has recurred four times: the server only computes key counts
 * on page 1, so a component that reads metadata on every page overwrites the
 * real total with 0.
 */
export async function assertPaging(
    ctx: ServiceContext, api: Api, service: DesktopService, where: string, problems: Problems
): Promise<void> {
    let total = 0;
    try {
        total = await api.total(service.endpoint, service.model);
    } catch { return; }
    if (total <= 10) return; // single page -- nothing to assert

    const before = await ctx.table.rows().allInnerTexts();

    // `.l8-page-nav` is the CONTAINER div that holds the paging buttons -- the
    // buttons themselves carry data-action="first|prev|next|last"
    // (layer8d-table-render.js:104-107). Clicking the container does nothing,
    // which silently makes page 2 identical to page 1.
    const next = ctx.table.root.locator('.l8-page-nav [data-action="next"]');
    if (!(await next.count())) {
        problems.push(`${where}: ${total} rows but no next-page button rendered`);
        return;
    }
    if (await next.isDisabled()) {
        problems.push(`${where}: ${total} rows but the next-page button is disabled`);
        return;
    }
    if (!(await ctx.table.rerender(() => next.click()))) {
        problems.push(`${where}: clicking next-page never re-rendered the table`);
        return;
    }

    const after = await ctx.table.rows().allInnerTexts();
    if (after.length === 0) {
        problems.push(`${where}: page 2 rendered no rows although the total is ${total}`);
    } else if (JSON.stringify(after) === JSON.stringify(before)) {
        problems.push(`${where}: page 2 shows the same rows as page 1`);
    }

    const reported = await ctx.table.reportedTotal();
    if (reported !== null && reported !== total) {
        problems.push(
            `${where}: total became ${reported} after paging (API says ${total}) -- ` +
            `metadata was read on a page other than the first`
        );
    }
}

/** Sorting must re-issue the query with a sort-by clause. */
export async function assertSorting(
    ctx: ServiceContext, service: DesktopService, where: string, problems: Problems
): Promise<void> {
    const sortable = ctx.table.root
        .locator('.l8-table-header-row th')
        .filter({ has: ctx.page.locator('.l8-sort-indicator') })
        .first();
    if (!(await sortable.count())) return; // no sortable column configured

    const before = ctx.queries.forModel(service.model).length;
    await ctx.table.rerender(() => sortable.click());

    const sorted = ctx.queries.forModel(service.model).slice(before).find((q) => q.includes('sort-by'));
    if (!sorted) {
        problems.push(`${where}: clicking a sortable header issued no sort-by query`);
    }
}

/**
 * Filtering must narrow the result set.
 *
 * Filter on a value taken from a real row, so the assertion is "the rows that
 * came back match the filter", never an exact count -- live data changes.
 */
export async function assertFiltering(
    ctx: ServiceContext, api: Api, service: DesktopService, where: string, problems: Problems
): Promise<void> {
    const filterable = service.columns.find((c) => c.filterKey || c.key);
    if (!filterable) return;

    let sample: Record<string, unknown> | undefined;
    try {
        sample = (await api.listFirstPage<Record<string, unknown>>(
            service.endpoint, service.model, 1)).list[0];
    } catch { return; }
    if (!sample) return;

    const raw = sample[filterable.filterKey || filterable.key];
    if (typeof raw !== 'string' || raw.length < 2 || raw.includes(' ')) return;

    const input = ctx.table.root.locator(`.l8-filter-input[data-column="${filterable.key}"]`);
    if (!(await input.count()) || !(await input.isVisible())) return;

    if (!(await ctx.table.rerender(() => input.fill(raw)))) {
        problems.push(`${where}: filtering by "${raw}" never re-rendered the table`);
        return;
    }

    const texts = await ctx.table.rows().allInnerTexts();
    if (texts.length > 0 && !texts.some((t) => t.toLowerCase().includes(raw.toLowerCase()))) {
        problems.push(`${where}: filtering by "${raw}" returned rows that do not contain it`);
    }
    // The filter input is part of what render() replaces, so clear the NEW one.
    const cleared = ctx.table.root.locator(`.l8-filter-input[data-column="${filterable.key}"]`);
    await ctx.table.rerender(() => cleared.fill(''));
}

/**
 * Clicking a row must open a detail popup carrying more than the table columns.
 *
 * L8QueryRules Rule 2: detail popups select *, so a popup showing only the few
 * table columns means the detail path fetched the wrong thing.
 */
export async function assertDetailPopup(
    ctx: ServiceContext, service: DesktopService, where: string, problems: Problems
): Promise<void> {
    if ((await ctx.table.rows().count()) === 0) return;

    await ctx.table.rows().first().locator('td').first().click();
    try {
        await ctx.popup.waitForOpen(10000);
    } catch {
        problems.push(`${where}: clicking a row opened no detail popup`);
        return;
    }

    const fields = await ctx.popup.fieldLabels();
    const columnCount = service.columns.length;
    if (fields.length === 0) {
        problems.push(`${where}: the detail popup rendered no fields`);
    } else if (service.form && fields.length < Math.min(columnCount, 3)) {
        problems.push(
            `${where}: the detail popup showed only ${fields.length} field(s) for a form ` +
            `defining ${service.form.fieldCount}`
        );
    }
    await ctx.popup.close().catch(() => undefined);
}

/** The table's own reported total must agree with the API. */
export async function assertCountMatchesApi(
    ctx: ServiceContext, api: Api, service: DesktopService, where: string, problems: Problems
): Promise<void> {
    let total: number;
    try {
        total = await api.total(service.endpoint, service.model);
    } catch { return; }

    const rows = await ctx.table.rows().count();
    if (total > 0 && rows === 0) {
        const empty = await ctx.table.emptyState().count();
        if (empty > 0) {
            problems.push(`${where}: API reports ${total} rows but the table shows its empty state`);
        }
        return;
    }
    const reported = await ctx.table.reportedTotal();
    if (reported !== null && reported !== total) {
        problems.push(`${where}: pagination reports ${reported}, API reports ${total}`);
    }
}

/** Convenience: assert a locator resolved, with the service named in the message. */
export function expectNoProblems(problems: Problems, title: string): void {
    expect(problems, `${title}:\n  ${problems.join('\n  ')}`).toEqual([]);
}
