import { GroupDelegate, GroupDelegateTopic } from "./delegates/GroupDelegate";
import { ItemDelegate } from "./delegates/ItemDelegate";
import { LayerDelegate } from "./delegates/LayerDelegate";
import { SettingsContextDelegateTopic } from "./delegates/SettingsContextDelegate";
import { UnsubscribeHandlerDelegate } from "./delegates/UnsubscribeHandlerDelegate";
import { Group, SerializedDeltaSurface, instanceofLayer } from "./interfaces";

export class DeltaSurface implements Group {
    private _itemDelegate: ItemDelegate;
    private _groupDelegate: GroupDelegate;
    private _unsubscribeHandler: UnsubscribeHandlerDelegate = new UnsubscribeHandlerDelegate();
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
        this._unsubscribeHandler.unsubscribe("layer-delegates");

        for (const layerDelegate of this._childrenLayerDelegateSet) {
            layerDelegate.setIsSubordinated(false);
        }

        this._childrenLayerDelegateSet.clear();

        for (const child of this._groupDelegate.getChildren()) {
            if (instanceofLayer(child)) {
                child.getLayerDelegate().setIsSubordinated(true);
                const layerDelegate = child.getLayerDelegate();
                this._childrenLayerDelegateSet.add(layerDelegate);
                this._unsubscribeHandler.registerUnsubscribeFunction(
                    "layer-delegates",
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

    serializeState(): SerializedDeltaSurface {
        return {
            id: this._itemDelegate.getId(),
            type: "delta-surface",
            name: this._itemDelegate.getName(),
            children: this.getGroupDelegate().serializeChildren(),
        };
    }
}
