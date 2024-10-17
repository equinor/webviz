import { GroupDelegate } from "./delegates/GroupDelegate";
import { ItemDelegate } from "./delegates/ItemDelegate";
import { Group } from "./interfaces";

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
}
