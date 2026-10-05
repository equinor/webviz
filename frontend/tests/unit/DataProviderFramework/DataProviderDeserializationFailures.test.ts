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

import { makeDataProviderManager } from "../../utils/dataProviderFramework";

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

    test("the manager announces the partial tree, without a data revision, when building it threw", () => {
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
        const onDataRevision = vi.fn();
        manager.getPublishSubscribeDelegate().subscribe(DataProviderManagerTopic.DATA_REVISION, onDataRevision);

        expect(() => manager.deserializeState(makeSerializedManager([FIRST_ITEM, SECOND_ITEM]))).toThrow();

        expect(manager.isDeserializing()).toBe(false);
        expect(childrenAtItemsNotifications.at(-1)).toEqual(["First item"]);
        expect(onDataRevision).not.toHaveBeenCalled();
    });
});
