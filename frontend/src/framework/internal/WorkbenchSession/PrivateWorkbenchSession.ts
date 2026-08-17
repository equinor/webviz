import type { QueryClient } from "@tanstack/query-core";

import { AtomStoreMaster } from "@framework/AtomStoreMaster";
import { EnsembleFingerprintStore } from "@framework/EnsembleFingerprintStore";
import { EnsembleSet } from "@framework/EnsembleSet";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { Dashboard, DashboardTopic } from "@framework/internal/Dashboard";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { UserCreatedItems, UserCreatedItemsEvent } from "@framework/UserCreatedItems";
import { WorkbenchSessionTopic, type WorkbenchSession } from "@framework/WorkbenchSession";
import { PublishSubscribeDelegate } from "@lib/utils/PublishSubscribeDelegate";
import { makeUniqueName } from "@lib/utils/uniqueName";
import { UnsubscribeFunctionsManagerDelegate } from "@lib/utils/UnsubscribeFunctionsManagerDelegate";

import {
    loadMetadataFromBackendAndCreateEnsembleSet,
    type UserEnsembleSetting,
    type UserDeltaEnsembleSetting,
    type EnsembleLoadingErrorInfoMap,
    type EnsembleLoadingWarningInfoMap,
} from "../EnsembleSetLoader";
import { PrivateWorkbenchSettings, PrivateWorkbenchSettingsTopic } from "../PrivateWorkbenchSettings";

import type { SerializedWorkbenchSessionContentState } from "./PrivateWorkbenchSession.schema";
import {
    isPersisted,
    WorkbenchSessionSource,
    type WorkbenchSessionDataContainer,
} from "./utils/WorkbenchSessionDataContainer";

export type SerializedRegularEnsemble = {
    ensembleIdent: string;
    name: string | null;
    caseName?: string; // Optional for backward compat serialization – awaiting schema versioning
    color: string;
};

export type SerializedDeltaEnsemble = {
    comparisonEnsembleIdent: string;
    referenceEnsembleIdent: string;
    comparisonEnsembleCaseName?: string; // Optional for backward compat serialization – awaiting schema versioning
    referenceEnsembleCaseName?: string; // Optional for backward compat serialization – awaiting schema versioning
    name: string | null;
    color: string;
};

export type SerializedEnsembleSet = {
    regularEnsembles: SerializedRegularEnsemble[];
    deltaEnsembles: SerializedDeltaEnsemble[];
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
    ACTIVE_DASHBOARD = "ActiveDashboard",
    DASHBOARDS = "Dashboards",
    METADATA = "Metadata",
    IS_PERSISTED = "IsPersisted",
    IS_SNAPSHOT = "IsSnapshot",
    SERIALIZED_STATE = "SerializedState",
}

export type WorkbenchSessionTopicPayloads = {
    [WorkbenchSessionTopic.ENSEMBLE_SET]: EnsembleSet;
    [PrivateWorkbenchSessionTopic.ACTIVE_DASHBOARD]: Dashboard | null;
    [PrivateWorkbenchSessionTopic.DASHBOARDS]: Dashboard[];
    [PrivateWorkbenchSessionTopic.METADATA]: WorkbenchSessionMetadata;
    [PrivateWorkbenchSessionTopic.IS_PERSISTED]: boolean;
    [PrivateWorkbenchSessionTopic.IS_SNAPSHOT]: boolean;
    [PrivateWorkbenchSessionTopic.SERIALIZED_STATE]: void;
};

export class PrivateWorkbenchSession implements WorkbenchSession {
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<WorkbenchSessionTopicPayloads>();
    private _unsubscribeFunctionsManagerDelegate = new UnsubscribeFunctionsManagerDelegate();

    private _id: string | null = null;
    private _isPersisted: boolean = false;
    protected _isSnapshot: boolean;
    private _atomStoreMaster: AtomStoreMaster;
    private _queryClient: QueryClient;
    private _dashboards: Dashboard[] = [];
    private _activeDashboardId: string | null = null;
    private _ensembleSet: EnsembleSet = new EnsembleSet([]);
    private _userCreatedItems: UserCreatedItems;
    private _metadata: WorkbenchSessionMetadata = {
        title: "New Session",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastModifiedMs: Date.now(),
    };
    private _loadedFromLocalStorage: boolean = false;
    private _settings: PrivateWorkbenchSettings = new PrivateWorkbenchSettings();

    private _ensembleLoadingErrorInfoMap: EnsembleLoadingErrorInfoMap = {};
    private _ensembleLoadingWarningInfoMap: EnsembleLoadingWarningInfoMap = {};

    private constructor(queryClient: QueryClient, isSnapshot = false) {
        this._atomStoreMaster = new AtomStoreMaster();
        this._queryClient = queryClient;
        this._userCreatedItems = new UserCreatedItems(this._atomStoreMaster);
        this._isSnapshot = isSnapshot;

        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "settings",
            this._settings
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(PrivateWorkbenchSettingsTopic.SERIALIZED_STATE)(
                this.handleStateChange.bind(this),
            ),
        );
        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "userCreatedItems",
            this._userCreatedItems.subscribe(UserCreatedItemsEvent.SERIALIZED_STATE, this.handleStateChange.bind(this)),
        );
    }

    getIsLoadedFromLocalStorage(): boolean {
        return this._loadedFromLocalStorage;
    }

    setLoadedFromLocalStorage(loaded: boolean): void {
        this._loadedFromLocalStorage = loaded;
    }

    getAtomStoreMaster(): AtomStoreMaster {
        return this._atomStoreMaster;
    }

    getId(): string | null {
        return this._id;
    }

    resetId(): void {
        this._id = null;
        this.setIsPersisted(false);
    }

    setId(id: string): void {
        if (this._id) throw new Error("Session ID already set");
        this._id = id;
    }

    getWorkbenchSettings(): PrivateWorkbenchSettings {
        return this._settings;
    }

    isSnapshot(): boolean {
        return this._isSnapshot;
    }

    setIsSnapshot(isSnapshot: boolean): void {
        this._isSnapshot = isSnapshot;
        this._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.IS_SNAPSHOT);
    }

    getIsPersisted(): boolean {
        return this._isPersisted;
    }

    setIsPersisted(val: boolean): void {
        this._isPersisted = val;
        this._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.IS_PERSISTED);
    }

    getMetadata(): WorkbenchSessionMetadata {
        return this._metadata;
    }

    setMetadata(metadata: WorkbenchSessionMetadata): void {
        this._metadata = metadata;
        this._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.METADATA);
        this.handleStateChange();
    }

    updateMetadata(update: Partial<Omit<WorkbenchSessionMetadata, "createdAt">>, notify = true): void {
        this._metadata = { ...this._metadata, ...update };

        if (!notify) {
            return;
        }

        this._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.METADATA);
        this.handleStateChange();
    }

    serializeContentState(): SerializedWorkbenchSessionContentState {
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
                        caseName: e.getCaseName(),
                        color: e.getColor(),
                    }),
                ),
                deltaEnsembles: this._ensembleSet.getDeltaEnsembleArray().map(
                    (e): SerializedDeltaEnsemble => ({
                        comparisonEnsembleIdent: e.getComparisonEnsembleIdent().toString(),
                        comparisonEnsembleCaseName: e.getComparisonEnsembleCaseName(),
                        referenceEnsembleIdent: e.getReferenceEnsembleIdent().toString(),
                        referenceEnsembleCaseName: e.getReferenceEnsembleCaseName(),
                        name: e.getCustomName(),
                        color: e.getColor(),
                    }),
                ),
            },
        };
    }

    async deserializeContentState(contentState: SerializedWorkbenchSessionContentState): Promise<void> {
        this._isPersisted = this._id !== null;
        this._activeDashboardId = contentState.activeDashboardId;

        this.clearDashboards();

        // We first have to load and setup the ensemble set before deserializing dashboards and modules.
        // This is because modules may depend on ensembles being present in the EnsembleFinterprintStore when
        // initiating requests to the backend.
        const userEnsembleSettings: UserEnsembleSetting[] = contentState.ensembleSet.regularEnsembles.map((e) => ({
            ensembleIdent: RegularEnsembleIdent.fromString(e.ensembleIdent),
            customName: e.name,
            caseName: e.caseName,
            color: e.color,
        }));

        const userDeltaEnsembleSettings: UserDeltaEnsembleSetting[] = contentState.ensembleSet.deltaEnsembles.map(
            (e) => ({
                comparisonEnsembleIdent: RegularEnsembleIdent.fromString(e.comparisonEnsembleIdent),
                referenceEnsembleIdent: RegularEnsembleIdent.fromString(e.referenceEnsembleIdent),
                comparisonEnsembleCaseName: e.comparisonEnsembleCaseName,
                referenceEnsembleCaseName: e.referenceEnsembleCaseName,
                customName: e.name,
                color: e.color,
            }),
        );

        const {
            ensembleSet: newSet,
            ensembleLoadingErrorInfoMap: ensembleLoadingErrorInfoMap,
            ensembleLoadingWarningInfoMap: ensembleLoadingWarningInfoMap,
        } = await loadMetadataFromBackendAndCreateEnsembleSet(
            this._queryClient,
            userEnsembleSettings,
            userDeltaEnsembleSettings,
        );
        this.setEnsembleSet(newSet);
        this._ensembleLoadingErrorInfoMap = ensembleLoadingErrorInfoMap;
        this._ensembleLoadingWarningInfoMap = ensembleLoadingWarningInfoMap;

        // --- Now that the ensemble set is loaded, we can deserialize dashboards and modules ---
        // Each dashboard's realization filter set is synchronized against this._ensembleSet
        // inside registerDashboard() (guaranteeing a filter exists for every ensemble) before
        // its persisted filter selections are overlaid inside deserializeState().

        for (const dashboard of contentState.dashboards) {
            const newDashboard = new Dashboard(this._atomStoreMaster);
            this.registerDashboard(newDashboard);
            newDashboard.deserializeState(dashboard);
        }

        this._settings.deserializeState(contentState.settings);
        this._userCreatedItems.deserializeState(contentState.userCreatedItems);
    }

    setEnsembleSet(set: EnsembleSet) {
        this._ensembleSet = set;
        // Await the update of the EnsembleTimestampsStore with the latest timestamps before notifying any subscribers
        this._atomStoreMaster.setAtomValue(EnsembleSetAtom, set);
        for (const dashboard of this._dashboards) {
            dashboard.syncRealizationFilterSetWithEnsembleSet(set);
        }
        this._publishSubscribeDelegate.notifySubscribers(WorkbenchSessionTopic.ENSEMBLE_SET);
        this.handleStateChange();
    }

    private handleStateChange(): void {
        this._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.SERIALIZED_STATE);
    }

    getPublishSubscribeDelegate() {
        return this._publishSubscribeDelegate;
    }

    makeSnapshotGetter<T extends keyof WorkbenchSessionTopicPayloads>(
        topic: T,
    ): () => WorkbenchSessionTopicPayloads[T] {
        const snapshotGetter = (): any => {
            switch (topic) {
                case WorkbenchSessionTopic.ENSEMBLE_SET:
                    return this._ensembleSet;
                case PrivateWorkbenchSessionTopic.ACTIVE_DASHBOARD:
                    return this.getActiveDashboard();
                case PrivateWorkbenchSessionTopic.DASHBOARDS:
                    return this._dashboards;
                case PrivateWorkbenchSessionTopic.METADATA:
                    return this._metadata;
                case PrivateWorkbenchSessionTopic.IS_PERSISTED:
                    return this._isPersisted;
                case PrivateWorkbenchSessionTopic.IS_SNAPSHOT:
                    return this._isSnapshot;
                case PrivateWorkbenchSessionTopic.SERIALIZED_STATE:
                    return void 0;
                default:
                    throw new Error(`No snapshot getter implemented for topic ${topic}`);
            }
        };
        return snapshotGetter;
    }

    getActiveDashboard(): Dashboard | null {
        if (!this._activeDashboardId && this._dashboards.length > 0) {
            this._activeDashboardId = this._dashboards[0].getId();
        }
        const found = this._dashboards.find((d) => d.getId() === this._activeDashboardId);
        return found ?? null;
    }

    setActiveDashboard(dashboardId: string): void {
        const dashboard = this._dashboards.find((d) => d.getId() === dashboardId);
        if (dashboardId && !dashboard) {
            throw new Error("Dashboard not registered in this session");
        }
        if (this._activeDashboardId === (dashboard ? dashboard.getId() : null)) {
            return;
        }
        this._activeDashboardId = dashboard ? dashboard.getId() : null;
        this._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.ACTIVE_DASHBOARD);
        this.handleStateChange();
    }

    addDashboard(): void {
        this.assertIsNotSnapshot();
        const name = makeUniqueName(new Set(this._dashboards.map((d) => d.getMetadata().name)), "Dashboard");
        const newDashboard = new Dashboard(this._atomStoreMaster, name);
        this.registerDashboard(newDashboard);
        this.setActiveDashboard(newDashboard.getId());
    }

    removeDashboard(dashboardId: string): void {
        this.assertIsNotSnapshot();
        const dashboard = this._dashboards.find((d) => d.getId() === dashboardId);
        if (!dashboard) {
            throw new Error("Dashboard not registered in this session");
        }
        // Capture the index before removal, since the dashboard is no longer findable in the array afterwards
        const index = this._dashboards.findIndex((d) => d.getId() === dashboardId);
        this.unregisterDashboard(dashboard);

        // If the removed dashboard was the active one, set the active dashboard to the previous one in the list, or null if there are no dashboards left
        if (this._activeDashboardId === dashboardId) {
            if (index > 0) {
                this._activeDashboardId = this._dashboards[index - 1].getId();
            } else if (this._dashboards.length > 0) {
                this._activeDashboardId = this._dashboards[0].getId();
            } else {
                this._activeDashboardId = null;
            }
            this._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.ACTIVE_DASHBOARD);
        }
    }

    getDashboards(): Dashboard[] {
        return this._dashboards;
    }

    private registerDashboard(dashboard: Dashboard): void {
        this._dashboards = [...this._dashboards, dashboard];

        // Guarantees a realization filter exists for every ensemble currently in the session
        // before the caller proceeds to (optionally) overlay persisted filter selections via
        // dashboard.deserializeState().
        dashboard.syncRealizationFilterSetWithEnsembleSet(this._ensembleSet);

        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            `dashboard-${dashboard.getId()}`,
            dashboard.getPublishSubscribeDelegate().makeSubscriberFunction(DashboardTopic.SERIALIZED_STATE)(
                this.handleStateChange.bind(this),
            ),
        );

        this._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.DASHBOARDS);

        this.handleStateChange();
    }

    private unregisterDashboard(dashboard: Dashboard): void {
        this._unsubscribeFunctionsManagerDelegate.unsubscribe(`dashboard-${dashboard.getId()}`);
        dashboard.beforeUnload();
        this._dashboards = [...this._dashboards.filter((d) => d.getId() !== dashboard.getId())];
        this._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.DASHBOARDS);
    }

    private clearDashboards() {
        for (const dashboard of this._dashboards) {
            this.unregisterDashboard(dashboard);
        }

        this.handleStateChange();
    }

    setDashboards(dashboards: Dashboard[]): void {
        this.assertIsNotSnapshot();
        this.clearDashboards();
        for (const dashboard of dashboards) {
            this.registerDashboard(dashboard);
        }

        if (dashboards.length > 0) {
            this._activeDashboardId = dashboards[0].getId();
        } else {
            this._activeDashboardId = null;
        }

        this._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.DASHBOARDS);
        this._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.ACTIVE_DASHBOARD);
        this.handleStateChange();
    }

    /**
     * Replaces a single dashboard in place, preserving its position and the rest of the session's
     * dashboards. Used when applying a template so that only the targeted dashboard is affected.
     */
    replaceDashboard(dashboardId: string, newDashboard: Dashboard): void {
        this.assertIsNotSnapshot();
        const index = this._dashboards.findIndex((d) => d.getId() === dashboardId);
        if (index === -1) {
            throw new Error("Dashboard not registered in this session");
        }
        const oldDashboard = this._dashboards[index];
        const wasActive = this._activeDashboardId === dashboardId;

        this._unsubscribeFunctionsManagerDelegate.unsubscribe(`dashboard-${oldDashboard.getId()}`);
        oldDashboard.beforeUnload();

        newDashboard.syncRealizationFilterSetWithEnsembleSet(this._ensembleSet);
        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            `dashboard-${newDashboard.getId()}`,
            newDashboard.getPublishSubscribeDelegate().makeSubscriberFunction(DashboardTopic.SERIALIZED_STATE)(
                this.handleStateChange.bind(this),
            ),
        );

        this._dashboards = [...this._dashboards.slice(0, index), newDashboard, ...this._dashboards.slice(index + 1)];

        if (wasActive) {
            this._activeDashboardId = newDashboard.getId();
            this._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.ACTIVE_DASHBOARD);
        }

        this._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.DASHBOARDS);
        this.handleStateChange();
    }

    getEnsembleLoadingErrorInfoMap(): EnsembleLoadingErrorInfoMap {
        return this._ensembleLoadingErrorInfoMap;
    }

    getEnsembleLoadingWarningInfoMap(): EnsembleLoadingWarningInfoMap {
        return this._ensembleLoadingWarningInfoMap;
    }

    getEnsembleSet(): EnsembleSet {
        return this._ensembleSet;
    }

    getUserCreatedItems(): UserCreatedItems {
        return this._userCreatedItems;
    }

    private makeDefaultDashboard(): void {
        const d = new Dashboard(this._atomStoreMaster);
        this.registerDashboard(d);
        this._activeDashboardId = d.getId();
        this._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.DASHBOARDS);
    }

    clear(): void {
        this._dashboards = [];
        this._activeDashboardId = null;
        this._ensembleSet = new EnsembleSet([]);
        EnsembleFingerprintStore.clear();
    }

    beforeDestroy(): void {
        this.clear();
        this._unsubscribeFunctionsManagerDelegate.unsubscribeAll();
    }

    static async fromDataContainer(
        queryClient: QueryClient,
        dataContainer: WorkbenchSessionDataContainer,
    ): Promise<PrivateWorkbenchSession> {
        const session = new PrivateWorkbenchSession(queryClient);

        if (isPersisted(dataContainer)) {
            session.setId(dataContainer.id);
            session.setIsPersisted(true);
            session.setIsSnapshot(dataContainer.isSnapshot);
        }

        session.setLoadedFromLocalStorage(dataContainer.source === WorkbenchSessionSource.LOCAL_STORAGE);
        session.setMetadata(dataContainer.metadata);
        await session.deserializeContentState(dataContainer.content);

        return session;
    }

    static createEmpty(queryClient: QueryClient): PrivateWorkbenchSession {
        const session = new PrivateWorkbenchSession(queryClient);
        session.makeDefaultDashboard();
        return session;
    }

    /**
     * Creates a new unpersisted session as a copy of an existing session.
     * The new session will have no ID, will not be persisted, and will not be a snapshot.
     * Only title and description are copied from the source metadata.
     * Use setMetadata() to update title/description after creation.
     */
    static async createCopy(
        queryClient: QueryClient,
        sourceSession: PrivateWorkbenchSession,
    ): Promise<PrivateWorkbenchSession> {
        const newSession = new PrivateWorkbenchSession(queryClient, false);

        // Copy only title and description, create new timestamps
        const now = Date.now();
        const sourceMetadata = sourceSession.getMetadata();
        newSession.setMetadata({
            title: sourceMetadata.title,
            description: sourceMetadata.description,
            createdAt: now,
            updatedAt: now,
            lastModifiedMs: now,
        });

        // Deserialize content state from source (this properly clones all internal structures)
        await newSession.deserializeContentState(sourceSession.serializeContentState());

        // Ensure the new session is not persisted and has no ID
        newSession._id = null;
        newSession._isPersisted = false;
        newSession._isSnapshot = false;

        return newSession;
    }

    private assertIsNotSnapshot(): asserts this is this & { _isSnapshot: false } {
        if (this._isSnapshot) {
            throw new Error("Operation not allowed on snapshot sessions");
        }
    }
}
