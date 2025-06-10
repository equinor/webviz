import type { QueryClient } from "@tanstack/react-query";
import { clone, isEqual } from "lodash";

import type { RegularEnsemble } from "@framework/RegularEnsemble";
import type { IntersectionPolyline } from "@framework/userCreatedItems/IntersectionPolylines";
import { IntersectionPolylinesEvent } from "@framework/userCreatedItems/IntersectionPolylines";
import type { EnsembleRealizationFilterFunction, WorkbenchSession } from "@framework/WorkbenchSession";
import {
    WorkbenchSessionEvent,
    createEnsembleRealizationFilterFuncForWorkbenchSession,
} from "@framework/WorkbenchSession";
import type { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { ColorPaletteType } from "@framework/WorkbenchSettings";

import type { PublishSubscribe } from "../../../utils/PublishSubscribeDelegate";
import { PublishSubscribeDelegate } from "../../../utils/PublishSubscribeDelegate";
import { GroupDelegate, GroupDelegateTopic } from "../../delegates/GroupDelegate";
import { ItemDelegate } from "../../delegates/ItemDelegate";
import { UnsubscribeHandlerDelegate } from "../../delegates/UnsubscribeHandlerDelegate";
import type { Item, ItemGroup } from "../../interfacesAndTypes/entities";
import { type SerializedDataProviderManager, SerializedType } from "../../interfacesAndTypes/serialization";

export enum DataProviderManagerTopic {
    ITEMS_ABOUT_TO_CHANGE = "ITEMS_ABOUT_TO_CHANGE",
    ITEMS = "ITEMS",
    DATA_REVISION = "DATA_REVISION",
    GLOBAL_SETTINGS = "GLOBAL_SETTINGS",
}

export type DataProviderManagerTopicPayload = {
    [DataProviderManagerTopic.ITEMS]: Item[];
    [DataProviderManagerTopic.ITEMS_ABOUT_TO_CHANGE]: void;
    [DataProviderManagerTopic.DATA_REVISION]: number;
    [DataProviderManagerTopic.GLOBAL_SETTINGS]: GlobalSettings;
};

export type GlobalSettings = {
    fieldId: string | null;
    wellboreUuid: string | null;
    ensembles: readonly RegularEnsemble[];
    realizationFilterFunction: EnsembleRealizationFilterFunction;
    intersectionPolylines: readonly IntersectionPolyline[];
};

/*
 * The DataProviderManager class is responsible for managing all items (data providers, groups, settings, etc.).
 * It is the main ancestor of all items and provides a way to subscribe/publish messages to all descendants.
 * Moreover, it is responsible for managing the global settings coming from the framework (e.g. ensembles, fieldId).
 * It also holds the revision number of the data, which is used to notify subscribers when any data changes.
 * This makes it possible to update the GUI accordingly.
 * The DataProviderManager class is also responsible for serializing/deserializing the state of itself and all its descendants.
 * It does also serve as a provider of the QueryClient and WorkbenchSession.
 */
export class DataProviderManager implements ItemGroup, PublishSubscribe<DataProviderManagerTopicPayload> {
    private _workbenchSession: WorkbenchSession;
    private _workbenchSettings: WorkbenchSettings;
    private _groupDelegate: GroupDelegate;
    private _queryClient: QueryClient;
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<DataProviderManagerTopicPayload>();
    private _itemDelegate: ItemDelegate;
    private _dataRevision: number = 0;
    private _globalSettings: Partial<GlobalSettings>;
    private _subscriptionsHandler = new UnsubscribeHandlerDelegate();
    private _deserializing = false;
    private _groupColorGenerator: Generator<string, string>;

    constructor(workbenchSession: WorkbenchSession, workbenchSettings: WorkbenchSettings, queryClient: QueryClient) {
        this._workbenchSession = workbenchSession;
        this._workbenchSettings = workbenchSettings;
        this._queryClient = queryClient;
        this._itemDelegate = new ItemDelegate("DataProviderManager", 0, this);
        this._groupDelegate = new GroupDelegate(this);

        this._globalSettings = this.initializeGlobalSettings();

        this._subscriptionsHandler.registerUnsubscribeFunction(
            "workbenchSession",
            this._workbenchSession.subscribe(
                WorkbenchSessionEvent.EnsembleSetChanged,
                this.handleEnsembleSetChanged.bind(this),
            ),
        );
        this._subscriptionsHandler.registerUnsubscribeFunction(
            "workbenchSession",
            this._workbenchSession.subscribe(
                WorkbenchSessionEvent.RealizationFilterSetChanged,
                this.handleRealizationFilterSetChanged.bind(this),
            ),
        );
        this._subscriptionsHandler.registerUnsubscribeFunction(
            "workbenchSession",
            this._workbenchSession
                .getUserCreatedItems()
                .getIntersectionPolylines()
                .subscribe(IntersectionPolylinesEvent.CHANGE, this.handleIntersectionPolylinesChanged.bind(this)),
        );
        this._subscriptionsHandler.registerUnsubscribeFunction(
            "groupDelegate",
            this._groupDelegate
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(GroupDelegateTopic.TREE_REVISION_NUMBER_ABOUT_TO_CHANGE)(() => {
                this.publishTopic(DataProviderManagerTopic.ITEMS_ABOUT_TO_CHANGE);
            }),
        );
        this._subscriptionsHandler.registerUnsubscribeFunction(
            "groupDelegate",
            this._groupDelegate
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(GroupDelegateTopic.TREE_REVISION_NUMBER)(() => {
                this.publishTopic(DataProviderManagerTopic.DATA_REVISION);
                this.publishTopic(DataProviderManagerTopic.ITEMS);
            }),
        );

        this._groupColorGenerator = this.makeGroupColorGenerator();
    }

    getItemDelegate(): ItemDelegate {
        return this._itemDelegate;
    }

    getGroupDelegate(): GroupDelegate {
        return this._groupDelegate;
    }

    updateGlobalSetting<T extends keyof GlobalSettings>(key: T, value: GlobalSettings[T]): void {
        if (isEqual(this._globalSettings[key], value)) {
            return;
        }

        if (typeof value === "function") {
            this._globalSettings[key] = value;
        } else {
            this._globalSettings[key] = clone(value);
        }

        this.publishTopic(DataProviderManagerTopic.GLOBAL_SETTINGS);
    }

    getGlobalSetting<T extends keyof GlobalSettings>(key: T): GlobalSettings[T] | null {
        return this._globalSettings[key] ?? null;
    }

    publishTopic(topic: DataProviderManagerTopic): void {
        if (this._deserializing) {
            return;
        }

        if (topic === DataProviderManagerTopic.DATA_REVISION) {
            this._dataRevision++;
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

    makeSnapshotGetter<T extends DataProviderManagerTopic>(topic: T): () => DataProviderManagerTopicPayload[T] {
        const snapshotGetter = (): any => {
            if (topic === DataProviderManagerTopic.ITEMS) {
                return this._groupDelegate.getChildren();
            }
            if (topic === DataProviderManagerTopic.ITEMS_ABOUT_TO_CHANGE) {
                return;
            }
            if (topic === DataProviderManagerTopic.DATA_REVISION) {
                return this._dataRevision;
            }
            if (topic === DataProviderManagerTopic.GLOBAL_SETTINGS) {
                return this._globalSettings;
            }
        };

        return snapshotGetter;
    }

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<DataProviderManagerTopicPayload> {
        return this._publishSubscribeDelegate;
    }

    beforeDestroy() {
        this._groupDelegate.beforeDestroy();
        this._subscriptionsHandler.unsubscribeAll();
    }

    serializeState(): SerializedDataProviderManager {
        const itemState = this._itemDelegate.serializeState();
        return {
            ...itemState,
            type: SerializedType.DATA_PROVIDER_MANAGER,
            children: this._groupDelegate.serializeChildren(),
        };
    }

    isDeserializing(): boolean {
        return this._deserializing;
    }

    deserializeState(serializedState: SerializedDataProviderManager): void {
        this._deserializing = true;
        this._itemDelegate.deserializeState(serializedState);
        this._groupDelegate.deserializeChildren(serializedState.children);
        this._deserializing = false;

        this.publishTopic(DataProviderManagerTopic.ITEMS);
    }

    makeGroupColor(): string {
        return this._groupColorGenerator.next().value;
    }

    private *makeGroupColorGenerator(): Generator<string, string> {
        const selectedColorPalette = this._workbenchSettings.getSelectedColorPalette(ColorPaletteType.Categorical);
        const colors = selectedColorPalette.getColors();
        let i = 0;
        while (true) {
            yield colors[i % colors.length];
            i++;
        }
    }

    private initializeGlobalSettings(): Partial<GlobalSettings> {
        const ensembles = clone(this._workbenchSession.getEnsembleSet().getRegularEnsembleArray());
        const intersectionPolylines = clone(
            this._workbenchSession.getUserCreatedItems().getIntersectionPolylines().getPolylines(),
        );

        return {
            ensembles,
            realizationFilterFunction: createEnsembleRealizationFilterFuncForWorkbenchSession(this._workbenchSession),
            intersectionPolylines,
        };
    }

    private handleRealizationFilterSetChanged() {
        this.updateGlobalSetting(
            "realizationFilterFunction",
            createEnsembleRealizationFilterFuncForWorkbenchSession(this._workbenchSession),
        );
    }

    private handleEnsembleSetChanged() {
        const ensembles = this._workbenchSession.getEnsembleSet().getRegularEnsembleArray();
        this.updateGlobalSetting("ensembles", ensembles);
    }

    private handleIntersectionPolylinesChanged() {
        this.updateGlobalSetting(
            "intersectionPolylines",
            this._workbenchSession.getUserCreatedItems().getIntersectionPolylines().getPolylines(),
        );
    }
}
