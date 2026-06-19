import { expect, test } from "@playwright/test";

import { DROGON_AHM } from "./drogonTestData";

/**
 * Deeper UI walkthrough: select a Drogon ensemble and add the "Simulation Time Series" module,
 * then assert a chart renders with real Sumo data.
 *
 * This is scaffolded as `test.fixme` because the icon-only navigation buttons currently have no
 * stable accessible names (no data-testid / aria-label), so the selectors below need to be
 * confirmed against the running app. The recommended way to finalize them is Playwright codegen
 * against a running, seeded stack:
 *
 *     npx playwright codegen http://localhost:8080
 *
 * The data-level equivalents of these assertions are already covered reliably in
 * sumoData.test.ts. Remove `.fixme` once the selectors are verified.
 */
test.describe("Simulation Time Series module", () => {
    test.fixme("renders a chart for a Drogon ensemble", async ({ page }) => {
        await page.goto("/");

        // 1. Open the ensemble selection dialog (LeftNavBar, tooltip "Open ensemble selection dialog").
        //    TODO(codegen): confirm selector for the icon-only nav button.
        await page.getByRole("button", { name: /Open ensemble selection dialog/i }).click();
        await expect(page.getByText("Selected Ensembles")).toBeVisible();

        // 2. Add a regular ensemble and pick the Drogon AHM case / iter-0 ensemble.
        await page.getByRole("button", { name: "Add Ensemble" }).click();
        await expect(page.getByText(DROGON_AHM.caseName)).toBeVisible();
        // TODO(codegen): select field/case/ensemble in the explorer and confirm the selection.

        // 3. Open the modules list (RightNavBar, tooltip "Show modules list") and add the module.
        await page.getByRole("button", { name: /Show modules list/i }).click();
        await expect(page.getByText("Add modules")).toBeVisible();
        await expect(page.getByText("Simulation Time Series")).toBeVisible();
        // TODO(codegen): drag the "Simulation Time Series" module onto the dashboard.

        // 4. Assert that a plot/chart renders (Plotly renders an SVG-based chart).
        await expect(page.locator(".js-plotly-plot").first()).toBeVisible({ timeout: 60_000 });
    });
});
