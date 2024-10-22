import { WorkbenchSession, WorkbenchSessionEvent } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { QueryClient } from "@tanstack/react-query";

import { isEqual } from "lodash";

import { View } from "./View";
import { GroupDelegate } from "./delegates/GroupDelegate";
import { ItemDelegate } from "./delegates/ItemDelegate";
import { PublishSubscribe, PublishSubscribeDelegate } from "./delegates/PublishSubscribeDelegate";
import { UnsubscribeHandlerDelegate } from "./delegates/UnsubscribeHandlerDelegate";
import { Group, Item, instanceofGroup, instanceofLayer } from "./interfaces";

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

export type SerializedView = {
    type: "view";
    name: string;
    children: SerializedItem[];
};

export type SerializedLayer = {
    type: "layer";
    name: string;
    className: string;
    settings: {
        [key: string]: string;
    };
};

export type SerializedSettingsGroup = {
    type: "settings-group";
    children: SerializedItem[];
};

export type SerializedItem = {
    id: string;
} & (SerializedView | SerializedLayer | SerializedSettingsGroup);

export type SerializedState = {
    items: SerializedItem[];
};

export class LayerManager implements Group, PublishSubscribe<LayerManagerTopic, LayerManagerTopicPayload> {
    private _workbenchSession: WorkbenchSession;
    private _workbenchSettings: WorkbenchSettings;
    private _groupDelegate: GroupDelegate;
    private _queryClient: QueryClient;
    private _publishSubscribeHandler = new PublishSubscribeDelegate<LayerManagerTopic>();
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
        this._itemDelegate = new ItemDelegate("LayerManager");
        this._itemDelegate.setLayerManager(this);
        this._groupDelegate = new GroupDelegate(this);
        this._subscriptionsHandler.registerUnsubscribeFunction(
            "workbenchSession",
            this._workbenchSession.subscribe(WorkbenchSessionEvent.EnsembleSetChanged, () =>
                this.handleEnsembleSetChanged()
            )
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
            this._publishSubscribeHandler.notifySubscribers(LayerManagerTopic.GLOBAL_SETTINGS_CHANGED);
        }
    }

    getGlobalSetting<T extends keyof GlobalSettings>(key: T): GlobalSettings[T] {
        return this._globalSettings[key];
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
            if (topic === LayerManagerTopic.GLOBAL_SETTINGS_CHANGED) {
                return this._globalSettings;
            }
        };

        return snapshotGetter;
    }

    getPublishSubscribeHandler(): PublishSubscribeDelegate<LayerManagerTopic> {
        return this._publishSubscribeHandler;
    }

    beforeDestroy() {
        this._subscriptionsHandler.unsubscribeAll();
    }

    serializeState(): SerializedState {
        const recursivelySerialize = (item: Item): SerializedItem => {
            if (instanceofGroup(item)) {
                const children = item.getGroupDelegate().getChildren().map(recursivelySerialize);
                if (item instanceof View) {
                    return {
                        id: item.getItemDelegate().getId(),
                        type: "view",
                        name: item.getItemDelegate().getName(),
                        children,
                    };
                }
                return {
                    id: item.getItemDelegate().getId(),
                    type: "settings-group",
                    children,
                };
            }
            if (instanceofLayer(item)) {
                const settings = [];
                for (const [key, setting] of Object.entries(
                    item.getLayerDelegate().getSettingsContext().getDelegate().getSettings()
                )) {
                    settings.push({
                        key,
                        value: setting.getDelegate().getValue().toString(),
                    });
                }
                return {
                    id: item.getItemDelegate().getId(),
                    type: "layer",
                    className: item.constructor.name,
                    name: item.getItemDelegate().getName(),
                    settings,
                };
            }

            throw new Error("Unknown item type");
        };

        return {
            items: this._groupDelegate.getChildren().map(recursivelySerialize),
        };
    }
}
