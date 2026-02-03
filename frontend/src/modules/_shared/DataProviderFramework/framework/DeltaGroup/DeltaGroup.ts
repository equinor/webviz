import { UnsubscribeFunctionsManagerDelegate } from "@lib/utils/UnsubscribeFunctionsManagerDelegate";

import { GroupDelegate, GroupDelegateTopic } from "../../delegates/GroupDelegate";
import { ItemDelegate } from "../../delegates/ItemDelegate";
import { SettingsContextDelegateTopic } from "../../delegates/SettingsContextDelegate";
import type { ItemGroup } from "../../interfacesAndTypes/entities";
import { SerializedType, type SerializedDeltaGroup } from "../../interfacesAndTypes/serialization";
import { DataProvider } from "../DataProvider/DataProvider";
import type { DataProviderManager } from "../DataProviderManager/DataProviderManager";

export class DeltaGroup implements ItemGroup {
    private _itemDelegate: ItemDelegate;
    private _groupDelegate: GroupDelegate;
    private _unsubscribeFunctionsManagerDelegate: UnsubscribeFunctionsManagerDelegate =
        new UnsubscribeFunctionsManagerDelegate();
    private _childrenDataProviderSet: Set<DataProvider<any, any>> = new Set();

    constructor(name: string, dataProviderManager: DataProviderManager) {
        this._groupDelegate = new GroupDelegate(this);

        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "children",
            this._groupDelegate.getPublishSubscribeDelegate().makeSubscriberFunction(GroupDelegateTopic.CHILDREN)(
                () => {
                    this.handleChildrenChange();
                },
            ),
        );

        this._itemDelegate = new ItemDelegate(name, 1, dataProviderManager);
    }

    getItemDelegate(): ItemDelegate {
        return this._itemDelegate;
    }

    getGroupDelegate(): GroupDelegate {
        return this._groupDelegate;
    }

    deserializeState(serialized: SerializedDeltaGroup): void {
        this._itemDelegate.deserializeState(serialized);
        this._groupDelegate.deserializeChildren(serialized.children);
    }

    serializeState(): SerializedDeltaGroup {
        return {
            ...this._itemDelegate.serializeState(),
            type: SerializedType.DELTA_GROUP,
            children: this.getGroupDelegate().serializeChildren(),
        };
    }

    private handleChildrenChange(): void {
        this.clear();

        for (const child of this._groupDelegate.getChildren()) {
            if (child instanceof DataProvider) {
                child.setIsSubordinated(true);
                this._childrenDataProviderSet.add(child);

                this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
                    "providers",
                    child
                        .getSettingsContextDelegate()
                        .getPublishSubscribeDelegate()
                        .makeSubscriberFunction(SettingsContextDelegateTopic.SETTINGS_AND_STORED_DATA_CHANGED)(() => {
                        this.handleSettingsChange();
                    }),
                );
            }
        }
    }

    private handleSettingsChange(): void {
        // We need to check each provider's settings state to see if settings are valid.
        // Currently no specific action is needed when settings change.
    }

    private clear(): void {
        this._unsubscribeFunctionsManagerDelegate.unsubscribe("providers");

        for (const provider of this._childrenDataProviderSet) {
            provider.setIsSubordinated(false);
        }

        this._childrenDataProviderSet.clear();
    }
}
