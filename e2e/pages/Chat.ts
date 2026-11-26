/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// Page object for the l8chat bubble (l8ui/l8chat), desktop and mobile.
//
// Selectors from l8ui/l8chat: the desktop panel `.l8chat-bubble-panel`
// (open: `.l8chat-bubble-open`), the mobile panel `.l8chat-m-panel` (open:
// `.l8chat-m-open`), and the views shared by both: `.l8chat-peer`,
// `.l8chat-conv`, `.l8chat-msg`, `.l8chat-input`, `.l8chat-send`.

import { Browser, Locator, Page, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { Api } from '../fixtures/api';
import { ENV } from '../fixtures/env';
import { seedSession, waitForDesktopReady, waitForMobileReady } from '../fixtures/test';

export const TANTO = 'Tanto (Layer8)';

export class Chat {
    constructor(private page: Page, private mobile = false) {}

    button(): Locator {
        return this.page.locator(this.mobile ? '.l8chat-m-bubble-btn' : '.l8chat-bubble-btn');
    }

    panel(): Locator {
        return this.page.locator(this.mobile ? '.l8chat-m-panel' : '.l8chat-bubble-panel');
    }

    private openClass(): RegExp {
        return this.mobile ? /l8chat-m-open/ : /l8chat-bubble-open/;
    }

    async open(): Promise<void> {
        const isOpen = await this.panel().evaluate((el, cls) => el.classList.contains(cls),
            this.mobile ? 'l8chat-m-open' : 'l8chat-bubble-open').catch(() => false);
        if (!isOpen) await this.button().click();
        await expect(this.panel()).toHaveClass(this.openClass());
        // Mobile reopens on the screen it was closed on (a previous test may
        // have left a thread open): back out to the peers screen.
        if (this.mobile) {
            const peersScreen = this.panel().locator('.l8chat-m-peers');
            for (let i = 0; i < 2 && !(await peersScreen.evaluate((el) => el.classList.contains('l8chat-m-active'))); i++) {
                await this.panel().locator('.l8chat-m-back').click();
            }
            await expect(peersScreen).toHaveClass(/l8chat-m-active/);
        }
        await expect(this.peers().first(), 'the chat sidebar never rendered').toBeVisible();
    }

    async close(): Promise<void> {
        await this.panel().locator(this.mobile ? '.l8chat-m-close' : '.l8chat-close').click();
        await expect(this.panel()).not.toHaveClass(this.openClass());
    }

    peers(): Locator { return this.panel().locator('.l8chat-peer'); }

    peer(name: string): Locator {
        return this.peers().filter({ has: this.page.locator('.l8chat-peer-name', { hasText: name }) }).first();
    }

    /** Selects a peer: from the list, or through the user search when it is not listed. */
    async openPeer(name: string): Promise<void> {
        const search = this.panel().locator('.l8chat-search');
        const searched = !(await this.peer(name).isVisible());
        if (searched) await search.fill(name);
        await this.peer(name).click();
        await expect(this.panel().locator('.l8chat-convlist-title')).toHaveText(name);
        // On mobile the peers screen is left behind; the search only needs
        // clearing where it stays on screen.
        if (searched && await search.isVisible()) await search.fill('');
    }

    conversations(): Locator { return this.panel().locator('.l8chat-conv'); }

    conversation(title: string): Locator {
        return this.conversations().filter({ has: this.page.locator('.l8chat-conv-title', { hasText: title }) }).first();
    }

    threadTitle(): Locator { return this.panel().locator('.l8chat-thread-title'); }
    messages(): Locator { return this.panel().locator('.l8chat-msg'); }
    message(text: string): Locator { return this.messages().filter({ hasText: text }).last(); }

    // ---- LLM profile picker (Tanto threads) ----

    profileWrap(): Locator { return this.panel().locator('.l8chat-profile-wrap'); }
    profileSelect(): Locator { return this.panel().locator('.l8chat-profile'); }
    selectedProfile(): Locator { return this.profileSelect().locator('option:checked'); }

    // ---- collapsible side columns (desktop) ----

    column(col: 'sidebar' | 'convs'): Locator {
        return this.panel().locator(col === 'sidebar' ? '.l8chat-col-sidebar' : '.l8chat-col-convs');
    }

    collapseButton(col: 'sidebar' | 'convs'): Locator { return this.column(col).locator('.l8chat-collapse'); }

    async columnWidth(col: 'sidebar' | 'convs'): Promise<number> {
        return (await this.column(col).boundingBox())?.width ?? 0;
    }

    /** Folds or unfolds a column and waits for its width transition to finish. */
    async setCollapsed(col: 'sidebar' | 'convs', collapsed: boolean): Promise<void> {
        const isCollapsed = await this.column(col).evaluate((el) => el.classList.contains('l8chat-col-collapsed'));
        if (isCollapsed !== collapsed) await this.collapseButton(col).click();
        if (collapsed) {
            await expect(this.column(col)).toHaveClass(/l8chat-col-collapsed/);
            await expect.poll(() => this.columnWidth(col), { message: `${col} never folded` }).toBeLessThanOrEqual(41);
        } else {
            await expect(this.column(col)).not.toHaveClass(/l8chat-col-collapsed/);
            await expect.poll(() => this.columnWidth(col), { message: `${col} never unfolded` }).toBeGreaterThan(200);
        }
    }

    /** Asserts el is on screen and inside the column's (folded) box. */
    async expectInsideColumn(col: 'sidebar' | 'convs', el: Locator, what: string): Promise<void> {
        await expect(el, `${what} is not visible`).toBeVisible();
        // The sidebar re-renders on every presence change (other sessions log in
        // and out during a run), so an element can be detached between the
        // visibility check and the measurement: measure until both boxes exist.
        let last = '';
        await expect.poll(async () => {
            const c = await this.column(col).boundingBox();
            const b = await el.boundingBox();
            if (!c || !b || b.width <= 0) { last = `${what} has no size`; return false; }
            last = `${what} (x ${b.x}..${b.x + b.width}) is clipped by the ${col} column (x ${c.x}..${c.x + c.width})`;
            return b.x >= c.x && b.x + b.width <= c.x + c.width;
        }, { message: `${what} is not inside the ${col} column`, timeout: 5000 }).toBe(true)
            .catch(() => { throw new Error(last); });
    }

    // ---- moving the panel (desktop) ----

    header(): Locator { return this.panel().locator('.l8chat-panel-header'); }

    async box(): Promise<{ x: number; y: number; width: number; height: number }> {
        const b = (await this.panel().boundingBox())!;
        return { x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width), height: Math.round(b.height) };
    }

    /** Drags the panel by its header (a spot on the title, away from the buttons). */
    async dragBy(dx: number, dy: number): Promise<void> {
        const h = (await this.header().boundingBox())!;
        const x = h.x + 40, y = h.y + h.height / 2;
        await this.page.mouse.move(x, y);
        await this.page.mouse.down();
        await this.page.mouse.move(x + dx / 2, y + dy / 2, { steps: 4 });
        await this.page.mouse.move(x + dx, y + dy, { steps: 4 });
        await this.page.mouse.up();
    }

    /** Puts the panel back in its default corner (and forgets the saved place). */
    async resetPosition(): Promise<void> {
        await this.page.evaluate(() => (window as any).L8ChatBubble.resetPosition());
    }

    // ---- attachments ----

    /** Attaches an in-memory file through the composer's paperclip and waits for its chip. */
    async attach(name: string, content: string, mimeType = 'text/plain'): Promise<void> {
        await this.panel().locator('.l8chat-file-input').last().setInputFiles({ name, mimeType, buffer: Buffer.from(content) });
        await expect(this.panel().locator('.l8chat-composer-files .l8chat-chip', { hasText: name }),
            `the attachment ${name} was not uploaded`).toBeVisible({ timeout: 30_000 });
    }

    // ---- message copy button ----

    copyButton(message: Locator): Locator { return message.locator('.l8chat-msg-copy'); }

    // ---- maximize / restore (desktop) ----

    maximizeButton(): Locator { return this.panel().locator('.l8chat-maximize'); }

    /** Maximizes the panel to the window, or restores its normal size. */
    async setMaximized(max: boolean): Promise<void> {
        const isMax = await this.panel().evaluate((el) => el.classList.contains('l8chat-bubble-max'));
        if (isMax !== max) await this.maximizeButton().click();
        if (max) await expect(this.panel()).toHaveClass(/l8chat-bubble-max/);
        else await expect(this.panel()).not.toHaveClass(/l8chat-bubble-max/);
        await expect(this.maximizeButton()).toHaveAttribute('title', max ? 'Restore' : 'Maximize');
    }

    async send(text: string): Promise<void> {
        await this.panel().locator('.l8chat-input').fill(text);
        await this.panel().locator('.l8chat-send').click();
    }
}

/** A page signed in as another account, in its own browser context. */
export async function openUserPage(browser: Browser, user: string, pass: string, mobile = false):
    Promise<{ page: Page; close: () => Promise<void> }> {
    const api = await Api.login(user, pass);
    const context = await browser.newContext({ baseURL: ENV.baseURL, ignoreHTTPSErrors: true });
    await seedSession(context, api.token, user);
    const page = await context.newPage();
    await page.goto(mobile ? ENV.mobileShell : ENV.desktopShell);
    await (mobile ? waitForMobileReady(page) : waitForDesktopReady(page));
    return { page, close: async () => { await context.close(); await api.dispose(); } };
}

/**
 * Creates a conversation between the API's user and peerUserId through the
 * public chat API (a random ID, like the "+" button) and waits until it is
 * readable, so later writes find its owner.
 */
export async function createConversation(api: Api, me: string, peerUserId: string, title: string): Promise<string> {
    const conversationId = randomUUID();
    const peerKey = peerUserId < me ? `${peerUserId}|${me}` : `${me}|${peerUserId}`;
    await api.post('/81/ChatConv', { conversationId, peerKind: 1, peerKey, title });
    await expect.poll(async () =>
        (await api.query('/81/ChatConv', `select * from ChatConversation where conversationId=${conversationId}`)).list.length,
    { message: `conversation "${title}" was never created`, timeout: 30_000 }).toBe(1);
    return conversationId;
}

/** Posts messages in order and waits until the owner has them all. */
export async function postMessages(api: Api, conversationId: string, bodies: string[]): Promise<void> {
    for (const body of bodies) {
        await api.post('/81/ChatMsg', { messageId: randomUUID(), conversationId, body });
    }
    await expect.poll(async () =>
        (await api.query('/81/ChatMsg',
            `select * from ChatMessage where conversationId=${conversationId} sort-by seq descending limit 50 page 0`)).list.length,
    { message: 'the messages never reached the conversation', timeout: 30_000 }).toBe(bodies.length);
}

// ---- Tanto conversations and LLM profiles (l8secure /79/LlmProf) ----

export interface LlmProfile { profileId: string; name: string; providerId?: string; modelId?: string; isDefault?: boolean }

/** The picker's label of a profile: "name · model", "(default)" unless the name says so. */
export function profileLabel(p: LlmProfile): string {
    const name = p.name || p.profileId;
    const mark = p.isDefault && !/default/i.test(name) ? ' (default)' : '';
    return name + (p.modelId ? ' · ' + p.modelId : '') + mark;
}

export async function listProfiles(api: Api): Promise<LlmProfile[]> {
    return (await api.query<LlmProfile>('/79/LlmProf', 'select * from L8LlmProfile')).list;
}

/**
 * Adds a profile on the default profile's provider and model, so a Tanto turn
 * routed to it is answered exactly like one on the default profile.
 */
export async function createProfile(api: Api, name: string): Promise<LlmProfile> {
    const base = (await listProfiles(api)).find((p) => p.isDefault);
    expect(base, 'l8secure has no default LLM profile to copy').toBeTruthy();
    const profile: LlmProfile = { profileId: `e2e-${randomUUID()}`, name, providerId: base!.providerId, modelId: base!.modelId };
    await api.post('/79/LlmProf', profile);
    await expect.poll(async () => (await listProfiles(api)).some((p) => p.profileId === profile.profileId),
        { message: `profile "${name}" was never created`, timeout: 30_000 }).toBe(true);
    return profile;
}

export async function deleteProfile(api: Api, profileId: string): Promise<void> {
    await api.deleteById('/79/LlmProf', 'L8LlmProfile', 'profileId', profileId);
}

/** Creates a Tanto conversation of the API's user (like "+" on the Tanto row). */
export async function createAgentConversation(api: Api, me: string, title: string): Promise<string> {
    const conversationId = randomUUID();
    await api.post('/81/ChatConv', { conversationId, peerKind: 3, peerKey: `agent|${me}`, title });
    await expect.poll(async () =>
        (await api.query('/81/ChatConv', `select * from ChatConversation where conversationId=${conversationId}`)).list.length,
    { message: `Tanto conversation "${title}" was never created`, timeout: 30_000 }).toBe(1);
    return conversationId;
}

export async function conversationProfile(api: Api, conversationId: string): Promise<string> {
    const list = (await api.query<{ llmProfileId?: string }>('/81/ChatConv',
        `select * from ChatConversation where conversationId=${conversationId}`)).list;
    return list[0]?.llmProfileId ?? '';
}

/** The profile a message was stamped with ('' while the message is not stored yet). */
export async function messageProfile(api: Api, conversationId: string, body: string): Promise<string | null> {
    const list = (await api.query<{ body?: string; llmProfileId?: string }>('/81/ChatMsg',
        `select * from ChatMessage where conversationId=${conversationId} sort-by seq descending limit 50 page 0`)).list;
    const m = list.find((x) => x.body === body);
    return m ? (m.llmProfileId ?? '') : null;
}
