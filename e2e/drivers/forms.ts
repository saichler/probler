/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// Shared form assertions for both platforms.
//
// The contract a form must meet, independent of which model it belongs to:
//   - every configured section and field renders,
//   - each field type renders the control that type implies,
//   - required fields are marked and block an empty save,
//   - readOnly fields render display-only and are skipped on collection,
//   - reference fields offer a picker, not a raw text box.
//
// EnumRendererColumnCascade is the reason this is worth asserting for all 254
// forms rather than a sample: a TypeError in one module's enums IIFE leaves
// that module's forms undefined, and the failure is silent unless something
// opens the form and looks.

import { Page, expect } from '@playwright/test';
import { Popup } from '../pages/Popup';
import { DesktopTable } from '../pages/DesktopTable';
import { FormDef, FormField, DesktopService } from '../fixtures/inventory';
import { uiValue } from '../fixtures/formdata';
import { Problems, dismissTransientOverlays } from './table';
import { Api, safeCleanup } from '../fixtures/api';

/** The control a rendered field of each type is expected to produce. */
const EXPECTED_CONTROL: Record<string, string> = {
    text: 'input',
    textarea: 'textarea',
    number: 'input',
    select: 'select',
    checkbox: 'input[type="checkbox"]',
    date: 'input',
    datetime: 'input',
    time: 'input',
    // money is COMPOUND: layer8d-forms-fields.js:147,156 renders a
    // `<select name="key.__currencyId">` plus an `<input name="key.__amount">`,
    // so the first element matching the key is legitimately a select. Handled
    // by assertCompoundFields instead of a single expected tag.
    money: '*',
    url: 'input',
    ein: 'input',
    ssn: 'input',
    reference: 'input',
    file: 'input',
    period: 'select, input',
    // inlineTable is COMPOUND too: layer8d-forms-fields-ext.js renders the
    // visible child table PLUS a hidden `data-inline-table-data` input that
    // carries the rows as JSON. Matching on the field name finds the hidden
    // input first, so a tag check is meaningless here -- 14-inline-tables.spec
    // asserts the real structure.
    inlineTable: '*'
};

/** Opens the Add form for the current service. Returns false if no Add button. */
export async function openAddForm(
    table: DesktopTable, popup: Popup, where: string, problems: Problems
): Promise<boolean> {
    const add = table.addButton();
    if (!(await add.count()) || !(await add.isVisible())) {
        // No Add button is legitimate for a read-only service or one the user
        // lacks POST on -- the permission spec asserts that separately.
        return false;
    }
    await add.click();
    try {
        await popup.waitForOpen(12000);
        return true;
    } catch {
        problems.push(`${where}: clicking Add opened no form`);
        return false;
    }
}

/**
 * Asserts every configured field of a form rendered.
 *
 * Missing fields are reported by name rather than as a count, because "the form
 * rendered 12 of 19 fields" is not actionable and "budgetAmount, effectiveDate
 * did not render" is.
 */
export async function assertFieldsRender(
    popup: Popup, form: FormDef, where: string, problems: Problems
): Promise<void> {
    const body = popup.body();

    const rendered = await body.evaluate((el) => {
        const names = new Set<string>();
        el.querySelectorAll('[name]').forEach((n) => {
            const v = n.getAttribute('name');
            if (v) names.add(v.split('.')[0]); // compound fields: money -> key.__amount
        });
        el.querySelectorAll('[data-field], [data-inline-table-data]').forEach((n) => {
            const v = n.getAttribute('data-field') || n.getAttribute('data-inline-table-data');
            if (v) names.add(v);
        });
        return [...names];
    });
    const renderedSet = new Set(rendered);

    // readOnly and datetime fields are DISPLAY-ONLY: layer8d-forms-fields.js
    // renders them as a span with no name attribute, and
    // layer8d-forms-data.js:64 never collects them. Looking for `[name=key]`
    // therefore reports every audit block and every datetime as missing.
    // Those are verified by their label instead.
    const labels = (await popup.fieldLabels()).map((l) => l.toLowerCase());

    const missing: string[] = [];
    for (const section of form.sections) {
        for (const f of section.fields) {
            if (f.hidden) continue;

            const displayOnly = f.readOnly || f.type === 'datetime';
            if (displayOnly) {
                const label = (f.label || f.key).toLowerCase();
                if (label && !labels.some((l) => l === label || l.includes(label))) {
                    missing.push(`${f.key}:${f.type}(display-only)`);
                }
                continue;
            }

            if (!renderedSet.has(f.key) && !renderedSet.has(f.key.split('.')[0])) {
                missing.push(`${f.key}:${f.type}`);
            }
        }
    }

    if (missing.length > 0) {
        problems.push(
            `${where}: ${missing.length} configured field(s) did not render -> ${missing.slice(0, 12).join(', ')}` +
            (missing.length > 12 ? ` (+${missing.length - 12} more)` : '')
        );
    }

    // A form that rendered nothing at all is the cascade symptom.
    if (rendered.length === 0 && form.fieldCount > 0) {
        problems.push(
            `${where}: the form rendered NO controls although it defines ${form.fieldCount} ` +
            `field(s) -- its module's forms/enums IIFE most likely threw`
        );
    }
}

/** Asserts each field type produced the control that type implies. */
export async function assertFieldTypes(
    popup: Popup, form: FormDef, where: string, problems: Problems
): Promise<void> {
    const body = popup.body();
    const wrong: string[] = [];

    for (const section of form.sections) {
        for (const f of section.fields) {
            if (f.hidden || f.readOnly) continue;
            const expected = EXPECTED_CONTROL[f.type];
            // '*' marks a compound type whose first matching element is
            // legitimately not the "main" control -- assertCompoundFields
            // checks those properly.
            if (!expected || expected === '*') continue;

            const el = body.locator(`[name="${f.key}"], [name^="${f.key}."]`).first();
            if (!(await el.count())) continue; // already reported by assertFieldsRender

            const tag = await el.evaluate((n) => n.tagName.toLowerCase() +
                (n.getAttribute('type') ? `[type="${n.getAttribute('type')}"]` : ''));
            const ok = expected.split(',').some((e) => tag.startsWith(e.trim().split('[')[0]));
            if (!ok) wrong.push(`${f.key} is ${f.type} but rendered <${tag}>`);
        }
    }
    if (wrong.length > 0) {
        problems.push(`${where}: ${wrong.length} field(s) rendered the wrong control -> ${wrong.slice(0, 8).join('; ')}`);
    }
}

/**
 * Compound fields must render every sub-element they are collected from.
 *
 * CompoundFormFieldDataCollection: a money field is stored as
 * `key.__currencyId` + `key.__amount`. If either is missing, collectFormData
 * silently skips the field and the amount is lost on save with no error.
 */
export async function assertCompoundFields(
    popup: Popup, form: FormDef, where: string, problems: Problems
): Promise<void> {
    const body = popup.body();
    const broken: string[] = [];

    for (const section of form.sections) {
        for (const f of section.fields) {
            if (f.type !== 'money' || f.hidden || f.readOnly) continue;
            const currency = body.locator(`[name="${f.key}.__currencyId"]`);
            const amount = body.locator(`[name="${f.key}.__amount"]`);
            if (!(await currency.count())) broken.push(`${f.key} has no .__currencyId select`);
            if (!(await amount.count())) broken.push(`${f.key} has no .__amount input`);
        }
    }
    if (broken.length > 0) {
        problems.push(`${where}: ${broken.length} money field(s) incomplete -> ${broken.slice(0, 6).join('; ')}`);
    }
}

/** readOnly fields must not be editable -- otherwise the UI offers an edit the backend rejects. */
export async function assertReadOnlyFields(
    popup: Popup, form: FormDef, where: string, problems: Problems
): Promise<void> {
    const body = popup.body();
    const editable: string[] = [];

    for (const key of form.readOnlyKeys) {
        const el = body.locator(`[name="${key}"]`).first();
        if (!(await el.count())) continue;
        const isEditable = await el.evaluate((n) => {
            const input = n as HTMLInputElement;
            return !input.readOnly && !input.disabled && n.tagName !== 'SPAN' && n.tagName !== 'DIV';
        });
        if (isEditable) editable.push(key);
    }
    if (editable.length > 0) {
        problems.push(
            `${where}: readOnly field(s) rendered editable -> ${editable.join(', ')} ` +
            `(ImmutabilityUiAlignment: the UI must not offer an edit the backend will reject)`
        );
    }
}

/**
 * A reference field must be wired for the picker.
 *
 * layer8d-forms-fields.js:448 renders it as a readonly
 * `<input class="reference-input" data-ref-config='{...}' data-lookup-model="X">`
 * -- there is no separate picker button; the input itself opens the picker.
 * What actually decides whether the picker can work is `data-ref-config`
 * carrying a modelName: without it the field is an inert readonly box and
 * l8ui reports "Reference input missing required config".
 */
export async function assertReferencePickers(
    popup: Popup, form: FormDef, where: string, problems: Problems
): Promise<void> {
    const body = popup.body();
    const broken: string[] = [];

    for (const section of form.sections) {
        for (const f of section.fields) {
            if (f.type !== 'reference' || f.hidden) continue;
            const el = body.locator(`[name="${f.key}"]`).first();
            if (!(await el.count())) continue; // reported by assertFieldsRender

            const state = await el.evaluate((n) => {
                const input = n as HTMLInputElement;
                let modelName = '';
                try {
                    modelName = JSON.parse(input.getAttribute('data-ref-config') || '{}').modelName || '';
                } catch { /* malformed config */ }
                return {
                    isReferenceInput: input.classList.contains('reference-input'),
                    lookupModel: input.getAttribute('data-lookup-model') || '',
                    modelName
                };
            });

            if (!state.isReferenceInput) {
                broken.push(`${f.key} rendered as a plain input, not a reference input`);
            } else if (!state.modelName && !state.lookupModel) {
                broken.push(
                    `${f.key}->${f.lookupModel} has no resolvable model in data-ref-config ` +
                    `(missing reference registry entry)`
                );
            }
        }
    }
    if (broken.length > 0) {
        problems.push(`${where}: ${broken.length} reference field(s) not wired -> ${broken.slice(0, 6).join('; ')}`);
    }
}

/**
 * Saving an empty form with required fields must be blocked, visibly.
 *
 * This test can CREATE DATA if the app is broken in exactly the way it is
 * testing for: an empty save that the server accepts writes a junk record. So
 * it snapshots the model's primary keys first and, on an unexpected success,
 * deletes whatever appeared -- otherwise a run across 254 forms could leave
 * hundreds of orphans on a live cluster, which is the pollution
 * PostImplementationE2ETesting warns breaks *other* specs later.
 *
 * The snapshot only costs anything on the failure path.
 */
export async function assertRequiredValidation(
    page: Page, popup: Popup, form: FormDef, service: DesktopService,
    api: Api, where: string, problems: Problems
): Promise<void> {
    if (form.requiredKeys.length === 0) return;

    const pk = service.primaryKey;
    const before = await snapshotKeys(api, service);

    // Filling a date field leaves the datepicker overlay covering the footer.
    await dismissTransientOverlays(page);
    const outcome = await clickSaveAndWaitForOutcome(page, popup);
    if (outcome === 'blocked') return; // validation blocked it -- nothing written

    problems.push(
        `${where}: saving with ${form.requiredKeys.length} empty required field(s) ` +
        `(${form.requiredKeys.slice(0, 4).join(', ')}) neither blocked nor reported an error`
    );

    // It may also have written a record. Find and remove anything new.
    if (!pk || before === null) return;
    const after = await snapshotKeys(api, service);
    if (after === null) return;

    for (const id of after) {
        if (before.has(id)) continue;
        await safeCleanup(`${service.model} ${id} (created by an empty save)`, () =>
            api.deleteById(service.endpoint, service.model, pk, id)
        );
    }
}

/** Selector for every way the app reports a refused save. */
const SAVE_ERROR = '.layer8d-notification-error, .notification-error, .field-error, .form-error';

/**
 * Clicks Save and waits for the app to answer, one way or the other.
 *
 * A save always ends visibly: Layer8DFormsModal reports a client-side
 * validation failure or a server rejection through Layer8DNotification.error,
 * and a successful save closes the popup. So the wait is on whichever of those
 * happens first, never on a guessed duration.
 *
 *   'blocked'  an error was reported, or the popup is still open with nothing
 *              reported once the wait expires (a save that did nothing),
 *   'closed'   the popup closed without an error -- the save was accepted.
 */
export async function clickSaveAndWaitForOutcome(
    page: Page, popup: Popup, timeout = 10000
): Promise<'blocked' | 'closed'> {
    const overlays = page.locator('.probler-popup-overlay');
    const openBefore = await overlays.count();
    const errorsBefore = await page.locator(SAVE_ERROR).count();
    await popup.saveButton().click();

    const seen: { outcome: 'blocked' | 'closed' | 'pending' } = { outcome: 'pending' };
    await expect
        .poll(async () => {
            if ((await page.locator(SAVE_ERROR).count()) > errorsBefore) seen.outcome = 'blocked';
            else if ((await overlays.count()) < openBefore) seen.outcome = 'closed';
            return seen.outcome;
        }, { timeout })
        .not.toBe('pending')
        .catch(() => undefined);
    return seen.outcome === 'closed' ? 'closed' : 'blocked';
}

/** Primary keys currently in a model, or null when they cannot be listed. */
async function snapshotKeys(api: Api, service: DesktopService): Promise<Set<string> | null> {
    const pk = service.primaryKey;
    if (!pk) return null;
    try {
        const res = await api.query<Record<string, unknown>>(
            service.endpoint, `select * from ${service.model} limit 500 page 0`);
        return new Set(res.list.map((r) => String(r[pk] ?? '')).filter(Boolean));
    } catch {
        return null;
    }
}

/**
 * Fills every field that can be filled without a picker, for a smoke create.
 *
 * Selects are included: an unfilled required select blocks validation, so the
 * save silently never fires and the failure looks like a broken form rather
 * than an incomplete payload. Enum zero is UNSPECIFIED (ProtobufRules), so the
 * first non-zero option is chosen.
 */
export async function fillTypeableFields(
    popup: Popup, form: FormDef, tag: string
): Promise<string[]> {
    const filled: string[] = [];
    for (const section of form.sections) {
        for (const f of section.fields as FormField[]) {
            if (f.readOnly || f.hidden) continue;

            // A multi-section form is tabbed and only the active pane is
            // displayed. A control in an inactive pane is 0x0, so fill() and
            // selectOption() cannot act on it and the field stays empty --
            // which then fails validation as an empty REQUIRED field.
            //
            // Compound fields are named `key.__amount`, not `key`, so the
            // reveal has to look for the sub-control or it silently finds
            // nothing and never switches tab.
            const revealSelector = f.type === 'money'
                ? `[name="${f.key}.__amount"]`
                : `[name="${f.key}"]`;
            await popup.revealTabContaining(revealSelector);

            if (f.type === 'money') {
                // money is compound: the editable control is `key.__amount`,
                // with a `key.__currencyId` select beside it. Filling `key`
                // matches nothing, so a REQUIRED money field stays empty and
                // validation silently refuses the save.
                const amount = popup.body().locator(`[name="${f.key}.__amount"]`).first();
                if (await amount.count()) {
                    await amount.fill('15.00').catch(() => undefined);
                    filled.push(f.key);
                }
                const currency = popup.body().locator(`select[name="${f.key}.__currencyId"]`).first();
                if (await currency.count()) {
                    const opts = await currency.locator('option').evaluateAll((os) =>
                        os.map((o) => (o as HTMLOptionElement).value).filter(Boolean));
                    if (opts.length) await currency.selectOption(opts[0]).catch(() => undefined);
                }
                continue;
            }

            if (f.type === 'select') {
                const sel = popup.body().locator(`select[name="${f.key}"]`).first();
                if (!(await sel.count())) continue;
                const values = await sel.locator('option').evaluateAll((os) =>
                    os.map((o) => (o as HTMLOptionElement).value).filter((v) => v && v !== '0'));
                if (values.length === 0) continue;
                await sel.selectOption(values[0]).catch(() => undefined);
                filled.push(f.key);
                continue;
            }
            if (f.type === 'checkbox') {
                const box = popup.body().locator(`[name="${f.key}"]`).first();
                if (await box.count()) await box.check().catch(() => undefined);
                continue;
            }

            const v = uiValue(f, tag);
            if (v === null) continue;
            const el = popup.body().locator(`[name="${f.key}"]`).first();
            if (!(await el.count()) || !(await el.isVisible())) continue;
            await el.fill(v).catch(() => undefined);
            // A date/datetime input opens the datepicker on focus, and its
            // overlay then covers the rest of the form. Remove just that
            // overlay -- pressing Escape here closes the whole POPUP, which
            // silently discards the form and makes the later Save click time
            // out against an element that no longer exists.
            if (f.type === 'date' || f.type === 'datetime' || f.type === 'time') {
                await popup.body().page().evaluate(() => {
                    document.querySelectorAll('.layer8d-datepicker-overlay')
                        .forEach((e) => e.remove());
                }).catch(() => undefined);
            }
            filled.push(f.key);
        }
    }
    return filled;
}
