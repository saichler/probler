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
