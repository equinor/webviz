import { Grid3dInfo_api } from "@api";
import { apiService } from "@framework/ApiService";
import { UseQueryResult, useQuery } from "@tanstack/react-query";

import { GridSurface_trans, transformGridSurface } from "./queryDataTransforms";
import { GridMappedProperty_trans, transformGridMappedProperty } from "./queryDataTransforms";
import { PolylineIntersection_trans, transformPolylineIntersection } from "./queryDataTransforms";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export function useGridSurface(
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
        staleTime: 0,
        gcTime: 0,
        enabled: caseUuid && ensembleName && gridName && realizationNum !== null ? true : false,
    });
}

export function useGridProperty(
    caseUuid: string | null,
    ensembleName: string | null,
    gridName: string | null,
    parameterName: string | null,
    realizationNum: number | null,
    singleKLayer: number,
    allowEnable: boolean
): UseQueryResult<GridMappedProperty_trans> {
    return useQuery({
        queryKey: ["useGridProperty", caseUuid, ensembleName, gridName, parameterName, realizationNum, singleKLayer],
        queryFn: () =>
            apiService.grid3D.gridParameter(
                caseUuid ?? "",
                ensembleName ?? "",
                gridName ?? "",
                parameterName ?? "",
                realizationNum ?? 0,
                singleKLayer
            ),
        select: transformGridMappedProperty,
        staleTime: 0,
        gcTime: 0,
        enabled: allowEnable && caseUuid && ensembleName && gridName && parameterName && realizationNum !== null ? true : false,
    });
}

export function useGridModelInfos(
    caseUuid: string | null,
    ensembleName: string | null,
    realizationNum: number | null
): UseQueryResult<Grid3dInfo_api[]> {
    return useQuery({
        queryKey: ["getGridModelNames", caseUuid, ensembleName],
        queryFn: () => apiService.grid3D.getGridModelsInfo(caseUuid ?? "", ensembleName ?? "", realizationNum ?? 0),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: caseUuid && ensembleName && realizationNum !== null ? true : false,
    });
}

export function useGridPolylineIntersection(
    caseUuid: string | null,
    ensembleName: string | null,
    gridName: string | null,
    parameterName: string | null,
    realizationNum: number | null,
    polylineXyz: number[]
): UseQueryResult<PolylineIntersection_trans> {
    return useQuery({
        queryKey: [
            "getGridPolylineIntersection",
            caseUuid,
            ensembleName,
            gridName,
            parameterName,
            realizationNum,
            polylineXyz,
        ],
        queryFn: () =>
            apiService.grid3D.postGetPolylineIntersection(
                caseUuid ?? "",
                ensembleName ?? "",
                gridName ?? "",
                parameterName ?? "",
                realizationNum ?? 0,
                { polyline_utm_xy: polylineXyz }
            ),
        select: transformPolylineIntersection,
        staleTime: 0,
        gcTime: 0,
        enabled: caseUuid && ensembleName && gridName && realizationNum !== null && polylineXyz.length ? true : false,
    });
}
