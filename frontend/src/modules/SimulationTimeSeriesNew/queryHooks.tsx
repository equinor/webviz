import { Frequency_api, StatisticFunction_api, VectorDescription_api } from "@api";
import { VectorRealizationData_api, VectorStatisticData_api } from "@api";
import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { UseQueryResult, useQueries, useQuery } from "@tanstack/react-query";

import { VectorSpec } from "./state";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

// NOTE: Should single queries be replaced with one large query? I.e. not separating vector, statistical, observed and history?

export function useVectorsQueries(
    caseUuidsAndEnsembleNames: EnsembleIdent[] | null
): UseQueryResult<VectorDescription_api[]>[] {
    // Note: how to cancel queryFn if key is updated?
    return useQueries({
        queries: (caseUuidsAndEnsembleNames ?? []).map((item) => {
            return {
                queryKey: ["getVectorNamesAndDescriptions", item.getCaseUuid(), item.getEnsembleName()],
                queryFn: () =>
                    apiService.timeseries.getVectorNamesAndDescriptions(
                        item.getCaseUuid() ?? "",
                        item.getEnsembleName() ?? ""
                    ),
                staleTime: STALE_TIME,
                cacheTime: CACHE_TIME,
                enabled: item.getCaseUuid() && item.getEnsembleName() ? true : false,
            };
        }),
    });
}

export function useVectorDataQueries(
    vectorSpecifications: VectorSpec[] | null,
    resampleFrequency: Frequency_api | null,
    realizationsToInclude: number[] | null
): UseQueryResult<VectorRealizationData_api[]>[] {
    // Note: how to cancel queryFn if key is updated?
    return useQueries({
        queries: (vectorSpecifications ?? []).map((item) => {
            return {
                queryKey: [
                    "getRealizationsVectorData",
                    item.ensembleIdent.getCaseUuid(),
                    item.ensembleIdent.getEnsembleName(),
                    item.vectorName,
                    resampleFrequency,
                    realizationsToInclude,
                ],
                queryFn: () =>
                    apiService.timeseries.getRealizationsVectorData(
                        item.ensembleIdent.getCaseUuid() ?? "",
                        item.ensembleIdent.getEnsembleName() ?? "",
                        item.vectorName ?? "",
                        resampleFrequency ?? undefined,
                        realizationsToInclude ?? undefined
                    ),
                staleTime: STALE_TIME,
                cacheTime: CACHE_TIME,
                enabled: item.ensembleIdent.getCaseUuid() && item.ensembleIdent.getEnsembleName() ? true : false,
            };
        }),
    });
}

// NOTE: Update to use queries?
export function useStatisticalVectorDataQuery(
    caseUuid: string | undefined,
    ensembleName: string | undefined,
    vectorName: string | undefined,
    resampleFrequency: Frequency_api | null,
    statisticFunctions: StatisticFunction_api[] | null,
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
            statisticFunctions,
        ],
        queryFn: () =>
            apiService.timeseries.getStatisticalVectorData(
                caseUuid ?? "",
                ensembleName ?? "",
                vectorName ?? "",
                resampleFrequency ?? Frequency_api.MONTHLY,
                statisticFunctions === null ? undefined : statisticFunctions,
                realizationsToInclude ?? undefined
            ),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled:
            allowEnable && caseUuid && ensembleName && vectorName && resampleFrequency && allOrNonEmptyRealArr
                ? true
                : false,
    });
}
