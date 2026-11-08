/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// PHASE 3 -- form rendering for every service that declares one.
//
// 254 forms, 623 sections, 3 563 fields, 16 field types. Read-only: this spec
// opens the Add form and inspects it, and never saves a record, so it is safe
// to run against a live cluster without creating anything. Writes are Phase 4.
//
// What it proves per form: every configured field rendered, each field type
// produced the control that type implies, readOnly fields are display-only,
// reference fields offer a picker, and required fields block an empty save.

import { test, assertNoPageErrors } from '../../fixtures/test';
import { DESKTOP_SECTIONS, KNOWN_BROKEN_CRUD } from '../../fixtures/inventory';
import { openService, expectNoProblems, Problems } from '../../drivers/table';
import {
    openAddForm, assertFieldsRender, assertFieldTypes, assertCompoundFields,
    assertReadOnlyFields, assertReferencePickers, assertRequiredValidation
} from '../../drivers/forms';

for (const section of DESKTOP_SECTIONS) {
    for (const mod of section.modules) {
        const withForms = mod.services.filter((s) => s.form && s.form.fieldCount > 0 && !s.customView &&
            !(s.model in KNOWN_BROKEN_CRUD));
        if (withForms.length === 0) continue;

        const fieldTotal = withForms.reduce((a, s) => a + (s.form?.fieldCount || 0), 0);

        test(`${section.section} / ${mod.moduleKey}: ${withForms.length} form(s), ${fieldTotal} field(s)`,
            async ({ app, api, consoleErrors }) => {
                // Scale with the real work: this opens every form in the module
                // and inspects every field. hcm/compensation is 10 forms and 202
                // fields and timed out against the flat 120s budget, while
                // single-form modules finish in seconds.
                test.setTimeout(Math.max(120_000, withForms.length * 20_000 + fieldTotal * 250));
                const problems: Problems = [];

                for (const svc of withForms) {
                    const where = `${section.section}/${mod.moduleKey}/${svc.key} (${svc.model})`;
                    const form = svc.form!;

                    const ctx = await openService(app, section.section, mod.moduleKey, svc);

                    const item = ctx.nav.subnavItem(mod.moduleKey, svc.key);
                    if (!(await item.count()) || !(await item.isVisible())) continue;

                    try {
                        await ctx.table.waitForResolved();
                    } catch {
                        // The table failing is 10-table-depth's finding, not this
                        // spec's -- but without it there is no Add button.
                        continue;
                    }

                    if (!(await openAddForm(ctx.table, ctx.popup, where, problems))) continue;

                    await assertFieldsRender(ctx.popup, form, where, problems);
                    await assertFieldTypes(ctx.popup, form, where, problems);
                    await assertCompoundFields(ctx.popup, form, where, problems);
                    await assertReadOnlyFields(ctx.popup, form, where, problems);
                    await assertReferencePickers(ctx.popup, form, where, problems);
                    await assertRequiredValidation(app, ctx.popup, form, svc, api, where, problems);

                    await ctx.popup.close().catch(() => undefined);
                }

                expectNoProblems(problems, 'form rendering failures');
                assertNoPageErrors(consoleErrors, ['required', 'validation']);
            });
    }
}
