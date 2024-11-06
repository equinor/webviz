import { Grid3dInfo_api, Grid3dPropertyInfo_api } from "@api";
import { apiService } from "@framework/ApiService";
import { LayerManager } from "@modules/2DViewer/layers/LayerManager";
import { SettingsContextDelegate } from "@modules/2DViewer/layers/delegates/SettingsContextDelegate";
import { CACHE_TIME, STALE_TIME } from "@modules/2DViewer/layers/queryConstants";
import { SettingType } from "@modules/2DViewer/layers/settingsTypes";
import { cancelPromiseOnAbort } from "@modules/2DViewer/layers/utils";

import { RealizationGridSettings } from "./types";

import { DefineDependenciesArgs, FetchDataFunctionResult, SettingsContext } from "../../../interfaces";
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
    defineDependencies({
        helperDependency,
        availableSettingsUpdater,
        workbenchSession,
        queryClient,
    }: DefineDependenciesArgs<RealizationGridSettings>) {
        availableSettingsUpdater(SettingType.ENSEMBLE, ({ getGlobalSetting }) => {
            const fieldIdentifier = getGlobalSetting("fieldId");
            const ensembleSet = workbenchSession.getEnsembleSet();

            const ensembleIdents = ensembleSet
                .getEnsembleArr()
                .filter((ensemble) => ensemble.getFieldIdentifier() === fieldIdentifier)
                .map((ensemble) => ensemble.getIdent());

            return ensembleIdents;
        });

        availableSettingsUpdater(SettingType.REALIZATION, ({ getLocalSetting }) => {
            const ensembleIdent = getLocalSetting(SettingType.ENSEMBLE);

            if (!ensembleIdent) {
                return [];
            }

            const realizations = workbenchSession
                .getRealizationFilterSet()
                .getRealizationFilterForEnsembleIdent(ensembleIdent)
                .getFilteredRealizations();

            return [...realizations];
        });
        const realizationGridDataDep = helperDependency(async ({ getLocalSetting, abortSignal }) => {
            const ensembleIdent = getLocalSetting(SettingType.ENSEMBLE);
            const realization = getLocalSetting(SettingType.REALIZATION);

            if (!ensembleIdent || realization === null) {
                return null;
            }

            return await queryClient.fetchQuery({
                queryKey: ["getRealizationGridMetadata", ensembleIdent, realization],
                queryFn: () =>
                    cancelPromiseOnAbort(
                        apiService.grid3D.getGridModelsInfo(
                            ensembleIdent.getCaseUuid(),
                            ensembleIdent.getEnsembleName(),
                            realization
                        ),
                        abortSignal
                    ),
                staleTime: STALE_TIME,
                gcTime: CACHE_TIME,
            });
        });

        availableSettingsUpdater(SettingType.GRID_NAME, ({ getHelperDependency }) => {
            const data = getHelperDependency(realizationGridDataDep);

            if (!data) {
                return [];
            }

            const availableGridNames = [...Array.from(new Set(data.map((gridModelInfo) => gridModelInfo.grid_name)))];

            return availableGridNames;
        });

        availableSettingsUpdater(SettingType.GRID_ATTRIBUTE, ({ getLocalSetting, getHelperDependency }) => {
            const gridName = getLocalSetting(SettingType.GRID_NAME);
            const data = getHelperDependency(realizationGridDataDep);

            if (!gridName || !data) {
                return [];
            }

            const gridAttributeArr =
                data.find((gridModel) => gridModel.grid_name === gridName)?.property_info_arr ?? [];

            const availableGridAttributes = [
                ...Array.from(new Set(gridAttributeArr.map((gridAttribute) => gridAttribute.property_name))),
            ];

            return availableGridAttributes;
        });

        availableSettingsUpdater(SettingType.GRID_LAYER, ({ getLocalSetting, getHelperDependency }) => {
            const gridName = getLocalSetting(SettingType.GRID_NAME);
            const data = getHelperDependency(realizationGridDataDep);

            if (!gridName || !data) {
                return [];
            }

            const gridDimensions = data.find((gridModel) => gridModel.grid_name === gridName)?.dimensions ?? null;
            const availableGridLayers: number[] = [];
            if (gridDimensions) {
                availableGridLayers.push(gridDimensions.i_count);
                availableGridLayers.push(gridDimensions.j_count);
                availableGridLayers.push(gridDimensions.k_count);
            }

            return availableGridLayers;
        });

        availableSettingsUpdater(SettingType.TIME_OR_INTERVAL, ({ getLocalSetting, getHelperDependency }) => {
            const gridName = getLocalSetting(SettingType.GRID_NAME);
            const gridAttribute = getLocalSetting(SettingType.GRID_ATTRIBUTE);
            const data = getHelperDependency(realizationGridDataDep);

            if (!gridName || !gridAttribute || !data) {
                return [];
            }

            const gridAttributeArr =
                data.find((gridModel) => gridModel.grid_name === gridName)?.property_info_arr ?? [];

            const availableTimeOrIntervals = [
                ...Array.from(
                    new Set(
                        gridAttributeArr
                            .filter((attr) => attr.property_name === gridAttribute)
                            .map((gridAttribute) => gridAttribute.iso_date_or_interval ?? "NO_TIME")
                    )
                ),
            ];

            return availableTimeOrIntervals;
        });
    }
}
