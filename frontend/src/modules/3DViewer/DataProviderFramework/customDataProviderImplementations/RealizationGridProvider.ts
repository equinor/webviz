import { isEqual } from "lodash-es";

import {
    getGridModelsInfoOptions,
    getGridParameterOptions,
    getGridParameterTimeDiffOptions,
    getGridSurfaceOptions,
} from "@api";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";
import {
    getAvailableTimeTypes,
    makeGridPropertyTimeInfo,
} from "@modules/_shared/DataProviderFramework/dataProviders/dependencyFunctions/gridPropertyTimeFunctions";
import {
    getAvailableEnsembleIdentsForField,
    getAvailableRealizationsForEnsembleIdent,
} from "@modules/_shared/DataProviderFramework/dataProviders/dependencyFunctions/sharedSettingUpdaterFunctions";
import { NO_UPDATE } from "@modules/_shared/DataProviderFramework/delegates/_utils/Dependency";
import type {
    CustomDataProviderImplementation,
    DataProviderAccessors,
    FetchDataParams,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { SetupBindingsContext } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import type { MakeSettingTypesMap } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/utils";
import { TimeType } from "@modules/_shared/DataProviderFramework/settings/implementations/TimeTypeSetting";
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
    Setting.GRID_NAME,
    Setting.ATTRIBUTE,
    Setting.TIME_TYPE,
    Setting.TIME_POINT,
    Setting.TIME_INTERVAL,
    Setting.TIME_POINT_PAIR,
    Setting.GRID_LAYER_RANGE,
    Setting.SHOW_GRID_LINES,
    Setting.COLOR_SCALE,
    Setting.OPACITY_PERCENT,
] as const;
export type RealizationGridSettings = typeof realizationGridSettings;
type SettingsWithTypes = MakeSettingTypesMap<RealizationGridSettings>;

export class RealizationGridProvider implements CustomDataProviderImplementation<
    RealizationGridSettings,
    RealizationGridData
> {
    settings = realizationGridSettings;

    getDefaultSettingsValues() {
        return {
            [Setting.SHOW_GRID_LINES]: false,
            [Setting.OPACITY_PERCENT]: 100,
        };
    }

    getDefaultName() {
        return "Grid Model 3D";
    }

    doSettingsChangesRequireDataRefetch(
        prevSettings: SettingsWithTypes | null,
        newSettings: SettingsWithTypes,
    ): boolean {
        if (prevSettings === null) {
            return true;
        }
        if (
            prevSettings[Setting.ENSEMBLE] !== newSettings[Setting.ENSEMBLE] ||
            prevSettings[Setting.REALIZATION] !== newSettings[Setting.REALIZATION] ||
            prevSettings[Setting.GRID_NAME] !== newSettings[Setting.GRID_NAME] ||
            prevSettings[Setting.ATTRIBUTE] !== newSettings[Setting.ATTRIBUTE] ||
            prevSettings[Setting.TIME_TYPE] !== newSettings[Setting.TIME_TYPE] ||
            prevSettings[Setting.TIME_POINT] !== newSettings[Setting.TIME_POINT] ||
            prevSettings[Setting.TIME_INTERVAL] !== newSettings[Setting.TIME_INTERVAL] ||
            !isEqual(prevSettings[Setting.TIME_POINT_PAIR], newSettings[Setting.TIME_POINT_PAIR]) ||
            prevSettings[Setting.GRID_LAYER_RANGE] !== newSettings[Setting.GRID_LAYER_RANGE]
        ) {
            return true;
        }
        return false;
    }

    makeValueRange({
        getData,
    }: DataProviderAccessors<RealizationGridSettings, RealizationGridData>): [number, number] | null {
        const data = getData();
        if (!data) {
            return null;
        }

        return [data.gridParameterData.min_grid_prop_value, data.gridParameterData.max_grid_prop_value];
    }

    fetchData({ getSetting, fetchQuery }: FetchDataParams<RealizationGridSettings, RealizationGridData>): Promise<{
        gridSurfaceData: GridSurface_trans;
        gridParameterData: GridMappedProperty_trans;
    }> {
        const ensembleIdent = getSetting(Setting.ENSEMBLE);
        const realizationNum = getSetting(Setting.REALIZATION);
        const gridName = getSetting(Setting.GRID_NAME);
        const attribute = getSetting(Setting.ATTRIBUTE);
        const timeType = getSetting(Setting.TIME_TYPE);
        const range = getSetting(Setting.GRID_LAYER_RANGE);

        if (range === null) {
            throw new Error("Grid ranges are not set");
        }

        const commonQuery = {
            case_uuid: ensembleIdent?.getCaseUuid() ?? "",
            ensemble_name: ensembleIdent?.getEnsembleName() ?? "",
            grid_name: gridName ?? "",
            realization_num: realizationNum ?? 0,
            i_min: range[0][0],
            i_max: range[0][1],
            j_min: range[1][0],
            j_max: range[1][1],
            k_min: range[2][0],
            k_max: range[2][1],
            ...makeCacheBustingQueryParam(ensembleIdent ?? null),
        };

        let gridParameterPromise: Promise<GridMappedProperty_trans>;
        if (timeType === TimeType.COMPUTED_INTERVAL) {
            const timePointPair = getSetting(Setting.TIME_POINT_PAIR);
            if (timePointPair === null) {
                throw new Error("Time steps to calculate the difference between are not set");
            }

            gridParameterPromise = fetchQuery(
                getGridParameterTimeDiffOptions({
                    query: {
                        ...commonQuery,
                        parameter_name: attribute ?? "",
                        base_time_str: timePointPair[0],
                        monitor_time_str: timePointPair[1],
                    },
                }),
            ).then(transformGridMappedProperty);
        } else {
            let timeOrIntervalStr: string | null = null;
            if (timeType === TimeType.TIME_POINT) {
                timeOrIntervalStr = getSetting(Setting.TIME_POINT);
            } else if (timeType === TimeType.INTERVAL) {
                timeOrIntervalStr = getSetting(Setting.TIME_INTERVAL);
            }

            gridParameterPromise = fetchQuery(
                getGridParameterOptions({
                    query: {
                        ...commonQuery,
                        parameter_name: attribute ?? "",
                        parameter_time_or_interval_str: timeOrIntervalStr,
                    },
                }),
            ).then(transformGridMappedProperty);
        }

        const gridSurfaceOptions = getGridSurfaceOptions({
            query: commonQuery,
        });

        const gridSurfacePromise = fetchQuery(gridSurfaceOptions).then(transformGridSurface);

        return Promise.all([gridSurfacePromise, gridParameterPromise]).then(([gridSurfaceData, gridParameterData]) => ({
            gridSurfaceData,
            gridParameterData,
        }));
    }

    areCurrentSettingsValid({
        getSetting,
    }: DataProviderAccessors<RealizationGridSettings, RealizationGridData>): boolean {
        if (
            getSetting(Setting.ENSEMBLE) === null ||
            getSetting(Setting.REALIZATION) === null ||
            getSetting(Setting.GRID_NAME) === null ||
            getSetting(Setting.ATTRIBUTE) === null ||
            getSetting(Setting.GRID_LAYER_RANGE) === null
        ) {
            return false;
        }

        switch (getSetting(Setting.TIME_TYPE)) {
            case TimeType.NO_TIME:
                return true;
            case TimeType.TIME_POINT:
                return getSetting(Setting.TIME_POINT) !== null;
            case TimeType.INTERVAL:
                return getSetting(Setting.TIME_INTERVAL) !== null;
            case TimeType.COMPUTED_INTERVAL:
                return getSetting(Setting.TIME_POINT_PAIR) !== null;
            default:
                return false;
        }
    }

    setupBindings({ setting, makeSharedResult, queryClient }: SetupBindingsContext<RealizationGridSettings>) {
        setting(Setting.ENSEMBLE).bindValueConstraints({
            read(read) {
                return {
                    fieldIdentifier: read.globalSetting("fieldId"),
                    ensembles: read.globalSetting("ensembles"),
                };
            },
            resolve({ fieldIdentifier, ensembles }) {
                return getAvailableEnsembleIdentsForField(fieldIdentifier, ensembles);
            },
        });

        setting(Setting.REALIZATION).bindValueConstraints({
            read(read) {
                return {
                    ensembleIdent: read.localSetting(Setting.ENSEMBLE),
                    realizationFilterFunction: read.globalSetting("realizationFilterFunction"),
                };
            },
            resolve({ ensembleIdent, realizationFilterFunction }) {
                return getAvailableRealizationsForEnsembleIdent(ensembleIdent, realizationFilterFunction);
            },
        });

        const gridData = makeSharedResult({
            debugName: "RealizationGridData",
            read(read) {
                return {
                    ensembleIdent: read.localSetting(Setting.ENSEMBLE),
                    realization: read.localSetting(Setting.REALIZATION),
                };
            },
            async resolve({ ensembleIdent, realization }, { abortSignal }) {
                if (!ensembleIdent || realization === null) {
                    return null;
                }

                return await queryClient.fetchQuery({
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
            read(read) {
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
            read(read) {
                return {
                    gridName: read.localSetting(Setting.GRID_NAME),
                    gridData: read.sharedResult(gridData),
                };
            },
            resolve({ gridName, gridData }) {
                if (!gridName || !gridData) {
                    return [];
                }

                const gridAttributeArr =
                    gridData.find((gridModel) => gridModel.grid_name === gridName)?.property_info_arr ?? [];

                const availableGridAttributes = [
                    ...new Set(gridAttributeArr.map((gridAttribute) => gridAttribute.property_name)),
                ];

                return availableGridAttributes;
            },
        });

        setting(Setting.GRID_LAYER_RANGE).bindValueConstraints({
            read(read) {
                return {
                    gridName: read.localSetting(Setting.GRID_NAME),
                    gridData: read.sharedResult(gridData),
                };
            },
            resolve({ gridName, gridData }) {
                if (!gridName || !gridData) {
                    return NO_UPDATE;
                }

                const gridDimensions =
                    gridData.find((gridModel) => gridModel.grid_name === gridName)?.dimensions ?? null;
                if (!gridDimensions) {
                    return NO_UPDATE;
                }

                return {
                    range: {
                        i: [0, gridDimensions.i_count - 1, 1],
                        j: [0, gridDimensions.j_count - 1, 1],
                        k: [0, gridDimensions.k_count - 1, 1],
                    },
                    zones: gridDimensions.subgrids,
                };
            },
        });

        const timeInfo = makeSharedResult({
            debugName: "RealizationGridPropertyTimeInfo",
            read(read) {
                return {
                    gridName: read.localSetting(Setting.GRID_NAME),
                    gridAttribute: read.localSetting(Setting.ATTRIBUTE),
                    gridData: read.sharedResult(gridData),
                };
            },
            resolve({ gridName, gridAttribute, gridData }) {
                return makeGridPropertyTimeInfo(gridData, gridName, gridAttribute);
            },
        });

        setting(Setting.TIME_TYPE).bindValueConstraints({
            read(read) {
                return { timeInfo: read.sharedResult(timeInfo) };
            },
            resolve({ timeInfo }) {
                return timeInfo ? getAvailableTimeTypes(timeInfo, { allowComputedInterval: true }) : [];
            },
        });

        setting(Setting.TIME_POINT).bindValueConstraints({
            read(read) {
                return { timeInfo: read.sharedResult(timeInfo) };
            },
            resolve({ timeInfo }) {
                return timeInfo?.timePoints ?? [];
            },
        });

        setting(Setting.TIME_INTERVAL).bindValueConstraints({
            read(read) {
                return { timeInfo: read.sharedResult(timeInfo) };
            },
            resolve({ timeInfo }) {
                return timeInfo?.intervals ?? [];
            },
        });

        setting(Setting.TIME_POINT_PAIR).bindValueConstraints({
            read(read) {
                return { timeInfo: read.sharedResult(timeInfo) };
            },
            resolve({ timeInfo }) {
                return timeInfo?.timePoints ?? [];
            },
        });

        for (const [timeSetting, requiredTimeType] of [
            [Setting.TIME_POINT, TimeType.TIME_POINT],
            [Setting.TIME_INTERVAL, TimeType.INTERVAL],
            [Setting.TIME_POINT_PAIR, TimeType.COMPUTED_INTERVAL],
        ] as const) {
            setting(timeSetting).bindAttributes({
                read(read) {
                    return { timeType: read.localSetting(Setting.TIME_TYPE) };
                },
                resolve({ timeType }) {
                    const visible = timeType === requiredTimeType;
                    return { enabled: visible, visible };
                },
            });
        }
    }
}
