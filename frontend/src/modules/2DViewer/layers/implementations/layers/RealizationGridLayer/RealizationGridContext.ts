import { Grid3dInfo_api, Grid3dPropertyInfo_api } from "@api";
import { apiService } from "@framework/ApiService";
import { SettingsContextDelegate } from "@modules/2DViewer/layers/delegates/SettingsContextDelegate";
import { CACHE_TIME, STALE_TIME } from "@modules/2DViewer/layers/queryConstants";
import { SettingType } from "@modules/2DViewer/layers/settingsTypes";

import { RealizationGridSettings } from "./types";

import { FetchDataFunctionResult, SettingsContext } from "../../../interfaces";
import { Ensemble } from "../../settings/Ensemble";
import { GridAttribute } from "../../settings/GridAttribute";
import { GridLayer } from "../../settings/GridLayer";
import { GridName } from "../../settings/GridName";
import { Realization } from "../../settings/Realization";
import { ShowGridLines } from "../../settings/ShowGridLines";
import { TimeOrInterval } from "../../settings/TimeOrInterval";

export class RealizationGridContext implements SettingsContext<RealizationGridSettings> {
    private _contextDelegate: SettingsContextDelegate<RealizationGridSettings>;

    constructor(layerManager: LayerManager) {
        this._contextDelegate = new SettingsContextDelegate<RealizationGridSettings, keyof RealizationGridSettings>(
            this,
            layerManager,
            {
                [SettingType.ENSEMBLE]: new Ensemble(),
                [SettingType.REALIZATION]: new Realization(),
                [SettingType.GRID_NAME]: new GridName(),
                [SettingType.GRID_ATTRIBUTE]: new GridAttribute(),
                [SettingType.GRID_LAYER]: new GridLayer(),
                [SettingType.TIME_OR_INTERVAL]: new TimeOrInterval(),
                [SettingType.SHOW_GRID_LINES]: new ShowGridLines(),
            }
        );
    }

    getDelegate(): SettingsContextDelegate<RealizationGridSettings> {
        return this._contextDelegate;
    }

    getSettings() {
        return this._contextDelegate.getSettings();
    }

    async fetchData(
        oldValues: Partial<RealizationGridSettings>,
        newValues: Partial<RealizationGridSettings>
    ): Promise<FetchDataFunctionResult> {
        const queryClient = this.getDelegate().getLayerManager().getQueryClient();
        const settings = this.getDelegate().getSettings();
        const workbenchSession = this.getDelegate().getLayerManager().getWorkbenchSession();
        const ensembleSet = workbenchSession.getEnsembleSet();
        const fieldIdentifier = this.getDelegate().getLayerManager().getGlobalSetting("fieldId");

        this.getDelegate().setAvailableValues(
            SettingType.ENSEMBLE,
            ensembleSet
                .getEnsembleArr()
                .filter((ensemble) => ensemble.getFieldIdentifier() === fieldIdentifier)
                .map((ensemble) => ensemble.getIdent())
        );

        const currentEnsembleIdent = newValues[SettingType.ENSEMBLE];

        if (currentEnsembleIdent) {
            const realizations = workbenchSession
                .getRealizationFilterSet()
                .getRealizationFilterForEnsembleIdent(currentEnsembleIdent)
                .getFilteredRealizations();
            this.getDelegate().setAvailableValues(SettingType.REALIZATION, [...realizations]);
        }

        let fetchedData: Grid3dInfo_api[] | null = null;

        settings[SettingType.GRID_ATTRIBUTE].getDelegate().setIsLoading(true);
        settings[SettingType.GRID_NAME].getDelegate().setIsLoading(true);
        settings[SettingType.GRID_LAYER].getDelegate().setIsLoading(true);
        settings[SettingType.TIME_OR_INTERVAL].getDelegate().setIsLoading(true);

        try {
            fetchedData = await queryClient.fetchQuery({
                queryKey: [
                    "getRealizationGridsMetadata",
                    newValues[SettingType.ENSEMBLE],
                    newValues[SettingType.REALIZATION],
                ],
                queryFn: () =>
                    apiService.grid3D.getGridModelsInfo(
                        newValues[SettingType.ENSEMBLE]?.getCaseUuid() ?? "",
                        newValues[SettingType.ENSEMBLE]?.getEnsembleName() ?? "",
                        newValues[SettingType.REALIZATION] ?? 0
                    ),
                staleTime: STALE_TIME,
                gcTime: CACHE_TIME,
            });
        } catch (e) {
            settings[SettingType.GRID_ATTRIBUTE].getDelegate().setIsLoading(false);
            settings[SettingType.GRID_NAME].getDelegate().setIsLoading(false);
            settings[SettingType.GRID_LAYER].getDelegate().setIsLoading(false);
            settings[SettingType.TIME_OR_INTERVAL].getDelegate().setIsLoading(false);
            return FetchDataFunctionResult.ERROR;
        }

        if (!fetchedData) {
            return FetchDataFunctionResult.IN_PROGRESS;
        }

        const availableGridNames: string[] = [];
        availableGridNames.push(...Array.from(new Set(fetchedData.map((gridModel) => gridModel.grid_name))));
        this._contextDelegate.setAvailableValues(SettingType.GRID_NAME, availableGridNames);

        const currentGridName = newValues[SettingType.GRID_NAME];

        const gridDimensions =
            fetchedData.find((gridModel) => gridModel.grid_name === currentGridName)?.dimensions ?? null;
        const availableGridLayers: number[] = [];
        if (gridDimensions) {
            availableGridLayers.push(gridDimensions.i_count);
            availableGridLayers.push(gridDimensions.j_count);
            availableGridLayers.push(gridDimensions.k_count);
        }
        this._contextDelegate.setAvailableValues(SettingType.GRID_LAYER, availableGridLayers);

        const availableGridAttributes: string[] = [];
        const gridAttributeArr: Grid3dPropertyInfo_api[] =
            fetchedData.find((gridModel) => gridModel.grid_name === currentGridName)?.property_info_arr ?? [];

        if (currentGridName) {
            availableGridAttributes.push(...Array.from(new Set(gridAttributeArr.map((el) => el.property_name))));
        }
        this._contextDelegate.setAvailableValues(SettingType.GRID_ATTRIBUTE, availableGridAttributes);

        const currentGridAttribute = newValues[SettingType.GRID_ATTRIBUTE];
        const availableTimeOrIntervals: string[] = [];

        if (currentGridName && currentGridAttribute) {
            availableTimeOrIntervals.push(
                ...Array.from(
                    new Set(
                        gridAttributeArr
                            .filter((attr) => attr.property_name === currentGridAttribute)
                            .map((el) => el.iso_date_or_interval ?? "NO_TIME")
                    )
                )
            );
        }
        this._contextDelegate.setAvailableValues(SettingType.TIME_OR_INTERVAL, availableTimeOrIntervals);

        settings[SettingType.GRID_ATTRIBUTE].getDelegate().setIsLoading(false);
        settings[SettingType.GRID_NAME].getDelegate().setIsLoading(false);
        settings[SettingType.GRID_LAYER].getDelegate().setIsLoading(false);
        settings[SettingType.TIME_OR_INTERVAL].getDelegate().setIsLoading(false);

        return FetchDataFunctionResult.SUCCESS;
    }

    areCurrentSettingsValid(settings: RealizationGridSettings): boolean {
        return (
            settings[SettingType.GRID_ATTRIBUTE] !== null &&
            settings[SettingType.GRID_NAME] !== null &&
            settings[SettingType.ENSEMBLE] !== null &&
            settings[SettingType.TIME_OR_INTERVAL] !== null
        );
    }
}
