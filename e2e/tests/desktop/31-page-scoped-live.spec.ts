/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// Page-scoped live notifications (plans/websocket-page-scoped-notifications.md).
//
// At scale (30K network devices) the Network Devices table blinked constantly:
// every device write anywhere was broadcast to every browser without its
// record, and each browser re-fetched and re-rendered its page. Now the server
// pushes a change only to a view whose displayed page it belongs to, and the
// table patches an updated row in place.
//
// While the simulated devices keep being polled (their uptime changes every
// cycle), page 1 must:
//   - receive pushes only for the devices it displays -- never for the
//     devices on the next page;
//   - receive some (the pipeline is live);
//   - never re-fetch its page to apply them.
//
// Needs more devices than one page: the l8opensim simulator (k8s/sim-start.sh)
// provides 19, page 1 shows 15.

import { test, expect, waitForDesktopReady } from '../../fixtures/test';
import { DesktopNav } from '../../pages/DesktopNav';
import { DesktopTable } from '../../pages/DesktopTable';
import { QueryRecorder } from '../../fixtures/queries';
import { recordWsPushes, ipsIn } from '../../fixtures/wspushes';

const CONTAINER = '#network-devices-table';
const WATCH_MS = 60000;

test('network devices page 1 gets only its own devices\' changes, applied without re-fetching', async ({ freshApp: app, api }) => {
    test.setTimeout(WATCH_MS + 90000);
    const total = await api.total('/0/NCache', 'NetworkDevice');
    expect(total, 'needs more network devices than one page (15) -- start l8opensim with k8s/sim-start.sh')
        .toBeGreaterThan(15);

    // Record from the socket's first frame: attach, then reload.
    const pushes = recordWsPushes(app);
    await app.reload();
    await waitForDesktopReady(app);

    await new DesktopNav(app).openSection('network');
    const table = new DesktopTable(app, CONTAINER);
    expect(await table.waitForResolved()).toBe('rows');
    const shown = ipsIn(await table.rows().allInnerTexts());
    expect(shown.size, 'page 1 should show a full page of devices').toBe(15);

    const queries = QueryRecorder.forPage(app);
    const fetchesBefore = queries.forModel('NetworkDevice').length;
    const pushesBefore = pushes.length;
    await app.waitForTimeout(WATCH_MS);

    const seen = pushes.slice(pushesBefore).filter((p) => p.modelType === 'NetworkDevice');
    const offPage = [...new Set(seen.filter((p) => !shown.has(p.primaryKey)).map((p) => p.primaryKey))];
    expect(offPage, 'the server pushed changes of devices not on the displayed page -- ' +
        'notifications must be scoped to the subscriber\'s page (l8utils cache Subscription.wants)').toEqual([]);
    expect(seen.length, `no network device change reached page 1 in ${WATCH_MS / 1000}s while the ` +
        'devices were being polled -- the live pipeline is not delivering').toBeGreaterThan(0);
    expect(queries.forModel('NetworkDevice').length - fetchesBefore,
        'the table re-fetched its page to apply pushed updates -- updates of displayed rows are ' +
        'applied in place from the pushed record').toBe(0);
    expect(ipsIn(await table.rows().allInnerTexts()), 'the displayed page changed').toEqual(shown);
});
