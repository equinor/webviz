import type { Item, ItemGroup } from "../../interfacesAndTypes/entities";
import { instanceofItemGroup } from "../../interfacesAndTypes/entities";
import { isContextBoundary } from "../ContextBoundary/ContextBoundary";
import { isSharedSetting } from "../SharedSetting/SharedSetting";

import type { InsertTarget, TreeInspectorLayout } from "./treeModel";
import { SectionId, isView, isViewHolder, isViewOrInsideView, resolveShownSection } from "./treeModel";

export type IsMoveAllowed = (movedItem: Item, destinationGroup: ItemGroup) => boolean;

function isAncestorOrSelf(candidate: Item, group: ItemGroup): boolean {
    if (candidate === group) {
        return true;
    }
    const parent = group.getItemDelegate().getParentGroup();
    if (!parent) {
        return false;
    }
    return parent.getAncestors((ancestor) => ancestor === candidate).length > 0;
}

function belongsInSection(item: Item, sectionId: SectionId, layout: TreeInspectorLayout): boolean {
    if (sectionId === SectionId.GLOBAL) {
        return isSharedSetting(item);
    }
    if (sectionId === SectionId.VIEWS) {
        return isView(item, layout) || isContextBoundary(item);
    }
    return !isSharedSetting(item) && !isViewHolder(item, layout);
}

/** Also accepts items whose own section is hidden and shown in `sectionId` instead. */
function isAllowedInSection(item: Item, sectionId: SectionId, layout: TreeInspectorLayout): boolean {
    return Object.values(SectionId).some(
        (ownSectionId) =>
            resolveShownSection(ownSectionId, layout) === sectionId && belongsInSection(item, ownSectionId, layout),
    );
}

/** Views (also inside a moved context boundary) can go to the root, or into a context boundary that isn't in a view. */
function canHoldViews(destination: ItemGroup, isRoot: boolean, layout: TreeInspectorLayout): boolean {
    return isRoot || (isContextBoundary(destination) && !isViewOrInsideView(destination, layout));
}

/** Index in `target.group`'s children once all moved items have been taken out of it. */
function getIndexWithoutMovedItems(target: InsertTarget, movedItems: Item[]): number {
    const children = target.group.getGroupDelegate().getChildren();
    return target.index - children.slice(0, target.index).filter((child) => movedItems.includes(child)).length;
}

/*
 * Mirrors the rules of the classic DataProviderManagerComponent (shared settings always come first in a group, no views
 * in views, plus the module's own isMoveAllowed), extended with the root sections.
 */
export function isMoveValid(
    movedItems: Item[],
    target: InsertTarget,
    layout: TreeInspectorLayout,
    isMoveAllowed?: IsMoveAllowed,
): boolean {
    if (movedItems.length === 0) {
        return false;
    }

    const destination = target.group;
    const isRoot = target.sectionId !== null;
    const remainingChildren = destination
        .getGroupDelegate()
        .getChildren()
        .filter((child) => !movedItems.includes(child));
    const index = getIndexWithoutMovedItems(target, movedItems);
    const numSharedSettings = remainingChildren.filter(isSharedSetting).length;

    for (const item of movedItems) {
        if (instanceofItemGroup(item) && isAncestorOrSelf(item, destination)) {
            return false;
        }
        if (isRoot && target.sectionId !== null && !isAllowedInSection(item, target.sectionId, layout)) {
            return false;
        }
        if (isViewHolder(item, layout) && !canHoldViews(destination, isRoot, layout)) {
            return false;
        }
        if (isMoveAllowed && !isMoveAllowed(item, destination)) {
            return false;
        }
        if (isSharedSetting(item) && index > numSharedSettings) {
            return false;
        }
        if (!isSharedSetting(item) && index < numSharedSettings) {
            return false;
        }
    }

    return true;
}

/** Moves the items, keeping their given order, so they end up next to each other at the target position. */
export function moveItems(movedItems: Item[], target: InsertTarget): void {
    const destination = target.group.getGroupDelegate();
    const index = getIndexWithoutMovedItems(target, movedItems);

    for (const item of movedItems) {
        item.getItemDelegate().getParentGroup()?.removeChild(item);
    }
    movedItems.forEach((item, offset) => {
        destination.insertChild(item, index + offset);
    });

    target.group.getItemDelegate().setExpanded(true);
}

/** Clamps an insertion index so shared settings stay before all other items of the group. */
export function clampInsertIndex(item: Item, group: ItemGroup, index: number): number {
    const others = group
        .getGroupDelegate()
        .getChildren()
        .filter((child) => child !== item);
    const numSharedSettings = others.filter(isSharedSetting).length;
    const clamped = Math.min(Math.max(index, 0), others.length);
    if (isSharedSetting(item)) {
        return Math.min(clamped, numSharedSettings);
    }
    return Math.max(clamped, numSharedSettings);
}
