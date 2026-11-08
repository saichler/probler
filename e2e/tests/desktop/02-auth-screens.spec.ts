/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// PHASE 13 -- the auth screens: register (+ CAPTCHA), forgot/reset password, TFA,
// must-change-password, session timeout.
//
// These are the only pages a completely unauthenticated stranger can reach, so
// they are both the highest-risk surface and the one no other spec touches: every
// other spec in this suite starts by seeding a bearer token.
//
// Server routes confirmed present in l8web/l8secure: /auth, /captcha, /register,
// /forgotPassword, /resetPassword, /tfaSetup, /tfaSetupVerify, /tfaVerify.
//
// DELIBERATELY NO HAPPY-PATH REGISTRATION. Creating a real user would litter the
// cluster with an account that cannot be removed through any UI, which is the
// same mistake that left two undeletable ModConfig rows behind earlier in this
// work. So registration is proven through its REJECTION paths (bad captcha,
// missing fields), which is where the security value is anyway -- a register
// endpoint that accepts a wrong CAPTCHA is the actual bug worth catching.

import { test, expect } from '../../fixtures/test';
import { ENV } from '../../fixtures/env';

/** The auth pages, and a global each one's scripts must define. */
const AUTH_PAGES: { url: string; label: string; globals: string[] }[] = [
    {
        url: '/l8ui/login/',
        label: 'login',
        globals: ['LOGIN_CONFIG']
    },
    {
        url: '/l8ui/login/forgot-password.html',
        label: 'forgot password',
        globals: []
    },
    {
        url: '/l8ui/login/reset-password.html',
        label: 'reset password',
        globals: []
    },
    {
        url: '/l8ui/register/',
        label: 'register',
        globals: []
    }
];

/** POST helper that returns status + body without throwing on 4xx. */
async function raw(
    request: import('@playwright/test').APIRequestContext,
    path: string,
    data: unknown
): Promise<{ status: number; body: string }> {
    const res = await request.post(`${ENV.baseURL}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        data: data as Record<string, unknown>,
        failOnStatusCode: false
    });
    return { status: res.status(), body: await res.text() };
}

test.describe('auth screens', () => {
    for (const p of AUTH_PAGES) {
        test(`the ${p.label} page loads clean`, async ({ browser }) => {
            // A fresh context: these pages must work with no session whatsoever.
            const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
            const page = await ctx.newPage();
            const pageErrors: string[] = [];
            page.on('pageerror', (e) => pageErrors.push(e.message));

            try {
                const resp = await page.goto(`${ENV.baseURL}${p.url}`, {
                    waitUntil: 'networkidle'
                });
                expect(resp?.status(), `${p.url} did not serve`).toBeLessThan(400);

                const bodyLen = await page.evaluate(() => document.body.innerHTML.length);
                expect(bodyLen, `${p.url} rendered an empty body`).toBeGreaterThan(200);

                // A form to submit: these pages are useless without one.
                const inputs = await page.locator('input').count();
                expect(
                    inputs,
                    `${p.url} rendered no input fields -- the page loaded but offers nothing to fill in`
                ).toBeGreaterThan(0);

                for (const g of p.globals) {
                    // Check the global BINDING, not window[g]: LOGIN_CONFIG is
                    // declared `let` in a classic script, and top-level let/const
                    // live in the script scope without becoming window
                    // properties (only `var` does). Looking on window reported it
                    // missing when it is perfectly well defined.
                    const defined = await page.evaluate(
                        (n: string) => {
                            try {
                                return (0, eval)(`typeof ${n} !== 'undefined'`) as boolean;
                            } catch {
                                return false;
                            }
                        },
                        g
                    );
                    expect(defined, `${g} is not defined on ${p.url}`).toBe(true);
                }

                expect(
                    pageErrors,
                    `${p.url} raised uncaught errors -- an unauthenticated visitor sees a broken ` +
                    `page:\n  ${pageErrors.join('\n  ')}`
                ).toEqual([]);
            } finally {
                await ctx.close();
            }
        });
    }

    test('/captcha returns a usable image @smoke', async ({ request }) => {
        const res = await raw(request, '/captcha', {});
        expect(res.status, `/captcha -> HTTP ${res.status}`).toBe(200);

        const body = JSON.parse(res.body) as { captcha?: string };
        expect(body.captcha, '/captcha returned no captcha field').toBeTruthy();
        // RegistrationPage: "POST /captcha for CAPTCHA image (base64 PNG)".
        expect(
            body.captcha!.startsWith('iVBOR'),
            'the captcha payload is not a base64 PNG (PNG magic decodes to "iVBOR" in base64)'
        ).toBe(true);
        expect(
            body.captcha!.length,
            'the captcha image is implausibly small'
        ).toBeGreaterThan(500);
    });

    test('/register refuses a wrong CAPTCHA', async ({ request }) => {
        // The security-relevant assertion: registration must not succeed without a
        // correct CAPTCHA. Uses a name that would be obvious litter if it ever DID
        // get created, so a regression is visible rather than silent.
        const res = await raw(request, '/register', {
            user: `e2e-should-not-exist-${Date.now()}`,
            pass: 'Whatever123!',
            captcha: 'definitely-not-the-right-captcha'
        });
        expect(
            res.status,
            `/register accepted a wrong CAPTCHA (HTTP ${res.status}) -- registration is open ` +
            `to automated abuse. Body: ${res.body.slice(0, 200)}`
        ).not.toBe(200);
    });

    test('/register refuses missing credentials', async ({ request }) => {
        const res = await raw(request, '/register', { user: '', pass: '', captcha: '' });
        expect(
            res.status,
            `/register accepted empty credentials (HTTP ${res.status})`
        ).not.toBe(200);
    });

    test('/forgotPassword answers without disclosing whether an account exists', async ({ request }) => {
        // Standard account-enumeration defence: a known and an unknown user should
        // be indistinguishable to the caller.
        const known = await raw(request, '/forgotPassword', { user: ENV.user });
        const unknown = await raw(request, '/forgotPassword', {
            user: `e2e-no-such-user-${Date.now()}`
        });

        expect(
            known.status,
            `/forgotPassword failed for a real account (HTTP ${known.status}): ${known.body.slice(0, 160)}`
        ).toBeLessThan(500);

        expect(
            unknown.status,
            `/forgotPassword distinguishes an unknown account (${unknown.status}) from a known one ` +
            `(${known.status}) -- that lets an attacker enumerate valid usernames`
        ).toBe(known.status);
    });

    test('/resetPassword refuses an invalid token', async ({ request }) => {
        const res = await raw(request, '/resetPassword', {
            token: 'not-a-real-reset-token',
            pass: 'Whatever123!'
        });
        expect(
            res.status,
            `/resetPassword accepted a bogus token (HTTP ${res.status}) -- anyone could reset ` +
            `any password. Body: ${res.body.slice(0, 200)}`
        ).not.toBe(200);
    });

    test('TFA verification refuses a bogus code', async ({ request }) => {
        const res = await raw(request, '/tfaVerify', {
            user: ENV.user,
            code: '000000'
        });
        expect(
            res.status,
            `/tfaVerify accepted an arbitrary code (HTTP ${res.status}) -- second-factor ` +
            `verification is not actually verifying. Body: ${res.body.slice(0, 200)}`
        ).not.toBe(200);
    });

    test('TFA setup requires authentication', async ({ request }) => {
        // No Authorization header: enrolling a second factor must not be possible
        // for an anonymous caller.
        const res = await raw(request, '/tfaSetup', { user: ENV.user });
        expect(
            res.status,
            `/tfaSetup served an unauthenticated caller (HTTP ${res.status}) -- anyone could ` +
            `enrol a second factor against another account. Body: ${res.body.slice(0, 200)}`
        ).not.toBe(200);
    });

    test('/auth refuses bad credentials and issues a token for good ones', async ({ request }) => {
        const bad = await raw(request, '/auth', { user: ENV.user, pass: 'wrong-password-entirely' });
        expect(
            bad.status,
            `/auth accepted a wrong password (HTTP ${bad.status})`
        ).not.toBe(200);

        const good = await raw(request, '/auth', { user: ENV.user, pass: ENV.pass });
        expect(good.status, `/auth rejected valid credentials: ${good.body.slice(0, 160)}`).toBe(200);
        const token = (JSON.parse(good.body) as { token?: string }).token;
        expect(token, '/auth returned no token for valid credentials').toBeTruthy();
    });

    test('the login shell ships the change-password and TFA flows', async ({ browser }) => {
        // must-change-password and the TFA challenge are handled by
        // layer8d-login-changepass.js / layer8d-login-tfa.js. They are only
        // reachable when the server demands them, which this cluster's accounts do
        // not -- but a missing script tag would make that demand unanswerable, so
        // assert the code is at least present and parsed.
        const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
        const page = await ctx.newPage();
        try {
            const loaded: string[] = [];
            page.on('response', (r) => {
                if (r.url().endsWith('.js') && r.status() === 200) loaded.push(r.url());
            });
            await page.goto(`${ENV.baseURL}/l8ui/login/`, { waitUntil: 'networkidle' });

            for (const script of ['layer8d-login-changepass.js', 'layer8d-login-tfa.js']) {
                expect(
                    loaded.some((u) => u.endsWith(script)),
                    `${script} was not loaded by the login page -- the flow it implements ` +
                    `(${script.includes('tfa') ? 'TFA challenge' : 'must-change-password'}) ` +
                    `cannot run when the server asks for it`
                ).toBe(true);
            }
        } finally {
            await ctx.close();
        }
    });
});
