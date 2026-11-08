/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// Helpers for live-popup specs: replay a change notification to a popup's own
// subscription, exercising the client refresh path deterministically.
//
// Real pushes are not usable for these assertions: collectors push a device only
// when its data changes (often not for minutes), and K8s inventory pushes carry
// only the cluster name as primaryKey (KNOWN UPSTREAM BUG: the composite
// ClusterName+Key is truncated to its first field), so a K8s popup -- matched by
// the record's key -- never sees one. The server->browser push path itself is
// covered by 19-realtime.

import { Page } from '@playwright/test';

/** Wraps Layer8DWebSocket.subscribe so every listener is recorded (and every push it receives). */
export async function recordSubscriptions(page: Page): Promise<void> {
    await page.evaluate(() => {
        const w = window as unknown as {
            Layer8DWebSocket: { subscribe(m: string, cb: (msg: unknown) => void): () => void };
            __e2eSubs?: { model: string; cb: (msg: unknown) => void }[];
            __e2ePushes?: { modelType: string; primaryKey: string }[];
        };
        if (w.__e2eSubs) return;
        w.__e2eSubs = [];
        w.__e2ePushes = [];
        const orig = w.Layer8DWebSocket.subscribe.bind(w.Layer8DWebSocket);
        w.Layer8DWebSocket.subscribe = function(model: string, cb: (msg: unknown) => void) {
            const wrapped = (msg: unknown) => {
                w.__e2ePushes!.push(msg as { modelType: string; primaryKey: string });
                cb(msg);
            };
            w.__e2eSubs!.push({ model, cb });
            return orig(model, wrapped);
        };
    });
}

/** Delivers an update notification for (model, primaryKey) to every recorded listener. */
export async function replayUpdate(page: Page, model: string, primaryKey: string): Promise<void> {
    await page.evaluate(([m, pk]) => {
        const w = window as unknown as { __e2eSubs?: { model: string; cb: (msg: unknown) => void }[] };
        for (const s of w.__e2eSubs || []) {
            if (s.model === m) s.cb({ action: 'update', modelType: m, primaryKey: pk });
        }
    }, [model, primaryKey]);
}
