import { expect } from "@playwright/test";

import { DROGON_AHM } from "../support/drogonTestData";
import { test } from "../support/recordingFixtures";
import {
    dragModuleOntoLayout,
    hideDevOverlays,
    installCaseRowRedaction,
    installFakeCursor,
    pace,
    smoothClick,
    smoothFill,
} from "../support/walkthroughHelpers";

/**
 * Adds an instance of the "Simulation Time Series" module
 * to the dashboard and waits for a chart to render from real Sumo data.
 */
test.describe("Simulation Time Series module", () => {
    test("select a Drogon ensemble and render a Simulation Time Series chart", async ({ page, narrate }) => {
        test.setTimeout(180_000);

        const SIMULATION_TIME_SERIES = "Simulation Time Series";

        // Render a cursor into the page so the mouse is visible in the recorded video
        await installFakeCursor(page);

        // Blur every case row in the ensemble case-selector except the Drogon case we use
        await installCaseRowRedaction(page, [DROGON_AHM.caseUuid]);

        // Hide developer-only floating overlays (e.g. React Query Devtools)
        await hideDevOverlays(page);

        await page.goto("/");
        await expect(page.getByText("FMU Analysis").first()).toBeVisible();

        await narrate(
            "In this walkthrough we'll add the Simulation Time Series module to a new dashboard.",
        );

        const newSessionNarration = narrate("Let's start by creating a new session...")
        await smoothClick(page, page.getByRole("button", { name: "New session" }));
        await newSessionNarration;

        const ensembleNarration = narrate(
            "...and then add an ensemble. We pick the Drogon asset and find the case we want.",
        );
        await expect(page.getByText("Ensembles used in this session")).toBeVisible({ timeout: 60_000 });
        await smoothClick(page, page.getByTestId("add-regular-ensemble-button"));
        await pace(page);

        await smoothClick(page, page.getByLabel("Asset"));
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

        const moduleListItem = page.locator(`[title="${SIMULATION_TIME_SERIES}"]`).first();
        if (!(await moduleListItem.isVisible())) {
            await smoothClick(page, page.getByTestId("modules-list-open-button"));
        }
        await expect(moduleListItem).toBeVisible();
        await pace(page);

        const dragNarration = narrate(
            "Now we drag the Simulation Time Series module from the list onto the dashboard and wait for the relevant data and settings to load.",
        );
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
        const vectorSelectorContainer = page.locator("div.cursor-text.min-w-48").first();
        await expect(vectorSelectorContainer).toBeVisible();
        const vectorInput = vectorSelectorContainer.locator("input").last();
        const foprTag = vectorSelectorContainer.locator('li[title="FOPR"]');

        const vectorNarration = narrate(
            "Finally, we choose a vector to plot \u2014 here, the field oil production rate, F O P R.",
        );
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
        await narrate(
            "And there's our chart. By default, it plots statistical curves over time, like min, P10, mean, P90 and max.",
        );
    });
});

