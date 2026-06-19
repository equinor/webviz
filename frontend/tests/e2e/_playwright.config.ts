import { defineConfig, devices } from "@playwright/test";

import { STORAGE_STATE_PATH } from "./auth/global-setup";

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * Set RECORD=1 to capture video and screenshots for every test (e.g. to later upload the
 * recordings to blob storage). When not recording we keep the lightweight defaults.
 */
const record = !!process.env.RECORD;

/** Base URL the browser talks to. Assumes the full stack is already running on this port. */
const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:8080";

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
    testDir: "./",
    /* Seed an authenticated session (used by the "authenticated-*" projects) before running. */
    globalSetup: "./auth/global-setup.ts",
    /* Directory for test artifacts such as videos, screenshots and traces. */
    outputDir: "../../test-results",
    /* Run tests in files in parallel */
    fullyParallel: true,
    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,
    /* Retry on CI only */
    retries: process.env.CI ? 2 : 0,
    /* Opt out of parallel tests on CI. */
    workers: process.env.CI ? 1 : undefined,
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: "html",
    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
        /* Base URL to use in actions like `await page.goto('/')`. */
        baseURL: BASE_URL,

        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        trace: record ? "on" : "on-first-retry",

        /* Optionally record video and screenshots for every test (toggled with RECORD=1). Record at
         * full HD so the resulting tutorial videos are crisp (matches the 1920x1080 viewport set on
         * the recording projects below). */
        video: record ? { mode: "on", size: { width: 1920, height: 1080 } } : "off",
        screenshot: record ? "on" : "off",
    },

    /* Configure projects for major browsers */
    projects: [
        /*
         * Unauthenticated tests run without a seeded session, e.g. the sign-in redirect flow.
         * They are matched by the `*.unauth.test.ts` naming convention (plus the legacy
         * signIn.test.ts).
         */
        {
            name: "unauthenticated-chromium",
            testMatch: /(.*\.unauth\.test\.ts|signIn\.test\.ts)/,
            use: {
                ...devices["Desktop Chrome"],
                /* Record at full HD (overrides the 1280x720 viewport from the device preset). */
                ...(record ? { viewport: { width: 1920, height: 1080 } } : {}),
            },
        },

        /*
         * Authenticated tests reuse the session seeded by the global setup, so the app loads as
         * a logged-in user fetching real Sumo data. They live under the `authed/` folder.
         */
        {
            name: "authenticated-chromium",
            testMatch: /authed\/.*\.test\.ts/,
            use: {
                ...devices["Desktop Chrome"],
                storageState: STORAGE_STATE_PATH,
                /* Record at full HD (overrides the 1280x720 viewport from the device preset). */
                ...(record ? { viewport: { width: 1920, height: 1080 } } : {}),
            },
        },
    ],

    /* Run your local dev server before starting the tests */
    // webServer: {
    //   command: 'npm run start',
    //   url: 'http://127.0.0.1:3000',
    //   reuseExistingServer: !process.env.CI,
    // },
});
