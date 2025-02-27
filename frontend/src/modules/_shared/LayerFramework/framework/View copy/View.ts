import { GroupDelegate } from "../../delegates/GroupDelegate";
import { ItemDelegate } from "../../delegates/ItemDelegate";
import { Group, SerializedGroup, SerializedType } from "../../interfaces";
import { DataLayerManager } from "../LayerManager/DataLayerManager";

export class View implements Group {
    private _itemDelegate: ItemDelegate;
    private _groupDelegate: GroupDelegate;

    constructor(name: string, layerManager: DataLayerManager, color: string | null = null) {
        this._groupDelegate = new GroupDelegate(this);
        this._groupDelegate.setColor(color);
        this._itemDelegate = new ItemDelegate(name, layerManager);
    }

    getItemDelegate(): ItemDelegate {
        return this._itemDelegate;
    }

    getGroupDelegate(): GroupDelegate {
        return this._groupDelegate;
    }

    serializeState(): SerializedGroup {
        return {
            ...this._itemDelegate.serializeState(),
            type: SerializedType.GROUP,
            color: this._groupDelegate.getColor() ?? "",
            children: this._groupDelegate.serializeChildren(),
        };
    }

    deserializeState(serialized: SerializedGroup) {
        this._itemDelegate.deserializeState(serialized);
        this._groupDelegate.setColor(serialized.color);
        this._groupDelegate.deserializeChildren(serialized.children);
    }
}
