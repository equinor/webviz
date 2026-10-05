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

import { meta } from "./relPermModule.meta";

test.describe("Relative Permeability module", () => {
    test("select a Drogon ensemble and render relative permeability curves", async ({ page, narrate, markStep }) => {
        test.setTimeout(240_000);
        test.info().annotations.push({ type: "tutorial-slug", description: meta.slug });

        const RELATIVE_PERMEABILITY = "Relative Permeability";

        // The "Selection" and "Plot" settings sections start collapsed (their panels are kept
        // mounted but zero-height), so their controls must be expanded before they can be clicked.
        async function expandSettingSection(title: string): Promise<void> {
            const trigger = page.getByRole("button", { name: title, exact: true });
            await expect(trigger).toBeVisible();
            if ((await trigger.getAttribute("aria-expanded")) === "false") {
                await smoothClick(page, trigger);
            }
        }

        await installFakeCursor(page);
        await installKeyOverlay(page);
        await installCaseRowRedaction(page, [DROGON_AHM.caseUuid]);
        await hideDevOverlays(page);

        await page.goto("/");
        await expect(page.getByText("FMU Analysis").first()).toBeVisible();
        await createSessionAndSelectEnsemble(page);

        const moduleListItem = page.locator(`[title="${RELATIVE_PERMEABILITY}"]`).first();
        if (!(await moduleListItem.isVisible())) {
            await smoothClick(page, page.getByTestId("modules-list-open-button"));
        }
        await expect(moduleListItem).toBeVisible();
        await pace(page);

        const introNarration = narrate(
            "The Relative Permeability module plots curves for capillary pressure and relative permeability from the reservoir simulator, letting us compare them across realizations and saturation regions.",
        );
        // Open the module's info popover so its description is on screen during the introduction.
        await smoothClick(page, moduleListItem.getByRole("button").last());
        await introNarration;
        // Close the info popover before dragging the module onto the dashboard.
        await page.keyboard.press("Escape");
        await pace(page);

        markStep("Add the Relative Permeability module");
        const dragNarration = narrate(
            "Let's drag it from the module list onto the dashboard, then close the list to give the module more space.",
        );
        await dragModuleOntoLayout(page, RELATIVE_PERMEABILITY);
        await smoothClick(page, page.getByTestId("modules-list-open-button"));
        await dragNarration;

        const moduleLayout = page.getByTestId("module-layout");

        // The module auto-selects the first saturation axis, all of its curves and the first SATNUM,
        // so a plot renders from the real Sumo data without any manual selection.
        const loadingBar = moduleLayout.getByRole("progressbar");
        await expect(loadingBar).toBeHidden({ timeout: 90_000 });
        const plot = moduleLayout.locator(".js-plotly-plot").first();
        await expect(plot).toBeVisible({ timeout: 90_000 });
        await expect(plot.locator(".scatterlayer .js-line").first()).toBeVisible({ timeout: 90_000 });

        await narrate(
            "By default the module shows the water relative permeability curves, KRW and KROW, plotted against water saturation for the first saturation region. The darker inner band spans the P90 to P10 range, covering most realizations, while the lighter outer band stretches out to the minimum and maximum. The solid line is the mean, and the dotted line the P50.",
        );

        markStep("Choose the curves");
        await expandSettingSection("Selection");
        const curvesRow = page.locator(".setting-row").filter({ hasText: "Curves" });
        const curvesNarration = narrate(
            "The Curves selector lists the relative permeability curves available on the current saturation axis. Here we have KRW, the relative permeability to water, and KROW, the relative permeability to oil. As water saturation increases, water flows more easily so KRW rises, while oil flows less easily and KROW falls towards zero.",
        );
        await smoothClick(page, curvesRow.getByRole("combobox"));
        await curvesNarration;
        // Close the dropdown again before moving on.
        await page.keyboard.press("Escape");
        await pace(page);

        markStep("Switch the saturation axis");
        const saturationAxisRow = page.locator(".setting-row").filter({ hasText: "Saturation axis" });
        const gasAxisNarration = narrate(
            "We can also switch the saturation axis. Selecting the gas saturation axis plots the gas and oil curves, KRG and KROG, against gas saturation instead.",
        );
        await smoothClick(page, saturationAxisRow.getByText("SG", { exact: true }));
        await expect(loadingBar).toBeHidden({ timeout: 90_000 });
        await gasAxisNarration;

        const waterAxisNarration = narrate("Let's switch back to the water saturation axis.");
        await smoothClick(page, saturationAxisRow.getByText("SW", { exact: true }));
        await expect(loadingBar).toBeHidden({ timeout: 90_000 });
        await waterAxisNarration;

        markStep("Compare across saturation regions");
        const satnumRow = page.locator(".setting-row").filter({ hasText: "SatNum" });
        const satnumNarration = narrate(
            "Each saturation region, or SATNUM, has its own set of curves. By selecting several of them the plot colors the curves by SATNUM so the regions can be compared side by side.",
        );
        await smoothClick(page, satnumRow.getByRole("combobox"));
        await smoothClick(page, page.getByRole("option", { name: "2", exact: true }));
        await smoothClick(page, page.getByRole("option", { name: "3", exact: true }));
        await page.keyboard.press("Escape");
        await satnumNarration;
        await expect(loadingBar).toBeHidden({ timeout: 90_000 });

        markStep("Split the regions into subplots");
        await expandSettingSection("Plot");
        const subplotRow = page.locator(".setting-row").filter({ hasText: "Subplot by" });
        const subplotNarration = narrate(
            "Instead of overlaying them, we can give each SATNUM its own subplot by grouping the plot by SATNUM.",
        );
        await smoothClick(page, subplotRow.getByRole("combobox"));
        await smoothClick(page, page.getByRole("option", { name: "SATNUM", exact: true }));
        await subplotNarration;
        await pace(page);

        markStep("Show individual realizations");
        const displayRow = page.locator(".setting-row").filter({ hasText: "Display" });
        const realizationsNarration = narrate(
            "So far we've looked at statistics across the ensemble. Let's instead draw every individual realization as its own line, turning off the statistic lines and fan, to reveal the physical behaviour of each realization together with any outliers.",
        );
        await smoothClick(page, displayRow.getByText("Individual realizations", { exact: true }));
        await smoothClick(page, displayRow.getByText("Statistic lines", { exact: true }));
        await smoothClick(page, displayRow.getByText("Statistic fan", { exact: true }));
        await realizationsNarration;
        await pace(page, "long");

        markStep("Switch to capillary pressure");
        const curveTypeRow = page.locator(".setting-row").filter({ hasText: "Curve type" });
        const capillaryNarration = narrate(
            "Switching the curve type plots capillary pressure for the selected saturation axis, in this case PCOW: the pressure difference over the oil-water interface in the pore space at a given saturation. It influences flow through capillary forces such as imbibition and trapping, and at initialization it similarly defines the transition zone.",
        );
        await smoothClick(page, curveTypeRow.getByText("Capillary pressure", { exact: true }));
        await expect(loadingBar).toBeHidden({ timeout: 90_000 });
        await capillaryNarration;

        await captureThumbnail(page);

        await narrate("And that concludes our walkthrough of the Relative Permeability module.");
    });
});
