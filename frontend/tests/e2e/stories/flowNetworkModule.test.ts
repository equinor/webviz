import { expect } from "@playwright/test";

import { DROGON_AHM } from "../support/drogonTestData";
import { test } from "../support/recordingFixtures";
import { tutorialMeta } from "../support/tutorialMeta";
import {
    captureThumbnail,
    createSessionAndSelectEnsemble,
    dragModuleOntoLayout,
    hideDevOverlays,
    installCaseRowRedaction,
    installFakeCursor,
    installKeyOverlay,
    pace,
    pressKeyWithOverlay,
    smoothClick,
    smoothMoveToLocator,
    sweepSliderAcross,
    expandAllGroupTreeNodes,
} from "../support/walkthroughHelpers";

export const meta = tutorialMeta({
    slug: "flow-network-module",
    category: "Modules",
    title: "Flow Network",
    description: "The Flow Network module visualizes the reservoir simulator's network tree as it evolves over time, along with the oil, gas, and water flowing through each branch.",
});

/**
 * Adds an instance of the "Flow Network" module to the dashboard and waits for the group-tree
 * network to render from real Sumo data.
 */
test.describe("Flow Network module", () => {
    test("select a Drogon ensemble and render a Flow Network", async ({ page, narrate, markStep }) => {
        test.setTimeout(180_000);
        test.info().annotations.push({ type: "tutorial-slug", description: meta.slug });

        const FLOW_NETWORK = "Flow Network";

        // Render a cursor into the page so the mouse is visible in the recorded video.
        await installFakeCursor(page);

        // Show which keyboard key is pressed during the keyboard-navigation demo.
        await installKeyOverlay(page);

        // Blur every case row in the ensemble case-selector except the Drogon case we use.
        await installCaseRowRedaction(page, [DROGON_AHM.caseUuid]);

        // Hide developer-only floating overlays (e.g. React Query Devtools).
        await hideDevOverlays(page);

        await page.goto("/");
        await expect(page.getByText("FMU Analysis").first()).toBeVisible();

        // Shared setup (new session + ensemble selection) is narrated separately, in its own story.
        await createSessionAndSelectEnsemble(page);

        const moduleListItem = page.locator(`[title="${FLOW_NETWORK}"]`).first();
        if (!(await moduleListItem.isVisible())) {
            await smoothClick(page, page.getByTestId("modules-list-open-button"));
        }
        await expect(moduleListItem).toBeVisible();
        await pace(page);

        const introNarration = narrate(
            "The Flow Network module visualizes the reservoir simulator's network tree as it evolves over time, along with the oil, gas, and water flowing through each branch.",
        );
        // Open the module's info popover so its description is on screen during the introduction.
        // The help/info icon is the last button on the module list item.
        await smoothClick(page, moduleListItem.getByRole("button").last());
        await introNarration;
        // Close the info popover before we start dragging the module onto the dashboard.
        await page.keyboard.press("Escape");
        await pace(page);

        markStep("Add the Flow Network module");

        // Narrate the drag after the step marker so it lines up with the drag itself.
        const dragNarration = narrate(
            "Let's drag it from the module list onto the dashboard, then close the list to give the module more space.",
        );
        await dragModuleOntoLayout(page, FLOW_NETWORK);

        // Confirm the drop actually created the module instance. The module header in the layout
        // carries the module title.
        const moduleLayout = page.getByTestId("module-layout");
        await expect(moduleLayout.getByTitle(FLOW_NETWORK).first()).toBeVisible({ timeout: 30_000 });

        // Close the modules list so the module gets more room on the dashboard.
        await smoothClick(page, page.getByTestId("modules-list-open-button"));

        // Make sure the active module's settings panel is expanded so the settings are visible.
        const expandSettingsButton = page.getByTitle("Expand settings panel");
        if (await expandSettingsButton.isVisible()) {
            await smoothClick(page, expandSettingsButton);
        }
        await dragNarration;

        // Separate narration so the cursor lands on the Ensemble/Realization selectors as they are named.
        const ensembleRealizationNarration = narrate(
            "The network shown reflects the ensemble and realization you select.",
        );
        await smoothMoveToLocator(page, page.locator(".setting-row").filter({ hasText: "Ensembles" }));
        await smoothMoveToLocator(page, page.locator(".setting-row").filter({ hasText: "Realization" }));
        await ensembleRealizationNarration;
        await pace(page);

        // Pick a resampling frequency so the network has dated time steps to step through.
        markStep("Resampling frequency");
        // Open the dropdown as the first sentence starts; defer picking Weekly to the second sentence.
        const frequencyIntroNarration = narrate("Next, we pick a resampling frequency for the time-dependent flow data.");
        await smoothClick(page, page.getByRole("combobox", { name: "Frequency" }));
        await frequencyIntroNarration;

        const frequencyNarration = narrate("Let's go with weekly.");
        await smoothClick(page, page.getByRole("option", { name: "Weekly" }));
        await frequencyNarration;

        // The network build kicks off a query; wait for the module's loading indicator to clear and
        // the group-tree SVG to actually mount before treating this as done.
        const loadingBar = moduleLayout.getByRole("progressbar");
        await expect(loadingBar).toBeHidden({ timeout: 90_000 });
        await expect(moduleLayout.locator("svg").first()).toBeVisible({ timeout: 90_000 });

        const timeStepGroup = page.getByRole("group", { name: "Time step" });
        const timeStepControl = timeStepGroup.locator(".group\\/slider-comp").first();
        const timeStepThumb = timeStepGroup.getByRole("slider").first();

        // Focus the network on producers and injectors. A plain click on a multi-select option
        // replaces the whole selection, so click "Producer" first, then Ctrl-click "Injector" to
        // add it to the selection.
        markStep("Node types");

        await narrate("The node types control which wells appear in the network.");

        const nodeTypeNarration = narrate("Let's focus on the producers and injectors.");
        const nodeTypesRow = page.locator(".setting-row").filter({ hasText: "Node Types" });
        await smoothClick(page, nodeTypesRow.getByText("Producer", { exact: true }));
        await smoothClick(page, nodeTypesRow.getByText("Injector", { exact: true }), {
            modifiers: ["ControlOrMeta"],
        });
        await nodeTypeNarration;

        // Changing the node types refetches the network; wait for it to settle before continuing.
        await expect(loadingBar).toBeHidden({ timeout: 90_000 });

        // Point out the tree type setting that picks which simulator network definition is shown.
        markStep("Choose the tree type");
        const treeTypeRow = page.locator(".setting-row").filter({ hasText: "Tree Type" });
        const treeTypeNarration = narrate(
            "The tree type selects which simulator network to show \u2014 the Standard Network covers producers and injectors, while some models also offer the Extended Network from BRANPROP.",
        );
        // Open the setting's info popover so the on-screen explanation is visible while narrated.
        // The info icon is the last (unlabelled) button in the row, after the combobox controls.
        await smoothClick(page, treeTypeRow.getByRole("button").last());
        await treeTypeNarration;
        await page.keyboard.press("Escape");
        await pace(page);

        // Jump to the last time step and expand every branch so the whole network is visible.
        const expandNarration = narrate(
            "Now let's jump to the final time step and expand every branch to reveal the whole network. The wells sit at the leaf nodes on the right, with the platform and infrastructure to the left.",
        );
        markStep("Expand the network");
        // Drag the slider to the final time step so the cursor visibly carries it there.
        await sweepSliderAcross(page, timeStepControl, { durationMs: 2_500, direction: "right" });
        await pace(page);
        await expandAllGroupTreeNodes(page, moduleLayout);
        await expandNarration;

        await captureThumbnail(page);

        // With the full network shown, gently sweep the time step back and forth (~4s each way) so
        // the viewer can watch how it evolves over time (codegen only captures abrupt clicks).
        const sweepNarration = narrate(
            "As we move through time, the network evolves: the tree grows as new wells are drilled, and each edge's thickness shows how much of the selected phase flows through that branch.",
        );
        markStep("Visualize the network over time");
        await sweepSliderAcross(page, timeStepControl, { durationMs: 4_000, direction: "left" });
        await sweepSliderAcross(page, timeStepControl, { durationMs: 4_000, direction: "right" });
        await sweepNarration;

        // Keyboard is an alternative to dragging: Home/End jump to the ends, arrows step one at a
        // time. A keycap overlay shows which key is pressed (see installKeyOverlay).
        const keyboardNarration = narrate(
            "You can also do this from the keyboard \u2014 with the slider focused, Home and End jump to the first and last time step, and the arrow keys move one step at a time.",
        );

        await timeStepThumb.focus();
        await pressKeyWithOverlay(page, timeStepThumb, "Home", { pauseMs: 1_500 });
        await pressKeyWithOverlay(page, timeStepThumb, "End", { pauseMs: 1_500 });
        await pressKeyWithOverlay(page, timeStepThumb, "Home", { pauseMs: 1_500 });
        // Finish with the slider back at the last time step.
        await pressKeyWithOverlay(page, timeStepThumb, "End", { pauseMs: 1_500 });
        await keyboardNarration;

        markStep("Switch between phases");
        // Show the same network for a different phase via the "Edge options" setting.
        const edgeOptionsCombobox = page.locator(".setting-row").filter({ hasText: "Edge options" }).getByRole("combobox");

        const waterInjNarration = narrate(
            "The edges show the oil rate, but we can switch to another phase, like the water injection rate.",
        );
        await smoothClick(page, edgeOptionsCombobox);
        await waterInjNarration;
        await smoothClick(page, page.getByRole("option", { name: "Water Inj Rate" }));
        await expect(loadingBar).toBeHidden({ timeout: 90_000 });

        // Node options control the value displayed inside each node over time.
        const nodeOptionsCombobox = page.locator(".setting-row").filter({ hasText: "Node options" }).getByRole("combobox");
        markStep("Node values");

        // Open the dropdown first so the available options are on screen while we describe them.
        await smoothClick(page, nodeOptionsCombobox);
        const nodeOptionsNarration = narrate(
            "The node options set what each node displays over time. There are three to choose from: node pressure, well bottom-hole pressure, and well control mode.",
        );
        await nodeOptionsNarration;

        // With the options explained, pick pressure and let the network refetch.
        await smoothClick(page, page.getByRole("option", { name: "Pressure" }));
        await narrate("And that concludes our walkthrough of the Flow Network module.");
    });
});
