import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { DataProviderRegistry } from "@modules/_shared/DataProviderFramework/dataProviders/DataProviderRegistry";
import {
    type DataProviderManager,
    DataProviderManagerTopic,
    READINESS_WARNING_DELAY_MS,
} from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import type { CustomDataProviderImplementation } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import {
    type SerializedDataProvider,
    type SerializedDataProviderManager,
    SerializedType,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/serialization";

import { makeDataProviderManager } from "../../utils/dataProviderFramework";

const NO_SETTINGS = [] as const;

// Its data request never returns - as with a request that hangs - so it stays LOADING
class HangingProvider implements CustomDataProviderImplementation<typeof NO_SETTINGS, string> {
    settings = NO_SETTINGS;

    getDefaultName(): string {
        return "Hanging provider";
    }

    setupBindings(): void {}

    fetchData(): Promise<string> {
        return new Promise(() => {});
    }
}

class SettlingProvider implements CustomDataProviderImplementation<typeof NO_SETTINGS, string> {
    settings = NO_SETTINGS;

    getDefaultName(): string {
        return "Settling provider";
    }

    setupBindings(): void {}

    async fetchData(): Promise<string> {
        return "data";
    }
}

DataProviderRegistry.registerDataProvider("hanging-test-provider", HangingProvider);
DataProviderRegistry.registerDataProvider("settling-test-provider", SettlingProvider);

function makeSerializedState(dataProviderType: string, name: string): SerializedDataProviderManager {
    const serializedProvider: SerializedDataProvider<any> = {
        id: "provider",
        type: SerializedType.DATA_PROVIDER,
        name,
        expanded: false,
        visible: true,
        dataProviderType,
        settings: {},
    };
    return {
        id: "manager",
        type: SerializedType.DATA_PROVIDER_MANAGER,
        name: "Manager",
        expanded: true,
        visible: true,
        children: [serializedProvider],
    };
}

const HANGING_STATE = makeSerializedState("hanging-test-provider", "Hanging provider");
const SETTLING_STATE = makeSerializedState("settling-test-provider", "Settling provider");
const EMPTY_STATE: SerializedDataProviderManager = { ...HANGING_STATE, children: [] };

function countDataRevisions(manager: DataProviderManager) {
    const onDataRevision = vi.fn();
    manager.getPublishSubscribeDelegate().subscribe(DataProviderManagerTopic.DATA_REVISION, onDataRevision);
    return onDataRevision;
}

describe("DataProviderManager readiness warning", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    test("keeps deserializing while a provider is still loading, however long it takes, and names it in a warning after a while", () => {
        const manager = makeDataProviderManager();
        const onDataRevision = countDataRevisions(manager);

        manager.deserializeState(HANGING_STATE);
        vi.advanceTimersByTime(READINESS_WARNING_DELAY_MS - 1);
        expect(console.warn).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1);
        expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("Hanging provider"));

        vi.advanceTimersByTime(10 * READINESS_WARNING_DELAY_MS);
        expect(manager.isDeserializing()).toBe(true);
        expect(onDataRevision).not.toHaveBeenCalled();
        expect(console.warn).toHaveBeenCalledTimes(1);
    });

    test("does not warn when the providers settle in time", async () => {
        const manager = makeDataProviderManager();
        const onDataRevision = countDataRevisions(manager);

        manager.deserializeState(SETTLING_STATE);
        expect(manager.isDeserializing()).toBe(true);
        await vi.advanceTimersByTimeAsync(100);
        expect(manager.isDeserializing()).toBe(false);
        expect(onDataRevision).toHaveBeenCalledTimes(1);

        await vi.advanceTimersByTimeAsync(READINESS_WARNING_DELAY_MS);
        expect(onDataRevision).toHaveBeenCalledTimes(1);
        expect(console.warn).not.toHaveBeenCalled();
    });

    test("restarts the warning delay when a new state is restored", () => {
        const manager = makeDataProviderManager();

        manager.deserializeState(HANGING_STATE);
        vi.advanceTimersByTime(0.6 * READINESS_WARNING_DELAY_MS);
        manager.deserializeState(HANGING_STATE);
        vi.advanceTimersByTime(0.6 * READINESS_WARNING_DELAY_MS);
        expect(console.warn).not.toHaveBeenCalled();

        vi.advanceTimersByTime(0.4 * READINESS_WARNING_DELAY_MS);
        expect(console.warn).toHaveBeenCalledTimes(1);
    });

    test("does not warn once the manager is destroyed", () => {
        const manager = makeDataProviderManager();

        manager.deserializeState(HANGING_STATE);
        manager.beforeDestroy();
        vi.advanceTimersByTime(READINESS_WARNING_DELAY_MS);

        expect(console.warn).not.toHaveBeenCalled();
    });

    test("a restore started while the previous one finishes can still be stopped", () => {
        const manager = makeDataProviderManager();
        const onDataRevision = countDataRevisions(manager);
        let restarted = false;
        manager.getPublishSubscribeDelegate().subscribe(DataProviderManagerTopic.DATA_REVISION, () => {
            if (!restarted) {
                restarted = true;
                manager.deserializeState(HANGING_STATE);
            }
        });

        // Without providers, this restore finishes synchronously - and its data revision starts the next one
        manager.deserializeState(EMPTY_STATE);
        expect(manager.isDeserializing()).toBe(true);

        manager.beforeDestroy();
        vi.advanceTimersByTime(READINESS_WARNING_DELAY_MS);

        expect(onDataRevision).toHaveBeenCalledTimes(1);
        expect(console.warn).not.toHaveBeenCalled();
    });
});
