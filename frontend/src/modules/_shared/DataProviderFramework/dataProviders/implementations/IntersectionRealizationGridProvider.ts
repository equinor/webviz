import { isEqual } from "lodash";

import { getGridModelsInfoOptions, postGetPolylineIntersectionOptions } from "@api";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";
import { sortTimeOrIntervalArray } from "@lib/utils/arrays";
import { assertNonNull } from "@lib/utils/assertNonNull";
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
import {
    createIntersectionPolylineWithSectionLengthsForField,
    fetchPlannedWellboreHeaders,
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
    Setting.TIME_OR_INTERVAL,
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
            !isEqual(prevSettings.timeOrInterval, newSettings.timeOrInterval)
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
        return (
            getSetting(Setting.INTERSECTION) !== null &&
            getSetting(Setting.ENSEMBLE) !== null &&
            getSetting(Setting.REALIZATION) !== null &&
            getSetting(Setting.GRID_NAME) !== null &&
            getSetting(Setting.ATTRIBUTE) !== null &&
            getSetting(Setting.TIME_OR_INTERVAL) !== null &&
            getSetting(Setting.SHOW_GRID_LINES) !== null &&
            getSetting(Setting.COLOR_SCALE) !== null
        );
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

        const plannedWellboreHeadersDep = makeSharedResult({
            debugName: "PlannedWellboreHeaders",
            read(read) {
                return {
                    fieldIdentifier: read.globalSetting("fieldId"),
                };
            },
            resolve({ fieldIdentifier }, { abortSignal }) {
                return fetchPlannedWellboreHeaders(fieldIdentifier, abortSignal, queryClient);
            },
        });

        setting(Setting.INTERSECTION).bindValueConstraints({
            read(read) {
                return {
                    wellboreHeaders: read.sharedResult(wellboreHeadersDep),
                    plannedWellboreHeaders: read.sharedResult(plannedWellboreHeadersDep),
                    intersectionPolylines: read.globalSetting("intersectionPolylines"),
                    fieldIdentifier: read.globalSetting("fieldId"),
                };
            },
            resolve({ wellboreHeaders, plannedWellboreHeaders, intersectionPolylines, fieldIdentifier }) {
                const headers = wellboreHeaders ?? [];

                const fieldIntersectionPolylines = intersectionPolylines.filter(
                    (intersectionPolyline) => intersectionPolyline.fieldId === fieldIdentifier,
                );

                return getAvailableIntersectionOptions(
                    headers,
                    fieldIntersectionPolylines,
                    plannedWellboreHeaders ?? [],
                );
            },
        });

        setting(Setting.TIME_OR_INTERVAL).bindValueConstraints({
            read(read) {
                return {
                    gridName: read.localSetting(Setting.GRID_NAME),
                    gridAttribute: read.localSetting(Setting.ATTRIBUTE),
                    data: read.sharedResult(realizationGridDataDep),
                };
            },
            resolve({ gridName, gridAttribute, data }) {
                if (!gridName || !gridAttribute || !data) {
                    return [];
                }

                const gridAttributeArr =
                    data.find((gridModel) => gridModel.grid_name === gridName)?.property_info_arr ?? [];

                return sortTimeOrIntervalArray(
                    Array.from(
                        new Set(
                            gridAttributeArr
                                .filter((attr) => attr.property_name === gridAttribute)
                                .map((gridAttribute) => gridAttribute.iso_date_or_interval ?? "NO_TIME"),
                        ),
                    ),
                );
            },
        });

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
        let timeOrInterval = getSetting(Setting.TIME_OR_INTERVAL);
        if (timeOrInterval === "NO_TIME") {
            timeOrInterval = null;
        }

        const polylineWithSectionLengths = assertNonNull(
            getStoredData("polylineWithSectionLengths"),
            "No polyline and actual section lengths found in stored data",
        );
        if (polylineWithSectionLengths.polylineUtmXy.length < 4) {
            throw new Error("Invalid polyline in stored data. Must contain at least two (x,y)-points");
        }

        const queryOptions = postGetPolylineIntersectionOptions({
            query: {
                case_uuid: ensembleIdent.getCaseUuid(),
                ensemble_name: ensembleIdent.getEnsembleName(),
                grid_name: gridName,
                parameter_name: parameterName,
                parameter_time_or_interval_str: timeOrInterval,
                realization_num: realizationNum,
            },
            body: { polyline_utm_xy: polylineWithSectionLengths.polylineUtmXy },
        });

        const gridIntersectionPromise = fetchQuery(queryOptions).then(transformPolylineIntersection);

        return gridIntersectionPromise;
    }
}
