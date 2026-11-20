/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// Mobile parity of desktop/31-page-scoped-live.spec.ts
// (plans/websocket-page-scoped-notifications.md): while the simulated devices
// keep being polled, the mobile Network Devices page 1 receives pushes only
// for the cards it displays, receives some, and never re-fetches its page.
//
// Needs more devices than one page: the l8opensim simulator (k8s/sim-start.sh)
// provides 19, a mobile page shows 15.

import { test, expect, waitForMobileReady } from '../../fixtures/test';
import { MobileNav, MobileTable } from '../../pages/MobileNav';
import { QueryRecorder } from '../../fixtures/queries';
import { recordWsPushes, ipsIn } from '../../fixtures/wspushes';

const WATCH_MS = 60000;

test('mobile network devices page 1 gets only its own devices\' changes, applied without re-fetching', async ({ freshMobile: mobile, api }) => {
    test.setTimeout(WATCH_MS + 90000);
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
    const fetchesBefore = queries.forModel('NetworkDevice').length;
    const pushesBefore = pushes.length;
    await mobile.waitForTimeout(WATCH_MS);

    const seen = pushes.slice(pushesBefore).filter((p) => p.modelType === 'NetworkDevice');
    const offPage = [...new Set(seen.filter((p) => !shown.has(p.primaryKey)).map((p) => p.primaryKey))];
    expect(offPage, 'the server pushed changes of devices not on the displayed page -- ' +
        'notifications must be scoped to the subscriber\'s page (l8utils cache Subscription.wants)').toEqual([]);
    expect(seen.length, `no network device change reached page 1 in ${WATCH_MS / 1000}s while the ` +
        'devices were being polled -- the live pipeline is not delivering').toBeGreaterThan(0);
    expect(queries.forModel('NetworkDevice').length - fetchesBefore,
        'the mobile table re-fetched its page to apply pushed updates -- updates of displayed cards ' +
        'are applied in place from the pushed record').toBe(0);
    expect(ipsIn(await table.cards().allInnerTexts()), 'the displayed page changed').toEqual(shown);
});
