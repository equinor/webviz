import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { DataProviderManager } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { isMoveValid } from "@modules/_shared/DataProviderFramework/framework/TreeInspector/moveRules";
import type { TreeInspectorLayout } from "@modules/_shared/DataProviderFramework/framework/TreeInspector/treeModel";
import {
    DEFAULT_TREE_INSPECTOR_LAYOUT,
    RailColorAllocator,
    SectionId,
    flattenTree,
} from "@modules/_shared/DataProviderFramework/framework/TreeInspector/treeModel";
import { GroupType } from "@modules/_shared/DataProviderFramework/groups/groupTypes";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

import {
    boundary,
    findItem,
    makeDataProviderManager,
    managerState,
    resetTestBackend,
    settle,
    sharedSetting,
    surfaceProvider,
    view,
} from "../../utils/dataProviderFramework";

beforeEach(() => {
    vi.useFakeTimers();
    const backend = resetTestBackend();
    backend.catalogues["field-a"] = { depth: { "Top reservoir": [1] } };
});

afterEach(() => {
    vi.useRealTimers();
});

async function restore(...items: Parameters<typeof managerState>[0]) {
    const manager = makeDataProviderManager({ fieldId: "field-a" });
    manager.deserializeState(managerState(items));
    await settle(manager);
    return manager;
}

/** Root item names per section, in tree order */
function sectionsOf(manager: DataProviderManager, layout = DEFAULT_TREE_INSPECTOR_LAYOUT): Record<SectionId, string[]> {
    const result: Record<SectionId, string[]> = {
        [SectionId.GLOBAL]: [],
        [SectionId.ON_TOP]: [],
        [SectionId.VIEWS]: [],
        [SectionId.BENEATH]: [],
    };
    for (const row of flattenTree(manager, layout)) {
        if (row.type === "item" && row.depth === 0 && row.sectionId) {
            result[row.sectionId].push(row.item.getItemDelegate().getName());
        }
    }
    return result;
}

function addTargetIndexOf(manager: DataProviderManager, sectionId: SectionId): number {
    const row = flattenTree(manager, DEFAULT_TREE_INSPECTOR_LAYOUT).find(
        (r) => r.type === "add" && r.depth === 0 && r.target.sectionId === sectionId,
    );
    if (row?.type !== "add") {
        throw new Error("Add row not found");
    }
    return row.target.index;
}

describe("Tree inspector root sections", () => {
    test("context boundaries holding views, between views or right after them (empty) are listed under Views", async () => {
        const manager = await restore(
            sharedSetting("Shared", Setting.ENSEMBLE),
            surfaceProvider("On top"),
            boundary("Boundary with view", [view("Inner view", [])]),
            boundary("Boundary between", [surfaceProvider("In between")]),
            view("View", []),
            boundary("Empty boundary", []),
            boundary("Boundary with provider", [surfaceProvider("Below")]),
        );

        expect(sectionsOf(manager)).toEqual({
            [SectionId.GLOBAL]: ["Shared"],
            [SectionId.ON_TOP]: ["On top"],
            [SectionId.VIEWS]: ["Boundary with view", "Boundary between", "View", "Empty boundary"],
            [SectionId.BENEATH]: ["Boundary with provider"],
        });
        // Views' add button appends after the section's last item
        expect(addTargetIndexOf(manager, SectionId.VIEWS)).toBe(6);
    });

    test("without views, trailing empty boundaries are listed under Views, everything else on top", async () => {
        const manager = await restore(surfaceProvider("Provider"), boundary("Empty boundary", []));

        expect(sectionsOf(manager)[SectionId.ON_TOP]).toEqual(["Provider"]);
        expect(sectionsOf(manager)[SectionId.VIEWS]).toEqual(["Empty boundary"]);
    });

    test("a custom layout shows its sections under its labels, items of hidden sections in a shown one", async () => {
        const layout: TreeInspectorLayout = {
            viewGroupTypes: [GroupType.VIEW],
            viewActionIdentifiers: ["view"],
            sections: [SectionId.VIEWS, SectionId.BENEATH],
            sectionLabels: { [SectionId.VIEWS]: "Tracks", [SectionId.BENEATH]: "Overlays" },
        };
        const manager = await restore(surfaceProvider("Before"), view("Track", []), surfaceProvider("After"));

        const sectionRows = flattenTree(manager, layout).filter((row) => row.type === "section");
        expect(sectionRows.map((row) => row.label)).toEqual(["Tracks", "Overlays"]);
        expect(sectionsOf(manager, layout)).toEqual({
            [SectionId.GLOBAL]: [],
            [SectionId.ON_TOP]: [],
            [SectionId.VIEWS]: ["Track"],
            [SectionId.BENEATH]: ["Before", "After"],
        });
        const before = findItem(manager, "Before");
        expect(isMoveValid([before], { group: manager, index: 3, sectionId: SectionId.BENEATH }, layout)).toBe(true);
    });
});

describe("Tree inspector rail colours", () => {
    test("are distinct, and kept by a source while it exists", () => {
        const allocator = new RailColorAllocator();
        const first = allocator.assign(["a", "b", "c"]);
        expect(new Set(first.values()).size).toBe(3);

        // "b" is removed and "d" added - "a" and "c" keep theirs, "d" gets a colour no other source has
        const second = allocator.assign(["a", "c", "d"]);
        expect(second.get("a")).toBe(first.get("a"));
        expect(second.get("c")).toBe(first.get("c"));
        expect(new Set(second.values()).size).toBe(3);
    });

    test("repeat only once every colour is taken", () => {
        const ids = Array.from({ length: 12 }, (_, index) => `source-${index}`);
        const colors = [...new RailColorAllocator().assign(ids).values()];

        expect(new Set(colors.slice(0, 10)).size).toBe(10);
        expect(new Set(colors).size).toBe(10);
    });
});

describe("Tree inspector move rules for views", () => {
    test("views can be moved into context boundaries, but not into views or plain providers' sections", async () => {
        const manager = await restore(
            boundary("Boundary", []),
            view("View A", []),
            view("View B", [boundary("Boundary in view", [])]),
        );
        const viewA = findItem(manager, "View A");
        const target = findItem<any>(manager, "Boundary");
        const boundaryInView = findItem<any>(manager, "Boundary in view");
        const viewB = findItem<any>(manager, "View B");

        const layout = DEFAULT_TREE_INSPECTOR_LAYOUT;
        expect(isMoveValid([viewA], { group: target, index: 0, sectionId: null }, layout)).toBe(true);
        expect(isMoveValid([viewA], { group: viewB, index: 0, sectionId: null }, layout)).toBe(false);
        expect(isMoveValid([viewA], { group: boundaryInView, index: 0, sectionId: null }, layout)).toBe(false);
        expect(isMoveValid([viewA], { group: manager, index: 0, sectionId: SectionId.ON_TOP }, layout)).toBe(false);
    });
});
