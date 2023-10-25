import { RftWellInfo_api } from "@api";
import { apiService } from "@framework/ApiService";
import { UseQueryResult, useQuery } from "@tanstack/react-query";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export function useRftWellList(
    caseUuid: string | undefined,
    ensembleName: string | undefined,
): UseQueryResult<RftWellInfo_api[]> {
    return useQuery({
        queryKey: ["getRftWellList", caseUuid, ensembleName],
        queryFn: () => apiService.rft.getWellList(caseUuid ?? "", ensembleName ?? ""),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled: caseUuid && ensembleName ? true : false,
    });
}

