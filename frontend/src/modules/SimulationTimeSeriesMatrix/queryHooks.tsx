import { Frequency_api, VectorDescription_api } from "@api";
import { VectorHistoricalData_api, VectorRealizationData_api, VectorStatisticData_api } from "@api";
import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { UseQueryResult, useQueries } from "@tanstack/react-query";

import { VectorSpec } from "./state";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export function useVectorListQueries(
    caseUuidsAndEnsembleNames: EnsembleIdent[] | null
): UseQueryResult<VectorDescription_api[]>[] {
    // Note: how to cancel queryFn if key is updated?
    return useQueries({
        queries: (caseUuidsAndEnsembleNames ?? []).map((item) => {
            return {
                queryKey: ["getVectorList", item.getCaseUuid(), item.getEnsembleName()],
                queryFn: () =>
                    apiService.timeseries.getVectorList(item.getCaseUuid() ?? "", item.getEnsembleName() ?? ""),
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
    realizationsToInclude: number[] | null,
    allowEnable: boolean
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
                enabled: !!(
                    allowEnable &&
                    item.vectorName &&
                    item.ensembleIdent.getCaseUuid() &&
                    item.ensembleIdent.getEnsembleName()
                ),
            };
        }),
    });
}

export function useStatisticalVectorDataQueries(
    vectorSpecifications: VectorSpec[] | null,
    resampleFrequency: Frequency_api | null,
    realizationsToInclude: number[] | null,
    allowEnable: boolean
): UseQueryResult<VectorStatisticData_api>[] {
    return useQueries({
        queries: (vectorSpecifications ?? []).map((item) => {
            return {
                queryKey: [
                    "getStatisticalVectorData",
                    item.ensembleIdent.getCaseUuid(),
                    item.ensembleIdent.getEnsembleName(),
                    item.vectorName,
                    resampleFrequency,
                    realizationsToInclude,
                ],
                queryFn: () =>
                    apiService.timeseries.getStatisticalVectorData(
                        item.ensembleIdent.getCaseUuid() ?? "",
                        item.ensembleIdent.getEnsembleName() ?? "",
                        item.vectorName ?? "",
                        resampleFrequency ?? Frequency_api.MONTHLY,
                        undefined,
                        realizationsToInclude ?? undefined
                    ),
                staleTime: STALE_TIME,
                cacheTime: CACHE_TIME,
                enabled: !!(
                    allowEnable &&
                    item.vectorName &&
                    item.ensembleIdent.getCaseUuid() &&
                    item.ensembleIdent.getEnsembleName() &&
                    resampleFrequency
                ),
            };
        }),
    });
}

export function useHistoricalVectorDataQueries(
    nonHistoricalVectorSpecifications: VectorSpec[] | null,
    resampleFrequency: Frequency_api | null,
    allowEnable: boolean
): UseQueryResult<VectorHistoricalData_api>[] {
    return useQueries({
        queries: (nonHistoricalVectorSpecifications ?? []).map((item) => {
            return {
                queryKey: [
                    "getHistoricalVectorData",
                    item.ensembleIdent.getCaseUuid(),
                    item.ensembleIdent.getEnsembleName(),
                    item.vectorName,
                    resampleFrequency,
                ],
                queryFn: () =>
                    apiService.timeseries.getHistoricalVectorData(
                        item.ensembleIdent.getCaseUuid() ?? "",
                        item.ensembleIdent.getEnsembleName() ?? "",
                        item.vectorName ?? "",
                        resampleFrequency ?? Frequency_api.MONTHLY
                    ),
                staleTime: STALE_TIME,
                cacheTime: CACHE_TIME,
                enabled: !!(
                    allowEnable &&
                    item.vectorName &&
                    item.ensembleIdent.getCaseUuid() &&
                    item.ensembleIdent.getEnsembleName() &&
                    resampleFrequency
                ),
            };
        }),
    });
}
