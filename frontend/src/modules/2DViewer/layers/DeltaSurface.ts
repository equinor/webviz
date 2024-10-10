import { GroupDelegate } from "./delegates/GroupDelegate";
import { ItemDelegate } from "./delegates/ItemDelegate";
import { Group } from "./interfaces";

export class DeltaSurface implements Group {
    private _itemDelegate: ItemDelegate;
    private _groupDelegate: GroupDelegate;

    constructor(name: string) {
        this._groupDelegate = new GroupDelegate(this);
        this._groupDelegate.setColor("rgb(220, 210, 180)");
        this._itemDelegate = new ItemDelegate(name);
    }

    getItemDelegate(): ItemDelegate {
        return this._itemDelegate;
    }

    getGroupDelegate(): GroupDelegate {
        return this._groupDelegate;
    }
}
