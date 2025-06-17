import type { QueryClient } from "@tanstack/query-core";

import type { AtomStoreMaster } from "@framework/AtomStoreMaster";
import { Dashboard, type SerializedDashboard } from "@framework/Dashboard";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

import type { EnsembleSet } from "../EnsembleSet";
import { EnsembleSetAtom, RealizationFilterSetAtom } from "../GlobalAtoms";
import { WorkbenchSession, WorkbenchSessionEvent } from "../WorkbenchSession";

import {
    loadMetadataFromBackendAndCreateEnsembleSet,
    type UserDeltaEnsembleSetting,
    type UserEnsembleSetting,
} from "./EnsembleSetLoader";

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
    activeDashboardId: string | null;
    dashboards: SerializedDashboard[];
    ensembleSet: SerializedEnsembleSet;
};

export class WorkbenchSessionPrivate extends WorkbenchSession {
    private _atomStoreMaster: AtomStoreMaster;
    private _activeDashboardId: string | null = null;
    private _dashboards: Dashboard[] = [];
    private _queryClient: QueryClient;

    constructor(atomStoreMaster: AtomStoreMaster, queryClient: QueryClient) {
        super(atomStoreMaster);
        this._atomStoreMaster = atomStoreMaster;
        this._atomStoreMaster.setAtomValue(RealizationFilterSetAtom, this._realizationFilterSet);
        this._queryClient = queryClient;

        this.makeDefaultDashboard();
    }

    serializeState(): SerializedWorkbenchSession {
        return {
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

    private async loadAndSetupEnsembleSetInSession(
        queryClient: QueryClient,
        userEnsembleSettings: UserEnsembleSetting[],
        userDeltaEnsembleSettings: UserDeltaEnsembleSetting[],
    ): Promise<void> {
        console.debug("loadAndSetupEnsembleSetInSession - starting load");
        this.setEnsembleSetLoadingState(true);
        const newEnsembleSet = await loadMetadataFromBackendAndCreateEnsembleSet(
            queryClient,
            userEnsembleSettings,
            userDeltaEnsembleSettings,
        );
        console.debug("loadAndSetupEnsembleSetInSession - loading done");
        console.debug("loadAndSetupEnsembleSetInSession - publishing");
        this.setEnsembleSetLoadingState(false);
        this.setEnsembleSet(newEnsembleSet);
    }

    makeDefaultDashboard() {
        const defaultDashboard = new Dashboard(this._atomStoreMaster);
        this._dashboards.push(defaultDashboard);
        this._activeDashboardId = defaultDashboard.getId();
    }

    setEnsembleSetLoadingState(isLoading: boolean): void {
        this.notifySubscribers(WorkbenchSessionEvent.EnsembleSetLoadingStateChanged, { isLoading });
    }

    setEnsembleSet(newEnsembleSet: EnsembleSet): void {
        this._realizationFilterSet.synchronizeWithEnsembleSet(newEnsembleSet);
        this._ensembleSet = newEnsembleSet;
        this._atomStoreMaster.setAtomValue(EnsembleSetAtom, newEnsembleSet);
        this.notifySubscribers(WorkbenchSessionEvent.EnsembleSetChanged);
        this.notifySubscribers(WorkbenchSessionEvent.RealizationFilterSetChanged);
    }

    notifyAboutEnsembleRealizationFilterChange(): void {
        this._atomStoreMaster.setAtomValue(RealizationFilterSetAtom, {
            filterSet: this._realizationFilterSet,
        });
        this.notifySubscribers(WorkbenchSessionEvent.RealizationFilterSetChanged);
    }
}
