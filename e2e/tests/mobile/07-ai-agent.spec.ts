/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// AI agent on mobile: the floating bubble, a real chat round trip, and the
// AI Agent module's Chat page (desktop parity with 28-ai-agent).

import { test, expect, assertNoPageErrors } from '../../fixtures/test';
import { Page } from '@playwright/test';
import { safeCleanup } from '../../fixtures/api';
import { MobileNav } from '../../pages/MobileNav';

const LLM_TIMEOUT = 240_000;
const bubbleBtn = (p: Page) => p.locator('.l8agent-bubble-m-btn');
const panel = (p: Page) => p.locator('.l8agent-bubble-m-panel');

test.describe('mobile AI agent', () => {
    const conversations: string[] = [];
    test.afterEach(async ({ api }) => {
        for (const id of conversations.splice(0)) {
            await safeCleanup(`conversation ${id}`, () =>
                api.deleteById('/120/AgntConvo', 'L8AgentConversation', 'conversationId', id));
        }
    });

    test('the bubble opens and closes @smoke', async ({ mobile, consoleErrors }) => {
        await new MobileNav(mobile).waitForHome();
        await expect(bubbleBtn(mobile)).toBeVisible();
        await bubbleBtn(mobile).click();
        await expect(panel(mobile)).toHaveClass(/l8agent-bubble-m-open/);
        await expect(panel(mobile).locator('.l8agent-m-input')).toBeVisible();
        await panel(mobile).locator('.l8agent-bubble-m-close').click();
        await expect(panel(mobile)).not.toHaveClass(/l8agent-bubble-m-open/);
        assertNoPageErrors(consoleErrors);
    });

    test('a question gets a real answer', async ({ mobile, consoleErrors }) => {
        test.setTimeout(LLM_TIMEOUT + 60_000);
        await new MobileNav(mobile).waitForHome();
        await bubbleBtn(mobile).click();
        await expect(panel(mobile)).toHaveClass(/l8agent-bubble-m-open/);
        const replies = panel(mobile).locator('.l8agent-m-msg-assistant .l8agent-m-msg-body');
        const before = await replies.count();
        await panel(mobile).locator('.l8agent-m-input').fill('How many GPU servers are there? Answer with the number.');
        await panel(mobile).locator('.l8agent-m-send-btn').click();
        await expect(replies, 'the agent never answered').toHaveCount(before + 1, { timeout: LLM_TIMEOUT });
        const reply = (await replies.last().innerText()).trim();
        expect(reply, `the agent returned an error: ${reply}`).not.toMatch(/^Error:/);
        const id = await mobile.evaluate(() =>
            (window as unknown as { L8AgentBubbleMobile: { _conversationId: string | null } }).L8AgentBubbleMobile._conversationId || '');
        if (id) conversations.push(id);
        await panel(mobile).locator('.l8agent-bubble-m-close').click();
        assertNoPageErrors(consoleErrors);
    });

    test('the AI Agent module opens its Chat page', async ({ mobile, consoleErrors }) => {
        const nav = new MobileNav(mobile);
        await nav.waitForHome();
        await nav.openModule('aia');
        await nav.openByLabel('Agent');
        await nav.openByLabel('Chat');
        const chat = mobile.locator('#aia-chat-container');
        await expect(chat).toBeVisible();
        await expect.poll(async () => (await chat.innerHTML()).trim().length,
            { message: 'the Chat page rendered nothing (customInit did not run)' }).toBeGreaterThan(0);
        assertNoPageErrors(consoleErrors);
    });
});
