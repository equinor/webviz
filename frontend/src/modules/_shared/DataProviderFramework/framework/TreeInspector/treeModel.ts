import type { GroupDelegate } from "../../delegates/GroupDelegate";
import { GroupType } from "../../groups/groupTypes";
import type { Item, ItemGroup } from "../../interfacesAndTypes/entities";
import { instanceofItemGroup } from "../../interfacesAndTypes/entities";
import { isDataProvider } from "../DataProvider/DataProvider";
import type { DataProviderManager } from "../DataProviderManager/DataProviderManager";
import { isGroup } from "../Group/Group";
import type { SettingManager } from "../SettingManager/SettingManager";
import { isSharedSetting } from "../SharedSetting/SharedSetting";

export const ROW_HEIGHT_PX = 28;
export const LANE_WIDTH_PX = 10;
export const GUTTER_PADDING_PX = 6;

const RAIL_COLORS = ["#0d9488", "#d97706", "#7c3aed", "#db2777", "#2563eb", "#65a30d"];

export enum SectionId {
    GLOBAL = "global",
    ON_TOP = "onTop",
    VIEWS = "views",
    BENEATH = "beneath",
}

const SECTION_LABELS: Record<SectionId, string> = {
    [SectionId.GLOBAL]: "Global settings",
    [SectionId.ON_TOP]: "On top of all views",
    [SectionId.VIEWS]: "Views",
    [SectionId.BENEATH]: "Beneath all views",
};

const SECTION_ORDER = [SectionId.GLOBAL, SectionId.ON_TOP, SectionId.VIEWS, SectionId.BENEATH];

/** Where a new or dropped item lands: `index` is a position in `group`'s current children. */
export type InsertTarget = {
    group: ItemGroup;
    index: number;
    sectionId: SectionId | null;
};

/** One entry per nesting level: an ancestor's continuing line, nothing, or the row's own ├ / └ connector */
export type Guide = "none" | "line" | "mid" | "last";

export type ItemRow = {
    type: "item";
    key: string;
    item: Item;
    depth: number;
    guides: Guide[];
    sectionId: SectionId | null;
    isContainer: boolean;
    isExpanded: boolean;
    /** Index of the last row belonging to this container (its add row) - only for expanded containers */
    contentEndRowIndex: number | null;
};

export type SectionRow = {
    type: "section";
    key: string;
    sectionId: SectionId;
    label: string;
    depth: number;
    /** Dropping on a section header lands at the first position in that section */
    firstPositionTarget: InsertTarget;
};

export type AddRow = {
    type: "add";
    key: string;
    depth: number;
    guides: Guide[];
    target: InsertTarget;
    containerLabel: string;
};

export type TreeRow = ItemRow | SectionRow | AddRow;

export function isView(item: Item): boolean {
    return isGroup(item) && item.getGroupType() === GroupType.VIEW;
}

/** Items that make other items' settings controlled: shared settings and groups with their own settings. */
export function isSource(item: Item): boolean {
    return isSharedSetting(item) || (isGroup(item) && item.getSharedSettingsDelegate() !== null);
}

export function isSelectable(item: Item): boolean {
    return isDataProvider(item) || isSource(item);
}

export function getItemSettings(item: Item): SettingManager<any>[] {
    if (isDataProvider(item)) {
        return Object.values(item.getSettingsContextDelegate().getSettings());
    }
    if (isSharedSetting(item)) {
        return [item.getWrappedSetting()];
    }
    if (isGroup(item) && item.getSharedSettingsDelegate()) {
        return Object.values(item.getWrappedSettings());
    }
    return [];
}

export function getItemId(item: Item): string {
    return item.getItemDelegate().getId();
}

export function getRailColor(sourceId: string): string {
    let hash = 0;
    for (let i = 0; i < sourceId.length; i++) {
        hash = (hash * 31 + sourceId.charCodeAt(i)) | 0;
    }
    return RAIL_COLORS[Math.abs(hash) % RAIL_COLORS.length];
}

/** The owning item of a group delegate - the manager for its root delegate. */
export function getGroupOwner(groupDelegate: GroupDelegate, manager: DataProviderManager): ItemGroup | null {
    if (groupDelegate === manager.getGroupDelegate()) {
        return manager;
    }
    const owner = groupDelegate.getAncestors(() => true)[0];
    return owner && instanceofItemGroup(owner) ? owner : null;
}

type RootPartition = {
    sectionOf: Map<Item, SectionId>;
    firstPositionIndex: Record<SectionId, number>;
    addIndex: Record<SectionId, number>;
};

/*
 * Root items are sorted into sections by position: shared settings are global, items before the first view are drawn
 * on top of all views and the remaining non-view items beneath them. Interleaving providers between views is not
 * represented - those end up in "Beneath all views".
 */
function partitionRoot(children: readonly Item[]): RootPartition {
    const sectionOf = new Map<Item, SectionId>();
    const firstViewIndex = children.findIndex(isView);
    let lastViewIndex = -1;
    let numShared = 0;

    children.forEach((child, index) => {
        if (isSharedSetting(child)) {
            sectionOf.set(child, SectionId.GLOBAL);
            numShared++;
        } else if (isView(child)) {
            sectionOf.set(child, SectionId.VIEWS);
            lastViewIndex = index;
        } else if (firstViewIndex === -1 || index < firstViewIndex) {
            sectionOf.set(child, SectionId.ON_TOP);
        } else {
            sectionOf.set(child, SectionId.BENEATH);
        }
    });

    const viewsStart = firstViewIndex === -1 ? children.length : firstViewIndex;
    const viewsEnd = lastViewIndex === -1 ? children.length : lastViewIndex + 1;

    return {
        sectionOf,
        firstPositionIndex: {
            [SectionId.GLOBAL]: 0,
            [SectionId.ON_TOP]: numShared,
            [SectionId.VIEWS]: viewsStart,
            [SectionId.BENEATH]: viewsEnd,
        },
        addIndex: {
            [SectionId.GLOBAL]: numShared,
            [SectionId.ON_TOP]: viewsStart,
            [SectionId.VIEWS]: viewsEnd,
            [SectionId.BENEATH]: children.length,
        },
    };
}

export function flattenTree(manager: DataProviderManager): TreeRow[] {
    const rows: TreeRow[] = [];

    function makeGuides(ancestorContinues: boolean[], isLast: boolean, depth: number): Guide[] {
        if (depth === 0) {
            return [];
        }
        return [...ancestorContinues.map((continues): Guide => (continues ? "line" : "none")), isLast ? "last" : "mid"];
    }

    /*
     * `ancestorContinues` has one entry per level above the item's own (excluding the root): whether that ancestor has
     * rows below it, so its branch line passes this row. Every container ends with its add row, so real children are
     * never the last row of their container.
     */
    function walk(
        item: Item,
        depth: number,
        sectionId: SectionId | null,
        ancestorContinues: boolean[],
        isLast: boolean,
    ) {
        const isContainer = instanceofItemGroup(item);
        const isExpanded = isContainer && item.getItemDelegate().isExpanded();
        const row: ItemRow = {
            type: "item",
            key: getItemId(item),
            item,
            depth,
            guides: makeGuides(ancestorContinues, isLast, depth),
            sectionId,
            isContainer,
            isExpanded,
            contentEndRowIndex: null,
        };
        rows.push(row);

        if (!isContainer || !isExpanded) {
            return;
        }

        const childAncestorContinues = depth === 0 ? [] : [...ancestorContinues, !isLast];
        const children = item.getGroupDelegate().getChildren();
        for (const child of children) {
            walk(child, depth + 1, sectionId, childAncestorContinues, false);
        }
        rows.push({
            type: "add",
            key: `add-${getItemId(item)}`,
            depth: depth + 1,
            guides: makeGuides(childAncestorContinues, true, depth + 1),
            target: { group: item, index: children.length, sectionId: null },
            containerLabel: item.getItemDelegate().getName(),
        });
        row.contentEndRowIndex = rows.length - 1;
    }

    const rootChildren = manager.getGroupDelegate().getChildren();
    const partition = partitionRoot(rootChildren);

    for (const sectionId of SECTION_ORDER) {
        rows.push({
            type: "section",
            key: `section-${sectionId}`,
            sectionId,
            label: SECTION_LABELS[sectionId],
            depth: 0,
            firstPositionTarget: { group: manager, index: partition.firstPositionIndex[sectionId], sectionId },
        });
        for (const child of rootChildren) {
            if (partition.sectionOf.get(child) === sectionId) {
                walk(child, 0, sectionId, [], false);
            }
        }
        rows.push({
            type: "add",
            key: `add-section-${sectionId}`,
            depth: 0,
            guides: [],
            target: { group: manager, index: partition.addIndex[sectionId], sectionId },
            containerLabel: SECTION_LABELS[sectionId],
        });
    }

    return rows;
}

export type Relations = {
    /** setting id -> item whose controller controls it */
    controllerBySettingId: Map<string, Item>;
    /** source item id -> ids of items with settings it controls */
    controlledItemIdsBySourceId: Map<string, Set<string>>;
    /** item id -> ids of source items controlling its settings */
    sourceIdsByItemId: Map<string, Set<string>>;
    itemsById: Map<string, Item>;
};

export function computeRelations(manager: DataProviderManager): Relations {
    const relations: Relations = {
        controllerBySettingId: new Map(),
        controlledItemIdsBySourceId: new Map(),
        sourceIdsByItemId: new Map(),
        itemsById: new Map(),
    };

    const items = manager.getGroupDelegate().getDescendantItems(() => true);
    for (const item of items) {
        const itemId = getItemId(item);
        relations.itemsById.set(itemId, item);
        for (const setting of getItemSettings(item)) {
            const controller = setting.getExternalControllerItem();
            if (!controller) {
                continue;
            }
            const sourceId = getItemId(controller);
            relations.controllerBySettingId.set(setting.getId(), controller);

            const controlled = relations.controlledItemIdsBySourceId.get(sourceId) ?? new Set();
            controlled.add(itemId);
            relations.controlledItemIdsBySourceId.set(sourceId, controlled);

            const sources = relations.sourceIdsByItemId.get(itemId) ?? new Set();
            sources.add(sourceId);
            relations.sourceIdsByItemId.set(itemId, sources);
        }
    }

    return relations;
}

export type Rail = {
    sourceId: string;
    color: string;
    lane: number;
    sourceRowIndex: number;
    startRowIndex: number;
    endRowIndex: number;
    stopRowIndices: number[];
};

export type RailLayout = {
    rails: Rail[];
    numLanes: number;
    railsBySourceId: Map<string, Rail>;
};

/** Row index of the item, or of its nearest visible ancestor when it is inside a collapsed container. */
function findVisibleRowIndex(item: Item, rowIndexByItemId: Map<string, number>): number | null {
    const own = rowIndexByItemId.get(getItemId(item));
    if (own !== undefined) {
        return own;
    }
    const parent = item.getItemDelegate().getParentGroup();
    if (!parent) {
        return null;
    }
    for (const ancestor of parent.getAncestors(() => true)) {
        const index = rowIndexByItemId.get(getItemId(ancestor));
        if (index !== undefined) {
            return index;
        }
    }
    return null;
}

export function layoutRails(rows: TreeRow[], relations: Relations): RailLayout {
    const rowIndexByItemId = new Map<string, number>();
    rows.forEach((row, index) => {
        if (row.type === "item") {
            rowIndexByItemId.set(row.key, index);
        }
    });

    const rails: Rail[] = [];
    for (const [sourceId, controlledIds] of relations.controlledItemIdsBySourceId) {
        const source = relations.itemsById.get(sourceId);
        if (!source) {
            continue;
        }
        const sourceRowIndex = findVisibleRowIndex(source, rowIndexByItemId);
        if (sourceRowIndex === null) {
            continue;
        }

        const stops = new Set<number>();
        for (const controlledId of controlledIds) {
            const item = relations.itemsById.get(controlledId);
            if (!item) {
                continue;
            }
            const index = findVisibleRowIndex(item, rowIndexByItemId);
            if (index !== null && index !== sourceRowIndex) {
                stops.add(index);
            }
        }
        if (stops.size === 0) {
            continue;
        }

        const stopRowIndices = [...stops].sort((a, b) => a - b);
        rails.push({
            sourceId,
            color: getRailColor(sourceId),
            lane: 0,
            sourceRowIndex,
            startRowIndex: Math.min(sourceRowIndex, stopRowIndices[0]),
            endRowIndex: Math.max(sourceRowIndex, stopRowIndices[stopRowIndices.length - 1]),
            stopRowIndices,
        });
    }

    // Greedy interval colouring: each rail takes the first lane that is free over its whole extent
    rails.sort((a, b) => a.startRowIndex - b.startRowIndex);
    const laneEnds: number[] = [];
    for (const rail of rails) {
        let lane = laneEnds.findIndex((end) => end < rail.startRowIndex);
        if (lane === -1) {
            lane = laneEnds.length;
            laneEnds.push(rail.endRowIndex);
        } else {
            laneEnds[lane] = rail.endRowIndex;
        }
        rail.lane = lane;
    }

    const railsBySourceId = new Map<string, Rail>();
    for (const rail of rails) {
        railsBySourceId.set(rail.sourceId, rail);
    }

    return { rails, numLanes: laneEnds.length, railsBySourceId };
}

export function getGutterWidth(numLanes: number): number {
    if (numLanes === 0) {
        return GUTTER_PADDING_PX;
    }
    return GUTTER_PADDING_PX * 2 + numLanes * LANE_WIDTH_PX;
}

export function getLaneStartX(lane: number): number {
    return GUTTER_PADDING_PX + lane * LANE_WIDTH_PX;
}

/** Horizontal position of a lane's rail line - the centre of the lane. */
export function getRailX(lane: number): number {
    return getLaneStartX(lane) + LANE_WIDTH_PX / 2;
}
