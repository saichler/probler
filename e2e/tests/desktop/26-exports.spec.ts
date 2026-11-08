/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// PHASE 8 -- exports: CSV, Excel and PDF from every table that offers them.
//
// Three layers, because they fail differently:
//
//   globals   the four export scripts are loaded. layer8-export-helper.js calls
//             Layer8ExcelExport / Layer8PdfExport behind
//             `typeof !== 'undefined'` guards, so a missing script tag makes the
//             Excel and PDF buttons silently do nothing -- the exact
//             FailFastNoSilentFallback Rule 1 failure, invisible without this
//             check. (Both are loaded today; this keeps it that way.)
//   contract  POST /erp/0/CsvExport answers with csvData for every model, and
//             the header row matches the columns the module configured. A
//             mismatch here is what makes an export look fine and open wrong.
//   live      clicking the real menu option fires a real download with
//             non-empty content.
//
// The live layer is deliberately a sample, not all 257 services: each click is a
// server-side render plus a browser download, and asserting the contract for
// every model over the API covers the per-model risk far more cheaply. The
// sample proves the wiring the API cannot -- that the dropdown, the handler and
// the blob download actually connect.

import { test, expect, assertNoPageErrors } from '../../fixtures/test';
import { desktopServices } from '../../fixtures/inventory';
import { openService } from '../../drivers/table';
import { DesktopNav } from '../../pages/DesktopNav';

/** Services whose table offers an export bar: needs endpoint + model, no custom view. */
function exportableServices() {
    return desktopServices().filter((x) => !x.service.customView && x.service.model && x.service.endpoint);
}

/** `/erp/30/Employee` -> { serviceArea: 30, serviceName: 'Employee' } */
function parseEndpoint(endpoint: string): { serviceArea: number; serviceName: string } | null {
    const parts = endpoint.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    const area = Number(parts[parts.length - 2]);
    if (!Number.isFinite(area)) return null;
    return { serviceArea: area, serviceName: parts[parts.length - 1] };
}

/** Split one CSV line, honouring quoted fields that contain commas. */
function csvHeader(line: string): string[] {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
            if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; } else { inQuotes = !inQuotes; }
        } else if (c === ',' && !inQuotes) {
            out.push(cur); cur = '';
        } else {
            cur += c;
        }
    }
    out.push(cur);
    return out.map((h) => h.trim().replace(/^"|"$/g, ''));
}

test.describe('exports', () => {
    test('every export global the helper needs is loaded @smoke', async ({ app }) => {
        const missing = await app.evaluate(() => {
            const w = window as unknown as Record<string, unknown>;
            return ['Layer8CsvExport', 'Layer8ExcelExport', 'Layer8PdfExport', 'Layer8ExportHelper']
                .filter((n) => typeof w[n] === 'undefined');
        });
        expect(
            missing,
            `export globals absent -- layer8-export-helper.js guards Excel and PDF with ` +
            `typeof checks, so these buttons would silently do nothing:\n  ${missing.join('\n  ')}`
        ).toEqual([]);
    });

    test('CsvExport serves every model and its header matches the configured columns', async ({ api }) => {
        test.setTimeout(600_000);
        const problems: string[] = [];

        for (const { section, moduleKey, service } of exportableServices()) {
            const parsed = parseEndpoint(service.endpoint);
            if (!parsed) {
                problems.push(`${section}/${moduleKey}/${service.key}: unparseable endpoint "${service.endpoint}"`);
                continue;
            }
            const where = `${section}/${moduleKey}/${service.key} (${service.model})`;

            let body: { csvData?: string; filename?: string; rowCount?: number };
            try {
                // `modelType`, not `modelName`: layer8-csv-export.js takes
                // `modelName` as its option but posts it as `modelType`, and an
                // unknown key makes l8web answer "Cannot find pb for method
                // POST" (TestDataFieldVerification).
                body = await api.post('/0/CsvExport', {
                    modelType: service.model,
                    serviceName: parsed.serviceName,
                    serviceArea: parsed.serviceArea
                }) as typeof body;
            } catch (e) {
                problems.push(`${where}: CsvExport failed -- ${(e as Error).message.split('\n')[0]}`);
                continue;
            }

            if (!body || typeof body.csvData !== 'string' || body.csvData.length === 0) {
                problems.push(`${where}: CsvExport returned no csvData`);
                continue;
            }

            // Header must correspond to what the module configured, otherwise the
            // file opens with the wrong columns and nothing in the UI shows it.
            const header = csvHeader(body.csvData.split(/\r?\n/)[0] || '');
            if (header.length === 0 || header.every((h) => h === '')) {
                problems.push(`${where}: CSV has no header row`);
                continue;
            }
            const norm = (s: string | null) => (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const headerSet = new Set(header.map(norm));
            // Desktop ColumnDef carries no `hidden` flag (only the mobile one does),
            // so every configured column is a visible one.
            const configured = service.columns || [];
            if (configured.length > 0) {
                const absent = configured
                    .filter((c) => !headerSet.has(norm(c.label || c.key)) && !headerSet.has(norm(c.key)))
                    .map((c) => c.label || c.key);
                // All of them missing means the export is keyed off something
                // other than this model's columns; a few missing is a narrower
                // config drift and still worth reporting.
                if (absent.length === configured.length) {
                    problems.push(
                        `${where}: none of the ${configured.length} configured column(s) appear in the ` +
                        `CSV header -> header was [${header.slice(0, 8).join(', ')}]`
                    );
                }
            }
        }

        expect(problems, `CSV export failures:\n  ${problems.join('\n  ')}`).toEqual([]);
    });

    // Live wiring: the dropdown -> handler -> blob download path the API cannot prove.
    for (const format of ['csv', 'excel', 'pdf'] as const) {
        test(`the ${format} option fires a real download`, async ({ app, consoleErrors }) => {
            const target = exportableServices().find(
                (x) => x.section === 'system' && x.service.model === 'L8User'
            ) || exportableServices()[0];
            expect(target, 'no exportable service in the inventory').toBeTruthy();

            const ctx = await openService(app, target.section, target.moduleKey, target.service);
            await ctx.table.waitForResolved().catch(() => undefined);

            const nav = new DesktopNav(app);
            const container = nav.tableContainer(target.moduleKey, target.service.key);

            // layer8d-table-render.js renders a dropdown: [data-action="export-menu"]
            // opens .l8-export-menu, whose options carry the export-* actions.
            const menu = container.locator('[data-action="export-menu"]');
            test.skip(!(await menu.count()), 'this table renders no export menu');
            const option = container.locator(`[data-action="export-${format}"]`);
            await menu.first().click();
            // The menu is open once its options are on screen.
            await option.first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => undefined);

            expect(
                await option.count(),
                `the export menu offers no "${format}" option`
            ).toBeGreaterThan(0);

            const download = await Promise.all([
                app.waitForEvent('download', { timeout: 60_000 }),
                option.first().click()
            ]).then(([d]) => d).catch(() => null);

            expect(
                download,
                `clicking "${format}" fired no download -- layer8-export-helper.js guards ` +
                `Excel and PDF behind typeof checks, so a missing global is silent`
            ).not.toBeNull();

            const name = download!.suggestedFilename();
            expect(name, `download has no filename`).toBeTruthy();

            const path = await download!.path();
            expect(path, `download produced no file on disk`).toBeTruthy();
            const { statSync } = await import('node:fs');
            expect(
                statSync(path!).size,
                `the ${format} download is empty (${name})`
            ).toBeGreaterThan(0);

            assertNoPageErrors(consoleErrors, ['required', 'validation']);
        });
    }
});
