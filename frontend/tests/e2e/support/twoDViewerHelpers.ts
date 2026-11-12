import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { dpfGroup, waitForDpfData } from "./dpfHelpers";
import {
    RECORDING,
    activeModuleLayout,
    dragModuleOntoLayout,
    smoothClick,
    smoothMoveToLocator,
} from "./walkthroughHelpers";

/** 2D Viewer specifics on top of the generic data provider framework helpers in `dpfHelpers.ts`. */

export const TWO_D_VIEWER = "2D Viewer";

/** The `index`-th view in the 2D Viewer's layer panel. */
export function twoDView(page: Page, index: number): Locator {
    return dpfGroup(page, "VIEW", index);
}

/**
 * Drop a 2D Viewer onto the active dashboard, opening the modules list first if needed and closing it
 * afterwards to give the viewer room.
 */
export async function addTwoDViewer(page: Page): Promise<void> {
    const modulesListButton = page.getByTestId("modules-list-open-button");
    const modulesSearch = page.getByPlaceholder("Search modules...");
    if (!(await modulesSearch.isVisible())) {
        await smoothClick(page, modulesListButton);
    }
    await dragModuleOntoLayout(page, TWO_D_VIEWER);
    await smoothClick(page, modulesListButton);
    await expect(modulesSearch).toBeHidden();
    await expect(page.getByRole("button", { name: "Add first view" })).toBeVisible();
}

/** Wait until all layers have loaded and the map has painted. */
export async function waitForMap(page: Page): Promise<void> {
    await waitForDpfData(page);
    await expect(activeModuleLayout(page).locator("canvas").first()).toBeVisible({ timeout: 30_000 });
    // Give WebGL a moment to paint after the data arrives.
    await page.waitForTimeout(RECORDING ? 600 : 200);
}

/** Glide the cursor over the map to draw attention to the result. */
export async function pointAtMap(page: Page): Promise<void> {
    await smoothMoveToLocator(page, activeModuleLayout(page).locator("canvas").first());
}
