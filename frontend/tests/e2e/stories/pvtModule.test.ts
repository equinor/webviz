import { expect } from "@playwright/test";

import { DROGON_AHM } from "../support/drogonTestData";
import { test } from "../support/recordingFixtures";
import {
    captureThumbnail,
    createSessionAndSelectEnsemble,
    dragModuleOntoLayout,
    hideDevOverlays,
    installCaseRowRedaction,
    installFakeCursor,
    installKeyOverlay,
    pace,
    smoothClick,
} from "../support/walkthroughHelpers";

import { meta } from "./pvtModule.meta";

test.describe("PVT module", () => {
    test("select a Drogon ensemble and render PVT property curves", async ({ page, narrate, markStep }) => {
        test.setTimeout(300_000);
        test.info().annotations.push({ type: "tutorial-slug", description: meta.slug });

        const PVT = "PVT";

        await installFakeCursor(page);
        await installKeyOverlay(page);
        await installCaseRowRedaction(page, [DROGON_AHM.caseUuid]);
        await hideDevOverlays(page);

        await page.goto("/");
        await expect(page.getByText("FMU Analysis").first()).toBeVisible();
        await createSessionAndSelectEnsemble(page);

        const moduleListItem = page.locator(`[title="${PVT}"]`).first();
        if (!(await moduleListItem.isVisible())) {
            await smoothClick(page, page.getByTestId("modules-list-open-button"));
        }
        await expect(moduleListItem).toBeVisible();
        await pace(page);

        const introNarration = narrate(
            "The PVT module plots the pressure-dependent fluid properties that describe how the reservoir's oil, gas and water behave, read straight from the simulator's PVT tables.",
        );
        // Open the module's info popover so its description is on screen during the introduction.
        await smoothClick(page, moduleListItem.getByRole("button").last());
        await introNarration;
        // Close the info popover before dragging the module onto the dashboard.
        await page.keyboard.press("Escape");
        await pace(page);

        markStep("Add the PVT module");
        const dragNarration = narrate(
            "Let's drag it from the module list onto the dashboard, then close the list to give the module more space.",
        );
        await dragModuleOntoLayout(page, PVT);
        // dragModuleOntoLayout already waits for the module header to appear, so we can close the
        // modules list right away to give the plot more room.
        await smoothClick(page, page.getByTestId("modules-list-open-button"));
        await dragNarration;

        const moduleLayout = page.getByTestId("module-layout");

        // The module auto-selects the first ensemble, realization and PVT number, so a plot renders
        // from the real Sumo data without any manual selection.
        const loadingBar = moduleLayout.getByRole("progressbar");
        await expect(loadingBar).toBeHidden({ timeout: 90_000 });
        const plot = moduleLayout.locator(".js-plotly-plot").first();
        await expect(plot).toBeVisible({ timeout: 90_000 });
        await expect(plot.locator(".scatterlayer .js-line").first()).toBeVisible({ timeout: 90_000 });

        await narrate(
            "By default it shows the oil phase, PVTO. The four subplots are the oil formation volume factor Bo, the density, the viscosity, and the fluid ratio, which for oil is the solution gas-oil ratio Rs, each as a function of pressure.",
        );

        markStep("Compare across realizations");
        const realizationsRow = page.locator(".setting-row").filter({ hasText: "Realizations" });
        const realizationsNarration = narrate(
            "Each curve is a single realization. Selecting several realizations shows how much the fluid description varies across the ensemble.",
        );
        // Click the first realization to anchor the selection, then shift-click a later one to select
        // a contiguous range (the list is multi-select while grouping by ensemble).
        await smoothClick(page, realizationsRow.getByText("0", { exact: true }));
        await smoothClick(page, realizationsRow.getByText("2", { exact: true }), { modifiers: ["Shift"] });
        await expect(loadingBar).toBeHidden({ timeout: 90_000 });
        await realizationsNarration;

        markStep("Switch the fluid phase");
        const phaseRow = page.locator(".setting-row").filter({ hasText: "Phase" });
        const phaseNarration = narrate(
            "We can switch the fluid phase. The gas phase, PVTG, shows the same properties for gas; here the fluid ratio is Rv, the vaporized oil-gas ratio.",
        );
        await smoothClick(page, phaseRow.getByRole("combobox"));
        await smoothClick(page, page.getByRole("option", { name: "Gas (PVTG)", exact: true }));
        await expect(loadingBar).toBeHidden({ timeout: 90_000 });
        await phaseNarration;

        markStep("Choose which properties to plot");
        const showPlotForRow = page.locator(".setting-row").filter({ hasText: "Show plot for" });
        const plotsNarration = narrate(
            "We can also choose which properties to plot. Let's focus on just the formation volume factor and the viscosity.",
        );
        await smoothClick(page, showPlotForRow.getByText("Density", { exact: true }));
        await smoothClick(page, showPlotForRow.getByText("Fluid Ratio", { exact: true }));
        await plotsNarration;
        await pace(page, "long");

        markStep("Compare across PVT regions");
        const groupByRow = page.locator(".setting-row").filter({ hasText: "Group by" });
        const pvtNumRow = page.locator(".setting-row").filter({ hasText: "PVT Num" });
        const pvtNumNarration = narrate(
            "A model can have several PVT regions, each with its own fluid description. Grouping by PVTNum lets us select the regions and colors them so they can be compared side by side.",
        );
        await smoothClick(page, groupByRow.getByText("PVTNum", { exact: true }));
        await expect(loadingBar).toBeHidden({ timeout: 90_000 });
        await smoothClick(page, pvtNumRow.getByRole("button", { name: "Select all", exact: true }));
        await expect(loadingBar).toBeHidden({ timeout: 90_000 });
        await pvtNumNarration;
        await pace(page, "long");

        await captureThumbnail(page);

        await narrate("And that concludes our walkthrough of the PVT module.");
    });
});
