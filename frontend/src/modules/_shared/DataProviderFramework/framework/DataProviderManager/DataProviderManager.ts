import type { QueryClient } from "@tanstack/react-query";
import { clone, isEqual } from "lodash-es";

import type { RegularEnsemble } from "@framework/RegularEnsemble";
import type { IntersectionPolyline } from "@framework/userCreatedItems/IntersectionPolylines";
import { IntersectionPolylinesEvent } from "@framework/userCreatedItems/IntersectionPolylines";
import type { EnsembleRealizationFilterFunction, WorkbenchSession } from "@framework/WorkbenchSession";
import {
    WorkbenchSessionTopic,
    createEnsembleRealizationFilterFuncForWorkbenchSession,
} from "@framework/WorkbenchSession";
import type { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { ColorPaletteType } from "@framework/WorkbenchSettings";
import type { PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";
import { PublishSubscribeDelegate } from "@lib/utils/PublishSubscribeDelegate";
import { UnsubscribeFunctionsManagerDelegate } from "@lib/utils/UnsubscribeFunctionsManagerDelegate";

import { GroupDelegate, GroupDelegateTopic } from "../../delegates/GroupDelegate";
import { ItemDelegate } from "../../delegates/ItemDelegate";
import type { Item, ItemGroup } from "../../interfacesAndTypes/entities";
import { type SerializedDataProviderManager, SerializedType } from "../../interfacesAndTypes/serialization";

// How long a restored state may wait for its data providers to settle before item and data notifications are published anyway
const READINESS_TIMEOUT_MS = 10_000;

export enum DataProviderManagerTopic {
    // Published on every change to the item tree, including while deserializing, so that relationships between items
    // (e.g. external setting controllers) are established before data providers start loading
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
    private _unsubscribeFunctionsManagerDelegate = new UnsubscribeFunctionsManagerDelegate();
    private _deserializing = false;
    private _cancelPendingReadinessWait: (() => void) | null = null;
    private _groupColorGenerator: Generator<string, string>;

    constructor(workbenchSession: WorkbenchSession, workbenchSettings: WorkbenchSettings, queryClient: QueryClient) {
        this._workbenchSession = workbenchSession;
        this._workbenchSettings = workbenchSettings;
        this._queryClient = queryClient;
        this._itemDelegate = new ItemDelegate("DataProviderManager", 0, this);
        this._groupDelegate = new GroupDelegate(this);

        this._globalSettings = this.initializeGlobalSettings();

        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "workbenchSession",
            this._workbenchSession
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(WorkbenchSessionTopic.ENSEMBLE_SET)(this.handleEnsembleSetChanged.bind(this)),
        );
        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "workbenchSession",
            this._workbenchSession
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(WorkbenchSessionTopic.REALIZATION_FILTER_SET)(
                this.handleRealizationFilterSetChanged.bind(this),
            ),
        );
        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "workbenchSession",
            this._workbenchSession
                .getUserCreatedItems()
                .getIntersectionPolylines()
                .subscribe(IntersectionPolylinesEvent.CHANGE, this.handleIntersectionPolylinesChanged.bind(this)),
        );
        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "groupDelegate",
            this._groupDelegate
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(GroupDelegateTopic.TREE_REVISION_NUMBER_ABOUT_TO_CHANGE)(() => {
                this.publishTopic(DataProviderManagerTopic.ITEMS_ABOUT_TO_CHANGE);
            }),
        );
        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "groupDelegate",
            this._groupDelegate
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(GroupDelegateTopic.TREE_REVISION_NUMBER)(() => {
                this.increaseDataRevisionNumber();
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

    private publishTopic(topic: DataProviderManagerTopic): void {
        this._publishSubscribeDelegate.notifySubscribers(topic);
    }

    increaseDataRevisionNumber(): void {
        if (this._deserializing) {
            return;
        }

        this._dataRevision++;
        this.publishTopic(DataProviderManagerTopic.DATA_REVISION);
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
        this._cancelPendingReadinessWait?.();
        this._cancelPendingReadinessWait = null;
        this._groupDelegate.beforeDestroy();
        this._unsubscribeFunctionsManagerDelegate.unsubscribeAll();
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
        // A previous deserialization may still be waiting for its (now discarded) tree to become ready.
        // Cancelling stops both its readiness wait and its timeout, so it can no longer finish.
        this._cancelPendingReadinessWait?.();
        this._cancelPendingReadinessWait = null;

        this._deserializing = true;
        try {
            this._itemDelegate.deserializeState(serializedState);
            this._groupDelegate.deserializeChildren(serializedState.children);
        } catch (error) {
            // Keep a partially built tree working rather than suppressing all notifications for the rest of the manager's life
            this._deserializing = false;
            throw error;
        }

        // The new children were appended silently - announce the new structure, so that relationships between items
        // (e.g. external setting controllers) are in place before any provider starts loading
        this.publishTopic(DataProviderManagerTopic.ITEMS_ABOUT_TO_CHANGE);
        this.publishTopic(DataProviderManagerTopic.ITEMS);

        let finished = false;
        const finishDeserialization = () => {
            finished = true;
            // Stops whichever of the readiness wait and the timeout didn't trigger this
            this._cancelPendingReadinessWait?.();
            this._cancelPendingReadinessWait = null;
            this._deserializing = false;
            this.increaseDataRevisionNumber();
        };

        // Waiting for all descendants to be ready before updating the deserializing flag and publishing data revisions
        const cancelWait = this._groupDelegate.waitUntilAllDescendantDataProvidersAreReady(finishDeserialization);

        // Finished synchronously - which may already have started a newer deserialization, whose cancel function must
        // not be overwritten
        if (finished) {
            return;
        }

        // A provider that never settles must not keep the manager from publishing for the rest of its life -
        // release after a while, and let the remaining providers publish as they finish.
        const timeout = setTimeout(() => {
            const pendingProviderNames = this._groupDelegate
                .getPendingDescendantDataProviders()
                .map((provider) => provider.getItemDelegate().getName());
            console.warn(
                `Data providers still loading ${READINESS_TIMEOUT_MS / 1000} s after restoring state - publishing anyway: ${pendingProviderNames.join(", ")}`,
            );
            finishDeserialization();
        }, READINESS_TIMEOUT_MS);

        this._cancelPendingReadinessWait = () => {
            cancelWait();
            clearTimeout(timeout);
        };
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
