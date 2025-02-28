import { isEqual } from "lodash";
import { v4 } from "uuid";

import { GroupDelegate } from "./GroupDelegate";

import { PublishSubscribe, PublishSubscribeDelegate } from "../../utils/PublishSubscribeDelegate";
import { DataLayerManager, LayerManagerTopic } from "../framework/DataLayerManager/DataLayerManager";
import { SerializedItem } from "../interfaces";

export enum ItemDelegateTopic {
    NAME = "NAME",
    VISIBILITY = "VISIBILITY",
    EXPANDED = "EXPANDED",
}

export type ItemDelegatePayloads = {
    [ItemDelegateTopic.NAME]: string;
    [ItemDelegateTopic.VISIBILITY]: boolean;
    [ItemDelegateTopic.EXPANDED]: boolean;
};

/*
 * The ItemDelegate class is responsible for managing the basic properties of an item.
 * It provides methods for setting and getting the id, parent group, name, visibility, and expansion state of the item.
 */
export class ItemDelegate implements PublishSubscribe<ItemDelegatePayloads> {
    private _id: string;
    private _name: string;
    private _visible: boolean = true;
    private _expanded: boolean = true;
    private _order: number = 0;
    private _parentGroup: GroupDelegate | null = null;
    private _layerManager: DataLayerManager;
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<ItemDelegatePayloads>();

    constructor(name: string, order: number, layerManager: DataLayerManager) {
        this._id = v4();
        this._layerManager = layerManager;
        this._name = this.makeUniqueName(name);
        this._order = order;
    }

    setId(id: string): void {
        this._id = id;
    }

    getId(): string {
        return this._id;
    }

    getName(): string {
        return this._name;
    }

    setName(name: string): void {
        if (isEqual(this._name, name)) {
            return;
        }

        this._name = name;
        this._publishSubscribeDelegate.notifySubscribers(ItemDelegateTopic.NAME);
        if (this._layerManager) {
            this._layerManager.publishTopic(LayerManagerTopic.LAYER_DATA_REVISION);
        }
    }

    getOrder(): number {
        return this._order;
    }

    getParentGroup(): GroupDelegate | null {
        return this._parentGroup;
    }

    setParentGroup(parentGroup: GroupDelegate | null): void {
        this._parentGroup = parentGroup;
    }

    getLayerManager(): DataLayerManager {
        return this._layerManager;
    }

    isVisible(): boolean {
        return this._visible;
    }

    setVisible(visible: boolean): void {
        if (isEqual(this._visible, visible)) {
            return;
        }

        this._visible = visible;
        this._publishSubscribeDelegate.notifySubscribers(ItemDelegateTopic.VISIBILITY);
        if (this._layerManager) {
            this._layerManager.publishTopic(LayerManagerTopic.LAYER_DATA_REVISION);
        }
    }

    isExpanded(): boolean {
        return this._expanded;
    }

    setExpanded(expanded: boolean): void {
        if (isEqual(this._expanded, expanded)) {
            return;
        }

        this._expanded = expanded;
        this._publishSubscribeDelegate.notifySubscribers(ItemDelegateTopic.EXPANDED);
    }

    makeSnapshotGetter<T extends ItemDelegateTopic>(topic: T): () => ItemDelegatePayloads[T] {
        const snapshotGetter = (): any => {
            if (topic === ItemDelegateTopic.NAME) {
                return this._name;
            }
            if (topic === ItemDelegateTopic.VISIBILITY) {
                return this._visible;
            }
            if (topic === ItemDelegateTopic.EXPANDED) {
                return this._expanded;
            }
        };
        return snapshotGetter;
    }

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<ItemDelegatePayloads> {
        return this._publishSubscribeDelegate;
    }

    serializeState(): Omit<SerializedItem, "type"> {
        return {
            id: this._id,
            name: this._name,
            visible: this._visible,
            expanded: this._expanded,
        };
    }

    deserializeState(state: Omit<SerializedItem, "type">): void {
        this._id = state.id;
        this._name = state.name;
        this._visible = state.visible;
        this._expanded = state.expanded;
    }

    private makeUniqueName(candidate: string): string {
        const groupDelegate = this._layerManager?.getGroupDelegate();
        if (!groupDelegate) {
            return candidate;
        }
        const existingNames = groupDelegate
            .getDescendantItems(() => true)
            .map((item) => item.getItemDelegate().getName());
        let uniqueName = candidate;
        let counter = 1;
        while (existingNames.includes(uniqueName)) {
            uniqueName = `${candidate} (${counter})`;
            counter++;
        }
        return uniqueName;
    }
}
