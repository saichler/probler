/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// Chat: the LLM profile picker of a Tanto thread and the collapsible side
// columns.
//
// Picker: it names every l8secure profile as "name · model" and selects the
// one the conversation actually uses (its own, else the default one), never a
// bare "Default" placeholder; a profile added after the page loaded shows up
// on opening a conversation; choosing one is stored on the conversation and
// stamped on the next message; it is absent from non-Tanto threads.
//
// Maximize: the header's maximize button fills the window with the panel and
// restores it to its normal size; the choice stays across closing and
// reopening the panel.
//
// Columns: the sidebar and the conversation list fold to the left into a
// strip that still shows every status / unread dot (each row's name is its
// tooltip), the folded rows still open what they open, and the folded state
// survives a reload.

import { test, expect, assertNoPageErrors } from '../../fixtures/test';
import { ENV } from '../../fixtures/env';
import {
    Chat, TANTO, conversationProfile, createAgentConversation, createConversation, createProfile,
    deleteProfile, listProfiles, messageProfile, profileLabel
} from '../../pages/Chat';

const LIVE_TIMEOUT = 30_000;

function unique(prefix: string): string {
    return `${prefix} ${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
}

test.describe('chat LLM profile picker', () => {
    test('a Tanto thread names its profile and model, never a bare "Default" @smoke', async ({ app, api, consoleErrors }) => {
        const title = unique('profiles');
        await createAgentConversation(api, ENV.user, title);
        const profiles = await listProfiles(api);
        expect(profiles.length, 'l8secure has no LLM profiles').toBeGreaterThan(0);
        const fallback = profiles.find((p) => p.isDefault)!;

        const chat = new Chat(app);
        await chat.open();
        await chat.peer(TANTO).click();
        await chat.conversation(title).click();
        await expect(chat.threadTitle()).toHaveText(title);

        await expect(chat.profileWrap()).toBeVisible();
        await expect(chat.profileWrap()).toContainText('Model');
        await expect(chat.profileSelect()).toBeEnabled();
        // Every profile by "name · model" (other specs may add their own in parallel,
        // so no exact list), and no unnamed placeholder.
        for (const p of profiles) {
            await expect(chat.profileSelect().locator(`option[value="${p.profileId}"]`),
                `profile "${p.name}" is not offered by name and model`).toHaveText(profileLabel(p));
        }
        await expect(chat.profileSelect().locator('option[value=""]'), 'the picker still offers a placeholder')
            .toHaveCount(0);
        // A conversation without a profile of its own uses the default one.
        await expect(chat.selectedProfile()).toHaveText(profileLabel(fallback));
        await expect(chat.profileSelect()).toHaveValue(fallback.profileId);
        assertNoPageErrors(consoleErrors);
    });

    test('a new profile shows up on opening a thread, and choosing it is stored and used', async ({ app, api, consoleErrors }) => {
        const chat = new Chat(app);
        // Load the profiles first, so the new one must come from the refresh.
        await chat.open();
        await chat.peer(TANTO).click();
        await expect(chat.conversations().first()).toBeVisible({ timeout: LIVE_TIMEOUT });
        await chat.conversations().first().click();
        await expect(chat.profileSelect().locator('option').first()).toBeAttached();

        const title = unique('switch');
        const conversationId = await createAgentConversation(api, ENV.user, title);
        const profile = await createProfile(api, unique('E2E profile'));
        try {
            await expect(chat.conversation(title)).toBeVisible({ timeout: LIVE_TIMEOUT });
            await chat.conversation(title).click();
            await expect(chat.threadTitle()).toHaveText(title);
            const option = chat.profileSelect().locator(`option[value="${profile.profileId}"]`);
            await expect(option, 'the profile added in l8secure is not offered').toHaveText(profileLabel(profile));

            await chat.profileSelect().selectOption(profile.profileId);
            await expect.poll(() => conversationProfile(api, conversationId),
                { message: 'the chosen profile was not stored on the conversation', timeout: LIVE_TIMEOUT })
                .toBe(profile.profileId);

            const text = unique('which profile');
            await chat.send(text);
            await expect.poll(() => messageProfile(api, conversationId, text),
                { message: 'the message was not sent with the chosen profile', timeout: LIVE_TIMEOUT })
                .toBe(profile.profileId);

            // Reopening the thread keeps the choice.
            await chat.peer(TANTO).click();
            await chat.conversation(title).click();
            await expect(chat.profileSelect()).toHaveValue(profile.profileId);
        } finally {
            // Point the conversation back at a live profile before removing this one.
            const fallback = (await listProfiles(api)).find((p) => p.isDefault);
            await api.patch('/81/ChatConv', { conversationId, llmProfileId: fallback?.profileId })
                .catch((e) => console.warn('restore profile failed:', e.message));
            await deleteProfile(api, profile.profileId).catch((e) => console.warn('delete profile failed:', e.message));
        }
        assertNoPageErrors(consoleErrors);
    });

    test('the picker is not shown in a conversation with a user', async ({ app, consoleErrors }) => {
        const chat = new Chat(app);
        await chat.open();
        await chat.openPeer(ENV.chatPeerName);
        await expect(chat.threadTitle()).toHaveText('General', { timeout: LIVE_TIMEOUT });
        await expect(chat.profileWrap()).toBeHidden();
        assertNoPageErrors(consoleErrors);
    });
});

test.describe('chat collapsible side columns', () => {
    test('the sidebar folds left to its dots and still opens a peer @smoke', async ({ app, consoleErrors }) => {
        const chat = new Chat(app);
        await chat.open();
        try {
            await expect(chat.collapseButton('sidebar')).toHaveAttribute('title', 'Collapse');
            await chat.setCollapsed('sidebar', true);
            await expect(chat.collapseButton('sidebar')).toHaveAttribute('title', 'Expand');

            // Text is gone, the dots stay inside the strip.
            await expect(chat.panel().locator('.l8chat-me-name')).toBeHidden();
            await expect(chat.panel().locator('.l8chat-search')).toBeHidden();
            await expect(chat.panel().locator('.l8chat-new-group')).toBeHidden();
            await expect(chat.peers().first().locator('.l8chat-peer-name')).toBeHidden();
            await chat.expectInsideColumn('sidebar', chat.panel().locator('.l8chat-me-status .l8chat-dot'), 'my status dot');
            await chat.expectInsideColumn('sidebar', chat.collapseButton('sidebar'), 'the expand button');
            const rows = await chat.peers().count();
            expect(rows, 'the sidebar has no rows').toBeGreaterThan(1);
            for (let i = 0; i < Math.min(rows, 5); i++) {
                const row = chat.peers().nth(i);
                const badge = row.locator('.l8chat-dot, .l8chat-group-icon');
                await chat.expectInsideColumn('sidebar', badge, `row ${i}'s status dot`);
            }
            const tanto = chat.peers().first();
            await expect(tanto).toHaveAttribute('title', TANTO);

            // A folded row still opens its conversations.
            await tanto.click();
            await expect(chat.panel().locator('.l8chat-convlist-title')).toHaveText(TANTO);

            await chat.setCollapsed('sidebar', false);
            await expect(chat.peers().first().locator('.l8chat-peer-name')).toBeVisible();
            await expect(chat.panel().locator('.l8chat-search')).toBeVisible();
        } finally {
            await chat.setCollapsed('sidebar', false);
        }
        assertNoPageErrors(consoleErrors);
    });

    test('the conversation list folds left to its dots and still opens a conversation', async ({ app, api, consoleErrors }) => {
        const title = unique('fold');
        await createConversation(api, ENV.user, ENV.chatPeerUser, title);
        const chat = new Chat(app);
        await chat.open();
        await chat.openPeer(ENV.chatPeerName);
        await expect(chat.conversation(title)).toBeVisible({ timeout: LIVE_TIMEOUT });
        try {
            await chat.setCollapsed('convs', true);
            await expect(chat.panel().locator('.l8chat-convlist-title')).toBeHidden();
            await expect(chat.panel().locator('.l8chat-new-conv')).toBeHidden();
            await expect(chat.conversations().first().locator('.l8chat-conv-title')).toBeHidden();
            const row = chat.conversation(title);
            await expect(row).toHaveAttribute('title', title);
            await chat.expectInsideColumn('convs', row.locator('.l8chat-conv-dot'), `"${title}"'s unread dot`);
            await chat.expectInsideColumn('convs', chat.collapseButton('convs'), 'the expand button');
            // The sidebar is untouched by folding the list.
            expect(await chat.columnWidth('sidebar')).toBeGreaterThan(200);

            await row.click();
            await expect(chat.threadTitle()).toHaveText(title);

            await chat.setCollapsed('convs', false);
            await expect(chat.conversation(title).locator('.l8chat-conv-title')).toBeVisible();
        } finally {
            await chat.setCollapsed('convs', false);
        }
        assertNoPageErrors(consoleErrors);
    });

    test('both columns fold together, leaving the thread the room', async ({ app, consoleErrors }) => {
        const chat = new Chat(app);
        await chat.open();
        await chat.openPeer(ENV.chatPeerName);
        await expect(chat.threadTitle()).toHaveText('General', { timeout: LIVE_TIMEOUT });
        const before = (await chat.panel().locator('.l8chat-col-thread').boundingBox())!.width;
        try {
            await chat.setCollapsed('sidebar', true);
            await chat.setCollapsed('convs', true);
            await chat.expectInsideColumn('sidebar', chat.peers().first().locator('.l8chat-dot'), "Tanto's dot");
            await chat.expectInsideColumn('convs', chat.conversations().first().locator('.l8chat-conv-dot'),
                'the first conversation dot');
            const after = (await chat.panel().locator('.l8chat-col-thread').boundingBox())!.width;
            expect(after, 'the thread did not take the freed width').toBeGreaterThan(before + 350);
        } finally {
            await chat.setCollapsed('convs', false);
            await chat.setCollapsed('sidebar', false);
        }
        assertNoPageErrors(consoleErrors);
    });

    test('the folded state survives a reload', async ({ freshApp, consoleErrors }) => {
        const chat = new Chat(freshApp);
        await chat.open();
        await chat.setCollapsed('sidebar', true);
        await freshApp.reload();
        await chat.open();
        await expect(chat.column('sidebar')).toHaveClass(/l8chat-col-collapsed/);
        await expect(chat.collapseButton('sidebar')).toHaveAttribute('title', 'Expand');
        await chat.setCollapsed('sidebar', false);
        await freshApp.reload();
        await chat.open();
        await expect(chat.column('sidebar')).not.toHaveClass(/l8chat-col-collapsed/);
        assertNoPageErrors(consoleErrors);
    });
});

test.describe('chat maximize', () => {
    test('the panel maximizes to the window and restores to its size @smoke', async ({ app, consoleErrors }) => {
        const chat = new Chat(app);
        await chat.open();
        try {
            await chat.setMaximized(false);
            const normal = (await chat.panel().boundingBox())!;
            const viewport = app.viewportSize()!;
            expect(normal.width, 'the normal panel already fills the window').toBeLessThan(viewport.width);

            await chat.setMaximized(true);
            await expect.poll(async () => {
                const b = (await chat.panel().boundingBox())!;
                return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)];
            }, { message: 'the maximized panel does not fill the window' })
                .toEqual([0, 0, viewport.width, viewport.height]);
            // Still usable: the header buttons and the chat are on screen.
            await expect(chat.panel().locator('.l8chat-close')).toBeInViewport();
            await expect(chat.peers().first()).toBeVisible();

            // Closing and reopening keeps it maximized.
            await chat.close();
            await chat.open();
            await expect(chat.panel()).toHaveClass(/l8chat-bubble-max/);

            await chat.setMaximized(false);
            await expect.poll(async () => {
                const b = (await chat.panel().boundingBox())!;
                return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)];
            }, { message: 'the panel did not restore to its normal size' })
                .toEqual([Math.round(normal.x), Math.round(normal.y), Math.round(normal.width), Math.round(normal.height)]);
        } finally {
            await chat.setMaximized(false);
        }
        assertNoPageErrors(consoleErrors);
    });
});
