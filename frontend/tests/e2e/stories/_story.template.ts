/**
 * Template for a recorded-walkthrough e2e story.
 *
 * How to use:
 *  1. Copy this file to `<yourStory>.test.ts` in this folder (the `.test.ts` suffix is what makes
 *     Playwright pick it up; this template is deliberately named so it is ignored).
 *  2. Capture the raw clicks/fills with `npm run test:e2e:codegen` (see tests/README.md). Codegen
 *     writes plain Playwright calls to `_recorded.gen.ts` — a starting point for the selectors.
 *  3. Port those actions into the body below, wrapping interactions in `smoothClick`/`smoothFill`
 *     and adding `narrate(...)` lines. These are no-ops unless RECORD=1, so the story still runs as
 *     a fast regression check with `npm run test:e2e`.
 *
 * Requires the full docker stack running; the `authenticated-*` project loads the seeded session so
 * the app starts logged in.
 */
import { expect } from "@playwright/test";

import { test } from "../support/recordingFixtures";
import {
    hideDevOverlays,
    installFakeCursor,
    smoothClick,
} from "../support/walkthroughHelpers";

test.describe("My module", () => {
    test("does the thing", async ({ page, narrate }) => {
        test.setTimeout(180_000);

        // Render a visible cursor and hide dev-only overlays so the recorded video stays clean.
        await installFakeCursor(page);
        await hideDevOverlays(page);

        await page.goto("/");
        await expect(page.getByText("FMU Analysis").first()).toBeVisible();

        await narrate("Describe what this walkthrough will show.");

        // --- Replace below with your captured, adapted actions ---
        await smoothClick(page, page.getByRole("button", { name: "New session" }));

        // Assert the end state so the story doubles as a regression test.
        await expect(page.getByText("Ensembles used in this session")).toBeVisible({ timeout: 60_000 });
    });
});
