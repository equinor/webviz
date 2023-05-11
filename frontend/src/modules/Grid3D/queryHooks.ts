import { GridGeometry } from "@api";
import { apiService } from "@framework/ApiService";
import { QueryFunction, QueryKey, UseQueryResult, useQuery } from "@tanstack/react-query";


const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export function useGridGeometry(caseUuid: string | null, ensembleName: string | null, gridName: string | null, realization: string | null): UseQueryResult<GridGeometry> {
    return useQuery({
        queryKey: ["getGridGeometry", caseUuid, ensembleName, gridName, realization],
        queryFn: () => apiService.grid.gridGeometry(caseUuid ?? "", ensembleName ?? "", gridName ?? "", realization ?? ""),
        staleTime: STALE_TIME,
        cacheTime: 0,
        enabled: caseUuid && ensembleName && gridName && realization ? true : false,
    });
}

export function useGridParameter(caseUuid: string | null, ensembleName: string | null, gridName: string | null, parameterName: string | null, realization: string | null, useStatistics: boolean): UseQueryResult<number[]> {
    return useQuery({
        queryKey: ["getGridParameter", caseUuid, ensembleName, gridName, parameterName, realization],
        queryFn: () => apiService.grid.gridParameter(caseUuid ?? "", ensembleName ?? "", gridName ?? "", parameterName ?? "", realization ?? ""),
        staleTime: STALE_TIME,
        cacheTime: 0,
        enabled: caseUuid && ensembleName && gridName && parameterName && realization && !useStatistics ? true : false,
    });
}


export function useStatisticalGridParameter(caseUuid: string | null, ensembleName: string | null, gridName: string | null, parameterName: string | null, realizations: string[] | null, useStatistics: boolean): UseQueryResult<number[]> {
    return useQuery({
        queryKey: ["getStatisticalGridParameter", caseUuid, ensembleName, gridName, parameterName, realizations],
        queryFn: () => apiService.grid.statisticalGridParameter(caseUuid ?? "", ensembleName ?? "", gridName ?? "", parameterName ?? "", realizations ?? []),
        staleTime: STALE_TIME,
        cacheTime: 0,
        enabled: caseUuid && ensembleName && gridName && parameterName && realizations && useStatistics ? true : false,
    });
}


export function useGridModelNames(caseUuid: string | null, ensembleName: string | null): UseQueryResult<string[]> {
    return useQuery({
        queryKey: ["getGridModelNames", caseUuid, ensembleName],
        queryFn: () => apiService.grid.getGridModelNames(caseUuid ?? "", ensembleName ?? ""),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled: caseUuid && ensembleName ? true : false,
    });
}

export function useGridParameterNames(caseUuid: string | null, ensembleName: string | null, gridName: string | null): UseQueryResult<string[]> {
    return useQuery({
        queryKey: ["getParameterNames", caseUuid, ensembleName, gridName],
        queryFn: () => apiService.grid.getParameterNames(caseUuid ?? "", ensembleName ?? "", gridName ?? ""),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled: caseUuid && ensembleName && gridName ? true : false,
    });
}

export function useRealizations(caseUuid: string | null, ensembleName: string | null): UseQueryResult<number[]> {
    return useQuery({
        queryKey: ["getRealizations", caseUuid, ensembleName],
        queryFn: () => apiService.explore.getRealizations(caseUuid ?? "", ensembleName ?? ""),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled: caseUuid && ensembleName ? true : false,
    });
}
