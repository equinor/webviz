import { isEqual } from "lodash";

import type { WellboreTrajectory_api } from "@api";
import {
    getDrilledWellboreHeadersOptions,
    getObservedSurfacesMetadataOptions,
    getRealizationSurfacesMetadataOptions,
    getWellTrajectoriesOptions,
    SurfaceAttributeType_api,
} from "@api";
import { sortStringArray } from "@lib/utils/arrays";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

import { NO_UPDATE } from "../../delegates/_utils/Dependency";
import type {
    CustomDataProviderImplementation,
    FetchDataParams,
} from "../../interfacesAndTypes/customDataProviderImplementation";
import type { DefineDependenciesArgs } from "../../interfacesAndTypes/customSettingsHandler";
import type { MakeSettingTypesMap } from "../../interfacesAndTypes/utils";

const drilledWellTrajectoriesSettings = [
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
type DrilledWellTrajectoriesSettings = typeof drilledWellTrajectoriesSettings;
type SettingsWithTypes = MakeSettingTypesMap<DrilledWellTrajectoriesSettings>;

type DrilledWellTrajectoriesData = WellboreTrajectory_api[];

export class DrilledWellTrajectoriesProvider
    implements CustomDataProviderImplementation<DrilledWellTrajectoriesSettings, DrilledWellTrajectoriesData>
{
    settings = drilledWellTrajectoriesSettings;

    getDefaultName() {
        return "Well Trajectories (Official)";
    }

    doSettingsChangesRequireDataRefetch(prevSettings: SettingsWithTypes, newSettings: SettingsWithTypes): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    fetchData({
        getSetting,
        getGlobalSetting,
        fetchQuery,
    }: FetchDataParams<
        DrilledWellTrajectoriesSettings,
        DrilledWellTrajectoriesData
    >): Promise<DrilledWellTrajectoriesData> {
        const fieldIdentifier = getGlobalSetting("fieldId");
        const selectedWellbores = getSetting(Setting.WELLBORES) ?? [];
        const selectedWellboreUuids = selectedWellbores.map((wb) => wb.wellboreUuid);

        const queryOptions = getWellTrajectoriesOptions({
            query: { field_identifier: fieldIdentifier ?? "" },
        });

        const promise = fetchQuery({
            ...queryOptions,
            staleTime: 1800000, // TODO: Both stale and gcTime are set to 30 minutes for now since SMDA is quite slow for fields with many wells - this should be adjusted later
            gcTime: 1800000,
        }).then((response: DrilledWellTrajectoriesData) => {
            return response.filter((trajectory) => selectedWellboreUuids.includes(trajectory.wellboreUuid));
        });

        return promise;
    }

    defineDependencies({
        helperDependency,
        valueRangeUpdater,
        settingAttributesUpdater,
        workbenchSession,
        queryClient,
    }: DefineDependenciesArgs<DrilledWellTrajectoriesSettings>) {
        valueRangeUpdater(Setting.ENSEMBLE, ({ getGlobalSetting }) => {
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

        valueRangeUpdater(Setting.WELLBORES, ({ getHelperDependency }) => {
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

        valueRangeUpdater(Setting.MD_RANGE, ({ getHelperDependency, getLocalSetting }) => {
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

        valueRangeUpdater(Setting.TVD_RANGE, ({ getHelperDependency, getLocalSetting }) => {
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

        valueRangeUpdater(Setting.WELLBORE_DEPTH_FILTER_ATTRIBUTE, ({ getHelperDependency }) => {
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

        valueRangeUpdater(
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

        valueRangeUpdater(Setting.TIME_INTERVAL, ({ getHelperDependency }) => {
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
    }
}
