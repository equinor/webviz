import { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import { isEqual } from "lodash";

import {
    getDrilledWellboreHeadersOptions,
    getGridModelsInfoOptions,
    getWellTrajectoriesOptions,
    postGetPolylineIntersectionOptions,
} from "@api";
import type { IntersectionSettingValue } from "@modules/_shared/DataProviderFramework/settings/implementations/IntersectionSetting";
import { type MakeSettingTypesMap, Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import type { PolylineIntersection_trans } from "@modules/_shared/utils/wellbore";
import {
    calcExtendedSimplifiedWellboreTrajectoryInXYPlane,
    transformPolylineIntersection,
} from "@modules/_shared/utils/wellbore";

import type {
    CustomDataProviderImplementation,
    DataProviderInformationAccessors,
    FetchDataParams,
} from "../../interfacesAndTypes/customDataProviderImplementation";
import type { DefineDependenciesArgs } from "../../interfacesAndTypes/customSettingsHandler";

const intersectionRealizationGridSettings = [
    Setting.INTERSECTION,
    Setting.ENSEMBLE,
    Setting.REALIZATION,
    Setting.ATTRIBUTE,
    Setting.GRID_NAME,
    Setting.TIME_OR_INTERVAL,
    Setting.SHOW_GRID_LINES,
    Setting.COLOR_SCALE,
    Setting.SHOW_GRID_LINES,
] as const;
export type IntersectionRealizationGridSettings = typeof intersectionRealizationGridSettings;
type SettingsWithTypes = MakeSettingTypesMap<IntersectionRealizationGridSettings>;

export type IntersectionRealizationGridData = PolylineIntersection_trans;

type StoredData = {
    polyline: number[];
};

export class IntersectionRealizationGridProvider
    implements
        CustomDataProviderImplementation<
            IntersectionRealizationGridSettings,
            IntersectionRealizationGridData,
            StoredData
        >
{
    settings = intersectionRealizationGridSettings;

    getDefaultSettingsValues() {
        return {
            [Setting.SHOW_GRID_LINES]: false,
        };
    }

    getDefaultName(): string {
        return "Intersection Realization Grid";
    }

    doSettingsChangesRequireDataRefetch(prevSettings: SettingsWithTypes, newSettings: SettingsWithTypes): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    makeValueRange({
        getData,
    }: DataProviderInformationAccessors<
        IntersectionRealizationGridSettings,
        IntersectionRealizationGridData,
        StoredData
    >): [number, number] | null {
        const data = getData();
        if (!data) {
            return null;
        }

        if (data) {
            return [data.min_grid_prop_value, data.max_grid_prop_value];
        }

        return null;
    }

    areCurrentSettingsValid({
        getSetting,
    }: DataProviderInformationAccessors<
        IntersectionRealizationGridSettings,
        IntersectionRealizationGridData,
        StoredData
    >): boolean {
        return (
            getSetting(Setting.INTERSECTION) !== null &&
            getSetting(Setting.ENSEMBLE) !== null &&
            getSetting(Setting.REALIZATION) !== null &&
            getSetting(Setting.GRID_NAME) !== null &&
            getSetting(Setting.ATTRIBUTE) !== null &&
            getSetting(Setting.TIME_OR_INTERVAL) !== null
        );
    }

    defineDependencies({
        helperDependency,
        availableSettingsUpdater,
        queryClient,
        workbenchSession,
    }: DefineDependenciesArgs<IntersectionRealizationGridSettings, StoredData>): void {
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

        const wellboreHeadersDep = helperDependency(async function fetchData({ getLocalSetting, abortSignal }) {
            const ensembleIdent = getLocalSetting(Setting.ENSEMBLE);

            if (!ensembleIdent) {
                return null;
            }

            const ensembleSet = workbenchSession.getEnsembleSet();
            const ensemble = ensembleSet.findEnsemble(ensembleIdent);

            if (!ensemble) {
                return null;
            }

            const fieldIdentifier = ensemble.getFieldIdentifier();

            return await queryClient.fetchQuery({
                ...getDrilledWellboreHeadersOptions({
                    query: { field_identifier: fieldIdentifier },
                    signal: abortSignal,
                }),
            });
        });

        availableSettingsUpdater(Setting.INTERSECTION, ({ getHelperDependency, getGlobalSetting }) => {
            const wellboreHeaders = getHelperDependency(wellboreHeadersDep);
            const intersectionPolylines = getGlobalSetting("intersectionPolylines");

            if (!wellboreHeaders) {
                return [];
            }

            const intersectionOptions: IntersectionSettingValue[] = [];
            for (const wellboreHeader of wellboreHeaders) {
                intersectionOptions.push({
                    type: "wellbore",
                    name: wellboreHeader.uniqueWellboreIdentifier,
                    uuid: wellboreHeader.wellboreUuid,
                });
            }

            for (const polyline of intersectionPolylines) {
                intersectionOptions.push({
                    type: "polyline",
                    name: polyline.name,
                    uuid: polyline.id,
                });
            }

            return intersectionOptions;
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
    }

    fetchData({
        getSetting,
        getGlobalSetting,
        registerQueryKey,
        queryClient,
    }: FetchDataParams<
        IntersectionRealizationGridSettings,
        IntersectionRealizationGridData
    >): Promise<IntersectionRealizationGridData> {
        const ensembleIdent = getSetting(Setting.ENSEMBLE);
        const realizationNum = getSetting(Setting.REALIZATION);
        const intersection = getSetting(Setting.INTERSECTION);
        const gridName = getSetting(Setting.GRID_NAME);
        const parameterName = getSetting(Setting.ATTRIBUTE);
        let timeOrInterval = getSetting(Setting.TIME_OR_INTERVAL);
        if (timeOrInterval === "NO_TIME") {
            timeOrInterval = null;
        }

        const fieldIdentifier = getGlobalSetting("fieldId");

        let makePolylinePromise: Promise<number[]> = new Promise((resolve) => {
            resolve([]);
        });

        if (intersection) {
            makePolylinePromise = new Promise((resolve) => {
                if (intersection.type === "wellbore") {
                    const wellboreQueryOptions = getWellTrajectoriesOptions({
                        query: {
                            field_identifier: fieldIdentifier ?? "",
                            wellbore_uuids: [intersection.uuid],
                        },
                    });

                    registerQueryKey(wellboreQueryOptions.queryKey);

                    return queryClient
                        .fetchQuery(wellboreQueryOptions)
                        .then((data) => {
                            const path: number[][] = [];
                            for (const [index, northing] of data[0].northingArr.entries()) {
                                const easting = data[0].eastingArr[index];
                                const tvd_msl = data[0].tvdMslArr[index];

                                path.push([easting, northing, tvd_msl]);
                            }
                            const offset = data[0].tvdMslArr[0];

                            const intersectionReferenceSystem = new IntersectionReferenceSystem(path);
                            intersectionReferenceSystem.offset = offset;

                            const polylineUtmXy: number[] = [];
                            polylineUtmXy.push(
                                ...calcExtendedSimplifiedWellboreTrajectoryInXYPlane(
                                    path,
                                    0,
                                    5,
                                ).simplifiedWellboreTrajectoryXy.flat(),
                            );

                            resolve(polylineUtmXy);
                        });
                } else {
                    const intersectionPolyline = getGlobalSetting("intersectionPolylines").find(
                        (polyline) => polyline.id === intersection.uuid,
                    );
                    if (!intersectionPolyline) {
                        resolve([]);
                        return;
                    }

                    const polylineUtmXy: number[] = [];
                    for (const point of intersectionPolyline.path) {
                        polylineUtmXy.push(point[0], point[1]);
                    }

                    resolve(polylineUtmXy);
                }
            });
        }

        const gridIntersectionPromise = makePolylinePromise
            .then((polyline_utm_xy) => {

                const intersectionQueryOptions = postGetPolylineIntersectionOptions({
                    query: {
                        case_uuid: ensembleIdent?.getCaseUuid() ?? "",
                        ensemble_name: ensembleIdent?.getEnsembleName() ?? "",
                        grid_name: gridName ?? "",
                        parameter_name: parameterName ?? "",
                        parameter_time_or_interval_str: timeOrInterval,
                        realization_num: realizationNum ?? 0,
                    },
                    body: { polyline_utm_xy },
                });

                registerQueryKey(intersectionQueryOptions.queryKey);

                return queryClient.fetchQuery(intersectionQueryOptions);
            })
            .then(transformPolylineIntersection);

        return gridIntersectionPromise;
    }
}
