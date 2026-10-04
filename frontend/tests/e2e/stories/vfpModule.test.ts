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

import { meta } from "./vfpModule.meta";

test.describe("VFP module", () => {
    test("select a Drogon ensemble and render VFP lift curves", async ({ page, narrate, markStep }) => {
        test.setTimeout(240_000);
        test.info().annotations.push({ type: "tutorial-slug", description: meta.slug });

        const VFP = "VFP";

        await installFakeCursor(page);
        await installKeyOverlay(page);
        await installCaseRowRedaction(page, [DROGON_AHM.caseUuid]);
        await hideDevOverlays(page);

        await page.goto("/");
        await expect(page.getByText("FMU Analysis").first()).toBeVisible();
        await createSessionAndSelectEnsemble(page);

        const moduleListItem = page.locator(`[title="${VFP}"]`).first();
        if (!(await moduleListItem.isVisible())) {
            await smoothClick(page, page.getByTestId("modules-list-open-button"));
        }
        await expect(moduleListItem).toBeVisible();
        await pace(page);

        const introNarration = narrate(
            "The VFP module visualizes Vertical Flow Performance tables from the reservoir simulator. These describe the bottom-hole pressure a well needs for a given flow rate, tabulated against the tubing-head pressure and the water, gas and artificial-lift conditions.",
        );
        // Open the module's info popover so its description is on screen during the introduction.
        await smoothClick(page, moduleListItem.getByRole("button").last());
        await introNarration;
        // Close the info popover before dragging the module onto the dashboard.
        await page.keyboard.press("Escape");
        await pace(page);

        markStep("Add the VFP module");
        const dragNarration = narrate(
            "Let's drag it from the module list onto the dashboard, then close the list to give the module more space.",
        );
        await dragModuleOntoLayout(page, VFP);
        // dragModuleOntoLayout already waits for the module header to appear, so we can close the
        // modules list right away to give the plot more room.
        await smoothClick(page, page.getByTestId("modules-list-open-button"));
        await dragNarration;

        const moduleLayout = page.getByTestId("module-layout");

        // The module auto-selects the first ensemble, realization, VFP type and table number, so a
        // plot renders from the real Sumo data without any manual selection. VFP has no loading bar;
        // the plot replaces a spinner once the table has loaded.
        const plot = moduleLayout.locator(".js-plotly-plot").first();
        await expect(plot).toBeVisible({ timeout: 90_000 });
        await expect(plot.locator(".scatterlayer .js-line").first()).toBeVisible({ timeout: 90_000 });

        await narrate(
            "By default it shows a single curve from a production table: the bottom-hole pressure on the vertical axis against the flow rate, for one combination of the table's parameters.",
        );

        // The THP/WFR/GFR/ALQ filters carry simulator-dependent labels (units and ratio types), so we
        // target their "Select all" quick buttons by position: they render in the order THP, WFR, GFR,
        // ALQ, matching the Color By options below.
        const selectAllButtons = page.getByRole("button", { name: "Select all", exact: true });

        markStep("Plot a family of curves");
        const familyNarration = narrate(
            "Selecting all the tubing-head pressure values fans the plot out into a family of curves, one per THP, coloured by THP. This is the classic VFP lift curve plot.",
        );
        await smoothClick(page, selectAllButtons.nth(0));
        await familyNarration;
        await pace(page, "long");

        markStep("Vary a second parameter");
        const secondParamNarration = narrate(
            "We can expand the family further by also varying a second parameter, here the water fraction, giving a curve for every combination.",
        );
        await smoothClick(page, selectAllButtons.nth(1));
        await secondParamNarration;
        await pace(page, "long");

        markStep("Colour by a different parameter");
        const colorByRow = page.locator(".setting-row").filter({ hasText: "Color By" });
        const colorByNarration = narrate(
            "The curves can be coloured by any of the table's parameters. Let's colour them by the water fraction instead of the tubing-head pressure.",
        );
        await smoothClick(page, colorByRow.getByRole("combobox"));
        // Second option: THP is always first, the water-fraction parameter second for production tables.
        await smoothClick(page, page.getByRole("option").nth(1));
        await colorByNarration;
        await pace(page, "long");

        markStep("Switch the pressure option");
        const pressureOptionRow = page.locator(".setting-row").filter({ hasText: "Pressure Option" });
        const pressureNarration = narrate(
            "Finally, the pressure option switches the vertical axis from the bottom-hole pressure to the pressure drop, BHP minus THP, across the tubing.",
        );
        await smoothClick(page, pressureOptionRow.getByText("DP (BHP-THP)", { exact: true }));
        await pressureNarration;
        await pace(page, "long");

        await captureThumbnail(page);

        await narrate("And that concludes our walkthrough of the VFP module.");
    });
});
