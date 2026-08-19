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

        
        await page.goto('/');
        await smoothClick(page, page.getByRole("button", { name: "New session" }));

        await smoothClick(page, page.getByRole('button', { name: 'New session' }));
        await smoothClick(page, page.getByTestId('add-regular-ensemble-button'));
        await smoothClick(page, page.locator('[id="base-ui-:rbn:"]'));
        await page.locator('[id="base-ui-:rbn:"]').fill('My description');
        await smoothClick(page, page.getByText('My description').first());
        await smoothClick(page, page.getByText('iter-0 (100 realizations)'));
        await smoothClick(page, page.getByRole('button', { name: 'Apply' }));
        await smoothClick(page, page.getByRole('button', { name: 'Apply' }));
        
        const dragNarration = narrate(
                    "Now we drag the 3D Viewer module from the list onto the dashboard and wait for the relevant data and settings to load.",
                );
        await dragModuleOntoLayout(page, "3D Viewer");
        await dragNarration;

        await smoothClick(page, page.getByText('3D Viewer'));
        await smoothClick(page, page.getByTestId('module-layout').getByTestId('WebAssetIcon'));
        await expect(page.getByRole('button', { name: 'Add first view' })).toBeVisible();
        await smoothClick(page, page.getByRole('button', { name: 'Add first view' }));
        await smoothClick(page, page.getByRole('button', { name: 'Add' }).nth(1));
        await smoothClick(page, page.getByRole('menuitem', { name: 'Layers' }));
        await smoothClick(page, page.getByRole('menuitem', { name: 'Grid Model' }));
        await smoothClick(page, page.getByRole('menuitem', { name: 'Grid Model 3D' }));
        
    });
});
