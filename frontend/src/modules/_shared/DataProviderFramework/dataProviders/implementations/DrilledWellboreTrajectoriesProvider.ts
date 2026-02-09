import { isEqual } from "lodash";

import type {
    FormationSegment_api,
    WellboreCompletion_api,
    WellboreHeader_api,
    WellborePerforation_api,
    WellboreTrajectory_api,
    WellInjectionData_api,
    WellProductionData_api,
    WellTrajectory_api,
    WellTrajectoryFormationSegments_api,
} from "@api";
import {
    getDrilledWellboreHeadersOptions,
    getFieldPerforationsOptions,
    getFieldScreensOptions,
    getInjectionDataOptions,
    getObservedSurfacesMetadataOptions,
    getProductionDataOptions,
    getRealizationSurfacesMetadataOptions,
    getWellTrajectoriesOptions,
    postGetWellTrajectoriesFormationSegmentsOptions,
    SurfaceAttributeType_api,
} from "@api";
import { sortStringArray } from "@lib/utils/arrays";
import {
    Setting,
    type SettingTypeDefinitions,
} from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { SurfaceAddressBuilder } from "@modules/_shared/Surface";
import { encodeSurfAddrStr } from "@modules/_shared/Surface/surfaceAddress";

import { NO_UPDATE } from "../../delegates/_utils/Dependency";
import type {
    AreSettingsValidArgs,
    CustomDataProviderImplementation,
    FetchDataParams,
} from "../../interfacesAndTypes/customDataProviderImplementation";
import type { DefineDependenciesArgs } from "../../interfacesAndTypes/customSettingsHandler";
import type { MakeSettingTypesMap } from "../../interfacesAndTypes/utils";

const drilledWellboreTrajectoriesSettings = [
    Setting.ENSEMBLE,
    Setting.WELLBORES,
    Setting.WELLBORE_DEPTH_FILTER_TYPE,
    Setting.MD_RANGE,
    Setting.TVD_RANGE,
    Setting.WELLBORE_DEPTH_FILTER_ATTRIBUTE,
    Setting.WELLBORE_DEPTH_FORMATION_FILTER,
    Setting.PDM_FILTER_TYPE,
    Setting.TIME_INTERVAL,
    Setting.PDM_FILTER,
] as const;
export type DrilledWellboreTrajectoriesSettings = typeof drilledWellboreTrajectoriesSettings;
type SettingsWithTypes = MakeSettingTypesMap<DrilledWellboreTrajectoriesSettings>;

export type DrilledWellboreTrajectoriesData = (WellboreHeader_api &
    Omit<WellboreTrajectory_api, "wellboreUuid" | "wellboreUwi"> & {
        formationSegments: FormationSegment_api[];
        productionData: Omit<WellProductionData_api, "wellboreUuid" | "wellboreUwi"> | null;
        injectionData: Omit<WellInjectionData_api, "wellboreUuid" | "wellboreUwi"> | null;
        perforations: WellborePerforation_api[];
        screens: WellboreCompletion_api[];
    })[];

export type DrilledWellboreTrajectoriesStoredData = {
    productionData: WellProductionData_api[];
    injectionData: WellInjectionData_api[];
};

export class DrilledWellboreTrajectoriesProvider
    implements
        CustomDataProviderImplementation<
            DrilledWellboreTrajectoriesSettings,
            DrilledWellboreTrajectoriesData,
            DrilledWellboreTrajectoriesStoredData
        >
{
    settings = drilledWellboreTrajectoriesSettings;

    getDefaultName() {
        return "Well Trajectories (Official)";
    }

    areCurrentSettingsValid({
        getSetting,
    }: AreSettingsValidArgs<
        DrilledWellboreTrajectoriesSettings,
        DrilledWellboreTrajectoriesData,
        DrilledWellboreTrajectoriesStoredData
    >): boolean {
        if (!getSetting(Setting.ENSEMBLE)) {
            return false;
        }

        if (getSetting(Setting.WELLBORE_DEPTH_FILTER_TYPE) === "surface_based") {
            if (!getSetting(Setting.WELLBORE_DEPTH_FILTER_ATTRIBUTE)) {
                return false;
            }
            if (!getSetting(Setting.WELLBORE_DEPTH_FORMATION_FILTER)?.topSurfaceName) {
                return false;
            }
            if (!getSetting(Setting.WELLBORE_DEPTH_FORMATION_FILTER)?.realizationNum) {
                return false;
            }
        }

        return true;
    }

    doSettingsChangesRequireDataRefetch(
        prevSettings: SettingsWithTypes | null,
        newSettings: SettingsWithTypes,
    ): boolean {
        // Only refetch when settings used in fetchData change
        // Note: TIME_INTERVAL changes trigger refetch via stored data changes
        return (
            !isEqual(prevSettings?.[Setting.ENSEMBLE], newSettings[Setting.ENSEMBLE]) ||
            !isEqual(prevSettings?.[Setting.WELLBORES], newSettings[Setting.WELLBORES]) ||
            !isEqual(
                prevSettings?.[Setting.WELLBORE_DEPTH_FILTER_TYPE],
                newSettings[Setting.WELLBORE_DEPTH_FILTER_TYPE],
            ) ||
            !isEqual(
                prevSettings?.[Setting.WELLBORE_DEPTH_FORMATION_FILTER],
                newSettings[Setting.WELLBORE_DEPTH_FORMATION_FILTER],
            ) ||
            !isEqual(
                prevSettings?.[Setting.WELLBORE_DEPTH_FILTER_ATTRIBUTE],
                newSettings[Setting.WELLBORE_DEPTH_FILTER_ATTRIBUTE],
            )
        );
    }

    fetchData({
        getGlobalSetting,
        getSetting,
        getStoredData,
        fetchQuery,
    }: FetchDataParams<
        DrilledWellboreTrajectoriesSettings,
        DrilledWellboreTrajectoriesData,
        DrilledWellboreTrajectoriesStoredData
    >): Promise<DrilledWellboreTrajectoriesData> {
        const promise = (async () => {
            const fieldIdentifier = getGlobalSetting("fieldId");
            const ensembleIdent = getSetting(Setting.ENSEMBLE);
            const selectedWellboreHeaders = getSetting(Setting.WELLBORES);
            const depthFilterType = getSetting(Setting.WELLBORE_DEPTH_FILTER_TYPE);
            const productionData = getStoredData("productionData");
            const injectionData = getStoredData("injectionData");

            const selectedWellboreUuids = selectedWellboreHeaders?.map((wb) => wb.wellboreUuid) ?? [];

            const wellTrajectoriesQueryOptions = getWellTrajectoriesOptions({
                query: { field_identifier: fieldIdentifier ?? "" },
            });

            const allWellTrajectories = await fetchQuery({
                ...wellTrajectoriesQueryOptions,
                staleTime: 1800000, // TODO: Both stale and gcTime are set to 30 minutes for now since SMDA is quite slow for fields with many wells - this should be adjusted later
                gcTime: 1800000,
            });

            const filteredWellTrajectories = allWellTrajectories.filter((traj) =>
                selectedWellboreUuids.includes(traj.wellboreUuid),
            );

            const perforationsQueryOptions = getFieldPerforationsOptions({
                query: { field_identifier: fieldIdentifier ?? "" },
            });

            const allPerforations = await fetchQuery({
                ...perforationsQueryOptions,
            });

            const screensQueryOptions = getFieldScreensOptions({
                query: { field_identifier: fieldIdentifier ?? "" },
            });

            const allScreens = await fetchQuery({
                ...screensQueryOptions,
            });

            const formationFilter = getSetting(Setting.WELLBORE_DEPTH_FORMATION_FILTER);
            const surfaceAttribute = getSetting(Setting.WELLBORE_DEPTH_FILTER_ATTRIBUTE);
            const formationSegments: WellTrajectoryFormationSegments_api[] = [];
            if (
                depthFilterType === "surface_based" &&
                ensembleIdent &&
                formationFilter &&
                formationFilter.topSurfaceName &&
                formationFilter.realizationNum != null &&
                surfaceAttribute
            ) {
                const addrBuilder = new SurfaceAddressBuilder();
                const topSurfaceAddress = addrBuilder
                    .withEnsembleIdent(ensembleIdent)
                    .withName(formationFilter.topSurfaceName)
                    .withAttribute(surfaceAttribute)
                    .withRealization(formationFilter.realizationNum)
                    .buildRealizationAddress();

                let bottomSurfaceAddressString: string | null = null;
                if (formationFilter.baseSurfaceName) {
                    const bottomSurfaceAddress = addrBuilder
                        .withName(formationFilter.baseSurfaceName)
                        .buildRealizationAddress();
                    bottomSurfaceAddressString = encodeSurfAddrStr(bottomSurfaceAddress);
                }

                const convertedWellTrajectories: WellTrajectory_api[] = filteredWellTrajectories.map((traj) => {
                    return {
                        uwi: traj.uniqueWellboreIdentifier,
                        xPoints: traj.eastingArr,
                        yPoints: traj.northingArr,
                        zPoints: traj.tvdMslArr,
                        mdPoints: traj.mdArr,
                    };
                });

                const formationSegmentsOptions = postGetWellTrajectoriesFormationSegmentsOptions({
                    query: {
                        top_depth_surf_addr_str: encodeSurfAddrStr(topSurfaceAddress),
                        bottom_depth_surf_addr_str: bottomSurfaceAddressString,
                    },
                    body: {
                        well_trajectories: convertedWellTrajectories,
                    },
                });

                formationSegments.push(
                    ...(await fetchQuery({
                        ...formationSegmentsOptions,
                    })),
                );
            }

            const result: DrilledWellboreTrajectoriesData = [];
            for (const traj of filteredWellTrajectories) {
                const wellboreHeader = selectedWellboreHeaders?.find(
                    (header) => header.wellboreUuid === traj.wellboreUuid,
                );

                if (!wellboreHeader) {
                    continue;
                }

                result.push({
                    ...traj,
                    ...wellboreHeader,
                    formationSegments:
                        formationSegments.find((fs) => fs.uwi === traj.uniqueWellboreIdentifier)?.formationSegments ??
                        [],
                    productionData: productionData?.find((pd) => pd.wellboreUuid === traj.wellboreUuid) ?? null,
                    injectionData: injectionData?.find((id) => id.wellboreUuid === traj.wellboreUuid) ?? null,
                    perforations:
                        allPerforations?.find((perf) => perf.wellboreUuid === traj.wellboreUuid)?.perforations ?? [],
                    screens: allScreens?.find((screen) => screen.wellboreUuid === traj.wellboreUuid)?.completions ?? [],
                });
            }

            return result;
        })();

        return promise;
    }

    defineDependencies({
        helperDependency,
        valueConstraintsUpdater,
        settingAttributesUpdater,
        storedDataUpdater,
        workbenchSession,
        queryClient,
    }: DefineDependenciesArgs<DrilledWellboreTrajectoriesSettings, DrilledWellboreTrajectoriesStoredData>) {
        valueConstraintsUpdater(Setting.ENSEMBLE, ({ getGlobalSetting }) => {
            const fieldIdentifier = getGlobalSetting("fieldId");
            const ensembles = getGlobalSetting("ensembles");

            const ensembleIdents = ensembles
                .filter((ensemble) => ensemble.getFieldIdentifier() === fieldIdentifier)
                .map((ensemble) => ensemble.getIdent());

            return ensembleIdents;
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

        valueConstraintsUpdater(Setting.WELLBORES, ({ getHelperDependency }) => {
            const wellboreHeaders = getHelperDependency(wellboreHeadersDep);

            if (!wellboreHeaders) {
                return [];
            }

            return wellboreHeaders;
        });

        const realizationSurfaceMetadataDep = helperDependency(async ({ getLocalSetting, abortSignal }) => {
            const ensembleIdent = getLocalSetting(Setting.ENSEMBLE);

            if (!ensembleIdent) {
                return null;
            }

            return await queryClient.fetchQuery({
                ...getRealizationSurfacesMetadataOptions({
                    query: {
                        case_uuid: ensembleIdent.getCaseUuid(),
                        ensemble_name: ensembleIdent.getEnsembleName(),
                    },
                    signal: abortSignal,
                }),
            });
        });

        settingAttributesUpdater(Setting.MD_RANGE, ({ getLocalSetting }) => {
            const filterType = getLocalSetting(Setting.WELLBORE_DEPTH_FILTER_TYPE);
            return {
                visible: filterType === "md_range",
            };
        });

        valueConstraintsUpdater(Setting.MD_RANGE, ({ getHelperDependency, getLocalSetting }) => {
            const data = getHelperDependency(wellboreHeadersDep);
            const selectedWellboreHeaders = getLocalSetting(Setting.WELLBORES);

            if (!data || !selectedWellboreHeaders) {
                return NO_UPDATE;
            }

            const filteredData = data.filter((header) =>
                selectedWellboreHeaders.some((wb) => wb.wellboreUuid === header.wellboreUuid),
            );

            if (filteredData.length === 0) {
                return [0, 0, 1];
            }

            let globalMin = Number.POSITIVE_INFINITY;
            let globalMax = Number.NEGATIVE_INFINITY;

            for (const header of filteredData) {
                if (header.mdMin !== null && header.mdMin !== undefined) {
                    globalMin = Math.min(globalMin, header.mdMin);
                }
                if (header.mdMax !== null && header.mdMax !== undefined) {
                    globalMax = Math.max(globalMax, header.mdMax);
                }
            }

            if (globalMin === Number.POSITIVE_INFINITY || globalMax === Number.NEGATIVE_INFINITY) {
                return [0, 0, 1];
            }

            return [globalMin, globalMax, 1];
        });

        settingAttributesUpdater(Setting.TVD_RANGE, ({ getLocalSetting }) => {
            const filterType = getLocalSetting(Setting.WELLBORE_DEPTH_FILTER_TYPE);
            return {
                visible: filterType === "tvd_range",
            };
        });

        valueConstraintsUpdater(Setting.TVD_RANGE, ({ getHelperDependency, getLocalSetting }) => {
            const data = getHelperDependency(wellboreHeadersDep);
            const selectedWellboreHeaders = getLocalSetting(Setting.WELLBORES);

            if (!data || !selectedWellboreHeaders) {
                return NO_UPDATE;
            }

            const filteredData = data.filter((header) =>
                selectedWellboreHeaders.some((wb) => wb.wellboreUuid === header.wellboreUuid),
            );

            if (filteredData.length === 0) {
                return [0, 0, 1];
            }

            let globalMin = Number.POSITIVE_INFINITY;
            let globalMax = Number.NEGATIVE_INFINITY;

            for (const header of filteredData) {
                if (header.tvdMin !== null && header.tvdMin !== undefined) {
                    globalMin = Math.min(globalMin, header.tvdMin);
                }
                if (header.tvdMax !== null && header.tvdMax !== undefined) {
                    globalMax = Math.max(globalMax, header.tvdMax);
                }
            }

            if (globalMin === Number.POSITIVE_INFINITY || globalMax === Number.NEGATIVE_INFINITY) {
                return [0, 0, 1];
            }

            return [globalMin, globalMax, 1];
        });

        settingAttributesUpdater(Setting.WELLBORE_DEPTH_FILTER_ATTRIBUTE, ({ getLocalSetting }) => {
            const filterType = getLocalSetting(Setting.WELLBORE_DEPTH_FILTER_TYPE);
            return {
                visible: filterType === "surface_based",
            };
        });

        valueConstraintsUpdater(Setting.WELLBORE_DEPTH_FILTER_ATTRIBUTE, ({ getHelperDependency }) => {
            const data = getHelperDependency(realizationSurfaceMetadataDep);

            if (!data) {
                return [];
            }

            const availableAttributes = [
                ...Array.from(
                    new Set(
                        data.surfaces
                            .filter((surface) => surface.attribute_type === SurfaceAttributeType_api.DEPTH)
                            .map((surface) => surface.attribute_name),
                    ),
                ),
            ];

            return availableAttributes;
        });

        settingAttributesUpdater(Setting.WELLBORE_DEPTH_FORMATION_FILTER, ({ getLocalSetting }) => {
            const filterType = getLocalSetting(Setting.WELLBORE_DEPTH_FILTER_TYPE);
            return {
                visible: filterType === "surface_based",
            };
        });

        valueConstraintsUpdater(
            Setting.WELLBORE_DEPTH_FORMATION_FILTER,
            ({ getLocalSetting, getGlobalSetting, getHelperDependency }) => {
                const ensembleIdent = getLocalSetting(Setting.ENSEMBLE);
                const realizationFilterFunc = getGlobalSetting("realizationFilterFunction");
                const attribute = getLocalSetting(Setting.WELLBORE_DEPTH_FILTER_ATTRIBUTE);
                const data = getHelperDependency(realizationSurfaceMetadataDep);

                const realizationNums: number[] = [];
                const surfaceNamesInStratOrder: string[] = [];

                if (ensembleIdent) {
                    realizationNums.push(...realizationFilterFunc(ensembleIdent));
                }

                if (attribute && data) {
                    const availableSurfaceNames = [
                        ...Array.from(
                            new Set(
                                data.surfaces
                                    .filter((surface) => surface.attribute_name === attribute)
                                    .map((el) => el.name),
                            ),
                        ),
                    ];
                    surfaceNamesInStratOrder.push(
                        ...sortStringArray(availableSurfaceNames, data.surface_names_in_strat_order),
                    );
                }

                return {
                    surfaceNamesInStratOrder,
                    realizationNums,
                };
            },
        );

        settingAttributesUpdater(Setting.TIME_INTERVAL, ({ getLocalSetting }) => {
            const pdmFilterType = getLocalSetting(Setting.PDM_FILTER_TYPE);
            return {
                visible: pdmFilterType === "production_injection",
            };
        });

        const observedSurfaceMetadataDep = helperDependency(async ({ getLocalSetting, abortSignal }) => {
            const ensembleIdent = getLocalSetting(Setting.ENSEMBLE);

            if (!ensembleIdent) {
                return null;
            }

            return await queryClient.fetchQuery({
                ...getObservedSurfacesMetadataOptions({
                    query: {
                        case_uuid: ensembleIdent.getCaseUuid(),
                    },
                    signal: abortSignal,
                }),
            });
        });

        valueConstraintsUpdater(Setting.TIME_INTERVAL, ({ getHelperDependency }) => {
            const data = getHelperDependency(observedSurfaceMetadataDep);

            if (!data) {
                return [];
            }

            return data.time_intervals_iso_str;
        });

        settingAttributesUpdater(Setting.PDM_FILTER, ({ getLocalSetting }) => {
            const pdmFilterType = getLocalSetting(Setting.PDM_FILTER_TYPE);
            return {
                visible: pdmFilterType === "production_injection",
            };
        });

        const productionDataDep = helperDependency(async function fetchData({
            getGlobalSetting,
            getLocalSetting,
            abortSignal,
        }) {
            const fieldIdentifier = getGlobalSetting("fieldId");
            const timeInterval = getLocalSetting(Setting.TIME_INTERVAL);
            const startDate = timeInterval ? timeInterval.split("/")[0] : undefined;
            const endDate = timeInterval ? timeInterval.split("/")[1] : undefined;
            if (!fieldIdentifier || !startDate || !endDate) {
                return [];
            }
            return await queryClient.fetchQuery({
                ...getProductionDataOptions({
                    query: {
                        field_identifier: fieldIdentifier ?? "",
                        start_date: startDate ?? "",
                        end_date: endDate ?? "",
                    },
                    signal: abortSignal,
                }),
            });
        });

        storedDataUpdater("productionData", ({ getHelperDependency }) => {
            const productionData = getHelperDependency(productionDataDep);
            return productionData || [];
        });

        // Injection data dependency
        const injectionDataDep = helperDependency(async function fetchData({
            getGlobalSetting,
            getLocalSetting,
            abortSignal,
        }) {
            const fieldIdentifier = getGlobalSetting("fieldId");
            const timeInterval = getLocalSetting(Setting.TIME_INTERVAL);
            const startDate = timeInterval ? timeInterval.split("/")[0] : undefined;
            const endDate = timeInterval ? timeInterval.split("/")[1] : undefined;
            if (!fieldIdentifier || !startDate || !endDate) {
                return [];
            }
            return await queryClient.fetchQuery({
                ...getInjectionDataOptions({
                    query: {
                        field_identifier: fieldIdentifier ?? "",
                        start_date: startDate ?? "",
                        end_date: endDate ?? "",
                    },
                    signal: abortSignal,
                }),
            });
        });

        storedDataUpdater("injectionData", ({ getHelperDependency }) => {
            const injectionData = getHelperDependency(injectionDataDep);
            return injectionData || [];
        });

        valueConstraintsUpdater(Setting.PDM_FILTER, ({ getHelperDependency }) => {
            const productionData = getHelperDependency(productionDataDep);
            const injectionData = getHelperDependency(injectionDataDep);

            let maxOilProduction = 0;
            let maxGasProduction = 0;
            let maxWaterProduction = 0;
            let maxGasInjection = 0;
            let maxWaterInjection = 0;

            if (productionData) {
                for (const record of productionData) {
                    maxOilProduction = Math.max(maxOilProduction, record.oilProductionSm3);
                    maxGasProduction = Math.max(maxGasProduction, record.gasProductionSm3);
                    maxWaterProduction = Math.max(maxWaterProduction, record.waterProductionM3);
                }
            }

            if (injectionData) {
                for (const record of injectionData) {
                    maxGasInjection = Math.max(maxGasInjection, record.gasInjection);
                    maxWaterInjection = Math.max(maxWaterInjection, record.waterInjection);
                }
            }

            const valueConstraints: SettingTypeDefinitions[Setting.PDM_FILTER]["valueConstraints"] = {
                production: {
                    oil: maxOilProduction,
                    gas: maxGasProduction,
                    water: maxWaterProduction,
                },
                injection: {
                    gas: maxGasInjection,
                    water: maxWaterInjection,
                },
            };

            return valueConstraints;
        });
    }
}
