import type { QueryClient } from "@tanstack/query-core";

import { AtomStoreMaster } from "@framework/AtomStoreMaster";
import { EnsembleSet } from "@framework/EnsembleSet";
import { EnsembleSetAtom, RealizationFilterSetAtom } from "@framework/GlobalAtoms";
import { Dashboard, type SerializedDashboard } from "@framework/internal/WorkbenchSession/Dashboard";
import { RealizationFilterSet } from "@framework/RealizationFilterSet";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { UserCreatedItems, type SerializedUserCreatedItems } from "@framework/UserCreatedItems";
import { PublishSubscribeDelegate, type PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";

import {
    loadMetadataFromBackendAndCreateEnsembleSet,
    type UserEnsembleSetting,
    type UserDeltaEnsembleSetting,
} from "../EnsembleSetLoader";
import { PrivateWorkbenchSettings, type SerializedWorkbenchSettings } from "../PrivateWorkbenchSettings";

export type SerializedRegularEnsemble = {
    ensembleIdent: string;
    name: string | null;
    color: string;
};

export type SerializedDeltaEnsemble = {
    comparisonEnsembleIdent: string;
    referenceEnsembleIdent: string;
    name: string | null;
    color: string;
};

export type SerializedEnsembleSet = {
    regularEnsembles: SerializedRegularEnsemble[];
    deltaEnsembles: SerializedDeltaEnsemble[];
};

export type WorkbenchSessionContent = {
    activeDashboardId: string | null;
    dashboards: SerializedDashboard[];
    ensembleSet: SerializedEnsembleSet;
    settings: SerializedWorkbenchSettings;
    userCreatedItems: SerializedUserCreatedItems;
};

export type WorkbenchSessionMetadata = {
    title: string;
    description?: string;
    updatedAt: number; // Timestamp of the last modification
    createdAt: number; // Timestamp of creation
    hash?: string; // Optional hash for content integrity
    lastModifiedMs: number; // Last modified timestamp for internal use
};

export enum PrivateWorkbenchSessionTopic {
    ENSEMBLE_SET = "EnsembleSet",
    IS_ENSEMBLE_SET_LOADING = "EnsembleSetLoadingState",
    REALIZATION_FILTER_SET = "RealizationFilterSet",
    ACTIVE_DASHBOARD = "ActiveDashboard",
    METADATA = "Metadata",
    DASHBOARDS = "Dashboards",
    IS_PERSISTED = "IsPersisted",
    IS_SNAPSHOT = "IsSnapshot",
}

export type PrivateWorkbenchSessionTopicPayloads = {
    [PrivateWorkbenchSessionTopic.IS_ENSEMBLE_SET_LOADING]: boolean;
    [PrivateWorkbenchSessionTopic.ENSEMBLE_SET]: EnsembleSet;
    [PrivateWorkbenchSessionTopic.REALIZATION_FILTER_SET]: RealizationFilterSet;
    [PrivateWorkbenchSessionTopic.ACTIVE_DASHBOARD]: Dashboard;
    [PrivateWorkbenchSessionTopic.METADATA]: WorkbenchSessionMetadata;
    [PrivateWorkbenchSessionTopic.DASHBOARDS]: Dashboard[];
    [PrivateWorkbenchSessionTopic.IS_PERSISTED]: boolean;
    [PrivateWorkbenchSessionTopic.IS_SNAPSHOT]: boolean;
};

export class PrivateWorkbenchSession implements PublishSubscribe<PrivateWorkbenchSessionTopicPayloads> {
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<PrivateWorkbenchSessionTopicPayloads>();

    private _id: string | null = null;
    private _isPersisted: boolean = false;
    private _isSnapshot: boolean;
    private _atomStoreMaster: AtomStoreMaster;
    private _queryClient: QueryClient;
    private _dashboards: Dashboard[] = [];
    private _activeDashboardId: string | null = null;
    private _ensembleSet: EnsembleSet = new EnsembleSet([]);
    private _realizationFilterSet = new RealizationFilterSet();
    private _userCreatedItems: UserCreatedItems;
    private _metadata: WorkbenchSessionMetadata = {
        title: "New Workbench Session",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastModifiedMs: Date.now(),
    };
    private _isEnsembleSetLoading: boolean = false;
    private _loadedFromLocalStorage: boolean = false;
    private _settings: PrivateWorkbenchSettings = new PrivateWorkbenchSettings();

    constructor(queryClient: QueryClient, isSnapshot = false) {
        this._atomStoreMaster = new AtomStoreMaster();
        this._queryClient = queryClient;
        this._userCreatedItems = new UserCreatedItems(this._atomStoreMaster);
        this._atomStoreMaster.setAtomValue(RealizationFilterSetAtom, this._realizationFilterSet);
        this._isSnapshot = isSnapshot;
    }

    getIsLoadedFromLocalStorage(): boolean {
        return this._loadedFromLocalStorage;
    }

    setLoadedFromLocalStorage(loaded: boolean): void {
        this._loadedFromLocalStorage = loaded;
    }

    getWorkbenchSettings(): PrivateWorkbenchSettings {
        return this._settings;
    }

    getAtomStoreMaster(): AtomStoreMaster {
        return this._atomStoreMaster;
    }

    getId(): string | null {
        return this._id;
    }

    setId(id: string): void {
        if (this._id) throw new Error("Session ID already set");
        this._id = id;
    }

    isSnapshot(): boolean {
        return this._isSnapshot;
    }

    setIsSnapshot(isSnapshot: boolean): void {
        this._isSnapshot = isSnapshot;
        this._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.IS_SNAPSHOT);
    }

    getMetadata(): WorkbenchSessionMetadata {
        return this._metadata;
    }

    setMetadata(metadata: WorkbenchSessionMetadata): void {
        this._metadata = metadata;
        this._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.METADATA);
    }

    updateMetadata(update: Partial<Omit<WorkbenchSessionMetadata, "createdAt">>, notify = true): void {
        this._metadata = { ...this._metadata, ...update };

        if (!notify) {
            return;
        }

        this._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.METADATA);
    }

    getContent(): WorkbenchSessionContent {
        return {
            activeDashboardId: this._activeDashboardId,
            settings: this._settings.serializeState(),
            userCreatedItems: this._userCreatedItems.serializeState(),
            dashboards: this._dashboards.map((d) => d.serializeState()),
            ensembleSet: {
                regularEnsembles: this._ensembleSet.getRegularEnsembleArray().map(
                    (e): SerializedRegularEnsemble => ({
                        ensembleIdent: e.getIdent().toString(),
                        name: e.getCustomName(),
                        color: e.getColor(),
                    }),
                ),
                deltaEnsembles: this._ensembleSet.getDeltaEnsembleArray().map(
                    (e): SerializedDeltaEnsemble => ({
                        comparisonEnsembleIdent: e.getComparisonEnsembleIdent().toString(),
                        referenceEnsembleIdent: e.getReferenceEnsembleIdent().toString(),
                        name: e.getCustomName(),
                        color: e.getColor(),
                    }),
                ),
            },
        };
    }

    async loadContent(content: WorkbenchSessionContent): Promise<void> {
        this._isPersisted = this._id !== null;
        this._activeDashboardId = content.activeDashboardId;
        this._dashboards = [];
        for (const serializedDashboard of content.dashboards) {
            const dashboard = await Dashboard.fromPersistedState(serializedDashboard, this._atomStoreMaster);
            this._dashboards.push(dashboard);
        }

        this._settings.deserializeState(content.settings);
        this._userCreatedItems.deserializeState(content.userCreatedItems);

        const userEnsembleSettings: UserEnsembleSetting[] = content.ensembleSet.regularEnsembles.map((e) => ({
            ensembleIdent: RegularEnsembleIdent.fromString(e.ensembleIdent),
            customName: e.name,
            color: e.color,
        }));

        const userDeltaEnsembleSettings: UserDeltaEnsembleSetting[] = content.ensembleSet.deltaEnsembles.map((e) => ({
            comparisonEnsembleIdent: RegularEnsembleIdent.fromString(e.comparisonEnsembleIdent),
            referenceEnsembleIdent: RegularEnsembleIdent.fromString(e.referenceEnsembleIdent),
            customName: e.name,
            color: e.color,
        }));

        await this.loadAndSetupEnsembleSet(userEnsembleSettings, userDeltaEnsembleSettings);
    }

    async loadAndSetupEnsembleSet(
        regularEnsembleSettings: UserEnsembleSetting[],
        deltaEnsembleSettings: UserDeltaEnsembleSetting[],
    ): Promise<void> {
        this.setEnsembleSetLoading(true);
        const newSet = await loadMetadataFromBackendAndCreateEnsembleSet(
            this._queryClient,
            regularEnsembleSettings,
            deltaEnsembleSettings,
        );
        this.setEnsembleSetLoading(false);
        this.setEnsembleSet(newSet);
    }

    private setEnsembleSetLoading(isLoading: boolean) {
        this._isEnsembleSetLoading = isLoading;
        this._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.IS_ENSEMBLE_SET_LOADING);
    }

    private setEnsembleSet(set: EnsembleSet) {
        this._realizationFilterSet.synchronizeWithEnsembleSet(set);
        this._ensembleSet = set;
        this._atomStoreMaster.setAtomValue(EnsembleSetAtom, set);
        this._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.ENSEMBLE_SET);
        this._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.REALIZATION_FILTER_SET);
    }

    getPublishSubscribeDelegate() {
        return this._publishSubscribeDelegate;
    }

    makeSnapshotGetter<T extends PrivateWorkbenchSessionTopic>(
        topic: T,
    ): () => PrivateWorkbenchSessionTopicPayloads[T] {
        const snapshotGetter = (): any => {
            switch (topic) {
                case PrivateWorkbenchSessionTopic.IS_ENSEMBLE_SET_LOADING:
                    return this._isEnsembleSetLoading;
                case PrivateWorkbenchSessionTopic.ENSEMBLE_SET:
                    return this._ensembleSet;
                case PrivateWorkbenchSessionTopic.REALIZATION_FILTER_SET:
                    return this._realizationFilterSet;
                case PrivateWorkbenchSessionTopic.ACTIVE_DASHBOARD:
                    return this.getActiveDashboard();
                case PrivateWorkbenchSessionTopic.METADATA:
                    return this._metadata;
                case PrivateWorkbenchSessionTopic.DASHBOARDS:
                    return this._dashboards;
                case PrivateWorkbenchSessionTopic.IS_PERSISTED:
                    return this._isPersisted;
                case PrivateWorkbenchSessionTopic.IS_SNAPSHOT:
                    return this._isSnapshot;
                default:
                    throw new Error(`No snapshot getter implemented for topic ${topic}`);
            }
        };
        return snapshotGetter;
    }

    getActiveDashboard(): Dashboard {
        if (!this._activeDashboardId && this._dashboards.length > 0) {
            this._activeDashboardId = this._dashboards[0].getId();
        }
        const found = this._dashboards.find((d) => d.getId() === this._activeDashboardId);
        if (!found) throw new Error("Active dashboard not found");
        return found;
    }

    getDashboards(): Dashboard[] {
        return this._dashboards;
    }

    setDashboards(dashboards: Dashboard[]): void {
        this._dashboards = dashboards;
        if (dashboards.length > 0) {
            this._activeDashboardId = dashboards[0].getId();
        } else {
            this._activeDashboardId = null;
        }
        this._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.DASHBOARDS);
    }

    getIsPersisted(): boolean {
        return this._isPersisted;
    }

    setIsPersisted(val: boolean): void {
        this._isPersisted = val;
        this._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.IS_PERSISTED);
    }

    getEnsembleSet(): EnsembleSet {
        return this._ensembleSet;
    }

    getRealizationFilterSet(): RealizationFilterSet {
        return this._realizationFilterSet;
    }

    getUserCreatedItems(): UserCreatedItems {
        return this._userCreatedItems;
    }

    notifyAboutEnsembleRealizationFilterChange(): void {
        this._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.REALIZATION_FILTER_SET);
    }

    makeDefaultDashboard(): void {
        const d = new Dashboard(this._atomStoreMaster);
        this._dashboards.push(d);
        this._activeDashboardId = d.getId();
        this._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.DASHBOARDS);
    }

    clear(): void {
        this._dashboards = [];
        this._activeDashboardId = null;
    }

    beforeDestroy(): void {
        // Hook for cleanup, e.g. unsubscribing or releasing memory
    }
}
