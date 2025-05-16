import { isDevMode } from "@lib/utils/devMode";

import { GroupDelegate } from "../../delegates/GroupDelegate";
import { ItemDelegate } from "../../delegates/ItemDelegate";
import type { ItemGroup } from "../../interfacesAndTypes/entities";
import type { SerializedSettingsGroup } from "../../interfacesAndTypes/serialization";
import { SerializedType } from "../../interfacesAndTypes/serialization";
import type { DataProviderManager } from "../DataProviderManager/DataProviderManager";

export function isSettingsGroup(obj: any): obj is SettingsGroup {
    if (!isDevMode()) {
        return obj instanceof SettingsGroup;
    }

    if (typeof obj !== "object" || obj === null) {
        return false;
    }

    if (obj.constructor.name !== "SettingsGroup") {
        return false;
    }

    return Boolean(obj.getGroupDelegate);
}

export class SettingsGroup implements ItemGroup {
    private _itemDelegate: ItemDelegate;
    private _groupDelegate: GroupDelegate;

    constructor(name: string, dataProviderManager: DataProviderManager) {
        this._groupDelegate = new GroupDelegate(this);
        this._groupDelegate.setColor("rgb(196 181 253)");
        this._itemDelegate = new ItemDelegate(name, 1, dataProviderManager);
    }

    getItemDelegate(): ItemDelegate {
        return this._itemDelegate;
    }

    getGroupDelegate(): GroupDelegate {
        return this._groupDelegate;
    }

    serializeState(): SerializedSettingsGroup {
        return {
            ...this._itemDelegate.serializeState(),
            type: SerializedType.SETTINGS_GROUP,
            children: this._groupDelegate.serializeChildren(),
        };
    }

    deserializeState(serialized: SerializedSettingsGroup) {
        this._itemDelegate.deserializeState(serialized);
        this._groupDelegate.deserializeChildren(serialized.children);
    }

    beforeDestroy?(): void {
        this._groupDelegate.beforeDestroy();
    }
}
