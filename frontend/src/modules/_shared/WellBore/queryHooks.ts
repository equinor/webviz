import {
    WellboreHeader_api,
    WellborePicksAndStratigraphicUnits_api,
    WellboreTrajectory_api,
    getDrilledWellboreHeadersOptions,
    getFieldWellTrajectories,
} from "@api";
import { WellboreHeader_api, WellboreTrajectory_api } from "@api";
import { apiService } from "@framework/ApiService";
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
        queryFn: () => apiService.well.getWellTrajectories(fieldIdentifier ?? ""),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: fieldIdentifier ? true : false,
    });
}
