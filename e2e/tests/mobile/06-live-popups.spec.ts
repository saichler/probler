/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// Mobile detail popups stay open on a pushed update: they re-fetch the record
// and re-show (Layer8MPopup has no in-place update) instead of closing. Runs on
// freshMobile: the specs wrap the websocket subscribe() of their own page.

import { test, expect, assertNoPageErrors, waitForQuiet } from '../../fixtures/test';
import { Page } from '@playwright/test';
import { MobileNav, MobileTable } from '../../pages/MobileNav';
import { recordSubscriptions, replayUpdate } from '../../fixtures/live';

const overlay = (page: Page) => page.locator('.mobile-popup-overlay.open');
const title = async (page: Page) => (await overlay(page).last().locator('.mobile-popup-title').innerText()).trim();

async function openFirstCard(page: Page, module: string, sub: string, svc: string, model: string, filter?: string) {
    const nav = new MobileNav(page);
    await nav.waitForHome();
    expect(await nav.openService(module, sub, svc, model), `${module}/${svc} never queried`).not.toBeNull();
    const table = new MobileTable(page);
    expect(await table.waitForResolved()).toBe('cards');
    const card = filter ? table.cards().filter({ hasText: filter }).first() : table.cards().first();
    await card.click();
    await expect(overlay(page).first()).toBeVisible();
}

test('a network device popup stays open on an update for its device', async ({ freshMobile: mobile, consoleErrors }) => {
    await recordSubscriptions(mobile);
    await openFirstCard(mobile, 'network', 'Network Devices', 'Network Devices', 'NetworkDevice');
    const name = await title(mobile);
    // The device's IP is its primaryKey; take it from the overview content.
    const ip = (await overlay(mobile).last().innerText()).match(/10\.20\.30\.\d+/)![0];

    // Which devices change between polls varies, so the update is replayed to
    // the popup's own subscription (desktop 27-live-popups covers real pushes).
    const refetch = mobile.waitForRequest((r) => decodeURIComponent(r.url()).includes(`where Id=${ip}`));
    await replayUpdate(mobile, 'NetworkDevice', ip);
    await refetch;
    await waitForQuiet(mobile);

    await expect(overlay(mobile), 'the popup closed on a pushed update').toHaveCount(1);
    expect(await title(mobile)).toBe(name);
    assertNoPageErrors(consoleErrors);
});

test('a GPU server popup stays open on an update for its server', async ({ freshMobile: mobile, consoleErrors }) => {
    await recordSubscriptions(mobile);
    await openFirstCard(mobile, 'gpus', 'GPU Devices', 'GPU Devices', 'GpuDevice');
    const name = await title(mobile);
    const ip = (await overlay(mobile).last().innerText()).match(/20\.20\.30\.\d+/)![0];
    const refetch = mobile.waitForRequest((r) => decodeURIComponent(r.url()).includes(`where Id=${ip}`));
    await replayUpdate(mobile, 'GpuDevice', ip);
    await refetch;
    await waitForQuiet(mobile);
    await expect(overlay(mobile), 'the popup closed on an update').toHaveCount(1);
    expect(await title(mobile)).toBe(name);
    assertNoPageErrors(consoleErrors);
});

test('a K8s detail popup stays open on an update for its record', async ({ freshMobile: mobile, consoleErrors }) => {
    await recordSubscriptions(mobile);
    await openFirstCard(mobile, 'kubernetes', 'Workloads', 'Pods', 'K8SPod');
    const name = await title(mobile);
    const key = name.split(': ').slice(1).join(': ');          // "Pods: <namespace>/<name>"

    const refetch = mobile.waitForRequest((r) => decodeURIComponent(r.url()).includes(`where key=${key} and clusterName=`));
    await replayUpdate(mobile, 'K8SPod', key);
    await refetch;
    await waitForQuiet(mobile);

    await expect(overlay(mobile), 'the popup closed on an update').toHaveCount(1);
    expect(await title(mobile)).toBe(name);
    assertNoPageErrors(consoleErrors);
});

test('a service health popup stays open on an update for its service', async ({ freshMobile: mobile, consoleErrors }) => {
    await recordSubscriptions(mobile);
    await openFirstCard(mobile, 'system', 'Health', 'Service Health', 'L8Health');
    const service = await title(mobile);

    const refetch = mobile.waitForRequest((r) => decodeURIComponent(r.url()).includes(`where alias=${service}`));
    await replayUpdate(mobile, 'L8Health', service);
    await refetch;
    await waitForQuiet(mobile);

    await expect(overlay(mobile), 'the popup closed on an update').toHaveCount(1);
    expect(await title(mobile)).toBe(service);
    assertNoPageErrors(consoleErrors);
});
