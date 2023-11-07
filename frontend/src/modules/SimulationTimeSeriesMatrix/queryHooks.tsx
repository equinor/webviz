import { Frequency_api, SummaryVectorObservations_api, VectorDescription_api } from "@api";
import { Observations_api, VectorHistoricalData_api, VectorRealizationData_api, VectorStatisticData_api } from "@api";
import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { UseQueryResult, useQueries } from "@tanstack/react-query";

import { VectorSpec } from "./state";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export function useVectorListQueries(
    caseUuidsAndEnsembleNames: EnsembleIdent[] | null
): UseQueryResult<VectorDescription_api[]>[] {
    return useQueries({
        queries: (caseUuidsAndEnsembleNames ?? []).map((item) => {
            return {
                queryKey: ["getVectorList", item.getCaseUuid(), item.getEnsembleName()],
                queryFn: () =>
                    apiService.timeseries.getVectorList(item.getCaseUuid() ?? "", item.getEnsembleName() ?? ""),
                staleTime: STALE_TIME,
                gcTime: CACHE_TIME,
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
                gcTime: CACHE_TIME,
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
                gcTime: CACHE_TIME,
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
                gcTime: CACHE_TIME,
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

export type EnsembleVectorObservationsMap = Map<
    EnsembleIdent,
    {
        hasSummaryObservations: boolean;
        vectorsObservationData: { vectorSpecification: VectorSpec; data: SummaryVectorObservations_api }[];
    }
>;

/**
 * This function takes vectorSpecifications and returns a map of ensembleIdent and the respective vector observations.
 *
 * If the returned summary array from back-end is empty array, the ensemble does not have observations.
 * If the selected vectors are not among the returned summary array, the vector does not have observations.
 */
export function useVectorObservationsQueries(
    vectorSpecifications: VectorSpec[] | null,
    allowEnable: boolean
): { isFetching: boolean; isError: boolean; ensembleVectorObservationsMap: EnsembleVectorObservationsMap } {
    const uniqueEnsembleIdents = [...new Set(vectorSpecifications?.map((item) => item.ensembleIdent) ?? [])];
    return useQueries({
        queries: (uniqueEnsembleIdents ?? []).map((item) => {
            return {
                queryKey: ["getObservations", item.getCaseUuid(), item.getEnsembleName()],
                queryFn: () =>
                    apiService.observations.getObservations(item.getCaseUuid() ?? "", item.getEnsembleName() ?? ""),
                staleTime: STALE_TIME,
                cacheTime: CACHE_TIME,
                enabled: !!(allowEnable && item.getCaseUuid() && item.getEnsembleName()),
            };
        }),
        combine: (results) => {
            const combinedResult: EnsembleVectorObservationsMap = new Map();
            if (!vectorSpecifications)
                return { isFetching: false, isError: false, ensembleVectorObservationsMap: combinedResult };

            results.forEach((result, index) => {
                const ensembleIdent = uniqueEnsembleIdents.at(index);
                if (!ensembleIdent) return;

                const ensembleVectorSpecifications = vectorSpecifications.filter(
                    (item) => item.ensembleIdent === ensembleIdent
                );

                const ensembleHasObservations = result.data?.summary.length !== 0;
                combinedResult.set(ensembleIdent, {
                    hasSummaryObservations: ensembleHasObservations,
                    vectorsObservationData: [],
                });
                for (const vectorSpec of ensembleVectorSpecifications) {
                    const vectorObservationsData =
                        result.data?.summary.find((elm) => elm.vector_name === vectorSpec.vectorName) ?? null;
                    if (!vectorObservationsData) continue;

                    combinedResult.get(ensembleIdent)?.vectorsObservationData.push({
                        vectorSpecification: vectorSpec,
                        data: vectorObservationsData,
                    });
                }
            });

            return {
                isFetching: results.some((result) => result.isFetching),
                isError: results.some((result) => result.isError),
                ensembleVectorObservationsMap: combinedResult,
            };
        },
    });
}
