/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// The suite's test fixture. Every spec imports `test`/`expect` from here.
//
// It provides:
//   - `api`        an authenticated API client, one per worker,
//   - `app`        the worker's SHARED desktop page, booted once per worker,
//   - `mobile`     the worker's SHARED mobile page, booted once per worker,
//   - `freshApp` / `freshMobile`  a page booted for this test alone, for the
//                  few tests that assert on boot itself or change session-wide
//                  state (logout, theme),
//   - `consoleErrors` every console error / uncaught exception the page raised
//                  DURING THIS TEST.
//
// Why a shared page: booting app.html costs ~2s, ~1000 responses (~8MB, served
// no-store) and ~60 API calls (the dashboard KPIs). Paying that per test was a
// fifth of the suite's wall clock and most of its backend load. A shared page is
// reset at the start of every test (popups closed, the current section tagged
// stale so the test's first openSection() reloads it for real), and Playwright
// replaces the whole worker -- session included -- after any failing test, so
// one test's wreckage never reaches the next.
//
// The console-error capture is the single highest-value thing here. The failure
// mode this codebase actually suffers is FailFastNoSilentFallback's: a script
// tag missing from a shell, so a global is undefined, so an IIFE dies with
// `ReferenceError: <Global> is not defined`, and the feature renders as an
// empty table with no visible error. Nothing in go/tests/ can see that. A
// listener on `pageerror` can, and it sees it on EVERY spec, not just a
// dedicated one -- which is why it is wired into the fixture rather than a
// single test.

import { test as base, expect, Page, BrowserContext, Browser, WorkerInfo, TestInfo } from '@playwright/test';
import { Api } from './api';
import { ENV } from './env';
import { QueryRecorder } from './queries';
import { track } from './quiet';
export { waitForQuiet } from './quiet';
import { dismissOpenPopups } from '../drivers/table';
import { markSectionStale } from '../pages/DesktopNav';

export interface ConsoleCapture {
    /** Uncaught exceptions (pageerror) -- always a real bug. */
    pageErrors: string[];
    /** console.error(...) calls. */
    consoleErrors: string[];
    /** Failed network requests, as "METHOD url -> status". */
    failedRequests: string[];
    /** Everything above, flattened, for a single assertion. */
    all(): string[];
}

function newCapture(): ConsoleCapture {
    return {
        pageErrors: [], consoleErrors: [], failedRequests: [],
        all() { return [...this.pageErrors, ...this.consoleErrors, ...this.failedRequests]; }
    };
}

/**
 * Routes a page's errors into whichever test currently owns it.
 *
 * A shared page outlives every test that uses it, so its listeners are attached
 * once and write into `current` -- swapped per test -- rather than into one
 * capture that would accumulate the whole worker's history.
 */
class CaptureRouter {
    current: ConsoleCapture | null = null;

    constructor(page: Page) {
        track(page);
        page.on('pageerror', (e) => this.current?.pageErrors.push(`${e.name}: ${e.message}`));
        page.on('console', (msg) => {
            if (msg.type() === 'error') this.current?.consoleErrors.push(msg.text());
        });
        page.on('response', (res) => {
            const s = res.status();
            // 401 on /auth during a deliberate bad-login spec is expected; specs
            // that care assert on it directly. Everything >= 400 is recorded and
            // the spec decides.
            if (s >= 400) {
                this.current?.failedRequests.push(`${res.request().method()} ${res.url()} -> ${s}`);
            }
        });
    }
}

/**
 * Seeds the bearer token the way the real login does.
 *
 * Playwright's own storageState only persists cookies and localStorage. This
 * app keeps its token in sessionStorage (SetupConfiguration: "Bearer token in
 * sessionStorage.bearerToken"), so the session has to be injected by hand,
 * before any script on the page runs.
 */
async function seedSession(context: BrowserContext, token: string, username: string) {
    await context.addInitScript(
        ([t, u]) => {
            try {
                sessionStorage.setItem('bearerToken', t as string);
                sessionStorage.setItem('username', u as string);
            } catch {
                /* private mode / blocked storage -- the spec will fail visibly at login */
            }
        },
        [token, username]
    );
}

/**
 * Waits until the desktop shell has finished booting.
 *
 * app.js's DOMContentLoaded handler awaits FIVE network round-trips -- config,
 * currency cache, exchange rates, /permissions and ModConfig -- and only then,
 * at app.js:223, attaches the `.nav-link` click handlers. A click dispatched
 * before that point lands on an element with no listener and is silently lost:
 * no error, no navigation, and `active` never appears on the link.
 *
 * `loadSection('dashboard')` runs immediately before the handlers are wired, so
 * the default section's markup being present proves the wiring is done.
 */
export async function waitForDesktopReady(page: Page): Promise<void> {
    await expect(page.locator('.app-container')).toBeVisible({ timeout: 30000 });
    await expect(
        page.locator('#content-area .section-container'),
        'the shell never finished booting -- the default section never rendered'
    ).toBeVisible({ timeout: 45000 });
}

/** Mobile equivalent: app-core.js renders the home grid once it is ready. */
export async function waitForMobileReady(page: Page): Promise<void> {
    await expect(
        page.locator('.nav-card-grid'),
        'the mobile shell never rendered its home grid'
    ).toBeVisible({ timeout: 45000 });
}

/**
 * Context options for a context the suite creates itself.
 *
 * A worker-scoped context cannot use Playwright's test-scoped option fixtures,
 * so it takes them from the project's `use` block -- which is what carries the
 * Pixel 7 profile for the mobile project. Dropping these would silently turn
 * the mobile suite into a desktop browser at a desktop viewport.
 */
function contextOptions(use: Record<string, unknown>) {
    const keys = ['baseURL', 'ignoreHTTPSErrors', 'viewport', 'userAgent', 'deviceScaleFactor',
                  'isMobile', 'hasTouch', 'locale', 'timezoneId'];
    const out: Record<string, unknown> = {};
    for (const k of keys) if (use[k] !== undefined) out[k] = use[k];
    return out;
}

interface Session {
    page: Page;
    router: CaptureRouter;
}

async function openSession(
    browser: Browser, workerInfo: WorkerInfo, api: Api, shell: string, ready: (p: Page) => Promise<void>
): Promise<{ context: BrowserContext; session: Session }> {
    const use = workerInfo.project.use as Record<string, unknown>;
    const context = await browser.newContext(contextOptions(use));
    if (typeof use.actionTimeout === 'number') context.setDefaultTimeout(use.actionTimeout);
    if (typeof use.navigationTimeout === 'number') context.setDefaultNavigationTimeout(use.navigationTimeout);
    await seedSession(context, api.token, ENV.user);
    const page = await context.newPage();
    const router = new CaptureRouter(page);
    await page.goto(shell);
    await ready(page);
    return { context, session: { page, router } };
}

/**
 * Hands a shared page to one test and takes it back afterwards.
 *
 * On failure the shared page is screenshotted by hand: Playwright's automatic
 * failure screenshot only covers the test's own `page`, which a test on the
 * shared session never creates.
 */
async function lendSession(
    session: Session, capture: ConsoleCapture, testInfo: TestInfo,
    reset: (page: Page) => Promise<void>, use: (page: Page) => Promise<void>
): Promise<void> {
    session.router.current = capture;
    QueryRecorder.reset(session.page);
    await reset(session.page);
    try {
        await use(session.page);
    } finally {
        if (testInfo.status !== testInfo.expectedStatus && !session.page.isClosed()) {
            const shot = await session.page.screenshot().catch(() => null);
            if (shot) await testInfo.attach('shared-page-on-failure', { body: shot, contentType: 'image/png' });
        }
        session.router.current = null;
        QueryRecorder.detach(session.page);
    }
}

/** Desktop reset: nothing left open, and the next openSection() reloads for real. */
async function resetDesktop(page: Page): Promise<void> {
    await dismissOpenPopups(page);
    await markSectionStale(page);
}

/**
 * Mobile reset: no popup left open, and back to the home grid -- both through
 * the app's own API. A detail popup left by the previous test otherwise sits
 * over the grid and intercepts every tap of this one.
 */
async function resetMobile(page: Page): Promise<void> {
    await page.evaluate(() => {
        const w = window as unknown as {
            Layer8MPopup?: { closeAll(): void };
            Layer8MNav?: { showHome(): void };
        };
        w.Layer8MPopup?.closeAll();
        w.Layer8MNav?.showHome();
    });
    await expect(page.locator('.mobile-popup-overlay.open')).toHaveCount(0, { timeout: 5000 });
    await expect(page.locator('.nav-card[data-module]').first()).toBeVisible({ timeout: 15000 });
}

type Fixtures = {
    consoleErrors: ConsoleCapture;
    app: Page;
    mobile: Page;
    freshApp: Page;
    freshMobile: Page;
};

type WorkerFixtures = {
    api: Api;
    desktopSession: Session;
    mobileSession: Session;
};

export const test = base.extend<Fixtures, WorkerFixtures>({
    api: [async ({}, use) => {
        const api = await Api.login();
        await use(api);
        await api.dispose();
    }, { scope: 'worker' }],

    desktopSession: [async ({ browser, api }, use, workerInfo) => {
        const { context, session } =
            await openSession(browser, workerInfo, api, ENV.desktopShell, waitForDesktopReady);
        await use(session);
        await context.close();
    }, { scope: 'worker' }],

    mobileSession: [async ({ browser, api }, use, workerInfo) => {
        const { context, session } =
            await openSession(browser, workerInfo, api, ENV.mobileShell, waitForMobileReady);
        await use(session);
        await context.close();
    }, { scope: 'worker' }],

    consoleErrors: async ({}, use) => {
        await use(newCapture());
    },

    app: async ({ desktopSession, consoleErrors }, use, testInfo) => {
        await lendSession(desktopSession, consoleErrors, testInfo, resetDesktop, use);
    },

    mobile: async ({ mobileSession, consoleErrors }, use, testInfo) => {
        await lendSession(mobileSession, consoleErrors, testInfo, resetMobile, use);
    },

    freshApp: async ({ page, context, api, consoleErrors }, use) => {
        new CaptureRouter(page).current = consoleErrors;
        await seedSession(context, api.token, ENV.user);
        await page.goto(ENV.desktopShell);
        await waitForDesktopReady(page);
        await use(page);
    },

    freshMobile: async ({ page, context, api, consoleErrors }, use) => {
        new CaptureRouter(page).current = consoleErrors;
        await seedSession(context, api.token, ENV.user);
        await page.goto(ENV.mobileShell);
        await waitForMobileReady(page);
        await use(page);
    }
});

export { expect };

/**
 * Fails the test if the page raised an uncaught exception or logged an error.
 *
 * `allow` takes substrings for known-noisy messages; keep it empty unless there
 * is a genuinely external cause, and never add an entry to silence a real
 * regression -- that is the same mistake as trimming a deps-check list.
 */
export function assertNoPageErrors(cap: ConsoleCapture, allow: string[] = []) {
    const tolerated = (s: string) => allow.some((a) => s.includes(a));
    const fatal = cap.pageErrors.filter((s) => !tolerated(s));
    const logged = cap.consoleErrors.filter((s) => !tolerated(s));
    expect(fatal, `uncaught exception(s) on the page:\n  ${fatal.join('\n  ')}`).toEqual([]);
    expect(logged, `console.error(s) on the page:\n  ${logged.join('\n  ')}`).toEqual([]);
}
