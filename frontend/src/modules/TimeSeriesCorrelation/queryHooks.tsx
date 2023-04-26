import { Frequency, VectorDescription } from "@api";
import { VectorRealizationData, EnsembleCorrelations, EnsembleParameter, EnsembleScalarResponse, EnsembleParameterDescription } from "@api";
import { apiService } from "@framework/ApiService";
import { UseQueryResult, useQuery } from "@tanstack/react-query";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export function useVectorsQuery(
    caseUuid: string | undefined,
    ensembleName: string | undefined
): UseQueryResult<Array<VectorDescription>> {
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

export function useCorrelationsQuery(
    caseUuid: string | undefined,
    ensembleName: string | undefined,
    vectorName: string | undefined,
    timeStep: string | null,

): UseQueryResult<EnsembleCorrelations> {
    return useQuery({
        queryKey: [
            "correlateParametersWithTimeseries",
            caseUuid,
            ensembleName,
            vectorName,
            timeStep,

        ],
        queryFn: () =>
            apiService.correlations.correlateParametersWithTimeseries(
                caseUuid ?? "",
                ensembleName ?? "",
                vectorName ?? "",
                timeStep ?? "2018-02-05T00:00:00",
            ),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled: caseUuid && ensembleName && vectorName && timeStep ? true : false,
    });
}

export function useParameterQuery(
    caseUuid: string | undefined,
    ensembleName: string | undefined,
    parameterName: string | undefined,


): UseQueryResult<EnsembleParameter> {
    return useQuery({
        queryKey: [
            "getParameter",
            caseUuid,
            ensembleName,
            parameterName,


        ],
        queryFn: () =>
            apiService.parameters.getParameter(
                caseUuid ?? "",
                ensembleName ?? "",
                parameterName ?? "",
            ),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled: caseUuid && ensembleName && parameterName ? true : false,
    });
}

export function useVectorAtTimestepQuery(
    caseUuid: string | undefined,
    ensembleName: string | undefined,
    vectorName: string | undefined,
    timeStep: string | null


): UseQueryResult<EnsembleScalarResponse> {
    return useQuery({
        queryKey: [
            "getRealizationVectorAtTimestep",
            caseUuid,
            ensembleName,
            vectorName,
            timeStep


        ],
        queryFn: () =>
            apiService.timeseries.getRealizationVectorAtTimestep(
                caseUuid ?? "",
                ensembleName ?? "",
                vectorName ?? "",
                timeStep ?? ""
            ),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled: caseUuid && ensembleName && vectorName && timeStep ? true : false,
    });
}

export function useGetParameterNamesQuery(
    caseUuid: string | undefined,
    ensembleName: string | undefined,

): UseQueryResult<EnsembleParameterDescription[]> {
    return useQuery({
        queryKey: [
            "getParameterNamesAndDescription",
            caseUuid,
            ensembleName,
        ],
        queryFn: () =>
            apiService.parameters.getParameterNamesAndDescription(
                caseUuid ?? "",
                ensembleName ?? "",
            ),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled: caseUuid && ensembleName ? true : false,
    });
}