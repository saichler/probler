/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// Chat on the mobile bundle: the Tanto thread's LLM profile picker (the same
// thread view as the desktop) names the profiles and stores a choice, and the
// desktop-only column folding and maximize are not offered.

import { test, expect, assertNoPageErrors } from '../../fixtures/test';
import { ENV } from '../../fixtures/env';
import {
    Chat, TANTO, conversationProfile, createAgentConversation, createProfile, deleteProfile, listProfiles,
    messageProfile, profileLabel
} from '../../pages/Chat';

const LIVE_TIMEOUT = 30_000;

function unique(prefix: string): string {
    return `${prefix} ${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
}

test.describe('chat LLM profile picker (mobile)', () => {
    test('a Tanto thread names its profile and stores a new choice @smoke', async ({ mobile, api, consoleErrors }) => {
        const title = unique('m-profiles');
        const conversationId = await createAgentConversation(api, ENV.user, title);
        const profile = await createProfile(api, unique('E2E mobile profile'));
        try {
            const fallback = (await listProfiles(api)).find((p) => p.isDefault)!;
            const chat = new Chat(mobile, true);
            await chat.open();
            await chat.peer(TANTO).click();
            await expect(chat.conversation(title)).toBeVisible({ timeout: LIVE_TIMEOUT });
            await chat.conversation(title).click();
            const thread = chat.panel().locator('.l8chat-m-thread.l8chat-m-active');
            await expect(thread.locator('.l8chat-input')).toBeVisible();

            const select = thread.locator('.l8chat-profile');
            await expect(thread.locator('.l8chat-profile-wrap')).toContainText('Model');
            await expect(select).toBeVisible();
            await expect(select).toBeEnabled();
            // On screen, not pushed off the edge by the title.
            const box = (await select.boundingBox())!;
            const viewport = mobile.viewportSize()!;
            expect(box.x + box.width, 'the picker runs off the screen').toBeLessThanOrEqual(viewport.width);
            await expect(select.locator('option[value=""]'), 'the picker still offers a placeholder').toHaveCount(0);
            await expect(select.locator('option:checked')).toHaveText(profileLabel(fallback));
            await expect(select.locator(`option[value="${profile.profileId}"]`)).toHaveText(profileLabel(profile));

            await select.selectOption(profile.profileId);
            await expect.poll(() => conversationProfile(api, conversationId),
                { message: 'the chosen profile was not stored on the conversation', timeout: LIVE_TIMEOUT })
                .toBe(profile.profileId);
            const text = unique('mobile profile');
            await chat.send(text);
            await expect.poll(() => messageProfile(api, conversationId, text),
                { message: 'the message was not sent with the chosen profile', timeout: LIVE_TIMEOUT })
                .toBe(profile.profileId);
            await chat.close();
        } finally {
            const fallback = (await listProfiles(api)).find((p) => p.isDefault);
            await api.patch('/81/ChatConv', { conversationId, llmProfileId: fallback?.profileId })
                .catch((e) => console.warn('restore profile failed:', e.message));
            await deleteProfile(api, profile.profileId).catch((e) => console.warn('delete profile failed:', e.message));
        }
        assertNoPageErrors(consoleErrors);
    });

    test('the column fold and maximize buttons are not offered on mobile', async ({ mobile, consoleErrors }) => {
        const chat = new Chat(mobile, true);
        await chat.open();
        await expect(chat.panel().locator('.l8chat-maximize'), 'mobile chat is already full screen').toHaveCount(0);
        await expect(chat.panel().locator('.l8chat-m-peers .l8chat-collapse')).toBeHidden();
        await chat.peer(TANTO).click();
        await expect(chat.panel().locator('.l8chat-m-convs.l8chat-m-active')).toBeVisible();
        await expect(chat.panel().locator('.l8chat-m-convs .l8chat-collapse')).toBeHidden();
        await expect(chat.panel().locator('.l8chat-m-convs .l8chat-new-conv')).toBeVisible();
        await chat.close();
        assertNoPageErrors(consoleErrors);
    });
});
