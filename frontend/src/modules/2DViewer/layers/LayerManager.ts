import { WorkbenchSession } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { QueryClient } from "@tanstack/react-query";

import { PublishSubscribe, PublishSubscribeHandler } from "./PublishSubscribeHandler";
import { GroupDelegate } from "./delegates/GroupDelegate";
import { ItemDelegate } from "./delegates/ItemDelegate";
import { Group, Item } from "./interfaces";

export enum LayerManagerTopic {
    ITEMS_CHANGED = "items-changed",
    SETTINGS_CHANGED = "settings-changed",
    AVAILABLE_SETTINGS_CHANGED = "available-settings-changed",
    LAYER_DATA_REVISION = "layer-data-changed",
}

export type LayerManagerTopicPayload = {
    [LayerManagerTopic.ITEMS_CHANGED]: Item[];
    [LayerManagerTopic.SETTINGS_CHANGED]: void;
    [LayerManagerTopic.AVAILABLE_SETTINGS_CHANGED]: void;
    [LayerManagerTopic.LAYER_DATA_REVISION]: number;
};
export class LayerManager implements Group, PublishSubscribe<LayerManagerTopic, LayerManagerTopicPayload> {
    private _workbenchSession: WorkbenchSession;
    private _workbenchSettings: WorkbenchSettings;
    private _groupDelegate: GroupDelegate;
    private _queryClient: QueryClient;
    private _publishSubscribeHandler = new PublishSubscribeHandler<LayerManagerTopic>();
    private _itemDelegate: ItemDelegate;
    private _layerDataRevision: number = 0;

    constructor(workbenchSession: WorkbenchSession, workbenchSettings: WorkbenchSettings, queryClient: QueryClient) {
        this._workbenchSession = workbenchSession;
        this._workbenchSettings = workbenchSettings;
        this._queryClient = queryClient;
        this._itemDelegate = new ItemDelegate("LayerManager");
        this._itemDelegate.setLayerManager(this);
        this._groupDelegate = new GroupDelegate(this);
    }

    getItemDelegate(): ItemDelegate {
        return this._itemDelegate;
    }

    getGroupDelegate(): GroupDelegate {
        return this._groupDelegate;
    }

    publishTopic(topic: LayerManagerTopic): void {
        if (topic === LayerManagerTopic.LAYER_DATA_REVISION) {
            this._layerDataRevision++;
        }
        this._publishSubscribeHandler.notifySubscribers(topic);
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
        };

        return snapshotGetter;
    }

    getPublishSubscribeHandler(): PublishSubscribeHandler<LayerManagerTopic> {
        return this._publishSubscribeHandler;
    }
}
