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
            "The PVT module plots the fluid properties given to the reservoir simulator.",
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
            "By default it shows the oil phase. The four subplots initially shown are the formation volume factor, density, viscosity, and maximum fluid ratio which for oil is the solution gas-oil ratio Rs. Each are plotted with pressure along the x-axis. Note that only the last one is a single function, while the others represent a family of curves or functions, each line segment representing different Rs values.",
        );

        markStep("Switch the fluid phase");
        const phaseRow = page.locator(".setting-row").filter({ hasText: "Phase" });
        const phaseNarration = narrate(
            "We can switch the fluid phase. The gas phase shows the same properties for gas. Here the fluid ratio is Rv, the vaporized oil-gas ratio.",
        );
        await smoothClick(page, phaseRow.getByRole("combobox"));
        await smoothClick(page, page.getByRole("option", { name: "Gas (PVTG)", exact: true }));
        await expect(loadingBar).toBeHidden({ timeout: 90_000 });
        await phaseNarration;

        markStep("Compare across PVT regions");
        const oilPhaseNarration = narrate(
            "Let's switch back to the oil phase.",
        );
        await smoothClick(page, phaseRow.getByRole("combobox"));
        await smoothClick(page, page.getByRole("option", { name: "Oil (PVTO)", exact: true }));
        await expect(loadingBar).toBeHidden({ timeout: 90_000 });
        await oilPhaseNarration;

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
