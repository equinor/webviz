import { LayerManager } from "../LayerManager";
import { GroupDelegate } from "../delegates/GroupDelegate";
import { ItemDelegate } from "../delegates/ItemDelegate";
import { Group } from "../interfaces";

export class View implements Group {
    private _groupDelegate: GroupDelegate;
    private _itemDelegate: ItemDelegate;

    constructor(layerManager: LayerManager, name: string) {
        this._itemDelegate = new ItemDelegate(name);
        this._groupDelegate = new GroupDelegate(layerManager);
    }

    getItemDelegate(): ItemDelegate {
        return this._itemDelegate;
    }

    getGroupDelegate(): GroupDelegate {
        return this._groupDelegate;
    }
}
