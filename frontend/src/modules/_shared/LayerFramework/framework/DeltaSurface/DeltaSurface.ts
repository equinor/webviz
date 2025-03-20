import { GroupDelegate, GroupDelegateTopic } from "../../delegates/GroupDelegate";
import { ItemDelegate } from "../../delegates/ItemDelegate";
import { SettingsContextDelegateTopic } from "../../delegates/SettingsContextDelegate";
import { UnsubscribeHandlerDelegate } from "../../delegates/UnsubscribeHandlerDelegate";
import { ItemGroup } from "../../interfacesAndTypes/entitites";
import { SerializedDeltaSurface, SerializedType } from "../../interfacesAndTypes/serialization";
import { DataLayer } from "../DataLayer/DataLayer";
import { DataLayerManager } from "../DataLayerManager/DataLayerManager";

export class DeltaSurface implements ItemGroup {
    private _itemDelegate: ItemDelegate;
    private _groupDelegate: GroupDelegate;
    private _unsubscribeHandler: UnsubscribeHandlerDelegate = new UnsubscribeHandlerDelegate();
    private _childrenLayerDelegateSet: Set<DataLayer<any, any>> = new Set();

    constructor(name: string, layerManager: DataLayerManager) {
        this._groupDelegate = new GroupDelegate(this);

        this._unsubscribeHandler.registerUnsubscribeFunction(
            "children",
            this._groupDelegate.getPublishSubscribeDelegate().makeSubscriberFunction(GroupDelegateTopic.CHILDREN)(
                () => {
                    this.handleChildrenChange();
                },
            ),
        );

        this._groupDelegate.setColor("rgb(220, 210, 180)");
        this._itemDelegate = new ItemDelegate(name, 1, layerManager);
    }

    private handleChildrenChange(): void {
        this._unsubscribeHandler.unsubscribe("layer-delegates");

        for (const layerDelegate of this._childrenLayerDelegateSet) {
            layerDelegate.setIsSubordinated(false);
        }

        this._childrenLayerDelegateSet.clear();

        for (const child of this._groupDelegate.getChildren()) {
            if (child instanceof DataLayer) {
                child.setIsSubordinated(true);
                this._childrenLayerDelegateSet.add(child);

                this._unsubscribeHandler.registerUnsubscribeFunction(
                    "layer-delegates",
                    child
                        .getSettingsContextDelegate()
                        .getPublishSubscribeDelegate()
                        .makeSubscriberFunction(SettingsContextDelegateTopic.SETTINGS_CHANGED)(() => {
                        this.handleSettingsChange();
                    }),
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
