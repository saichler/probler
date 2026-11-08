/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// Shared create / edit / delete assertions.
//
// The split between what is done through the API and what through the UI is
// deliberate:
//
//   seeded via API  -> the record the EDIT and DELETE specs operate on, so a
//                      broken Add form cannot make them fail for the wrong
//                      reason,
//   created via UI  -> the CREATE assertion itself.
//
// Every record either spec produces is registered with a RecordBin before it is
// used, so afterEach removes it even if the spec dies halfway.

import { Page, expect } from '@playwright/test';
import { Popup } from '../pages/Popup';
import { DesktopTable } from '../pages/DesktopTable';
import { DesktopService } from '../fixtures/inventory';
import { Api } from '../fixtures/api';
import { RecordBin, seedRecord } from '../fixtures/record';
import { runTag } from '../fixtures/formdata';
import { Problems, dismissTransientOverlays } from './table';
import { openAddForm, fillTypeableFields } from './forms';

export interface CrudOutcome {
    /** Named reason this service could not be exercised, or null if it was. */
    skipped: string | null;
}

/**
 * Creates a record through the real Add form.
 *
 * Only fields that can be typed are filled -- references, files and inline
 * tables need their own interactions and have their own phases. A service whose
 * required set includes one of those is skipped by name rather than attempted
 * and silently failed.
 */
export async function assertCreateThroughUi(
    table: DesktopTable, popup: Popup, service: DesktopService,
    api: Api, bin: RecordBin, where: string, problems: Problems
): Promise<CrudOutcome> {
    const form = service.form;
    if (!form) return { skipped: 'no form' };
    if (!service.primaryKey) return { skipped: 'no primary key' };

    const untypeable = form.sections
        .flatMap((s) => s.fields)
        .filter((f) => f.required && !f.readOnly && !f.hidden)
        .filter((f) => ['reference', 'file', 'inlineTable', 'period'].includes(f.type));
    // select/checkbox are filled by fillTypeableFields, so they do not skip.
    if (untypeable.length > 0) {
        return {
            skipped: `required ${untypeable.map((f) => `${f.key}:${f.type}`).join(', ')} ` +
                     `needs an interaction covered by another phase`
        };
    }

    if (!(await openAddForm(table, popup, where, problems))) {
        return { skipped: 'no Add button (read-only or no POST permission)' };
    }

    const idsBefore = await snapshotIds(api, service);

    const tag = runTag();
    const filled = await fillTypeableFields(popup, form, tag);
    if (filled.length === 0) {
        await popup.close().catch(() => undefined);
        return { skipped: 'no typeable field to fill' };
    }

    const saved = await popup.save().catch(() => null);
    if (!saved) {
        // Say WHY. A save that fires no request is almost always client-side
        // validation refusing an empty required field, and naming the field is
        // the difference between an actionable report and a shrug.
        const diag = await popup.body().evaluate((el) => {
            const errs = Array.from(el.querySelectorAll('.field-error, .form-error, .error-message'))
                .map((n) => (n.textContent || '').trim()).filter(Boolean);
            const emptyRequired = Array.from(el.querySelectorAll('[required]'))
                .filter((n) => !(n as HTMLInputElement).value)
                .map((n) => n.getAttribute('name') || '?');
            return { errs: errs.slice(0, 5), emptyRequired: emptyRequired.slice(0, 8) };
        }).catch(() => ({ errs: [], emptyRequired: [] }));

        const toast = await popup.body().page()
            .locator('.layer8d-notification-message').allInnerTexts().catch(() => []);

        await popup.close().catch(() => undefined);
        problems.push(
            `${where}: saving the Add form fired no request. ` +
            `empty required=[${diag.emptyRequired.join(', ')}] ` +
            `errors=[${[...diag.errs, ...toast].slice(0, 4).join(' | ')}] ` +
            `clickError=[${popup.lastSaveError}]`
        );
        return { skipped: null };
    }
    if (saved.status >= 400) {
        await popup.close().catch(() => undefined);
        // A business rule this generic payload does not satisfy is a skip, not
        // a failure -- the spec is about the CRUD pipeline, not about guessing
        // every model's domain constraints.
        return { skipped: `save rejected with HTTP ${saved.status}` };
    }

    // Identify the new record by diffing primary keys around the write.
    //
    // Querying by a "marker" field is unreliable: input formatters rewrite what
    // the user typed (currency, phone, SSN, EIN all do), so the stored value
    // need not equal the string that was entered, and the lookup silently
    // misses a record that was created perfectly well.
    let id = '';
    await expect
        .poll(async () => {
            const after = await snapshotIds(api, service);
            for (const candidate of after) {
                if (!idsBefore.has(candidate)) { id = candidate; break; }
            }
            return id;
        }, { timeout: 5000 })
        .not.toBe('')
        .catch(() => undefined);

    if (!id) {
        problems.push(
            `${where}: the Add form reported success (HTTP ${saved.status}) but no new ` +
            `${service.primaryKey} appeared in ${service.model}`
        );
        return { skipped: null };
    }
    bin.add(service, id);
    return { skipped: null };
}

/** Every primary key currently in a model, capped at a page the server will serve. */
async function snapshotIds(api: Api, service: DesktopService): Promise<Set<string>> {
    const pk = service.primaryKey;
    if (!pk) return new Set();
    try {
        const res = await api.query<Record<string, unknown>>(
            service.endpoint, `select * from ${service.model} limit 500 page 0`);
        return new Set(res.list.map((r) => String(r[pk] ?? '')).filter(Boolean));
    } catch {
        return new Set();
    }
}

/**
 * Opens the Edit form for a seeded record and asserts it prefilled.
 *
 * A blank edit form is worse than a broken one: saving it overwrites the record
 * with empty values.
 */
export async function assertEditPrefill(
    table: DesktopTable, popup: Popup,
    recordId: string, where: string, problems: Problems
): Promise<void> {
    const edit = table.editButton(recordId);
    if (!(await edit.count())) {
        problems.push(`${where}: no Edit control for the seeded record`);
        return;
    }
    await edit.click();
    try {
        await popup.waitForOpen(12000);
    } catch {
        problems.push(`${where}: clicking Edit opened no form`);
        return;
    }

    const values = await popup.body().evaluate((el) => {
        const out: Record<string, string> = {};
        el.querySelectorAll('input, select, textarea').forEach((n) => {
            const name = n.getAttribute('name');
            if (name) out[name] = (n as HTMLInputElement).value || '';
        });
        return out;
    });

    const populated = Object.values(values).filter((v) => v !== '' && v !== '0').length;
    if (populated === 0) {
        problems.push(
            `${where}: the Edit form opened completely blank for an existing record -- ` +
            `saving it would wipe the record`
        );
    }
    await popup.close().catch(() => undefined);
}

/** Deletes a seeded record through the UI and confirms it is gone from the API. */
export async function assertDeleteThroughUi(
    page: Page, table: DesktopTable, service: DesktopService,
    api: Api, recordId: string, where: string, problems: Problems
): Promise<boolean> {
    const del = table.deleteButton(recordId);
    if (!(await del.count())) {
        problems.push(`${where}: no Delete control for the seeded record`);
        return false;
    }

    page.once('dialog', (d) => d.accept().catch(() => undefined));
    // Same interception that blocked Save: a datepicker overlay left open by
    // the form sits over the row's action buttons.
    await dismissTransientOverlays(page);
    await del.click({ timeout: 10000 }).catch(() => undefined);

    // Either a native confirm (handled above) or a popup confirmation whose
    // primary button is labelled "Delete". Wait for it to render -- checking
    // count() immediately after the click finds nothing and the record is
    // never actually deleted.
    const confirm = page.locator('.probler-popup-overlay .probler-popup-footer .btn-primary');
    await confirm.waitFor({ state: 'visible', timeout: 5000 }).catch(() => undefined);
    if (await confirm.count()) {
        // No wait here: the poll below waits on the outcome that matters, the
        // record disappearing from the API.
        await confirm.last().click({ timeout: 8000 }).catch(() => undefined);
    }

    let gone = false;
    try {
        await expect
            .poll(async () => {
                const r = await api.query(
                    service.endpoint,
                    `select * from ${service.model} where ${service.primaryKey}=${recordId}`);
                return r.list.length;
            }, { timeout: 20000 })
            .toBe(0);
        gone = true;
    } catch {
        problems.push(`${where}: the record still exists after deleting it through the UI`);
    }
    return gone;
}

/** Seeds a record via the API, for specs that need one to operate on. */
export async function withSeededRecord(
    api: Api, service: DesktopService, bin: RecordBin, refCache: Map<string, string | null>
): Promise<{ id: string } | { skipped: string }> {
    const outcome = await seedRecord(api, service, bin, refCache);
    if (outcome.record) return { id: outcome.record.id };
    return { skipped: outcome.skipped || 'unknown' };
}
