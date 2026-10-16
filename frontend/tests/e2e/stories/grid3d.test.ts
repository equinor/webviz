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
    pace,
    smoothClick,
} from "../support/walkthroughHelpers";

import { meta } from "./grid3d.meta";

test.describe("3D Viewer", () => {
    test("displays a 3D grid model", async ({ page, narrate, markStep }) => {
        test.setTimeout(180_000);
        test.info().annotations.push({ type: "tutorial-slug", description: meta.slug });

        await installFakeCursor(page);
        await installCaseRowRedaction(page, [DROGON_AHM.caseUuid]);
        await hideDevOverlays(page);

        await page.goto("/");
        await expect(page.getByText("FMU Analysis").first()).toBeVisible();

        await createSessionAndSelectEnsemble(page);

        const dragNarration = narrate(
            "We drag the 3D Viewer module from the list onto the dashboard and wait for the relevant data and settings to load.",
        );
        markStep("Add the 3D Viewer");
        await dragModuleOntoLayout(page, "3D Viewer");
        await dragNarration;

        markStep("Add view and grid");

        const addViewNarration = narrate(
            "We then add a view to the newly added module, and add a grid model layer to it.",
        );
        await expect(page.getByRole('button', { name: 'Add first view' })).toBeVisible();
        await smoothClick(page, page.getByRole('button', { name: 'Add first view' }));
        await smoothClick(page, page.getByRole('button', { name: 'Add' }).nth(1));
        await smoothClick(page, page.getByRole('menuitem', { name: 'Layers' }));
        await smoothClick(page, page.getByRole('menuitem', { name: 'Grid Model', exact: true }));
        await smoothClick(page, page.getByRole('menuitem', { name: 'Grid Model 3D' }));
        await addViewNarration;

        const moduleLayout = page.getByTestId("module-layout");
        const loadingBar = moduleLayout.getByRole("progressbar");
        await expect(loadingBar).toBeHidden({ timeout: 90_000 });
        await expect(moduleLayout.locator("canvas").first()).toBeVisible({ timeout: 30_000 });

        // Give WebGL a moment to actually paint the grid geometry after mounting.
        await pace(page, "long");

        await captureThumbnail(page);

        await narrate("And there we see our 3D model grid");
    });
});
