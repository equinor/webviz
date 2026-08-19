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
    dragModuleOntoLayout,
    hideDevOverlays,
    installFakeCursor,
    pace,
    smoothClick,
    smoothFill,
} from "../support/walkthroughHelpers";
import { DROGON_AHM } from "../support/drogonTestData";

test.describe("My module", () => {
    test("does the thing", async ({ page, narrate }) => {
        test.setTimeout(180_000);

        // Render a visible cursor and hide dev-only overlays so the recorded video stays clean.
        await installFakeCursor(page);
        await hideDevOverlays(page);

        await page.goto("/");
        await expect(page.getByText("FMU Analysis").first()).toBeVisible();

        await narrate("Describe what this walkthrough will show.");
const newSessionNarration = narrate("Let's start by creating a new session...")
        await smoothClick(page, page.getByRole("button", { name: "New session" }));
        await newSessionNarration;

        const ensembleNarration = narrate(
            "...and then add an ensemble. We pick the Drogon asset and find the case we want.",
        );
        await expect(page.getByText("Ensembles used in this session")).toBeVisible({ timeout: 60_000 });
        await smoothClick(page, page.getByTestId("add-regular-ensemble-button"));
        await pace(page);

        await smoothClick(page, page.getByRole("combobox", { name: "Asset" }));
        await smoothClick(page, page.getByRole("option", { name: DROGON_AHM.assetName }));
        await pace(page);

        // Filter the case table by the test case UUID.
        await smoothFill(page, page.getByPlaceholder("Filter ...").first(), DROGON_AHM.caseUuid);
        await expect(page.getByText(DROGON_AHM.caseUuid)).toBeVisible({ timeout: 60_000 });
        await pace(page);

        await smoothClick(
            page,
            page
                .locator("tbody")
                .getByRole("row", { name: new RegExp(DROGON_AHM.caseUuid) })
                .first(),
        );

        await expect(page.getByText(DROGON_AHM.ensembleName).first()).toBeVisible({ timeout: 60_000 });
        await ensembleNarration;
        await pace(page);

        const applyNarration = narrate("We select the ensemble and apply it to load it into the session.");
        await smoothClick(page, page.getByText(DROGON_AHM.ensembleName).first());

        await smoothClick(page, page.getByRole("button", { name: "Apply" }).last());
        await pace(page);

        await smoothClick(page, page.getByRole("button", { name: "Apply" }));
        await expect(page.getByText("Ensembles used in this session")).not.toBeVisible({ timeout: 120_000 });
        await applyNarration;
        
        const dragNarration = narrate(
                    "Now we drag the 3D Viewer module from the list onto the dashboard and wait for the relevant data and settings to load.",
                );
        await dragModuleOntoLayout(page, "3D Viewer");
        await dragNarration;

        await expect(page.getByRole('button', { name: 'Add first view' })).toBeVisible();
        await smoothClick(page, page.getByRole('button', { name: 'Add first view' }));
        await smoothClick(page, page.getByRole('button', { name: 'Add' }).nth(1));
        await smoothClick(page, page.getByRole('menuitem', { name: 'Layers' }));
        await smoothClick(page, page.getByRole('menuitem', { name: 'Grid Model', exact: true }));
        await smoothClick(page, page.getByRole('menuitem', { name: 'Grid Model 3D' }));
        
        await expect(page.getByTestId('module-layout')).toContainText('Loading 0%Loading assets...');
        await expect(page.getByTestId('module-layout')).not.toContainText('Loading 0%Loading assets...');

        await narrate("And there we see our 3D model grid");
    });
});
