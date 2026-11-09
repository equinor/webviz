import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

import {
    RECORDING,
    activeModuleLayout,
    createSessionAndSelectEnsemble,
    dragModuleOntoLayout,
    pace,
    smoothClick,
    smoothMoveToLocator,
    smoothType,
} from "./walkthroughHelpers";

/**
 * Helpers for stories driving the 2D Viewer's layer tree (the data provider framework, "DPF").
 *
 * The DPF components expose stable hooks for tests:
 *  - `data-dpf-item` ("provider" | "group" | "shared-setting" | ...) and `data-dpf-type` (the data
 *    provider type, group type or wrapped setting type) on every item in the layer tree.
 *  - `data-dpf-setting` (the `Setting` enum value, e.g. "surfaceName") on each setting's value cell.
 */

export const TWO_D_VIEWER = "2D Viewer";

/** A data provider (layer) in the settings panel, e.g. `"DEPTH_SURFACE"`. */
export function dpfLayer(scope: Page | Locator, providerType: string): Locator {
    return scope.locator(`[data-dpf-item="provider"][data-dpf-type="${providerType}"]`);
}

/** The `index`-th view group in the layer tree. */
export function dpfView(page: Page, index: number): Locator {
    return page.locator(`[data-dpf-item="group"][data-dpf-type="VIEW"]`).nth(index);
}

/** A shared setting item, identified by the setting it wraps (e.g. `"surfaceName"`). */
export function dpfSharedSetting(page: Page, settingType: string): Locator {
    return page.locator(`[data-dpf-item="shared-setting"][data-dpf-type="${settingType}"]`).first();
}

/** The value cell of a setting inside `scope` (a layer, a shared setting or a view). */
export function dpfSetting(scope: Locator, settingType: string): Locator {
    return scope.locator(`[data-dpf-setting="${settingType}"]`).first();
}

/** The "Add" menu button at the top of the layer tree. */
export function topLevelAddButton(page: Page): Locator {
    return page.getByRole("button", { name: "Add" }).first();
}

/** The "Add" menu button in a view group's header. */
export function viewAddButton(page: Page, viewIndex: number): Locator {
    return dpfView(page, viewIndex).getByRole("button", { name: "Add" }).first();
}

/** Open an "Add" menu and walk the given menu path, e.g. `["Layers", "Surfaces", "Depth"]`. */
export async function addFromMenu(page: Page, addButton: Locator, menuPath: string[]): Promise<void> {
    await smoothClick(page, addButton);
    let parentItem: Locator | null = null;
    for (const label of menuPath) {
        const item = page.getByRole("menuitem", { name: label, exact: true });
        if (parentItem && RECORDING) {
            await enterSubmenuHorizontally(page, parentItem, item);
        }
        await smoothClick(page, item);
        parentItem = item;
    }
}

/**
 * Move the pointer straight sideways from a parent menu item into its open submenu. A diagonal glide
 * from the parent to an item further down the submenu would cross the parent's siblings, and hovering
 * a sibling closes the submenu before the target can be clicked.
 */
async function enterSubmenuHorizontally(page: Page, parentItem: Locator, submenuItem: Locator): Promise<void> {
    await submenuItem.waitFor({ state: "visible" });
    const parentBox = await parentItem.boundingBox();
    const itemBox = await submenuItem.boundingBox();
    if (!parentBox || !itemBox) {
        return;
    }
    await page.mouse.move(itemBox.x + 12, parentBox.y + parentBox.height / 2, { steps: 10 });
}

function comboboxOption(page: Page, optionLabel: string): Locator {
    // Matched on the label element, since some options also carry a description.
    return page.getByRole("option").filter({ has: page.getByText(optionLabel, { exact: true }) });
}

/** Pick `optionLabel` in the dropdown of a setting inside `scope`. */
export async function selectSettingOption(
    page: Page,
    scope: Locator,
    settingType: string,
    optionLabel: string,
): Promise<void> {
    const combobox = dpfSetting(scope, settingType).getByRole("combobox");
    await smoothClick(page, combobox);
    await smoothClick(page, comboboxOption(page, optionLabel));
    await expect(combobox).toHaveValue(optionLabel);
}

/** Step a setting's dropdown to its next option with the browse arrow next to it. */
export async function browseSettingToNextOption(page: Page, scope: Locator, settingType: string): Promise<void> {
    await smoothClick(page, dpfSetting(scope, settingType).getByTitle("Next option"));
}

/** Rename a view (or any item with an editable name) by double-clicking its name in the header. */
export async function renameView(page: Page, view: Locator, newName: string): Promise<void> {
    const header = view.locator(".sortable-list-item-header").first();
    const currentName = header.getByText("View", { exact: true });
    await smoothClick(page, currentName, { clickCount: 2 });
    const input = header.locator('input[type="text"]');
    await smoothType(page, input, newName);
    await input.press("Enter");
    await expect(header.getByText(newName, { exact: true })).toBeVisible();
}

/** Collapse a view group's children in the layer tree. */
export async function collapseView(page: Page, view: Locator): Promise<void> {
    await smoothClick(page, view.locator(".sortable-list-item-header").first().getByTitle("Hide children"));
}

/** Collapse a layer's or shared setting's settings in the layer tree. */
export async function collapseItem(page: Page, item: Locator): Promise<void> {
    await smoothClick(page, item.locator('button:has(svg[data-testid="ExpandLessIcon"])').first());
}

export type ColorScaleOptions = {
    palette?: string;
    gradient?: "Sequential" | "Diverging";
    range?: { min: number; max: number; mid?: number };
};

/** Open the color scale dialog of a setting and apply the given options. */
export async function editColorScale(
    page: Page,
    scope: Locator,
    settingType: string,
    options: ColorScaleOptions,
): Promise<void> {
    // The value cell holds just the clickable color scale preview.
    await smoothClick(page, dpfSetting(scope, settingType));
    const dialog = page.getByRole("dialog", { name: "Color Scale Selector" });
    await expect(dialog).toBeVisible();
    await pace(page);

    if (options.gradient) {
        await smoothClick(page, dialog.getByText(options.gradient, { exact: true }));
    }
    if (options.palette) {
        await smoothClick(page, dialog.getByRole("combobox", { name: "Color Palette" }));
        await smoothClick(page, comboboxOption(page, options.palette));
    }
    if (options.range) {
        const customize = dialog.getByRole("switch", { name: "Customize range" });
        if (!(await customize.isChecked())) {
            await smoothClick(page, customize);
        }
        // Set min, mid, max in that order so each value stays valid against the others.
        await typeColorScaleNumber(page, dialog, "Min", options.range.min);
        if (options.range.mid !== undefined) {
            await typeColorScaleNumber(page, dialog, "Mid point", options.range.mid);
        }
        await typeColorScaleNumber(page, dialog, "Max", options.range.max);
    }
    await pace(page);
    await smoothClick(page, dialog.getByRole("button", { name: "Apply" }));
    await expect(dialog).toBeHidden();
}

/**
 * Type into one of the color scale dialog's number inputs. `fill` does not replace the value of these
 * controlled inputs, so the current value is selected and typed over, then committed with Tab.
 */
async function typeColorScaleNumber(page: Page, dialog: Locator, label: string, value: number): Promise<void> {
    const input = dialog.getByRole("group", { name: label }).getByRole("textbox");
    await smoothClick(page, input);
    await input.press("ControlOrMeta+a");
    await input.pressSequentially(String(value), { delay: RECORDING ? 60 : 0 });
    await input.press("Tab");
    await expect(input).toHaveValue(String(value));
}

/** Wait until every layer has finished loading and the viewer has painted. */
export async function waitForViewer(page: Page): Promise<void> {
    const layout = activeModuleLayout(page);
    await expect(layout.getByRole("progressbar")).toHaveCount(0, { timeout: 120_000 });
    await expect(page.getByText(/Sumo task status/)).toHaveCount(0, { timeout: 120_000 });
    await expect(layout.locator("canvas").first()).toBeVisible({ timeout: 30_000 });
    // Give WebGL a moment to paint after the data arrives.
    await page.waitForTimeout(RECORDING ? 1500 : 500);
}

/**
 * Stop pointer/mouse move events from reaching deck.gl maps while recording.
 *
 * Every pointer move over a deck.gl map triggers a hover pick, which takes seconds per event in
 * headless (software WebGL) Chromium. A cursor glide across the map then stalls for a minute or more,
 * both slowing the run and freezing the recorded video. The fake cursor listens with window capture
 * listeners registered earlier, so it still follows the pointer; only the map's hover readout is lost.
 *
 * No-op unless RECORD=1. Must be called AFTER `installFakeCursor` and BEFORE `page.goto(...)`.
 */
export async function suppressMapHover(page: Page): Promise<void> {
    if (!RECORDING) {
        return;
    }
    await page.addInitScript(() => {
        // deck.gl listens on its `.deck-events-root` element, which holds the per-view event targets.
        const stopOnMap = (event: Event) => {
            if (event.target instanceof Element && event.target.closest(".deck-events-root")) {
                event.stopPropagation();
            }
        };
        for (const type of ["pointermove", "mousemove", "pointerover", "mouseover"]) {
            window.addEventListener(type, stopOnMap, { capture: true });
        }
    });
}

/**
 * Shared, un-narrated setup: create a session with the Drogon ensemble, drop a 2D Viewer onto the
 * dashboard and close the modules list to give the viewer room.
 */
export async function setupTwoDViewer(page: Page): Promise<void> {
    await createSessionAndSelectEnsemble(page);
    await dragModuleOntoLayout(page, TWO_D_VIEWER);
    const modulesListButton = page.getByTestId("modules-list-open-button");
    if (await page.getByPlaceholder("Search modules...").isVisible()) {
        await smoothClick(page, modulesListButton);
    }
    await expect(page.getByRole("button", { name: "Add first view" })).toBeVisible();
}

/** Glide the cursor over the map so viewers' attention is drawn to the result. */
export async function pointAtViewer(page: Page): Promise<void> {
    await smoothMoveToLocator(page, activeModuleLayout(page).locator("canvas").first());
}
