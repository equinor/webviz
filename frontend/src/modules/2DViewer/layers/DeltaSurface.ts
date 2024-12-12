import { LayerManager } from "./LayerManager";
import { GroupDelegate, GroupDelegateTopic } from "./delegates/GroupDelegate";
import { ItemDelegate } from "./delegates/ItemDelegate";
import { LayerDelegate } from "./delegates/LayerDelegate";
import { SettingsContextDelegateTopic } from "./delegates/SettingsContextDelegate";
import { UnsubscribeHandlerDelegate } from "./delegates/UnsubscribeHandlerDelegate";
import { Group, SerializedDeltaSurface, SerializedType, instanceofLayer } from "./interfaces";

export class DeltaSurface implements Group {
    private _itemDelegate: ItemDelegate;
    private _groupDelegate: GroupDelegate;
    private _unsubscribeHandler: UnsubscribeHandlerDelegate = new UnsubscribeHandlerDelegate();
    private _childrenLayerDelegateSet: Set<LayerDelegate<any, any>> = new Set();

    constructor(name: string, layerManager: LayerManager) {
        this._groupDelegate = new GroupDelegate(this);

        this._unsubscribeHandler.registerUnsubscribeFunction(
            "children",
            this._groupDelegate.getPublishSubscribeDelegate().makeSubscriberFunction(GroupDelegateTopic.CHILDREN)(
                () => {
                    this.handleChildrenChange();
                }
            )
        );

        this._groupDelegate.setColor("rgb(220, 210, 180)");
        this._itemDelegate = new ItemDelegate(name, layerManager);
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
                        .getPublishSubscribeDelegate()
                        .makeSubscriberFunction(SettingsContextDelegateTopic.SETTINGS_CHANGED)(() => {
                        this.handleSettingsChange();
                    })
                );
            }
        }
    }

    private handleSettingsChange(): void {
        console.debug("Settings changed - would refetch data");
    }

    getItemDelegate(): ItemDelegate {
        return this._itemDelegate;
    }

    getGroupDelegate(): GroupDelegate {
        return this._groupDelegate;
    }

    deserializeState(serialized: SerializedDeltaSurface): void {
        this._itemDelegate.deserializeState(serialized);
        this._groupDelegate.deserializeChildren(serialized.children);
    }

    serializeState(): SerializedDeltaSurface {
        return {
            ...this._itemDelegate.serializeState(),
            type: SerializedType.DELTA_SURFACE,
            children: this.getGroupDelegate().serializeChildren(),
        };
    }
}
