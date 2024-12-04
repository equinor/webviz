import { WellboreHeader_api, WellboreTrajectory_api } from "@api";
import { apiService } from "@framework/ApiService";
import { UseQueryResult, useQuery } from "@tanstack/react-query";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export function useDrilledWellboreHeadersQuery(caseUuid: string | undefined): UseQueryResult<WellboreHeader_api[]> {
    return useQuery({
        queryKey: ["getDrilledWellboreHeaders", caseUuid],
        queryFn: () => apiService.well.getDrilledWellboreHeaders(caseUuid ?? ""),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: caseUuid ? true : false,
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
