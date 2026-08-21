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
} from "../support/walkthroughHelpers";

export const meta = tutorialMeta({
    slug: "simulation-time-series-chart",
    category: "Modules",
    title: "Simulation Time Series",
    description: "Add the Simulation Time Series module.",
});

/**
 * Adds an instance of the "Simulation Time Series" module
 * to the dashboard and waits for a chart to render from real Sumo data.
 */
test.describe("Simulation Time Series module", () => {
    test("select a Drogon ensemble and render a Simulation Time Series chart", async ({ page, narrate, markStep }) => {
        test.setTimeout(180_000);
        test.info().annotations.push({ type: "tutorial-slug", description: meta.slug });

        const SIMULATION_TIME_SERIES = "Simulation Time Series";

        // Render a cursor into the page so the mouse is visible in the recorded video
        await installFakeCursor(page);

        // Blur every case row in the ensemble case-selector except the Drogon case we use
        await installCaseRowRedaction(page, [DROGON_AHM.caseUuid]);

        // Hide developer-only floating overlays (e.g. React Query Devtools)
        await hideDevOverlays(page);

        await page.goto("/");
        await expect(page.getByText("FMU Analysis").first()).toBeVisible();

        // Shared setup (new session + ensemble selection) is narrated separately, in its own story.
        await createSessionAndSelectEnsemble(page);

        const moduleListItem = page.locator(`[title="${SIMULATION_TIME_SERIES}"]`).first();
        if (!(await moduleListItem.isVisible())) {
            await smoothClick(page, page.getByTestId("modules-list-open-button"));
        }
        await expect(moduleListItem).toBeVisible();
        await pace(page);

        const dragNarration = narrate(
            "We start by dragging the Simulation Time Series module from the list onto the dashboard and wait for the relevant data and settings to load.",
        );
        markStep("Add the time series module");
        await dragModuleOntoLayout(page, SIMULATION_TIME_SERIES);
        await dragNarration;

        // Confirm the drop actually created the module instance.
        // The module header in the layout carries the module title.
        const moduleLayout = page.getByTestId("module-layout");
        await expect(moduleLayout.getByTitle(SIMULATION_TIME_SERIES).first()).toBeVisible({ timeout: 30_000 });
        await pace(page);

        // Make sure the active module's settings panel is expanded
        const expandSettingsButton = page.getByTitle("Expand settings panel");
        if (await expandSettingsButton.isVisible()) {
            await smoothClick(page, expandSettingsButton);
            await pace(page);
        }

        // Select a vector so the chart has something to plot
        const vectorSelectorContainer = page.getByTestId("vector-selector");
        await expect(vectorSelectorContainer).toBeVisible();
        const vectorInput = vectorSelectorContainer.locator("input").last();
        const foprTag = vectorSelectorContainer.locator('li[title="FOPR"]');

        const vectorNarration = narrate(
            "Finally, we choose a vector to plot \u2014 here, the field oil production rate, F O P R.",
        );
        markStep("Choose a vector");
        await smoothClick(page, vectorInput);
        await expect(async () => {
            if ((await foprTag.count()) === 0) {
                await vectorInput.fill("");
                await vectorInput.pressSequentially("FOPR", { delay: 120 });
                await vectorInput.press("Enter");
            }
            await expect(foprTag).toHaveCount(1);
        }).toPass({ timeout: 60_000, intervals: [1_000] });
        await vectorNarration;

        // Assert a Plotly chart renders from the real Sumo data
        const plot = page.locator(".js-plotly-plot").first();
        await expect(plot).toBeVisible({ timeout: 90_000 });
        
        // Plotly mounts the SVG container before the data is drawn, wait also for an actual trace line to be rendered:
        await expect(plot.locator(".scatterlayer .js-line").first()).toBeVisible({ timeout: 90_000 });
        await captureThumbnail(page);
        markStep("View the chart");
        await narrate(
            "And there's our chart. By default, it plots statistical curves over time, like min, P10, mean, P90 and max.",
        );
    });
});

