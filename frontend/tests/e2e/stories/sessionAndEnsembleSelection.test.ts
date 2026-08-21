/**
 * Recorded walkthrough for the setup shared by every other story: creating a new session and
 * adding+applying an ensemble. Other stories reuse `createSessionAndSelectEnsemble` to reach this
 * same state, but without narrating it again as part of their own walkthrough.
 */
import { expect } from "@playwright/test";

import { test } from "../support/recordingFixtures";
import { tutorialMeta } from "../support/tutorialMeta";
import { createSessionAndSelectEnsemble, hideDevOverlays, installFakeCursor } from "../support/walkthroughHelpers";

export const meta = tutorialMeta({
    slug: "session-and-ensemble-selection",
    category: "Framework",
    title: "Create a session and select an ensemble",
    description: "Start a new session and add a Drogon ensemble to it.",
});

test.describe("Session and ensemble selection", () => {
    test("create a session and select and apply an ensemble", async ({ page, narrate, markStep }) => {
        test.setTimeout(180_000);
        test.info().annotations.push({ type: "tutorial-slug", description: meta.slug });

        await installFakeCursor(page);
        await hideDevOverlays(page);

        await page.goto("/");
        await expect(page.getByText("FMU Analysis").first()).toBeVisible();

        markStep("Introduction");
        await narrate("Let's create a new session and add an ensemble to it.");

        await createSessionAndSelectEnsemble(page, { narrate, markStep });

        markStep("Ensemble applied");
        await narrate("The ensemble is now applied and ready to use in the session.");
    });
});
