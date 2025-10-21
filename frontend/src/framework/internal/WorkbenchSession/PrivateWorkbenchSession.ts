import type { QueryClient } from "@tanstack/query-core";

import type { AtomStoreMaster } from "@framework/AtomStoreMaster";
import { EnsembleFingerprintStore } from "@framework/EnsembleFingerprintStore";
import { EnsembleSet } from "@framework/EnsembleSet";
import { EnsembleSetAtom, RealizationFilterSetAtom } from "@framework/GlobalAtoms";
import { Dashboard, type SerializedDashboard } from "@framework/internal/Dashboard";
import { RealizationFilterSet } from "@framework/RealizationFilterSet";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { UserCreatedItems, type SerializedUserCreatedItems } from "@framework/UserCreatedItems";
import { WorkbenchSessionTopic, type WorkbenchSession } from "@framework/WorkbenchSession";
import { PublishSubscribeDelegate } from "@lib/utils/PublishSubscribeDelegate";

import {
    loadMetadataFromBackendAndCreateEnsembleSet,
    type UserEnsembleSetting,
    type UserDeltaEnsembleSetting,
} from "../EnsembleSetLoader";
import { PrivateWorkbenchSettings, type SerializedWorkbenchSettings } from "../PrivateWorkbenchSettings";

import { type WorkbenchSessionDataContainer } from "./utils/WorkbenchSessionDataContainer";

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

export enum PrivateWorkbenchSessionTopic {
    IS_ENSEMBLE_SET_LOADING = "EnsembleSetLoadingState",
    ACTIVE_DASHBOARD = "ActiveDashboard",
    DASHBOARDS = "Dashboards",
}

export type WorkbenchSessionTopicPayloads = {
    [WorkbenchSessionTopic.ENSEMBLE_SET]: EnsembleSet;
    [WorkbenchSessionTopic.REALIZATION_FILTER_SET]: { filterSet: RealizationFilterSet };
    [PrivateWorkbenchSessionTopic.IS_ENSEMBLE_SET_LOADING]: boolean;
    [PrivateWorkbenchSessionTopic.ACTIVE_DASHBOARD]: Dashboard;
    [PrivateWorkbenchSessionTopic.DASHBOARDS]: Dashboard[];
};

export class PrivateWorkbenchSession implements WorkbenchSession {
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<WorkbenchSessionTopicPayloads>();

    private _atomStoreMaster: AtomStoreMaster;
    private _queryClient: QueryClient;
    private _dashboards: Dashboard[] = [];
    private _activeDashboardId: string | null = null;
    private _ensembleSet: EnsembleSet = new EnsembleSet([]);
    private _realizationFilterSet = new RealizationFilterSet();
    private _wrappedRealizationFilterSet = {
        filterSet: this._realizationFilterSet,
    };
    private _userCreatedItems: UserCreatedItems;
    private _isEnsembleSetLoading: boolean = false;
    private _settings: PrivateWorkbenchSettings = new PrivateWorkbenchSettings();

    private constructor(atomStoreMaster: AtomStoreMaster, queryClient: QueryClient) {
        this._atomStoreMaster = atomStoreMaster;
        this._queryClient = queryClient;
        this._userCreatedItems = new UserCreatedItems(atomStoreMaster);
        this._atomStoreMaster.setAtomValue(RealizationFilterSetAtom, this._realizationFilterSet);
    }

    getWorkbenchSettings(): PrivateWorkbenchSettings {
        return this._settings;
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
        this._activeDashboardId = content.activeDashboardId;
        this._dashboards = content.dashboards.map((s) => {
            const d = new Dashboard(this._atomStoreMaster);
            d.deserializeState(s);
            return d;
        });

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
        await this.setEnsembleSet(newSet);
        this.setEnsembleSetLoading(false);
    }

    private setEnsembleSetLoading(isLoading: boolean) {
        this._isEnsembleSetLoading = isLoading;
        this._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSessionTopic.IS_ENSEMBLE_SET_LOADING);
    }

    private async setEnsembleSet(set: EnsembleSet) {
        this._realizationFilterSet.synchronizeWithEnsembleSet(set);
        this._ensembleSet = set;
        // Await the update of the EnsembleTimestampsStore with the latest timestamps before notifying any subscribers
        this._atomStoreMaster.setAtomValue(EnsembleSetAtom, set);
        this._publishSubscribeDelegate.notifySubscribers(WorkbenchSessionTopic.ENSEMBLE_SET);
        this._publishSubscribeDelegate.notifySubscribers(WorkbenchSessionTopic.REALIZATION_FILTER_SET);
    }

    getPublishSubscribeDelegate() {
        return this._publishSubscribeDelegate;
    }

    makeSnapshotGetter<T extends keyof WorkbenchSessionTopicPayloads>(
        topic: T,
    ): () => WorkbenchSessionTopicPayloads[T] {
        const snapshotGetter = (): any => {
            switch (topic) {
                case PrivateWorkbenchSessionTopic.IS_ENSEMBLE_SET_LOADING:
                    return this._isEnsembleSetLoading;
                case WorkbenchSessionTopic.ENSEMBLE_SET:
                    return this._ensembleSet;
                case WorkbenchSessionTopic.REALIZATION_FILTER_SET:
                    return this._wrappedRealizationFilterSet;
                case PrivateWorkbenchSessionTopic.ACTIVE_DASHBOARD:
                    return this.getActiveDashboard();
                case PrivateWorkbenchSessionTopic.DASHBOARDS:
                    return this._dashboards;
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
        this._atomStoreMaster.setAtomValue(RealizationFilterSetAtom, {
            filterSet: this._realizationFilterSet,
        });
        this._wrappedRealizationFilterSet = {
            filterSet: this._realizationFilterSet,
        };
        this._publishSubscribeDelegate.notifySubscribers(WorkbenchSessionTopic.REALIZATION_FILTER_SET);
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
        this._ensembleSet = new EnsembleSet([]);
        EnsembleFingerprintStore.clear();
    }

    beforeDestroy(): void {
        this.clear();
    }

    static async fromDataContainer(
        atomStoreMaster: AtomStoreMaster,
        queryClient: QueryClient,
        dataContainer: WorkbenchSessionDataContainer,
    ): Promise<PrivateWorkbenchSession> {
        const session = new PrivateWorkbenchSession(atomStoreMaster, queryClient);

        await session.loadContent(dataContainer.content);

        return session;
    }

    static createEmpty(atomStoreMaster: AtomStoreMaster, queryClient: QueryClient): PrivateWorkbenchSession {
        const session = new PrivateWorkbenchSession(atomStoreMaster, queryClient);
        session.makeDefaultDashboard();
        return session;
    }
}
