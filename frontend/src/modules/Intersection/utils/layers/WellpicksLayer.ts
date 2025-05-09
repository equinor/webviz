import { transformFormationData } from "@equinor/esv-intersection";
import type { QueryClient } from "@tanstack/query-core";
import { isEqual } from "lodash";

import { getStratigraphicUnitsOptions, getWellborePicksForWellboreOptions } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

import { BaseLayer } from "./BaseLayer";

export type WellpicksLayerSettings = {
    wellboreUuid: string | null;
    fieldIdentifier: string | null;
    ensembleIdent: RegularEnsembleIdent | null;
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
        newSettings: WellpicksLayerSettings,
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
                    this._settings.selectedNonUnitPicks.includes(pick.identifier),
                ),
            };
        }

        return data;
    }

    protected async fetchData(queryClient: QueryClient): Promise<WellPicksLayerData> {
        const wellborePicksQueryOptions = getWellborePicksForWellboreOptions({
            query: {
                wellbore_uuid: this._settings.wellboreUuid ?? "",
            },
        });

        this.registerQueryKey(wellborePicksQueryOptions.queryKey);

        const wellborePicksPromise = queryClient.fetchQuery({
            ...wellborePicksQueryOptions,
        });

        const stratigraphicUnitsQueryOptions = getStratigraphicUnitsOptions({
            query: {
                case_uuid: this._settings.ensembleIdent?.getCaseUuid() ?? "",
            },
        });

        this.registerQueryKey(stratigraphicUnitsQueryOptions.queryKey);

        const stratigraphicUnitsPromise = queryClient.fetchQuery({
            ...stratigraphicUnitsQueryOptions,
        });

        return Promise.all([wellborePicksPromise, stratigraphicUnitsPromise]).then(
            ([wellborePicks, stratigraphicUnits]) =>
                transformFormationData(wellborePicks as any, stratigraphicUnits as any),
        );
    }
}

export function isWellpicksLayer(layer: BaseLayer<any, any>): layer is WellpicksLayer {
    return layer instanceof WellpicksLayer;
}
