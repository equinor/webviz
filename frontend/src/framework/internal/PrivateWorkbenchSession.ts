import type { QueryClient } from "@tanstack/query-core";

import type { AtomStoreMaster } from "@framework/AtomStoreMaster";
import { Dashboard, type SerializedDashboard } from "@framework/Dashboard";
import { EnsembleSet } from "@framework/EnsembleSet";
import { EnsembleSetAtom, RealizationFilterSetAtom } from "@framework/GlobalAtoms";
import { RealizationFilterSet } from "@framework/RealizationFilterSet";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { UserCreatedItems } from "@framework/UserCreatedItems";
import type { StoredUserDeltaEnsembleSetting, StoredUserEnsembleSetting } from "@framework/Workbench";
import { PublishSubscribeDelegate, type PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";

import {
    loadMetadataFromBackendAndCreateEnsembleSet,
    type UserDeltaEnsembleSetting,
    type UserEnsembleSetting,
} from "./EnsembleSetLoader";
import { WorkbenchSessionPersistenceService } from "@framework/persistence/WorkbenchSessionPersistenceService";

type CustomEnsembleProperties = {
    name: string | null;
    color: string;
};

export type SerializedRegularEnsemble = CustomEnsembleProperties & {
    ensembleIdent: string;
};

export type SerializedDeltaEnsemble = CustomEnsembleProperties & {
    comparisonEnsembleIdent: string;
    referenceEnsembleIdent: string;
};

export type SerializedEnsembleSet = {
    regularEnsembles: SerializedRegularEnsemble[];
    deltaEnsembles: SerializedDeltaEnsemble[];
};

export type SerializedWorkbenchSession = {
    id: string | null;
    activeDashboardId: string | null;
    dashboards: SerializedDashboard[];
    ensembleSet: SerializedEnsembleSet;
    metadata: PrivateWorkbenchSessionMetadata;
};

export enum PrivateWorkbenchSessionTopic {
    ENSEMBLE_SET = "EnsembleSet",
    IS_ENSEMBLE_SET_LOADING = "EnsembleSetLoadingState",
    REALIZATION_FILTER_SET = "RealizationFilterSet",
    ACTIVE_DASHBOARD = "ActiveDashboard",
    METADATA = "Metadata",
    DASHBOARDS = "Dashboards",
    IS_PERSISTED = "IsPersisted",
}

export type PrivateWorkbenchSessionMetadata = {
    title: string;
    description?: string;
};

export type PrivateWorkbenchSessionTopicPayloads = {
    [PrivateWorkbenchSessionTopic.IS_ENSEMBLE_SET_LOADING]: {
        isLoading: boolean;
    };
    [PrivateWorkbenchSessionTopic.ENSEMBLE_SET]: EnsembleSet;
    [PrivateWorkbenchSessionTopic.REALIZATION_FILTER_SET]: RealizationFilterSet;
    [PrivateWorkbenchSessionTopic.ACTIVE_DASHBOARD]: Dashboard;
    [PrivateWorkbenchSessionTopic.METADATA]: PrivateWorkbenchSessionMetadata;
    [PrivateWorkbenchSessionTopic.DASHBOARDS]: Dashboard[];
    [PrivateWorkbenchSessionTopic.IS_PERSISTED]: boolean;
};

export class PrivateWorkbenchSession implements PublishSubscribe<PrivateWorkbenchSessionTopicPayloads> {
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<PrivateWorkbenchSessionTopicPayloads>();
    private _workbenchSessionPersistenceService: WorkbenchSessionPersistenceService;

    private _id: string | null = null;
    private _isPersisted: boolean = false;
    private _atomStoreMaster: AtomStoreMaster;
    private _activeDashboardId: string | null = null;
    private _dashboards: Dashboard[] = [];
    private _queryClient: QueryClient;
    private _ensembleSet: EnsembleSet = new EnsembleSet([]);
    private _realizationFilterSet = new RealizationFilterSet();
    private _userCreatedItems: UserCreatedItems;
    private _isEnsembleSetLoading: boolean = false;
    private _metadata: PrivateWorkbenchSessionMetadata = {
        title: "Workbench Session",
        description: undefined,
    };

    constructor(atomStoreMaster: AtomStoreMaster, queryClient: QueryClient) {
        this._atomStoreMaster = atomStoreMaster;
        this._userCreatedItems = new UserCreatedItems(atomStoreMaster);

        this._atomStoreMaster.setAtomValue(RealizationFilterSetAtom, this._realizationFilterSet);
        this._queryClient = queryClient;

        this._workbenchSessionPersistenceService = new WorkbenchSessionPersistenceService(this, queryClient);
    }

    static makeNew(atomStoreMaster: AtomStoreMaster, queryClient: QueryClient): PrivateWorkbenchSession {
        const session = new PrivateWorkbenchSession(atomStoreMaster, queryClient);
        session.makeDefaultDashboard();
        session.setMetadata({
            title: "Unsaved Workbench Session",
        });

        return session;
    }

    static async loadSessionFromBackend(
        atomStoreMaster: AtomStoreMaster,
        queryClient: QueryClient,
        sessionId: string,
    ): Promise<PrivateWorkbenchSession> {
        const session = new PrivateWorkbenchSession(atomStoreMaster, queryClient);

        await session.getWorkbenchSessionPersistenceService().loadFromBackend(sessionId);

        session._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.METADATA);
        session._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.IS_PERSISTED);
        session._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.DASHBOARDS);
        session._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.ACTIVE_DASHBOARD);
        session._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.ENSEMBLE_SET);
        session._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.REALIZATION_FILTER_SET);

        return session;
    }

    static async loadLastSessionFromLocalStorage(
        atomStoreMaster: AtomStoreMaster,
        queryClient: QueryClient,
    ): Promise<PrivateWorkbenchSession | null> {
        const key = "workbench-session";
        const serializedSession = localStorage.getItem(key);
        if (!serializedSession) {
            return null;
        }

        try {
            const parsedSession = JSON.parse(serializedSession);

            const session = new PrivateWorkbenchSession(atomStoreMaster, queryClient);
            await session.deserializeState(parsedSession);

            session._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.METADATA);
            session._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.IS_PERSISTED);
            session._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.DASHBOARDS);
            session._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.ACTIVE_DASHBOARD);
            session._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.ENSEMBLE_SET);
            session._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.REALIZATION_FILTER_SET);

            return session;
        } catch (error) {
            console.error("Failed to load workbench session from local storage:", error);
            return null;
        }
    }

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<PrivateWorkbenchSessionTopicPayloads> {
        return this._publishSubscribeDelegate;
    }

    getWorkbenchSessionPersistenceService(): WorkbenchSessionPersistenceService {
        return this._workbenchSessionPersistenceService;
    }

    getIsPersisted(): boolean {
        return this._isPersisted;
    }

    setId(id: string): void {
        if (this._id) {
            throw new Error("ID is already set and cannot be changed.");
        }
        this._id = id;
    }

    getId(): string | null {
        return this._id;
    }

    getMetadata(): PrivateWorkbenchSessionMetadata {
        return this._metadata;
    }

    setMetadata(metadata: PrivateWorkbenchSessionMetadata): void {
        this._metadata = metadata;
        this._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.METADATA);
    }

    setIsPersisted(isPersisted: boolean): void {
        this._isPersisted = isPersisted;
        this._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.IS_PERSISTED);
    }

    makeSnapshotGetter<T extends PrivateWorkbenchSessionTopic>(
        topic: T,
    ): () => PrivateWorkbenchSessionTopicPayloads[T] {
        const snapshotGetter = (): any => {
            if (topic === PrivateWorkbenchSessionTopic.IS_ENSEMBLE_SET_LOADING) {
                return this._isEnsembleSetLoading;
            }
            if (topic === PrivateWorkbenchSessionTopic.ENSEMBLE_SET) {
                return this._ensembleSet;
            }
            if (topic === PrivateWorkbenchSessionTopic.REALIZATION_FILTER_SET) {
                return this._realizationFilterSet;
            }
            if (topic === PrivateWorkbenchSessionTopic.ACTIVE_DASHBOARD) {
                return this.getActiveDashboard();
            }
            if (topic === PrivateWorkbenchSessionTopic.METADATA) {
                return this._metadata;
            }
            if (topic === PrivateWorkbenchSessionTopic.DASHBOARDS) {
                return this._dashboards;
            }
            if (topic === PrivateWorkbenchSessionTopic.IS_PERSISTED) {
                return this._isPersisted;
            }
            throw new Error(`No snapshot getter implemented for topic ${topic}`);
        };
        return snapshotGetter;
    }

    serializeState(): SerializedWorkbenchSession {
        return {
            id: this._id,
            metadata: this._metadata,
            activeDashboardId: this._activeDashboardId,
            dashboards: this._dashboards.map((dashboard) => dashboard.serializeState()),
            ensembleSet: {
                regularEnsembles: this._ensembleSet.getRegularEnsembleArray().map((ensemble) => ({
                    ensembleIdent: ensemble.getIdent().toString(),
                    name: ensemble.getCustomName(),
                    color: ensemble.getColor(),
                })),
                deltaEnsembles: this._ensembleSet.getDeltaEnsembleArray().map((ensemble) => ({
                    comparisonEnsembleIdent: ensemble.getComparisonEnsembleIdent().toString(),
                    referenceEnsembleIdent: ensemble.getReferenceEnsembleIdent().toString(),
                    name: ensemble.getCustomName(),
                    color: ensemble.getColor(),
                })),
            },
        };
    }

    async deserializeState(serializedState: SerializedWorkbenchSession) {
        this._id = serializedState.id;
        this._metadata = serializedState.metadata;
        this._isPersisted = this._id !== null;
        this._activeDashboardId = serializedState.activeDashboardId;
        this._dashboards = serializedState.dashboards.map((dashboard) => {
            const newDashboard = new Dashboard(this._atomStoreMaster);
            newDashboard.deserializeState(dashboard);
            return newDashboard;
        });

        const userEnsembleSettings: UserEnsembleSetting[] = serializedState.ensembleSet.regularEnsembles.map(
            (ensemble) => ({
                ensembleIdent: RegularEnsembleIdent.fromString(ensemble.ensembleIdent),
                customName: ensemble.name,
                color: ensemble.color,
            }),
        );

        const userDeltaEnsembleSettings: UserDeltaEnsembleSetting[] = serializedState.ensembleSet.deltaEnsembles.map(
            (ensemble) => ({
                comparisonEnsembleIdent: RegularEnsembleIdent.fromString(ensemble.comparisonEnsembleIdent),
                referenceEnsembleIdent: RegularEnsembleIdent.fromString(ensemble.referenceEnsembleIdent),
                customName: ensemble.name,
                color: ensemble.color,
            }),
        );

        await this.loadAndSetupEnsembleSetInSession(this._queryClient, userEnsembleSettings, userDeltaEnsembleSettings);
    }

    getActiveDashboard(): Dashboard {
        if (this._activeDashboardId === null) {
            this._activeDashboardId = this._dashboards.length > 0 ? this._dashboards[0].getId() : null;
        }

        if (this._activeDashboardId === null) {
            throw new Error("No active dashboard set and no dashboards available.");
        }

        const dashboard = this._dashboards.find((dashboard) => dashboard.getId() === this._activeDashboardId);

        if (!dashboard) {
            throw new Error(`Active dashboard with ID ${this._activeDashboardId} not found.`);
        }

        return dashboard;
    }

    getDashboards(): Dashboard[] {
        return this._dashboards;
    }

    clear() {
        this._dashboards = [];
        this._activeDashboardId = null;
        // this._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.DASHBOARDS);
    }

    private async loadAndSetupEnsembleSetInSession(
        queryClient: QueryClient,
        userEnsembleSettings: UserEnsembleSetting[],
        userDeltaEnsembleSettings: UserDeltaEnsembleSetting[],
    ): Promise<void> {
        console.debug("loadAndSetupEnsembleSetInSession - starting load");
        this.setEnsembleSetLoading(true);
        const newEnsembleSet = await loadMetadataFromBackendAndCreateEnsembleSet(
            queryClient,
            userEnsembleSettings,
            userDeltaEnsembleSettings,
        );
        console.debug("loadAndSetupEnsembleSetInSession - loading done");
        console.debug("loadAndSetupEnsembleSetInSession - publishing");
        this.setEnsembleSetLoading(false);
        this.setEnsembleSet(newEnsembleSet);
    }

    async storeSettingsInLocalStorageAndLoadAndSetupEnsembleSetInSession(
        queryClient: QueryClient,
        userEnsembleSettings: UserEnsembleSetting[],
        userDeltaEnsembleSettings: UserDeltaEnsembleSetting[],
    ): Promise<void> {
        this.storeEnsembleSetInLocalStorage(userEnsembleSettings);
        this.storeDeltaEnsembleSetInLocalStorage(userDeltaEnsembleSettings);

        await this.loadAndSetupEnsembleSetInSession(queryClient, userEnsembleSettings, userDeltaEnsembleSettings);
    }

    private storeEnsembleSetInLocalStorage(ensembleSettingsToStore: UserEnsembleSetting[]): void {
        const ensembleSettingsArrayToStore: StoredUserEnsembleSetting[] = ensembleSettingsToStore.map((el) => ({
            ...el,
            ensembleIdent: el.ensembleIdent.toString(),
        }));
        localStorage.setItem("userEnsembleSettings", JSON.stringify(ensembleSettingsArrayToStore));
    }

    private storeDeltaEnsembleSetInLocalStorage(deltaEnsembleSettingsToStore: UserDeltaEnsembleSetting[]): void {
        const deltaEnsembleSettingsArrayToStore: StoredUserDeltaEnsembleSetting[] = deltaEnsembleSettingsToStore.map(
            (el) => ({
                ...el,
                comparisonEnsembleIdent: el.comparisonEnsembleIdent.toString(),
                referenceEnsembleIdent: el.referenceEnsembleIdent.toString(),
            }),
        );
        localStorage.setItem("userDeltaEnsembleSettings", JSON.stringify(deltaEnsembleSettingsArrayToStore));
    }

    maybeLoadEnsembleSettingsFromLocalStorage(): UserEnsembleSetting[] | null {
        const ensembleSettingsString = localStorage.getItem("userEnsembleSettings");
        if (!ensembleSettingsString) return null;

        const ensembleSettingsArray = JSON.parse(ensembleSettingsString) as StoredUserEnsembleSetting[];
        const parsedEnsembleSettingsArray: UserEnsembleSetting[] = ensembleSettingsArray.map((el) => ({
            ...el,
            ensembleIdent: RegularEnsembleIdent.fromString(el.ensembleIdent),
        }));

        return parsedEnsembleSettingsArray;
    }

    maybeLoadDeltaEnsembleSettingsFromLocalStorage(): UserDeltaEnsembleSetting[] | null {
        const deltaEnsembleSettingsString = localStorage.getItem("userDeltaEnsembleSettings");
        if (!deltaEnsembleSettingsString) return null;

        const deltaEnsembleSettingsArray = JSON.parse(deltaEnsembleSettingsString) as StoredUserDeltaEnsembleSetting[];
        const parsedDeltaEnsembleSettingsArray: UserDeltaEnsembleSetting[] = deltaEnsembleSettingsArray.map((el) => ({
            ...el,
            comparisonEnsembleIdent: RegularEnsembleIdent.fromString(el.comparisonEnsembleIdent),
            referenceEnsembleIdent: RegularEnsembleIdent.fromString(el.referenceEnsembleIdent),
        }));

        return parsedDeltaEnsembleSettingsArray;
    }

    makeDefaultDashboard() {
        const defaultDashboard = new Dashboard(this._atomStoreMaster);
        this._dashboards.push(defaultDashboard);
        this._activeDashboardId = defaultDashboard.getId();
        this._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.DASHBOARDS);
    }

    setEnsembleSetLoading(isLoading: boolean): void {
        this._isEnsembleSetLoading = isLoading;
        this._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.IS_ENSEMBLE_SET_LOADING);
    }

    setEnsembleSet(newEnsembleSet: EnsembleSet): void {
        this._realizationFilterSet.synchronizeWithEnsembleSet(newEnsembleSet);
        this._ensembleSet = newEnsembleSet;
        this._atomStoreMaster.setAtomValue(EnsembleSetAtom, newEnsembleSet);
        this._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.ENSEMBLE_SET);
        this._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.REALIZATION_FILTER_SET);
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

    async initFromLocalStorage(): Promise<void> {
        const storedUserEnsembleSettings = this.maybeLoadEnsembleSettingsFromLocalStorage();
        const storedUserDeltaEnsembleSettings = this.maybeLoadDeltaEnsembleSettingsFromLocalStorage();

        if (!storedUserEnsembleSettings && !storedUserDeltaEnsembleSettings) {
            return;
        }

        await this.loadAndSetupEnsembleSetInSession(
            this._queryClient,
            storedUserEnsembleSettings ?? [],
            storedUserDeltaEnsembleSettings ?? [],
        );

        this.makeDefaultDashboard();
    }

    beforeDestroy(): void {
        this._workbenchSessionPersistenceService.beforeDestroy();
    }
}
