import { expect } from "@playwright/test";

import { DROGON_AHM } from "../support/drogonTestData";
import { test } from "../support/recordingFixtures";
import { tutorialMeta } from "../support/tutorialMeta";
import {
    addVectorToSelector,
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
        // Load a second ensemble too, so we can demonstrate comparing ensembles later on.
        await createSessionAndSelectEnsemble(page, { additionalEnsembleNames: [DROGON_AHM.secondEnsembleName] });

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

        // Choose a first vector so the chart has something to plot.
        markStep("Choose a vector");
        const vectorNarration = narrate(
            "We start by choosing a vector to plot \u2014 here, the field oil production rate, F O P R.",
        );
        await addVectorToSelector(page, "FOPR");
        await vectorNarration;

        // Assert a Plotly chart renders from the real Sumo data.
        const plot = page.locator(".js-plotly-plot").first();
        await expect(plot).toBeVisible({ timeout: 90_000 });
        // Plotly mounts the SVG container before the data is drawn, so wait for an actual trace line too.
        await expect(plot.locator(".scatterlayer .js-line").first()).toBeVisible({ timeout: 90_000 });

        // The module shows a loading indicator whenever a setting change refetches data.
        const loadingBar = moduleLayout.getByRole("progressbar");

        markStep("View the chart");
        await narrate(
            "And there's our chart. By default, it plots a statistical fanchart over time \u2014 the mean surrounded by P10\u2013P90 and min\u2013max bands across all realizations.",
        );

        // Walk through the three visualization modes.
        markStep("Explore the visualization modes");
        const visualizationModeRow = page.locator(".setting-row").filter({ hasText: "Visualization mode" });

        const individualNarration = narrate(
            "Instead of statistics, we can show every individual realization as its own line, which reveals the spread and any outliers.",
        );
        await smoothClick(page, visualizationModeRow.getByText("Individual realizations", { exact: true }));
        await expect(loadingBar).toBeHidden({ timeout: 90_000 });
        await individualNarration;

        const linesNarration = narrate(
            "Statistical lines plot the same statistics as the fanchart, but as plain lines rather than shaded bands.",
        );
        await smoothClick(page, visualizationModeRow.getByText("Statistical lines", { exact: true }));
        await expect(loadingBar).toBeHidden({ timeout: 90_000 });
        await linesNarration;

        const fanchartNarration = narrate("Let's switch back to the fanchart.");
        await smoothClick(page, visualizationModeRow.getByText("Statistical fanchart", { exact: true }));
        await expect(loadingBar).toBeHidden({ timeout: 90_000 });
        await fanchartNarration;

        // Resampling controls how the raw simulator dates are down-sampled onto a regular time axis.
        markStep("Resample the time axis");
        const resamplingRow = page.locator(".setting-row").filter({ hasText: "Resampling frequency" });
        const resamplingNarration = narrate(
            "The resampling frequency snaps the raw simulator time steps onto a regular grid \u2014 daily, weekly, monthly and so on. Let's resample to weekly.",
        );
        await smoothClick(page, resamplingRow.getByRole("combobox"));
        await smoothClick(page, page.getByRole("option", { name: "Weekly" }));
        await expect(loadingBar).toBeHidden({ timeout: 90_000 });
        await resamplingNarration;

        // Add more vectors, including a well vector that carries measured observations.
        markStep("Add more vectors");
        const multiVectorNarration = narrate(
            "We can plot several vectors at once, each in its own subplot. Let's add the field gas-oil ratio, F G O R, and the gas-oil ratio for a well, which also has measured observations.",
        );
        await addVectorToSelector(page, "FGOR");
        await addVectorToSelector(page, "WGOR:A1");
        await expect(loadingBar).toBeHidden({ timeout: 90_000 });
        await multiVectorNarration;

        // Historical curve toggle (enabled once a selected vector has a historical counterpart).
        markStep("Show the historical curve");
        const historicalNarration = narrate(
            "For vectors that have a historical counterpart, the Historical toggle overlays the actual production history alongside the simulated results.",
        );
        await smoothClick(page, page.getByRole("checkbox", { name: "Historical" }));
        await expect(loadingBar).toBeHidden({ timeout: 90_000 });
        await historicalNarration;

        // Observations toggle (the well gas-oil ratio carries measured observations in this case).
        markStep("Toggle the observations");
        const observationsNarration = narrate(
            "Observations \u2014 the measured data points \u2014 are shown by default when available. We can hide them, and bring them back, with the Observations toggle.",
        );
        const observationsCheckbox = page.getByRole("checkbox", { name: "Observations" });
        await smoothClick(page, observationsCheckbox);
        await expect(loadingBar).toBeHidden({ timeout: 90_000 });
        await smoothClick(page, observationsCheckbox);
        await expect(loadingBar).toBeHidden({ timeout: 90_000 });
        await observationsNarration;

        // Compare across ensembles by selecting the second loaded iteration as well.
        markStep("Compare two ensembles");
        const compareNarration = narrate(
            "Finally, we loaded two ensembles into the session. By selecting both, each vector's curves are drawn for both iterations, so we can compare them side by side.",
        );
        const ensemblesRow = page.locator(".setting-row").filter({ hasText: "Ensembles" });
        await smoothClick(page, ensemblesRow.getByRole("combobox"));
        await smoothClick(page, page.getByRole("option", { name: DROGON_AHM.secondEnsembleName }));
        // Close the multi-select dropdown so it doesn't cover the chart.
        await page.keyboard.press("Escape");
        await expect(loadingBar).toBeHidden({ timeout: 90_000 });
        await compareNarration;

        await captureThumbnail(page);

        markStep("Wrap up");
        await narrate("And that concludes our walkthrough of the Simulation Time Series module.");
    });
});

