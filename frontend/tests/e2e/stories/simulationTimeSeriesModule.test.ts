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
    description: "Visualize simulated time series data, together with observations used in the assisted history matching process",
});

/**
 * Adds an instance of the "Simulation Time Series" module
 * to the dashboard and waits for a chart to render from real Sumo data.
 */
test.describe("Simulation Time Series module", () => {
    test("select a Drogon ensemble and render a Simulation Time Series chart", async ({ page, narrate, markStep }) => {
        // Extended walkthrough: two ensembles, several vectors, all visualization modes and the
        // toggles — plus narration/pacing when recording — so it needs a larger budget than default.
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

        await narrate(
            "And there's our chart. By default, it plots a statistical fanchart over time, computed across all realizations. The single solid line is the mean, while the two shaded areas around it are the bands between P10 and P90 and between the minimum and maximum values.",
        );

        // Walk through the three visualization modes.
        markStep("Visualization modes");
        const visualizationModeRow = page.locator(".setting-row").filter({ hasText: "Visualization mode" });

        const individualNarration = narrate(
            "Instead of statistics, we can show every individual realization as its own line, which reveals the physical behaviour of each realization, as well as any outliers.",
        );
        await smoothClick(page, visualizationModeRow.getByText("Individual realizations", { exact: true }));
        await expect(loadingBar).toBeHidden({ timeout: 90_000 });
        await individualNarration;

        // Hover over the plot so Plotly's tooltip (which reads "Realization: N") appears in the video.
        markStep("Hover a realization");
        const hoverNarration = narrate(
            "And if we hover over a line, a tooltip tells us exactly which realization it belongs to.",
        );
        // Plotly only shows a hover tooltip when the pointer is within a few pixels of a line, so we
        // must land the cursor ON an actual curve — the plot centre can be empty space. Read a point
        // from one realization line's SVG path and map it to viewport pixels. Best-effort: the hover
        // is purely cosmetic for the recording, so never let it fail the walkthrough.
        const hoverPoint = await plot.evaluate((plotEl) => {
            const path = plotEl.querySelector(".scatterlayer .js-line") as SVGPathElement | null;
            if (!path || typeof path.getTotalLength !== "function") {
                return null;
            }
            const totalLength = path.getTotalLength();
            const screenMatrix = path.getScreenCTM();
            if (!totalLength || !screenMatrix) {
                return null;
            }
            // A point in the interior of the curve (avoid the very ends, which sit at the plot edge).
            const screenPoint = path.getPointAtLength(totalLength * 0.45).matrixTransform(screenMatrix);
            return { x: screenPoint.x, y: screenPoint.y };
        });
        if (hoverPoint) {
            // Glide in steps so the injected fake cursor animates smoothly onto the line.
            await page.mouse.move(hoverPoint.x, hoverPoint.y, { steps: 24 });
        }
        await expect(plot.locator(".hoverlayer .hovertext").first())
            .toBeVisible({ timeout: 10_000 })
            .catch(() => {});
        await pace(page, "long");
        await hoverNarration;

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
            "The resampling frequency controls the time axis. Raw shows the time steps exactly as written by the simulator, while every other option resamples the data onto a uniform grid \u2014 daily, weekly, monthly and so on. How the values are interpolated depends on the type of vector: rate vectors are backfilled, whereas cumulative vectors are linearly interpolated. Let's resample to weekly.",
        );
        // Wait for the narration to finish before actually changing the frequency.
        await resamplingNarration;
        await smoothClick(page, resamplingRow.getByRole("combobox"));
        await smoothClick(page, page.getByRole("option", { name: "Weekly" }));
        await expect(loadingBar).toBeHidden({ timeout: 90_000 });

        // Add more vectors, including a well vector that carries measured observations.
        markStep("Add more vectors");
        const multiVectorNarration = narrate(
            "We can plot several vectors at once, each in its own subplot. Let's add the field gas-oil ratio, F G O R, and the gas-oil ratio for a well, which also has measured observations.",
        );
        await addVectorToSelector(page, "FGOR");
        await addVectorToSelector(page, "WGOR:A1");
        // Adding vectors refetches the vector lists; wait for that to settle so the toggles below are
        // neither inert (loading overlay) nor disabled before we click them.
        await expect(page.getByText("Loading vectors...")).toBeHidden({ timeout: 90_000 });
        await expect(loadingBar).toBeHidden({ timeout: 90_000 });
        await multiVectorNarration;

        // Historical curve toggle (enabled once a selected vector has a historical counterpart).
        markStep("Historical curves");
        const historicalNarration = narrate(
            "For vectors that have a historical counterpart, the Historical toggle overlays the actual production history alongside the simulated results.",
        );
        // The checkbox itself has no accessible name (the label text is a sibling), so click the
        // visible label text, which toggles the wrapped checkbox.
        await smoothClick(page, page.getByText("Historical", { exact: true }));
        await expect(loadingBar).toBeHidden({ timeout: 90_000 });
        await historicalNarration;

        // Observations toggle (the well gas-oil ratio carries measured observations in this case).
        markStep("Observations");
        const observationsNarration = narrate(
            "Observations are shown by default when available. They're the ones used in the assisted history matching that produced this ensemble, each error band showing the uncertainty assigned to that observation. Toggle them with the Observations switch.",
        );
        const observationsToggle = page.getByText("Observations", { exact: true });
        await smoothClick(page, observationsToggle);
        await expect(loadingBar).toBeHidden({ timeout: 90_000 });
        await smoothClick(page, observationsToggle);
        await expect(loadingBar).toBeHidden({ timeout: 90_000 });
        await observationsNarration;

        // Compare across ensembles by selecting the second loaded iteration as well.
        markStep("Compare multiple ensembles");
        const compareNarration = narrate(
            "Finally, we can select multiple of the ensembles loaded into the session. By selecting both, each vector's curves are drawn for both iterations, so we can compare them side by side.",
        );
        const ensemblesRow = page.locator(".setting-row").filter({ hasText: "Ensembles" });
        await smoothClick(page, ensemblesRow.getByRole("combobox"));
        await smoothClick(page, page.getByRole("option", { name: DROGON_AHM.secondEnsembleName }));
        // Close the multi-select dropdown so it doesn't cover the chart.
        await page.keyboard.press("Escape");
        await expect(loadingBar).toBeHidden({ timeout: 90_000 });
        await compareNarration;

        await captureThumbnail(page);

        await narrate("And that concludes our walkthrough of the Simulation Time Series module.");
    });
});

