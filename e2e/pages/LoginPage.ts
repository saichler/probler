/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// Page object for the standalone login shell at /l8ui/login/index.html.
//
// Most specs skip this by seeding sessionStorage in the fixture -- logging in
// through the form 250 times would only re-test the form. The login specs use
// this object to exercise the real path: credentials, failure messaging, TFA
// branch, and the redirect that login.json's `redirectUrl` drives.

import { Page, Locator, expect } from '@playwright/test';
import { ENV } from '../fixtures/env';

export class LoginPage {
    constructor(private page: Page) {}

    username(): Locator { return this.page.locator('#username, [name="username"]').first(); }
    password(): Locator { return this.page.locator('#password, [name="password"]').first(); }
    submit(): Locator { return this.page.locator('button[type="submit"], .login-btn').first(); }
    error(): Locator { return this.page.locator('.login-error, #login-error, .error-message').first(); }
    tfaSection(): Locator { return this.page.locator('#tfa-section, .tfa-section').first(); }

    async goto(): Promise<void> {
        await this.page.goto(ENV.loginShell);
        await expect(this.username()).toBeVisible({ timeout: 20000 });
    }

    async login(user: string, pass: string): Promise<void> {
        await this.username().fill(user);
        await this.password().fill(pass);
        await this.submit().click();
    }

    /** The token the app stashes after a successful login. */
    async storedToken(): Promise<string | null> {
        return this.page.evaluate(() => {
            try { return sessionStorage.getItem('bearerToken'); } catch { return null; }
        });
    }
}
