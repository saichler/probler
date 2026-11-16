/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// Chat on the mobile bundle: the bubble opens the full-screen drill-down
// (peers → conversations → thread) over the same views as the desktop, and a
// message sent from mobile is delivered.

import { test, expect, assertNoPageErrors } from '../../fixtures/test';
import { ENV } from '../../fixtures/env';
import { Chat, TANTO } from '../../pages/Chat';

const LIVE_TIMEOUT = 30_000;

test.describe('chat (mobile)', () => {
    test('the bubble opens full screen with Tanto pinned and drills into a thread @smoke', async ({ mobile, consoleErrors }) => {
        const chat = new Chat(mobile, true);
        await expect(chat.button()).toBeVisible();
        await chat.open();
        await expect(chat.peers().first().locator('.l8chat-peer-name')).toHaveText(TANTO);
        await chat.peer(TANTO).click();
        await expect(chat.panel().locator('.l8chat-m-title')).toHaveText(TANTO);
        await expect(chat.conversation('Tanto')).toBeVisible({ timeout: LIVE_TIMEOUT });
        await chat.conversation('Tanto').click();
        await expect(chat.panel().locator('.l8chat-m-thread.l8chat-m-active .l8chat-input')).toBeVisible();
        await chat.panel().locator('.l8chat-m-back').click();
        await chat.panel().locator('.l8chat-m-back').click();
        await expect(chat.panel().locator('.l8chat-m-peers.l8chat-m-active')).toBeVisible();
        await chat.close();
        assertNoPageErrors(consoleErrors);
    });

    test('a message sent from mobile is delivered', async ({ mobile, consoleErrors }) => {
        const chat = new Chat(mobile, true);
        await chat.open();
        await chat.openPeer(ENV.chatPeerName);
        await expect(chat.conversation('General')).toBeVisible({ timeout: LIVE_TIMEOUT });
        await chat.conversation('General').click();
        const text = `mobile ${Date.now().toString(36)}`;
        await chat.send(text);
        await expect(chat.message(text).locator('.l8chat-msg-meta'), 'the message never left "sending"')
            .not.toContainText('sending', { timeout: LIVE_TIMEOUT });
        await chat.close();
        assertNoPageErrors(consoleErrors);
    });
});
