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
// A device on page 1 is changed for real: its polling target is stopped (the
// collector reports the device down), held down for 5 seconds, and started
// again (the device is polled back up). Page 1 must:
//   - receive a push for the device on the stop and again on the start;
//   - receive pushes only for the devices it displays -- never for the
//     devices on the next page;
//   - never re-fetch its page to apply them.
//
// Needs more devices than one page: the l8opensim simulator (k8s/sim-start.sh)
// provides 19, page 1 shows 15.

import { test, expect, waitForDesktopReady } from '../../fixtures/test';
import { DesktopNav } from '../../pages/DesktopNav';
import { DesktopTable } from '../../pages/DesktopTable';
import { QueryRecorder } from '../../fixtures/queries';
import { recordWsPushes, ipsIn } from '../../fixtures/wspushes';
import { targetOfIp, setTargetState, waitForDevicePush, TARGET_DOWN, TARGET_UP } from '../../fixtures/targets';

const CONTAINER = '#network-devices-table';
const HOLD_DOWN_MS = 5000;

test('network devices page 1 gets only its own devices\' changes, applied without re-fetching', async ({ freshApp: app, api }) => {
    test.setTimeout(360000);
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
    // The table's own page query (15 per page). The dashboard's device-count card
    // also listens to NetworkDevice pushes and re-reads its count (`limit 1`),
    // which is not a page re-fetch.
    const pageQueries = () => queries.forModel('NetworkDevice').filter((q) => / limit 15 page \d+/.test(q));
    const fetchesBefore = pageQueries().length;
    const pushesBefore = pushes.length;

    const ip = [...shown].sort()[0];
    const target = await targetOfIp(api, ip);
    let stopped = false;
    try {
        await setTargetState(api, target.targetId, TARGET_DOWN);
        stopped = true;
        const stoppedAt = Date.now();
        const afterStop = await waitForDevicePush(pushes, pushesBefore, ip, 'stopped');
        await expect.poll(() => Date.now() - stoppedAt >= HOLD_DOWN_MS).toBe(true);
        await setTargetState(api, target.targetId, TARGET_UP);
        stopped = false;
        await waitForDevicePush(pushes, afterStop, ip, 'started');
    } finally {
        if (stopped) await setTargetState(api, target.targetId, TARGET_UP);
    }

    const seen = pushes.slice(pushesBefore).filter((p) => p.modelType === 'NetworkDevice');
    const offPage = [...new Set(seen.filter((p) => !shown.has(p.primaryKey)).map((p) => p.primaryKey))];
    expect(offPage, 'the server pushed changes of devices not on the displayed page -- ' +
        'notifications must be scoped to the subscriber\'s page (l8utils cache Subscription.wants)').toEqual([]);
    expect(pageQueries().length - fetchesBefore,
        'the table re-fetched its page to apply pushed updates -- updates of displayed rows are ' +
        'applied in place from the pushed record' + ` (pushes: ${seen.map((x) => `${x.action}:${x.primaryKey}${x.hasRecord ? '' : '(no record)'}`).join(', ')}; re-fetches: ${pageQueries().slice(fetchesBefore).join(' | ')})`).toBe(0);
    expect(ipsIn(await table.rows().allInnerTexts()), 'the displayed page changed').toEqual(shown);
});
