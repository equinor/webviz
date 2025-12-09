import { isEqual } from "lodash";

import type {
    WellboreCompletions_api,
    WellboreHeader_api,
    WellborePerforations_api,
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
import type {
    CustomDataProviderImplementation,
    FetchDataParams,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { DefineDependenciesArgs } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import type { MakeSettingTypesMap } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { SurfaceAddressBuilder, type FullSurfaceAddress } from "@modules/_shared/Surface";
import { encodeSurfAddrStr } from "@modules/_shared/Surface/surfaceAddress";

const richDrilledWellTrajectoriesSettings = [
    Setting.ENSEMBLE,
    Setting.SMDA_WELLBORE_HEADERS,
    Setting.DEPTH_FILTER,
    Setting.TIME_INTERVAL,
    Setting.WELL_TRAJ_FILTER_SURFACE_ATTRIBUTE,
    Setting.WELL_TRAJ_FILTER_TOP_SURFACE_NAME,
    Setting.WELL_TRAJ_FILTER_BOTTOM_SURFACE_NAME,
    Setting.WELL_TRAJ_FILTER_SURFACE_REALIZATION,
    Setting.PDM_OIL_PROD_MIN,
    Setting.PDM_GAS_PROD_MIN,
    Setting.PDM_WATER_PROD_MIN,
    Setting.PDM_WATER_INJ_MIN,
    Setting.PDM_GAS_INJ_MIN,
] as const;
export type RichDrilledWellTrajectoriesSettings = typeof richDrilledWellTrajectoriesSettings;
type SettingsWithTypes = MakeSettingTypesMap<RichDrilledWellTrajectoriesSettings>;
export type DrilledWellboreTrajectoriesStoredData = {
    allWellboreHeaders: WellboreHeader_api[];
    selectedWellBoreHeaders: WellboreHeader_api[];
    wellboreTrajectories: WellboreTrajectory_api[];
    formationSegments: WellTrajectoryFormationSegments_api[];
    productionData: WellProductionData_api[];
    injectionData: WellInjectionData_api[];
    perforations: WellborePerforations_api[];
    screens: WellboreCompletions_api[];
};
type RichDrilledWellTrajectoriesData = WellboreTrajectory_api[];

export class RichDrilledWellTrajectoriesProvider
    implements
        CustomDataProviderImplementation<
            RichDrilledWellTrajectoriesSettings,
            RichDrilledWellTrajectoriesData,
            DrilledWellboreTrajectoriesStoredData
        >
{
    settings = richDrilledWellTrajectoriesSettings;

    getDefaultName() {
        return "Rich Drilled Well Trajectories";
    }

    doSettingsChangesRequireDataRefetch(prevSettings: SettingsWithTypes, newSettings: SettingsWithTypes): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    fetchData({
        getGlobalSetting,
        fetchQuery,
    }: FetchDataParams<
        RichDrilledWellTrajectoriesSettings,
        RichDrilledWellTrajectoriesData
    >): Promise<RichDrilledWellTrajectoriesData> {
        const fieldIdentifier = getGlobalSetting("fieldId");

        if (!fieldIdentifier) return Promise.resolve([]);

        const queryOptions = getWellTrajectoriesOptions({
            query: { field_identifier: fieldIdentifier ?? "" },
        });

        const promise = fetchQuery({
            ...queryOptions,
            staleTime: 1800000, // TODO: Both stale and gcTime are set to 30 minutes for now since SMDA is quite slow for fields with many wells - this should be adjusted later
            gcTime: 1800000,
        });

        return promise;
    }

    defineDependencies({
        helperDependency,
        availableSettingsUpdater,
        storedDataUpdater,
        queryClient,
    }: DefineDependenciesArgs<RichDrilledWellTrajectoriesSettings, DrilledWellboreTrajectoriesStoredData>) {
        // Well metadata dependency
        const wellboreHeadersDep = helperDependency(async function fetchData({ getGlobalSetting, abortSignal }) {
            const fieldIdentifier = getGlobalSetting("fieldId");

            if (!fieldIdentifier) return [];

            return await queryClient.fetchQuery({
                ...getDrilledWellboreHeadersOptions({
                    query: { field_identifier: fieldIdentifier ?? "" },
                    signal: abortSignal,
                }),
            });
        });

        //
        storedDataUpdater("allWellboreHeaders", ({ getHelperDependency }) => {
            const wellboreHeaders = getHelperDependency(wellboreHeadersDep);
            return wellboreHeaders || [];
        });

        // Wellbore trajectories dependency
        const wellboreTrajectoriesDep = helperDependency(async function fetchData({ getGlobalSetting, abortSignal }) {
            const fieldIdentifier = getGlobalSetting("fieldId");

            if (!fieldIdentifier) return [];

            return await queryClient.fetchQuery({
                ...getWellTrajectoriesOptions({
                    query: { field_identifier: fieldIdentifier ?? "" },
                    signal: abortSignal,
                }),
            });
        });
        storedDataUpdater("wellboreTrajectories", ({ getHelperDependency }) => {
            const wellboreTrajectories = getHelperDependency(wellboreTrajectoriesDep);
            return wellboreTrajectories || [];
        });
        const perforationsDep = helperDependency(async function fetchData({ getGlobalSetting, abortSignal }) {
            const fieldIdentifier = getGlobalSetting("fieldId");

            if (!fieldIdentifier) return [];

            return await queryClient.fetchQuery({
                ...getFieldPerforationsOptions({
                    query: { field_identifier: fieldIdentifier ?? "" },
                    signal: abortSignal,
                }),
            });
        });
        storedDataUpdater("perforations", ({ getHelperDependency }) => {
            const perforations = getHelperDependency(perforationsDep);
            return perforations || [];
        });
        const screensDep = helperDependency(async function fetchData({ getGlobalSetting, abortSignal }) {
            const fieldIdentifier = getGlobalSetting("fieldId");

            if (!fieldIdentifier) return [];

            return await queryClient.fetchQuery({
                ...getFieldScreensOptions({
                    query: { field_identifier: fieldIdentifier ?? "" },
                    signal: abortSignal,
                }),
            });
        });
        storedDataUpdater("screens", ({ getHelperDependency }) => {
            const screens = getHelperDependency(screensDep);
            return screens || [];
        });
        // Observed Surface metadata dependency (for time intervals)
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

        // Realization Surface metadata dependency (for formation filters)
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
        // Production data dependency
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

        // Formation segments dependency
        const formationSegmentsDep = helperDependency(async function fetchData({
            getHelperDependency,
            getLocalSetting,
            abortSignal,
        }) {
            const wellboreTrajectories = getHelperDependency(wellboreTrajectoriesDep);
            const ensembleIdent = getLocalSetting(Setting.ENSEMBLE);
            const surfaceAttribute = getLocalSetting(Setting.WELL_TRAJ_FILTER_SURFACE_ATTRIBUTE);
            const topSurfaceName = getLocalSetting(Setting.WELL_TRAJ_FILTER_TOP_SURFACE_NAME);
            const bottomSurfaceName = getLocalSetting(Setting.WELL_TRAJ_FILTER_BOTTOM_SURFACE_NAME);
            const realization = getLocalSetting(Setting.WELL_TRAJ_FILTER_SURFACE_REALIZATION);
            let topSurfaceAddress: FullSurfaceAddress | null = null;
            // top surface
            if (ensembleIdent && surfaceAttribute && topSurfaceName) {
                const addrBuilder = new SurfaceAddressBuilder();
                addrBuilder.withEnsembleIdent(ensembleIdent);
                addrBuilder.withName(topSurfaceName);
                addrBuilder.withAttribute(surfaceAttribute);
                addrBuilder.withRealization(realization ?? 0);
                topSurfaceAddress = addrBuilder.buildRealizationAddress();
            }
            const topSurfAddrStr = topSurfaceAddress ? encodeSurfAddrStr(topSurfaceAddress) : null;
            if (!topSurfAddrStr) {
                return [];
            }
            let bottomSurfaceAddress: FullSurfaceAddress | null = null;
            // bottom surface
            if (ensembleIdent && surfaceAttribute && bottomSurfaceName) {
                const addrBuilder = new SurfaceAddressBuilder();
                addrBuilder.withEnsembleIdent(ensembleIdent);
                addrBuilder.withName(bottomSurfaceName);
                addrBuilder.withAttribute(surfaceAttribute);
                addrBuilder.withRealization(realization ?? 0);
                bottomSurfaceAddress = addrBuilder.buildRealizationAddress();
            }
            const bottomSurfAddrStr = bottomSurfaceAddress ? encodeSurfAddrStr(bottomSurfaceAddress) : null;
            const wellBoresData: WellTrajectory_api[] =
                wellboreTrajectories?.map((traj) => {
                    return {
                        uwi: traj.uniqueWellboreIdentifier,
                        xPoints: traj.eastingArr,
                        yPoints: traj.northingArr,
                        mdPoints: traj.mdArr,
                        zPoints: traj.tvdMslArr,
                    };
                }) ?? [];
            // Fetch formation segments from API
            return await queryClient.fetchQuery({
                ...postGetWellTrajectoriesFormationSegmentsOptions({
                    query: {
                        top_depth_surf_addr_str: topSurfAddrStr || "",
                        bottom_depth_surf_addr_str: bottomSurfAddrStr || "",
                    },
                    body: { well_trajectories: wellBoresData },

                    signal: abortSignal,
                }),
            });
        });
        storedDataUpdater("formationSegments", ({ getHelperDependency }) => {
            const formationSegments = getHelperDependency(formationSegmentsDep);
            return formationSegments || [];
        });

        availableSettingsUpdater(Setting.ENSEMBLE, ({ getGlobalSetting }) => {
            const fieldIdentifier = getGlobalSetting("fieldId");
            const ensembles = getGlobalSetting("ensembles");

            const ensembleIdents = ensembles
                .filter((ensemble) => ensemble.getFieldIdentifier() === fieldIdentifier)
                .map((ensemble) => ensemble.getIdent());

            return ensembleIdents;
        });

        availableSettingsUpdater(Setting.SMDA_WELLBORE_HEADERS, ({ getHelperDependency }) => {
            const wellboreHeaders = getHelperDependency(wellboreHeadersDep);

            if (!wellboreHeaders) {
                return [];
            }

            // Transform enhanced wellbore headers to simplified ones for reduced storage size
            return wellboreHeaders;
        });

        availableSettingsUpdater(Setting.WELL_TRAJ_FILTER_SURFACE_ATTRIBUTE, ({ getHelperDependency }) => {
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
        availableSettingsUpdater(
            Setting.WELL_TRAJ_FILTER_TOP_SURFACE_NAME,
            ({ getHelperDependency, getLocalSetting }) => {
                const attribute = getLocalSetting(Setting.WELL_TRAJ_FILTER_SURFACE_ATTRIBUTE);
                const data = getHelperDependency(realizationSurfaceMetadataDep);

                if (!attribute || !data) {
                    return [];
                }

                const availableSurfaceNames = [
                    ...Array.from(
                        new Set(
                            data.surfaces
                                .filter((surface) => surface.attribute_name === attribute)
                                .map((el) => el.name),
                        ),
                    ),
                ];
                return sortStringArray(availableSurfaceNames, data.surface_names_in_strat_order);
            },
        );
        availableSettingsUpdater(
            Setting.WELL_TRAJ_FILTER_BOTTOM_SURFACE_NAME,
            ({ getHelperDependency, getLocalSetting }) => {
                const attribute = getLocalSetting(Setting.WELL_TRAJ_FILTER_SURFACE_ATTRIBUTE);
                const data = getHelperDependency(realizationSurfaceMetadataDep);

                if (!attribute || !data) {
                    return [];
                }

                const availableSurfaceNames = [
                    ...Array.from(
                        new Set(
                            data.surfaces
                                .filter((surface) => surface.attribute_name === attribute)
                                .map((el) => el.name),
                        ),
                    ),
                ];
                return sortStringArray(availableSurfaceNames, data.surface_names_in_strat_order);
            },
        );
        availableSettingsUpdater(
            Setting.WELL_TRAJ_FILTER_SURFACE_REALIZATION,
            ({ getLocalSetting, getGlobalSetting }) => {
                const ensembleIdent = getLocalSetting(Setting.ENSEMBLE);

                const realizationFilterFunc = getGlobalSetting("realizationFilterFunction");

                if (!ensembleIdent) {
                    return [];
                }

                const realizations = realizationFilterFunc(ensembleIdent);

                return [...realizations];
            },
        );

        availableSettingsUpdater(Setting.TIME_INTERVAL, ({ getHelperDependency }) => {
            const data = getHelperDependency(observedSurfaceMetadataDep);
            if (!data) {
                return [];
            }

            return data.time_intervals_iso_str;
        });
        availableSettingsUpdater(Setting.PDM_OIL_PROD_MIN, ({ getHelperDependency }) => {
            const productionData = getHelperDependency(productionDataDep);
            if (!productionData || productionData.length === 0) {
                return [0, 0, 1000];
            }
            // get max oil production value
            const maxOilProd = productionData.reduce(
                (max, data) => (data.oilProductionSm3 > max ? data.oilProductionSm3 : max),
                0,
            );
            return [0, Math.ceil(maxOilProd / 100) * 100, 1000]; // round up to nearest 100
        });
        availableSettingsUpdater(Setting.PDM_GAS_PROD_MIN, ({ getHelperDependency }) => {
            const productionData = getHelperDependency(productionDataDep);
            if (!productionData || productionData.length === 0) {
                return [0, 0, 1000];
            }
            // get max gas production value
            const maxGasProd = productionData.reduce(
                (max, data) => (data.gasProductionSm3 > max ? data.gasProductionSm3 : max),
                0,
            );
            return [0, Math.ceil(maxGasProd / 100) * 100, 1000]; // round up to nearest 100
        });
        availableSettingsUpdater(Setting.PDM_WATER_PROD_MIN, ({ getHelperDependency }) => {
            const productionData = getHelperDependency(productionDataDep);
            if (!productionData || productionData.length === 0) {
                return [0, 0, 1000];
            }
            // get max water production value
            const maxWaterProd = productionData.reduce(
                (max, data) => (data.waterProductionM3 > max ? data.waterProductionM3 : max),
                0,
            );
            return [0, Math.ceil(maxWaterProd / 100) * 100, 1000]; // round up to nearest 100
        });
        availableSettingsUpdater(Setting.PDM_WATER_INJ_MIN, ({ getHelperDependency }) => {
            const injectionData = getHelperDependency(injectionDataDep);
            if (!injectionData || injectionData.length === 0) {
                return [0, 0, 1000];
            }
            // get max water injection value
            const maxWaterInj = injectionData.reduce(
                (max, data) => (data.waterInjection > max ? data.waterInjection : max),
                0,
            );
            return [0, Math.ceil(maxWaterInj / 100) * 100, 1000]; // round up to nearest 100
        });
        availableSettingsUpdater(Setting.PDM_GAS_INJ_MIN, ({ getHelperDependency }) => {
            const injectionData = getHelperDependency(injectionDataDep);
            if (!injectionData || injectionData.length === 0) {
                return [0, 0, 1000];
            }
            // get max gas injection value
            const maxGasInj = injectionData.reduce(
                (max, data) => (data.gasInjection > max ? data.gasInjection : max),
                0,
            );
            return [0, Math.ceil(maxGasInj / 100) * 100, 1000]; // round up to nearest 100
        });
        storedDataUpdater("selectedWellBoreHeaders", ({ getHelperDependency, getLocalSetting }) => {
            const wellboreHeaders = getHelperDependency(wellboreHeadersDep);
            const selectedWellbores = getLocalSetting(Setting.SMDA_WELLBORE_HEADERS)?.map(
                (header) => header.wellboreUuid,
            );
            if (!wellboreHeaders || !selectedWellbores) {
                return [];
            }
            return wellboreHeaders.filter((wellboreInfo) => selectedWellbores.includes(wellboreInfo.wellboreUuid));
        });
    }
}
