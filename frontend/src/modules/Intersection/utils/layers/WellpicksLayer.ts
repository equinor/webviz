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
    ensembleIdent: EnsembleIdent | null;
    filterPicks: boolean;
    selectedUnitPicks: string[];
    selectedNonUnitPicks: string[];
};

export type WellPicksLayerData = ReturnType<typeof transformFormationData>;

export class WellpicksLayer extends BaseLayer<WellpicksLayerSettings, WellPicksLayerData> {
    constructor(name: string, queryClient: QueryClient) {
        const defaultSettings = {
            ensembleIdent: null,
            wellboreUuid: null,
            filterPicks: false,
            selectedUnitPicks: [],
            selectedNonUnitPicks: [],
        };
        super(name, defaultSettings, queryClient);
    }

    protected areSettingsValid(): boolean {
        return this._settings.ensembleIdent !== null && this._settings.wellboreUuid !== null;
    }

    protected doSettingsChangesRequireDataRefetch(
        prevSettings: WellpicksLayerSettings,
        newSettings: WellpicksLayerSettings
    ): boolean {
        return (
            prevSettings.wellboreUuid !== newSettings.wellboreUuid ||
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

    protected async fetchData(): Promise<WellPicksLayerData> {
        const queryKey = [
            "getWellborePicksAndStratigraphicUnits",
            this._settings.ensembleIdent?.getCaseUuid(),
            this._settings.wellboreUuid,
        ];
        this.registerQueryKey(queryKey);

        return this._queryClient
            .fetchQuery({
                queryKey,
                queryFn: () =>
                    apiService.well.getWellborePicksAndStratigraphicUnits(
                        this._settings.ensembleIdent?.getCaseUuid() ?? "",
                        this._settings.wellboreUuid ?? ""
                    ),
                staleTime: STALE_TIME,
                gcTime: CACHE_TIME,
            })
            .then((data) => transformFormationData(data.wellbore_picks, data.stratigraphic_units as any));
    }
}

export function isWellpicksLayer(layer: BaseLayer<any, any>): layer is WellpicksLayer {
    return layer instanceof WellpicksLayer;
}
