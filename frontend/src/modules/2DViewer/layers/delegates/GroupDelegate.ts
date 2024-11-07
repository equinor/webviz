import { ItemDelegateTopic } from "./ItemDelegate";
import { PublishSubscribe, PublishSubscribeDelegate } from "./PublishSubscribeDelegate";

import { DeserializationFactory } from "../DeserializationFactory";
import { LayerManagerTopic } from "../LayerManager";
import { SharedSetting } from "../SharedSetting";
import { Item, SerializedItem, instanceofGroup, instanceofLayer } from "../interfaces";

export enum GroupDelegateTopic {
    CHILDREN = "CHILDREN",
    TREE_REVISION_NUMBER = "TREE_REVISION_NUMBER",
    CHILDREN_EXPANSION_STATES = "CHILDREN_EXPANSION_STATES",
}

export type GroupDelegateTopicPayloads = {
    [GroupDelegateTopic.CHILDREN]: Item[];
    [GroupDelegateTopic.TREE_REVISION_NUMBER]: number;
    [GroupDelegateTopic.CHILDREN_EXPANSION_STATES]: { [id: string]: boolean };
};

export class GroupDelegate implements PublishSubscribe<GroupDelegateTopic, GroupDelegateTopicPayloads> {
    private _owner: Item | null;
    private _color: string | null = null;
    private _children: Item[] = [];
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<GroupDelegateTopic>();
    private _subscriptions: Map<string, Set<() => void>> = new Map();
    private _treeRevisionNumber: number = 0;

    constructor(owner: Item | null) {
        this._owner = owner;
    }

    getColor(): string | null {
        return this._color;
    }

    setColor(color: string | null) {
        this._color = color;
    }

    private incrementTreeRevisionNumber() {
        this._treeRevisionNumber++;
        this._publishSubscribeDelegate.notifySubscribers(GroupDelegateTopic.TREE_REVISION_NUMBER);
    }

    protected takeOwnershipOfChild(child: Item) {
        child.getItemDelegate().setParentGroup(this);

        const subscriptionSet = new Set<() => void>();

        if (instanceofLayer(child)) {
            subscriptionSet.add(
                child
                    .getItemDelegate()
                    .getPublishSubscribeDelegate()
                    .makeSubscriberFunction(ItemDelegateTopic.EXPANDED)(() => {
                    this._publishSubscribeDelegate.notifySubscribers(GroupDelegateTopic.CHILDREN_EXPANSION_STATES);
                })
            );
        }

        if (instanceofGroup(child)) {
            /*
            for (const grandchild of child.getGroupDelegate().getChildren()) {
                child.getGroupDelegate().takeOwnershipOfChild(grandchild);
            }
                */

            subscriptionSet.add(
                child
                    .getGroupDelegate()
                    .getPublishSubscribeDelegate()
                    .makeSubscriberFunction(GroupDelegateTopic.CHILDREN)(() => {
                    this.incrementTreeRevisionNumber();
                })
            );
            subscriptionSet.add(
                child
                    .getGroupDelegate()
                    .getPublishSubscribeDelegate()
                    .makeSubscriberFunction(GroupDelegateTopic.TREE_REVISION_NUMBER)(() => {
                    this.incrementTreeRevisionNumber();
                })
            );
        }

        this._subscriptions.set(child.getItemDelegate().getId(), subscriptionSet);

        this._publishSubscribeDelegate.notifySubscribers(GroupDelegateTopic.CHILDREN);
        this.incrementTreeRevisionNumber();
    }

    private disposeOwnershipOfChild(child: Item) {
        if (instanceofGroup(child)) {
            const unsubscribeFuncs = this._subscriptions.get(child.getItemDelegate().getId());
            if (unsubscribeFuncs) {
                for (const unsubscribeFunc of unsubscribeFuncs) {
                    unsubscribeFunc();
                }
            }
        }

        child.getItemDelegate().setParentGroup(null);

        if (child instanceof SharedSetting) {
            this._owner?.getItemDelegate().getLayerManager().publishTopic(LayerManagerTopic.SETTINGS_CHANGED);
        }

        this._publishSubscribeDelegate.notifySubscribers(GroupDelegateTopic.CHILDREN);
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
        this.incrementTreeRevisionNumber();
    }

    clearChildren() {
        for (const child of this._children) {
            this.disposeOwnershipOfChild(child);
        }
        this._children = [];
        this._publishSubscribeDelegate.notifySubscribers(GroupDelegateTopic.CHILDREN);
        this.incrementTreeRevisionNumber();
    }

    moveChild(child: Item, index: number) {
        const currentIndex = this._children.indexOf(child);
        if (currentIndex === -1) {
            throw new Error("Child not found");
        }

        this._children = [...this._children.slice(0, currentIndex), ...this._children.slice(currentIndex + 1)];

        this._children = [...this._children.slice(0, index), child, ...this._children.slice(index)];
        this._publishSubscribeDelegate.notifySubscribers(GroupDelegateTopic.CHILDREN);
        this.incrementTreeRevisionNumber();
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

    makeSnapshotGetter<T extends GroupDelegateTopic>(topic: T): () => GroupDelegateTopicPayloads[T] {
        const snapshotGetter = (): any => {
            if (topic === GroupDelegateTopic.CHILDREN) {
                return this._children;
            }
            if (topic === GroupDelegateTopic.TREE_REVISION_NUMBER) {
                return this._treeRevisionNumber;
            }
            if (topic === GroupDelegateTopic.CHILDREN_EXPANSION_STATES) {
                const expansionState: { [id: string]: boolean } = {};
                for (const child of this._children) {
                    if (instanceofGroup(child)) {
                        expansionState[child.getItemDelegate().getId()] = child.getItemDelegate().isExpanded();
                    }
                }
                return expansionState;
            }
        };

        return snapshotGetter;
    }

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<GroupDelegateTopic> {
        return this._publishSubscribeDelegate;
    }

    serializeChildren(): SerializedItem[] {
        return this._children.map((child) => child.serializeState());
    }

    deserializeChildren(children: SerializedItem[]) {
        if (!this._owner) {
            throw new Error("Owner not set");
        }

        const factory = new DeserializationFactory(this._owner.getItemDelegate().getLayerManager());
        for (const child of children) {
            const item = factory.makeItem(child);
            this.appendChild(item);
        }
    }
}
