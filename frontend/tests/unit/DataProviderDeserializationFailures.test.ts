import { describe, expect, test, vi } from "vitest";

import { GroupDelegateTopic } from "@modules/_shared/DataProviderFramework/delegates/GroupDelegate";
import {
    ErrorPlaceholder,
    isErrorPlaceholder,
} from "@modules/_shared/DataProviderFramework/framework/ErrorPlaceholder/ErrorPlaceholder";
import { DeserializationAssistant } from "@modules/_shared/DataProviderFramework/framework/utils/DeserializationAssistant";
import {
    type SerializedItem,
    SerializedType,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/serialization";

import { makeDataProviderManager } from "../utils/dataProviderFramework";

function makeSerializedItem(type: string, name: string): SerializedItem {
    return { id: name, type: type as SerializedType, name, expanded: false, visible: true };
}

// A DataProviderManager can never be nested - deserializing one as a child throws
const NESTED_MANAGER = makeSerializedItem(SerializedType.DATA_PROVIDER_MANAGER, "Nested manager");

describe("Deserialization failures", () => {
    test("an unknown item type becomes an error placeholder that keeps the original state", () => {
        const manager = makeDataProviderManager();
        const serialized = makeSerializedItem("removed-item-type", "Old item");

        const item = new DeserializationAssistant(manager).makeItem(serialized);

        expect(isErrorPlaceholder(item)).toBe(true);
        expect(item.serializeState()).toBe(serialized);
    });

    test("a group keeps publishing changes after deserializing its children threw", () => {
        const manager = makeDataProviderManager();
        const groupDelegate = manager.getGroupDelegate();
        expect(() => groupDelegate.deserializeChildren([NESTED_MANAGER])).toThrow();

        const onTreeRevision = vi.fn();
        groupDelegate.getPublishSubscribeDelegate().subscribe(GroupDelegateTopic.TREE_REVISION_NUMBER, onTreeRevision);
        const serialized = makeSerializedItem("removed-item-type", "Item");
        groupDelegate.appendChild(new ErrorPlaceholder("Item", "Error", serialized, manager));

        expect(onTreeRevision).toHaveBeenCalled();
    });

    test("the manager stops deserializing when building the tree threw", () => {
        const manager = makeDataProviderManager();

        expect(() =>
            manager.deserializeState({
                ...makeSerializedItem(SerializedType.DATA_PROVIDER_MANAGER, "Manager"),
                type: SerializedType.DATA_PROVIDER_MANAGER,
                children: [NESTED_MANAGER],
            }),
        ).toThrow();

        expect(manager.isDeserializing()).toBe(false);
    });
});
