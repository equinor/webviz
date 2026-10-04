import { expect } from "@playwright/test";

import { DROGON_AHM } from "../support/drogonTestData";
import { test } from "../support/recordingFixtures";
import {
    addVectorToSelector,
    captureThumbnail,
    channelOutputForModule,
    connectDataChannel,
    createSessionAndSelectEnsemble,
    dragModuleOntoLayout,
    hideDevOverlays,
    installCaseRowRedaction,
    installFakeCursor,
    installKeyOverlay,
    pace,
    removeVectorFromSelector,
    smoothClick,
    smoothMoveToLocator,
} from "../support/walkthroughHelpers";

import { meta } from "./dataChannels.meta";

test.describe("Data channels", () => {
    test("feed a Simulation Time Series into a Distribution Plot via a data channel", async ({
        page,
        narrate,
        markStep,
    }) => {
        // This story builds three modules and several (cross-module) channel connections, so it
        // needs a larger budget than the single-module stories.
        test.setTimeout(360_000);
        test.info().annotations.push({ type: "tutorial-slug", description: meta.slug });

        const SIMULATION_TIME_SERIES = "Simulation Time Series";
        const DISTRIBUTION_PLOT = "Distribution plot";
        const INPLACE_VOLUMES_PLOT = "Inplace Volumes Plot";

        await installFakeCursor(page);
        await installKeyOverlay(page);
        await installCaseRowRedaction(page, [DROGON_AHM.caseUuid]);
        await hideDevOverlays(page);

        await page.goto("/");
        await expect(page.getByText("FMU Analysis").first()).toBeVisible();
        await createSessionAndSelectEnsemble(page);

        const modulesListButton = page.getByTestId("modules-list-open-button");
        const moduleLayout = page.getByTestId("module-layout");

        const introNarration = narrate(
            "Webviz modules can share data through data channels: main modules publish data which sub-modules subscribe to. Let's add a Simulation Time Series module which will feed a Distribution Plot sub-module.",
        );
        const timeSeriesListItem = page.locator(`[title="${SIMULATION_TIME_SERIES}"]`).first();
        if (!(await timeSeriesListItem.isVisible())) {
            await smoothClick(page, modulesListButton);
        }
        await expect(timeSeriesListItem).toBeVisible();
        await introNarration;

        markStep("Two module categories");
        const categoriesNarration = narrate(
            "Notice the module list is split into two categories: main modules, which produce and publish data, and sub-modules, which subscribe to a channel to visualize what they receive.",
        );
        await smoothMoveToLocator(page, page.getByRole("button", { name: "Main modules", exact: true }));
        await pace(page, "short");
        await smoothMoveToLocator(page, page.getByRole("button", { name: "Sub modules", exact: true }));
        await categoriesNarration;
        await pace(page, "long");

        markStep("Add a Simulation Time Series module");
        const timeSeriesNarration = narrate(
            "We start with a Simulation Time Series, plotting well A1's bottom hole pressure as individual realizations.",
        );
        // Keep the modules list open across both drags (the layout's edge drop zones work with it
        // open); it's closed once both modules are placed.
        await dragModuleOntoLayout(page, SIMULATION_TIME_SERIES);
        await timeSeriesNarration;

        await addVectorToSelector(page, "WBHP:A1");
        const timeSeriesPlot = moduleLayout.locator(".js-plotly-plot").first();
        await expect(timeSeriesPlot).toBeVisible({ timeout: 90_000 });

        const loadingBar = moduleLayout.getByRole("progressbar");
        const visualizationModeRow = page.locator(".setting-row").filter({ hasText: "Visualization mode" });
        await smoothClick(page, visualizationModeRow.getByText("Individual realizations", { exact: true }));
        await expect(loadingBar).toBeHidden({ timeout: 90_000 });
        await pace(page, "long");

        markStep("Add a Distribution Plot sub-module");
        const distributionNarration = narrate(
            "Below it we add a Distribution Plot, a sub-module that visualizes whatever data it receives through a channel. On its own it has nothing to show yet.",
        );
        await dragModuleOntoLayout(page, DISTRIBUTION_PLOT, "bottom");
        // Both modules are placed; close the list to give them more room.
        await smoothClick(page, modulesListButton);
        await distributionNarration;
        // Before connecting, only the time series has a plot; the Distribution Plot shows a prompt.
        await expect(moduleLayout.locator(".js-plotly-plot")).toHaveCount(1, { timeout: 30_000 });
        await pace(page, "long");

        markStep("Connect a data channel");
        const connectNarration = narrate(
            "To feed it data, we grab the time series module's data channel output and drag it onto the Distribution Plot's X-axis receiver.",
        );
        await connectDataChannel(page, "channelX");
        await connectNarration;

        // Once connected, the Distribution Plot renders its own plot, so there are now two plots.
        await expect(moduleLayout.locator(".js-plotly-plot")).toHaveCount(2, { timeout: 30_000 });
        await narrate(
            "Now the Distribution Plot shows a histogram of well A1's bottom hole pressure across all realizations, at the time step selected in the time series.",
        );
        await pace(page, "long");

        markStep("Cross-plot two vectors");
        const secondVectorNarration = narrate(
            "Data channels can carry more than one series. Let's add a second vector: well A1's tubing head pressure, and cross-plot it against the bottom hole pressure.",
        );
        // Re-activate the time series module (the Distribution Plot is active) so its vector selector shows.
        await smoothClick(page, moduleLayout.getByTitle(SIMULATION_TIME_SERIES).first());
        await addVectorToSelector(page, "WTHP:A1");
        await expect(loadingBar).toBeHidden({ timeout: 90_000 });
        await secondVectorNarration;
        await pace(page, "long");

        const crossPlotNarration = narrate(
            "We point the X-axis channel at the bottom hole pressure, then drag a second connection to the Y-axis receiver for the tubing head pressure.",
        );
        // Re-point channel X to just the bottom hole pressure, then connect channel Y to the tubing head
        // pressure. The content selector lists contents by vector name (e.g. "WBHP:A1 (iter-0)").
        await connectDataChannel(page, "channelX", { contentLabel: "WBHP:A1" });
        await connectDataChannel(page, "channelY", { contentLabel: "WTHP:A1" });
        await crossPlotNarration;

        // Activate the Distribution Plot so its plot-type setting is shown, then switch to a scatter.
        await smoothClick(page, moduleLayout.getByText(DISTRIBUTION_PLOT).first());
        const plotTypeRow = page.locator(".setting-row").filter({ hasText: "Plot type" });
        const scatterNarration = narrate(
            "Switching the Distribution Plot to a scatter, each point is now one realization: its bottom hole pressure on the X axis against its tubing head pressure on the Y axis, at the selected time step.",
        );
        await smoothClick(page, plotTypeRow.getByRole("combobox"));
        await smoothClick(page, page.getByRole("option", { name: "Scatter 2D", exact: true }));
        await scatterNarration;
        await expect(moduleLayout.locator(".js-plotly-plot")).toHaveCount(2, { timeout: 30_000 });
        await pace(page, "long");

        markStep("Colour the scatter by a third vector");
        const colorVectorNarration = narrate(
            "We can add a third dimension by colouring each point. Let's add well A1's gas-oil ratio to the time series.",
        );
        await smoothClick(page, moduleLayout.getByTitle(SIMULATION_TIME_SERIES).first());
        await addVectorToSelector(page, "WGOR:A1");
        await expect(loadingBar).toBeHidden({ timeout: 90_000 });
        await colorVectorNarration;
        await pace(page, "long");

        // Feed WGOR:A1 into the colour receiver first, then switch to the colour-mapped scatter, so the
        // plot never sits in the invalid state of a colour scatter without a colour channel.
        await smoothClick(page, moduleLayout.getByText(DISTRIBUTION_PLOT).first());
        const colorScatterNarration = narrate(
            "We feed the gas-oil ratio into the plot's colour channel and switch to a colour-mapped scatter: each point keeps its pressure coordinates, but its colour now encodes that realization's gas-oil ratio.",
        );
        await connectDataChannel(page, "channelColorMapping", { contentLabel: "WGOR:A1" });
        await smoothClick(page, plotTypeRow.getByRole("combobox"));
        await smoothClick(page, page.getByRole("option", { name: "Scatter 2D with color mapping", exact: true }));
        await colorScatterNarration;
        await expect(moduleLayout.locator(".js-plotly-plot")).toHaveCount(2, { timeout: 30_000 });
        await pace(page, "long");

        markStep("Move the time slice");
        const sliceNarration = narrate(
            "Because the channels publish the per-realization values at the selected time step, clicking different points along the time series updates the scatter for that moment in time. Let's step through time and watch the cloud of points shift and recolour.",
        );
        // Clicking a point in the time series chart sets the active time step the channels publish.
        // Step through several evenly spaced times so the scatter visibly updates for each.
        const dragArea = timeSeriesPlot.locator(".nsewdrag").first();
        const dragBox = await dragArea.boundingBox();
        if (dragBox) {
            for (const xFraction of [0.3, 0.5, 0.7, 0.9]) {
                await smoothClick(page, dragArea, {
                    position: { x: dragBox.width * xFraction, y: dragBox.height * 0.5 },
                });
                await pace(page, "long");
            }
        }
        await sliceNarration;
        await pace(page, "long");

        markStep("Cross-plot across modules");
        const crossModuleNarration = narrate(
            "Channels also connect different modules. Let's add an Inplace Volumes Plot and cross-plot a dynamic response against a static volume.",
        );
        // Swap the three well vectors for the field gas in place, then add the volumes module to the
        // right of the layout.
        await smoothClick(page, moduleLayout.getByTitle(SIMULATION_TIME_SERIES).first());
        await removeVectorFromSelector(page, "WBHP:A1");
        await removeVectorFromSelector(page, "WTHP:A1");
        await removeVectorFromSelector(page, "WGOR:A1");
        await addVectorToSelector(page, "FGIP");
        await expect(loadingBar).toBeHidden({ timeout: 90_000 });
        await smoothClick(page, modulesListButton);
        await dragModuleOntoLayout(page, INPLACE_VOLUMES_PLOT, "right");
        await smoothClick(page, modulesListButton);
        await crossModuleNarration;

        // Configure the volumes module to publish the total gas initially in place (GIIP_TOTAL) per
        // realization.
        // The freshly dropped module is already the active one, so its settings are shown without an
        // extra activation click (and its header title is already the dynamic response name, so
        // getByTitle("Inplace Volumes Plot") would no longer match it).
        // Target the Response combobox by its stable test id. The module instance title also contains
        // the current response name (e.g. "...(STOIIP)..."), so a text/role heuristic can resolve to
        // the dashboard header instead of the settings control; the test id is unambiguous.
        const responseCombobox = page.getByTestId("inplace-volumes-response-select").getByRole("combobox");
        // Typing filters and opens the list. This is more robust than clicking to open: a sticky
        // section header can intercept a click and leave the dropdown closed, but fill focuses the
        // input directly (no pointer hit-test) and triggers the filter.
        await responseCombobox.waitFor({ state: "visible", timeout: 20_000 });
        await responseCombobox.evaluate((el) => el.scrollIntoView({ block: "center" }));
        await smoothMoveToLocator(page, responseCombobox);
        await responseCombobox.fill("GIIP_TOTAL");
        // Response options show a name + description, so match the option whose name starts with the
        // result name. Filling "GIIP_TOTAL" narrows the list to just that entry.
        await smoothClick(page, page.getByRole("option", { name: /^GIIP_TOTAL/ }), { timeout: 20_000 });
        await pace(page, "long");

        markStep("Connect FGIP against GIIP");
        const connectCrossNarration = narrate(
            "We point the X axis at the field gas in place from the dynamic model, and the Y axis at the static gas initially in place from the volumes module, a connection that spans two different modules.",
        );
        // The scatter is still a colour-mapped scatter whose colour vector we just removed; drop back to
        // a plain Scatter 2D so the cross-module plot renders without a colour channel.
        await smoothClick(page, moduleLayout.getByText(DISTRIBUTION_PLOT).first());
        await smoothClick(page, plotTypeRow.getByRole("combobox"));
        await smoothClick(page, page.getByRole("option", { name: "Scatter 2D", exact: true }));
        // Re-point channel X from the bottom hole pressure to the gas in place (both from the time
        // series), and channel Y to the volumes module's GIIP_TOTAL response. The time series now
        // publishes only FGIP, so no previous content needs deselecting.
        await connectDataChannel(page, "channelX", {
            origin: channelOutputForModule(page, SIMULATION_TIME_SERIES),
            contentLabel: "FGIP",
        });
        await connectDataChannel(page, "channelY", {
            origin: channelOutputForModule(page, INPLACE_VOLUMES_PLOT),
            contentLabel: "GIIP_TOTAL",
        });
        await connectCrossNarration;
        await pace(page, "long");

        markStep("Watch the correlation evolve over time");
        const correlationNarration = narrate(
            "At the first time step the two match perfectly: the field gas in place equals the gas initially in place, so the points lie on a straight diagonal. Stepping forward in time, gas is produced from the dynamic model, the field gas in place drops, and the correlation breaks down.",
        );
        // Step from the earliest time (perfect correlation) forward (correlation degrades).
        const crossDragArea = timeSeriesPlot.locator(".nsewdrag").first();
        const crossDragBox = await crossDragArea.boundingBox();
        if (crossDragBox) {
            for (const xFraction of [0.02, 0.35, 0.65, 0.95]) {
                await smoothClick(page, crossDragArea, {
                    position: { x: crossDragBox.width * xFraction, y: crossDragBox.height * 0.5 },
                });
                await pace(page, "long");
            }
        }
        await correlationNarration;
        await pace(page, "long");

        await captureThumbnail(page);

        await narrate(
            "That's the essence of data channels: compose a dashboard by piping one module's output into another module's input.",
        );
    });
});
