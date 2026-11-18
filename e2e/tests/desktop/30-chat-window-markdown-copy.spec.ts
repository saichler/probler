/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// Chat: moving the panel, markdown messages and the copy button.
//
// Move: the panel moves by dragging its header, stays inside the window,
// keeps its place across close/reopen, maximize/restore and a reload, and a
// double-click on the header maximizes and restores it.
// Markdown: a message's tables (with column alignment), headers, nested
// lists, quotes and code render as such; HTML in a message is shown as text.
// Copy: the icon in a message's corner puts the message's text on the
// clipboard and shows that it did.

import { test, expect, assertNoPageErrors } from '../../fixtures/test';
import { ENV } from '../../fixtures/env';
import { Chat, createConversation, postMessages } from '../../pages/Chat';

const LIVE_TIMEOUT = 30_000;

function unique(prefix: string): string {
    return `${prefix} ${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
}

const REPORT = (title: string) => [
    `## ${title}`,
    '',
    'Devices **by vendor**:',
    '',
    '| Vendor | Devices | Share |',
    '|:-------|--------:|:-----:|',
    '| Cisco | 10 | 53% |',
    '| Juniper | 9 | 47% |',
    '',
    '- Core',
    '  - Spine',
    '- Edge',
    '',
    '> Checked `today`',
    '',
    '<b>not html</b>',
].join('\n');

test.describe('chat panel moves', () => {
    test('the header drags the panel, it stays in the window and keeps its place @smoke', async ({ app, consoleErrors }) => {
        const chat = new Chat(app);
        await chat.open();
        await chat.resetPosition();
        try {
            await chat.setMaximized(false);
            const start = await chat.box();
            await chat.dragBy(-200, -120);
            const moved = await chat.box();
            expect(Math.abs(moved.x - (start.x - 200)), `the panel did not follow the drag: ${JSON.stringify(moved)}`).toBeLessThanOrEqual(2);
            expect(Math.abs(moved.y - (start.y - 120))).toBeLessThanOrEqual(2);
            expect([moved.width, moved.height], 'dragging changed the panel size').toEqual([start.width, start.height]);

            // Dragged past the edge, it stops at the window's corner.
            await chat.dragBy(-5000, -5000);
            expect(await chat.box()).toMatchObject({ x: 0, y: 0 });

            // Closing and reopening keeps the place.
            await chat.close();
            await chat.open();
            expect(await chat.box()).toMatchObject({ x: 0, y: 0 });

            // Maximized fills the window and cannot be dragged; restored goes back to its place.
            await chat.setMaximized(true);
            await chat.dragBy(150, 150);
            const viewport = app.viewportSize()!;
            expect(await chat.box()).toEqual({ x: 0, y: 0, width: viewport.width, height: viewport.height });
            await chat.setMaximized(false);
            expect(await chat.box()).toEqual({ x: 0, y: 0, width: start.width, height: start.height });

            // A double-click on the header maximizes and restores.
            await chat.header().locator('.l8chat-panel-title').dblclick();
            await expect(chat.panel()).toHaveClass(/l8chat-bubble-max/);
            await chat.header().locator('.l8chat-panel-title').dblclick();
            await expect(chat.panel()).not.toHaveClass(/l8chat-bubble-max/);
        } finally {
            await chat.setMaximized(false);
            await chat.resetPosition();
        }
        assertNoPageErrors(consoleErrors);
    });

    test('the dragged place survives a reload', async ({ freshApp, consoleErrors }) => {
        const chat = new Chat(freshApp);
        await chat.open();
        await chat.resetPosition();
        try {
            await chat.dragBy(-150, -80);
            const placed = await chat.box();
            await freshApp.reload();
            await chat.open();
            expect(await chat.box()).toEqual(placed);
        } finally {
            await chat.resetPosition();
        }
        assertNoPageErrors(consoleErrors);
    });
});

test.describe('chat markdown and copy', () => {
    test('a message renders its table, lists, quote and code, and HTML stays text @smoke', async ({ app, api, consoleErrors }) => {
        const title = unique('md');
        const id = await createConversation(api, ENV.user, ENV.chatPeerUser, title);
        await postMessages(api, id, [REPORT(title)]);

        const chat = new Chat(app);
        await chat.open();
        await chat.openPeer(ENV.chatPeerName);
        await expect(chat.conversation(title)).toBeVisible({ timeout: LIVE_TIMEOUT });
        await chat.conversation(title).click();
        const body = chat.message(title).locator('.l8chat-msg-body');
        await expect(body.locator('h2')).toHaveText(title);

        const table = body.locator('table.l8md-table');
        await expect(table.locator('thead th')).toHaveText(['Vendor', 'Devices', 'Share']);
        await expect(table.locator('tbody tr')).toHaveCount(2);
        await expect(table.locator('tbody tr').first().locator('td')).toHaveText(['Cisco', '10', '53%']);
        await expect(table.locator('tbody td').nth(1)).toHaveCSS('text-align', 'right');
        await expect(table.locator('tbody td').nth(2)).toHaveCSS('text-align', 'center');

        await expect(body.locator('p strong')).toHaveText('by vendor');
        await expect(body.locator('ul > li > ul > li')).toHaveText('Spine');
        await expect(body.locator('blockquote code')).toHaveText('today');
        await expect(body.locator('b'), 'HTML in a message was rendered').toHaveCount(0);
        await expect(body).toContainText('<b>not html</b>');
        assertNoPageErrors(consoleErrors);
    });

    test('the copy icon puts the message on the clipboard', async ({ app, api, consoleErrors }) => {
        await app.context().grantPermissions(['clipboard-read', 'clipboard-write']);
        const title = unique('copy');
        const text = REPORT(title);
        const id = await createConversation(api, ENV.user, ENV.chatPeerUser, title);
        await postMessages(api, id, [text]);

        const chat = new Chat(app);
        await chat.open();
        await chat.openPeer(ENV.chatPeerName);
        await expect(chat.conversation(title)).toBeVisible({ timeout: LIVE_TIMEOUT });
        await chat.conversation(title).click();
        const message = chat.message(title);
        const copy = chat.copyButton(message);
        await expect(copy).toBeVisible();
        // In the bottom-right corner of the message.
        const m = (await message.boundingBox())!, c = (await copy.boundingBox())!;
        expect(m.x + m.width - (c.x + c.width), 'the copy icon is not at the right edge').toBeLessThan(12);
        expect(m.y + m.height - (c.y + c.height), 'the copy icon is not at the bottom').toBeLessThan(12);

        await copy.click();
        await expect(copy).toHaveAttribute('title', 'Copied');
        expect(await app.evaluate(() => navigator.clipboard.readText())).toBe(text);
        await expect(copy).toHaveAttribute('title', 'Copy', { timeout: 5_000 });
        assertNoPageErrors(consoleErrors);
    });
});
