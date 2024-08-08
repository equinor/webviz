import { Frequency_api, VectorHistoricalData_api, VectorStatisticSensitivityData_api } from "@api";
import { VectorRealizationData_api } from "@api";
import { apiService } from "@framework/ApiService";
import { UseQueryResult, useQuery } from "@tanstack/react-query";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export function useVectorDataQuery(
    caseUuid: string | undefined,
    ensembleName: string | undefined,
    vectorName: string | undefined,
    resampleFrequency: Frequency_api | null,
    realizationsToInclude: number[] | null
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
        gcTime: CACHE_TIME,
        enabled: !!(caseUuid && ensembleName && vectorName && allOrNonEmptyRealArr),
    });
}

export function useStatisticalVectorSensitivityDataQuery(
    caseUuid: string | undefined,
    ensembleName: string | undefined,
    vectorName: string | undefined,
    resampleFrequency: Frequency_api | null,
    allowEnable: boolean
): UseQueryResult<VectorStatisticSensitivityData_api[]> {
    return useQuery({
        queryKey: ["getStatisticalVectorDataPerSensitivity", caseUuid, ensembleName, vectorName, resampleFrequency],
        queryFn: () =>
            apiService.timeseries.getStatisticalVectorDataPerSensitivity(
                caseUuid ?? "",
                ensembleName ?? "",
                vectorName ?? "",
                resampleFrequency ?? Frequency_api.MONTHLY,
                undefined
            ),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: !!(allowEnable && caseUuid && ensembleName && vectorName && resampleFrequency),
    });
}

export function useHistoricalVectorDataQuery(
    caseUuid: string | undefined,
    ensembleName: string | undefined,
    vectorName: string | undefined,
    resampleFrequency: Frequency_api | null,
    allowEnable: boolean
): UseQueryResult<VectorHistoricalData_api> {
    return useQuery({
        queryKey: ["getHistoricalVectorData", caseUuid, ensembleName, vectorName, resampleFrequency],
        queryFn: () =>
            apiService.timeseries.getHistoricalVectorData(
                caseUuid ?? "",
                ensembleName ?? "",
                vectorName ?? "",
                resampleFrequency ?? Frequency_api.MONTHLY
            ),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: !!(allowEnable && caseUuid && ensembleName && vectorName && resampleFrequency),
    });
}
