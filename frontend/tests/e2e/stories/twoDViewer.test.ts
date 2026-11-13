import { expect } from "@playwright/test";

import {
    addFromMenu,
    browseSettingOption,
    dpfAddButton,
    dpfLayer,
    dpfPanel,
    dpfSetting,
    dpfSharedSetting,
    editColorScale,
    renameItem,
    selectSettingOption,
    setItemExpanded,
} from "../support/dpfHelpers";
import { DROGON_AHM } from "../support/drogonTestData";
import { test } from "../support/recordingFixtures";
import { TWO_D_VIEWER, addTwoDViewer, pointAtMap, twoDView, waitForMap } from "../support/twoDViewerHelpers";
import {
    RECORDING,
    addDashboard,
    captureThumbnail,
    createSessionAndSelectEnsemble,
    hideDevOverlays,
    installCaseRowRedaction,
    installFakeCursor,
    pace,
    renameActiveDashboard,
    smoothClick,
    smoothMoveToLocator,
} from "../support/walkthroughHelpers";

import { meta } from "./twoDViewer.meta";

/** How long the voice leads each narrated action, so speech starts before the cursor moves. */
const SPEECH_LEAD_MS = 800;

const TIME_STEP_LAYER = "ATTRIBUTE_TIME_STEP_SURFACE";
const SEISMIC_4D_LAYER = "SEISMIC_4D_SURFACE";

type SimulationMapView = { name: string; attribute: string; palette?: string; narration: string };

const SIMULATION_MAP_VIEWS: SimulationMapView[] = [
    {
        name: "Oil saturation",
        attribute: "average_SOIL",
        palette: "Oil",
        narration:
            "Next, oil saturation. New views come from the add menu at the top of the panel. The shared settings control the new layer right away, so we only pick the attribute and the oil color palette.",
    },
    {
        name: "Water saturation",
        attribute: "average_SWAT",
        palette: "Water",
        narration: "Then water saturation, with the water palette.",
    },
    {
        name: "Oil thickness",
        attribute: "oilthickness",
        palette: "Thickness",
        narration: "And finally oil thickness, with the thickness palette.",
    },
];

test.describe("2D Viewer", () => {
    test("depth maps, simulation maps and 4D seismic", async ({ page, narrate, markStep }) => {
        test.setTimeout(2_400_000);
        test.info().annotations.push({ type: "tutorial-slug", description: meta.slug });

        /**
         * Speak `text` while running `action`, and wait for both before moving on. The action starts
         * after a short lead, so the voice is already describing it when the cursor starts moving.
         */
        async function say(text: string, action?: () => Promise<void>): Promise<void> {
            const narration = narrate(text);
            if (action) {
                if (RECORDING) {
                    await page.waitForTimeout(SPEECH_LEAD_MS);
                }
                await action();
            }
            await narration;
        }

        await installFakeCursor(page);
        await installCaseRowRedaction(page, [DROGON_AHM.caseUuid]);
        await hideDevOverlays(page);

        await page.goto("/");
        await expect(page.getByText("FMU Analysis").first()).toBeVisible();

        markStep("Introduction");
        await say(
            "The 2D Viewer shows map data from your ensembles. We will walk through three typical use cases: a depth map with wells and faults, simulation maps side by side, and observed versus simulated four D seismic.",
            () => createSessionAndSelectEnsemble(page),
        );

        // ==========================================================================================
        // 1. Depth map with well picks, faults and statistics
        // ==========================================================================================
        markStep("Depth map: views and layers");
        await say("We give each use case its own dashboard. This first one is for the depth map.", () =>
            renameActiveDashboard(page, "Depth map"),
        );
        await say("We add the 2D Viewer.", () => addTwoDViewer(page));

        await say(
            "Maps are set up in the panel on the left. Each view is one map, and holds the layers drawn in it.",
            () => smoothMoveToLocator(page, dpfPanel(page)),
        );
        await say("Let's add our first view.", () =>
            smoothClick(page, page.getByRole("button", { name: "Add first view" })),
        );
        const depthView = twoDView(page, 0);

        await say("From the view's add menu, we add a depth surface layer.", () =>
            addFromMenu(page, dpfAddButton(depthView), ["Layers", "Surfaces", "Depth"]),
        );
        const depthLayer = dpfLayer(depthView, "DEPTH_SURFACE");
        await say("And switch the depth attribute to the structural depth surface.", async () => {
            await selectSettingOption(page, depthLayer, "depthAttribute", "structure_depth_surface (standard result)");
            await waitForMap(page);
        });

        markStep("Depth map: fault lines");
        await say(
            "Next, the fault polygons: the fault lines where the faults cut this surface. New layers go to the top of the view, and layers higher up are drawn on top.",
            async () => {
                await addFromMenu(page, dpfAddButton(depthView), ["Layers", "Polygons", "Fault Polygons"]);
                await waitForMap(page);
            },
        );
        const faultLayer = dpfLayer(depthView, "FAULT_POLYGONS");

        markStep("Depth map: shared settings");
        await say(
            "Notice that the fault polygons have their own surface name and realization, which in most use cases should match the depth surface.",
            () => smoothMoveToLocator(page, dpfSetting(faultLayer, "surfaceName")),
        );
        await say(
            "Instead of keeping them in sync by hand, we use shared settings. A shared setting controls the same setting in every layer below it.",
            () => smoothMoveToLocator(page, dpfAddButton(dpfPanel(page))),
        );
        await say(
            "We add a shared surface name and a shared realization from the add menu at the top of the panel.",
            async () => {
                await addFromMenu(page, dpfAddButton(dpfPanel(page)), ["Shared Settings", "Surface Name"]);
                await addFromMenu(page, dpfAddButton(dpfPanel(page)), ["Shared Settings", "Realization"]);
            },
        );
        const sharedRealization = dpfSharedSetting(page, "realization");
        await expect(dpfSetting(depthLayer, "realization").getByRole("combobox")).toHaveCount(0);
        await say(
            "The controlled settings now show a link icon. Stepping through realizations updates the surface and the faults together.",
            async () => {
                await smoothMoveToLocator(page, dpfSetting(depthLayer, "realization"));
                for (let i = 0; i < 2; i++) {
                    await browseSettingOption(page, sharedRealization, "realization");
                    await waitForMap(page);
                    await pace(page, "long");
                }
            },
        );

        markStep("Depth map: well picks");
        await say(
            "Finally, we add the official well picks, which mark where each well penetrates the surface. The new layer follows the shared surface name right away.",
            async () => {
                await addFromMenu(page, dpfAddButton(depthView), ["Layers", "Wells", "Picks (Official)"]);
                await waitForMap(page);
            },
        );
        const picksLayer = dpfLayer(depthView, "DRILLED_WELLBORE_PICKS");
        await say("But no picks show up: there are no well picks for the selected surface.", () => pointAtMap(page));
        await say(
            "So we change the shared surface name to the top of the Therys formation, and the surface, the faults and the picks all follow.",
            async () => {
                await smoothMoveToLocator(page, dpfSetting(picksLayer, "surfaceName"));
                await selectSettingOption(page, dpfSharedSetting(page, "surfaceName"), "surfaceName", "Therys Fm. Top");
                await expect(dpfSetting(picksLayer, "surfaceName")).toContainText("Therys Fm. Top");
                await waitForMap(page);
            },
        );
        await say(
            "Note that the well data in Webviz currently comes from the official well database, S-M-D-A. Well data from F-M-U is not available yet.",
            () => smoothMoveToLocator(page, dpfSetting(picksLayer, "wellbores")),
        );
        await pace(page, "long");
        await say("We collapse the well picks to keep the panel tidy.", () => setItemExpanded(page, picksLayer, false));

        markStep("Depth map: color scale and contours");
        await say("Clicking a color scale opens the editor. We pick the Viridis palette...", async () => {
            await editColorScale(page, depthLayer, "depthColorScale", { palette: "Viridis" });
            await waitForMap(page);
        });
        await say("...and switch on contour lines.", async () => {
            await smoothClick(page, dpfSetting(depthLayer, "contours").getByRole("switch"));
            await waitForMap(page);
        });

        markStep("Depth map: ensemble statistics");
        await say(
            "Switching the representation to ensemble statistics computes a statistical surface across all realizations. This takes a moment the first time.",
            async () => {
                await selectSettingOption(page, depthLayer, "representation", "Ensemble Statistics");
                await waitForMap(page);
            },
        );
        await say(
            "Now the standard deviation. Look at the bullseyes: the uncertainty drops towards zero at the wells, where every realization is conditioned to the well picks, and grows away from them.",
            async () => {
                await selectSettingOption(page, depthLayer, "statisticFunction", "Std");
                await waitForMap(page);
                await pointAtMap(page);
            },
        );

        // ==========================================================================================
        // 2. Simulation maps in several views
        // ==========================================================================================
        markStep("Simulation maps: first view");
        await say(
            "Next, simulation maps: zone averaged properties extracted from the simulation grid, one property per view. We start on a new dashboard.",
            async () => {
                await addDashboard(page, "Simulation maps");
                await addTwoDViewer(page);
                await smoothClick(page, page.getByRole("button", { name: "Add first view" }));
            },
        );
        const pressureView = twoDView(page, 0);
        await say(
            "The maps are time step surfaces, found under Uncategorized for now. This is work in progress: once the simulation maps carry more standardized metadata, they will get their own categories.",
            () => addFromMenu(page, dpfAddButton(pressureView), ["Layers", "Surfaces", "Uncategorized (Time Step)"]),
        );
        await say("We pick the average pressure...", () =>
            selectSettingOption(page, dpfLayer(pressureView, TIME_STEP_LAYER), "surfaceAttribute", "average_PRESSURE"),
        );
        await say("...and rename the view by double-clicking its name.", async () => {
            await renameItem(page, pressureView, "Pressure");
            await setItemExpanded(page, pressureView, false);
        });

        markStep("Simulation maps: shared settings and well picks");
        await say(
            "This time we add the shared settings up front, so every view we add next follows them: a shared formation and a shared time point.",
            async () => {
                await addFromMenu(page, dpfAddButton(dpfPanel(page)), ["Shared Settings", "Formation Name"]);
                await addFromMenu(page, dpfAddButton(dpfPanel(page)), ["Shared Settings", "Time point"]);
                await selectSettingOption(page, dpfSharedSetting(page, "formationName"), "formationName", "Therys Fm.");
            },
        );
        await say(
            "Layers added at the top level, outside the views, are drawn in every view. We add the well picks this way, with a shared surface name for the top of the Therys formation.",
            async () => {
                await addFromMenu(page, dpfAddButton(dpfPanel(page)), ["Shared Settings", "Surface Name"]);
                await addFromMenu(page, dpfAddButton(dpfPanel(page)), ["Layers", "Wells", "Picks (Official)"]);
                await selectSettingOption(page, dpfSharedSetting(page, "surfaceName"), "surfaceName", "Therys Fm. Top");
                await setItemExpanded(page, dpfLayer(page, "DRILLED_WELLBORE_PICKS"), false);
                await waitForMap(page);
            },
        );

        markStep("Simulation maps: more views");
        for (const [i, spec] of SIMULATION_MAP_VIEWS.entries()) {
            await say(spec.narration, async () => {
                await addFromMenu(page, dpfAddButton(dpfPanel(page)), ["Groups", "View"]);
                const view = twoDView(page, i + 1);
                await addFromMenu(page, dpfAddButton(view), ["Layers", "Surfaces", "Uncategorized (Time Step)"]);
                const layer = dpfLayer(view, TIME_STEP_LAYER);
                await selectSettingOption(page, layer, "surfaceAttribute", spec.attribute);
                if (spec.palette) {
                    await editColorScale(page, layer, "colorScale", { palette: spec.palette });
                }
                await renameItem(page, view, spec.name);
                await setItemExpanded(page, view, false);
            });
        }

        markStep("Simulation maps: step through time");
        await say(
            "With the views collapsed, the panel stays short. Now we step through the time points with the arrows on the shared time point, and follow pressure and saturations change in all four views at once.",
            async () => {
                await waitForMap(page);
                for (let i = 0; i < 3; i++) {
                    await browseSettingOption(page, dpfSharedSetting(page, "timePoint"), "timePoint");
                    await waitForMap(page);
                    await pace(page, "long");
                }
                await pointAtMap(page);
            },
        );
        await captureThumbnail(page);

        // ==========================================================================================
        // 3. Observed vs. simulated 4D seismic
        // ==========================================================================================
        markStep("4D seismic: observed");
        await say(
            "Finally, we compare observed four D seismic with simulated four D seismic on a third dashboard.",
            async () => {
                await addDashboard(page, "4D seismic");
                await addTwoDViewer(page);
                await smoothClick(page, page.getByRole("button", { name: "Add first view" }));
            },
        );
        const observedView = twoDView(page, 0);
        await say("The first view shows the observed seismic, so we name it Observed.", () =>
            renameItem(page, observedView, "Observed"),
        );
        await say(
            "Both maps must show the same formation and time interval, with the same color scale, so we add these as shared settings.",
            async () => {
                await addFromMenu(page, dpfAddButton(dpfPanel(page)), ["Shared Settings", "Formation Name"]);
                await addFromMenu(page, dpfAddButton(dpfPanel(page)), ["Shared Settings", "Time interval"]);
                await addFromMenu(page, dpfAddButton(dpfPanel(page)), ["Shared Settings", "Seismic Color scale"]);
            },
        );
        await say(
            "We add a seismic four D surface to the view, set its representation to observation, and select the Therys formation.",
            async () => {
                await addFromMenu(page, dpfAddButton(observedView), ["Layers", "Surfaces", "Seismic 4D"]);
                await selectSettingOption(
                    page,
                    dpfLayer(observedView, SEISMIC_4D_LAYER),
                    "representation",
                    "Observation",
                );
                await selectSettingOption(page, dpfSharedSetting(page, "formationName"), "formationName", "Therys Fm.");
                await setItemExpanded(page, observedView, false);
            },
        );

        markStep("4D seismic: simulated");
        await say(
            "The second view shows the mean of the simulated seismic across all realizations. It is computed on request.",
            async () => {
                await addFromMenu(page, dpfAddButton(dpfPanel(page)), ["Groups", "View"]);
                const simulatedView = twoDView(page, 1);
                await addFromMenu(page, dpfAddButton(simulatedView), ["Layers", "Surfaces", "Seismic 4D"]);
                await selectSettingOption(
                    page,
                    dpfLayer(simulatedView, SEISMIC_4D_LAYER),
                    "representation",
                    "Ensemble Statistics",
                );
                await renameItem(page, simulatedView, "Simulated mean");
                await setItemExpanded(page, simulatedView, false);
            },
        );

        markStep("4D seismic: shared color scale");
        await say(
            "Four D differences are centered around zero, so we use a diverging red to blue palette, fixed from minus to plus zero point zero two with the midpoint at zero. Now the same color means the same change in both maps.",
            () =>
                editColorScale(page, dpfSharedSetting(page, "seismicColorScale"), "seismicColorScale", {
                    gradient: "Diverging",
                    palette: "RdYlBu",
                    range: { min: -0.02, mid: 0, max: 0.02 },
                }),
        );
        await say("Fault polygons at the top level help us orient ourselves in both maps.", async () => {
            await addFromMenu(page, dpfAddButton(dpfPanel(page)), ["Layers", "Polygons", "Fault Polygons"]);
            await setItemExpanded(page, dpfLayer(page, "FAULT_POLYGONS"), false);
            await waitForMap(page);
        });

        markStep("4D seismic: step through time intervals");
        await say(
            "Now we step through the time intervals. Where observed and simulated changes line up, the model explains the production response. Where they differ, there is room to improve the history match.",
            async () => {
                for (let i = 0; i < 2; i++) {
                    await browseSettingOption(page, dpfSharedSetting(page, "timeInterval"), "timeInterval");
                    await waitForMap(page);
                    await pace(page, "long");
                }
                await pointAtMap(page);
            },
        );

        await say(
            `That's the ${TWO_D_VIEWER}: views hold layers, shared settings keep them in sync, and top-level layers are drawn in every view.`,
        );
    });
});
