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
import { tutorialMeta } from "../support/tutorialMeta";
import {
    captureThumbnail,
    createSessionAndSelectEnsemble,
    dragModuleOntoLayout,
    hideDevOverlays,
    installFakeCursor,
    pace,
    smoothClick,
} from "../support/walkthroughHelpers";

export const meta = tutorialMeta({
    slug: "grid3d-viewer-3d-grid-model",
    category: "Modules",
    title: "3D Viewer",
    description: "Add the 3D Viewer module to a session.",
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

        // Shared setup (new session + ensemble selection) is narrated separately, in its own story.
        await createSessionAndSelectEnsemble(page);

        markStep("Introduction");
        await narrate("In this walkthrough we'll add the 3D Viewer module to a new dashboard.");

        const dragNarration = narrate(
                    "We drag the 3D Viewer module from the list onto the dashboard and wait for the relevant data and settings to load.",
                );
        markStep("Add the 3D Viewer");
        await dragModuleOntoLayout(page, "3D Viewer");
        await dragNarration;

        await expect(page.getByRole('button', { name: 'Add first view' })).toBeVisible();
        await smoothClick(page, page.getByRole('button', { name: 'Add first view' }));
        await smoothClick(page, page.getByRole('button', { name: 'Add' }).nth(1));
        await smoothClick(page, page.getByRole('menuitem', { name: 'Layers' }));
        await smoothClick(page, page.getByRole('menuitem', { name: 'Grid Model', exact: true }));
        await smoothClick(page, page.getByRole('menuitem', { name: 'Grid Model 3D' }));

        // Adding the layer kicks off a blob fetch + mesh build; wait for the module's own loading
        // indicator to clear and the deck.gl canvas to actually mount before treating this as done.
        const moduleLayout = page.getByTestId("module-layout");
        const loadingBar = moduleLayout.getByRole("progressbar");
        await expect(loadingBar).toBeHidden({ timeout: 90_000 });
        await expect(moduleLayout.locator("canvas").first()).toBeVisible({ timeout: 30_000 });

        // Give WebGL a moment to actually paint the grid geometry after mounting.
        await pace(page, "long");

        await captureThumbnail(page);
        markStep("View the grid model");
        await narrate("And there we see our 3D model grid");
    });
});
