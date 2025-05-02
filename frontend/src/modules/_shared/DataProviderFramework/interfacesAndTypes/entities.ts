
import type { GroupDelegate } from "../delegates/GroupDelegate";
import type { ItemDelegate } from "../delegates/ItemDelegate";
import type { SharedSettingsDelegate } from "../delegates/SharedSettingsDelegate";

import type { SerializedItem } from "./serialization";

/**
 * Each entity in the data provider framework is based upon the Item interface.
 * It provides methods for serializing and deserializing the state of the entity.
 * It also provides a delegate that can be used to interact with the item - e.g. changing its name, visibility, etc.
 */
export interface Item {
    getItemDelegate(): ItemDelegate;
    serializeState(): SerializedItem;
    deserializeState(serialized: SerializedItem): void;
    beforeDestroy?(): void;
}

export function instanceofItem(item: any): item is Item {
    return (item as Item).getItemDelegate !== undefined;
}

/**
 * A group is a special type of item that can contain other items.
 */
export interface ItemGroup extends Item {
    getGroupDelegate(): GroupDelegate;
}

export function instanceofItemGroup(group: any): group is ItemGroup {
    return (group as ItemGroup).getGroupDelegate !== undefined;
}

export interface SharedSettingsProvider {
    getSharedSettingsDelegate(): SharedSettingsDelegate<any>;
}

export function instanceofSharedSettingsProvider(item: Item): item is SharedSettingsProvider & Item {
    return (item as any).getSharedSettingsDelegate !== undefined;
}
