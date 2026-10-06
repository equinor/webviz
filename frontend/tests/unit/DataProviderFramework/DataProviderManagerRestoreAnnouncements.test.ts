import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
    type DataProviderManager,
    DataProviderManagerTopic,
} from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";

import {
    gridProvider,
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
});
