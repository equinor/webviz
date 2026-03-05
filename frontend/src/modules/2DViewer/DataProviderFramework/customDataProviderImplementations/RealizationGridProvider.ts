import { isEqual } from "lodash";

import { getGridModelsInfoOptions, getGridParameterOptions, getGridSurfaceOptions } from "@api";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";
import type {
    CustomDataProviderImplementation,
    DataProviderAccessors,
    FetchDataParams,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { SetupBindingsContext } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import type { MakeSettingTypesMap } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/utils";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import type { RealizationGridData } from "@modules/_shared/DataProviderFramework/visualization/utils/types";
import {
    transformGridMappedProperty,
    transformGridSurface,
    type GridMappedProperty_trans,
    type GridSurface_trans,
} from "@modules/_shared/utils/queryDataTransforms";

const realizationGridSettings = [
    Setting.ENSEMBLE,
    Setting.REALIZATION,
    Setting.ATTRIBUTE,
    Setting.GRID_NAME,
    Setting.GRID_LAYER_K,
    Setting.TIME_OR_INTERVAL,
    Setting.SHOW_GRID_LINES,
    Setting.COLOR_SCALE,
    Setting.OPACITY_PERCENT,
] as const;
export type RealizationGridSettings = typeof realizationGridSettings;
type SettingsWithTypes = MakeSettingTypesMap<RealizationGridSettings>;

type StoredData = {
    availableGridDimensions: {
        i: number;
        j: number;
        k: number;
    };
};

export class RealizationGridProvider
    implements CustomDataProviderImplementation<RealizationGridSettings, RealizationGridData, StoredData>
{
    settings = realizationGridSettings;

    getDefaultSettingsValues() {
        return {
            [Setting.SHOW_GRID_LINES]: false,
            [Setting.OPACITY_PERCENT]: 100,
        };
    }

    getDefaultName() {
        return "Grid Model Layer";
    }

    doSettingsChangesRequireDataRefetch(prevSettings: SettingsWithTypes, newSettings: SettingsWithTypes): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    makeValueRange({
        getData,
    }: DataProviderAccessors<RealizationGridSettings, RealizationGridData, StoredData>): [number, number] | null {
        const data = getData();
        if (!data) {
            return null;
        }

        return [data.gridParameterData.min_grid_prop_value, data.gridParameterData.max_grid_prop_value];
    }

    fetchData({
        getSetting,
        getStoredData,
        fetchQuery,
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

        const gridParameterOptions = getGridParameterOptions({
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
                ...makeCacheBustingQueryParam(ensembleIdent ?? null),
            },
        });

        const gridSurfaceOptions = getGridSurfaceOptions({
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
                ...makeCacheBustingQueryParam(ensembleIdent ?? null),
            },
        });

        const gridParameterPromise = fetchQuery(gridParameterOptions).then(transformGridMappedProperty);

        const gridSurfacePromise = fetchQuery(gridSurfaceOptions).then(transformGridSurface);

        return Promise.all([gridSurfacePromise, gridParameterPromise]).then(([gridSurfaceData, gridParameterData]) => ({
            gridSurfaceData,
            gridParameterData,
        }));
    }

    areCurrentSettingsValid({
        getSetting,
    }: DataProviderAccessors<RealizationGridSettings, RealizationGridData, StoredData>): boolean {
        return (
            getSetting(Setting.ENSEMBLE) !== null &&
            getSetting(Setting.REALIZATION) !== null &&
            getSetting(Setting.GRID_NAME) !== null &&
            getSetting(Setting.ATTRIBUTE) !== null &&
            getSetting(Setting.GRID_LAYER_K) !== null &&
            getSetting(Setting.TIME_OR_INTERVAL) !== null
        );
    }

    setupBindings({
        setting,
        storedData,
        makeSharedResult,
        queryClient,
    }: SetupBindingsContext<RealizationGridSettings, StoredData>) {
        setting(Setting.ENSEMBLE).bindValueConstraints({
            read({ read }) {
                return {
                    fieldIdentifier: read.globalSetting("fieldId"),
                    ensembles: read.globalSetting("ensembles"),
                };
            },
            resolve({ ensembles, fieldIdentifier }) {
                const ensembleIdents = ensembles
                    .filter((ensemble) => ensemble.getFieldIdentifier() === fieldIdentifier)
                    .map((ensemble) => ensemble.getIdent());

                return ensembleIdents;
            },
        });

        setting(Setting.REALIZATION).bindValueConstraints({
            read({ read }) {
                return {
                    ensembleIdent: read.localSetting(Setting.ENSEMBLE),
                    realizationFilterFunction: read.globalSetting("realizationFilterFunction"),
                };
            },
            resolve({ ensembleIdent, realizationFilterFunction }) {
                if (!ensembleIdent) {
                    return [];
                }
                const realizations = realizationFilterFunction(ensembleIdent);
                return [...realizations];
            },
        });

        const gridData = makeSharedResult({
            debugName: "RealizationGridData",
            read({ read }) {
                return {
                    ensembleIdent: read.localSetting(Setting.ENSEMBLE),
                    realization: read.localSetting(Setting.REALIZATION),
                };
            },
            async resolve({ ensembleIdent, realization }, abortSignal) {
                if (!ensembleIdent || realization === null) {
                    return null;
                }

                return queryClient.fetchQuery({
                    ...getGridModelsInfoOptions({
                        query: {
                            case_uuid: ensembleIdent.getCaseUuid(),
                            ensemble_name: ensembleIdent.getEnsembleName(),
                            realization_num: realization,
                            ...makeCacheBustingQueryParam(ensembleIdent),
                        },
                        signal: abortSignal,
                    }),
                });
            },
        });

        setting(Setting.GRID_NAME).bindValueConstraints({
            read({ read }) {
                return {
                    gridData: read.sharedResult(gridData),
                };
            },
            resolve({ gridData }) {
                if (!gridData) {
                    return [];
                }

                const availableGridNames = [...new Set(gridData.map((gridModelInfo) => gridModelInfo.grid_name))];

                return availableGridNames;
            },
        });

        setting(Setting.ATTRIBUTE).bindValueConstraints({
            read({ read }) {
                return {
                    gridName: read.localSetting(Setting.GRID_NAME),
                    gridData: read.sharedResult(gridData),
                };
            },
            resolve({ gridName, gridData }) {
                if (!gridName || !gridData) {
                    return [];
                }

                const gridModelInfo = gridData.find((gridModel) => gridModel.grid_name === gridName);
                const availableAttributes = [
                    ...new Set(gridModelInfo?.property_info_arr.map((propertyInfo) => propertyInfo.property_name)),
                ];

                return availableAttributes;
            },
        });

        setting(Setting.GRID_LAYER_K).bindValueConstraints({
            read({ read }) {
                return {
                    gridName: read.localSetting(Setting.GRID_NAME),
                    gridData: read.sharedResult(gridData),
                };
            },
            resolve({ gridName, gridData }) {
                if (!gridName || !gridData) {
                    return [0, 0];
                }

                const gridDimensions =
                    gridData.find((gridModel) => gridModel.grid_name === gridName)?.dimensions ?? null;
                const availableGridLayers: [number, number] = [0, 0];
                if (gridDimensions) {
                    availableGridLayers[1] = gridDimensions.k_count;
                }

                return availableGridLayers;
            },
        });

        setting(Setting.TIME_OR_INTERVAL).bindValueConstraints({
            read({ read }) {
                return {
                    gridName: read.localSetting(Setting.GRID_NAME),
                    gridAttribute: read.localSetting(Setting.ATTRIBUTE),
                    gridData: read.sharedResult(gridData),
                };
            },
            resolve({ gridName, gridAttribute, gridData }) {
                if (!gridName || !gridAttribute || !gridData) {
                    return [];
                }

                const gridAttributeArr =
                    gridData.find((gridModel) => gridModel.grid_name === gridName)?.property_info_arr ?? [];

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
            },
        });

        storedData("availableGridDimensions").bindValue({
            read({ read }) {
                return {
                    gridData: read.sharedResult(gridData),
                };
            },
            resolve({ gridData }) {
                if (!gridData) {
                    return {
                        i: 0,
                        j: 0,
                        k: 0,
                    };
                }

                const gridDimensions = gridData[0].dimensions;

                return {
                    i: gridDimensions.i_count,
                    j: gridDimensions.j_count,
                    k: gridDimensions.k_count,
                };
            },
        });
    }
}
