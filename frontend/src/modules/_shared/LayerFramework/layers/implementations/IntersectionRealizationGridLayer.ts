import {
    getDrilledWellboreHeadersOptions,
    getGridModelsInfoOptions,
    getWellTrajectoriesOptions,
    postGetPolylineIntersectionOptions,
} from "@api";
import { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import {
    CustomDataLayerImplementation,
    DataLayerInformationAccessors,
    DefineDependenciesArgs,
    FetchDataParams,
    LayerColoringType,
} from "@modules/_shared/LayerFramework/interfaces";
import { IntersectionSettingValue } from "@modules/_shared/LayerFramework/settings/implementations/IntersectionSetting";
import { MakeSettingTypesMap, Setting } from "@modules/_shared/LayerFramework/settings/settingsDefinitions";
import {
    PolylineIntersection_trans,
    calcExtendedSimplifiedWellboreTrajectoryInXYPlane,
    transformPolylineIntersection,
} from "@modules/_shared/utils/wellbore";

import { isEqual } from "lodash";

const intersectionRealizationGridSettings = [
    Setting.INTERSECTION,
    Setting.ENSEMBLE,
    Setting.REALIZATION,
    Setting.ATTRIBUTE,
    Setting.GRID_NAME,
    Setting.TIME_OR_INTERVAL,
    Setting.SHOW_GRID_LINES,
] as const;
type IntersectionRealizationGridSettings = typeof intersectionRealizationGridSettings;
type SettingsWithTypes = MakeSettingTypesMap<IntersectionRealizationGridSettings>;

type Data = PolylineIntersection_trans;

type StoredData = {
    polyline: number[];
};

export class IntersectionRealizationGridLayer
    implements CustomDataLayerImplementation<IntersectionRealizationGridSettings, Data, StoredData>
{
    settings = intersectionRealizationGridSettings;

    getDefaultSettingsValues(): MakeSettingTypesMap<IntersectionRealizationGridSettings> {
        return {
            [Setting.INTERSECTION]: null,
            [Setting.ENSEMBLE]: null,
            [Setting.REALIZATION]: null,
            [Setting.ATTRIBUTE]: null,
            [Setting.GRID_NAME]: null,
            [Setting.TIME_OR_INTERVAL]: null,
            [Setting.SHOW_GRID_LINES]: false,
        };
    }

    getDefaultName(): string {
        return "Intersection Realization Grid";
    }

    getColoringType(): LayerColoringType {
        return LayerColoringType.COLORSCALE;
    }

    doSettingsChangesRequireDataRefetch(prevSettings: SettingsWithTypes, newSettings: SettingsWithTypes): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    makeValueRange({
        getData,
    }: DataLayerInformationAccessors<IntersectionRealizationGridSettings, Data>): [number, number] | null {
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
    }: DataLayerInformationAccessors<IntersectionRealizationGridSettings, Data>): boolean {
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
                            .map((gridAttribute) => gridAttribute.iso_date_or_interval ?? "NO_TIME")
                    )
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
    }: FetchDataParams<IntersectionRealizationGridSettings, Data>): Promise<Data> {
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

        const queryKey = [
            "gridIntersection",
            ensembleIdent,
            gridName,
            parameterName,
            timeOrInterval,
            realizationNum,
            intersection,
        ];
        registerQueryKey(queryKey);

        let makePolylinePromise: Promise<number[]> = new Promise((resolve) => {
            resolve([]);
        });

        if (intersection) {
            makePolylinePromise = new Promise((resolve) => {
                if (intersection.type === "wellbore") {
                    return queryClient
                        .fetchQuery({
                            ...getWellTrajectoriesOptions({
                                query: {
                                    field_identifier: fieldIdentifier ?? "",
                                    wellbore_uuids: [intersection.uuid],
                                },
                            }),
                        })
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
                                    5
                                ).simplifiedWellboreTrajectoryXy.flat()
                            );

                            resolve(polylineUtmXy);
                        });
                } else {
                    const intersectionPolyline = getGlobalSetting("intersectionPolylines").find(
                        (polyline) => polyline.id === intersection.uuid
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
            .then((polyline_utm_xy) =>
                queryClient.fetchQuery({
                    ...postGetPolylineIntersectionOptions({
                        query: {
                            case_uuid: ensembleIdent?.getCaseUuid() ?? "",
                            ensemble_name: ensembleIdent?.getEnsembleName() ?? "",
                            grid_name: gridName ?? "",
                            parameter_name: parameterName ?? "",
                            parameter_time_or_interval_str: timeOrInterval,
                            realization_num: realizationNum ?? 0,
                        },
                        body: { polyline_utm_xy },
                    }),
                })
            )
            .then(transformPolylineIntersection);

        return gridIntersectionPromise;
    }
}
