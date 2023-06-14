import { GridSurface_api, GridIntersection_api } from "@api";
import { apiService } from "@framework/ApiService";
import { QueryFunction, QueryKey, UseQueryResult, useQuery } from "@tanstack/react-query";


const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;




export function useGridIntersection(caseUuid: string | null, ensembleName: string | null, gridName: string | null, parameterName: string | null, realization: string | null, useStatistics: boolean): UseQueryResult<GridIntersection_api> {
    return useQuery({
        queryKey: ["gridParameterIntersection", caseUuid, ensembleName, gridName, parameterName, realization],
        queryFn: () => apiService.grid.gridParameterIntersection(caseUuid ?? "", ensembleName ?? "", gridName ?? "", parameterName ?? "", realization ?? ""),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled: caseUuid && ensembleName && gridName && parameterName && realization && !useStatistics ? true : false,
    });
}
export function useStatisticalGridIntersection(caseUuid: string | null, ensembleName: string | null, gridName: string | null, parameterName: string | null, realizations: string[] | null, useStatistics: boolean): UseQueryResult<GridIntersection_api> {
    return useQuery({
        queryKey: ["statisticalGridParameterIntersection", caseUuid, ensembleName, gridName, parameterName, realizations],
        queryFn: () => apiService.grid.statisticalGridParameterIntersection(caseUuid ?? "", ensembleName ?? "", gridName ?? "", parameterName ?? "", realizations ?? []),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
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
