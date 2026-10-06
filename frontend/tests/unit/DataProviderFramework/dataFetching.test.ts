import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { DataProviderRegistry } from "@modules/_shared/DataProviderFramework/dataProviders/DataProviderRegistry";
import {
    DataProviderStatus,
    DataProviderTopic,
} from "@modules/_shared/DataProviderFramework/framework/DataProvider/DataProvider";
import { DataProviderManagerTopic } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

import {
    filterProvider,
    findProvider,
    getProviderSetting,
    LABEL_PROVIDER_TYPE,
    makeDataProviderManager,
    managerState,
    settle,
    surfaceProvider,
    type TestBackend,
    resetTestBackend,
} from "../../utils/dataProviderFramework";

let backend: TestBackend;

beforeEach(() => {
    vi.useFakeTimers();
    backend = resetTestBackend();
    backend.catalogues["field-a"] = {
        depth: { "Top reservoir": [1, 2, 3] },
    };
});

afterEach(() => {
    vi.useRealTimers();
});

async function restoreSurface() {
    const manager = makeDataProviderManager({ fieldId: "field-a" });
    const onDataRevision = vi.fn();
    manager.getPublishSubscribeDelegate().subscribe(DataProviderManagerTopic.DATA_REVISION, onDataRevision);
    manager.deserializeState(managerState([surfaceProvider("Surface")]));
    await settle(manager);
    return { manager, provider: findProvider(manager, "Surface"), onDataRevision };
}

describe("Data fetching", () => {
    test("fetches once, after the dependency graph has settled, with the final settings", async () => {
        const { provider } = await restoreSurface();

        expect(backend.callsTo("getSurfaceData")).toEqual([["field-a", "depth", "Top reservoir", 1]]);
        expect(provider.getData()).toEqual({
            attribute: "depth",
            surfaceName: "Top reservoir",
            realization: 1,
            values: [1, 10],
        });
        expect(provider.getDataValueRange()).toEqual([1, 10]);
    });

    test("publishes a single data revision when restoring has finished", async () => {
        const { onDataRevision } = await restoreSurface();

        expect(onDataRevision).toHaveBeenCalledTimes(1);
    });

    test("refetches when a setting the data depends on changes", async () => {
        const { manager, provider, onDataRevision } = await restoreSurface();

        getProviderSetting(provider, Setting.REALIZATION).setValue(2);
        await settle(manager);

        expect(backend.callsTo("getSurfaceData")).toEqual([
            ["field-a", "depth", "Top reservoir", 1],
            ["field-a", "depth", "Top reservoir", 2],
        ]);
        expect(provider.getData()?.values).toEqual([2, 20]);
        expect(onDataRevision.mock.calls.length).toBeGreaterThan(1);
    });

    test("only re-renders when a setting that the data doesn't depend on changes", async () => {
        const { manager, provider, onDataRevision } = await restoreSurface();
        const revisionNumber = provider.getRevisionNumber();
        const numDataRevisions = onDataRevision.mock.calls.length;

        getProviderSetting(provider, Setting.SHOW_LABELS).setValue(true);
        await settle(manager);

        expect(backend.callsTo("getSurfaceData")).toHaveLength(1);
        expect(provider.getStatus()).toBe(DataProviderStatus.SUCCESS);
        expect(provider.getRevisionNumber()).toBeGreaterThan(revisionNumber);
        expect(onDataRevision.mock.calls.length).toBeGreaterThan(numDataRevisions);
    });

    test("discards a fetch that a settings change superseded", async () => {
        const { manager, provider } = await restoreSurface();
        backend.delayMs = 100;
        const realizationsOfPublishedData: number[] = [];
        provider.getPublishSubscribeDelegate().subscribe(DataProviderTopic.DATA, () => {
            realizationsOfPublishedData.push(provider.getData()!.realization);
        });

        getProviderSetting(provider, Setting.REALIZATION).setValue(2);
        await vi.advanceTimersByTimeAsync(50);
        expect(backend.callsTo("getSurfaceData")).toContainEqual(["field-a", "depth", "Top reservoir", 2]);

        getProviderSetting(provider, Setting.REALIZATION).setValue(3);
        await settle(manager);

        expect(realizationsOfPublishedData).toEqual([3]);
        expect(provider.getData()?.realization).toBe(3);
    });

    test("a failing fetch sets the provider to ERROR with the reason, and restoring still finishes", async () => {
        backend.failRequests("getSurfaceData", new Error("Server unavailable"));
        const { manager, provider } = await restoreSurface();

        expect(provider.getStatus()).toBe(DataProviderStatus.ERROR);
        expect(provider.getError()).toBe("Surface: Server unavailable");
        expect(manager.isDeserializing()).toBe(false);
    });

    test("recovers from a failed fetch when the settings change", async () => {
        backend.failRequests("getSurfaceData");
        const { manager, provider } = await restoreSurface();

        backend.stopFailingRequests("getSurfaceData");
        getProviderSetting(provider, Setting.REALIZATION).setValue(2);
        await settle(manager);

        expect(provider.getStatus()).toBe(DataProviderStatus.SUCCESS);
        expect(provider.getData()?.realization).toBe(2);
    });

    test("is LOADING as soon as a refetch is scheduled, not only once the debounced fetch starts", async () => {
        const { provider } = await restoreSurface();

        getProviderSetting(provider, Setting.REALIZATION).setValue(2);

        expect(provider.getStatus()).toBe(DataProviderStatus.LOADING);
    });

    test("data fetched while the settings load again is published once they turn out unchanged, without refetching", async () => {
        // field-c has the same surfaces, so switching to it reloads the settings without changing them
        backend.catalogues["field-c"] = backend.catalogues["field-a"];
        const manager = makeDataProviderManager({ fieldId: "field-a" });
        manager.deserializeState(managerState([filterProvider("Filter")]));
        await settle(manager);
        const provider = findProvider(manager, "Filter");
        const onData = vi.fn();
        provider.getPublishSubscribeDelegate().subscribe(DataProviderTopic.DATA, onData);
        backend.delayMs = 100;

        // The fetch for the labels starts after 10 ms and returns after 110 ms - the settings reload from 50 to 150 ms
        getProviderSetting(provider, Setting.SHOW_LABELS).setValue(true);
        await vi.advanceTimersByTimeAsync(50);
        manager.updateGlobalSetting("fieldId", "field-c");
        await vi.advanceTimersByTimeAsync(70);
        expect(provider.getData()).toEqual({ showLabels: true });
        expect(provider.getStatus()).toBe(DataProviderStatus.LOADING);
        expect(onData).not.toHaveBeenCalled();

        await settle(manager);
        expect(provider.getStatus()).toBe(DataProviderStatus.SUCCESS);
        expect(onData).toHaveBeenCalledTimes(1);
        expect(backend.callsTo("getLabelData")).toEqual([[false], [true]]);
    });

    test("a fetch failing while the settings load again keeps the provider pending, and fails it once they turn out unchanged", async () => {
        backend.catalogues["field-c"] = backend.catalogues["field-a"];
        const manager = makeDataProviderManager({ fieldId: "field-a" });
        manager.deserializeState(managerState([filterProvider("Filter")]));
        await settle(manager);
        const provider = findProvider(manager, "Filter");
        backend.delayMs = 100;
        backend.failRequests("getLabelData", new Error("Label service down"));

        // The fetch fails after 110 ms - the settings reload from 50 to 150 ms
        getProviderSetting(provider, Setting.SHOW_LABELS).setValue(true);
        await vi.advanceTimersByTimeAsync(50);
        manager.updateGlobalSetting("fieldId", "field-c");
        await vi.advanceTimersByTimeAsync(70);
        expect(provider.getStatus()).toBe(DataProviderStatus.LOADING);

        await settle(manager);
        expect(provider.getStatus()).toBe(DataProviderStatus.ERROR);
        expect(provider.getError()).toBe("Filter: Label service down");
        expect(backend.callsTo("getLabelData")).toEqual([[false], [true]]);
    });

    test("a fetch failing while the settings load again is discarded when a setting the data depends on changed meanwhile", async () => {
        backend.catalogues["field-c"] = backend.catalogues["field-a"];
        const manager = makeDataProviderManager({ fieldId: "field-a" });
        manager.deserializeState(managerState([filterProvider("Filter")]));
        await settle(manager);
        const provider = findProvider(manager, "Filter");
        backend.delayMs = 100;
        backend.failRequests("getLabelData");

        // The failing fetch for showing the labels is in flight when they are hidden again, while the settings reload
        getProviderSetting(provider, Setting.SHOW_LABELS).setValue(true);
        await vi.advanceTimersByTimeAsync(30);
        manager.updateGlobalSetting("fieldId", "field-c");
        await vi.advanceTimersByTimeAsync(10);
        getProviderSetting(provider, Setting.SHOW_LABELS).setValue(false);
        await vi.advanceTimersByTimeAsync(90);
        backend.stopFailingRequests("getLabelData");
        await settle(manager);

        expect(provider.getStatus()).toBe(DataProviderStatus.SUCCESS);
        expect(provider.getData()).toEqual({ showLabels: false });
    });

    test("refetches when a setting the data depends on changed while the settings were loading during a fetch", async () => {
        backend.catalogues["field-c"] = backend.catalogues["field-a"];
        const manager = makeDataProviderManager({ fieldId: "field-a" });
        manager.deserializeState(managerState([filterProvider("Filter")]));
        await settle(manager);
        const provider = findProvider(manager, "Filter");
        backend.delayMs = 100;

        // The fetch for showing the labels is in flight when they are hidden again, while the settings reload
        getProviderSetting(provider, Setting.SHOW_LABELS).setValue(true);
        await vi.advanceTimersByTimeAsync(30);
        manager.updateGlobalSetting("fieldId", "field-c");
        await vi.advanceTimersByTimeAsync(10);
        getProviderSetting(provider, Setting.SHOW_LABELS).setValue(false);
        await settle(manager);

        expect(provider.getStatus()).toBe(DataProviderStatus.SUCCESS);
        expect(provider.getData()).toEqual({ showLabels: false });
    });

    test("a provider without dependencies loads too, when added the way the settings UI adds it", async () => {
        const manager = makeDataProviderManager({ fieldId: "field-a" });

        const provider = DataProviderRegistry.makeDataProvider(LABEL_PROVIDER_TYPE, manager);
        manager.getGroupDelegate().appendChild(provider);
        await settle(manager);

        expect(provider.getStatus()).toBe(DataProviderStatus.SUCCESS);
        expect(backend.callsTo("getLabelData")).toEqual([[true]]);
    });
});
