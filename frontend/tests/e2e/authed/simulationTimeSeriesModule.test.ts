import { expect, test } from "@playwright/test";

import { DROGON_AHM } from "./drogonTestData";
import {
    dragModuleOntoLayout,
    hideDevOverlays,
    installCaseRowRedaction,
    installFakeCursor,
    pace,
    RECORDING,
    smoothClick,
    smoothFill,
} from "./walkthroughHelpers";

/**
 * End-to-end UI walkthrough that doubles as a tutorial recording: with a seeded authenticated
 * session it selects a Drogon ensemble, adds the "Simulation Time Series" module to the dashboard
 * and waits for a chart to render from real Sumo data.
 *
 * When run with RECORD=1 (see tests/e2e/_playwright.config.ts) the steps are paced via the
 * `pace()` helper so the captured video is watchable; without RECORD it runs at full speed as a
 * normal regression test.
 */
test.describe("Simulation Time Series module", () => {
    test("select a Drogon ensemble and render a Simulation Time Series chart", async ({ page }) => {
        // This recorded walkthrough steps slowly through the UI (paced for the tutorial video) and
        // waits on several real Sumo data loads, so it needs a larger budget than the default. Keep
        // it bounded though: a too-large timeout multiplies with CI retries (and video encoding of
        // the full-length recording) into a job that appears to hang.
        test.setTimeout(180_000);

        const SIMULATION_TIME_SERIES = "Simulation Time Series";

        // Render a fake cursor into the page so the mouse is visible in the recorded video
        // (Playwright's screencast does not capture the real OS cursor). No-op without RECORD=1.
        // Must run before the first navigation so the init script is registered.
        await installFakeCursor(page);

        // Blur every case row in the ensemble case-selector except the Drogon case we use, so the
        // recorded video never leaks the names of other (non-public) Equinor cases. No-op without
        // RECORD=1. Must also run before the first navigation.
        await installCaseRowRedaction(page, [DROGON_AHM.caseUuid]);

        // Hide developer-only floating overlays (e.g. the React Query Devtools toggle button in the
        // lower-left corner) so they don't appear in the recording. No-op without RECORD=1.
        await hideDevOverlays(page);

        // --- Boot into the logged-in app ---
        await page.goto("/");
        await expect(page.getByText("FMU Analysis").first()).toBeVisible();
        await pace(page, "long");

        // --- Start a new session. The StartPage is shown until a session is active, and the
        //     LeftNavBar/RightNavBar only render once a session exists. Creating an empty session
        //     automatically opens the ensemble selection dialog (see WorkbenchSessionManager
        //     .setActiveSession), so we just wait for that dialog instead of opening it manually. ---
        await smoothClick(page, page.getByRole("button", { name: "New session" }));
        await expect(page.getByText("Selected Ensembles")).toBeVisible({ timeout: 60_000 });
        await pace(page, "long");

        // --- 2. Open the ensemble explorer ("Add Ensemble") ---
        await smoothClick(page, page.getByRole("button", { name: "Add Ensemble" }));
        await pace(page);

        // --- 2b. Select the Drogon asset. The case list stays empty until an asset is chosen
        //     (the cases query is gated on the selected asset, and CI starts with empty
        //     localStorage so nothing is pre-selected). ---
        await smoothClick(page, page.locator("#asset-dropdown"));
        await smoothClick(page, page.locator(`li:has(div[title="${DROGON_AHM.assetName}"])`));
        await pace(page);

        // --- 2c. Filter the case table by the unique case UUID. The date-sorted (descending)
        //     virtualized table only renders a window of rows, so filtering by the UUID surfaces
        //     exactly the target case as a single row regardless of its position. ---
        await smoothFill(page, page.getByPlaceholder("Filter ...").first(), DROGON_AHM.caseUuid);
        // The case table lists real Drogon cases fetched from Sumo; allow a generous wait. Each row
        // cell renders "<caseName> - <caseUuid>".
        await expect(page.getByText(DROGON_AHM.caseUuid)).toBeVisible({ timeout: 60_000 });
        await pace(page);

        // --- 3. Select the Drogon AHM case (its first ensemble, iter-0, is auto-selected). Scope to
        //     <tbody> so we don't accidentally match the header filter row: the filter input now
        //     holds the case UUID as its value, which the accessible-name algorithm folds into the
        //     header row's name. ---
        await smoothClick(
            page,
            page
                .locator("tbody")
                .getByRole("row", { name: new RegExp(DROGON_AHM.caseUuid) })
                .first(),
        );
        // Wait for the case's ensemble to populate the Ensemble selector. Until an ensemble is
        // available the confirm button is rendered disabled (its wrapper has pointer-events: none),
        // which would make the click silently fall through to the surrounding container. The option
        // label is rendered as "<ensembleName>  (<n> reals)", so match on the name substring.
        await expect(page.getByText(DROGON_AHM.ensembleName).first()).toBeVisible({ timeout: 60_000 });
        await pace(page);

        // --- 4. Confirm the ensemble selection. There are two "Add Ensemble" buttons: the one in
        //     the ensemble tables that opened this drawer, and the confirm button inside the
        //     EnsembleExplorer drawer (rendered last in the DOM). Pick the drawer's confirm button. ---
        await smoothClick(page, page.getByRole("button", { name: "Add Ensemble" }).last());
        await pace(page);

        // --- 5. Close the ensemble explorer drawer. Confirming keeps the drawer open (so several
        //     ensembles can be added); it must be closed before the dialog's "Apply" button (which
        //     sits behind it) becomes clickable. ---
        await smoothClick(page, page.getByRole("button", { name: "Close" }));
        await pace(page);

        // --- 6. Apply the selection and close the dialog ---
        await smoothClick(page, page.getByRole("button", { name: "Apply" }));
        // Applying loads the ensemble metadata from the backend (real Sumo data, can be slow) and
        // then closes the dialog. The Dialog keeps its content mounted and merely hidden (display:
        // none) when closed, so assert the title is no longer visible rather than gone from the DOM.
        await expect(page.getByText("Selected Ensembles")).not.toBeVisible({ timeout: 120_000 });
        await pace(page, "long");

        // --- 7. Ensure the modules list is open. Creating a new session auto-opens it, but clicking
        //     the (already active) button would toggle it closed, so only click if it isn't shown. ---
        const moduleListItem = page.locator(`[title="${SIMULATION_TIME_SERIES}"]`).first();
        if (!(await moduleListItem.isVisible())) {
            await smoothClick(page, page.getByTestId("modules-list-open-button"));
        }
        await expect(moduleListItem).toBeVisible();
        await pace(page);

        // --- 8. Drag the Simulation Time Series module onto the dashboard ---
        await dragModuleOntoLayout(page, SIMULATION_TIME_SERIES);
        await pace(page, "long");

        // --- 9. Confirm the drop actually created the module instance. Dropping adds the module to
        //     the layout and makes it the active instance (which is what surfaces its settings
        //     panel). The module header in the layout carries the module title. ---
        const moduleLayout = page.getByTestId("module-layout");
        await expect(moduleLayout.getByTitle(SIMULATION_TIME_SERIES).first()).toBeVisible({ timeout: 30_000 });
        await pace(page);

        // --- 10. Make sure the active module's settings panel is expanded; only an expanded panel
        //     renders the active module's settings (it is hidden while collapsed). ---
        const expandSettingsButton = page.getByTitle("Expand settings panel");
        if (await expandSettingsButton.isVisible()) {
            await smoothClick(page, expandSettingsButton);
            await pace(page);
        }

        // --- 11. Select a vector so the chart has something to plot. The module's ensemble is
        //     auto-selected, but no vector is selected by default. The VectorSelector is a
        //     SmartNodeSelector: focus its input and type the vector name with real keystrokes.
        //     "FOPR" is a complete, valid leaf node; typing it (character-by-character so each React
        //     onChange settles) then pressing Enter commits it as a tag — a committed tag renders as
        //     an <li title="FOPR">. We must NOT use fill()+immediate Enter: fill() sets the value in
        //     one shot and the state from its onChange hasn't flushed when Enter fires, so nothing
        //     commits and the text just lingers in the input.
        //
        //     The whole thing is wrapped in toPass for CI resilience (a dropped keystroke leaves the
        //     value != "FOPR"), but it is made idempotent with a guard: once the FOPR tag exists we
        //     stop typing, so a retry can never add a second FOPR. After committing, input.last() is
        //     the fresh trailing empty input, which is what we (re)type into. The "Add new vector..."
        //     placeholder is removed once the input is focused, so we target the input structurally. ---
        const vectorSelectorContainer = page.locator("div.cursor-text.min-h-12.min-w-48").first();
        await expect(vectorSelectorContainer).toBeVisible();
        const vectorInput = vectorSelectorContainer.locator("input").last();
        const foprTag = vectorSelectorContainer.locator('li[title="FOPR"]');

        await smoothClick(page, vectorInput);
        await expect(async () => {
            if ((await foprTag.count()) === 0) {
                await vectorInput.fill("");
                await vectorInput.pressSequentially("FOPR", { delay: 120 });
                await vectorInput.press("Enter");
            }
            await expect(foprTag).toHaveCount(1);
        }).toPass({ timeout: 60_000, intervals: [1_000] });
        await pace(page, "long");

        // --- 12. Assert a Plotly chart renders from the real Sumo data ---
        const plot = page.locator(".js-plotly-plot").first();
        await expect(plot).toBeVisible({ timeout: 90_000 });
        // Plotly mounts the SVG container before the data is drawn, so waiting only for the plot to
        // be "visible" can finish on an empty chart. Wait for an actual trace line to be rendered so
        // the recording shows the populated time-series curve, not a blank plot.
        await expect(plot.locator(".scatterlayer .js-line").first()).toBeVisible({ timeout: 90_000 });
        await pace(page, "long");

        // Hold on the finished chart for a few seconds before the test (and thus the video) ends.
        // Playwright stops the screencast when the context closes and can drop the final moment, so
        // without this the recording sometimes cuts off just as the plot appears. Recording-only.
        if (RECORDING) {
            await page.waitForTimeout(4_000);
        }
    });
});

