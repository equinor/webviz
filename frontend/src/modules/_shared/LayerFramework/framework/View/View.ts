import { GroupDelegate } from "../../delegates/GroupDelegate";
import { ItemDelegate } from "../../delegates/ItemDelegate";
import { Group, SerializedType, SerializedView } from "../../interfaces";
import { DataLayerManager } from "../DataLayerManager/DataLayerManager";

export type ViewParams = {
    name: string;
    layerManager: DataLayerManager;
    color?: string | null;
    type?: string;
};

export class View implements Group {
    private _itemDelegate: ItemDelegate;
    private _groupDelegate: GroupDelegate;
    private _type: string;

    constructor(params: ViewParams) {
        const { name, layerManager, color = null, type = "default" } = params;
        this._groupDelegate = new GroupDelegate(this);
        this._groupDelegate.setColor(color);
        this._itemDelegate = new ItemDelegate(name, layerManager);

        this._type = type;
    }

    getItemDelegate(): ItemDelegate {
        return this._itemDelegate;
    }

    getGroupDelegate(): GroupDelegate {
        return this._groupDelegate;
    }

    getType(): string {
        return this._type;
    }

    serializeState(): SerializedView {
        return {
            ...this._itemDelegate.serializeState(),
            type: SerializedType.VIEW,
            color: this._groupDelegate.getColor() ?? "",
            children: this._groupDelegate.serializeChildren(),
        };
    }

    deserializeState(serialized: SerializedView) {
        this._itemDelegate.deserializeState(serialized);
        this._groupDelegate.setColor(serialized.color);
        this._groupDelegate.deserializeChildren(serialized.children);
    }
}
