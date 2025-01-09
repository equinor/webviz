import {
    WellboreHeader_api,
    WellborePicksAndStratigraphicUnits_api,
    WellboreTrajectory_api,
    getDrilledWellboreHeadersOptions,
    getFieldWellTrajectories,
} from "@api";
import { UseQueryResult, useQuery } from "@tanstack/react-query";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export function useDrilledWellboreHeadersQuery(
    fieldIdentifier: string | undefined
): UseQueryResult<WellboreHeader_api[]> {
    return useQuery({
        ...getDrilledWellboreHeadersOptions({
            query: {
                field_identifier: fieldIdentifier ?? "",
            },
        }),
        enabled: Boolean(fieldIdentifier),
    });
}

export function useFieldWellboreTrajectoriesQuery(
    fieldIdentifier: string | undefined
): UseQueryResult<WellboreTrajectory_api[]> {
    return useQuery({
        queryKey: ["getFieldWellsTrajectories", fieldIdentifier],
        queryFn: () => getFieldWellTrajectories({ query: { field_identifier: fieldIdentifier ?? "" } }),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: fieldIdentifier ? true : false,
    });
}

export function useWellboreTrajectoriesQuery(
    wellboreUuids: string[] | undefined
): UseQueryResult<WellboreTrajectory_api[]> {
    return useQuery({
        queryKey: ["getWellTrajectories", wellboreUuids],
        queryFn: () => apiService.well.getWellTrajectories(wellboreUuids ?? []),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: wellboreUuids !== undefined && wellboreUuids.length > 0,
    });
}

export function useWellborePicksAndStratigraphicUnitsQuery(
    caseUuid: string | undefined,
    wellboreUuid: string | undefined,
    allowEnable: boolean
): UseQueryResult<WellborePicksAndStratigraphicUnits_api> {
    return useQuery({
        queryKey: ["getWellborePicksAndStratigraphicUnits", caseUuid, wellboreUuid],
        queryFn: () => apiService.well.getWellborePicksAndStratigraphicUnits(caseUuid ?? "", wellboreUuid ?? ""),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: !!(allowEnable && caseUuid && wellboreUuid),
    });
}
