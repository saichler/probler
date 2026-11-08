/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
import { defineConfig, devices } from '@playwright/test';
import { ENV } from './fixtures/env';

export default defineConfig({
    testDir: './tests',
    outputDir: './test-results',

    // Full-coverage sweeps walk 250+ services per shell against a live cluster.
    timeout: 120_000,
    expect: { timeout: 25_000 },

    fullyParallel: true,

    // The target is a single-replica deployment (one erp-web pod in front of
    // one erp pod), not a horizontally scaled service. Past ~3 concurrent
    // browsers the backend queues, and specs start failing on timeouts that
    // have nothing to do with the code under test -- the "infra churn vs real
    // bug" distinction PostImplementationE2ETesting warns about. Keep the
    // concurrency at what the deployment can actually serve.
    // 2, not 3. At three workers the artifact writers contend badly enough to
    // fail tests in teardown ("Tearing down \"context\" exceeded the test
    // timeout") on modules that pass comfortably on their own -- three of four
    // failures in one verification run were this, not assertions. Two workers
    // still halves the wall clock without manufacturing false signal.
    workers: process.env.CI ? 2 : 2,

    // PostImplementationE2ETesting: a failure right after a pod restart is
    // usually the cluster still settling (stale connections, vnic mesh
    // reconnecting), not a regression. One retry separates churn from a real
    // bug; anything that fails both times reproduces and is real.
    retries: 1,

    // Creating rows through the real UI against the real API means a
    // half-finished spec leaves orphans behind. Failing the run on .only keeps
    // a narrowed debugging session from being committed.
    forbidOnly: !!process.env.CI,

    reporter: process.env.CI
        ? [['list'], ['html', { open: 'never' }], ['junit', { outputFile: 'test-results/junit.xml' }]]
        : [['list'], ['html', { open: 'never' }]],

    use: {
        baseURL: ENV.baseURL,
        // The KIND deployment serves a self-signed cert on 2773.
        ignoreHTTPSErrors: true,
        actionTimeout: 15_000,
        navigationTimeout: 30_000,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        // Video only on a retried test, not on every first-attempt failure:
        // writing video for each of N parallel failures is what pushed teardown
        // past the test timeout. A retry still captures it, so nothing
        // diagnosable is lost.
        video: 'on-first-retry'
    },

    projects: [
        {
            name: 'desktop',
            testDir: './tests/desktop',
            use: { ...devices['Desktop Chrome'], viewport: { width: 1600, height: 1000 } }
        },
        {
            name: 'mobile',
            testDir: './tests/mobile',
            // A real mobile device profile driving the real mobile bundle at
            // /m/app.html -- never the desktop shell at a narrow viewport.
            use: { ...devices['Pixel 7'] }
        }
    ]
});
