import { LayerManagerTopic } from "../LayerManager";
import { PublishSubscribe, PublishSubscribeHandler } from "../PublishSubscribeHandler";
import { Item, instanceofGroup, instanceofLayer } from "../interfaces";

export enum GroupBaseTopic {
    CHILDREN = "CHILDREN",
}

export type GroupBaseTopicPayloads = {
    [GroupBaseTopic.CHILDREN]: Item[];
};

export class GroupDelegate implements PublishSubscribe<GroupBaseTopic, GroupBaseTopicPayloads> {
    private _owner: Item | null;
    private _color: string | null = null;
    private _children: Item[] = [];
    private _publishSubscribeHandler = new PublishSubscribeHandler<GroupBaseTopic>();

    constructor(owner: Item | null) {
        this._owner = owner;
    }

    getColor(): string | null {
        return this._color;
    }

    setColor(color: string | null) {
        this._color = color;
    }

    private takeOwnershipOfChild(child: Item) {
        const layerManager = this._owner?.getItemDelegate().getLayerManager() ?? null;

        child.getItemDelegate().setParentGroup(this);
        child.getItemDelegate().setLayerManager(layerManager);

        if (instanceofLayer(child)) {
            child.getLayerDelegate().setLayerManager(layerManager);
        }

        this._publishSubscribeHandler.notifySubscribers(GroupBaseTopic.CHILDREN);
        this.notifyManagerOfItemChange();
    }

    private disposeOwnershipOfChild(child: Item) {
        child.getItemDelegate().setParentGroup(null);
        child.getItemDelegate().setLayerManager(null);

        if (instanceofLayer(child)) {
            child.getLayerDelegate().setLayerManager(null);
        }

        this._publishSubscribeHandler.notifySubscribers(GroupBaseTopic.CHILDREN);
        this.notifyManagerOfItemChange();
    }

    private notifyManagerOfItemChange() {
        const layerManager = this._owner?.getItemDelegate().getLayerManager();

        if (!layerManager) {
            return;
        }
        layerManager.publishTopic(LayerManagerTopic.ITEMS_CHANGED);
    }

    prependChild(child: Item) {
        this._children = [child, ...this._children];
        this.takeOwnershipOfChild(child);
    }

    appendChild(child: Item) {
        this._children = [...this._children, child];
        this.takeOwnershipOfChild(child);
    }

    insertChild(child: Item, index: number) {
        this._children = [...this._children.slice(0, index), child, ...this._children.slice(index)];
        this.takeOwnershipOfChild(child);
    }

    removeChild(child: Item) {
        this._children = this._children.filter((c) => c !== child);
        this.disposeOwnershipOfChild(child);
    }

    moveChild(child: Item, index: number) {
        const currentIndex = this._children.indexOf(child);
        if (currentIndex === -1) {
            throw new Error("Child not found");
        }

        this._children = [...this._children.slice(0, currentIndex), ...this._children.slice(currentIndex + 1)];

        this._children = [...this._children.slice(0, index), child, ...this._children.slice(index)];
        this._publishSubscribeHandler.notifySubscribers(GroupBaseTopic.CHILDREN);
    }

    getChildren() {
        return this._children;
    }

    findChildren(predicate: (item: Item) => boolean): Item[] {
        return this._children.filter(predicate);
    }

    findDescendantById(id: string): Item | undefined {
        for (const child of this._children) {
            if (child.getItemDelegate().getId() === id) {
                return child;
            }

            if (instanceofGroup(child)) {
                const descendant = child.getGroupDelegate().findDescendantById(id);
                if (descendant) {
                    return descendant;
                }
            }
        }

        return undefined;
    }

    getAncestorAndSiblingItems(predicate: (item: Item) => boolean): Item[] {
        const items: Item[] = [];
        for (const child of this._children) {
            if (predicate(child)) {
                items.push(child);
            }
        }
        const parentGroup = this._owner?.getItemDelegate().getParentGroup();
        if (parentGroup) {
            items.push(...parentGroup.getAncestorAndSiblingItems(predicate));
        }

        return items;
    }

    getDescendantItems(predicate: (item: Item) => boolean): Item[] {
        const items: Item[] = [];
        for (const child of this._children) {
            if (predicate(child)) {
                items.push(child);
            }

            if (instanceofGroup(child)) {
                items.push(...child.getGroupDelegate().getDescendantItems(predicate));
            }
        }

        return items;
    }

    makeSnapshotGetter<T extends GroupBaseTopic>(topic: T): () => GroupBaseTopicPayloads[T] {
        const snapshotGetter = (): any => {
            if (topic === GroupBaseTopic.CHILDREN) {
                return this._children;
            }
        };

        return snapshotGetter;
    }

    getPublishSubscribeHandler(): PublishSubscribeHandler<GroupBaseTopic> {
        return this._publishSubscribeHandler;
    }
}
