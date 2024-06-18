import { apiService } from "@framework/ApiService";
import { UseQueryResult, useQuery } from "@tanstack/react-query";

import {
    GridMappedProperty_trans,
    GridSurface_trans,
    transformGridMappedProperty,
    transformGridSurface,
} from "./queryDataTransforms";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export function useGridSurfaceQuery(
    caseUuid: string | null,
    ensembleName: string | null,
    gridName: string | null,
    realizationNum: number | null,
    i_min?: number,
    i_max?: number,
    j_min?: number,
    j_max?: number,
    k_min?: number,
    k_max?: number
): UseQueryResult<GridSurface_trans> {
    return useQuery({
        queryKey: [
            "getGridSurface",
            caseUuid,
            ensembleName,
            gridName,
            realizationNum,
            i_min,
            i_max,
            j_min,
            j_max,
            k_min,
            k_max,
        ],
        queryFn: () =>
            apiService.grid3D.gridSurface(
                caseUuid ?? "",
                ensembleName ?? "",
                gridName ?? "",
                realizationNum ?? 0,
                i_min,
                i_max,
                j_min,
                j_max,
                k_min,
                k_max
            ),
        select: transformGridSurface,
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: caseUuid && ensembleName && gridName && realizationNum !== null ? true : false,
    });
}

export function useGridParameterQuery(
    caseUuid: string | null,
    ensembleName: string | null,
    gridName: string | null,
    parameterName: string | null,
    parameterDateOrValue: string | null,
    realizationNum: number | null,
    i_min?: number,
    i_max?: number,
    j_min?: number,
    j_max?: number,
    k_min?: number,
    k_max?: number
): UseQueryResult<GridMappedProperty_trans> {
    return useQuery({
        queryKey: [
            "useGridParameter",
            caseUuid,
            ensembleName,
            gridName,
            parameterName,
            realizationNum,
            parameterDateOrValue,
            i_min,
            i_max,
            j_min,
            j_max,
            k_min,
            k_max,
        ],
        queryFn: () =>
            apiService.grid3D.gridParameter(
                caseUuid ?? "",
                ensembleName ?? "",
                gridName ?? "",
                parameterName ?? "",
                realizationNum ?? 0,
                parameterDateOrValue,
                i_min,
                i_max,
                j_min,
                j_max,
                k_min,
                k_max
            ),
        select: transformGridMappedProperty,
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: caseUuid && ensembleName && gridName && parameterName && realizationNum !== null ? true : false,
    });
}
