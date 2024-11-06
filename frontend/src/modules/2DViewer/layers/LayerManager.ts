import { WorkbenchSession, WorkbenchSessionEvent } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { QueryClient } from "@tanstack/react-query";

import { isEqual } from "lodash";

import { GroupDelegate, GroupDelegateTopic } from "./delegates/GroupDelegate";
import { ItemDelegate } from "./delegates/ItemDelegate";
import { PublishSubscribe, PublishSubscribeDelegate } from "./delegates/PublishSubscribeDelegate";
import { UnsubscribeHandlerDelegate } from "./delegates/UnsubscribeHandlerDelegate";
import { Group, Item, SerializedLayerManager } from "./interfaces";

export enum LayerManagerTopic {
    ITEMS_CHANGED = "items-changed",
    SETTINGS_CHANGED = "settings-changed",
    AVAILABLE_SETTINGS_CHANGED = "available-settings-changed",
    LAYER_DATA_REVISION = "layer-data-changed",
    GLOBAL_SETTINGS_CHANGED = "global-settings-changed",
}

export type LayerManagerTopicPayload = {
    [LayerManagerTopic.ITEMS_CHANGED]: Item[];
    [LayerManagerTopic.SETTINGS_CHANGED]: void;
    [LayerManagerTopic.AVAILABLE_SETTINGS_CHANGED]: void;
    [LayerManagerTopic.LAYER_DATA_REVISION]: number;
    [LayerManagerTopic.GLOBAL_SETTINGS_CHANGED]: void;
};

export type GlobalSettings = {
    fieldId: string | null;
};

export class LayerManager implements Group, PublishSubscribe<LayerManagerTopic, LayerManagerTopicPayload> {
    private _workbenchSession: WorkbenchSession;
    private _workbenchSettings: WorkbenchSettings;
    private _groupDelegate: GroupDelegate;
    private _queryClient: QueryClient;
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<LayerManagerTopic>();
    private _itemDelegate: ItemDelegate;
    private _layerDataRevision: number = 0;
    private _globalSettings: GlobalSettings = {
        fieldId: null,
    };
    private _subscriptionsHandler = new UnsubscribeHandlerDelegate();

    constructor(workbenchSession: WorkbenchSession, workbenchSettings: WorkbenchSettings, queryClient: QueryClient) {
        this._workbenchSession = workbenchSession;
        this._workbenchSettings = workbenchSettings;
        this._queryClient = queryClient;
        this._itemDelegate = new ItemDelegate("LayerManager", this);
        this._groupDelegate = new GroupDelegate(this);
        this._subscriptionsHandler.registerUnsubscribeFunction(
            "workbenchSession",
            this._workbenchSession.subscribe(
                WorkbenchSessionEvent.EnsembleSetChanged,
                this.handleEnsembleSetChanged.bind(this)
            )
        );
        this._subscriptionsHandler.registerUnsubscribeFunction(
            "groupDelegate",
            this._groupDelegate
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(GroupDelegateTopic.TREE_REVISION_NUMBER)(() => {
                this.publishTopic(LayerManagerTopic.LAYER_DATA_REVISION);
                this.publishTopic(LayerManagerTopic.ITEMS_CHANGED);
            })
        );
    }

    private handleEnsembleSetChanged() {
        this.publishTopic(LayerManagerTopic.GLOBAL_SETTINGS_CHANGED);
    }

    getItemDelegate(): ItemDelegate {
        return this._itemDelegate;
    }

    getGroupDelegate(): GroupDelegate {
        return this._groupDelegate;
    }

    updateGlobalSetting<T extends keyof GlobalSettings>(key: T, value: GlobalSettings[T]): void {
        if (!isEqual(this._globalSettings[key], value)) {
            this._globalSettings[key] = value;
            this._publishSubscribeDelegate.notifySubscribers(LayerManagerTopic.GLOBAL_SETTINGS_CHANGED);
        }
    }

    getGlobalSetting<T extends keyof GlobalSettings>(key: T): GlobalSettings[T] {
        return this._globalSettings[key];
    }

    publishTopic(topic: LayerManagerTopic): void {
        if (topic === LayerManagerTopic.LAYER_DATA_REVISION) {
            this._layerDataRevision++;
        }
        this._publishSubscribeDelegate.notifySubscribers(topic);
    }

    getWorkbenchSession(): WorkbenchSession {
        return this._workbenchSession;
    }

    getQueryClient(): QueryClient {
        return this._queryClient;
    }

    getWorkbenchSettings(): WorkbenchSettings {
        return this._workbenchSettings;
    }

    makeSnapshotGetter<T extends LayerManagerTopic>(topic: T): () => LayerManagerTopicPayload[T] {
        const snapshotGetter = (): any => {
            if (topic === LayerManagerTopic.ITEMS_CHANGED) {
                return this._groupDelegate.getChildren();
            }
            if (topic === LayerManagerTopic.SETTINGS_CHANGED) {
                return;
            }
            if (topic === LayerManagerTopic.AVAILABLE_SETTINGS_CHANGED) {
                return;
            }
            if (topic === LayerManagerTopic.LAYER_DATA_REVISION) {
                return this._layerDataRevision;
            }
            if (topic === LayerManagerTopic.GLOBAL_SETTINGS_CHANGED) {
                return this._globalSettings;
            }
        };

        return snapshotGetter;
    }

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<LayerManagerTopic> {
        return this._publishSubscribeDelegate;
    }

    beforeDestroy() {
        this._subscriptionsHandler.unsubscribeAll();
    }

    serializeState(): SerializedLayerManager {
        return {
            id: this._itemDelegate.getId(),
            name: this._itemDelegate.getName(),
            type: "layer-manager",
            children: this._groupDelegate.serializeChildren(),
        };
    }

    deserializeState(serializedState: SerializedLayerManager): void {
        this._itemDelegate.setId(serializedState.id);
        this._itemDelegate.setName(serializedState.name);
        this._groupDelegate.deserializeChildren(serializedState.children);

        this.publishTopic(LayerManagerTopic.ITEMS_CHANGED);
        this.publishTopic(LayerManagerTopic.GLOBAL_SETTINGS_CHANGED);
    }
}
