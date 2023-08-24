import {
    Body_get_grid_parameter_api,
    Body_get_seismic_api,
    Body_get_surfaces_api,
    CubeIntersectionData_api,
    CuttingPlane_api,
    Seismic3DSurveyDirectory_api,
    Seismic4DSurveyDirectory_api,
    StaticSurfaceDirectory_api,
    SumoContent_api,
    SurfaceIntersectionData_api,
    WellBoreHeader_api,
    WellBorePicksAndStratUnits_api,
    WellBoreTrajectory_api,
} from "@api";
import { apiService } from "@framework/ApiService";
import { QueryFunction, QueryKey, UseQueryResult, useQuery } from "@tanstack/react-query";

import { SurfAddr } from "./SurfaceAddress";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export function useSurfaceDirectoryQuery(
    caseUuid: string | undefined,
    ensembleName: string | undefined,
    contentFilter?: SumoContent_api[]
): UseQueryResult<StaticSurfaceDirectory_api> {
    return useQuery({
        queryKey: ["getStaticSurfaceDirectory", caseUuid, ensembleName, contentFilter],
        queryFn: () => apiService.surface.getStaticSurfaceDirectory(caseUuid ?? "", ensembleName ?? "", contentFilter),
        staleTime: STALE_TIME,
        cacheTime: STALE_TIME,
        enabled: caseUuid && ensembleName ? true : false,
    });
}

export function useGetWellHeaders(caseUuid: string | undefined): UseQueryResult<WellBoreHeader_api[]> {
    return useQuery({
        queryKey: ["getWellHeaders", caseUuid],
        queryFn: () => apiService.well.getWellHeaders(caseUuid ?? ""),
        staleTime: STALE_TIME,
        cacheTime: STALE_TIME,
        enabled: caseUuid ? true : false,
    });
}

export function useGetWellTrajectories(wellUuids: string[] | undefined): UseQueryResult<WellBoreTrajectory_api[]> {
    return useQuery({
        queryKey: ["getWellTrajectories", wellUuids],
        queryFn: () => apiService.well.getWellTrajectories(wellUuids ?? []),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled: wellUuids ? true : false,
    });
}

export function useGetWellborePicksForWellbore(
    caseUuid: string | undefined,
    wellUuid: string | undefined
): UseQueryResult<WellBorePicksAndStratUnits_api> {
    return useQuery({
        queryKey: ["GetWellborePicksForWellbore", wellUuid],
        queryFn: () => apiService.well.getWellborePicksForWellbore(caseUuid ?? "", wellUuid ?? ""),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled: caseUuid && wellUuid ? true : false,
    });
}

export function useGetSeismic3DsurveyDirectory(
    caseUuid: string | undefined,
    ensembleUuid: string | undefined
): UseQueryResult<Seismic3DSurveyDirectory_api> {
    return useQuery({
        queryKey: ["GetSeismic3DsurveyDirectory", caseUuid, ensembleUuid],
        queryFn: () => apiService.seismic.getSeismic3DsurveyDirectory(caseUuid ?? "", ensembleUuid ?? ""),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled: caseUuid && ensembleUuid ? true : false,
    });
}
export function useGetSeismic4DsurveyDirectory(
    caseUuid: string | undefined,
    ensembleUuid: string | undefined
): UseQueryResult<Seismic4DSurveyDirectory_api> {
    return useQuery({
        queryKey: ["GetSeismic4DsurveyDirectory", caseUuid, ensembleUuid],
        queryFn: () => apiService.seismic.getSeismic4DsurveyDirectory(caseUuid ?? "", ensembleUuid ?? ""),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled: caseUuid && ensembleUuid ? true : false,
    });
}
export function useGridModelNames(
    caseUuid: string | undefined,
    ensembleName: string | undefined
): UseQueryResult<string[]> {
    return useQuery({
        queryKey: ["getGridModelNames", caseUuid, ensembleName],
        queryFn: () => apiService.grid.getGridModelNames(caseUuid ?? "", ensembleName ?? ""),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled: caseUuid && ensembleName ? true : false,
    });
}

export function useGridParameterNames(
    caseUuid: string | undefined,
    ensembleName: string | undefined,
    gridName: string | undefined
): UseQueryResult<string[]> {
    return useQuery({
        queryKey: ["getParameterNames", caseUuid, ensembleName, gridName],
        queryFn: () => apiService.grid.getParameterNames(caseUuid ?? "", ensembleName ?? "", gridName ?? ""),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled: caseUuid && ensembleName && gridName ? true : false,
    });
}

export function useSeismicIntersectionQuery(
    caseUuid: string | undefined,
    ensembleName: string | undefined,
    realizationNum: number | undefined,
    seismicCubeAttribute: string | undefined,
    seismicTimestampOrTimestep: string | undefined,
    observed: boolean | undefined,
    cuttingPlane: CuttingPlane_api | null,
    enabled: boolean
): UseQueryResult<CubeIntersectionData_api> {
    let bodyCuttingPlane: Body_get_seismic_api = cuttingPlane
        ? { cuttingPlane }
        : { cuttingPlane: { x_arr: [], y_arr: [], h_arr: [] } };

    return useQuery({
        queryKey: [
            "seismicIntersectionQuery",
            caseUuid,
            ensembleName,
            realizationNum,
            seismicCubeAttribute,
            seismicTimestampOrTimestep,
            observed,
            bodyCuttingPlane,
        ],
        queryFn: () =>
            apiService.intersection.getSeismic(
                caseUuid ?? "",
                ensembleName ?? "",
                realizationNum ?? 0,
                seismicCubeAttribute ?? "",
                seismicTimestampOrTimestep ?? "",
                observed ?? false,
                bodyCuttingPlane
            ),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled:
            caseUuid &&
            ensembleName &&
            realizationNum !== undefined &&
            seismicCubeAttribute &&
            seismicTimestampOrTimestep &&
            observed !== undefined &&
            enabled
                ? true
                : false,
    });
}
export function useGridParameterIntersectionQuery(
    caseUuid: string | undefined,
    ensembleUuid: string | undefined,
    gridName: string | undefined,
    parameterName: string | undefined,
    realizationNum: number | undefined,
    cuttingPlane: CuttingPlane_api | null,
    enabled: boolean
): UseQueryResult<CubeIntersectionData_api> {
    let bodyCuttingPlane: Body_get_grid_parameter_api = cuttingPlane
        ? { cuttingPlane }
        : { cuttingPlane: { x_arr: [], y_arr: [], h_arr: [] } };

    return useQuery({
        queryKey: [
            "gridParameterIntersectionQuery",
            caseUuid,
            ensembleUuid,
            gridName,
            parameterName,
            realizationNum,
            bodyCuttingPlane,
        ],
        queryFn: () =>
            apiService.intersection.getGridParameter(
                caseUuid ?? "",
                ensembleUuid ?? "",
                gridName ?? "",
                parameterName ?? "",
                realizationNum ?? 0,
                bodyCuttingPlane
            ),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled:
            caseUuid && ensembleUuid && gridName && parameterName && realizationNum !== undefined && enabled
                ? true
                : false,
    });
}
export function useSurfaceIntersectionsQuery(
    surfAddr: SurfAddr | null,
    cuttingPlane: CuttingPlane_api | null,
    enabled: boolean
): UseQueryResult<SurfaceIntersectionData_api[]> {
    function dummyApiCall(): Promise<SurfaceIntersectionData_api[]> {
        return new Promise((_resolve, reject) => {
            reject(null);
        });
    }

    if (!surfAddr || !cuttingPlane) {
        return useQuery({
            queryKey: ["surfaceIntersectionsQuery_DUMMY_ALWAYS_DISABLED"],
            queryFn: () => dummyApiCall,
            enabled: false,
        });
    }

    let queryFn: QueryFunction<SurfaceIntersectionData_api[]> | null = null;
    let queryKey: QueryKey | null = null;

    let bodyCuttingPlane: Body_get_surfaces_api = cuttingPlane
        ? { cuttingPlane }
        : { cuttingPlane: { x_arr: [], y_arr: [], h_arr: [] } };

    // Static, per realization surface
    if (surfAddr.addressType === "static") {
        queryKey = [
            "surfaceIntersectionsQuery",
            surfAddr.caseUuid,
            surfAddr.ensemble,
            surfAddr.realizationNum,
            surfAddr.names,
            surfAddr.attribute,
            cuttingPlane,
        ];
        queryFn = () =>
            apiService.intersection.getSurfaces(
                surfAddr.caseUuid,
                surfAddr.ensemble,
                surfAddr.realizationNum,
                surfAddr.names,
                surfAddr.attribute,
                bodyCuttingPlane
            );
    } else {
        throw new Error("Invalid surface address type");
    }

    return useQuery({
        queryKey: queryKey,
        queryFn: queryFn,
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled: enabled,
    });
}
