import { Frequency_api, VectorDescription_api } from "@api";
import { VectorHistoricalData_api, VectorRealizationData_api, VectorStatisticData_api } from "@api";
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
        cacheTime: CACHE_TIME,
        enabled: caseUuid && ensembleName ? true : false,
    });
}

export function useVectorDataQuery(
    caseUuid: string | undefined,
    ensembleName: string | undefined,
    vectorName: string | undefined,
    resampleFrequency: Frequency_api | null,
    realizationsToInclude: number[] | null,
    allowEnable: boolean
): UseQueryResult<Array<VectorRealizationData_api>> {
    const allOrNonEmptyRealArr = realizationsToInclude === null || realizationsToInclude.length > 0 ? true : false;
    return useQuery({
        queryKey: [
            "getRealizationsVectorData",
            caseUuid,
            ensembleName,
            vectorName,
            resampleFrequency,
            realizationsToInclude,
        ],
        queryFn: () =>
            apiService.timeseries.getRealizationsVectorData(
                caseUuid ?? "",
                ensembleName ?? "",
                vectorName ?? "",
                resampleFrequency ?? undefined,
                realizationsToInclude ?? undefined
            ),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled: !!(allowEnable && caseUuid && ensembleName && vectorName && allOrNonEmptyRealArr),
    });
}

export function useStatisticalVectorDataQuery(
    caseUuid: string | undefined,
    ensembleName: string | undefined,
    vectorName: string | undefined,
    resampleFrequency: Frequency_api | null,
    realizationsToInclude: number[] | null,
    allowEnable: boolean
): UseQueryResult<VectorStatisticData_api> {
    const allOrNonEmptyRealArr = realizationsToInclude === null || realizationsToInclude.length > 0 ? true : false;
    return useQuery({
        queryKey: [
            "getStatisticalVectorData",
            caseUuid,
            ensembleName,
            vectorName,
            resampleFrequency,
            realizationsToInclude,
        ],
        queryFn: () =>
            apiService.timeseries.getStatisticalVectorData(
                caseUuid ?? "",
                ensembleName ?? "",
                vectorName ?? "",
                resampleFrequency ?? Frequency_api.MONTHLY,
                undefined,
                realizationsToInclude ?? undefined
            ),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled: !!(allowEnable && caseUuid && ensembleName && vectorName && resampleFrequency && allOrNonEmptyRealArr),
    });
}

export function useHistoricalVectorDataQuery(
    caseUuid: string | undefined,
    ensembleName: string | undefined,
    nonHistoricalVectorName: string | undefined,
    resampleFrequency: Frequency_api | null,
    allowEnable: boolean
): UseQueryResult<VectorHistoricalData_api> {
    return useQuery({
        queryKey: ["getHistoricalVectorData", caseUuid, ensembleName, nonHistoricalVectorName, resampleFrequency],
        queryFn: () =>
            apiService.timeseries.getHistoricalVectorData(
                caseUuid ?? "",
                ensembleName ?? "",
                nonHistoricalVectorName ?? "",
                resampleFrequency ?? Frequency_api.MONTHLY
            ),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled: !!(allowEnable && caseUuid && ensembleName && nonHistoricalVectorName && resampleFrequency),
    });
}
