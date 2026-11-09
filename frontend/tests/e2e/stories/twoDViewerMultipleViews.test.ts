import { expect } from "@playwright/test";

import { DROGON_AHM } from "../support/drogonTestData";
import { test } from "../support/recordingFixtures";
import {
    addFromMenu,
    browseSettingToNextOption,
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
    smoothMoveToLocator,
} from "../support/walkthroughHelpers";

import { meta } from "./twoDViewerMultipleViews.meta";

const TIME_STEP_LAYER = "ATTRIBUTE_TIME_STEP_SURFACE";
const FORMATION = "Therys Fm.";
const PICK_SURFACE = "Therys Fm. Top";

type ViewSpec = { name: string; attribute: string; palette?: string; narration?: string };

const VIEWS: ViewSpec[] = [
    { name: "Pressure", attribute: "average_PRESSURE" },
    {
        name: "Oil saturation",
        attribute: "average_SOIL",
        palette: "Oil",
        narration:
            "Next, oil saturation. New views are added from the add menu at the top of the panel. We add the same time step layer, pick the average oil saturation, and choose the oil color palette, so the property is easy to recognize at a glance.",
    },
    {
        name: "Water saturation",
        attribute: "average_SWAT",
        palette: "Water",
        narration: "Then water saturation, in the same way, with the water color palette.",
    },
    {
        name: "Oil thickness",
        attribute: "oilthickness",
        palette: "Thickness",
        narration:
            "And finally the oil thickness map, with the thickness palette. Each view gets its own color in the panel, matching the label above its map.",
    },
];

test.describe("2D Viewer", () => {
    test("multiple views with simulation maps", async ({ page, narrate, markStep }) => {
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
            "In this tutorial we compare several properties side by side, using one view per property. The maps are zone averaged properties, extracted from the simulation grid for each formation and time step.",
        );
        await setupTwoDViewer(page);
        await introNarration;

        // --- First view ------------------------------------------------------------------------
        markStep("Add a time step surface");
        const firstViewNarration = narrate(
            "We add a view, and add a time step surface layer to it. These maps are found under Uncategorized for now. This is work in progress: once the simulation maps are tagged with more standardized metadata, they will get their own, more descriptive categories.",
        );
        await smoothClick(page, page.getByRole("button", { name: "Add first view" }));
        await addFromMenu(page, viewAddButton(page, 0), ["Layers", "Surfaces", "Uncategorized (Time Step)"]);
        await expect(dpfLayer(dpfView(page, 0), TIME_STEP_LAYER)).toBeVisible();
        await firstViewNarration;

        const attributeNarration = narrate("We pick the average pressure as the surface attribute.");
        await selectSettingOption(
            page,
            dpfLayer(dpfView(page, 0), TIME_STEP_LAYER),
            "surfaceAttribute",
            VIEWS[0].attribute,
        );
        await waitForViewer(page);
        await attributeNarration;

        markStep("Name and collapse the view");
        const renameNarration = narrate(
            "To tell the views apart, we double-click the view name and rename it after the property. Naming views will be automated later on. We then collapse the view to save space in the panel.",
        );
        await renameView(page, dpfView(page, 0), VIEWS[0].name);
        await collapseView(page, dpfView(page, 0));
        await renameNarration;

        // --- More views ------------------------------------------------------------------------
        markStep("Add more views");
        for (let i = 1; i < VIEWS.length; i++) {
            const spec = VIEWS[i];
            const viewNarration = narrate(spec.narration ?? "");
            await addFromMenu(page, topLevelAddButton(page), ["Groups", "View"]);
            const view = dpfView(page, i);
            await expect(view).toBeVisible();
            await addFromMenu(page, viewAddButton(page, i), ["Layers", "Surfaces", "Uncategorized (Time Step)"]);
            const layer = dpfLayer(view, TIME_STEP_LAYER);
            await selectSettingOption(page, layer, "surfaceAttribute", spec.attribute);
            if (spec.palette) {
                await editColorScale(page, layer, "colorScale", { palette: spec.palette });
            }
            await renameView(page, view, spec.name);
            await collapseView(page, view);
            await viewNarration;
        }
        await waitForViewer(page);

        // --- Shared settings -------------------------------------------------------------------
        markStep("Share formation and time step");
        const sharedNarration = narrate(
            "Each layer still has its own formation and time step, and they all need to match. So we add a shared formation name and a shared time point at the top of the panel. These control the matching settings in every view below them.",
        );
        await addFromMenu(page, topLevelAddButton(page), ["Shared Settings", "Formation Name"]);
        await addFromMenu(page, topLevelAddButton(page), ["Shared Settings", "Time point"]);
        const sharedFormation = dpfSharedSetting(page, "formationName");
        const sharedTimePoint = dpfSharedSetting(page, "timePoint");
        await expect(sharedFormation).toBeVisible();
        await expect(sharedTimePoint).toBeVisible();
        await sharedNarration;

        const formationNarration = narrate("We select the Therys formation.");
        await selectSettingOption(page, sharedFormation, "formationName", FORMATION);
        await waitForViewer(page);
        await formationNarration;

        markStep("Show well picks in all views");
        const picksNarration = narrate(
            "Layers can also be added outside the views, at the top level. These are drawn in every view. We add the official well picks this way, and a shared surface name to choose which picks to show: the top of the Therys formation.",
        );
        await addFromMenu(page, topLevelAddButton(page), ["Shared Settings", "Surface Name"]);
        await addFromMenu(page, topLevelAddButton(page), ["Layers", "Wells", "Picks (Official)"]);
        const sharedSurfaceName = dpfSharedSetting(page, "surfaceName");
        const picksLayer = dpfLayer(page, "DRILLED_WELLBORE_PICKS");
        await expect(picksLayer).toBeVisible();
        await selectSettingOption(page, sharedSurfaceName, "surfaceName", PICK_SURFACE);
        await expect(dpfSetting(picksLayer, "surfaceName")).toContainText(PICK_SURFACE);
        await waitForViewer(page);
        await picksNarration;

        // --- Step through time -----------------------------------------------------------------
        markStep("Step through time");
        const timeNarration = narrate(
            "Now we can step through the time steps with the arrows on the shared time point, and follow how pressure and saturations change in all four views at once.",
        );
        for (let i = 0; i < 3; i++) {
            await browseSettingToNextOption(page, sharedTimePoint, "timePoint");
            await waitForViewer(page);
            await pace(page, "long");
        }
        await pointAtViewer(page);
        await captureThumbnail(page);
        await timeNarration;

        const collapseNarration = narrate(
            "With the views collapsed, the panel stays short, and any view can be expanded again when we want to change its settings.",
        );
        await smoothMoveToLocator(page, dpfView(page, 0));
        await collapseNarration;
    });
});
