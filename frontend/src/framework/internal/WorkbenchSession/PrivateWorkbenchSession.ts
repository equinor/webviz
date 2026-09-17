import type { QueryClient } from "@tanstack/query-core";

import { AtomStoreMaster } from "@framework/AtomStoreMaster";
import { EnsembleFingerprintStore } from "@framework/EnsembleFingerprintStore";
import { EnsembleSet } from "@framework/EnsembleSet";
import { EnsembleSetAtom, RealizationFilterSetAtom } from "@framework/GlobalAtoms";
import { Dashboard, DashboardTopic } from "@framework/internal/Dashboard";
import { DEFAULT_DASHBOARD_NAME } from "@framework/internal/persistence/constants";
import { RealizationFilterSet } from "@framework/RealizationFilterSet";
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

import { DashboardHotCache } from "./DashboardHotCache";
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
    [WorkbenchSessionTopic.REALIZATION_FILTER_SET]: { filterSet: RealizationFilterSet };
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
    private _dashboardHotCache = new DashboardHotCache();
    private _ensembleSet: EnsembleSet = new EnsembleSet([]);
    private _realizationFilterSet = new RealizationFilterSet();
    private _wrappedRealizationFilterSet = {
        filterSet: this._realizationFilterSet,
    };
    private _userCreatedItems: UserCreatedItems;
    private _metadata: WorkbenchSessionMetadata = {
        title: "Untitled Session",
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
        this._atomStoreMaster.setAtomValue(RealizationFilterSetAtom, this._wrappedRealizationFilterSet);
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
            ensembleRealizationFilterSet: this._realizationFilterSet.serializeState(),
        };
    }

    async deserializeContentState(
        contentState: SerializedWorkbenchSessionContentState,
        preferredActiveDashboardId?: string | null,
    ): Promise<void> {
        this._isPersisted = this._id !== null;
        this._activeDashboardId = null;

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

        // This has to be done after loading the ensemble set
        // in order to guarantee that all realization filters for the ensembles exist
        this._realizationFilterSet.deserializeState(contentState.ensembleRealizationFilterSet);
        this.notifyAboutEnsembleRealizationFilterChange();

        // --- Now that the ensemble set is loaded, we can deserialize dashboards and modules ---

        for (const dashboard of contentState.dashboards) {
            const newDashboard = new Dashboard(this._atomStoreMaster);
            // Deserialize before registering: deserializeState() replaces the constructor-generated id
            // with the persisted one, and registerDashboard() keys the dashboard's unsubscribe callback
            // by getId() at call time. Registering first would key it by the stale id, so the later
            // unregisterDashboard() (keyed by the persisted id) would never find and remove it - leaking
            // the subscription, and the dashboard it closes over, for the life of the session.
            newDashboard.deserializeState(dashboard);
            this.registerDashboard(newDashboard);
        }

        // Prefer an explicitly requested dashboard (e.g. a deep-linked dashboard id from the URL)
        // over the persisted "last active" one, so opening a deep link activates that dashboard
        // directly instead of first loading the persisted-active one - instantiating its module
        // instances, WebGL contexts included - only to immediately hot-cache it away in favor of the
        // one the link actually pointed at. Both ids are validated against the freshly deserialized
        // dashboard set: a stale/corrupted id (an old session format, a regenerated template, or a
        // stale link) falls back to the first dashboard instead of throwing out of
        // setActiveDashboard() below.
        const dashboardIds = new Set(this._dashboards.map((d) => d.getId()));
        const validPreferredId =
            preferredActiveDashboardId && dashboardIds.has(preferredActiveDashboardId)
                ? preferredActiveDashboardId
                : null;
        const validPersistedId =
            contentState.activeDashboardId && dashboardIds.has(contentState.activeDashboardId)
                ? contentState.activeDashboardId
                : null;
        this.setActiveDashboard(validPreferredId ?? validPersistedId ?? this._dashboards[0]?.getId() ?? null);
        this._settings.deserializeState(contentState.settings);
        this._userCreatedItems.deserializeState(contentState.userCreatedItems);
    }

    setEnsembleSet(set: EnsembleSet) {
        this._realizationFilterSet.synchronizeWithEnsembleSet(set);
        this._ensembleSet = set;
        // Await the update of the EnsembleTimestampsStore with the latest timestamps before notifying any subscribers
        this._atomStoreMaster.setAtomValue(EnsembleSetAtom, set);
        this._publishSubscribeDelegate.notifySubscribers(WorkbenchSessionTopic.ENSEMBLE_SET);
        this._publishSubscribeDelegate.notifySubscribers(WorkbenchSessionTopic.REALIZATION_FILTER_SET);
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
                case WorkbenchSessionTopic.REALIZATION_FILTER_SET:
                    return this._wrappedRealizationFilterSet;
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
        const found = this._dashboards.find((d) => d.getId() === this._activeDashboardId);
        return found ?? null;
    }

    getDashboardHotCache(): DashboardHotCache {
        return this._dashboardHotCache;
    }

    setActiveDashboard(dashboardId: string | null): void {
        if (this._activeDashboardId === dashboardId) {
            return;
        }

        // Validated before touching the hot cache below: otherwise an unregistered dashboardId
        // (e.g. a stale switch racing a dashboard removal - see useOptimisticActiveDashboard's
        // rAF-deferred call) would already have deferred eviction of the still-displayed dashboard
        // before this throws, leaving it ticking toward teardown despite the switch never happening.
        const dashboard = this._dashboards.find((d) => d.getId() === dashboardId);
        if (dashboardId && !dashboard) {
            throw new Error("Dashboard not registered in this session");
        }

        // Loaded before any state below is touched, and inside a try/catch: Dashboard.load() can
        // throw (e.g. an inactive persisted dashboard referencing a module that's no longer
        // registered). Committing the hot-cache/_activeDashboardId transition first and loading
        // after, as this used to do, would leave the previous dashboard scheduled for eviction and
        // this session pointing at a target that never actually finished loading - with
        // ACTIVE_DASHBOARD never published to match. Loading first and only committing afterwards
        // keeps a failed switch a true no-op: the previous dashboard stays active and untouched.
        try {
            // A no-op if `dashboard` was still hot (its module instances were never torn down) - see
            // Dashboard.load()'s own "nothing cached" early-return.
            dashboard?.load();
        } catch (error) {
            console.error(`Failed to load dashboard "${dashboardId}":`, error);
            throw error;
        }

        if (dashboard) {
            // Cancelled before the outgoing dashboard is deferred below - not after. deferEviction()
            // evicts (unloads) its oldest pending entry once the cache is over capacity, and with the
            // hot cache already full, appending the outgoing dashboard first would make the target -
            // if it's the oldest hot entry - that eviction victim, unloading the very dashboard this
            // call is switching to before this cancellation ever got a chance to protect it.
            this._dashboardHotCache.release(dashboard.getId());
        }

        const previouslyActiveDashboard = this.getActiveDashboard();
        if (previouslyActiveDashboard) {
            // Deferred instead of unloading immediately: the dashboard stays fully mounted for a
            // while in case the user switches back to it, instead of paying the full teardown/
            // recreate cost on every switch. See DashboardHotCache.
            this._dashboardHotCache.deferEviction(previouslyActiveDashboard);
        }
        this._activeDashboardId = dashboard ? dashboard.getId() : null;
        this._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.ACTIVE_DASHBOARD);
        this.handleStateChange();
    }

    addDashboard(): void {
        this.assertIsNotSnapshot();
        const name = makeUniqueName(new Set(this._dashboards.map((d) => d.getMetadata().name)), DEFAULT_DASHBOARD_NAME);
        const newDashboard = new Dashboard(this._atomStoreMaster, name);
        this.registerDashboard(newDashboard);
        this._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.DASHBOARDS);
        this.handleStateChange();

        this.setActiveDashboard(newDashboard.getId());
    }

    removeDashboard(dashboardId: string): void {
        this.assertIsNotSnapshot();
        const dashboard = this._dashboards.find((d) => d.getId() === dashboardId);
        if (!dashboard) {
            throw new Error("Dashboard not registered in this session");
        }
        if (this._dashboards.length <= 1) {
            throw new Error("Cannot remove the last dashboard in a session");
        }
        const wasActive = this._activeDashboardId === dashboardId;

        if (wasActive) {
            // Switch to a working replacement BEFORE tearing the active dashboard down below - not
            // after. ActiveDashboardBoundary renders nothing (the dashboard tab strip included) while
            // there's no active dashboard, so destroying the active dashboard first and only then
            // discovering every remaining candidate fails to load would leave the user with no
            // content AND no tab strip to pick a different dashboard from - a fully stuck session.
            // Validating a candidate first means the active dashboard only ever gets replaced by one
            // that's confirmed to actually load; if none of the others do either, the removal itself
            // is aborted below and the current (still working) active dashboard is left in place.
            const index = this._dashboards.findIndex((d) => d.getId() === dashboardId);
            const preferredCandidateId = index > 0 ? this._dashboards[index - 1].getId() : null;
            const candidateIds = [
                ...(preferredCandidateId ? [preferredCandidateId] : []),
                ...this._dashboards.filter((d) => d.getId() !== dashboardId).map((d) => d.getId()),
            ];

            let switched = false;
            for (const candidateId of new Set(candidateIds)) {
                try {
                    this.setActiveDashboard(candidateId);
                    switched = true;
                    break;
                } catch (error) {
                    console.error(
                        `Failed to activate dashboard "${candidateId}" while removing the active dashboard:`,
                        error,
                    );
                }
            }

            if (!switched) {
                throw new Error(
                    "Cannot remove the active dashboard: none of the remaining dashboards could be activated as a replacement.",
                );
            }
        }

        // The removed dashboard is only ever torn down once it's no longer the active one (either it
        // never was, or the switch above already moved activation off of it) - setActiveDashboard()
        // above hot-cached it via the same deferred-eviction path as any other switch, so this just
        // cancels that and finishes the teardown for good.
        this.unregisterDashboard(dashboard);
        this._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.DASHBOARDS);
    }

    moveDashboard(dashboardId: string, newIndex: number): void {
        this.assertIsNotSnapshot();
        const currentIndex = this._dashboards.findIndex((d) => d.getId() === dashboardId);
        if (currentIndex === -1) {
            throw new Error("Dashboard not registered in this session");
        }

        const clampedIndex = Math.max(0, Math.min(newIndex, this._dashboards.length - 1));
        if (clampedIndex === currentIndex) {
            return;
        }

        // Build a new array rather than splicing this._dashboards in place - its snapshot getter
        // returns this._dashboards directly, and useSyncExternalStore skips re-rendering when
        // getSnapshot() returns the same reference as before, so an in-place mutation here would
        // reorder the dashboards internally without the tab strip ever reflecting it.
        const dashboards = [...this._dashboards];
        const [dashboard] = dashboards.splice(currentIndex, 1);
        dashboards.splice(clampedIndex, 0, dashboard);
        this._dashboards = dashboards;

        this._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.DASHBOARDS);
        this.handleStateChange();
    }

    async cloneDashboard(dashboardId: string): Promise<void> {
        this.assertIsNotSnapshot();
        const dashboardToClone = this._dashboards.find((d) => d.getId() === dashboardId);
        if (!dashboardToClone) {
            throw new Error("Dashboard not registered in this session");
        }

        const clonedDashboard = Dashboard.clone(dashboardToClone, this._atomStoreMaster);

        this.registerDashboard(clonedDashboard);
        this.moveDashboard(clonedDashboard.getId(), this._dashboards.indexOf(dashboardToClone) + 1);

        try {
            this.setActiveDashboard(clonedDashboard.getId());
        } catch (error) {
            // setActiveDashboard() above only fails while lazily loading the clone (see its own
            // try/catch), by which point registerDashboard()/moveDashboard() have already made it a
            // first-class member of this session - DASHBOARDS notified and all. Leaving it registered
            // after this method rejects would make it a phantom dashboard: it'd keep showing up in the
            // tab strip, get included if the session is saved, and retry the exact same broken load if
            // the user ever clicked it. Roll the registration back before rethrowing.
            this.unregisterDashboard(clonedDashboard);
            this._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.DASHBOARDS);
            throw error;
        }
    }

    getDashboards(): Dashboard[] {
        return this._dashboards;
    }

    private registerDashboard(dashboard: Dashboard): void {
        this._dashboards.push(dashboard);

        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            `dashboard-${dashboard.getId()}`,
            dashboard.getPublishSubscribeDelegate().makeSubscriberFunction(DashboardTopic.SERIALIZED_STATE)(
                this.handleStateChange.bind(this),
            ),
        );

        this.handleStateChange();
    }

    private unregisterDashboard(dashboard: Dashboard): void {
        // Stop tracking any pending hot-cache eviction for this dashboard before tearing it down
        // directly below - otherwise a stale timer would later call unload() on a dashboard that's
        // no longer part of the session.
        this._dashboardHotCache.release(dashboard.getId());
        this._unsubscribeFunctionsManagerDelegate.unsubscribe(`dashboard-${dashboard.getId()}`);
        dashboard.beforeDestroy();
        this._dashboards = this._dashboards.filter((d) => d.getId() !== dashboard.getId());
        this.handleStateChange();
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

        // Mirrors unregisterDashboard()'s own guard against the same failure mode: otherwise, if
        // oldDashboard was hot-cached (pending eviction) rather than active, its stale timer would
        // later call unload() on this now-detached Dashboard object, and hotDashboardIds would keep
        // reporting this id as hot even though a different Dashboard instance has taken its place.
        this._dashboardHotCache.release(oldDashboard.getId());
        this._unsubscribeFunctionsManagerDelegate.unsubscribe(`dashboard-${oldDashboard.getId()}`);
        oldDashboard.beforeDestroy();

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

    getRealizationFilterSet(): RealizationFilterSet {
        return this._realizationFilterSet;
    }

    getUserCreatedItems(): UserCreatedItems {
        return this._userCreatedItems;
    }

    notifyAboutEnsembleRealizationFilterChange(): void {
        console.debug("Notifying about ensemble realization filter change");
        this._atomStoreMaster.setAtomValue(RealizationFilterSetAtom, {
            filterSet: this._realizationFilterSet,
        });
        this._wrappedRealizationFilterSet = {
            filterSet: this._realizationFilterSet,
        };
        this._publishSubscribeDelegate.notifySubscribers(WorkbenchSessionTopic.REALIZATION_FILTER_SET);
        this.handleStateChange();
    }

    private makeDefaultDashboard(): void {
        const d = new Dashboard(this._atomStoreMaster);
        this.registerDashboard(d);
        this._activeDashboardId = d.getId();
        this._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.DASHBOARDS);
    }

    clear(): void {
        for (const dashboard of this._dashboards) {
            this._unsubscribeFunctionsManagerDelegate.unsubscribe(`dashboard-${dashboard.getId()}`);
            dashboard.beforeDestroy();
        }
        this._dashboards = [];
        this._activeDashboardId = null;
        this._ensembleSet = new EnsembleSet([]);
        EnsembleFingerprintStore.clear();
    }

    beforeDestroy(): void {
        // clear() doesn't route through unregisterDashboard(), so any pending hot-cache evictions
        // wouldn't otherwise be cancelled - cancel them explicitly here to avoid a stale timer
        // referencing a dashboard whose atom stores etc. may already be gone.
        this._dashboardHotCache.clear();
        this.clear();
        this._unsubscribeFunctionsManagerDelegate.unsubscribeAll();
    }

    static async fromDataContainer(
        queryClient: QueryClient,
        dataContainer: WorkbenchSessionDataContainer,
        preferredActiveDashboardId?: string | null,
    ): Promise<PrivateWorkbenchSession> {
        const session = new PrivateWorkbenchSession(queryClient);

        if (isPersisted(dataContainer)) {
            session.setId(dataContainer.id);
            session.setIsPersisted(true);
            session.setIsSnapshot(dataContainer.isSnapshot);
        }

        session.setLoadedFromLocalStorage(dataContainer.source === WorkbenchSessionSource.LOCAL_STORAGE);
        session.setMetadata(dataContainer.metadata);
        await session.deserializeContentState(dataContainer.content, preferredActiveDashboardId);

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
