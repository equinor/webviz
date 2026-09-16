import { expect } from "@playwright/test";

import { DROGON_AHM } from "../support/drogonTestData";
import { test } from "../support/recordingFixtures";
import { tutorialMeta } from "../support/tutorialMeta";
import {
    captureThumbnail,
    createSessionAndSelectEnsemble,
    dragModuleOntoLayout,
    hideDevOverlays,
    installCaseRowRedaction,
    installFakeCursor,
    pace,
    smoothClick,
    sweepSliderAcross,
} from "../support/walkthroughHelpers";

export const meta = tutorialMeta({
    slug: "flow-network-module",
    category: "Modules",
    title: "Flow Network",
    description: "Add the Flow Network module and view a dated flow network.",
});

/**
 * Adds an instance of the "Flow Network" module to the dashboard and waits for the group-tree
 * network to render from real Sumo data.
 */
test.describe("Flow Network module", () => {
    test("select a Drogon ensemble and render a Flow Network", async ({ page, narrate, markStep }) => {
        test.setTimeout(180_000);
        test.info().annotations.push({ type: "tutorial-slug", description: meta.slug });

        const FLOW_NETWORK = "Flow Network";

        // Render a cursor into the page so the mouse is visible in the recorded video.
        await installFakeCursor(page);

        // Blur every case row in the ensemble case-selector except the Drogon case we use.
        await installCaseRowRedaction(page, [DROGON_AHM.caseUuid]);

        // Hide developer-only floating overlays (e.g. React Query Devtools).
        await hideDevOverlays(page);

        await page.goto("/");
        await expect(page.getByText("FMU Analysis").first()).toBeVisible();

        // Shared setup (new session + ensemble selection) is narrated separately, in its own story.
        await createSessionAndSelectEnsemble(page);

        const moduleListItem = page.locator(`[title="${FLOW_NETWORK}"]`).first();
        if (!(await moduleListItem.isVisible())) {
            await smoothClick(page, page.getByTestId("modules-list-open-button"));
        }
        await expect(moduleListItem).toBeVisible();
        await pace(page);

        const dragNarration = narrate(
            "We start by dragging the Flow Network module from the list onto the dashboard and wait for the relevant data and settings to load.",
        );
        markStep("Add the Flow Network module");
        await dragModuleOntoLayout(page, FLOW_NETWORK);
        await dragNarration;

        // Confirm the drop actually created the module instance. The module header in the layout
        // carries the module title.
        const moduleLayout = page.getByTestId("module-layout");
        await expect(moduleLayout.getByTitle(FLOW_NETWORK).first()).toBeVisible({ timeout: 30_000 });
        await pace(page);

        // Make sure the active module's settings panel is expanded.
        const expandSettingsButton = page.getByTitle("Expand settings panel");
        if (await expandSettingsButton.isVisible()) {
            await smoothClick(page, expandSettingsButton);
            await pace(page);
        }

        // Pick a resampling frequency so the network has dated time steps to step through.
        const frequencyNarration = narrate(
            "In the settings we choose a resampling frequency for the network \u2014 here, weekly.",
        );
        markStep("Choose a frequency");
        await smoothClick(page, page.getByRole("combobox", { name: "Frequency" }));
        await smoothClick(page, page.getByRole("option", { name: "Weekly" }));
        await frequencyNarration;

        // The network build kicks off a query; wait for the module's loading indicator to clear and
        // the group-tree SVG to actually mount before treating this as done.
        const loadingBar = moduleLayout.getByRole("progressbar");
        await expect(loadingBar).toBeHidden({ timeout: 90_000 });
        await expect(moduleLayout.locator("svg").first()).toBeVisible({ timeout: 90_000 });

        markStep("View the flow network");
        await narrate(
            "And there's our flow network. It shows the dated network for the selected time step.",
        );

        // Slowly walk the time-step slider across every time step so the viewer can watch the
        // network evolve over time (codegen only captures abrupt clicks, so we animate it here).
        const sweepNarration = narrate(
            "Using the time step slider, we can gradually move across all the time steps and watch how the network changes over time.",
        );
        markStep("Step through the time steps");
        const timeStepSlider = page.getByRole("group", { name: "Time step" }).getByRole("slider").first();
        await sweepSliderAcross(page, timeStepSlider, { durationMs: 6_000 });
        await sweepNarration;

        await captureThumbnail(page);
    });
});
