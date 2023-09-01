import { EnsembleScalarResponse_api, VectorDescription_api } from "@api";
import { EnsembleParameterDescription_api, EnsembleParameter_api } from "@api";
import { apiService } from "@framework/ApiService";
import { UseQueryResult, useQuery } from "@tanstack/react-query";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export function useVectorsQuery(
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

export function useTimestampsListQuery(
    caseUuid: string | undefined,
    ensembleName: string | undefined
): UseQueryResult<Array<number>> {
    return useQuery({
        queryKey: ["getTimestampsList", caseUuid, ensembleName],
        queryFn: () => apiService.timeseries.getTimestampsList(caseUuid ?? "", ensembleName ?? ""),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled: caseUuid && ensembleName ? true : false,
    });
}

export function useGetParameterNamesQuery(
    caseUuid: string | undefined,
    ensembleName: string | undefined
): UseQueryResult<EnsembleParameterDescription_api[]> {
    return useQuery({
        queryKey: ["getParameterNamesAndDescription", caseUuid, ensembleName],
        queryFn: () => apiService.parameters.getParameterNamesAndDescription(caseUuid ?? "", ensembleName ?? ""),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled: caseUuid && ensembleName ? true : false,
    });
}

export function useParameterQuery(
    caseUuid: string | undefined,
    ensembleName: string | undefined,
    parameterName: string | undefined
): UseQueryResult<EnsembleParameter_api> {
    return useQuery({
        queryKey: ["getParameter", caseUuid, ensembleName, parameterName],
        queryFn: () => apiService.parameters.getParameter(caseUuid ?? "", ensembleName ?? "", parameterName ?? ""),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled: caseUuid && ensembleName && parameterName ? true : false,
    });
}
export function useVectorAtTimestampQuery(
    caseUuid: string | undefined,
    ensembleName: string | undefined,
    vectorName: string | undefined,
    timestampUtcMs: number | null
): UseQueryResult<EnsembleScalarResponse_api> {
    return useQuery({
        queryKey: ["getRealizationVectorAtTimestep", caseUuid, ensembleName, vectorName, timestampUtcMs],
        queryFn: () =>
            apiService.timeseries.getRealizationVectorAtTimestamp(
                caseUuid ?? "",
                ensembleName ?? "",
                vectorName ?? "",
                timestampUtcMs ?? 0
            ),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled: !!(caseUuid && ensembleName && vectorName && timestampUtcMs != null),
    });
}
