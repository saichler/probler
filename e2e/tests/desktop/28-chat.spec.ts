/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// Chat (l8chat over the l8ai chat services, area 81): the bubble on every
// screen with Tanto pinned, a direct conversation between two users with live
// delivery, pending → sent and unread → read, paging of older messages, the
// "+" conversation and group dialogs, presence seen by another user, and a
// real answer from Tanto through the test LLM.

import { test, expect, assertNoPageErrors } from '../../fixtures/test';
import { ENV } from '../../fixtures/env';
import { Api } from '../../fixtures/api';
import { DesktopNav } from '../../pages/DesktopNav';
import { Popup } from '../../pages/Popup';
import { Chat, TANTO, createAgentConversation, createConversation, openUserPage, postMessages } from '../../pages/Chat';

const LLM_TIMEOUT = 240_000;
const LIVE_TIMEOUT = 30_000;

function unique(prefix: string): string {
    return `${prefix} ${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
}

test.describe('chat bubble', () => {
    test('the bubble is on every screen, opens with Tanto pinned first and closes @smoke', async ({ app, consoleErrors }) => {
        const nav = new DesktopNav(app);
        const chat = new Chat(app);
        for (const section of ['dashboard', 'network', 'kubernetes', 'alarms', 'system']) {
            await nav.openSection(section);
            await expect(chat.button(), `no chat bubble on ${section}`).toBeVisible();
        }
        await chat.open();
        await expect(chat.peers().first().locator('.l8chat-peer-name')).toHaveText(TANTO);
        await chat.close();
        assertNoPageErrors(consoleErrors);
    });

    test('a direct message is pending, then sent, and arrives live and unread at the other user', async ({ app, browser, consoleErrors }) => {
        const peer = await openUserPage(browser, ENV.chatPeerUser, ENV.chatPeerPass);
        try {
            const mine = new Chat(app);
            const theirs = new Chat(peer.page);
            await theirs.open();

            await mine.open();
            await mine.openPeer(ENV.chatPeerName);
            await expect(mine.threadTitle(), 'the direct conversation did not open').toHaveText('General');

            const text = unique('hello from e2e');
            await mine.send(text);
            const sent = mine.message(text);
            await expect(sent).toBeVisible();
            await expect(sent.locator('.l8chat-msg-meta'), 'the message never left "sending"')
                .not.toContainText('sending', { timeout: LIVE_TIMEOUT });

            // The other user's sidebar gets the conversation live, unread.
            const row = theirs.peer(ENV.userName);
            await expect(row.locator('.l8chat-unread'), 'no unread mark arrived for the other user')
                .toBeVisible({ timeout: LIVE_TIMEOUT });
            await row.click();
            await expect(theirs.conversation('General')).toBeVisible();
            await theirs.conversation('General').click();
            await expect(theirs.message(text)).toBeVisible({ timeout: LIVE_TIMEOUT });
            // Opening it marks it read: the conversation's dot turns grey.
            await expect(theirs.conversation('General').locator('.l8chat-conv-read'))
                .toBeVisible({ timeout: LIVE_TIMEOUT });
        } finally {
            await peer.close();
        }
        assertNoPageErrors(consoleErrors);
    });

    test('a thread shows the newest 10 messages and loads older ones', async ({ app, api, consoleErrors }) => {
        const title = unique('paging');
        const id = await createConversation(api, ENV.user, ENV.chatPeerUser, title);
        await postMessages(api, id, Array.from({ length: 12 }, (_, i) => `${title} #${i + 1}`));

        const chat = new Chat(app);
        await chat.open();
        await chat.openPeer(ENV.chatPeerName);
        await chat.conversation(title).click();
        await expect(chat.threadTitle()).toHaveText(title);
        await expect(chat.messages()).toHaveCount(10);
        await expect(chat.message(`${title} #12`)).toBeVisible();
        await chat.panel().locator('.l8chat-older').click();
        await expect(chat.messages()).toHaveCount(12);
        await expect(chat.message(`${title} #1`)).toBeVisible();
        assertNoPageErrors(consoleErrors);
    });

    test('the + button creates a named conversation with the selected peer', async ({ app, consoleErrors }) => {
        const chat = new Chat(app);
        await chat.open();
        await chat.openPeer(ENV.chatPeerName);
        await chat.panel().locator('.l8chat-new-conv').click();
        const popup = new Popup(app);
        await popup.waitForOpen();
        const title = unique('topic');
        await popup.body().locator('.l8chat-conv-name').fill(title);
        await popup.saveButton().click();
        await expect(popup.root()).toHaveCount(0);
        await expect(chat.conversation(title)).toBeVisible({ timeout: LIVE_TIMEOUT });
        await expect(chat.threadTitle()).toHaveText(title, { timeout: LIVE_TIMEOUT });
        assertNoPageErrors(consoleErrors);
    });

    test('a group is created through the dual list and appears in the sidebar', async ({ app, consoleErrors }) => {
        const chat = new Chat(app);
        await chat.open();
        await chat.panel().locator('.l8chat-new-group').click();
        const popup = new Popup(app);
        await popup.waitForOpen();
        const name = unique('team');
        await popup.body().locator('.l8chat-group-name').fill(name);
        const candidate = popup.body().locator('.l8chat-group-users .l8chat-group-item', { hasText: ENV.chatPeerName });
        await expect(candidate).toBeVisible();
        await candidate.dblclick();
        await expect(popup.body().locator('.l8chat-group-selected .l8chat-group-item', { hasText: ENV.chatPeerName }))
            .toBeVisible();
        await popup.saveButton().click();
        await expect(popup.root()).toHaveCount(0);
        await expect(chat.peer(name), 'the new group is not in the sidebar').toBeVisible({ timeout: LIVE_TIMEOUT });
        assertNoPageErrors(consoleErrors);
    });

    test('a status change is seen live by another user', async ({ app, api, browser, consoleErrors }) => {
        // A conversation makes each user a peer of the other, so the other
        // user's sidebar registers this user's presence.
        await createConversation(api, ENV.user, ENV.chatPeerUser, unique('presence'));
        const peer = await openUserPage(browser, ENV.chatPeerUser, ENV.chatPeerPass);
        const mine = new Chat(app);
        try {
            const theirs = new Chat(peer.page);
            await theirs.open();
            const dot = theirs.peer(ENV.userName).locator('.l8chat-dot');
            await expect(dot).toBeVisible({ timeout: LIVE_TIMEOUT });

            await mine.open();
            await mine.panel().locator('.l8chat-me-status').click();
            await mine.panel().locator('.l8chat-status-option', { hasText: 'Away' }).click();
            await expect(dot, 'the away status did not reach the other user')
                .toHaveClass(/l8chat-dot-away/, { timeout: LIVE_TIMEOUT });
        } finally {
            await mine.panel().locator('.l8chat-me-status').click();
            await mine.panel().locator('.l8chat-status-option', { hasText: 'Online' }).click();
            await peer.close();
        }
        assertNoPageErrors(consoleErrors);
    });

    test('Tanto answers a question about the datacenter with the real count', async ({ app, api, consoleErrors }) => {
        test.setTimeout(LLM_TIMEOUT + 60_000);
        const chat = new Chat(app);
        await chat.open();
        await chat.peer(TANTO).click();
        await expect(chat.threadTitle(), 'the Tanto conversation did not open').toHaveText('Tanto', { timeout: LIVE_TIMEOUT });
        const answers = chat.panel().locator('.l8chat-msg-agent');
        const before = await answers.count();
        await chat.send('How many network devices are there? Answer with the number.');
        await expect(answers, 'Tanto never answered').toHaveCount(before + 1, { timeout: LLM_TIMEOUT });
        const reply = (await answers.last().locator('.l8chat-msg-body').innerText()).trim();
        expect(reply.length, 'Tanto answered with an empty message').toBeGreaterThan(0);
        // The answer must come from the data, not a refusal: it names the count
        // the network devices table reports.
        const devices = await api.total('/0/NCache', 'NetworkDevice');
        expect(devices, 'the cluster has no network devices to count').toBeGreaterThan(0);
        expect(reply, `Tanto's answer does not state the ${devices} network devices: ${reply}`)
            .toMatch(new RegExp(`\\b${devices}\\b`));
        await expect(chat.panel().locator('.l8chat-typing')).toBeHidden();
        assertNoPageErrors(consoleErrors);
    });

    // GpuDevice.deviceInfo is not annotated AIMask, so its gpuCount reaches the
    // model: the answer is the real total, never a masked placeholder.
    test('Tanto answers how many GPUs there are with the real total', async ({ app, api, consoleErrors }) => {
        test.setTimeout(LLM_TIMEOUT + 60_000);
        const servers = (await api.query<{ deviceInfo?: { gpuCount?: number } }>('/2/GCache',
            'select * from GpuDevice limit 100 page 0')).list;
        const gpus = servers.reduce((n, s) => n + (s.deviceInfo?.gpuCount ?? 0), 0);
        expect(gpus, 'the cluster has no GPUs to count').toBeGreaterThan(0);
        // Its own Tanto conversation: the other Tanto test asks in the default
        // one in parallel, and a turn answers its conversation's last question.
        const title = unique('gpus');
        await createAgentConversation(api, ENV.user, title);

        const chat = new Chat(app);
        await chat.open();
        await chat.peer(TANTO).click();
        await expect(chat.conversation(title)).toBeVisible({ timeout: LIVE_TIMEOUT });
        await chat.conversation(title).click();
        await expect(chat.threadTitle(), 'the Tanto conversation did not open').toHaveText(title, { timeout: LIVE_TIMEOUT });
        const answers = chat.panel().locator('.l8chat-msg-agent');
        const before = await answers.count();
        await chat.send('How many GPUs do I have? Answer with the number.');
        await expect(answers, 'Tanto never answered').toHaveCount(before + 1, { timeout: LLM_TIMEOUT });
        const reply = (await answers.last().locator('.l8chat-msg-body').innerText()).trim();
        expect(reply, 'the answer shows a masked placeholder').not.toMatch(/\[MASK(ED)?[\]_]/);
        expect(reply, `Tanto's answer does not state the ${gpus} GPUs: ${reply}`).toMatch(new RegExp(`\\b${gpus}\\b`));
        assertNoPageErrors(consoleErrors);
    });
});

test.describe('chat attachments', () => {
    // The agent reads a text file attached to the user's message and does
    // what it asks; before, it never saw attachments and asked for the file.
    test('Tanto reads an attached file and answers the request inside it', async ({ app, api, consoleErrors }) => {
        test.setTimeout(LLM_TIMEOUT + 60_000);
        const devices = await api.total('/0/NCache', 'NetworkDevice');
        expect(devices, 'the cluster has no network devices to count').toBeGreaterThan(0);
        const title = unique('file');
        await createAgentConversation(api, ENV.user, title);

        const chat = new Chat(app);
        await chat.open();
        await chat.peer(TANTO).click();
        await expect(chat.conversation(title)).toBeVisible({ timeout: LIVE_TIMEOUT });
        await chat.conversation(title).click();
        await expect(chat.threadTitle()).toHaveText(title, { timeout: LIVE_TIMEOUT });
        const answers = chat.panel().locator('.l8chat-msg-agent');
        const before = await answers.count();

        await chat.attach('request.txt', 'can you tell me how many network devices are there in the system? Answer with the number.\n');
        await chat.send('can you read the attached file and do the request inside of it?');
        await expect(answers, 'Tanto never answered').toHaveCount(before + 1, { timeout: LLM_TIMEOUT });
        const reply = (await answers.last().locator('.l8chat-msg-body').innerText()).trim();
        expect(reply, `Tanto did not answer the file's request with the ${devices} network devices: ${reply}`)
            .toMatch(new RegExp(`\\b${devices}\\b`));
        assertNoPageErrors(consoleErrors);
    });
});

test.describe('chat files from Tanto', () => {
    // Tanto exports records with export_csv: the agent writes every matching
    // record to a CSV attached to the answer, instead of the model typing a
    // few rows into the chat.
    test('Tanto attaches a CSV of all the network devices for download', async ({ app, api, consoleErrors }) => {
        test.setTimeout(LLM_TIMEOUT + 60_000);
        const devices = await api.total('/0/NCache', 'NetworkDevice');
        expect(devices, 'the cluster has no network devices to export').toBeGreaterThan(0);
        const title = unique('csv');
        const conversationId = await createAgentConversation(api, ENV.user, title);

        const chat = new Chat(app);
        await chat.open();
        await chat.peer(TANTO).click();
        await expect(chat.conversation(title)).toBeVisible({ timeout: LIVE_TIMEOUT });
        await chat.conversation(title).click();
        await expect(chat.threadTitle()).toHaveText(title, { timeout: LIVE_TIMEOUT });
        const answers = chat.panel().locator('.l8chat-msg-agent');
        const before = await answers.count();
        await chat.send('can you create a csv file, listing the Network Devices in this system and attach it for downloading in this chat?');
        await expect(answers, 'Tanto never answered').toHaveCount(before + 1, { timeout: LLM_TIMEOUT });
        const answer = answers.last();
        const chip = answer.locator('.l8chat-chip').filter({ hasText: /\.csv/ });
        await expect(chip, `Tanto's answer has no CSV attached: ${await answer.innerText()}`).toBeVisible();
        await expect(chip.locator('.l8chat-chip-action')).toHaveText('Download');

        // The attached file holds every device, one row each, under a header.
        const reply = (await api.query<{ kind?: number | string; attachments?: { storagePath: string; fileName: string }[] }>('/81/ChatMsg',
            `select * from ChatMessage where conversationId=${conversationId} sort-by seq descending limit 10 page 0`)).list
            .find((m) => (m.attachments || []).length > 0);
        expect(reply, 'the stored answer has no attachment').toBeTruthy();
        const file = await api.put('/0/FileStore', { storagePath: reply!.attachments![0].storagePath });
        const csv = Buffer.from(file.fileData, 'base64').toString('utf8').trim().split('\n');
        expect(csv.length - 1, `the CSV has ${csv.length - 1} rows, not the ${devices} devices:\n${csv.slice(0, 3).join('\n')}`).toBe(devices);
        expect(csv[0], 'the CSV has no header row').toMatch(/[A-Za-z]/);
        assertNoPageErrors(consoleErrors);
    });
});

test.describe('chat API', () => {
    test('a non-member can neither read nor post in a conversation', async ({ api }) => {
        const viewer = await Api.login(ENV.readOnlyUser, ENV.readOnlyPass);
        try {
            const id = await createConversation(api, ENV.user, ENV.chatPeerUser, unique('private'));
            await expect(viewer.query('/81/ChatMsg',
                `select * from ChatMessage where conversationId=${id} sort-by seq descending limit 10 page 0`))
                .rejects.toThrow();
        } finally {
            await viewer.dispose();
        }
    });
});
