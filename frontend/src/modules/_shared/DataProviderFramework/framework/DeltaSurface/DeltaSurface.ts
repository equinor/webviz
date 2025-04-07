import { GroupDelegate, GroupDelegateTopic } from "../../delegates/GroupDelegate";
import { ItemDelegate } from "../../delegates/ItemDelegate";
import { SettingsContextDelegateTopic } from "../../delegates/SettingsContextDelegate";
import { UnsubscribeHandlerDelegate } from "../../delegates/UnsubscribeHandlerDelegate";
import type { ItemGroup } from "../../interfacesAndTypes/entities";
import type { SerializedDeltaSurface } from "../../interfacesAndTypes/serialization";
import { SerializedType } from "../../interfacesAndTypes/serialization";
import { DataProvider } from "../DataProvider/DataProvider";
import type { DataProviderManager } from "../DataProviderManager/DataProviderManager";

export class DeltaSurface implements ItemGroup {
    private _itemDelegate: ItemDelegate;
    private _groupDelegate: GroupDelegate;
    private _unsubscribeHandler: UnsubscribeHandlerDelegate = new UnsubscribeHandlerDelegate();
    private _childrenDataProviderSet: Set<DataProvider<any, any>> = new Set();

    constructor(name: string, dataProviderManager: DataProviderManager) {
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
        this._itemDelegate = new ItemDelegate(name, 1, dataProviderManager);
    }

    private handleChildrenChange(): void {
        this._unsubscribeHandler.unsubscribe("providers");

        for (const provider of this._childrenDataProviderSet) {
            provider.setIsSubordinated(false);
        }

        this._childrenDataProviderSet.clear();

        for (const child of this._groupDelegate.getChildren()) {
            if (child instanceof DataProvider) {
                child.setIsSubordinated(true);
                this._childrenDataProviderSet.add(child);

                this._unsubscribeHandler.registerUnsubscribeFunction(
                    "providers",
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
