/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// AI agent (l8agent): the floating chat bubble on every screen, a real chat
// round trip through the local LLM (TestLLM credentials, hostAliases to the LAN
// address), @help answered from help.md, persisted conversations, and the
// AI Agent section (chat, conversations, prompts).

import { test, expect, assertNoPageErrors } from '../../fixtures/test';
import { Page } from '@playwright/test';
import { safeCleanup } from '../../fixtures/api';
import { DesktopNav } from '../../pages/DesktopNav';
import { DesktopTable } from '../../pages/DesktopTable';

const LLM_TIMEOUT = 240_000; // first message is ~14.5k prompt tokens + tool rounds

const bubbleBtn = (p: Page) => p.locator('.l8agent-bubble-btn');
const panel = (p: Page) => p.locator('.l8agent-bubble-panel');

async function openBubble(page: Page) {
    if (!(await panel(page).evaluate((el) => el.classList.contains('l8agent-bubble-open')).catch(() => false))) {
        await bubbleBtn(page).click();
    }
    await expect(panel(page)).toHaveClass(/l8agent-bubble-open/);
}

/** Sends one message through the bubble and returns the assistant's reply text. */
async function ask(page: Page, text: string): Promise<string> {
    await openBubble(page);
    const replies = panel(page).locator('.l8agent-msg-assistant .l8agent-msg-body');
    const before = await replies.count();
    await panel(page).locator('.l8agent-chat-input').fill(text);
    await panel(page).locator('.l8agent-send-btn').click();
    await expect(panel(page).locator('.l8agent-msg-user').last()).toContainText(text);
    await expect(replies, 'the agent never answered').toHaveCount(before + 1, { timeout: LLM_TIMEOUT });
    await expect(panel(page).locator('#l8agent-bubble-loading')).toHaveCount(0);
    return (await replies.last().innerText()).trim();
}

async function conversationId(page: Page): Promise<string> {
    return page.evaluate(() =>
        (window as unknown as { L8AgentBubble: { _conversationId: string | null } }).L8AgentBubble._conversationId || '');
}

test.describe('AI agent bubble', () => {
    const conversations: string[] = [];

    test.afterEach(async ({ api }) => {
        for (const id of conversations.splice(0)) {
            await safeCleanup(`conversation ${id}`, () =>
                api.deleteById('/120/AgntConvo', 'L8AgentConversation', 'conversationId', id));
        }
    });

    test('the bubble is on every screen and opens / closes @smoke', async ({ app, consoleErrors }) => {
        const nav = new DesktopNav(app);
        for (const section of ['dashboard', 'network', 'kubernetes', 'alarms', 'system']) {
            await nav.openSection(section);
            await expect(bubbleBtn(app), `no AI bubble on ${section}`).toBeVisible();
        }
        await openBubble(app);
        await expect(panel(app).locator('.l8agent-chat-input')).toBeVisible();
        await panel(app).locator('.l8agent-bubble-close').click();
        await expect(panel(app)).not.toHaveClass(/l8agent-bubble-open/);
        assertNoPageErrors(consoleErrors);
    });

    test('a question about the datacenter gets a real answer and is persisted', async ({ app, api, consoleErrors }) => {
        test.setTimeout(LLM_TIMEOUT + 60_000);
        await app.evaluate(() =>
            (window as unknown as { L8AgentBubble: { _newConversation(): void } }).L8AgentBubble._newConversation());
        const reply = await ask(app, 'How many network devices are there? Answer with the number.');
        expect(reply, `the agent returned an error: ${reply}`).not.toMatch(/^Error:/);
        expect(reply.length).toBeGreaterThan(0);

        const id = await conversationId(app);
        expect(id, 'the chat returned no conversation id').toBeTruthy();
        conversations.push(id);
        await expect.poll(async () =>
            (await api.query('/120/AgntConvo', `select * from L8AgentConversation where conversationId=${id}`)).list.length,
        { message: 'the conversation was not persisted' }).toBe(1);
        assertNoPageErrors(consoleErrors);
    });

    test('@help answers from probler\'s help.md', async ({ app, consoleErrors }) => {
        test.setTimeout(LLM_TIMEOUT + 60_000);
        await app.evaluate(() =>
            (window as unknown as { L8AgentBubble: { _newConversation(): void } }).L8AgentBubble._newConversation());
        const reply = await ask(app, '@help how do I add a target?');
        expect(reply, `the agent returned an error: ${reply}`).not.toMatch(/^Error:/);
        expect(reply.toLowerCase(), 'the @help answer does not describe adding a target').toContain('target');
        const id = await conversationId(app);
        if (id) conversations.push(id);
        assertNoPageErrors(consoleErrors);
    });
});

test.describe('AI Agent section', () => {
    test('the chat view renders in the section', async ({ app, consoleErrors }) => {
        const nav = new DesktopNav(app);
        await nav.openSection('aia');
        await nav.openService('agent', 'chat');
        const chat = app.locator('#agent-chat-table-container');
        await expect(chat.locator('.l8agent-chat-input, textarea, input').first(), 'the chat view rendered no input')
            .toBeVisible();
        assertNoPageErrors(consoleErrors);
    });

    test('the default prompts are seeded', async ({ app, consoleErrors }) => {
        const nav = new DesktopNav(app);
        await nav.openSection('aia');
        await nav.openService('agent', 'prompts');
        const table = new DesktopTable(app, 'agent', 'prompts');
        expect(await table.waitForResolved()).toBe('rows');
        for (const name of ['Network Operations', 'Kubernetes', 'Alarm Triage']) {
            await expect(table.rows().filter({ hasText: name }).first(), `prompt "${name}" not seeded`).toBeVisible();
        }
        assertNoPageErrors(consoleErrors);
    });
});
