import { RftInfo_api, RftRealizationData_api } from "@api";
import { apiService } from "@framework/ApiService";
import { UseQueryResult, useQuery } from "@tanstack/react-query";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export function useRftWellList(
    caseUuid: string | undefined,
    ensembleName: string | undefined,
): UseQueryResult<RftInfo_api[]> {
    return useQuery({
        queryKey: ["getRftWellList", caseUuid, ensembleName],
        queryFn: () => apiService.rft.getRftInfo(caseUuid ?? "", ensembleName ?? ""),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled: caseUuid && ensembleName ? true : false,
    });
}

export function useRftRealizationData(
    caseUuid: string | undefined,
    ensembleName: string | undefined,
    wellName: string | undefined,
    responseName: string | undefined,
    timePoints: number[] | undefined,
    realizationNums: number[] | null | undefined,
): UseQueryResult<RftRealizationData_api[]> {
    return useQuery({
        queryKey: ["getRftRealizationData", caseUuid, ensembleName, wellName, responseName, timePoints, realizationNums],
        queryFn: () => apiService.rft.getRealizationData(caseUuid ?? "", ensembleName ?? "", wellName ?? "", responseName ?? "", timePoints ?? undefined, realizationNums ?? undefined),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled: caseUuid && ensembleName && wellName && responseName ? true : false,
    });
}

