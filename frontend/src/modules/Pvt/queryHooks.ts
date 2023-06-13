import { PvtData } from "@api";
import { apiService } from "@framework/ApiService";
import { UseQueryResult, useQuery } from "@tanstack/react-query";


const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export function usePvtDataQuery(caseUuid: string | null, ensembleName: string | null, realization: number | null): UseQueryResult<PvtData[]> {
    return useQuery({
        queryKey: ["tableData", caseUuid, ensembleName, realization],
        queryFn: () => apiService.pvt.tableData(caseUuid ?? "", ensembleName ?? "", realization ?? 0),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled: caseUuid && ensembleName && realization != null ? true : false,
    });
}
