import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { RECORDING, activeModuleLayout, pace, smoothClick, smoothMoveTo, smoothType } from "./walkthroughHelpers";

/**
 * Helpers for stories driving the layer tree of modules built on the data provider framework (DPF),
 * e.g. the 2D Viewer, 3D Viewer, Intersection and Well log viewer.
 *
 * They rely on stable attributes rendered by the DPF components, so stories don't depend on display
 * names users can edit:
 *  - `data-dpf-manager` on the layer panel root.
 *  - `data-dpf-item` ("provider" | "group" | "shared-setting" | "context-boundary" | "delta-surface") and
 *    `data-dpf-type` (data provider type, group type or wrapped setting type) on each item.
 *  - `data-dpf-header` on the panel's and each item's header row, `data-dpf-name` on editable names.
 *  - `data-dpf-setting` (the `Setting` enum value) on each setting's value cell.
 *
 * Unless a scope is given, locators search the visible layer panel, which assumes the settings of a
 * single DPF module are shown (the selected module's settings).
 */

type Scope = Page | Locator;

/** The visible DPF layer panel. */
export function dpfPanel(page: Page): Locator {
    return page.locator("[data-dpf-manager]").filter({ visible: true }).first();
}

function resolveScope(scope: Scope): Locator {
    return "goto" in scope ? dpfPanel(scope) : scope;
}

/** The header row of an item (or of the panel itself), excluding any descendant items' headers. */
export function dpfHeader(itemOrPanel: Locator): Locator {
    return itemOrPanel.locator("[data-dpf-header]").first();
}

/** All data providers (layers) of a type, e.g. `"DEPTH_SURFACE"`. */
export function dpfLayers(scope: Scope, providerType: string): Locator {
    return resolveScope(scope).locator(`[data-dpf-item="provider"][data-dpf-type="${providerType}"]`);
}

/** The first data provider (layer) of a type within `scope`. */
export function dpfLayer(scope: Scope, providerType: string): Locator {
    return dpfLayers(scope, providerType).first();
}

/** The `index`-th group of a type, e.g. `"VIEW"`, `"INTERSECTION_VIEW"` or `"WELL_LOG_TRACK_CONTINUOUS"`. */
export function dpfGroup(scope: Scope, groupType: string, index = 0): Locator {
    return resolveScope(scope).locator(`[data-dpf-item="group"][data-dpf-type="${groupType}"]`).nth(index);
}

/** A shared setting item, identified by the setting it wraps (e.g. `"surfaceName"`). */
export function dpfSharedSetting(scope: Scope, settingType: string): Locator {
    return resolveScope(scope).locator(`[data-dpf-item="shared-setting"][data-dpf-type="${settingType}"]`).first();
}

/** The value cell of a setting inside `item` (a layer, a shared setting or a group). */
export function dpfSetting(item: Locator, settingType: string): Locator {
    return item.locator(`[data-dpf-setting="${settingType}"]`).first();
}

/** The "Add" menu button of the panel (top level) or of a group. */
export function dpfAddButton(panelOrGroup: Locator): Locator {
    return dpfHeader(panelOrGroup).getByRole("button", { name: "Add" });
}

/**
 * Open an "Add" menu and walk the given menu path, e.g. `["Layers", "Surfaces", "Depth"]`.
 *
 * When recording, the cursor moves sideways from each parent item into its submenu before heading
 * for the next item: a diagonal glide would cross the parent's siblings, and hovering a sibling
 * closes the submenu before the target can be clicked.
 */
export async function addFromMenu(page: Page, addButton: Locator, menuPath: string[]): Promise<void> {
    await smoothClick(page, addButton);
    let parentItem: Locator | null = null;
    for (const label of menuPath) {
        const item = page.getByRole("menuitem", { name: label, exact: true });
        if (parentItem && RECORDING) {
            await item.waitFor({ state: "visible" });
            const parentBox = await parentItem.boundingBox();
            const itemBox = await item.boundingBox();
            if (parentBox && itemBox) {
                await smoothMoveTo(page, itemBox.x + 12, parentBox.y + parentBox.height / 2);
            }
        }
        await smoothClick(page, item);
        parentItem = item;
    }
}

function comboboxOption(page: Page, optionLabel: string): Locator {
    // Matched on the label element, since some options also carry a description.
    return page.getByRole("option").filter({ has: page.getByText(optionLabel, { exact: true }) });
}

/** Pick `optionLabel` in the dropdown of a setting inside `item`. */
export async function selectSettingOption(
    page: Page,
    item: Locator,
    settingType: string,
    optionLabel: string,
): Promise<void> {
    const combobox = dpfSetting(item, settingType).getByRole("combobox");
    await smoothClick(page, combobox);
    await smoothClick(page, comboboxOption(page, optionLabel));
    await expect(combobox).toHaveValue(optionLabel);
}

/** Step a setting's dropdown to its next (or previous) option with the browse arrows next to it. */
export async function browseSettingOption(
    page: Page,
    item: Locator,
    settingType: string,
    direction: "next" | "previous" = "next",
): Promise<void> {
    const title = direction === "next" ? "Next option" : "Previous option";
    await smoothClick(page, dpfSetting(item, settingType).getByTitle(title));
}

/** Rename an item (layer, group, ...) by double-clicking its name in the header. */
export async function renameItem(page: Page, item: Locator, newName: string): Promise<void> {
    const name = dpfHeader(item).locator("[data-dpf-name]");
    await smoothClick(page, name, { clickCount: 2 });
    const input = name.locator('input[type="text"]');
    await smoothType(page, input, newName);
    await input.press("Enter");
    await expect(name.getByText(newName, { exact: true })).toBeVisible();
}

/** Expand or collapse an item: a group's children, or a layer's/shared setting's settings. */
export async function setItemExpanded(page: Page, item: Locator, expanded: boolean): Promise<void> {
    const toggleName = expanded ? /^Show (children|settings)$/ : /^Hide (children|settings)$/;
    await smoothClick(page, dpfHeader(item).getByRole("button", { name: toggleName }));
}

export type ColorScaleOptions = {
    palette?: string;
    gradient?: "Sequential" | "Diverging";
    range?: { min: number; max: number; mid?: number };
};

/** Open the color scale dialog of a setting and apply the given options. */
export async function editColorScale(
    page: Page,
    item: Locator,
    settingType: string,
    options: ColorScaleOptions,
): Promise<void> {
    // The value cell holds just the clickable color scale preview.
    await smoothClick(page, dpfSetting(item, settingType));
    const dialog = page.getByRole("dialog", { name: "Color Scale Selector" });
    await expect(dialog).toBeVisible();

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
    await pace(page, "short");
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
    await input.pressSequentially(String(value), { delay: RECORDING ? 45 : 0 });
    await input.press("Tab");
    await expect(input).toHaveValue(String(value));
}

/** Wait until the active dashboard's modules have finished loading their data. */
export async function waitForDpfData(page: Page): Promise<void> {
    await expect(activeModuleLayout(page).getByRole("progressbar")).toHaveCount(0, { timeout: 120_000 });
    await expect(page.getByText(/Sumo task status/)).toHaveCount(0, { timeout: 120_000 });
}
