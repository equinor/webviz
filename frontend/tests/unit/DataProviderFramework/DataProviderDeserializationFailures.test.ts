import { describe, expect, test, vi } from "vitest";

import { type GroupDelegate, GroupDelegateTopic } from "@modules/_shared/DataProviderFramework/delegates/GroupDelegate";
import { DataProviderManagerTopic } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import {
    ErrorPlaceholder,
    isErrorPlaceholder,
} from "@modules/_shared/DataProviderFramework/framework/ErrorPlaceholder/ErrorPlaceholder";
import { DeserializationAssistant } from "@modules/_shared/DataProviderFramework/framework/utils/DeserializationAssistant";
import {
    type SerializedDataProviderManager,
    type SerializedItem,
    SerializedType,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/serialization";

import {
    makeDataProviderManager,
    managerState,
    resetTestBackend,
    surfaceProvider,
} from "../../utils/dataProviderFramework";

function makeSerializedItem(type: string, name: string): SerializedItem {
    return { id: name, type: type as SerializedType, name, expanded: false, visible: true };
}

function makeSerializedManager(children: SerializedItem[]): SerializedDataProviderManager {
    return {
        ...makeSerializedItem(SerializedType.DATA_PROVIDER_MANAGER, "Manager"),
        type: SerializedType.DATA_PROVIDER_MANAGER,
        children,
    };
}

// Deserializing these doesn't throw (they become placeholders), so a failure has to be forced
const FIRST_ITEM = makeSerializedItem("removed-item-type", "First item");
const SECOND_ITEM = makeSerializedItem("removed-item-type", "Second item");

function makeSecondAppendThrow(groupDelegate: GroupDelegate): void {
    const appendChild = groupDelegate.appendChild.bind(groupDelegate);
    vi.spyOn(groupDelegate, "appendChild")
        .mockImplementationOnce(appendChild)
        .mockImplementationOnce(() => {
            throw new Error("Unexpected failure");
        });
}

describe("Deserialization failures", () => {
    test("an unknown item type becomes an error placeholder that keeps the original state", () => {
        const manager = makeDataProviderManager();
        const serialized = makeSerializedItem("removed-item-type", "Old item");

        const item = new DeserializationAssistant(manager).makeItem(serialized);

        expect(isErrorPlaceholder(item)).toBe(true);
        expect(item.serializeState()).toBe(serialized);
    });

    test("a provider that fails to restore after it was made is torn down, so it never fetches or publishes", async () => {
        vi.useFakeTimers();
        try {
            const backend = resetTestBackend();
            backend.catalogues["field-a"] = { depth: { "Top reservoir": [1] } };
            const manager = makeDataProviderManager({ fieldId: "field-a" });
            const malformed = surfaceProvider("Malformed surface") as any;
            delete malformed.settings;
            const onGuiStateRevision = vi.fn();

            manager.deserializeState(managerState([malformed]));
            manager
                .getPublishSubscribeDelegate()
                .subscribe(DataProviderManagerTopic.GUI_STATE_REVISION, onGuiStateRevision);
            // Long enough for it to have loaded, had it kept initializing
            await vi.advanceTimersByTimeAsync(1_000);

            expect(manager.getGroupDelegate().getChildren().every(isErrorPlaceholder)).toBe(true);
            expect(backend.callsTo("getRealizations")).toEqual([]);
            expect(backend.callsTo("getSurfaceData")).toEqual([]);
            expect(onGuiStateRevision).not.toHaveBeenCalled();
        } finally {
            vi.useRealTimers();
        }
    });

    test("a nested data provider manager becomes an error placeholder, and the items after it are still restored", () => {
        const manager = makeDataProviderManager();
        const nestedManager = makeSerializedItem(SerializedType.DATA_PROVIDER_MANAGER, "Nested manager");

        manager.deserializeState(makeSerializedManager([nestedManager, FIRST_ITEM]));

        const children = manager.getGroupDelegate().getChildren();
        expect(children.map((child) => child.serializeState())).toEqual([nestedManager, FIRST_ITEM]);
        expect(children.every(isErrorPlaceholder)).toBe(true);
    });

    test("a group keeps publishing changes after deserializing its children threw", () => {
        const manager = makeDataProviderManager();
        const groupDelegate = manager.getGroupDelegate();
        makeSecondAppendThrow(groupDelegate);
        expect(() => groupDelegate.deserializeChildren([FIRST_ITEM, SECOND_ITEM])).toThrow();

        const onTreeRevision = vi.fn();
        groupDelegate.getPublishSubscribeDelegate().subscribe(GroupDelegateTopic.TREE_REVISION_NUMBER, onTreeRevision);
        groupDelegate.appendChild(new ErrorPlaceholder("Item", "Error", SECOND_ITEM, manager));

        expect(onTreeRevision).toHaveBeenCalled();
    });

    test("the manager tears down the partial tree and announces the empty tree to consumers, without persisting it, when building it threw", () => {
        const manager = makeDataProviderManager();
        makeSecondAppendThrow(manager.getGroupDelegate());
        const childrenAtItemsNotifications: string[][] = [];
        manager.getPublishSubscribeDelegate().subscribe(DataProviderManagerTopic.ITEMS, () => {
            childrenAtItemsNotifications.push(
                manager
                    .getGroupDelegate()
                    .getChildren()
                    .map((child) => child.getItemDelegate().getName()),
            );
        });
        const onGuiStateRevision = vi.fn();
        manager
            .getPublishSubscribeDelegate()
            .subscribe(DataProviderManagerTopic.GUI_STATE_REVISION, onGuiStateRevision);
        const onSerializedStateRevision = vi.fn();
        manager
            .getPublishSubscribeDelegate()
            .subscribe(DataProviderManagerTopic.SERIALIZED_STATE_REVISION, onSerializedStateRevision);

        expect(() => manager.deserializeState(makeSerializedManager([FIRST_ITEM, SECOND_ITEM]))).toThrow();

        expect(manager.isDeserializing()).toBe(false);
        expect(childrenAtItemsNotifications.at(-1)).toEqual([]);
        expect(onGuiStateRevision).toHaveBeenCalledTimes(1);
        expect(onSerializedStateRevision).not.toHaveBeenCalled();
    });

    test("providers made before building the tree threw publish no GUI state revisions afterwards", async () => {
        vi.useFakeTimers();
        try {
            const backend = resetTestBackend();
            backend.catalogues["field-a"] = { depth: { "Top reservoir": [1] } };
            const manager = makeDataProviderManager({ fieldId: "field-a" });
            // The first provider is appended, the second is made but appending it throws
            makeSecondAppendThrow(manager.getGroupDelegate());

            expect(() =>
                manager.deserializeState(
                    managerState([surfaceProvider("Appended surface"), surfaceProvider("Unappended surface")]),
                ),
            ).toThrow();
            // Subscribed after the failure, which announces the empty tree with a GUI state revision of its own
            const onGuiStateRevision = vi.fn();
            manager
                .getPublishSubscribeDelegate()
                .subscribe(DataProviderManagerTopic.GUI_STATE_REVISION, onGuiStateRevision);
            const onSerializedStateRevision = vi.fn();
            manager
                .getPublishSubscribeDelegate()
                .subscribe(DataProviderManagerTopic.SERIALIZED_STATE_REVISION, onSerializedStateRevision);
            // Long enough for both to have loaded, had they kept initializing
            await vi.advanceTimersByTimeAsync(1_000);

            expect(onGuiStateRevision).not.toHaveBeenCalled();
            expect(onSerializedStateRevision).not.toHaveBeenCalled();
            expect(backend.callsTo("getSurfaceData")).toEqual([]);
        } finally {
            vi.useRealTimers();
        }
    });

    test("the manager never announces restoring a state when building the tree threw", () => {
        const manager = makeDataProviderManager();
        makeSecondAppendThrow(manager.getGroupDelegate());
        const onIsDeserializing = vi.fn();
        manager.getPublishSubscribeDelegate().subscribe(DataProviderManagerTopic.IS_DESERIALIZING, onIsDeserializing);

        expect(() => manager.deserializeState(makeSerializedManager([FIRST_ITEM, SECOND_ITEM]))).toThrow();

        expect(onIsDeserializing).not.toHaveBeenCalled();
    });

    test("the manager announces that restoring has ended when building the tree of a newer state threw", () => {
        const manager = makeDataProviderManager({ fieldId: "field-a" });
        // The provider's settings resolve asynchronously, so this restore is still waiting for it
        manager.deserializeState(managerState([surfaceProvider("Surface")]));
        expect(manager.isDeserializing()).toBe(true);

        makeSecondAppendThrow(manager.getGroupDelegate());
        const isDeserializingAtNotifications: boolean[] = [];
        manager.getPublishSubscribeDelegate().subscribe(DataProviderManagerTopic.IS_DESERIALIZING, () => {
            isDeserializingAtNotifications.push(manager.isDeserializing());
        });

        expect(() => manager.deserializeState(makeSerializedManager([FIRST_ITEM, SECOND_ITEM]))).toThrow();

        expect(isDeserializingAtNotifications).toEqual([false]);
        manager.beforeDestroy();
    });
});
