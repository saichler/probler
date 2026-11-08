/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// PHASE 10 -- realtime.
//
// Every screen is live: l8ui tables, data-source views and their mobile
// counterparts default to realtime (a server-side view registers its query with
// `register=true` and applies pushed changes in place; `realtime: false` opts
// out). The server pushes a change only to sessions whose REGISTERED query
// matches the record, so every probe here registers before it mutates.
//
//   1. the client is wired      -- Layer8DWebSocket loaded and connected
//   2. a subscription delivers  -- register, subscribe, mutate over the API from
//                                  a second client, the callback fires
//   3. a screen is live         -- an open table shows a row another client
//                                  created and drops it when that client
//                                  deletes it, with no re-fetch
//   4. live slots               -- at most 5 components are live; opening a
//                                  6th unregisters the oldest, which then
//                                  stops receiving changes

import { test, expect } from '../../fixtures/test';
import { DesktopNav } from '../../pages/DesktopNav';
import { DesktopTable } from '../../pages/DesktopTable';
import { QueryRecorder } from '../../fixtures/queries';

// KNOWN UPSTREAM BUG (l8orm persist/OrmCache.go cacheFetch): an ORM service
// whose cache is EMPTY returns before cache.Fetch, which is where the live
// subscription is registered -- so a table over an empty model never goes
// live. AlarmFilter starts empty in probler, so the push-path specs keep one
// anchor row alive; the empty-table case is tracked by its own test.fail().
const ANCHOR = `E2EANCHOR${Date.now()}`;

test.describe('realtime', () => {
    let anchorId = '';
    test.beforeEach(async ({ api }) => {
        if (anchorId) return;
        await api.post('/10/AlmFilter', { name: ANCHOR, owner: 'operator', description: 'realtime anchor' });
        const r = await api.query('/10/AlmFilter', `select * from AlarmFilter where name=${ANCHOR}`);
        anchorId = String(r.list[0]?.filterId ?? '');
    });
    test.afterAll(async ({ api }) => {
        if (anchorId) await api.deleteById('/10/AlmFilter', 'AlarmFilter', 'filterId', anchorId).catch(() => undefined);
    });

    test('the websocket client is loaded and connects @smoke', async ({ app }) => {
        // app.js calls init() during boot; wait for the upgrade to report
        // connected rather than racing it.
        await app.waitForFunction(() => {
            const w = window as unknown as { Layer8DWebSocket?: { isConnected?(): boolean } };
            return !w.Layer8DWebSocket || !!w.Layer8DWebSocket.isConnected?.();
        }, null, { timeout: 10000 }).catch(() => undefined);   // asserted below
        const state = await app.evaluate(() => {
            const w = window as unknown as {
                Layer8DWebSocket?: { isConnected?(): boolean; subscribe?: unknown };
            };
            if (!w.Layer8DWebSocket) return { present: false, connected: false };
            return { present: true, connected: !!w.Layer8DWebSocket.isConnected?.() };
        });

        expect(
            state.present,
            'Layer8DWebSocket is not on window -- layer8d-websocket.js is missing from ' +
            'app.html, and layer8d-data-source.js guards on it with typeof, so every ' +
            'realtime subscription would silently never fire'
        ).toBe(true);
        expect(
            state.connected,
            'Layer8DWebSocket never reported connected -- /ws refused the authenticated ' +
            'upgrade (the server side is l8web WebSocketManager / WsNotifyService)'
        ).toBe(true);
    });

    test('a subscription receives a notification for a real mutation', async ({ app, api }) => {
        // Register exactly the way a live view does, then subscribe, then mutate
        // over the API from this process -- genuinely a second client, which is
        // what makes the multicast path real. JobFamily is an ordinary
        // ORM-backed service; L8ImportTemplate (/0/ImprtTmpl) was used before
        // and pushes nothing even to a registered query.
        const registered = await app.evaluate(async () => {
            const w = window as unknown as {
                Layer8DWebSocket: { subscribe(m: string, cb: (p: unknown) => void): () => void };
                Layer8DConfig: { resolveEndpoint(p: string): string };
                getAuthHeaders(): Record<string, string>;
                __e2eHits?: unknown[];
                __e2eUnsub?: () => void;
            };
            w.__e2eHits = [];
            w.__e2eUnsub = w.Layer8DWebSocket.subscribe('AlarmFilter', (payload) => {
                w.__e2eHits!.push(payload);
            });
            const q = encodeURIComponent(JSON.stringify({
                text: 'select * from AlarmFilter limit 10 page 0',
                register: 'L8_REGISTER_REGISTER', registerId: 'e2e-subscription-probe' }));
            const r = await fetch(w.Layer8DConfig.resolveEndpoint('/10/AlmFilter') + '?body=' + q,
                { headers: w.getAuthHeaders() });
            return r.status;
        });
        expect(registered, 'registering the query failed').toBe(200);

        const code = `E2ESUB${Date.now()}`;
        let id = '';
        try {
            await api.post('/10/AlmFilter', { name: code, owner: 'operator', description: 'realtime probe' });
            const created = await api.query('/10/AlmFilter', `select * from AlarmFilter where name=${code}`);
            id = String(created.list[0]?.filterId ?? '');

            await app.waitForFunction(
                () => (window as unknown as { __e2eHits: unknown[] }).__e2eHits.length > 0,
                null, { timeout: 15000 }
            ).catch(() => undefined);   // asserted below
            const hits = await app.evaluate(
                () => (window as unknown as { __e2eHits: unknown[] }).__e2eHits.length);

            expect(
                hits,
                'the websocket delivered no notification for a real POST to a registered ' +
                'query -- the path is browser socket -> L8Bus multicast -> WsNotifyService -> ' +
                'subscribe() callback, and a break anywhere in it makes every screen static'
            ).toBeGreaterThan(0);
        } finally {
            await app.evaluate(async () => {
                const w = window as unknown as {
                    __e2eUnsub?: () => void;
                    Layer8DConfig: { resolveEndpoint(p: string): string };
                    getAuthHeaders(): Record<string, string>;
                };
                if (typeof w.__e2eUnsub === 'function') w.__e2eUnsub();
                // Drop the probe's registration the way an evicted component does.
                const q = encodeURIComponent(JSON.stringify({
                    text: 'select * from AlarmFilter limit 10 page 0',
                    register: 'L8_REGISTER_UNREGISTER', registerId: 'e2e-subscription-probe' }));
                await fetch(w.Layer8DConfig.resolveEndpoint('/10/AlmFilter') + '?body=' + q,
                    { headers: w.getAuthHeaders() });
            }).catch(() => undefined);
            // Always remove the probe row, even if the assertion above failed.
            if (id) await api.deleteById('/10/AlmFilter', 'AlarmFilter', 'filterId', id).catch(() => undefined);
        }
    });

    test('an open table shows another client\'s add and delete without re-fetching', async ({ app, api }) => {
        const nav = new DesktopNav(app);
        await nav.openSection('alarms');
        await nav.openModule('alarms');
        await nav.openService('alarms', 'alarm-filters');
        const table = new DesktopTable(app, 'alarms', 'alarm-filters');
        await table.waitForResolved();

        const code = `E2ERT${Date.now()}`;
        const row = table.root.locator('.l8-table tbody tr').filter({ hasText: code });
        const queries = QueryRecorder.forPage(app);
        let id = '';
        try {
            const before = queries.forModel('AlarmFilter').length;
            await api.post('/10/AlmFilter', { name: code, owner: 'operator', description: 'realtime probe' });
            const created = await api.query('/10/AlmFilter', `select * from AlarmFilter where name=${code}`);
            id = String(created.list[0]?.filterId ?? '');

            // A live add lands at the top of page 1, straight from the push.
            await expect(row, 'the row another client created never appeared in the open table')
                .toHaveCount(1, { timeout: 15000 });

            await api.deleteById('/10/AlmFilter', 'AlarmFilter', 'filterId', id);
            id = '';
            await expect(row, 'the row another client deleted is still in the open table')
                .toHaveCount(0, { timeout: 15000 });

            expect(
                queries.forModel('AlarmFilter').length,
                'the table re-fetched to show the change -- live updates must apply the pushed record'
            ).toBe(before);
        } finally {
            if (id) await api.deleteById('/10/AlmFilter', 'AlarmFilter', 'filterId', id).catch(() => undefined);
        }
    });

    test('only the 5 most recently used components stay live; the oldest is unregistered', async ({ app }) => {
        const unregistered: string[] = [];
        const onRequest = (r: { url(): string }) => {
            const body = new URL(r.url()).searchParams.get('body');
            if (!body || !body.includes('L8_REGISTER_UNREGISTER')) return;
            unregistered.push(JSON.parse(body).registerId);
        };
        app.on('request', onRequest);
        const live = () => app.evaluate(() =>
            (window as unknown as { Layer8DWebSocket: { liveIds(): string[] } }).Layer8DWebSocket.liveIds());
        const idOf = (module: string, svc: string) => `${module}-${svc}-table-container`;

        try {
            const nav = new DesktopNav(app);
            // Each module's default service registers on entry, so this walk
            // makes exactly these five tables live, oldest first.
            const walk: [string, string][] = [
                ['alarms', 'alarms'], ['alarms', 'alarm-definitions'], ['alarms', 'alarm-filters'],
                ['events', 'events'], ['correlation', 'correlation-rules']
            ];
            await nav.openSection('alarms');
            for (const [mod, svc] of walk) {
                await nav.openModule(mod);
                await nav.openService(mod, svc);
                await new DesktopTable(app, mod, svc).waitForResolved();
            }
            expect(await live(), 'the five most recently used tables')
                .toEqual(walk.map(([m, s]) => idOf(m, s)));

            await nav.openModule('policies');
            await new DesktopTable(app, 'policies', 'notification-policies').waitForResolved();
            await expect
                .poll(() => unregistered, { timeout: 10000, message: 'Active Alarms was never unregistered' })
                .toContain(idOf('alarms', 'alarms'));

            const ids = await live();
            expect(ids.length, `live slots: ${ids.join(', ')}`).toBe(5);
            expect(ids).not.toContain(idOf('alarms', 'alarms'));
            expect(ids).toContain(idOf('alarms', 'alarm-definitions'));
            expect(unregistered, 'a component that is still live was unregistered')
                .not.toContain(idOf('alarms', 'alarm-definitions'));
        } finally {
            app.off('request', onRequest);
        }
    });

    test('the dashboard KPIs share one live slot @smoke', async ({ app }) => {
        // Phase 3 (live screens): custom screens join a live slot instead of
        // bare subscribe(). Every KPI query must carry register=Register and
        // registerId=dashboard, and the slot must be live while it is shown.
        const nav = new DesktopNav(app);
        const bodies: string[] = [];
        const onRequest = (r: { url(): string }) => {
            const body = new URL(r.url()).searchParams.get('body');
            // Only the dashboard's KPI queries: the network section's table
            // (opened first) issues paged NetworkDevice queries of its own.
            if (body && /from (NetworkDevice where Id=\*|GpuDevice where Id=\*|K8SCluster)/.test(body) &&
                !body.includes('table')) bodies.push(body);
        };
        app.on('request', onRequest);
        try {
            await nav.openSection('network');
            await nav.openSection('dashboard');
            await expect.poll(() => bodies.length, { message: 'the dashboard issued no KPI query' })
                .toBeGreaterThanOrEqual(3);
            for (const b of bodies) {
                const q = JSON.parse(b);
                expect(q.register, `KPI query not registered: ${b}`).toBe('L8_REGISTER_REGISTER');
                expect(q.registerId, `KPI query outside the dashboard slot: ${b}`).toBe('dashboard');
            }
            const ids = await app.evaluate(() =>
                (window as unknown as { Layer8DWebSocket: { liveIds(): string[] } }).Layer8DWebSocket.liveIds());
            expect(ids).toContain('dashboard');
        } finally {
            app.off('request', onRequest);
        }
    });

    test('a live query over an EMPTY ORM model still registers', async ({ app, api }) => {
        test.fail(true, 'l8orm cacheFetch skips subscription registration while the cache is empty');
        // EscalationPolicy is empty on a fresh cluster.
        const before = await api.total('/10/EscPolicy', 'EscalationPolicy');
        expect(before, 'precondition: EscalationPolicy must be empty').toBe(0);
        await app.evaluate(async () => {
            const w = window as unknown as {
                Layer8DWebSocket: { subscribe(m: string, cb: (p: unknown) => void): () => void };
                Layer8DConfig: { resolveEndpoint(p: string): string };
                getAuthHeaders(): Record<string, string>;
                __e2eEmptyHits?: unknown[];
            };
            w.__e2eEmptyHits = [];
            w.Layer8DWebSocket.subscribe('EscalationPolicy', (p) => w.__e2eEmptyHits!.push(p));
            const q = encodeURIComponent(JSON.stringify({ text: 'select * from EscalationPolicy limit 10 page 0',
                register: 'L8_REGISTER_REGISTER', registerId: 'e2e-empty-probe' }));
            await fetch(w.Layer8DConfig.resolveEndpoint('/10/EscPolicy') + '?body=' + q, { headers: w.getAuthHeaders() });
        });
        const name = `E2EEMPTY${Date.now()}`;
        await api.post('/10/EscPolicy', { name, status: 1 });
        try {
            await app.waitForFunction(() => ((window as unknown as { __e2eEmptyHits: unknown[] }).__e2eEmptyHits.length > 0),
                null, { timeout: 10000 });
        } finally {
            const r = await api.query('/10/EscPolicy', `select * from EscalationPolicy where name=${name}`);
            for (const row of r.list) await api.deleteById('/10/EscPolicy', 'EscalationPolicy', 'policyId', String(row.policyId));
        }
    });
});
