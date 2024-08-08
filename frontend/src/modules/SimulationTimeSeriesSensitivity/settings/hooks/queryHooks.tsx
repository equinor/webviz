import { VectorDescription_api } from "@api";
import { apiService } from "@framework/ApiService";
import { UseQueryResult, useQuery } from "@tanstack/react-query";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export function useVectorListQuery(
    caseUuid: string | undefined,
    ensembleName: string | undefined
): UseQueryResult<Array<VectorDescription_api>> {
    return useQuery({
        queryKey: ["getVectorList", caseUuid, ensembleName],
        queryFn: () => apiService.timeseries.getVectorList(caseUuid ?? "", ensembleName ?? ""),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: !!(caseUuid && ensembleName),
    });
}
