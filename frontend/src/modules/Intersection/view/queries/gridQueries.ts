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
    singleKLayer: number = -1
): UseQueryResult<GridSurface_trans> {
    return useQuery({
        queryKey: ["getGridSurface", caseUuid, ensembleName, gridName, realizationNum, singleKLayer],
        queryFn: () =>
            apiService.grid3D.gridSurface(
                caseUuid ?? "",
                ensembleName ?? "",
                gridName ?? "",
                realizationNum ?? 0,
                singleKLayer
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
    singleKLayer: number = -1
): UseQueryResult<GridMappedProperty_trans> {
    return useQuery({
        queryKey: [
            "useGridParameter",
            caseUuid,
            ensembleName,
            gridName,
            parameterName,
            realizationNum,
            singleKLayer,
            parameterDateOrValue,
        ],
        queryFn: () =>
            apiService.grid3D.gridParameter(
                caseUuid ?? "",
                ensembleName ?? "",
                gridName ?? "",
                parameterName ?? "",
                realizationNum ?? 0,
                parameterDateOrValue,
                singleKLayer
            ),
        select: transformGridMappedProperty,
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: caseUuid && ensembleName && gridName && parameterName && realizationNum !== null ? true : false,
    });
}
