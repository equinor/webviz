import { expect } from "@playwright/test";

import { DROGON_AHM } from "../support/drogonTestData";
import { test } from "../support/recordingFixtures";
import {
    addFromMenu,
    browseSettingToNextOption,
    collapseItem,
    dpfLayer,
    dpfSetting,
    dpfSharedSetting,
    dpfView,
    editColorScale,
    pointAtViewer,
    selectSettingOption,
    setupTwoDViewer,
    suppressMapHover,
    topLevelAddButton,
    viewAddButton,
    waitForViewer,
} from "../support/twoDViewerHelpers";
import {
    captureThumbnail,
    hideDevOverlays,
    installCaseRowRedaction,
    installFakeCursor,
    pace,
    smoothClick,
    smoothMoveToLocator,
} from "../support/walkthroughHelpers";

import { meta } from "./twoDViewerDepthMap.meta";

test.describe("2D Viewer", () => {
    test("depth map with wells, faults and statistics", async ({ page, narrate, markStep }) => {
        test.setTimeout(900_000);
        test.info().annotations.push({ type: "tutorial-slug", description: meta.slug });

        await installFakeCursor(page);
        await suppressMapHover(page);
        await installCaseRowRedaction(page, [DROGON_AHM.caseUuid]);
        await hideDevOverlays(page);

        await page.goto("/");
        await expect(page.getByText("FMU Analysis").first()).toBeVisible();

        markStep("Introduction");
        const introNarration = narrate(
            "In this tutorial we use the 2D Viewer to build a classic depth map: the top reservoir surface, with wells, well picks and faults on top. Then we use ensemble statistics to see how the uncertainty varies across the field.",
        );
        await setupTwoDViewer(page);
        await introNarration;

        // --- Views and layers ------------------------------------------------------------------
        markStep("Add a view and a depth surface");
        const conceptNarration = narrate(
            "Everything in the 2D Viewer is set up in the layer panel on the left. A view is one map in the viewer, and each view holds the layers drawn in it. We start by adding a view.",
        );
        await smoothClick(page, page.getByRole("button", { name: "Add first view" }));
        await expect(dpfView(page, 0)).toBeVisible();
        await conceptNarration;

        const depthNarration = narrate(
            "From the view's add menu, we add a depth surface layer. It picks a sensible default for the ensemble, realization and surface.",
        );
        await addFromMenu(page, viewAddButton(page, 0), ["Layers", "Surfaces", "Depth"]);
        const depthLayer = dpfLayer(page, "DEPTH_SURFACE");
        await expect(depthLayer).toBeVisible();
        await depthNarration;

        const attributeNarration = narrate(
            "We switch the depth attribute to the structural depth surface from the structural model.",
        );
        await selectSettingOption(page, depthLayer, "depthAttribute", "structure_depth_surface (standard result)");
        await waitForViewer(page);
        await attributeNarration;

        // --- Cultural data ---------------------------------------------------------------------
        markStep("Add well picks and faults");
        const wellsNarration = narrate(
            "Next, we add the cultural data: the official well picks, which mark where each well penetrates the surface, and the fault polygons. New layers are added at the top of the view, and layers higher up in the list are drawn on top of the ones below.",
        );
        await addFromMenu(page, viewAddButton(page, 0), ["Layers", "Wells", "Picks (Official)"]);
        await addFromMenu(page, viewAddButton(page, 0), ["Layers", "Polygons", "Fault Polygons"]);
        const faultLayer = dpfLayer(page, "FAULT_POLYGONS");
        const picksLayer = dpfLayer(page, "DRILLED_WELLBORE_PICKS");
        await expect(faultLayer).toBeVisible();
        await expect(picksLayer).toBeVisible();
        await wellsNarration;

        const sourcesNarration = narrate(
            "The well picks come from the official well database, and you can choose which wells to show. The fault polygons come from the same ensemble as the surface, and follow the chosen surface and realization.",
        );
        await smoothMoveToLocator(page, dpfSetting(picksLayer, "wellbores"));
        await waitForViewer(page);
        await sourcesNarration;

        const tidyNarration = narrate(
            "The panel gets long quickly, so we collapse the settings of the well picks to keep things tidy.",
        );
        await collapseItem(page, picksLayer);
        await tidyNarration;

        // --- Shared settings -------------------------------------------------------------------
        markStep("Keep layers in sync with shared settings");
        const sharedNarration = narrate(
            "Notice that the fault polygons and the well picks each have their own surface name and realization. Keeping these in sync by hand is tedious. Instead, we add shared settings from the add menu at the top of the panel. A shared setting controls the same setting in every layer below it.",
        );
        await smoothMoveToLocator(page, dpfSetting(faultLayer, "surfaceName"));
        await addFromMenu(page, topLevelAddButton(page), ["Shared Settings", "Surface Name"]);
        await addFromMenu(page, topLevelAddButton(page), ["Shared Settings", "Realization"]);
        const sharedRealization = dpfSharedSetting(page, "realization");
        await expect(dpfSharedSetting(page, "surfaceName")).toBeVisible();
        await expect(sharedRealization).toBeVisible();
        await sharedNarration;

        const linkedNarration = narrate(
            "The controlled settings are now shown with a link icon in each layer. Stepping through realizations with the arrows updates the depth surface and the faults together.",
        );
        await expect(dpfSetting(depthLayer, "realization").getByRole("combobox")).toHaveCount(0);
        await smoothMoveToLocator(page, dpfSetting(depthLayer, "realization"));
        await browseSettingToNextOption(page, sharedRealization, "realization");
        await waitForViewer(page);
        await pace(page, "long");
        await browseSettingToNextOption(page, sharedRealization, "realization");
        await waitForViewer(page);
        await linkedNarration;

        // --- Color scale -----------------------------------------------------------------------
        markStep("Change the color scale");
        const colorNarration = narrate(
            "Each surface layer has its own color scale. Clicking it opens the color scale editor, where we choose a palette, and can make the scale discrete or fix its range.",
        );
        await editColorScale(page, depthLayer, "depthColorScale", { palette: "Viridis" });
        await waitForViewer(page);
        await colorNarration;

        const contoursNarration = narrate("We also switch on contour lines.");
        await smoothClick(page, dpfSetting(depthLayer, "contours").getByRole("switch"));
        await waitForViewer(page);
        await contoursNarration;

        // --- Statistics ------------------------------------------------------------------------
        markStep("Ensemble statistics");
        const statisticsNarration = narrate(
            "So far we have looked at single realizations. Switching the representation to ensemble statistics computes a statistical surface across all realizations. We start with the mean.",
        );
        await selectSettingOption(page, depthLayer, "representation", "Ensemble Statistics");
        await expect(dpfSetting(depthLayer, "statisticFunction").getByRole("combobox")).toHaveValue("Mean");
        await waitForViewer(page);
        await statisticsNarration;

        const stdNarration = narrate(
            "Now we switch to the standard deviation. Look at the bullseyes: the uncertainty drops towards zero at the wells, because every realization is conditioned to the well picks, and it grows as we move away from them.",
        );
        await selectSettingOption(page, depthLayer, "statisticFunction", "Std");
        await waitForViewer(page);
        await pointAtViewer(page);
        await captureThumbnail(page);
        await stdNarration;

        await narrate(
            "That's it: a depth map with cultural data, kept in sync with shared settings, and a quick look at where the model is most uncertain.",
        );
    });
});
