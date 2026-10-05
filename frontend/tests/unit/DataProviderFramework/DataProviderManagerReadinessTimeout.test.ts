import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { DataProviderRegistry } from "@modules/_shared/DataProviderFramework/dataProviders/DataProviderRegistry";
import {
    type DataProviderManager,
    DataProviderManagerTopic,
} from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import type { CustomDataProviderImplementation } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import {
    type SerializedDataProvider,
    type SerializedDataProviderManager,
    SerializedType,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/serialization";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

import { makeDataProviderManager } from "../../utils/dataProviderFramework";

const NO_SETTINGS = [] as const;

// Nothing ever makes a provider without settings evaluate them, so it stays LOADING forever
class NeverSettlingProvider implements CustomDataProviderImplementation<typeof NO_SETTINGS, string> {
    settings = NO_SETTINGS;

    getDefaultName(): string {
        return "Never settling provider";
    }

    setupBindings(): void {}

    async fetchData(): Promise<string> {
        return "data";
    }
}

const STATIC_SETTINGS = [Setting.SHOW_LABELS] as const;

// Restoring a static setting initializes it, after which the provider loads instantly
class SettlingProvider implements CustomDataProviderImplementation<typeof STATIC_SETTINGS, string> {
    settings = STATIC_SETTINGS;

    getDefaultName(): string {
        return "Settling provider";
    }

    setupBindings(): void {}

    async fetchData(): Promise<string> {
        return "data";
    }
}

DataProviderRegistry.registerDataProvider("never-settling-test-provider", NeverSettlingProvider);
DataProviderRegistry.registerDataProvider("settling-test-provider", SettlingProvider);

function makeSerializedState(provider: { type: string; name: string; settings: Record<string, string> }) {
    const serializedProvider: SerializedDataProvider<any> = {
        id: "provider",
        type: SerializedType.DATA_PROVIDER,
        name: provider.name,
        expanded: false,
        visible: true,
        dataProviderType: provider.type,
        settings: provider.settings,
    };
    const state: SerializedDataProviderManager = {
        id: "manager",
        type: SerializedType.DATA_PROVIDER_MANAGER,
        name: "Manager",
        expanded: true,
        visible: true,
        children: [serializedProvider],
    };
    return state;
}

const NEVER_SETTLING_STATE = makeSerializedState({
    type: "never-settling-test-provider",
    name: "Pending provider",
    settings: {},
});
const SETTLING_STATE = makeSerializedState({
    type: "settling-test-provider",
    name: "Settling provider",
    settings: { [Setting.SHOW_LABELS]: JSON.stringify(true) },
});

function countDataRevisions(manager: DataProviderManager) {
    const onDataRevision = vi.fn();
    manager.getPublishSubscribeDelegate().subscribe(DataProviderManagerTopic.DATA_REVISION, onDataRevision);
    return onDataRevision;
}

describe("DataProviderManager readiness timeout", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    test("publishes after the timeout when a provider never settles, naming the provider", () => {
        const manager = makeDataProviderManager();
        const onDataRevision = countDataRevisions(manager);

        manager.deserializeState(NEVER_SETTLING_STATE);
        vi.advanceTimersByTime(9_999);
        expect(manager.isDeserializing()).toBe(true);
        expect(onDataRevision).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1);
        expect(manager.isDeserializing()).toBe(false);
        expect(onDataRevision).toHaveBeenCalledTimes(1);
        expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("Pending provider"));
    });

    test("does not publish again at the timeout when the providers settled before it", async () => {
        const manager = makeDataProviderManager();
        const onDataRevision = countDataRevisions(manager);

        manager.deserializeState(SETTLING_STATE);
        expect(manager.isDeserializing()).toBe(true);
        await vi.advanceTimersByTimeAsync(100);
        expect(manager.isDeserializing()).toBe(false);
        expect(onDataRevision).toHaveBeenCalledTimes(1);

        await vi.advanceTimersByTimeAsync(10_000);
        expect(onDataRevision).toHaveBeenCalledTimes(1);
        expect(console.warn).not.toHaveBeenCalled();
    });

    test("restarts the timeout when a new state is restored", () => {
        const manager = makeDataProviderManager();

        manager.deserializeState(NEVER_SETTLING_STATE);
        vi.advanceTimersByTime(6_000);
        manager.deserializeState(NEVER_SETTLING_STATE);
        vi.advanceTimersByTime(6_000);
        expect(manager.isDeserializing()).toBe(true);

        vi.advanceTimersByTime(4_000);
        expect(manager.isDeserializing()).toBe(false);
    });

    test("stops the timeout when the manager is destroyed", () => {
        const manager = makeDataProviderManager();
        const onDataRevision = countDataRevisions(manager);

        manager.deserializeState(NEVER_SETTLING_STATE);
        manager.beforeDestroy();
        vi.advanceTimersByTime(10_000);

        expect(onDataRevision).not.toHaveBeenCalled();
        expect(console.warn).not.toHaveBeenCalled();
    });

    test("a restore started while the previous one finishes can still be stopped", () => {
        const manager = makeDataProviderManager();
        const onDataRevision = countDataRevisions(manager);
        let restarted = false;
        manager.getPublishSubscribeDelegate().subscribe(DataProviderManagerTopic.DATA_REVISION, () => {
            if (!restarted) {
                restarted = true;
                manager.deserializeState(NEVER_SETTLING_STATE);
            }
        });

        // Without providers, this restore finishes synchronously - and its data revision starts the next one
        manager.deserializeState({ ...NEVER_SETTLING_STATE, children: [] });
        expect(manager.isDeserializing()).toBe(true);

        manager.beforeDestroy();
        vi.advanceTimersByTime(10_000);

        expect(onDataRevision).toHaveBeenCalledTimes(1);
        expect(console.warn).not.toHaveBeenCalled();
    });
});
