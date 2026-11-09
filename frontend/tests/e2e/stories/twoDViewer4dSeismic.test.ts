import { expect } from "@playwright/test";

import { DROGON_AHM } from "../support/drogonTestData";
import { test } from "../support/recordingFixtures";
import {
    addFromMenu,
    browseSettingToNextOption,
    collapseItem,
    collapseView,
    dpfLayer,
    dpfSetting,
    dpfSharedSetting,
    dpfView,
    editColorScale,
    pointAtViewer,
    renameView,
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
} from "../support/walkthroughHelpers";

import { meta } from "./twoDViewer4dSeismic.meta";

const SEISMIC_4D_LAYER = "SEISMIC_4D_SURFACE";
const FORMATION = "Therys Fm.";

test.describe("2D Viewer", () => {
    test("observed vs simulated 4D seismic", async ({ page, narrate, markStep }) => {
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
            "In this tutorial we compare observed four D seismic with simulated four D seismic. The simulated maps come from the petro-elastic modelling workflow, which turns the simulated pressures and saturations into synthetic seismic for each realization.",
        );
        await setupTwoDViewer(page);
        await introNarration;

        // --- Observed --------------------------------------------------------------------------
        markStep("Observed 4D seismic");
        const observedNarration = narrate(
            "We add a view and a seismic four D surface layer, and set its representation to observation. We name the view Observed.",
        );
        await smoothClick(page, page.getByRole("button", { name: "Add first view" }));
        await addFromMenu(page, viewAddButton(page, 0), ["Layers", "Surfaces", "Seismic 4D"]);
        const observedLayer = dpfLayer(dpfView(page, 0), SEISMIC_4D_LAYER);
        await selectSettingOption(page, observedLayer, "representation", "Observation");
        await renameView(page, dpfView(page, 0), "Observed");
        await waitForViewer(page);
        await observedNarration;

        // --- Simulated -------------------------------------------------------------------------
        markStep("Simulated 4D seismic");
        const simulatedNarration = narrate(
            "Then a second view with the same layer, this time showing the mean of the simulated seismic across all realizations. We name it Simulated mean, and collapse both views.",
        );
        await addFromMenu(page, topLevelAddButton(page), ["Groups", "View"]);
        await addFromMenu(page, viewAddButton(page, 1), ["Layers", "Surfaces", "Seismic 4D"]);
        const simulatedLayer = dpfLayer(dpfView(page, 1), SEISMIC_4D_LAYER);
        await selectSettingOption(page, simulatedLayer, "representation", "Ensemble Statistics");
        await expect(dpfSetting(simulatedLayer, "statisticFunction").getByRole("combobox")).toHaveValue("Mean");
        await renameView(page, dpfView(page, 1), "Simulated mean");
        await collapseView(page, dpfView(page, 0));
        await collapseView(page, dpfView(page, 1));
        await simulatedNarration;

        const statisticsNarration = narrate(
            "The statistics are computed across all realizations on request, so the simulated map can take a little while to appear.",
        );
        await waitForViewer(page);
        await statisticsNarration;

        // --- Shared settings -------------------------------------------------------------------
        markStep("Share formation, time interval and color scale");
        const sharedNarration = narrate(
            "For a fair comparison, both maps must show the same formation and the same time interval, and use the same color scale. We add these as shared settings at the top of the panel, so they control both views.",
        );
        await addFromMenu(page, topLevelAddButton(page), ["Shared Settings", "Formation Name"]);
        await addFromMenu(page, topLevelAddButton(page), ["Shared Settings", "Time interval"]);
        await addFromMenu(page, topLevelAddButton(page), ["Shared Settings", "Seismic Color scale"]);
        const sharedFormation = dpfSharedSetting(page, "formationName");
        const sharedInterval = dpfSharedSetting(page, "timeInterval");
        const sharedColorScale = dpfSharedSetting(page, "seismicColorScale");
        await expect(sharedFormation).toBeVisible();
        await expect(sharedInterval).toBeVisible();
        await expect(sharedColorScale).toBeVisible();
        await sharedNarration;

        const formationNarration = narrate(
            "We select the Therys formation. Both maps update, and the simulated mean is computed again for the new formation.",
        );
        await selectSettingOption(page, sharedFormation, "formationName", FORMATION);
        await waitForViewer(page);
        await formationNarration;

        markStep("Set a symmetric color scale");
        const colorNarration = narrate(
            "Four D differences are centered around zero, so we use a diverging red to blue palette, and fix the range from minus to plus zero point zero two, with the midpoint at zero. Now the same color means the same change in both maps.",
        );
        await editColorScale(page, sharedColorScale, "seismicColorScale", {
            gradient: "Diverging",
            palette: "RdYlBu",
            range: { min: -0.02, mid: 0, max: 0.02 },
        });
        await waitForViewer(page);
        await colorNarration;

        // --- Cultural data ---------------------------------------------------------------------
        markStep("Add faults to both views");
        const culturalNarration = narrate(
            "Fault polygons help us orient ourselves. Added at the top level, outside the views, they are drawn in both maps.",
        );
        await addFromMenu(page, topLevelAddButton(page), ["Layers", "Polygons", "Fault Polygons"]);
        const faultLayer = dpfLayer(page, "FAULT_POLYGONS");
        await expect(faultLayer).toBeVisible();
        await collapseItem(page, faultLayer);
        await waitForViewer(page);
        await culturalNarration;

        // --- Step through intervals ------------------------------------------------------------
        markStep("Step through time intervals");
        const intervalNarration = narrate(
            "Now we step through the time intervals with the arrows on the shared time interval. Where observed and simulated changes line up, the model explains the production response. Where they differ, there is room to improve the history match.",
        );
        for (let i = 0; i < 2; i++) {
            await browseSettingToNextOption(page, sharedInterval, "timeInterval");
            await waitForViewer(page);
            await pace(page, "long");
        }
        await pointAtViewer(page);
        await captureThumbnail(page);
        await intervalNarration;
    });
});
