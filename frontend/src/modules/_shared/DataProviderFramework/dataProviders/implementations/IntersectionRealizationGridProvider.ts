import { isEqual } from "lodash-es";

import {
    getGridModelsInfoOptions,
    postGetPolylineIntersectionOptions,
    postGetPolylineIntersectionTimeDiffOptions,
} from "@api";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";
import { assertNonNull } from "@lib/utils/assertNonNull";
import { TimeType } from "@modules/_shared/DataProviderFramework/settings/implementations/TimeTypeSetting";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import type { PolylineIntersection_trans } from "@modules/_shared/Intersection/gridIntersectionTransform";
import { transformPolylineIntersection } from "@modules/_shared/Intersection/gridIntersectionTransform";
import type { PolylineWithSectionLengths } from "@modules/_shared/Intersection/intersectionPolylineTypes";

import type {
    CustomDataProviderImplementation,
    DataProviderAccessors,
    FetchDataParams,
} from "../../interfacesAndTypes/customDataProviderImplementation";
import type { SetupBindingsContext } from "../../interfacesAndTypes/customSettingsHandler";
import type { MakeSettingTypesMap } from "../../interfacesAndTypes/utils";
import { getAvailableTimeTypes, makeGridPropertyTimeInfo } from "../dependencyFunctions/gridPropertyTimeFunctions";
import {
    createIntersectionPolylineWithSectionLengthsForField,
    fetchWellboreHeaders,
} from "../dependencyFunctions/sharedHelperDependencyFunctions";
import {
    getAvailableIntersectionOptions,
    getAvailableEnsembleIdentsForField,
    getAvailableRealizationsForEnsembleIdent,
} from "../dependencyFunctions/sharedSettingUpdaterFunctions";

const intersectionRealizationGridSettings = [
    Setting.INTERSECTION,
    Setting.ENSEMBLE,
    Setting.REALIZATION,
    Setting.GRID_NAME,
    Setting.ATTRIBUTE,
    Setting.TIME_TYPE,
    Setting.TIME_POINT,
    Setting.TIME_INTERVAL,
    Setting.TIME_POINT_PAIR,
    Setting.SHOW_GRID_LINES,
    Setting.COLOR_SCALE,
    Setting.OPACITY_PERCENT,
] as const;
export type IntersectionRealizationGridSettings = typeof intersectionRealizationGridSettings;
type SettingsWithTypes = MakeSettingTypesMap<IntersectionRealizationGridSettings>;

export type IntersectionRealizationGridStoredData = {
    polylineWithSectionLengths: PolylineWithSectionLengths;
};

export type IntersectionRealizationGridData = PolylineIntersection_trans;

export class IntersectionRealizationGridProvider implements CustomDataProviderImplementation<
    IntersectionRealizationGridSettings,
    IntersectionRealizationGridData,
    IntersectionRealizationGridStoredData
> {
    settings = intersectionRealizationGridSettings;

    getDefaultSettingsValues() {
        return {
            [Setting.SHOW_GRID_LINES]: false,
            [Setting.OPACITY_PERCENT]: 100,
        };
    }

    getDefaultName(): string {
        return "Grid Model Fence";
    }

    doSettingsChangesRequireDataRefetch(prevSettings: SettingsWithTypes, newSettings: SettingsWithTypes): boolean {
        return (
            !prevSettings ||
            !isEqual(prevSettings.intersection, newSettings.intersection) ||
            !isEqual(prevSettings.ensemble, newSettings.ensemble) ||
            !isEqual(prevSettings.realization, newSettings.realization) ||
            !isEqual(prevSettings.gridName, newSettings.gridName) ||
            !isEqual(prevSettings.attribute, newSettings.attribute) ||
            !isEqual(prevSettings.timeType, newSettings.timeType) ||
            !isEqual(prevSettings.timePoint, newSettings.timePoint) ||
            !isEqual(prevSettings.timeInterval, newSettings.timeInterval) ||
            !isEqual(prevSettings.timePointPair, newSettings.timePointPair)
        );
    }

    makeValueRange({
        getData,
    }: DataProviderAccessors<
        IntersectionRealizationGridSettings,
        IntersectionRealizationGridData,
        IntersectionRealizationGridStoredData
    >): [number, number] | null {
        const data = getData();
        if (!data) {
            return null;
        }

        if (data) {
            // Note: min and max for entire grid, not only for the intersection
            return [data.min_grid_prop_value, data.max_grid_prop_value];
        }

        return null;
    }

    areCurrentSettingsValid({
        getSetting,
    }: DataProviderAccessors<
        IntersectionRealizationGridSettings,
        IntersectionRealizationGridData,
        IntersectionRealizationGridStoredData
    >): boolean {
        if (
            getSetting(Setting.INTERSECTION) === null ||
            getSetting(Setting.ENSEMBLE) === null ||
            getSetting(Setting.REALIZATION) === null ||
            getSetting(Setting.GRID_NAME) === null ||
            getSetting(Setting.ATTRIBUTE) === null ||
            getSetting(Setting.SHOW_GRID_LINES) === null ||
            getSetting(Setting.COLOR_SCALE) === null
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

    setupBindings({
        setting,
        storedData,
        makeSharedResult,
        queryClient,
        workbenchSession,
    }: SetupBindingsContext<IntersectionRealizationGridSettings, IntersectionRealizationGridStoredData>): void {
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
                    realizationFilterFunc: read.globalSetting("realizationFilterFunction"),
                };
            },
            resolve({ ensembleIdent, realizationFilterFunc }) {
                return getAvailableRealizationsForEnsembleIdent(ensembleIdent, realizationFilterFunc);
            },
        });

        const realizationGridDataDep = makeSharedResult({
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
                    data: read.sharedResult(realizationGridDataDep),
                };
            },
            resolve({ data }) {
                if (!data) {
                    return [];
                }

                const availableGridNames = Array.from(
                    new Set(data.map((gridModelInfo) => gridModelInfo.grid_name)),
                ).sort();

                return availableGridNames;
            },
        });

        setting(Setting.ATTRIBUTE).bindValueConstraints({
            read(read) {
                return {
                    gridName: read.localSetting(Setting.GRID_NAME),
                    data: read.sharedResult(realizationGridDataDep),
                };
            },
            resolve({ gridName, data }) {
                if (!gridName || !data) {
                    return [];
                }

                const gridAttributeArr =
                    data.find((gridModel) => gridModel.grid_name === gridName)?.property_info_arr ?? [];

                const availableGridAttributes = Array.from(
                    new Set(gridAttributeArr.map((gridAttribute) => gridAttribute.property_name)),
                ).sort();

                return availableGridAttributes;
            },
        });

        const wellboreHeadersDep = makeSharedResult({
            debugName: "WellboreHeaders",
            read(read) {
                return {
                    fieldIdentifier: read.globalSetting("fieldId"),
                };
            },
            resolve({ fieldIdentifier }, { abortSignal }) {
                return fetchWellboreHeaders(fieldIdentifier, abortSignal, queryClient);
            },
        });

        setting(Setting.INTERSECTION).bindValueConstraints({
            read(read) {
                return {
                    wellboreHeaders: read.sharedResult(wellboreHeadersDep),
                    intersectionPolylines: read.globalSetting("intersectionPolylines"),
                    fieldIdentifier: read.globalSetting("fieldId"),
                };
            },
            resolve({ wellboreHeaders, intersectionPolylines, fieldIdentifier }) {
                const headers = wellboreHeaders ?? [];

                const fieldIntersectionPolylines = intersectionPolylines.filter(
                    (intersectionPolyline) => intersectionPolyline.fieldId === fieldIdentifier,
                );

                return getAvailableIntersectionOptions(headers, fieldIntersectionPolylines);
            },
        });

        const timeInfoDep = makeSharedResult({
            debugName: "RealizationGridPropertyTimeInfo",
            read(read) {
                return {
                    gridName: read.localSetting(Setting.GRID_NAME),
                    gridAttribute: read.localSetting(Setting.ATTRIBUTE),
                    data: read.sharedResult(realizationGridDataDep),
                };
            },
            resolve({ gridName, gridAttribute, data }) {
                return makeGridPropertyTimeInfo(data, gridName, gridAttribute);
            },
        });

        setting(Setting.TIME_TYPE).bindValueConstraints({
            read(read) {
                return { timeInfo: read.sharedResult(timeInfoDep) };
            },
            resolve({ timeInfo }) {
                return timeInfo ? getAvailableTimeTypes(timeInfo, { allowComputedInterval: true }) : [];
            },
        });

        setting(Setting.TIME_POINT).bindValueConstraints({
            read(read) {
                return { timeInfo: read.sharedResult(timeInfoDep) };
            },
            resolve({ timeInfo }) {
                return timeInfo?.timePoints ?? [];
            },
        });

        setting(Setting.TIME_INTERVAL).bindValueConstraints({
            read(read) {
                return { timeInfo: read.sharedResult(timeInfoDep) };
            },
            resolve({ timeInfo }) {
                return timeInfo?.intervals ?? [];
            },
        });

        setting(Setting.TIME_POINT_PAIR).bindValueConstraints({
            read(read) {
                return { timeInfo: read.sharedResult(timeInfoDep) };
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

        // Create intersection polyline and actual section lengths data asynchronously
        const intersectionPolylineWithSectionLengthsDep = makeSharedResult({
            debugName: "IntersectionPolylineWithSectionLengths",
            read(read) {
                return {
                    fieldIdentifier: read.globalSetting("fieldId"),
                    intersection: read.localSetting(Setting.INTERSECTION),
                };
            },
            resolve({ fieldIdentifier, intersection }, { abortSignal }) {
                return createIntersectionPolylineWithSectionLengthsForField(
                    fieldIdentifier,
                    intersection,
                    workbenchSession,
                    queryClient,
                    abortSignal,
                );
            },
        });

        storedData("polylineWithSectionLengths").bindValue({
            read(read) {
                return {
                    intersectionPolylineWithSectionLengths: read.sharedResult(
                        intersectionPolylineWithSectionLengthsDep,
                    ),
                };
            },
            resolve({ intersectionPolylineWithSectionLengths }) {
                // If no intersection is selected, or polyline is empty, cancel update
                if (
                    !intersectionPolylineWithSectionLengths ||
                    intersectionPolylineWithSectionLengths.polylineUtmXy.length === 0
                ) {
                    return { polylineUtmXy: [], actualSectionLengths: [] };
                }

                return intersectionPolylineWithSectionLengths;
            },
        });
    }

    fetchData({
        getSetting,
        getStoredData,
        fetchQuery,
    }: FetchDataParams<
        IntersectionRealizationGridSettings,
        IntersectionRealizationGridData,
        IntersectionRealizationGridStoredData
    >): Promise<IntersectionRealizationGridData> {
        const ensembleIdent = assertNonNull(getSetting(Setting.ENSEMBLE), "No ensemble selected");
        const realizationNum = assertNonNull(getSetting(Setting.REALIZATION), "No realization number selected");
        const gridName = assertNonNull(getSetting(Setting.GRID_NAME), "No grid name selected");
        const parameterName = assertNonNull(getSetting(Setting.ATTRIBUTE), "No attribute selected");

        const timeType = getSetting(Setting.TIME_TYPE);

        const polylineWithSectionLengths = assertNonNull(
            getStoredData("polylineWithSectionLengths"),
            "No polyline and actual section lengths found in stored data",
        );
        if (polylineWithSectionLengths.polylineUtmXy.length < 4) {
            throw new Error("Invalid polyline in stored data. Must contain at least two (x,y)-points");
        }

        const commonQuery = {
            case_uuid: ensembleIdent.getCaseUuid(),
            ensemble_name: ensembleIdent.getEnsembleName(),
            grid_name: gridName,
            parameter_name: parameterName,
            realization_num: realizationNum,
        };
        const body = { polyline_utm_xy: polylineWithSectionLengths.polylineUtmXy };

        if (timeType === TimeType.COMPUTED_INTERVAL) {
            const timePointPair = assertNonNull(
                getSetting(Setting.TIME_POINT_PAIR),
                "No time steps to calculate the difference between selected",
            );

            return fetchQuery(
                postGetPolylineIntersectionTimeDiffOptions({
                    query: {
                        ...commonQuery,
                        base_time_str: timePointPair[0],
                        monitor_time_str: timePointPair[1],
                    },
                    body,
                }),
            ).then(transformPolylineIntersection);
        }

        let timeOrInterval: string | null = null;
        if (timeType === TimeType.TIME_POINT) {
            timeOrInterval = getSetting(Setting.TIME_POINT);
        } else if (timeType === TimeType.INTERVAL) {
            timeOrInterval = getSetting(Setting.TIME_INTERVAL);
        }

        return fetchQuery(
            postGetPolylineIntersectionOptions({
                query: {
                    ...commonQuery,
                    parameter_time_or_interval_str: timeOrInterval,
                },
                body,
            }),
        ).then(transformPolylineIntersection);
    }
}
