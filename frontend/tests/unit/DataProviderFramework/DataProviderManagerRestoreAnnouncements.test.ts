import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { DataProviderStatus } from "@modules/_shared/DataProviderFramework/framework/DataProvider/DataProvider";
import {
    type DataProviderManager,
    DataProviderManagerTopic,
} from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import {
    type SerializedDataProvider,
    SerializedType,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/serialization";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

import {
    findProvider,
    getProviderSetting,
    gridProvider,
    LABEL_PROVIDER_TYPE,
    makeDataProviderManager,
    managerState,
    resetTestBackend,
    settle,
    surfaceProvider,
    type TestBackend,
} from "../../utils/dataProviderFramework";

// What the manager announces, along with what a subscriber sees at that moment
function recordAnnouncements(manager: DataProviderManager): string[] {
    const announcements: string[] = [];
    const publishSubscribeDelegate = manager.getPublishSubscribeDelegate();
    publishSubscribeDelegate.subscribe(DataProviderManagerTopic.IS_DESERIALIZING, () => {
        const numChildren = manager.getGroupDelegate().getChildren().length;
        announcements.push(`deserializing: ${manager.isDeserializing()} (${numChildren} items)`);
    });
    publishSubscribeDelegate.subscribe(DataProviderManagerTopic.DATA_REVISION, () => {
        announcements.push("data revision");
    });
    return announcements;
}

let backend: TestBackend;

beforeEach(() => {
    vi.useFakeTimers();
    backend = resetTestBackend();
    backend.catalogues["field-a"] = { depth: { "Top reservoir": [1, 2, 3] } };
    backend.grids["field-a"] = { "Simulation grid": 1000 };
});

afterEach(() => {
    vi.useRealTimers();
});

describe("DataProviderManager restore announcements", () => {
    test("announces restoring once the restored tree is complete, and its end before the data revision", async () => {
        const manager = makeDataProviderManager({ fieldId: "field-a" });
        const announcements = recordAnnouncements(manager);

        manager.deserializeState(managerState([surfaceProvider("Surface"), gridProvider("Grid")]));
        await settle(manager);

        expect(announcements.slice(0, 3)).toEqual([
            "deserializing: true (2 items)",
            "deserializing: false (2 items)",
            "data revision",
        ]);
    });

    test("announces both the start and the end of restoring a state that is ready right away", () => {
        const manager = makeDataProviderManager({ fieldId: "field-a" });
        const announcements = recordAnnouncements(manager);

        manager.deserializeState(managerState([]));

        expect(announcements).toEqual([
            "deserializing: true (0 items)",
            "deserializing: false (0 items)",
            "data revision",
        ]);
    });

    test("announces restoring only once when a newer state is restored before the previous one has finished", async () => {
        const manager = makeDataProviderManager({ fieldId: "field-a" });
        const announcements = recordAnnouncements(manager);

        manager.deserializeState(managerState([surfaceProvider("Surface")]));
        manager.deserializeState(managerState([gridProvider("Grid")]));
        await settle(manager);

        expect(announcements.slice(0, 3)).toEqual([
            "deserializing: true (1 items)",
            "deserializing: false (1 items)",
            "data revision",
        ]);
    });

    test("doesn't end restoring while a settled provider's refetch is scheduled and the last other one settles", async () => {
        backend.delayMs = 10;
        // A provider whose only setting has no bindings - changing it refetches without the settings loading first
        const labels: SerializedDataProvider<any> = {
            id: "Labels",
            type: SerializedType.DATA_PROVIDER,
            name: "Labels",
            expanded: true,
            visible: true,
            dataProviderType: LABEL_PROVIDER_TYPE,
            settings: { [Setting.SHOW_LABELS]: JSON.stringify(false) },
        };
        const manager = makeDataProviderManager({ fieldId: "field-a" });
        manager.deserializeState(managerState([labels, surfaceProvider("Surface")]));
        const labelsProvider = findProvider(manager, "Labels");
        const dataWhenRestoringEnded: unknown[] = [];
        manager.getPublishSubscribeDelegate().subscribe(DataProviderManagerTopic.IS_DESERIALIZING, () => {
            if (!manager.isDeserializing()) {
                dataWhenRestoringEnded.push(labelsProvider.getData());
            }
        });

        // Until the labels provider has settled and the surface provider's last request is in flight - it then settles in
        // less than the 10 ms the labels provider's refetch is debounced for
        while (
            labelsProvider.getStatus() !== DataProviderStatus.SUCCESS ||
            backend.callsTo("getSurfaceData").length === 0
        ) {
            await vi.advanceTimersByTimeAsync(1);
        }
        expect(findProvider(manager, "Surface").getStatus()).toBe(DataProviderStatus.LOADING);

        getProviderSetting(labelsProvider, Setting.SHOW_LABELS).setValue(true);
        await settle(manager);

        expect(dataWhenRestoringEnded).toEqual([{ showLabels: true }]);
    });
});
