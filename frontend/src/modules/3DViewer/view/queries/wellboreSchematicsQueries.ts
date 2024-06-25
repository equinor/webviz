import { WellboreCasing_api, WellboreCompletion_api, WellborePerforation_api } from "@api";
import { apiService } from "@framework/ApiService";
import { UseQueryResult, useQuery } from "@tanstack/react-query";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export function useWellboreCasingsQuery(wellUuid: string | undefined): UseQueryResult<WellboreCasing_api[]> {
    return useQuery({
        queryKey: ["getWellboreCasing", wellUuid],
        queryFn: () => apiService.well.getWellboreCasings(wellUuid ?? ""),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: wellUuid ? true : false,
    });
}

export function useWellborePerforationsQuery(wellUuid: string | undefined): UseQueryResult<WellborePerforation_api[]> {
    return useQuery({
        queryKey: ["getWellborePerforations", wellUuid],
        queryFn: () => apiService.well.getWellborePerforations(wellUuid ?? ""),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: wellUuid ? true : false,
    });
}

export function useWellboreCompletionsQuery(wellUuid: string | undefined): UseQueryResult<WellboreCompletion_api[]> {
    return useQuery({
        queryKey: ["getWellboreCompletions", wellUuid],
        queryFn: () => apiService.well.getWellboreCompletions(wellUuid ?? ""),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: wellUuid ? true : false,
    });
}
