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

// After how long still waiting for the data providers of a restored state is reported as a warning.
// Generous, as most providers depend on network requests that can take a while when not cached.
export const READINESS_WARNING_DELAY_MS = 60_000;

export enum DataProviderManagerTopic {
    // Published on every change to the item tree, including while deserializing, so that relationships between items
    // (e.g. external setting controllers) are established before data providers start loading
    ITEMS_ABOUT_TO_CHANGE = "ITEMS_ABOUT_TO_CHANGE",
    ITEMS = "ITEMS",
    // Published for every change that affects what consumers show: data, loading state, status and the item tree.
    // Not for expanding or collapsing items, which have their own topics (ItemDelegateTopic.EXPANDED,
    // GroupDelegateTopic.CHILDREN_EXPANSION_STATES).
    GUI_STATE_REVISION = "GUI_STATE_REVISION",
    GLOBAL_SETTINGS = "GLOBAL_SETTINGS",
    // Published when restoring a state starts and finishes - GUI state revisions are held back in between, so this is
    // what tells consumers that the data they have is not current
    IS_DESERIALIZING = "IS_DESERIALIZING",
    // Published when the state that serializeState() returns has changed and should be persisted - unlike
    // GUI_STATE_REVISION, which also covers changes that only affect what is shown (loading, data, status). Never
    // published while restoring a state, nor after restoring one failed (until the next restore).
    SERIALIZED_STATE_REVISION = "SERIALIZED_STATE_REVISION",
}

export type DataProviderManagerTopicPayload = {
    [DataProviderManagerTopic.ITEMS]: Item[];
    [DataProviderManagerTopic.ITEMS_ABOUT_TO_CHANGE]: void;
    [DataProviderManagerTopic.GUI_STATE_REVISION]: number;
    [DataProviderManagerTopic.GLOBAL_SETTINGS]: GlobalSettings;
    [DataProviderManagerTopic.IS_DESERIALIZING]: boolean;
    [DataProviderManagerTopic.SERIALIZED_STATE_REVISION]: number;
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
    private _guiStateRevision: number = 0;
    private _globalSettings: Partial<GlobalSettings>;
    private _unsubscribeFunctionsManagerDelegate = new UnsubscribeFunctionsManagerDelegate();
    private _deserializing = false;
    private _serializedStateRevision: number = 0;
    // The serialized state that SERIALIZED_STATE_REVISION was last published for - a change is only published when the
    // serialized state differs from it
    private _lastSerializedState: string | null = null;
    // Set when restoring a state failed - the torn-down tree must not be persisted over the saved state. Lifted by the
    // next restore.
    private _isSerializedStateRevisionSuspended = false;
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
                this.increaseGuiStateRevisionNumber();
                this.publishTopic(DataProviderManagerTopic.ITEMS);
            }),
        );
        // Expanding or collapsing items is part of the serialized state, but doesn't cause a GUI state revision
        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "groupDelegate",
            this._groupDelegate
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(GroupDelegateTopic.CHILDREN_EXPANSION_STATES)(() => {
                this.maybePublishSerializedStateRevision();
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

    increaseGuiStateRevisionNumber(): void {
        if (this._deserializing) {
            return;
        }

        this._guiStateRevision++;
        this.publishTopic(DataProviderManagerTopic.GUI_STATE_REVISION);

        // Any of the changes behind a GUI state revision may have changed the serialized state as well (e.g. a setting
        // value)
        this.maybePublishSerializedStateRevision();
    }

    // The serialized state that SERIALIZED_STATE_REVISION was last published for - what should be persisted
    getSerializedState(): string | null {
        return this._lastSerializedState;
    }

    /*
     * Publishes SERIALIZED_STATE_REVISION if the serialized state has changed since it was last published. Comparing the
     * serialized state itself means no item has to report its changes - whatever serializeState() includes is covered.
     */
    private maybePublishSerializedStateRevision(): void {
        if (this._deserializing || this._isSerializedStateRevisionSuspended) {
            return;
        }

        const serializedState = JSON.stringify(this.serializeState());
        if (serializedState === this._lastSerializedState) {
            return;
        }

        this._lastSerializedState = serializedState;
        this._serializedStateRevision++;
        this.publishTopic(DataProviderManagerTopic.SERIALIZED_STATE_REVISION);
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
            if (topic === DataProviderManagerTopic.GUI_STATE_REVISION) {
                return this._guiStateRevision;
            }
            if (topic === DataProviderManagerTopic.GLOBAL_SETTINGS) {
                return this._globalSettings;
            }
            if (topic === DataProviderManagerTopic.IS_DESERIALIZING) {
                return this._deserializing;
            }
            if (topic === DataProviderManagerTopic.SERIALIZED_STATE_REVISION) {
                return this._serializedStateRevision;
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

    private setDeserializing(deserializing: boolean): void {
        if (this._deserializing === deserializing) {
            return;
        }
        this._deserializing = deserializing;
        this.publishTopic(DataProviderManagerTopic.IS_DESERIALIZING);
    }

    deserializeState(serializedState: SerializedDataProviderManager): void {
        // A previous deserialization may still be waiting for its (now discarded) tree to become ready.
        // Cancelling stops both its readiness wait and its timeout, so it can no longer finish.
        this._cancelPendingReadinessWait?.();
        this._cancelPendingReadinessWait = null;

        // A new restore lifts the suspension of a failed one - nothing is published as a serialized state revision while
        // restoring anyway, and if this restore fails as well, it is suspended again
        this._isSerializedStateRevisionSuspended = false;

        // Set without publishing - it is announced once the new tree is complete, so that no one reacts to a partial one
        const wasDeserializing = this._deserializing;
        this._deserializing = true;
        try {
            this._itemDelegate.deserializeState(serializedState);
            this._groupDelegate.deserializeChildren(serializedState.children);
        } catch (error) {
            // The (now empty) tree must not be persisted over the saved state - serialized state revisions are suspended
            // until the next restore, before anything else, so that nothing published from here on can persist it
            this._isSerializedStateRevisionSuspended = true;
            // Tear down the partial tree, as its providers would keep initializing and publishing
            this._groupDelegate.clearChildren();
            this._deserializing = wasDeserializing;
            this.setDeserializing(false);
            // Safe now that serialized state revisions are suspended - lets consumers stop showing the torn-down tree
            this.increaseGuiStateRevisionNumber();
            throw error;
        }

        // The new children were appended silently - announce the new structure, so that relationships between items
        // (e.g. external setting controllers) are in place before any provider starts loading
        this.publishTopic(DataProviderManagerTopic.ITEMS_ABOUT_TO_CHANGE);
        this.publishTopic(DataProviderManagerTopic.ITEMS);
        if (!wasDeserializing) {
            this.publishTopic(DataProviderManagerTopic.IS_DESERIALIZING);
        }

        let finished = false;
        const finishDeserialization = () => {
            finished = true;
            // Stops the warning timer
            this._cancelPendingReadinessWait?.();
            this._cancelPendingReadinessWait = null;
            this.setDeserializing(false);
            this.increaseGuiStateRevisionNumber();
        };

        // Waiting for all descendants to be ready before updating the deserializing flag and publishing GUI state
        // revisions
        const cancelWait = this._groupDelegate.waitUntilAllDescendantDataProvidersAreReady(finishDeserialization);

        // Finished synchronously - which may already have started a newer deserialization, whose cancel function must
        // not be overwritten
        if (finished) {
            return;
        }

        // The manager keeps deserializing until every provider has settled, however long that takes - publishing earlier
        // would expose and persist a partially initialized state. A provider that never settles therefore blocks the
        // manager, so name the providers that are still pending after a while, to make such a hang easy to track down.
        const warningTimeout = setTimeout(() => {
            const pendingProviderNames = this._groupDelegate
                .getPendingDescendantDataProviders()
                .map((provider) => provider.getItemDelegate().getName());
            console.warn(
                `Data providers still loading ${READINESS_WARNING_DELAY_MS / 1000} s after restoring state - still waiting for: ${pendingProviderNames.join(", ")}`,
            );
        }, READINESS_WARNING_DELAY_MS);

        this._cancelPendingReadinessWait = () => {
            cancelWait();
            clearTimeout(warningTimeout);
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
