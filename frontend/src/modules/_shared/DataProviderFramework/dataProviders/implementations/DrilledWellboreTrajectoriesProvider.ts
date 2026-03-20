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
    WellTrajectoryFormationSegmentsError_api,
    WellTrajectoryFormationSegmentsSuccess_api,
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
    CustomDataProviderImplementation,
    DataProviderAccessors,
    FetchDataParams,
} from "../../interfacesAndTypes/customDataProviderImplementation";
import type { MakeSettingTypesMap } from "../../interfacesAndTypes/utils";
import { SetupBindingsContext } from "../../interfacesAndTypes/customSettingsHandler";

const drilledWellboreTrajectoriesSettings = [
    Setting.ENSEMBLE,
    Setting.WELLBORES,
    Setting.WELLBORE_DEPTH_FILTER_TYPE,
    Setting.MD_RANGE,
    Setting.TVD_RANGE,
    Setting.WELLBORE_DEPTH_FILTER_ATTRIBUTE,
    Setting.WELLBORE_DEPTH_FORMATION_FILTER,
    Setting.FLOW_FILTER_TYPE,
    Setting.TIME_INTERVAL,
    Setting.FLOW_FILTER,
] as const;
export type DrilledWellboreTrajectoriesSettings = typeof drilledWellboreTrajectoriesSettings;
type SettingsWithTypes = MakeSettingTypesMap<DrilledWellboreTrajectoriesSettings>;

export type DrilledWellboreTrajectoryData = WellboreHeader_api &
    Omit<WellboreTrajectory_api, "wellboreUuid" | "wellboreUwi"> & {
        formationSegments: FormationSegment_api[];
        productionData: Omit<WellProductionData_api, "wellboreUuid" | "wellboreUwi"> | null;
        injectionData: Omit<WellInjectionData_api, "wellboreUuid" | "wellboreUwi"> | null;
        perforations: WellborePerforation_api[];
        screens: WellboreCompletion_api[];
    };

export type DrilledWellboreTrajectoriesData = DrilledWellboreTrajectoryData[];

export type DrilledWellboreTrajectoriesStoredData = {
    productionData: WellProductionData_api[];
    injectionData: WellInjectionData_api[];
};

export class DrilledWellboreTrajectoriesProvider implements CustomDataProviderImplementation<
    DrilledWellboreTrajectoriesSettings,
    DrilledWellboreTrajectoriesData,
    DrilledWellboreTrajectoriesStoredData
> {
    settings = drilledWellboreTrajectoriesSettings;

    getDefaultName() {
        return "Well Trajectories (Official)";
    }

    areCurrentSettingsValid({
        getSetting,
    }: DataProviderAccessors<
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
            if (getSetting(Setting.WELLBORE_DEPTH_FORMATION_FILTER)?.realizationNum === undefined) {
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

    async fetchData({
        getGlobalSetting,
        getSetting,
        getStoredData,
        fetchQuery,
    }: FetchDataParams<
        DrilledWellboreTrajectoriesSettings,
        DrilledWellboreTrajectoriesData,
        DrilledWellboreTrajectoriesStoredData
    >): Promise<DrilledWellboreTrajectoriesData> {
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
        const successfulFormationSegments: WellTrajectoryFormationSegmentsSuccess_api[] = [];
        const errorFormationSegments: WellTrajectoryFormationSegmentsError_api[] = [];
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

            const perWellFormationSegmentsResult = await fetchQuery({
                ...formationSegmentsOptions,
            });
            for (const result of perWellFormationSegmentsResult) {
                if (result.status === "success") {
                    successfulFormationSegments.push(result);
                } else if (result.status === "error") {
                    errorFormationSegments.push(result);
                }
            }
        }

        const result: DrilledWellboreTrajectoriesData = [];
        for (const traj of filteredWellTrajectories) {
            const wellboreHeader = selectedWellboreHeaders?.find((header) => header.wellboreUuid === traj.wellboreUuid);

            if (!wellboreHeader) {
                continue;
            }

            result.push({
                ...traj,
                ...wellboreHeader,
                formationSegments:
                    successfulFormationSegments.find((fs) => fs.uwi === traj.uniqueWellboreIdentifier)
                        ?.formationSegments ?? [],
                productionData: productionData?.find((pd) => pd.wellboreUuid === traj.wellboreUuid) ?? null,
                injectionData: injectionData?.find((id) => id.wellboreUuid === traj.wellboreUuid) ?? null,
                perforations:
                    allPerforations?.find((perf) => perf.wellboreUuid === traj.wellboreUuid)?.perforations ?? [],
                screens: allScreens?.find((screen) => screen.wellboreUuid === traj.wellboreUuid)?.completions ?? [],
            });
        }

        return result;
    }

    setupBindings({
        setting,
        storedData,
        makeSharedResult,
        queryClient,
        workbenchSession,
    }: SetupBindingsContext<DrilledWellboreTrajectoriesSettings, DrilledWellboreTrajectoriesStoredData>) {
        setting(Setting.ENSEMBLE).bindValueConstraints({
            read({ read }) {
                return {
                    fieldIdentifier: read.globalSetting("fieldId"),
                    ensembles: read.globalSetting("ensembles"),
                };
            },
            resolve({ fieldIdentifier, ensembles }) {
                return ensembles
                    .filter((ensemble) => ensemble.getFieldIdentifier() === fieldIdentifier)
                    .map((ensemble) => ensemble.getIdent());
            },
        });

        const wellboreHeaders = makeSharedResult({
            debugName: "WellboreHeaders",
            read({ read }) {
                return {
                    ensembleIdent: read.localSetting(Setting.ENSEMBLE),
                };
            },
            async resolve({ ensembleIdent }, { abortSignal }) {
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
            },
        });

        setting(Setting.WELLBORES).bindValueConstraints({
            read({ read }) {
                return {
                    wellboreHeaders: read.sharedResult(wellboreHeaders),
                };
            },
            resolve({ wellboreHeaders }) {
                if (!wellboreHeaders) {
                    return [];
                }

                return wellboreHeaders;
            },
        });

        const realizationSurfaceMetadata = makeSharedResult({
            debugName: "RealizationSurfaceMetadata",
            read({ read }) {
                return {
                    ensembleIdent: read.localSetting(Setting.ENSEMBLE),
                };
            },
            async resolve({ ensembleIdent }, { abortSignal }) {
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
            },
        });

        setting(Setting.MD_RANGE).bindAttributes({
            read({ read }) {
                return {
                    filterType: read.localSetting(Setting.WELLBORE_DEPTH_FILTER_TYPE),
                };
            },
            resolve({ filterType }) {
                return {
                    visible: filterType === "md_range",
                };
            },
        });

        setting(Setting.MD_RANGE).bindValueConstraints({
            read({ read }) {
                return {
                    wellboreHeaders: read.sharedResult(wellboreHeaders),
                    selectedWellbores: read.localSetting(Setting.WELLBORES),
                };
            },
            resolve({ wellboreHeaders, selectedWellbores }) {
                if (!wellboreHeaders || !selectedWellbores) {
                    return NO_UPDATE;
                }

                const filteredHeaders = wellboreHeaders.filter((header) =>
                    selectedWellbores.some((wb) => wb.wellboreUuid === header.wellboreUuid),
                );

                if (filteredHeaders.length === 0) {
                    return [0, 0, 1];
                }

                let globalMin = Number.POSITIVE_INFINITY;
                let globalMax = Number.NEGATIVE_INFINITY;

                for (const header of filteredHeaders) {
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
            },
        });

        setting(Setting.TVD_RANGE).bindAttributes({
            read({ read }) {
                return {
                    filterType: read.localSetting(Setting.WELLBORE_DEPTH_FILTER_TYPE),
                };
            },
            resolve({ filterType }) {
                return {
                    visible: filterType === "tvd_range",
                };
            },
        });

        setting(Setting.TVD_RANGE).bindValueConstraints({
            read({ read }) {
                return {
                    wellboreHeaders: read.sharedResult(wellboreHeaders),
                    selectedWellbores: read.localSetting(Setting.WELLBORES),
                };
            },
            resolve({ wellboreHeaders, selectedWellbores }) {
                if (!wellboreHeaders || !selectedWellbores) {
                    return NO_UPDATE;
                }

                const filteredHeaders = wellboreHeaders.filter((header) =>
                    selectedWellbores.some((wb) => wb.wellboreUuid === header.wellboreUuid),
                );

                if (filteredHeaders.length === 0) {
                    return [0, 0, 1];
                }

                let globalMin = Number.POSITIVE_INFINITY;
                let globalMax = Number.NEGATIVE_INFINITY;

                for (const header of filteredHeaders) {
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
            },
        });

        setting(Setting.WELLBORE_DEPTH_FILTER_ATTRIBUTE).bindAttributes({
            read({ read }) {
                return {
                    filterType: read.localSetting(Setting.WELLBORE_DEPTH_FILTER_TYPE),
                };
            },
            resolve({ filterType }) {
                return {
                    visible: filterType === "surface_based",
                };
            },
        });

        setting(Setting.WELLBORE_DEPTH_FILTER_ATTRIBUTE).bindValueConstraints({
            read({ read }) {
                return {
                    realizationSurfaceMetadata: read.sharedResult(realizationSurfaceMetadata),
                };
            },
            resolve({ realizationSurfaceMetadata }) {
                if (!realizationSurfaceMetadata) {
                    return [];
                }

                const availableAttributes = [
                    ...Array.from(
                        new Set(
                            realizationSurfaceMetadata.surfaces
                                .filter((surface) => surface.attribute_type === SurfaceAttributeType_api.DEPTH)
                                .map((surface) => surface.attribute_name),
                        ),
                    ),
                ];

                return availableAttributes;
            },
        });

        setting(Setting.WELLBORE_DEPTH_FORMATION_FILTER).bindAttributes({
            read({ read }) {
                return {
                    filterType: read.localSetting(Setting.WELLBORE_DEPTH_FILTER_TYPE),
                };
            },
            resolve({ filterType }) {
                return {
                    visible: filterType === "surface_based",
                };
            },
        });

        setting(Setting.WELLBORE_DEPTH_FORMATION_FILTER).bindValueConstraints({
            read({ read }) {
                return {
                    ensembleIdent: read.localSetting(Setting.ENSEMBLE),
                    realizationFilterFunc: read.globalSetting("realizationFilterFunction"),
                    attribute: read.localSetting(Setting.WELLBORE_DEPTH_FILTER_ATTRIBUTE),
                    realizationSurfaceMetadata: read.sharedResult(realizationSurfaceMetadata),
                };
            },
            resolve({ ensembleIdent, realizationFilterFunc, attribute, realizationSurfaceMetadata }) {
                const realizationNums: number[] = [];
                const surfaceNamesInStratOrder: string[] = [];

                if (ensembleIdent) {
                    realizationNums.push(...realizationFilterFunc(ensembleIdent));
                }

                if (attribute && realizationSurfaceMetadata) {
                    const availableSurfaceNames = [
                        ...Array.from(
                            new Set(
                                realizationSurfaceMetadata.surfaces
                                    .filter((surface) => surface.attribute_name === attribute)
                                    .map((el) => el.name),
                            ),
                        ),
                    ];
                    surfaceNamesInStratOrder.push(
                        ...sortStringArray(
                            availableSurfaceNames,
                            realizationSurfaceMetadata.surface_names_in_strat_order,
                        ),
                    );
                }

                return {
                    surfaceNamesInStratOrder,
                    realizationNums,
                };
            },
        });

        const observedSurfaceMetadata = makeSharedResult({
            debugName: "ObservedSurfaceMetadata",
            read({ read }) {
                return {
                    ensembleIdent: read.localSetting(Setting.ENSEMBLE),
                };
            },
            async resolve({ ensembleIdent }, { abortSignal }) {
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
            },
        });

        setting(Setting.TIME_INTERVAL).bindAttributes({
            read({ read }) {
                return {
                    filterType: read.localSetting(Setting.FLOW_FILTER_TYPE),
                    observedSurfaceMetadata: read.sharedResult(observedSurfaceMetadata),
                };
            },
            resolve({ filterType, observedSurfaceMetadata }) {
                return {
                    visible: filterType === "production_injection",
                    enabled: observedSurfaceMetadata?.time_intervals_iso_str.length
                        ? true
                        : { enabled: false, reason: "No time intervals available" },
                };
            },
        });

        setting(Setting.TIME_INTERVAL).bindValueConstraints({
            read({ read }) {
                return {
                    observedSurfaceMetadata: read.sharedResult(observedSurfaceMetadata),
                };
            },
            resolve({ observedSurfaceMetadata }) {
                if (!observedSurfaceMetadata) {
                    return [];
                }
                return observedSurfaceMetadata.time_intervals_iso_str;
            },
        });

        setting(Setting.FLOW_FILTER).bindAttributes({
            read({ read }) {
                return {
                    filterType: read.localSetting(Setting.FLOW_FILTER_TYPE),
                    observedSurfaceMetadata: read.sharedResult(observedSurfaceMetadata),
                };
            },
            resolve({ filterType, observedSurfaceMetadata }) {
                return {
                    visible: filterType === "production_injection",
                    enabled: observedSurfaceMetadata?.time_intervals_iso_str.length
                        ? true
                        : { enabled: false, reason: "No time intervals available" },
                };
            },
        });

        const productionData = makeSharedResult({
            debugName: "ProductionData",
            read({ read }) {
                return {
                    fieldIdentifier: read.globalSetting("fieldId"),
                    timeInterval: read.localSetting(Setting.TIME_INTERVAL),
                };
            },
            async resolve({ fieldIdentifier, timeInterval }, { abortSignal }) {
                if (!fieldIdentifier || !timeInterval) {
                    return [];
                }

                const startDate = timeInterval.split("/")[0];
                const endDate = timeInterval.split("/")[1];

                return await queryClient.fetchQuery({
                    ...getProductionDataOptions({
                        query: {
                            field_identifier: fieldIdentifier,
                            start_date: startDate,
                            end_date: endDate,
                        },
                        signal: abortSignal,
                    }),
                });
            },
        });

        storedData("productionData").bindValue({
            read({ read }) {
                return {
                    productionData: read.sharedResult(productionData),
                };
            },
            resolve({ productionData }) {
                return productionData || [];
            },
        });

        const injectionData = makeSharedResult({
            debugName: "InjectionData",
            read({ read }) {
                return {
                    fieldIdentifier: read.globalSetting("fieldId"),
                    timeInterval: read.localSetting(Setting.TIME_INTERVAL),
                };
            },
            async resolve({ fieldIdentifier, timeInterval }, { abortSignal }) {
                if (!fieldIdentifier || !timeInterval) {
                    return [];
                }

                const startDate = timeInterval.split("/")[0];
                const endDate = timeInterval.split("/")[1];

                return await queryClient.fetchQuery({
                    ...getInjectionDataOptions({
                        query: {
                            field_identifier: fieldIdentifier,
                            start_date: startDate,
                            end_date: endDate,
                        },
                        signal: abortSignal,
                    }),
                });
            },
        });

        storedData("injectionData").bindValue({
            read({ read }) {
                return {
                    injectionData: read.sharedResult(injectionData),
                };
            },
            resolve({ injectionData }) {
                return injectionData || [];
            },
        });

        setting(Setting.FLOW_FILTER).bindValueConstraints({
            read({ read }) {
                return {
                    productionData: read.sharedResult(productionData),
                    injectionData: read.sharedResult(injectionData),
                };
            },
            resolve({ productionData, injectionData }) {
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

                return {
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
            },
        });
    }
}
