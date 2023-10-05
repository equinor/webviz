import {
    Body_get_surface_intersections_api,
    CuttingPlane_api,
    SurfaceIntersectionData_api,
    WellBoreHeader_api,
    WellBoreTrajectory_api,
} from "@api";
import { apiService } from "@framework/ApiService";
import { SurfaceAddress } from "@modules/_shared/Surface";
import { QueryFunction, QueryKey, UseQueryResult, useQuery } from "@tanstack/react-query";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

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

export function useSurfaceIntersectionsQuery(
    surfaceAddress: SurfaceAddress | null,
    cuttingPlane: CuttingPlane_api | null,
    enabled: boolean
): UseQueryResult<SurfaceIntersectionData_api[]> {
    function dummyApiCall(): Promise<SurfaceIntersectionData_api[]> {
        return new Promise((_resolve, reject) => {
            reject(null);
        });
    }

    if (!surfaceAddress || !cuttingPlane) {
        return useQuery({
            queryKey: ["surfaceIntersectionsQuery_DUMMY_ALWAYS_DISABLED"],
            queryFn: () => dummyApiCall,
            enabled: false,
        });
    }
    console.log(surfaceAddress);
    console.log(cuttingPlane);
    let queryFn: QueryFunction<SurfaceIntersectionData_api[]> | null = null;
    let queryKey: QueryKey | null = null;

    let bodyCuttingPlane: Body_get_surface_intersections_api = cuttingPlane
        ? { cutting_plane: cuttingPlane }
        : { cutting_plane: { x_arr: [], y_arr: [], length_arr: [] } };

    // Static, per realization surface
    if (surfaceAddress.addressType === "realization") {
        queryKey = [
            "surfaceIntersectionsQuery",
            surfaceAddress.caseUuid,
            surfaceAddress.ensemble,
            surfaceAddress.name,
            surfaceAddress.attribute,
            bodyCuttingPlane,
        ];
        queryFn = () =>
            apiService.surface.getSurfaceIntersections(
                surfaceAddress.caseUuid,
                surfaceAddress.ensemble,
                surfaceAddress.name,
                surfaceAddress.attribute,
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
