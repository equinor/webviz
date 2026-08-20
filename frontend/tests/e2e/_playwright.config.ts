import { defineConfig, devices } from "@playwright/test";

import { STORAGE_STATE_PATH } from "./setup/globalSetup";

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
const BASE_URL = "http://localhost:8080";

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
    testDir: "./",
    /* Seed an authenticated session (used by the "authenticated-*" projects) before running. */
    globalSetup: "./setup/globalSetup.ts",
    /* After a recording run, mux the voiceover clips into the videos (no-op unless RECORD is set). */
    globalTeardown: "./setup/globalTeardown.ts",
    /* Directory for test artifacts such as videos, screenshots and traces. */
    outputDir: "../../test-results",
    /* Run tests in files in parallel */
    fullyParallel: true,
    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,
    retries: 0,
    workers: 1,
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: "html",
    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
        /* Base URL to use in actions like `await page.goto('/')`. */
        baseURL: BASE_URL,

        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        trace: record ? "on" : "on-first-retry",

        /* If recording, record in full HD  (matches the 1920x1080 viewport set below). */
        video: record ? { mode: "on", size: { width: 1920, height: 1080 } } : "off",
        screenshot: record ? "on" : "off",
    },

    /* Configure projects for major browsers */
    projects: [
        /*
         * Authenticated tests reuse the session seeded by the global setup, so the app loads as
         * a logged-in user fetching real Sumo data. They live under the `stories/` folder.
         */
        {
            name: "authenticated-chromium",
            testMatch: /stories\/.*\.test\.ts/,
            use: {
                ...devices["Desktop Chrome"],
                storageState: STORAGE_STATE_PATH,
                ...(record ? { viewport: { width: 1920, height: 1080 } } : {}),
            },
        },
    ],

});
