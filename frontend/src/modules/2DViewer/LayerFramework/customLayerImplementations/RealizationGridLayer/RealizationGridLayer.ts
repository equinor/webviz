import { getGridModelsInfoOptions, getGridParameterOptions, getGridSurfaceOptions } from "@api";
import {
    GridMappedProperty_trans,
    GridSurface_trans,
    transformGridMappedProperty,
    transformGridSurface,
} from "@modules/3DViewer/view/queries/queryDataTransforms";
import {
    BoundingBox,
    CustomDataLayerImplementation,
    DataLayerInformationAccessors,
    DefineDependenciesArgs,
    FetchDataParams,
    LayerColoringType,
} from "@modules/_shared/LayerFramework/interfaces";
import { MakeSettingTypesMap, SettingType } from "@modules/_shared/LayerFramework/settings/settingsTypes";

import { isEqual } from "lodash";

import { RealizationGridSettings } from "./types";

type SettingsWithTypes = MakeSettingTypesMap<RealizationGridSettings>;

type Data = {
    gridSurfaceData: GridSurface_trans;
    gridParameterData: GridMappedProperty_trans;
};

export class RealizationGridLayer implements CustomDataLayerImplementation<RealizationGridSettings, Data> {
    settings: RealizationGridSettings = [
        SettingType.ENSEMBLE,
        SettingType.REALIZATION,
        SettingType.ATTRIBUTE,
        SettingType.GRID_NAME,
        SettingType.GRID_LAYER_K,
        SettingType.TIME_OR_INTERVAL,
        SettingType.SHOW_GRID_LINES,
    ];

    getDefaultName(): string {
        return "Realization Grid";
    }

    getColoringType() {
        return LayerColoringType.COLORSCALE;
    }

    doSettingsChangesRequireDataRefetch(prevSettings: SettingsWithTypes, newSettings: SettingsWithTypes): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    makeBoundingBox({ getData }: DataLayerInformationAccessors<SettingsWithTypes, Data>): BoundingBox | null {
        const data = getData();
        if (!data) {
            return null;
        }

        return {
            x: [
                data.gridSurfaceData.origin_utm_x + data.gridSurfaceData.xmin,
                data.gridSurfaceData.origin_utm_x + data.gridSurfaceData.xmax,
            ],
            y: [
                data.gridSurfaceData.origin_utm_y + data.gridSurfaceData.ymin,
                data.gridSurfaceData.origin_utm_y + data.gridSurfaceData.ymax,
            ],
            z: [data.gridSurfaceData.zmin, data.gridSurfaceData.zmax],
        };
    }

    makeValueRange({ getData }: DataLayerInformationAccessors<SettingsWithTypes, Data>): [number, number] | null {
        const data = getData();
        if (!data) {
            return null;
        }

        return [data.gridParameterData.min_grid_prop_value, data.gridParameterData.max_grid_prop_value];
    }

    fetchData({
        getSetting,
        getAvailableSettingValues,
        registerQueryKey,
        queryClient,
    }: FetchDataParams<SettingsWithTypes, Data>): Promise<{
        gridSurfaceData: GridSurface_trans;
        gridParameterData: GridMappedProperty_trans;
    }> {
        const ensembleIdent = getSetting(SettingType.ENSEMBLE);
        const realizationNum = getSetting(SettingType.REALIZATION);
        const gridName = getSetting(SettingType.GRID_NAME);
        const attribute = getSetting(SettingType.ATTRIBUTE);
        let timeOrInterval = getSetting(SettingType.TIME_OR_INTERVAL);
        if (timeOrInterval === "NO_TIME") {
            timeOrInterval = null;
        }
        let availableDimensions = getAvailableSettingValues(SettingType.GRID_LAYER_K);
        if (!availableDimensions.length || availableDimensions[0] === null) {
            availableDimensions = [0, 0, 0];
        }
        const layerIndex = getSetting(SettingType.GRID_LAYER_K);
        const iMin = 0;
        const iMax = availableDimensions[0] || 0;
        const jMin = 0;
        const jMax = availableDimensions[1] || 0;
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

    areCurrentSettingsValid(settings: SettingsWithTypes): boolean {
        return (
            settings[SettingType.ENSEMBLE] !== null &&
            settings[SettingType.REALIZATION] !== null &&
            settings[SettingType.GRID_NAME] !== null &&
            settings[SettingType.ATTRIBUTE] !== null &&
            settings[SettingType.GRID_LAYER_K] !== null &&
            settings[SettingType.TIME_OR_INTERVAL] !== null
        );
    }

    defineDependencies({
        helperDependency,
        availableSettingsUpdater,
        queryClient,
    }: DefineDependenciesArgs<RealizationGridSettings, SettingsWithTypes>) {
        availableSettingsUpdater(SettingType.ENSEMBLE, ({ getGlobalSetting }) => {
            const fieldIdentifier = getGlobalSetting("fieldId");
            const ensembles = getGlobalSetting("ensembles");

            const ensembleIdents = ensembles
                .filter((ensemble) => ensemble.getFieldIdentifier() === fieldIdentifier)
                .map((ensemble) => ensemble.getIdent());

            return ensembleIdents;
        });

        availableSettingsUpdater(SettingType.REALIZATION, ({ getLocalSetting, getGlobalSetting }) => {
            const ensembleIdent = getLocalSetting(SettingType.ENSEMBLE);
            const realizationFilterFunc = getGlobalSetting("realizationFilterFunction");

            if (!ensembleIdent) {
                return [];
            }

            const realizations = realizationFilterFunc(ensembleIdent);

            return [...realizations];
        });
        const realizationGridDataDep = helperDependency(async ({ getLocalSetting, abortSignal }) => {
            const ensembleIdent = getLocalSetting(SettingType.ENSEMBLE);
            const realization = getLocalSetting(SettingType.REALIZATION);

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

        availableSettingsUpdater(SettingType.GRID_NAME, ({ getHelperDependency }) => {
            const data = getHelperDependency(realizationGridDataDep);

            if (!data) {
                return [];
            }

            const availableGridNames = [...Array.from(new Set(data.map((gridModelInfo) => gridModelInfo.grid_name)))];

            return availableGridNames;
        });

        availableSettingsUpdater(SettingType.ATTRIBUTE, ({ getLocalSetting, getHelperDependency }) => {
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

        availableSettingsUpdater(SettingType.GRID_LAYER_K, ({ getLocalSetting, getHelperDependency }) => {
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
            const gridAttribute = getLocalSetting(SettingType.ATTRIBUTE);
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
