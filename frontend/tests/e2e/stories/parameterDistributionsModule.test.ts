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

import { meta } from "./parameterDistributionsModule.meta";

test.describe("Parameter Distributions module", () => {
    test("compare prior and posterior parameter distributions from an AHM run", async ({ page, narrate, markStep }) => {
        test.setTimeout(240_000);
        test.info().annotations.push({ type: "tutorial-slug", description: meta.slug });

        const PARAMETER_DISTRIBUTIONS = "Parameter Distributions";

        await installFakeCursor(page);
        await installKeyOverlay(page);
        await installCaseRowRedaction(page, [DROGON_AHM.caseUuid]);
        await hideDevOverlays(page);

        await page.goto("/");
        await expect(page.getByText("FMU Analysis").first()).toBeVisible();
        // Load both iterations of the same assisted history matching run so we can compare them:
        // iter-0 is the prior ensemble, iter-1 the posterior after one update.
        await createSessionAndSelectEnsemble(page, { additionalEnsembleNames: [DROGON_AHM.secondEnsembleName] });

        const moduleListItem = page.locator(`[title="${PARAMETER_DISTRIBUTIONS}"]`).first();
        if (!(await moduleListItem.isVisible())) {
            await smoothClick(page, page.getByTestId("modules-list-open-button"));
        }
        await expect(moduleListItem).toBeVisible();
        await pace(page);

        const introNarration = narrate(
            "The Parameter Distributions module shows the distributions of an ensemble's uncertain input parameters. It's especially useful in assisted history matching, where we compare the prior and posterior ensembles.",
        );
        // Open the module's info popover so its description is on screen during the introduction.
        await smoothClick(page, moduleListItem.getByRole("button").last());
        await introNarration;
        // Close the info popover before dragging the module onto the dashboard.
        await page.keyboard.press("Escape");
        await pace(page);

        markStep("Add the Parameter Distributions module");
        const dragNarration = narrate(
            "Let's drag it from the module list onto the dashboard, then close the list to give the plots more room.",
        );
        await dragModuleOntoLayout(page, PARAMETER_DISTRIBUTIONS);
        // dragModuleOntoLayout already waits for the module header to appear, so we can close the
        // modules list right away to give the plots more room.
        await smoothClick(page, page.getByTestId("modules-list-open-button"));
        await dragNarration;

        const moduleLayout = page.getByTestId("module-layout");

        // Parameters load with the ensemble, so a plot grid renders without any manual selection.
        const plot = moduleLayout.locator(".js-plotly-plot").first();
        await expect(plot).toBeVisible({ timeout: 90_000 });

        await narrate(
            "By default it's in Independent mode, drawing a histogram of each parameter for the selected ensemble, here iter-0, the prior ensemble of our history matching run.",
        );

        markStep("Switch to Prior-Posterior analysis");
        const analysisModeRow = page.locator(".setting-row").filter({ hasText: "Analysis mode" });
        const analysisNarration = narrate(
            "To compare the prior with the result of history matching, we switch the analysis mode to Prior-Posterior.",
        );
        await smoothClick(page, analysisModeRow.getByRole("combobox"));
        await smoothClick(page, page.getByRole("option", { name: "Prior-Posterior", exact: true }));
        await analysisNarration;
        await pace(page);

        markStep("Pick the prior and posterior ensembles");
        const priorNarration = narrate(
            "We set the prior to iter-0, the starting ensemble, and the posterior to iter-1, the ensemble after one assisted history matching update, as we here lack ensembles from a later iteration.",
        );
        const priorRow = page.locator(".setting-row").filter({ hasText: "Prior ensemble" });
        await smoothClick(page, priorRow.getByRole("combobox"));
        await smoothClick(page, page.getByRole("option", { name: DROGON_AHM.ensembleName }));

        const posteriorRow = page.locator(".setting-row").filter({ hasText: "Posterior ensemble" });
        await smoothClick(page, posteriorRow.getByRole("combobox"));
        await smoothClick(page, page.getByRole("option", { name: DROGON_AHM.secondEnsembleName }));
        await priorNarration;
        await expect(plot).toBeVisible({ timeout: 90_000 });

        await narrate(
            "Now each parameter subplot has two distributions plotted: the prior and the posterior. Where the observations were informative, the posterior is narrower than the prior: history matching has reduced the uncertainty by conditioning to observations. Parameters the observations couldn't constrain stay close to their prior.",
        );
        await pace(page, "long");

        markStep("Rank the most updated parameters");
        const sortRow = page.locator(".setting-row").filter({ hasText: "Parameter sort method" });
        const sortNarration = narrate(
            "We can rank parameters by how much the update reduced their uncertainty. Let's sort by prior-to-posterior entropy reduction.",
        );
        await smoothClick(page, sortRow.getByRole("combobox"));
        await smoothClick(page, page.getByRole("option", { name: "Prior-Posterior Entropy Reduction", exact: true }));
        await sortNarration;
        await expect(plot).toBeVisible({ timeout: 90_000 });

        const sortInfoNarration = narrate(
            "Entropy reduction measures the overall drop in uncertainty. KL divergence also responds to redistribution: if the spread stays about the same but probability mass shifts, entropy can stay similar while KL divergence changes.",
        );
        await smoothClick(page, sortRow.getByRole("button"));
        await expect(page.getByText("Parameter Sorting Methods", { exact: true })).toBeVisible();
        await sortInfoNarration;
        await page.keyboard.press("Escape");
        await pace(page, "long");

        markStep("Switch to a distribution plot");
        const plotTypeRow = page.locator(".setting-row").filter({ hasText: "Plot type" });
        const plotTypeNarration = narrate(
            "Switching to a distribution plot replaces the histograms with smooth density curves, which makes the narrowing of the posterior easier to read.",
        );
        await smoothClick(page, plotTypeRow.getByRole("combobox"));
        await smoothClick(page, page.getByRole("option", { name: "Distribution Plot", exact: true }));
        await plotTypeNarration;
        await expect(plot).toBeVisible({ timeout: 90_000 });
        await pace(page, "long");

        markStep("Add percentile markers");
        const markersRow = page.locator(".setting-row").filter({ hasText: "Additional markers" });
        const markersNarration = narrate(
            "And adding markers for P10, mean and P90 summarises how each distribution's centre and spread shifted between prior and posterior.",
        );
        await smoothClick(page, markersRow.getByText("Show markers for P10, Mean, P90", { exact: true }));
        await markersNarration;
        await pace(page, "long");

        await captureThumbnail(page);

        await narrate("And that concludes our walkthrough of the Parameter Distributions module.");
    });
});
