import { isEqual } from "lodash";

import type {
    WellTrajectory_api,
    WellTrajectoryFormationSegmentsSuccess_api,
    WellboreHeader_api,
} from "@api";
import {
    getPlannedWellboreHeadersOptions,
    getPlannedWellTrajectoriesOptions,
    getRealizationSurfacesMetadataOptions,
    postGetWellTrajectoriesFormationSegmentsOptions,
    SurfaceAttributeType_api,
} from "@api";
import { sortStringArray } from "@lib/utils/arrays";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { SurfaceAddressBuilder } from "@modules/_shared/Surface";
import { encodeSurfAddrStr } from "@modules/_shared/Surface/surfaceAddress";

import { NO_UPDATE } from "../../delegates/_utils/Dependency";
import type {
    CustomDataProviderImplementation,
    DataProviderAccessors,
    FetchDataParams,
} from "../../interfacesAndTypes/customDataProviderImplementation";
import type { DefineDependenciesArgs } from "../../interfacesAndTypes/customSettingsHandler";
import type { MakeSettingTypesMap } from "../../interfacesAndTypes/utils";

import type { WellboreTrajectoriesData } from "./wellboreTrajectoryTypes";

const plannedWellboreTrajectoriesSettings = [
    Setting.ENSEMBLE,
    Setting.WELLBORES,
    Setting.WELLBORE_DEPTH_FILTER_TYPE,
    Setting.MD_RANGE,
    Setting.TVD_RANGE,
    Setting.WELLBORE_DEPTH_FILTER_ATTRIBUTE,
    Setting.WELLBORE_DEPTH_FORMATION_FILTER,
] as const;
export type PlannedWellboreTrajectoriesSettings = typeof plannedWellboreTrajectoriesSettings;
type SettingsWithTypes = MakeSettingTypesMap<PlannedWellboreTrajectoriesSettings>;

export type PlannedWellboreTrajectoriesData = WellboreTrajectoriesData;

export class PlannedWellboreTrajectoriesProvider
    implements CustomDataProviderImplementation<PlannedWellboreTrajectoriesSettings, PlannedWellboreTrajectoriesData>
{
    settings = plannedWellboreTrajectoriesSettings;

    getDefaultName() {
        return "Well Trajectories (Planned)";
    }

    areCurrentSettingsValid({
        getSetting,
    }: DataProviderAccessors<PlannedWellboreTrajectoriesSettings, PlannedWellboreTrajectoriesData>): boolean {
        if (!getSetting(Setting.ENSEMBLE)) {
            return false;
        }

        return true;
    }

    doSettingsChangesRequireDataRefetch(prevSettings: SettingsWithTypes | null, newSettings: SettingsWithTypes) {
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
        fetchQuery,
    }: FetchDataParams<
        PlannedWellboreTrajectoriesSettings,
        PlannedWellboreTrajectoriesData
    >): Promise<PlannedWellboreTrajectoriesData> {
        const fieldIdentifier = getGlobalSetting("fieldId");
        const ensembleIdent = getSetting(Setting.ENSEMBLE);
        const selectedWellboreHeaders = getSetting(Setting.WELLBORES);
        const depthFilterType = getSetting(Setting.WELLBORE_DEPTH_FILTER_TYPE);

        const selectedWellboreUuids = selectedWellboreHeaders?.map((wb) => wb.wellboreUuid) ?? [];

        const plannedWellTrajectoriesQueryOptions = getPlannedWellTrajectoriesOptions({
            query: { field_identifier: fieldIdentifier ?? "" },
        });

        const allPlannedWellTrajectories = await fetchQuery({
            ...plannedWellTrajectoriesQueryOptions,
            staleTime: 1800000,
            gcTime: 1800000,
        });

        const filteredWellTrajectories = allPlannedWellTrajectories.filter((traj) =>
            selectedWellboreUuids.includes(traj.wellboreUuid),
        );

        const formationFilter = getSetting(Setting.WELLBORE_DEPTH_FORMATION_FILTER);
        const surfaceAttribute = getSetting(Setting.WELLBORE_DEPTH_FILTER_ATTRIBUTE);
        const successfulFormationSegments: WellTrajectoryFormationSegmentsSuccess_api[] = [];
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
                const bottomSurfaceAddress = addrBuilder.withName(formationFilter.baseSurfaceName).buildRealizationAddress();
                bottomSurfaceAddressString = encodeSurfAddrStr(bottomSurfaceAddress);
            }

            const convertedWellTrajectories: WellTrajectory_api[] = filteredWellTrajectories.map((traj) => ({
                uwi: traj.uniqueWellboreIdentifier,
                xPoints: traj.eastingArr,
                yPoints: traj.northingArr,
                zPoints: traj.tvdMslArr,
                mdPoints: traj.mdArr,
            }));

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
                }
            }
        }

        const result: PlannedWellboreTrajectoriesData = [];
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
            });
        }

        return result;
    }

    defineDependencies({
        helperDependency,
        valueConstraintsUpdater,
        settingAttributesUpdater,
        queryClient,
    }: DefineDependenciesArgs<PlannedWellboreTrajectoriesSettings>) {
        valueConstraintsUpdater(Setting.ENSEMBLE, ({ getGlobalSetting }) => {
            const fieldIdentifier = getGlobalSetting("fieldId");
            const ensembles = getGlobalSetting("ensembles");
            if (!fieldIdentifier) {
                return [];
            }
            return ensembles
                .filter((ensemble) => ensemble.getFieldIdentifiers().includes(fieldIdentifier))
                .map((ensemble) => ensemble.getIdent());
        });

        const plannedWellboreHeadersDep = helperDependency(async function fetchData({ getGlobalSetting, abortSignal }) {
            const fieldIdentifier = getGlobalSetting("fieldId");
            if (!fieldIdentifier) {
                return null;
            }
            return await queryClient.fetchQuery({
                ...getPlannedWellboreHeadersOptions({
                    query: { field_identifier: fieldIdentifier },
                    signal: abortSignal,
                }),
            });
        });

        valueConstraintsUpdater(Setting.WELLBORES, ({ getHelperDependency }) => {
            const wellboreHeaders = getHelperDependency(plannedWellboreHeadersDep);

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
            const data = getHelperDependency(plannedWellboreHeadersDep);
            const selectedWellboreHeaders = getLocalSetting(Setting.WELLBORES);

            if (!data || !selectedWellboreHeaders) {
                return NO_UPDATE;
            }

            const filteredData = data.filter((header) =>
                selectedWellboreHeaders.some((wb) => wb.wellboreUuid === header.wellboreUuid),
            );

            return getRangeForHeaders(filteredData, "mdMin", "mdMax");
        });

        settingAttributesUpdater(Setting.TVD_RANGE, ({ getLocalSetting }) => {
            const filterType = getLocalSetting(Setting.WELLBORE_DEPTH_FILTER_TYPE);
            return {
                visible: filterType === "tvd_range",
            };
        });

        valueConstraintsUpdater(Setting.TVD_RANGE, ({ getHelperDependency, getLocalSetting }) => {
            const data = getHelperDependency(plannedWellboreHeadersDep);
            const selectedWellboreHeaders = getLocalSetting(Setting.WELLBORES);

            if (!data || !selectedWellboreHeaders) {
                return NO_UPDATE;
            }

            const filteredData = data.filter((header) =>
                selectedWellboreHeaders.some((wb) => wb.wellboreUuid === header.wellboreUuid),
            );

            return getRangeForHeaders(filteredData, "tvdMin", "tvdMax");
        });

        settingAttributesUpdater(Setting.WELLBORE_DEPTH_FILTER_ATTRIBUTE, ({ getHelperDependency, getLocalSetting }) => {
            const filterType = getLocalSetting(Setting.WELLBORE_DEPTH_FILTER_TYPE);
            const data = getHelperDependency(realizationSurfaceMetadataDep);
            return {
                enabled: data?.surfaces.length ? true : { enabled: false, reason: "No surfaces available" },
                visible: filterType === "surface_based",
            };
        });

        valueConstraintsUpdater(Setting.WELLBORE_DEPTH_FILTER_ATTRIBUTE, ({ getHelperDependency }) => {
            const data = getHelperDependency(realizationSurfaceMetadataDep);

            if (!data) {
                return [];
            }

            return Array.from(
                new Set(
                    data.surfaces
                        .filter((surface) => surface.attribute_type === SurfaceAttributeType_api.DEPTH)
                        .map((surface) => surface.attribute_name),
                ),
            );
        });

        settingAttributesUpdater(Setting.WELLBORE_DEPTH_FORMATION_FILTER, ({ getHelperDependency, getLocalSetting }) => {
            const filterType = getLocalSetting(Setting.WELLBORE_DEPTH_FILTER_TYPE);
            const data = getHelperDependency(realizationSurfaceMetadataDep);
            return {
                enabled: data?.surfaces.length ? true : { enabled: false, reason: "No surfaces available" },
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
                    const availableSurfaceNames = Array.from(
                        new Set(
                            data.surfaces
                                .filter((surface) => surface.attribute_name === attribute)
                                .map((surface) => surface.name),
                        ),
                    );
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
    }
}

function getRangeForHeaders(
    headers: WellboreHeader_api[],
    minKey: "mdMin" | "tvdMin",
    maxKey: "mdMax" | "tvdMax",
): [number, number, number] {
    if (headers.length === 0) {
        return [0, 0, 1];
    }

    let globalMin = Number.POSITIVE_INFINITY;
    let globalMax = Number.NEGATIVE_INFINITY;

    for (const header of headers) {
        const minValue = header[minKey];
        const maxValue = header[maxKey];
        if (typeof minValue === "number") {
            globalMin = Math.min(globalMin, minValue);
        }
        if (typeof maxValue === "number") {
            globalMax = Math.max(globalMax, maxValue);
        }
    }

    if (globalMin === Number.POSITIVE_INFINITY || globalMax === Number.NEGATIVE_INFINITY) {
        return [0, 0, 1];
    }

    return [globalMin, globalMax, 1];
}