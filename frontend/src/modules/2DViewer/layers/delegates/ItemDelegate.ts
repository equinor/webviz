import { isEqual } from "lodash";
import { v4 } from "uuid";

import { GroupDelegate } from "./GroupDelegate";
import { PublishSubscribe, PublishSubscribeDelegate } from "./PublishSubscribeDelegate";

import { LayerManager, LayerManagerTopic } from "../LayerManager";

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

export class ItemDelegate implements PublishSubscribe<ItemDelegateTopic, ItemDelegatePayloads> {
    private _id: string;
    private _name: string;
    private _visible: boolean = true;
    private _expanded: boolean = true;
    private _parentGroup: GroupDelegate | null = null;
    private _layerManager: LayerManager;
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<ItemDelegateTopic>();

    constructor(name: string, layerManager: LayerManager) {
        this._id = v4();
        this._name = name;
        this._layerManager = layerManager;
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

    getParentGroup(): GroupDelegate | null {
        return this._parentGroup;
    }

    setParentGroup(parentGroup: GroupDelegate | null): void {
        this._parentGroup = parentGroup;
    }

    getLayerManager(): LayerManager {
        return this._layerManager;
    }

    isVisible(): boolean {
        return this._visible;
    }

    setIsVisible(visible: boolean): void {
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

    setIsExpanded(expanded: boolean): void {
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

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<ItemDelegateTopic> {
        return this._publishSubscribeDelegate;
    }
}
