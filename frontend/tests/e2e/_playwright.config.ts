import { existsSync } from "node:fs";

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

/**
 * Under WSL (detected by its GPU device, /dev/dxg) the GPU is only reachable through WSLg's display,
 * via Mesa's D3D12 driver, so the GPU project runs headed there with that driver selected. Non-GPU
 * stories run headless by default (software WebGL); stories that need hardware GPU opt in with
 * `{ tag: "@gpu" }` and run in the `authenticated-chromium-gpu` project.
 * MESA_D3D12_DEFAULT_ADAPTER_NAME picks the adapter on machines with more than one GPU.
 */
const isWsl = existsSync("/dev/dxg");
const wslGpuEnv = {
    GALLIUM_DRIVER: process.env.GALLIUM_DRIVER ?? "d3d12",
    MESA_D3D12_DEFAULT_ADAPTER_NAME: process.env.MESA_D3D12_DEFAULT_ADAPTER_NAME ?? "NVIDIA",
};

/** Base URL the browser talks to. Assumes the full stack is already running on this port. */
const BASE_URL = "http://localhost:8080";

/** Shared Chromium settings for both the CPU and GPU authenticated story projects. */
const authenticatedChromiumUse = {
    ...devices["Desktop Chrome"],
    storageState: STORAGE_STATE_PATH,
    viewport: { width: 1920, height: 1080 },
};

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
    /* Allow one retry on non-recording CI runs to absorb transient Sumo network hiccups, but keep 0 retries when recording. */
    retries: !record && process.env.CI ? 1 : 0,
    workers: 1,
    /*
     * Reporter to use. See https://playwright.dev/docs/test-reporters
     * On CI we additionally enable the "github" reporter, which annotates the failing file/line
     * and error message directly on the run summary (no need to download the HTML report).
     */
    reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "html",
    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
        /* Base URL to use in actions like `await page.goto('/')`. */
        baseURL: BASE_URL,
        /* Bound individual Playwright actions so a broken selector fails fast instead of waiting out the full test timeout. */
        actionTimeout: 30_000,
        trace: record ? { mode: "retain-on-failure", screenshots: false } : "on-first-retry",
        /* If recording, record in full HD  (matches the 1920x1080 viewport set below). */
        video: record ? { mode: "on", size: { width: 1920, height: 1080 } } : "off",
        screenshot: record ? "on" : "off",
    },

    /* Configure projects for major browsers */
    projects: [
        /*
         * Authenticated tests reuse the session seeded by the global setup, so the app loads as
         * a logged-in user fetching real Sumo data. They live under the `stories/` folder.
         * Stories tagged `@gpu` run in `authenticated-chromium-gpu` so CI can route only those
         * to the GPU runner while keeping standard stories on a regular CPU runner.
         */
        {
            name: "authenticated-chromium",
            testMatch: /stories\/.*\.test\.ts/,
            grepInvert: /@gpu/,
            use: {
                ...authenticatedChromiumUse,
                // CI runners have a tiny /dev/shm; without this Chromium can abort (SIGABRT) when
                // flushing the full-HD video/trace at context teardown. Point it at /tmp instead.
                launchOptions: {
                    args: ["--disable-dev-shm-usage"],
                },
            },
        },
        {
            name: "authenticated-chromium-gpu",
            testMatch: /stories\/.*\.test\.ts/,
            grep: /@gpu/,
            use: {
                ...authenticatedChromiumUse,
                // Under WSL the GPU is only reachable via WSLg (headed). On native Linux, use full
                // Chromium (`channel: "chromium"`, i.e. `--headless=new`) instead of headless_shell
                // so Chromium can access the hardware GPU via ANGLE/Vulkan.
                ...(isWsl ? { headless: false } : { channel: "chromium" }),
                launchOptions: {
                    args: [
                        "--disable-dev-shm-usage",
                        ...(isWsl
                            ? []
                            : [
                                  "--ignore-gpu-blocklist",
                                  "--use-gl=angle",
                                  "--use-angle=vulkan",
                                  "--enable-features=Vulkan",
                              ]),
                    ],
                    ...(isWsl ? { env: { ...process.env, ...wslGpuEnv } } : {}),
                },
            },
        },
    ],
});
