import { isEqual } from "lodash";

import type { EnhancedWellboreHeader_api, WellboreTrajectory_api } from "@api";
import {
    getDrilledWellboreHeadersOptions,
    getObservedSurfacesMetadataOptions,
    getRealizationSurfacesMetadataOptions,
    getWellTrajectoriesOptions,
    SurfaceAttributeType_api,
} from "@api";
import { sortStringArray } from "@lib/utils/arrays";
import { transformToSimplifiedWellboreHeaders } from "@lib/utils/wellboreTypes";
import type {
    CustomDataProviderImplementation,
    FetchDataParams,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { DefineDependenciesArgs } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import type { MakeSettingTypesMap } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

const richDrilledWellTrajectoriesSettings = [
    Setting.ENSEMBLE,
    Setting.SMDA_WELLBORE_HEADERS,
    Setting.DEPTH_FILTER,
    Setting.TIME_OR_INTERVAL,
    Setting.WELL_TRAJ_FILTER_SURFACE_ATTRIBUTE,
    Setting.WELL_TRAJ_FILTER_TOP_SURFACE_NAME,
    Setting.WELL_TRAJ_FILTER_BOTTOM_SURFACE_NAME,
    Setting.WELL_TRAJ_FILTER_SURFACE_REALIZATION,
] as const;
type RichDrilledWellTrajectoriesSettings = typeof richDrilledWellTrajectoriesSettings;
type SettingsWithTypes = MakeSettingTypesMap<RichDrilledWellTrajectoriesSettings>;
export type DrilledWellboreTrajectoriesStoredData = {
    selectedWellBoreHeaders: EnhancedWellboreHeader_api[];
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
        availableSettingsUpdater(Setting.ENSEMBLE, ({ getGlobalSetting }) => {
            const fieldIdentifier = getGlobalSetting("fieldId");
            const ensembles = getGlobalSetting("ensembles");

            const ensembleIdents = ensembles
                .filter((ensemble) => ensemble.getFieldIdentifier() === fieldIdentifier)
                .map((ensemble) => ensemble.getIdent());

            return ensembleIdents;
        });

        const wellboreHeadersDep = helperDependency(async function fetchData({ getGlobalSetting, abortSignal }) {
            const fieldIdentifier = getGlobalSetting("fieldId");
            return await queryClient.fetchQuery({
                ...getDrilledWellboreHeadersOptions({
                    query: { field_identifier: fieldIdentifier ?? "" },
                    signal: abortSignal,
                }),
            });
        });
        availableSettingsUpdater(Setting.SMDA_WELLBORE_HEADERS, ({ getHelperDependency }) => {
            const wellboreHeaders = getHelperDependency(wellboreHeadersDep);

            if (!wellboreHeaders) {
                return [];
            }

            // Transform enhanced wellbore headers to simplified ones for reduced storage size
            return transformToSimplifiedWellboreHeaders(wellboreHeaders);
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

        availableSettingsUpdater(Setting.TIME_OR_INTERVAL, ({ getHelperDependency }) => {
            const data = getHelperDependency(observedSurfaceMetadataDep);
            if (!data) {
                return [];
            }

            return data.time_intervals_iso_str;
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
