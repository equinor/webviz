import type { Layer as DeckGlLayer } from "@deck.gl/core";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import * as bbox from "@lib/utils/bbox";
import * as vec3 from "@lib/utils/vec3";
import type { DataProviderManager } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { GroupType } from "@modules/_shared/DataProviderFramework/groups/groupTypes";
import { View } from "@modules/_shared/DataProviderFramework/groups/implementations/View";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import {
    type Annotation,
    type AssemblerProduct,
    type DataProviderVisualization,
    VisualizationAssembler,
    VisualizationItemType,
    type VisualizationTarget,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

import {
    boundary,
    findProvider,
    getProviderSetting,
    GRID_PROVIDER_TYPE,
    GridTestProvider,
    gridProvider,
    makeDataProviderManager,
    managerState,
    settle,
    SURFACE_PROVIDER_TYPE,
    SurfaceTestProvider,
    surfaceProvider,
    type TestBackend,
    resetTestBackend,
    view,
} from "../../utils/dataProviderFramework";

type CustomGroupProps = { [GroupType.VIEW]: { viewName: string } };
type InjectedData = { scaleFactor: number };
type AccumulatedData = { numValues: number };
type Product = AssemblerProduct<VisualizationTarget.DECK_GL, CustomGroupProps, AccumulatedData>;
type Child = Product["children"][number];
type GroupChild = Extract<Child, { itemType: VisualizationItemType.GROUP }>;

// Plain objects stand in for the deck.gl layers a real transformer would create
type TestVisualization = Record<string, unknown>;

function asLayer(visualization: TestVisualization): DeckGlLayer<any> {
    return visualization as unknown as DeckGlLayer<any>;
}

function makeAssembler() {
    const assembler = new VisualizationAssembler<
        VisualizationTarget.DECK_GL,
        CustomGroupProps,
        InjectedData,
        AccumulatedData
    >();

    assembler.registerDataProviderTransformers(SURFACE_PROVIDER_TYPE, SurfaceTestProvider, {
        transformToVisualization: ({
            name,
            isLoading,
            getSetting,
            getData,
            getStoredData,
            getDataValueRange,
            getInjectedData,
        }) =>
            asLayer({
                kind: "surface",
                name,
                isLoading,
                surfaceName: getSetting(Setting.SURFACE_NAME),
                realization: getSetting(Setting.REALIZATION),
                showLabels: getSetting(Setting.SHOW_LABELS),
                surfaceCount: getStoredData("surfaceCount"),
                valueRange: getDataValueRange(),
                scaledValues: getData()?.values.map((value) => value * getInjectedData().scaleFactor),
            }),
        transformToBoundingBox: ({ getData }) => {
            const values = getData()?.values ?? [];
            return bbox.create(vec3.create(Math.min(...values), 0, 0), vec3.create(Math.max(...values), 0, 0));
        },
        transformToAnnotations: ({ name }) => [
            { id: `color scale of ${name}`, colorScale: {} } as unknown as Annotation,
        ],
        reduceAccumulatedData: (accumulatedData, { getData }) => ({
            numValues: accumulatedData.numValues + (getData()?.values.length ?? 0),
        }),
    });

    assembler.registerDataProviderTransformers(GRID_PROVIDER_TYPE, GridTestProvider, {
        transformToVisualization: ({ name, getData }) => asLayer({ kind: "grid", name, numCells: getData()?.numCells }),
    });

    assembler.registerGroupCustomPropsCollector(GroupType.VIEW, View, ({ name }) => ({ viewName: name }));

    return assembler;
}

function assemble(assembler: ReturnType<typeof makeAssembler>, manager: DataProviderManager): Product {
    return assembler.make(manager, { injectedData: { scaleFactor: 2 }, initialAccumulatedData: { numValues: 0 } });
}

// The structure of the product by name: groups as { group: children }, data provider visualizations as their name
function describeStructure(children: Child[]): unknown[] {
    return children.map((child) =>
        child.itemType === VisualizationItemType.GROUP
            ? { [child.name]: describeStructure(child.children) }
            : child.name,
    );
}

function visualizationOf(product: Product, name: string): TestVisualization {
    const find = (children: Child[]): DataProviderVisualization<VisualizationTarget.DECK_GL> | undefined => {
        for (const child of children) {
            if (child.itemType === VisualizationItemType.DATA_PROVIDER_VISUALIZATION && child.name === name) {
                return child;
            }
            if (child.itemType === VisualizationItemType.GROUP) {
                const found = find(child.children);
                if (found) {
                    return found;
                }
            }
        }
        return undefined;
    };

    const visualization = find(product.children);
    if (!visualization) {
        throw new Error(`No visualization for '${name}'`);
    }
    return visualization.visualization as unknown as TestVisualization;
}

let backend: TestBackend;

beforeEach(() => {
    vi.useFakeTimers();
    backend = resetTestBackend();
    backend.catalogues["field-a"] = {
        depth: { "Top reservoir": [1, 2, 3] },
    };
    backend.grids["field-a"] = { "Simulation grid": 1000 };
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

describe("Visualization assembly", () => {
    test("prepares a visualization for a provider from its settings, stored data, data and the injected data", async () => {
        const manager = await restore(surfaceProvider("Surface", { realization: 3 }));

        const product = assemble(makeAssembler(), manager);

        expect(product.children).toEqual([
            {
                itemType: VisualizationItemType.DATA_PROVIDER_VISUALIZATION,
                id: "Surface",
                name: "Surface",
                type: SURFACE_PROVIDER_TYPE,
                visualization: {
                    kind: "surface",
                    name: "Surface",
                    isLoading: false,
                    surfaceName: "Top reservoir",
                    realization: 3,
                    showLabels: false,
                    surfaceCount: 1,
                    valueRange: [3, 30],
                    scaledValues: [6, 60],
                },
            },
        ]);
        expect(product.numDataProviders).toBe(1);
        expect(product.numLoadingDataProviders).toBe(0);
        expect(product.aggregatedErrorMessages).toEqual([]);
    });

    test("turns views into groups, and passes providers outside views down into every view", async () => {
        const manager = await restore(
            surfaceProvider("Shared surface"),
            view("View 1", [gridProvider("Grid")]),
            view("View 2", [surfaceProvider("Surface 2")]),
        );

        const product = assemble(makeAssembler(), manager);

        expect(describeStructure(product.children)).toEqual([
            { "View 1": ["Shared surface", "Grid"] },
            { "View 2": ["Shared surface", "Surface 2"] },
            "Shared surface",
        ]);
        const view1 = product.children[0] as GroupChild;
        expect(view1).toMatchObject({ id: "View 1", groupType: GroupType.VIEW, color: "color-of-View 1" });
        expect(view1.customProps).toEqual({ viewName: "View 1" });
    });

    test("flattens context boundaries into their parent, passing their providers down into the views inside them", async () => {
        const manager = await restore(
            boundary("Boundary", [surfaceProvider("Inside"), view("View", [gridProvider("Grid")])]),
            surfaceProvider("Outside"),
        );

        const product = assemble(makeAssembler(), manager);

        expect(describeStructure(product.children)).toEqual([
            { View: ["Outside", "Inside", "Grid"] },
            "Outside",
            "Inside",
        ]);
    });

    test("leaves out hidden items, but keeps their ids", async () => {
        const manager = await restore(
            surfaceProvider("Hidden surface", {}, { visible: false }),
            view("Hidden view", [gridProvider("Grid in hidden view")], { visible: false }),
            gridProvider("Visible grid"),
        );

        const product = assemble(makeAssembler(), manager);

        expect(describeStructure(product.children)).toEqual(["Visible grid"]);
        expect([...product.allItemIds].sort()).toEqual(
            ["Grid in hidden view", "Hidden surface", "Hidden view", "Visible grid"].sort(),
        );
    });

    test("counts loading providers, and adds them once their data has arrived", async () => {
        backend.delayMs = 100;
        const manager = makeDataProviderManager({ fieldId: "field-a" });
        manager.deserializeState(managerState([surfaceProvider("Surface")]));
        const assembler = makeAssembler();

        // Catalogue and realizations take 100 ms each, then the data request starts
        await vi.advanceTimersByTimeAsync(250);
        const whileLoading = assemble(assembler, manager);
        expect(whileLoading.numLoadingDataProviders).toBe(1);
        expect(whileLoading.children).toEqual([]);

        await settle(manager);
        const loaded = assemble(assembler, manager);
        expect(loaded.numLoadingDataProviders).toBe(0);
        expect(describeStructure(loaded.children)).toEqual(["Surface"]);
    });

    test("leaves out invalid providers silently, and failed ones with their error", async () => {
        backend.failRequests("getGridData", new Error("Grid service down"));
        const manager = await restore(
            surfaceProvider("Invalid surface", { surfaceName: "Gone surface" }),
            gridProvider("Grid"),
            surfaceProvider("Surface"),
        );

        const product = assemble(makeAssembler(), manager);

        expect(describeStructure(product.children)).toEqual(["Surface"]);
        expect(product.aggregatedErrorMessages).toEqual(["Grid: Grid service down"]);
    });

    test("leaves out items that couldn't be restored completely, and reports why", async () => {
        const outdated = surfaceProvider("Outdated surface");
        outdated.settings["removedSetting"] = JSON.stringify("value");
        const manager = await restore(outdated, surfaceProvider("Surface"));

        const product = assemble(makeAssembler(), manager);

        expect(describeStructure(product.children)).toEqual(["Surface"]);
        expect(product.aggregatedErrorMessages).toEqual([
            "Outdated surface: Setting with key 'removedSetting' does not exist anymore. Cannot apply persisted value.",
        ]);
    });

    test("combines bounding boxes, collects annotations and accumulates data over all providers", async () => {
        const manager = await restore(
            surfaceProvider("Surface 1", { realization: 1 }),
            surfaceProvider("Surface 2", { realization: 3 }),
        );

        const product = assemble(makeAssembler(), manager);

        expect(product.combinedBoundingBox).toEqual(bbox.create(vec3.create(1, 0, 0), vec3.create(30, 0, 0)));
        expect(product.annotations.map((annotation) => annotation.id)).toEqual([
            "color scale of Surface 1",
            "color scale of Surface 2",
        ]);
        expect(product.accumulatedData).toEqual({ numValues: 4 });
    });

    test("reuses a provider's visualization until the provider changes", async () => {
        const manager = await restore(surfaceProvider("Surface"));
        const assembler = makeAssembler();
        const first = visualizationOf(assemble(assembler, manager), "Surface");

        expect(visualizationOf(assemble(assembler, manager), "Surface")).toBe(first);

        getProviderSetting(findProvider(manager, "Surface"), Setting.SHOW_LABELS).setValue(true);
        await settle(manager);
        const afterChange = visualizationOf(assemble(assembler, manager), "Surface");

        expect(afterChange).not.toBe(first);
        expect(afterChange.showLabels).toBe(true);
    });

    test("refuses to register transformers for the same provider type, or props for the same group type, twice", () => {
        const assembler = makeAssembler();

        expect(() =>
            assembler.registerDataProviderTransformers(GRID_PROVIDER_TYPE, GridTestProvider, {
                transformToVisualization: () => null,
            }),
        ).toThrow(`Transformer function for data provider ${GRID_PROVIDER_TYPE} already registered`);
        expect(() =>
            assembler.registerGroupCustomPropsCollector(GroupType.VIEW, View, ({ name }) => ({ viewName: name })),
        ).toThrow(`Data collector function for group ${GroupType.VIEW} already registered`);
    });
});
