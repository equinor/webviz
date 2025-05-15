import type { PublishSubscribe } from "../../utils/PublishSubscribeDelegate";
import { PublishSubscribeDelegate } from "../../utils/PublishSubscribeDelegate";
import { DataProvider } from "../framework/DataProvider/DataProvider";
import { DataProviderManagerTopic } from "../framework/DataProviderManager/DataProviderManager";
import { Group } from "../framework/Group/Group";
import { SharedSetting } from "../framework/SharedSetting/SharedSetting";
import { DeserializationAssistant } from "../framework/utils/DeserializationAssistant";
import { instanceofItemGroup, type Item } from "../interfacesAndTypes/entities";
import type { SerializedItem } from "../interfacesAndTypes/serialization";

import { ItemDelegateTopic } from "./ItemDelegate";
import { UnsubscribeHandlerDelegate } from "./UnsubscribeHandlerDelegate";

export enum GroupDelegateTopic {
    CHILDREN = "CHILDREN",
    TREE_REVISION_NUMBER_ABOUT_TO_CHANGE = "TREE_REVISION_NUMBER_ABOUT_TO_CHANGE",
    TREE_REVISION_NUMBER = "TREE_REVISION_NUMBER",
    COLOR = "COLOR",
    CHILDREN_EXPANSION_STATES = "CHILDREN_EXPANSION_STATES",
}

export type GroupDelegateTopicPayloads = {
    [GroupDelegateTopic.CHILDREN]: Item[];
    [GroupDelegateTopic.TREE_REVISION_NUMBER]: number;
    [GroupDelegateTopic.TREE_REVISION_NUMBER_ABOUT_TO_CHANGE]: void;
    [GroupDelegateTopic.COLOR]: string | null;
    [GroupDelegateTopic.CHILDREN_EXPANSION_STATES]: { [id: string]: boolean };
};

/*
 * The GroupDelegate class is responsible for managing the children of a group item.
 * It provides methods for adding, removing, and moving children, as well as for serializing and deserializing children.
 * The class also provides methods for finding children and descendants based on a predicate.
 */
export class GroupDelegate implements PublishSubscribe<GroupDelegateTopicPayloads> {
    private _owner: Item | null;
    private _color: string | null = null;
    private _children: Item[] = [];
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<GroupDelegateTopicPayloads>();
    private _unsubscribeHandlerDelegate = new UnsubscribeHandlerDelegate();
    private _treeRevisionNumber: number = 0;
    private _deserializing = false;

    constructor(owner: Item | null) {
        this._owner = owner;
    }

    getColor(): string | null {
        return this._color;
    }

    setColor(color: string | null) {
        this._color = color;
        this.publishTopic(GroupDelegateTopic.COLOR);
        this.incrementTreeRevisionNumber();
    }

    prependChild(child: Item) {
        const childOrder = child.getItemDelegate().getOrder();
        const [startIndex] = this.getRangeOfChildrenWithOrder(childOrder);
        if (startIndex === -1) {
            this.insertChild(child, 0);
        } else {
            this.insertChild(child, startIndex);
        }
    }

    appendChild(child: Item) {
        const childOrder = child.getItemDelegate().getOrder();
        const [, endIndex] = this.getRangeOfChildrenWithOrder(childOrder);
        this.insertChild(child, endIndex + 1);
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
        this.publishTopic(GroupDelegateTopic.CHILDREN);
        this.incrementTreeRevisionNumber();
    }

    moveChild(child: Item, index: number) {
        const currentIndex = this._children.indexOf(child);
        if (currentIndex === -1) {
            throw new Error("Child not found");
        }

        this._children = [...this._children.slice(0, currentIndex), ...this._children.slice(currentIndex + 1)];

        this._children = [...this._children.slice(0, index), child, ...this._children.slice(index)];
        this.publishTopic(GroupDelegateTopic.CHILDREN);
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

            if (child instanceof Group) {
                const descendant = child.getGroupDelegate().findDescendantById(id);
                if (descendant) {
                    return descendant;
                }
            }
        }

        return undefined;
    }

    getAncestors(predicate: (group: Item) => boolean): Item[] {
        const items: Item[] = [];
        if (this._owner) {
            if (predicate(this._owner)) {
                items.push(this._owner);
            }

            const parentGroup = this._owner?.getItemDelegate().getParentGroup();
            if (parentGroup) {
                items.push(...parentGroup.getAncestors(predicate));
            }
        }

        return items;
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

            if (child instanceof Group) {
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
            if (topic === GroupDelegateTopic.TREE_REVISION_NUMBER_ABOUT_TO_CHANGE) {
                return;
            }
            if (topic === GroupDelegateTopic.TREE_REVISION_NUMBER) {
                return this._treeRevisionNumber;
            }
            if (topic === GroupDelegateTopic.CHILDREN_EXPANSION_STATES) {
                const expansionState: { [id: string]: boolean } = {};
                for (const child of this._children) {
                    if (child instanceof Group) {
                        expansionState[child.getItemDelegate().getId()] = child.getItemDelegate().isExpanded();
                    }
                }
                return expansionState;
            }
            if (topic === GroupDelegateTopic.COLOR) {
                return this._color;
            }
        };

        return snapshotGetter;
    }

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<GroupDelegateTopicPayloads> {
        return this._publishSubscribeDelegate;
    }

    serializeChildren(): SerializedItem[] {
        return this._children.map((child) => child.serializeState());
    }

    deserializeChildren(children: SerializedItem[]) {
        if (!this._owner) {
            throw new Error("Owner not set");
        }

        this._deserializing = true;
        const factory = new DeserializationAssistant(this._owner.getItemDelegate().getDataProviderManager());
        for (const child of children) {
            const item = factory.makeItem(child);
            this.appendChild(item);
        }
        this._deserializing = false;
    }

    private incrementTreeRevisionNumber() {
        this.publishTopic(GroupDelegateTopic.TREE_REVISION_NUMBER_ABOUT_TO_CHANGE);
        this._treeRevisionNumber++;
        this.publishTopic(GroupDelegateTopic.TREE_REVISION_NUMBER);
    }

    private takeOwnershipOfChild(child: Item) {
        child.getItemDelegate().setParentGroup(this);

        this._unsubscribeHandlerDelegate.unsubscribe(child.getItemDelegate().getId());

        if (child instanceof DataProvider) {
            this._unsubscribeHandlerDelegate.registerUnsubscribeFunction(
                child.getItemDelegate().getId(),
                child
                    .getItemDelegate()
                    .getPublishSubscribeDelegate()
                    .makeSubscriberFunction(ItemDelegateTopic.EXPANDED)(() => {
                    this.publishTopic(GroupDelegateTopic.CHILDREN_EXPANSION_STATES);
                }),
            );
        }

        if (instanceofItemGroup(child)) {
            this._unsubscribeHandlerDelegate.registerUnsubscribeFunction(
                child.getItemDelegate().getId(),
                child
                    .getGroupDelegate()
                    .getPublishSubscribeDelegate()
                    .makeSubscriberFunction(GroupDelegateTopic.TREE_REVISION_NUMBER)(() => {
                    this.incrementTreeRevisionNumber();
                }),
            );
            this._unsubscribeHandlerDelegate.registerUnsubscribeFunction(
                child.getItemDelegate().getId(),
                child
                    .getGroupDelegate()
                    .getPublishSubscribeDelegate()
                    .makeSubscriberFunction(GroupDelegateTopic.CHILDREN_EXPANSION_STATES)(() => {
                    this.publishTopic(GroupDelegateTopic.CHILDREN_EXPANSION_STATES);
                }),
            );
        }

        this.publishTopic(GroupDelegateTopic.CHILDREN);
        this.incrementTreeRevisionNumber();
    }

    private publishTopic(topic: GroupDelegateTopic) {
        if (this._deserializing) {
            return;
        }
        this._publishSubscribeDelegate.notifySubscribers(topic);
    }

    private disposeOwnershipOfChild(child: Item) {
        this._unsubscribeHandlerDelegate.unsubscribe(child.getItemDelegate().getId());
        child.getItemDelegate().setParentGroup(null);

        if (child instanceof SharedSetting) {
            this._owner
                ?.getItemDelegate()
                .getDataProviderManager()
                .publishTopic(DataProviderManagerTopic.SETTINGS_CHANGED);
        }

        this.publishTopic(GroupDelegateTopic.CHILDREN);
    }

    private getRangeOfChildrenWithOrder(order: number): [number, number] {
        let startIndex = -1;
        let endIndex = -1;
        for (let i = 0; i < this._children.length; i++) {
            if (this._children[i].getItemDelegate().getOrder() < order) {
                startIndex = i + 1;
                endIndex = i + 1;
            }
            if (this._children[i].getItemDelegate().getOrder() > order) {
                if (startIndex === -1) {
                    startIndex = i - 1;
                }
                endIndex = i - 1;
                break;
            }
            if (this._children[i].getItemDelegate().getOrder() === order) {
                if (startIndex === -1) {
                    startIndex = i;
                }
                endIndex = i;
            }
        }

        return [startIndex, endIndex];
    }

    beforeDestroy() {
        this._unsubscribeHandlerDelegate.unsubscribeAll();
        for (const child of this._children) {
            child.beforeDestroy?.();
        }
    }
}
