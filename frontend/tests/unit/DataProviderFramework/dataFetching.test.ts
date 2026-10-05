import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
    DataProviderStatus,
    DataProviderTopic,
} from "@modules/_shared/DataProviderFramework/framework/DataProvider/DataProvider";
import { DataProviderManagerTopic } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

import {
    findProvider,
    getProviderSetting,
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
});
