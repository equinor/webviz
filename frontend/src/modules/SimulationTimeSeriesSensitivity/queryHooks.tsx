import { Frequency_api, VectorDescription_api, VectorStatisticSensitivityData_api } from "@api";
import { VectorRealizationData_api, VectorStatisticData_api } from "@api";
import { apiService } from "@framework/ApiService";
import { UseQueryResult, useQuery } from "@tanstack/react-query";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export function useVectorsQuery(
    caseUuid: string | undefined,
    ensembleName: string | undefined
): UseQueryResult<Array<VectorDescription_api>> {
    return useQuery({
        queryKey: ["getVectorNamesAndDescriptions", caseUuid, ensembleName],
        queryFn: () => apiService.timeseries.getVectorNamesAndDescriptions(caseUuid ?? "", ensembleName ?? ""),
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
        cacheTime: CACHE_TIME,
        enabled: caseUuid && ensembleName && vectorName && allOrNonEmptyRealArr ? true : false,
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
        cacheTime: CACHE_TIME,
        enabled: allowEnable && caseUuid && ensembleName && vectorName && resampleFrequency ? true : false,
    });
}
