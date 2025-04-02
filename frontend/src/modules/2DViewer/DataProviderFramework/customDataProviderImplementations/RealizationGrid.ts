import { getGridModelsInfoOptions, getGridParameterOptions, getGridSurfaceOptions } from "@api";
import type { GridMappedProperty_trans, GridSurface_trans } from "@modules/3DViewer/view/queries/queryDataTransforms";
import { transformGridMappedProperty, transformGridSurface } from "@modules/3DViewer/view/queries/queryDataTransforms";
import type { DefineDependenciesArgs } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import type { MakeSettingTypesMap } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import type {
    CustomDataProviderImplementation,
    DataProviderInformationAccessors,
    FetchDataParams,
} from "@modules/_shared/LayerFramework/interfacesAndTypes/customDataProviderImplementation";

import { isEqual } from "lodash";

const realizationGridSettings = [
    Setting.ENSEMBLE,
    Setting.REALIZATION,
    Setting.ATTRIBUTE,
    Setting.GRID_NAME,
    Setting.GRID_LAYER_K,
    Setting.TIME_OR_INTERVAL,
    Setting.SHOW_GRID_LINES,
    Setting.COLOR_SCALE,
] as const;
export type RealizationGridSettings = typeof realizationGridSettings;
type SettingsWithTypes = MakeSettingTypesMap<RealizationGridSettings>;

export type RealizationGridData = {
    gridSurfaceData: GridSurface_trans;
    gridParameterData: GridMappedProperty_trans;
};

type StoredData = {
    availableGridDimensions: {
        i: number;
        j: number;
        k: number;
    };
};

export class RealizationGrid
    implements CustomDataProviderImplementation<RealizationGridSettings, RealizationGridData, StoredData>
{
    settings = realizationGridSettings;

    getDefaultSettingsValues() {
        return {
            [Setting.SHOW_GRID_LINES]: false,
        };
    }

    getDefaultName() {
        return "Realization Grid";
    }

    doSettingsChangesRequireDataRefetch(prevSettings: SettingsWithTypes, newSettings: SettingsWithTypes): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    makeValueRange({
        getData,
    }: DataProviderInformationAccessors<RealizationGridSettings, RealizationGridData, StoredData>):
        | [number, number]
        | null {
        const data = getData();
        if (!data) {
            return null;
        }

        return [data.gridParameterData.min_grid_prop_value, data.gridParameterData.max_grid_prop_value];
    }

    fetchData({
        getSetting,
        getStoredData,
        registerQueryKey,
        queryClient,
    }: FetchDataParams<RealizationGridSettings, RealizationGridData, StoredData>): Promise<{
        gridSurfaceData: GridSurface_trans;
        gridParameterData: GridMappedProperty_trans;
    }> {
        const ensembleIdent = getSetting(Setting.ENSEMBLE);
        const realizationNum = getSetting(Setting.REALIZATION);
        const gridName = getSetting(Setting.GRID_NAME);
        const attribute = getSetting(Setting.ATTRIBUTE);
        let timeOrInterval = getSetting(Setting.TIME_OR_INTERVAL);
        if (timeOrInterval === "NO_TIME") {
            timeOrInterval = null;
        }
        const availableDimensions = getStoredData("availableGridDimensions");
        const layerIndex = getSetting(Setting.GRID_LAYER_K);
        const iMin = 0;
        const iMax = availableDimensions?.i ?? 0;
        const jMin = 0;
        const jMax = availableDimensions?.j ?? 0;
        const kMin = layerIndex || 0;
        const kMax = layerIndex || 0;
        const queryKey = [
            "gridParameter",
            ensembleIdent,
            gridName,
            attribute,
            timeOrInterval,
            realizationNum,
            iMin,
            iMax,
            jMin,
            jMax,
            kMin,
            kMax,
        ];
        registerQueryKey(queryKey);

        const gridParameterPromise = queryClient
            .fetchQuery({
                ...getGridParameterOptions({
                    query: {
                        case_uuid: ensembleIdent?.getCaseUuid() ?? "",
                        ensemble_name: ensembleIdent?.getEnsembleName() ?? "",
                        grid_name: gridName ?? "",
                        parameter_name: attribute ?? "",
                        parameter_time_or_interval_str: timeOrInterval,
                        realization_num: realizationNum ?? 0,
                        i_min: iMin,
                        i_max: iMax - 1,
                        j_min: jMin,
                        j_max: jMax - 1,
                        k_min: kMin,
                        k_max: kMax,
                    },
                }),
            })
            .then(transformGridMappedProperty);

        const gridSurfacePromise = queryClient
            .fetchQuery({
                ...getGridSurfaceOptions({
                    query: {
                        case_uuid: ensembleIdent?.getCaseUuid() ?? "",
                        ensemble_name: ensembleIdent?.getEnsembleName() ?? "",
                        grid_name: gridName ?? "",
                        realization_num: realizationNum ?? 0,
                        i_min: iMin,
                        i_max: iMax - 1,
                        j_min: jMin,
                        j_max: jMax - 1,
                        k_min: kMin,
                        k_max: kMax,
                    },
                }),
            })
            .then(transformGridSurface);

        return Promise.all([gridSurfacePromise, gridParameterPromise]).then(([gridSurfaceData, gridParameterData]) => ({
            gridSurfaceData,
            gridParameterData,
        }));
    }

    areCurrentSettingsValid({
        getSetting,
    }: DataProviderInformationAccessors<RealizationGridSettings, RealizationGridData, StoredData>): boolean {
        return (
            getSetting(Setting.ENSEMBLE) !== null &&
            getSetting(Setting.REALIZATION) !== null &&
            getSetting(Setting.GRID_NAME) !== null &&
            getSetting(Setting.ATTRIBUTE) !== null &&
            getSetting(Setting.GRID_LAYER_K) !== null &&
            getSetting(Setting.TIME_OR_INTERVAL) !== null
        );
    }

    defineDependencies({
        helperDependency,
        availableSettingsUpdater,
        storedDataUpdater,
        queryClient,
    }: DefineDependenciesArgs<RealizationGridSettings, StoredData>) {
        availableSettingsUpdater(Setting.ENSEMBLE, ({ getGlobalSetting }) => {
            const fieldIdentifier = getGlobalSetting("fieldId");
            const ensembles = getGlobalSetting("ensembles");

            const ensembleIdents = ensembles
                .filter((ensemble) => ensemble.getFieldIdentifier() === fieldIdentifier)
                .map((ensemble) => ensemble.getIdent());

            return ensembleIdents;
        });

        availableSettingsUpdater(Setting.REALIZATION, ({ getLocalSetting, getGlobalSetting }) => {
            const ensembleIdent = getLocalSetting(Setting.ENSEMBLE);
            const realizationFilterFunc = getGlobalSetting("realizationFilterFunction");

            if (!ensembleIdent) {
                return [];
            }

            const realizations = realizationFilterFunc(ensembleIdent);

            return [...realizations];
        });
        const realizationGridDataDep = helperDependency(async ({ getLocalSetting, abortSignal }) => {
            const ensembleIdent = getLocalSetting(Setting.ENSEMBLE);
            const realization = getLocalSetting(Setting.REALIZATION);

            if (!ensembleIdent || realization === null) {
                return null;
            }

            return await queryClient.fetchQuery({
                ...getGridModelsInfoOptions({
                    query: {
                        case_uuid: ensembleIdent.getCaseUuid(),
                        ensemble_name: ensembleIdent.getEnsembleName(),
                        realization_num: realization,
                    },
                    signal: abortSignal,
                }),
            });
        });

        availableSettingsUpdater(Setting.GRID_NAME, ({ getHelperDependency }) => {
            const data = getHelperDependency(realizationGridDataDep);

            if (!data) {
                return [];
            }

            const availableGridNames = [...Array.from(new Set(data.map((gridModelInfo) => gridModelInfo.grid_name)))];

            return availableGridNames;
        });

        availableSettingsUpdater(Setting.ATTRIBUTE, ({ getLocalSetting, getHelperDependency }) => {
            const gridName = getLocalSetting(Setting.GRID_NAME);
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

        availableSettingsUpdater(Setting.GRID_LAYER_K, ({ getLocalSetting, getHelperDependency }) => {
            const gridName = getLocalSetting(Setting.GRID_NAME);
            const data = getHelperDependency(realizationGridDataDep);

            if (!gridName || !data) {
                return [0, 0];
            }

            const gridDimensions = data.find((gridModel) => gridModel.grid_name === gridName)?.dimensions ?? null;
            const availableGridLayers: [number, number] = [0, 0];
            if (gridDimensions) {
                availableGridLayers[1] = gridDimensions.k_count;
            }

            return availableGridLayers;
        });

        availableSettingsUpdater(Setting.TIME_OR_INTERVAL, ({ getLocalSetting, getHelperDependency }) => {
            const gridName = getLocalSetting(Setting.GRID_NAME);
            const gridAttribute = getLocalSetting(Setting.ATTRIBUTE);
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
                            .map((gridAttribute) => gridAttribute.iso_date_or_interval ?? "NO_TIME"),
                    ),
                ),
            ];

            return availableTimeOrIntervals;
        });

        storedDataUpdater("availableGridDimensions", ({ getHelperDependency }) => {
            const data = getHelperDependency(realizationGridDataDep);

            if (!data) {
                return {
                    i: 0,
                    j: 0,
                    k: 0,
                };
            }

            const gridDimensions = data[0].dimensions;

            return {
                i: gridDimensions.i_count,
                j: gridDimensions.j_count,
                k: gridDimensions.k_count,
            };
        });
    }
}
