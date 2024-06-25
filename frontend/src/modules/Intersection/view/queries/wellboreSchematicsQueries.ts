import { WellboreCasing_api } from "@api";
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
