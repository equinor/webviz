import { UseQueryResult, useQuery } from "@tanstack/react-query";

import { EnsembleParameterDescription, EnsembleParameter } from "@api";
import { apiService } from "@framework/ApiService";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export function useParameterNamesQuery(
    caseUuid: string | null,
    ensembleName: string | null,
    excludeAllValuesConstant: boolean,
): UseQueryResult<Array<EnsembleParameterDescription>> {
    return useQuery({
        queryKey: ["getParameterNamesAndDescription", caseUuid, ensembleName, excludeAllValuesConstant],
        queryFn: () => apiService.parameters.getParameterNamesAndDescription(caseUuid ?? "", ensembleName ?? "", excludeAllValuesConstant ?? true),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled: caseUuid && ensembleName && excludeAllValuesConstant ? true : false,
    });
}

export function useParameterQuery(
    caseUuid: string | null,
    ensembleName: string | null,
    parameterName: string | null
): UseQueryResult<EnsembleParameter> {
    return useQuery({
        queryKey: ["getParameter", caseUuid, ensembleName, parameterName],
        queryFn: () => apiService.parameters.getParameter(caseUuid ?? "", ensembleName ?? "", parameterName ?? ""),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled: caseUuid && ensembleName && parameterName ? true : false,
    });
}