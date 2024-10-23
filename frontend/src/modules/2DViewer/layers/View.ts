import { GroupDelegate } from "./delegates/GroupDelegate";
import { ItemDelegate } from "./delegates/ItemDelegate";
import { Group, SerializedView } from "./interfaces";

export class View implements Group {
    private _itemDelegate: ItemDelegate;
    private _groupDelegate: GroupDelegate;

    constructor(name: string, color: string | null = null) {
        this._groupDelegate = new GroupDelegate(this);
        this._groupDelegate.setColor(color);
        this._itemDelegate = new ItemDelegate(name);
    }

    getItemDelegate(): ItemDelegate {
        return this._itemDelegate;
    }

    getGroupDelegate(): GroupDelegate {
        return this._groupDelegate;
    }

    serializeState(): SerializedView {
        return {
            id: this._itemDelegate.getId(),
            type: "view",
            color: this._groupDelegate.getColor() ?? "",
            name: this._itemDelegate.getName(),
            children: this._groupDelegate.serializeChildren(),
        };
    }

    deserializeState(serialized: SerializedView) {
        this._itemDelegate.setName(serialized.name);
        this._itemDelegate.setId(serialized.id);
        this._groupDelegate.setColor(serialized.color);
        this._groupDelegate.deserializeChildren(serialized.children);
    }
}
