import { UseQueryResult, useQuery } from "react-query";

import { Frequency, VectorRealizationData, VectorStatisticData } from "@api";
import { apiService } from "@framework/ApiService";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export function useVectorDataQuery(
    caseUuid: string | null,
    ensembleName: string | null,
    vectorName: string | null,
    resampleFrequency: Frequency | null,
    realizationsToInclude: number[] | null
): UseQueryResult<Array<VectorRealizationData>> {
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
        enabled: caseUuid && ensembleName && vectorName ? true : false,
    });
}

export function useStatisticalVectorDataQuery(
    caseUuid: string | null,
    ensembleName: string | null,
    vectorName: string | null,
    resampleFrequency: Frequency | null,
    realizationsToInclude: number[] | null,
    allowEnable: boolean
): UseQueryResult<VectorStatisticData> {
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
                resampleFrequency ?? Frequency.MONTHLY,
                undefined,
                realizationsToInclude ?? undefined
            ),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled: allowEnable && caseUuid && ensembleName && vectorName && resampleFrequency ? true : false,
    });
}