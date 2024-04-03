import { GridIntersectionVtk_api } from "@api";
import { apiService } from "@framework/ApiService";
import { UseQueryResult, useQuery } from "@tanstack/react-query";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export function useGridIntersection(
    caseUuid: string | null,
    ensembleName: string | null,
    gridName: string | null,
    parameterName: string | null,
    realization: string | null,
    useStatistics: boolean
): UseQueryResult<GridIntersectionVtk_api> {
    return useQuery({
        queryKey: ["gridParameterIntersection", caseUuid, ensembleName, gridName, parameterName, realization],
        queryFn: () =>
            apiService.grid3D.gridParameterIntersectionVtk(
                caseUuid ?? "",
                ensembleName ?? "",
                gridName ?? "",
                parameterName ?? "",
                realization ?? ""
            ),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: caseUuid && ensembleName && gridName && parameterName && realization && !useStatistics ? true : false,
    });
}
export function useStatisticalGridIntersection(
    caseUuid: string | null,
    ensembleName: string | null,
    gridName: string | null,
    parameterName: string | null,
    realizations: string[] | null,
    useStatistics: boolean
): UseQueryResult<GridIntersectionVtk_api> {
    return useQuery({
        queryKey: [
            "statisticalGridParameterIntersection",
            caseUuid,
            ensembleName,
            gridName,
            parameterName,
            realizations,
        ],
        queryFn: () =>
            apiService.grid3D.statisticalGridParameterIntersectionVtk(
                caseUuid ?? "",
                ensembleName ?? "",
                gridName ?? "",
                parameterName ?? "",
                realizations ?? []
            ),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: caseUuid && ensembleName && gridName && parameterName && realizations && useStatistics ? true : false,
    });
}

export function useGridModelNames(caseUuid: string | null, ensembleName: string | null): UseQueryResult<string[]> {
    return useQuery({
        queryKey: ["getGridModelNames", caseUuid, ensembleName],
        queryFn: () => apiService.grid3D.getGridModelNames(caseUuid ?? "", ensembleName ?? ""),
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
        queryFn: () => apiService.grid3D.getParameterNames(caseUuid ?? "", ensembleName ?? "", gridName ?? ""),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: caseUuid && ensembleName && gridName ? true : false,
    });
}
