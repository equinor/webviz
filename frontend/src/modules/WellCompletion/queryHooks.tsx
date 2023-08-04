import { WellCompletionData_api } from "@api";
import { apiService } from "@framework/ApiService";
import { UseQueryResult, useQuery } from "@tanstack/react-query";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export function useWellCompletionQuery(
    caseUuid: string | undefined,
    ensembleName: string | undefined,
    realizationNumber: number | undefined
): UseQueryResult<WellCompletionData_api> {
    return useQuery({
        queryKey: ["getWellCompletion", caseUuid, ensembleName, realizationNumber],
        queryFn: () =>
            apiService.wellCompletion.getWellCompletionData(caseUuid ?? "", ensembleName ?? "", realizationNumber),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled: caseUuid && ensembleName ? true : false,
    });
}
