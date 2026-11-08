/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// Records every L8Query the page issues, from the moment it is attached.
//
// Why a recorder rather than `page.waitForRequest` at each navigation: the
// module factory loads a module's DEFAULT service during initialize(), before
// any click. Arming a waiter after clicking that service's sub-nav item waits
// for a request that already happened, times out, and reports a perfectly
// healthy service as "never issued a query".
//
// Clicking an already-active service does not re-fetch either --
// layer8d-module-navigation.js's loadServiceView only initialises a view when
// `!moduleNS._state.serviceTables[tableId]`. So "has this model been queried at
// any point in this page's life" is the question that actually matters, and
// only a recorder attached at page load can answer it.

// On the worker's shared page (fixtures/test.ts) the fixture resets the
// recorder at the start of every test, so "this page's life" means "this test",
// and detaches it afterwards -- otherwise every test would leave a listener
// behind on a page that lives for hundreds of tests.

import { Page, expect } from '@playwright/test';

const byPage = new WeakMap<Page, QueryRecorder>();

export class QueryRecorder {
    private queries: string[] = [];
    private readonly onRequest: (req: { url(): string }) => void;

    private constructor(page: Page) {
        this.onRequest = (req) => {
            const url = req.url();
            if (!url.includes('body=')) return;
            try {
                const body = new URL(url).searchParams.get('body');
                if (!body) return;
                const text = JSON.parse(body).text;
                if (typeof text === 'string') this.queries.push(text);
            } catch {
                /* not an L8Query body -- ignore */
            }
        };
        page.on('request', this.onRequest);
    }

    /** The page's current recorder, created on first use. */
    static forPage(page: Page): QueryRecorder {
        let rec = byPage.get(page);
        if (!rec) {
            rec = new QueryRecorder(page);
            byPage.set(page, rec);
        }
        return rec;
    }

    /** Starts a new recording on `page`, discarding the previous one. */
    static reset(page: Page): QueryRecorder {
        QueryRecorder.detach(page);
        return QueryRecorder.forPage(page);
    }

    /** Stops recording on `page`. */
    static detach(page: Page): void {
        const rec = byPage.get(page);
        if (!rec) return;
        page.off('request', rec.onRequest);
        byPage.delete(page);
    }

    all(): string[] {
        return [...this.queries];
    }

    /** Every query whose `from` clause names this protobuf type. */
    forModel(model: string): string[] {
        const re = new RegExp(`\\bfrom\\s+${model}\\b`);
        return this.queries.filter((q) => re.test(q));
    }

    /**
     * Resolves with the first query issued for `model`, waiting up to
     * `timeoutMs` for one to appear if none has yet. Returns null on timeout.
     */
    async waitForModel(model: string, timeoutMs = 20000): Promise<string | null> {
        try {
            await expect.poll(() => this.forModel(model).length, { timeout: timeoutMs }).toBeGreaterThan(0);
        } catch {
            return null;
        }
        return this.forModel(model)[0];
    }
}
