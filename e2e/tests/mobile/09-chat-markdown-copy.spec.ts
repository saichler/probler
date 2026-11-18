/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// Chat on the mobile bundle: messages render markdown (a wide table scrolls
// inside its own box instead of widening the screen) and each message has a
// copy icon.

import { test, expect, assertNoPageErrors } from '../../fixtures/test';
import { ENV } from '../../fixtures/env';
import { Chat, createConversation, postMessages } from '../../pages/Chat';

const LIVE_TIMEOUT = 30_000;

function unique(prefix: string): string {
    return `${prefix} ${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
}

test.describe('chat markdown and copy (mobile)', () => {
    test('a table renders inside the screen and the message copies @smoke', async ({ mobile, api, consoleErrors }) => {
        await mobile.context().grantPermissions(['clipboard-read', 'clipboard-write']);
        const title = unique('m-md');
        const text = [`### ${title}`, '',
            '| Device | Vendor | Model | Location | Status | Uptime |',
            '|---|---|---|---|---|---|',
            '| core-router-01.example.net | Cisco | ASR 9006 | Landen, Flanders, Belgium | Up | 41 days |',
            '| edge-switch-17.example.net | Juniper | EX4300-48T | San Francisco, California | Up | 12 days |'].join('\n');
        const id = await createConversation(api, ENV.user, ENV.chatPeerUser, title);
        await postMessages(api, id, [text]);

        const chat = new Chat(mobile, true);
        await chat.open();
        await chat.openPeer(ENV.chatPeerName);
        await expect(chat.conversation(title)).toBeVisible({ timeout: LIVE_TIMEOUT });
        await chat.conversation(title).click();
        const thread = chat.panel().locator('.l8chat-m-thread.l8chat-m-active');
        const message = thread.locator('.l8chat-msg').filter({ hasText: title }).last();
        await expect(message.locator('table.l8md-table tbody tr')).toHaveCount(2);

        // The wide table scrolls in its box; the page itself does not get wider.
        const viewport = mobile.viewportSize()!;
        const wrap = (await message.locator('.l8md-table-wrap').boundingBox())!;
        expect(wrap.x + wrap.width, 'the table box runs off the screen').toBeLessThanOrEqual(viewport.width);
        expect(await mobile.evaluate(() => document.documentElement.scrollWidth),
            'the table widened the page').toBeLessThanOrEqual(viewport.width);

        const copy = message.locator('.l8chat-msg-copy');
        await copy.click();
        await expect(copy).toHaveAttribute('title', 'Copied');
        expect(await mobile.evaluate(() => navigator.clipboard.readText())).toBe(text);
        await chat.close();
        assertNoPageErrors(consoleErrors);
    });
});
