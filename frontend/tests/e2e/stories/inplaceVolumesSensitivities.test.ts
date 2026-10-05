import { expect } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

import { DROGON_DESIGN } from "../support/drogonTestData";
import { test } from "../support/recordingFixtures";
import {
    RECORDING,
    captureThumbnail,
    connectDataChannel,
    createSessionAndSelectEnsemble,
    dragModuleOntoLayout,
    hideDevOverlays,
    installCaseRowRedaction,
    installFakeCursor,
    installKeyOverlay,
    pace,
    removeModuleFromLayout,
    smoothClick,
    smoothMoveToLocator,
    smoothType,
} from "../support/walkthroughHelpers";

import { meta } from "./inplaceVolumesSensitivities.meta";

const TABLE_MODULE = "Inplace Volumes Table";
const PLOT_MODULE = "Inplace Volumes Plot";
const TORNADO_MODULE = "Sensitivity/Response plot";
const COMPARISON_MODULE = "Inplace Volumes Comparison";

// These modules retitle themselves from the selected data once added.
const PLOT_MODULE_TITLE = /\(STOIIP\)/;
const TORNADO_MODULE_TITLE = /^Sensitivity chart/;

function settingRow(page: Page, label: string): Locator {
    return page.locator(".setting-row").filter({ has: page.getByText(label, { exact: true }) });
}

function comboboxOption(page: Page, optionLabel: string): Locator {
    // Matched on the label element, since some options also carry a description.
    return page.getByRole("option").filter({ has: page.getByText(optionLabel, { exact: true }) });
}

async function selectComboboxOption(page: Page, settingLabel: string, optionLabel: string): Promise<void> {
    await smoothClick(page, settingRow(page, settingLabel).getByRole("combobox"));
    await smoothClick(page, comboboxOption(page, optionLabel));
}

/** Click a case in the (virtualized) "Sensitivity cases" list, scrolling it into view with the wheel first. */
async function clickSensitivityCase(page: Page, caseLabel: string, withCtrl = false): Promise<void> {
    const list = settingRow(page, "Sensitivity cases").locator(".form-element");
    const option = list.getByText(caseLabel, { exact: true });
    await smoothMoveToLocator(page, list);
    await list.hover();
    for (let i = 0; i < 40 && !(await option.isVisible()); i++) {
        await page.mouse.wheel(0, 48);
        await page.waitForTimeout(RECORDING ? 120 : 50);
    }
    await smoothClick(page, option, withCtrl ? { modifiers: ["Control"] } : undefined);
}

async function isModulesListOpen(page: Page): Promise<boolean> {
    return page.getByPlaceholder("Search modules...").isVisible();
}

async function openModulesList(page: Page): Promise<void> {
    if (!(await isModulesListOpen(page))) {
        await smoothClick(page, page.getByTestId("modules-list-open-button"));
    }
}

async function closeModulesList(page: Page): Promise<void> {
    if (await isModulesListOpen(page)) {
        await smoothClick(page, page.getByTestId("modules-list-open-button"));
    }
}

test.describe("Inplace volumes in a sensitivity ensemble", () => {
    test("analyse STOIIP per sensitivity case", async ({ page, narrate, markStep }) => {
        test.setTimeout(600_000);
        test.info().annotations.push({ type: "tutorial-slug", description: meta.slug });

        await installFakeCursor(page);
        await installKeyOverlay(page);
        await installCaseRowRedaction(page, [DROGON_DESIGN.caseUuid]);
        await hideDevOverlays(page);

        await page.goto("/");
        await expect(page.getByText("FMU Analysis").first()).toBeVisible();

        const moduleLayout = page.getByTestId("module-layout");
        const plot = moduleLayout.locator(".js-plotly-plot").first();

        async function waitForModules(): Promise<void> {
            await expect(moduleLayout.getByRole("progressbar")).toHaveCount(0, { timeout: 90_000 });
            await pace(page);
        }

        // --- 0. Setup --------------------------------------------------------------------------
        markStep("Load a design matrix ensemble");
        const introNarration = narrate(
            "In this walkthrough we analyse inplace volumes in a design matrix ensemble. Such an ensemble groups its realizations into sensitivities. rms_seed is the reference, and every other sensitivity changes one input, either as fixed scenarios, like low and high, or as a Monte Carlo distribution.",
        );
        await createSessionAndSelectEnsemble(page, { testCase: DROGON_DESIGN });
        await introNarration;

        // --- 1. Inplace Volumes Table ----------------------------------------------------------
        markStep("STOIIP per sensitivity case");
        await openModulesList(page);
        const tableNarration = narrate(
            "We start with the Inplace Volumes Table, and close the module list to give it room.",
        );
        await dragModuleOntoLayout(page, TABLE_MODULE);
        await closeModulesList(page);
        await tableNarration;
        await waitForModules();

        const tableSourceNarration = narrate(
            "The volumes are computed both on the geogrid and on the simulation grid. We keep only the geogrid.",
        );
        await smoothClick(page, settingRow(page, "Table sources").getByText("Geogrid", { exact: true }));
        await waitForModules();
        await tableSourceNarration;

        const responseNarration = narrate("As response, we pick the stock tank oil initially in place, STOIIP.");
        const responsesRow = settingRow(page, "Responses");
        await smoothClick(page, responsesRow.getByRole("combobox"));
        if ((await responsesRow.getByLabel("STOIIP", { exact: true }).count()) === 0) {
            await smoothClick(page, comboboxOption(page, "STOIIP"));
        }
        if ((await responsesRow.getByLabel("BULK", { exact: true }).count()) > 0) {
            await smoothClick(page, comboboxOption(page, "BULK"));
        }
        await page.keyboard.press("Escape");
        await expect(responsesRow.getByLabel("STOIIP", { exact: true })).toBeVisible();
        await waitForModules();
        await responseNarration;

        await narrate(
            "Each row is now one sensitivity case, with the sensitivity column pinned to the left. The statistics are computed per case, over that case's realizations only. The table source is the same on every row, so it is summarised above the table instead of taking up a column.",
        );
        await narrate(
            "Notice that several cases, such as relperm, kvkh and minpv, have exactly the same STOIIP as rms_seed. These sensitivities only change the dynamic model, so the static volumes are untouched.",
        );

        // --- 2. Inplace Volumes Plot -----------------------------------------------------------
        markStep("From histogram to bar plot");
        const plotNarration = narrate("Next, we replace the table with the Inplace Volumes Plot.");
        await removeModuleFromLayout(page, TABLE_MODULE);
        await openModulesList(page);
        await dragModuleOntoLayout(page, PLOT_MODULE);
        await closeModulesList(page);
        await plotNarration;
        await waitForModules();

        const plotSourceNarration = narrate("As before, we keep only the geogrid.");
        await smoothClick(page, settingRow(page, "Table sources").getByText("Geogrid", { exact: true }));
        await waitForModules();
        await expect(plot).toBeVisible({ timeout: 90_000 });
        await plotSourceNarration;

        await narrate(
            "By default the plot is a histogram of STOIIP, coloured by sensitivity case. With more than twenty cases in one histogram, the individual distributions are hard to tell apart.",
        );

        const barNarration = narrate(
            "A bar plot works better here. Each bar is one realization, coloured by its sensitivity case.",
        );
        await selectComboboxOption(page, "Plot Type", "Bar");
        await waitForModules();
        await barNarration;
        await narrate(
            "The Monte Carlo case hum spreads widely, scenario cases shift the whole level up or down, and the dynamic-only cases simply repeat the rms_seed realizations. The statistics table below the plot summarises the same data per case.",
        );

        const zoneNarration = narrate(
            "We can also create one bar for each zone instead of each realization. Each bar then shows the mean STOIIP of a case in that zone.",
        );
        await selectComboboxOption(page, "Create bar for each", "ZONE");
        await waitForModules();
        await zoneNarration;

        const caseFilterNarration = narrate(
            "To focus on a single sensitivity, we filter the sensitivity cases. We unselect all, pick rms_seed, and then hold Control to add the low and high cases of the Valysar channel probability.",
        );
        const sensitivityCasesRow = settingRow(page, "Sensitivity cases");
        await smoothClick(page, sensitivityCasesRow.getByRole("button", { name: "Unselect all", exact: true }));
        await clickSensitivityCase(page, "rms_seed");
        await clickSensitivityCase(page, "valysar_aps_prob_channel:low", true);
        await clickSensitivityCase(page, "valysar_aps_prob_channel:high", true);
        await waitForModules();
        await caseFilterNarration;
        await narrate(
            "Only the Valysar zone moves. This sensitivity changes the facies probability in Valysar alone, so the other zones match the reference.",
        );

        const selectAllNarration = narrate(
            "We select all cases again. The statistics table now has a zone column too, with one row per case and zone, giving the same means together with their spread.",
        );
        await smoothClick(page, sensitivityCasesRow.getByRole("button", { name: "Select all", exact: true }));
        await waitForModules();
        await selectAllNarration;

        // --- 3. Tornado via data channel ---------------------------------------------------------
        markStep("Rank sensitivities with a tornado");
        const boxNarration = narrate(
            "To rank the sensitivities we use a tornado plot. First we switch to box plots, which show the spread of each case, and hide the statistics table to make room.",
        );
        await selectComboboxOption(page, "Plot Type", "Box");
        await waitForModules();
        await smoothClick(page, page.getByText("Show statistics table below plot", { exact: true }));
        await waitForModules();
        await boxNarration;

        const tornadoNarration = narrate("Then we add the Sensitivity/Response plot to the right of the box plot.");
        await openModulesList(page);
        await dragModuleOntoLayout(page, TORNADO_MODULE, "right");
        await closeModulesList(page);
        await tornadoNarration;

        const channelNarration = narrate(
            "The tornado gets its data through a data channel. We drag from the plot module's channel button onto the tornado's Response input, which sends the STOIIP of every realization across.",
        );
        await connectDataChannel(page, { senderModuleTitle: PLOT_MODULE_TITLE, receiverName: "Response" });
        await waitForModules();
        await channelNarration;

        const colorNarration = narrate(
            "In the tornado settings, we colour the bars by sensitivity, so they match the colours in the box plot.",
        );
        await smoothClick(page, moduleLayout.getByTitle(TORNADO_MODULE_TITLE).first());
        await selectComboboxOption(page, "Color by", "Sensitivity");
        await waitForModules();
        await colorNarration;

        await captureThumbnail(page);

        await narrate(
            "The centre line is the reference, the average STOIIP of rms_seed. For scenario sensitivities, the bars show how far the low and high cases move the mean away from it. For Monte Carlo sensitivities, they show the spread of their realizations. The sensitivities are sorted by impact, so hum and the free water level stand out at the top.",
        );

        const hideNarration = narrate(
            "Finally, we hide sensitivities without impact. The dynamic-only scenarios, like relperm, kvkh and minpv, disappear. Monte Carlo sensitivities such as rms_seed keep a bar, since it reflects the seed spread rather than a changed input.",
        );
        await smoothClick(page, page.getByText("Hide sensitivities without impact", { exact: true }));
        await waitForModules();
        await hideNarration;

        // --- 4. Inplace Volumes Comparison ---------------------------------------------------
        markStep("Decompose a sensitivity's effect");
        const comparisonNarration = narrate(
            "The tornado tells us how much a sensitivity matters. To see why, we replace both modules with the Inplace Volumes Comparison.",
        );
        await removeModuleFromLayout(page, TORNADO_MODULE_TITLE);
        await removeModuleFromLayout(page, PLOT_MODULE_TITLE);
        await openModulesList(page);
        await dragModuleOntoLayout(page, COMPARISON_MODULE);
        await closeModulesList(page);
        await comparisonNarration;
        await waitForModules();

        const comparisonCaseNarration = narrate(
            "The reference is rms_seed on the geogrid. As comparison we choose the deep case of the free water level sensitivity.",
        );
        const comparisonCaseCombobox = page.getByRole("combobox", { name: "Comparison sensitivity case" });
        await smoothType(page, comparisonCaseCombobox, "fwl:deep");
        await smoothClick(page, comboboxOption(page, "fwl:deep"));
        await waitForModules();
        await expect(plot).toBeVisible({ timeout: 90_000 });
        await expect(plot.getByText("BULK", { exact: true }).first()).toBeVisible();
        await comparisonCaseNarration;

        await narrate(
            "The waterfall starts at the mean STOIIP of the reference and ends at the comparison case. The bars in between split the change in the oil zone into contributions from bulk volume, porosity, oil saturation and the oil formation volume factor.",
        );
        await narrate(
            "A deeper free water level extends the oil column, so most of the gain comes from the bulk volume of the oil zone, while the rock and fluid properties change much less.",
        );

        const valysarNarration = narrate(
            "For comparison, let's pick the high case of the Valysar channel probability.",
        );
        await smoothType(page, comparisonCaseCombobox, "valysar_aps_prob_channel:high");
        await smoothClick(page, comboboxOption(page, "valysar_aps_prob_channel:high"));
        await waitForModules();
        await valysarNarration;
        await narrate(
            "Now the picture is different. More channel facies means better rock, so the change comes mainly from porosity rather than from the bulk volume.",
        );

        await narrate("And that concludes our analysis of inplace volumes in a sensitivity ensemble.");
    });
});
