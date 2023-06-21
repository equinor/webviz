import { Frequency_api, VectorDescription_api } from "@api";
import { VectorRealizationData_api, EnsembleParameterDescription_api, EnsembleScalarResponse_api, EnsembleParameter_api } from "@api";
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

export function useTimeStepsQuery(
    caseUuid: string | undefined,
    ensembleName: string | undefined
): UseQueryResult<Array<string>> {
    return useQuery({
        queryKey: ["getTimesteps", caseUuid, ensembleName],
        queryFn: () => apiService.timeseries.getTimesteps(caseUuid ?? "", ensembleName ?? ""),
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

export function useGetParameterNamesQuery(
    caseUuid: string | undefined,
    ensembleName: string | undefined,

): UseQueryResult<EnsembleParameterDescription_api[]> {
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


export function useParameterQuery(
    caseUuid: string | undefined,
    ensembleName: string | undefined,
    parameterName: string | undefined,


): UseQueryResult<EnsembleParameter_api> {
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


): UseQueryResult<EnsembleScalarResponse_api> {
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