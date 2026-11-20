/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/

import { Page } from '@playwright/test';

/** A change notification as it arrived on the page's websocket. */
export interface WsPush {
    action: string;
    modelType: string;
    primaryKey: string;
}

/**
 * Records every change notification the server sends on the page's websockets
 * -- what actually reached the browser, before any client-side filtering.
 * Must be called before the socket opens (attach, then reload the page).
 */
export function recordWsPushes(page: Page): WsPush[] {
    const pushes: WsPush[] = [];
    page.on('websocket', (ws) => {
        ws.on('framereceived', (frame) => {
            const text = typeof frame.payload === 'string' ? frame.payload : frame.payload.toString();
            try {
                const m = JSON.parse(text);
                if (m && typeof m.modelType === 'string') {
                    pushes.push({ action: m.action, modelType: m.modelType, primaryKey: String(m.primaryKey) });
                }
            } catch {
                /* not a change notification */
            }
        });
    });
    return pushes;
}

const IPV4 = /\b\d{1,3}(?:\.\d{1,3}){3}\b/g;

/** Every IPv4 address in the given texts (network device ids are their IPs). */
export function ipsIn(texts: string[]): Set<string> {
    const out = new Set<string>();
    for (const t of texts) for (const m of t.match(IPV4) || []) out.add(m);
    return out;
}
