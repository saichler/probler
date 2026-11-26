/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// Mobile parity of desktop/31-page-scoped-live.spec.ts
// (plans/websocket-page-scoped-notifications.md): a device on the mobile
// Network Devices page 1 is stopped for 5 seconds and started again through
// its polling target; the page receives a push on each, pushes only for the
// cards it displays, and never re-fetches its page.
//
// Needs more devices than one page: the l8opensim simulator (k8s/sim-start.sh)
// provides 19, a mobile page shows 15.

import { test, expect, waitForMobileReady } from '../../fixtures/test';
import { MobileNav, MobileTable } from '../../pages/MobileNav';
import { QueryRecorder } from '../../fixtures/queries';
import { recordWsPushes, ipsIn } from '../../fixtures/wspushes';
import { targetOfIp, setTargetState, waitForDevicePush, TARGET_DOWN, TARGET_UP } from '../../fixtures/targets';

const HOLD_DOWN_MS = 5000;

test('mobile network devices page 1 gets only its own devices\' changes, applied without re-fetching', async ({ freshMobile: mobile, api }) => {
    test.setTimeout(360000);
    const total = await api.total('/0/NCache', 'NetworkDevice');
    expect(total, 'needs more network devices than one page (15) -- start l8opensim with k8s/sim-start.sh')
        .toBeGreaterThan(15);

    // Record from the socket's first frame: attach, then reload.
    const pushes = recordWsPushes(mobile);
    await mobile.reload();
    await waitForMobileReady(mobile);

    const nav = new MobileNav(mobile);
    const table = new MobileTable(mobile);
    await nav.waitForHome();
    await nav.openService('network', 'Network Devices', 'Network Devices', 'NetworkDevice');
    expect(await table.waitForResolved()).toBe('cards');
    const shown = ipsIn(await table.cards().allInnerTexts());
    expect(shown.size, 'page 1 should show a full page of devices').toBe(15);

    const queries = QueryRecorder.forPage(mobile);
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
        'the mobile table re-fetched its page to apply pushed updates -- updates of displayed cards ' +
        'are applied in place from the pushed record' + ` (pushes: ${seen.map((x) => `${x.action}:${x.primaryKey}${x.hasRecord ? '' : '(no record)'}`).join(', ')}; re-fetches: ${pageQueries().slice(fetchesBefore).join(' | ')})`).toBe(0);
    expect(ipsIn(await table.cards().allInnerTexts()), 'the displayed page changed').toEqual(shown);
});
