import { GroupDelegate } from "../../delegates/GroupDelegate";
import { ItemDelegate } from "../../delegates/ItemDelegate";
import { Group, SerializedSettingsGroup, SerializedType } from "../../interfaces";
import { LayerManager } from "../LayerManager/LayerManager";

export class SettingsGroup implements Group {
    private _itemDelegate: ItemDelegate;
    private _groupDelegate: GroupDelegate;

    constructor(name: string, layerManager: LayerManager) {
        this._groupDelegate = new GroupDelegate(this);
        this._groupDelegate.setColor("rgb(196 181 253)");
        this._itemDelegate = new ItemDelegate(name, layerManager);
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
}
