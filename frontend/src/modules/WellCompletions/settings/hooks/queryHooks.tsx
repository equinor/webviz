import { WellCompletionsData_api } from "@api";
import { apiService } from "@framework/ApiService";
import { UseQueryResult, useQuery } from "@tanstack/react-query";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export function useWellCompletionsQuery(
    caseUuid: string | undefined,
    ensembleName: string | undefined,
    realizationNumber: number | undefined
): UseQueryResult<WellCompletionsData_api> {
    return useQuery({
        queryKey: ["getWellCompletions", caseUuid, ensembleName, realizationNumber],
        queryFn: () =>
            apiService.wellCompletions.getWellCompletionsData(caseUuid ?? "", ensembleName ?? "", realizationNumber),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: caseUuid && ensembleName ? true : false,
    });
}
