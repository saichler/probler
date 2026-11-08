/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
import { Page, expect } from '@playwright/test';

/**
 * In-flight request tracking per page, for waitForQuiet(). Playwright's
 * 'networkidle' never settles on probler's iframe sections (inventory,
 * topologies) even when nothing is in flight, so the suite tracks requests
 * itself: quiet = nothing in flight and nothing started or finished for a
 * short window.
 */
class RequestTracker {
    inflight = 0;
    lastChange = Date.now();
    constructor(page: Page) {
        page.on('request', () => { this.inflight++; this.lastChange = Date.now(); });
        const done = () => { this.inflight = Math.max(0, this.inflight - 1); this.lastChange = Date.now(); };
        page.on('requestfinished', done);
        page.on('requestfailed', done);
    }
    quietFor(): number { return this.inflight === 0 ? Date.now() - this.lastChange : 0; }
}

const trackers = new WeakMap<Page, RequestTracker>();

export function track(page: Page): RequestTracker {
    let t = trackers.get(page);
    if (!t) { t = new RequestTracker(page); trackers.set(page, t); }
    return t;
}

/** Waits until the page (all frames) has had no request in flight for `quietMs`. */
export async function waitForQuiet(page: Page, quietMs = 500, timeout = 30000): Promise<void> {
    const t = track(page);
    await expect
        .poll(() => t.quietFor(), { timeout, intervals: [100], message: 'page network never went quiet' })
        .toBeGreaterThanOrEqual(quietMs);
}

