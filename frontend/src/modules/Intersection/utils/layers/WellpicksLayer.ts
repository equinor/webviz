import { transformFormationData } from "@equinor/esv-intersection";
import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { QueryClient } from "@tanstack/query-core";

import { isEqual } from "lodash";

import { BaseLayer } from "./BaseLayer";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export type WellpicksLayerSettings = {
    wellboreUuid: string | null;
    fieldIdentifier: string | null;
    ensembleIdent: EnsembleIdent | null;
    filterPicks: boolean;
    selectedUnitPicks: string[];
    selectedNonUnitPicks: string[];
};

export type WellPicksLayerData = ReturnType<typeof transformFormationData>;

export class WellpicksLayer extends BaseLayer<WellpicksLayerSettings, WellPicksLayerData> {
    constructor(name: string) {
        const defaultSettings = {
            fieldIdentifier: null,
            ensembleIdent: null,
            wellboreUuid: null,
            filterPicks: false,
            selectedUnitPicks: [],
            selectedNonUnitPicks: [],
        };
        super(name, defaultSettings);
    }

    protected areSettingsValid(): boolean {
        return (
            this._settings.fieldIdentifier !== null &&
            this._settings.ensembleIdent !== null &&
            this._settings.wellboreUuid !== null
        );
    }

    protected doSettingsChangesRequireDataRefetch(
        prevSettings: WellpicksLayerSettings,
        newSettings: WellpicksLayerSettings
    ): boolean {
        return (
            prevSettings.wellboreUuid !== newSettings.wellboreUuid ||
            !isEqual(prevSettings.fieldIdentifier, newSettings.fieldIdentifier) ||
            !isEqual(prevSettings.ensembleIdent, newSettings.ensembleIdent)
        );
    }

    getFilteredData(): WellPicksLayerData | null {
        const data = super.getData();
        if (data === null) {
            return null;
        }

        if (this._settings.filterPicks) {
            return {
                unitPicks: data.unitPicks.filter((pick) => this._settings.selectedUnitPicks.includes(pick.name)),
                nonUnitPicks: data.nonUnitPicks.filter((pick) =>
                    this._settings.selectedNonUnitPicks.includes(pick.identifier)
                ),
            };
        }

        return data;
    }

    protected async fetchData(queryClient: QueryClient): Promise<WellPicksLayerData> {
        const queryKey = [
            "getWellborePicksAndStratigraphicUnits",
            this._settings.fieldIdentifier,
            this._settings.wellboreUuid,
        ];
        this.registerQueryKey(queryKey);

        const wellborePicksPromise = queryClient.fetchQuery({
            queryKey,
            queryFn: () =>
                apiService.well.getWellborePicksForWellbore(
                    this._settings.fieldIdentifier ?? "",
                    this._settings.wellboreUuid ?? ""
                ),
            staleTime: STALE_TIME,
            gcTime: CACHE_TIME,
        });

        const stratigraphicUnitsPromise = queryClient.fetchQuery({
            queryKey: ["getStratigraphicUnits", this._settings.ensembleIdent?.getCaseUuid()],
            queryFn: () => apiService.surface.getStratigraphicUnits(this._settings.ensembleIdent?.getCaseUuid() ?? ""),
            staleTime: STALE_TIME,
            gcTime: CACHE_TIME,
        });

        return Promise.all([wellborePicksPromise, stratigraphicUnitsPromise]).then(
            ([wellborePicks, stratigraphicUnits]) => transformFormationData(wellborePicks, stratigraphicUnits as any)
        );
    }
}

export function isWellpicksLayer(layer: BaseLayer<any, any>): layer is WellpicksLayer {
    return layer instanceof WellpicksLayer;
}
