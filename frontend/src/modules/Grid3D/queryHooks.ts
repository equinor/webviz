import { apiService } from "@framework/ApiService";
import { UseQueryResult, useQuery } from "@tanstack/react-query";

import { GridSurface_trans, transformGridSurface } from "./queryDataTransforms";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export function useGridSurface(
    caseUuid: string | null,
    ensembleName: string | null,
    gridName: string | null,
    realization: string | null
): UseQueryResult<GridSurface_trans> {
    return useQuery({
        queryKey: ["getGridSurface", caseUuid, ensembleName, gridName, realization],
        queryFn: () =>
            apiService.grid.gridSurface(caseUuid ?? "", ensembleName ?? "", gridName ?? "", realization ?? ""),
        select: transformGridSurface,
        staleTime: STALE_TIME,
        gcTime: 0,
        enabled: caseUuid && ensembleName && gridName && realization ? true : false,
    });
}

export function useGridParameter(
    caseUuid: string | null,
    ensembleName: string | null,
    gridName: string | null,
    parameterName: string | null,
    realization: string | null,
    useStatistics: boolean
): UseQueryResult<number[]> {
    return useQuery({
        queryKey: ["getGridParameter", caseUuid, ensembleName, gridName, parameterName, realization],
        queryFn: () =>
            apiService.grid.gridParameter(
                caseUuid ?? "",
                ensembleName ?? "",
                gridName ?? "",
                parameterName ?? "",
                realization ?? ""
            ),
        staleTime: STALE_TIME,
        gcTime: 0,
        enabled: caseUuid && ensembleName && gridName && parameterName && realization && !useStatistics ? true : false,
    });
}

export function useStatisticalGridParameter(
    caseUuid: string | null,
    ensembleName: string | null,
    gridName: string | null,
    parameterName: string | null,
    realizations: string[] | null,
    useStatistics: boolean
): UseQueryResult<number[]> {
    return useQuery({
        queryKey: ["getStatisticalGridParameter", caseUuid, ensembleName, gridName, parameterName, realizations],
        queryFn: () =>
            apiService.grid.statisticalGridParameter(
                caseUuid ?? "",
                ensembleName ?? "",
                gridName ?? "",
                parameterName ?? "",
                realizations ?? []
            ),
        staleTime: STALE_TIME,
        gcTime: 0,
        enabled: caseUuid && ensembleName && gridName && parameterName && realizations && useStatistics ? true : false,
    });
}

export function useGridModelNames(caseUuid: string | null, ensembleName: string | null): UseQueryResult<string[]> {
    return useQuery({
        queryKey: ["getGridModelNames", caseUuid, ensembleName],
        queryFn: () => apiService.grid.getGridModelNames(caseUuid ?? "", ensembleName ?? ""),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: caseUuid && ensembleName ? true : false,
    });
}

export function useGridParameterNames(
    caseUuid: string | null,
    ensembleName: string | null,
    gridName: string | null
): UseQueryResult<string[]> {
    return useQuery({
        queryKey: ["getParameterNames", caseUuid, ensembleName, gridName],
        queryFn: () => apiService.grid.getParameterNames(caseUuid ?? "", ensembleName ?? "", gridName ?? ""),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: caseUuid && ensembleName && gridName ? true : false,
    });
}
