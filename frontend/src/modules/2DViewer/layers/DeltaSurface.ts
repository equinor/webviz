import { GroupDelegate, GroupDelegateTopic } from "./delegates/GroupDelegate";
import { ItemDelegate } from "./delegates/ItemDelegate";
import { LayerDelegate } from "./delegates/LayerDelegate";
import { SettingsContextDelegateTopic } from "./delegates/SettingsContextDelegate";
import { Group, instanceofLayer } from "./interfaces";

export class DeltaSurface implements Group {
    private _itemDelegate: ItemDelegate;
    private _groupDelegate: GroupDelegate;
    private _unsubscribeFuncs: (() => void)[] = [];
    private _childrenLayerDelegateSet: Set<LayerDelegate<any, any>> = new Set();

    constructor(name: string) {
        this._groupDelegate = new GroupDelegate(this);
        this._groupDelegate.getPublishSubscribeHandler().subscribe(GroupDelegateTopic.CHILDREN, () => {
            this.handleChildrenChange();
        });
        this._groupDelegate.setColor("rgb(220, 210, 180)");
        this._itemDelegate = new ItemDelegate(name);
    }

    private handleChildrenChange(): void {
        for (const unsubscribeFunc of this._unsubscribeFuncs) {
            unsubscribeFunc();
        }

        for (const layerDelegate of this._childrenLayerDelegateSet) {
            layerDelegate.setIsSubordinated(false);
        }

        this._unsubscribeFuncs = [];
        this._childrenLayerDelegateSet.clear();

        for (const child of this._groupDelegate.getChildren()) {
            if (instanceofLayer(child)) {
                child.getLayerDelegate().setIsSubordinated(true);
                const layerDelegate = child.getLayerDelegate();
                this._childrenLayerDelegateSet.add(layerDelegate);
                this._unsubscribeFuncs.push(
                    layerDelegate
                        .getSettingsContext()
                        .getDelegate()
                        .getPublishSubscribeHandler()
                        .subscribe(SettingsContextDelegateTopic.SETTINGS_CHANGED, () => {
                            this.handleSettingsChange();
                        })
                );
            }
        }
    }

    private handleSettingsChange(): void {
        console.debug("Settings changed - would refetch data");
        // Fetch data
    }

    getItemDelegate(): ItemDelegate {
        return this._itemDelegate;
    }

    getGroupDelegate(): GroupDelegate {
        return this._groupDelegate;
    }
}
