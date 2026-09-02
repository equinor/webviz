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
 *  4. Fill in `meta` below with a stable, kebab-case `slug` plus the category/title/description to
 *     show in the in-app Tutorials dialog, then run `npm run generate:tutorials-manifest`. Add a
 *     `captureThumbnail(page)` call at the moment that best represents the finished result.
 *
 * Requires the full docker stack running; the `authenticated-*` project loads the seeded session so
 * the app starts logged in.
 */
import { expect } from "@playwright/test";

import { test } from "../support/recordingFixtures";
import { tutorialMeta } from "../support/tutorialMeta";
import { captureThumbnail, hideDevOverlays, installFakeCursor, smoothClick } from "../support/walkthroughHelpers";

export const meta = tutorialMeta({
    slug: "my-module-does-the-thing",
    category: "Category",
    title: "Do the thing with My module",
    description: "A short, one-sentence description shown under the video title.",
});

test.describe("My module", () => {
    test("does the thing", async ({ page, narrate, markStep }) => {
        test.setTimeout(180_000);
        test.info().annotations.push({ type: "tutorial-slug", description: meta.slug });

        // Render a visible cursor and hide dev-only overlays so the recorded video stays clean.
        await installFakeCursor(page);
        await hideDevOverlays(page);

        await page.goto("/");
        await expect(page.getByText("FMU Analysis").first()).toBeVisible();

        markStep("Introduction");
        await narrate("Describe what this walkthrough will show.");

        // --- Replace below with your captured, adapted actions ---
        await smoothClick(page, page.getByRole("button", { name: "New session" }));

        // Assert the end state so the story doubles as a regression test.
        await expect(page.getByText("Ensembles used in this session")).toBeVisible({ timeout: 60_000 });
        await captureThumbnail(page);
    });
});
