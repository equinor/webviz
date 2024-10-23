import { v4 } from "uuid";

import { GroupDelegate } from "./GroupDelegate";
import { PublishSubscribe, PublishSubscribeDelegate } from "./PublishSubscribeDelegate";

import { LayerManager, LayerManagerTopic } from "../LayerManager";

export enum ItemDelegateTopic {
    NAME = "NAME",
    VISIBILITY = "VISIBILITY",
    EXPANDED = "EXPANDED",
    LAYER_MANAGER = "LAYER_MANAGER",
}

export type ItemDelegatePayloads = {
    [ItemDelegateTopic.NAME]: string;
    [ItemDelegateTopic.VISIBILITY]: boolean;
    [ItemDelegateTopic.EXPANDED]: boolean;
    [ItemDelegateTopic.LAYER_MANAGER]: LayerManager;
};

export class ItemDelegate implements PublishSubscribe<ItemDelegateTopic, ItemDelegatePayloads> {
    private _id: string;
    private _name: string;
    private _visible: boolean = true;
    private _expanded: boolean = true;
    private _parentGroup: GroupDelegate | null = null;
    private _layerManager: LayerManager | null = null;
    private _publishSubscribeHandler = new PublishSubscribeDelegate<ItemDelegateTopic>();

    constructor(name: string) {
        this._id = v4();
        this._name = name;
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
        this._name = name;
        this._publishSubscribeHandler.notifySubscribers(ItemDelegateTopic.NAME);
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

    setLayerManager(layerManager: LayerManager | null): void {
        this._layerManager = layerManager;
        this._publishSubscribeHandler.notifySubscribers(ItemDelegateTopic.LAYER_MANAGER);
    }

    getLayerManager(): LayerManager | null {
        return this._layerManager;
    }

    isVisible(): boolean {
        return this._visible;
    }

    setIsVisible(visible: boolean): void {
        this._visible = visible;
        this._publishSubscribeHandler.notifySubscribers(ItemDelegateTopic.VISIBILITY);
        if (this._layerManager) {
            this._layerManager.publishTopic(LayerManagerTopic.LAYER_DATA_REVISION);
        }
    }

    isExpanded(): boolean {
        return this._expanded;
    }

    setIsExpanded(expanded: boolean): void {
        this._expanded = expanded;
        this._publishSubscribeHandler.notifySubscribers(ItemDelegateTopic.EXPANDED);
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
            if (topic === ItemDelegateTopic.LAYER_MANAGER) {
                return this._layerManager;
            }
        };
        return snapshotGetter;
    }

    getPublishSubscribeHandler(): PublishSubscribeDelegate<ItemDelegateTopic> {
        return this._publishSubscribeHandler;
    }
}
