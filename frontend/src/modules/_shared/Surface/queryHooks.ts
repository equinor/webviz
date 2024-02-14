import {
    Body_post_get_resampled_surface_data_api,
    ObservationSurfaceAddress_api,
    RealizationSurfaceAddress_api,
    StatisticalSurfaceAddress_api,
    SurfaceData_api,
    SurfaceGridDefinition_api,
    SurfaceMeta_api,
} from "@api";
import { apiService } from "@framework/ApiService";
import { QueryFunction, QueryKey, UseQueryResult, useQuery } from "@tanstack/react-query";

import { SurfaceData_trans, transformSurfaceData } from "./queryDataTransforms";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export function useSurfaceDirectoryQuery(
    caseUuid: string | undefined,
    ensembleName: string | undefined
): UseQueryResult<SurfaceMeta_api[]> {
    return useQuery({
        queryKey: ["getSurfaceDirectory", caseUuid, ensembleName],
        queryFn: () => apiService.surface.getSurfaceDirectory(caseUuid ?? "", ensembleName ?? ""),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: caseUuid && ensembleName ? true : false,
    });
}

export function useSurfaceDataQueryByAddress(
    surfAddr: (RealizationSurfaceAddress_api | StatisticalSurfaceAddress_api | ObservationSurfaceAddress_api) | null
): UseQueryResult<SurfaceData_trans> {
    function dummyApiCall(): Promise<SurfaceData_api> {
        return new Promise((_resolve, reject) => {
            reject(null);
        });
    }

    let queryFn: QueryFunction<SurfaceData_api> | null = null;
    let queryKey: QueryKey | null = null;

    if (surfAddr === null) {
        queryKey = ["getSurfaceData_DUMMY_ALWAYS_DISABLED"];
        queryFn = dummyApiCall;
    } else {
        queryKey = ["getSurfaceData", surfAddr];
        queryFn = () => apiService.surface.postGetSurfaceData(surfAddr);
    }

    return useQuery({
        queryKey: queryKey,
        queryFn: queryFn,
        select: transformSurfaceData,
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: Boolean(surfAddr),
    });
}

export function useResampledSurfaceDataQueryByAddress(
    surfAddr: (RealizationSurfaceAddress_api | StatisticalSurfaceAddress_api | ObservationSurfaceAddress_api) | null,
    gridDef: SurfaceGridDefinition_api | null
): UseQueryResult<SurfaceData_trans> {
    function dummyApiCall(): Promise<SurfaceData_api> {
        return new Promise((_resolve, reject) => {
            reject(null);
        });
    }

    let queryFn: QueryFunction<SurfaceData_api> | null = null;
    let queryKey: QueryKey | null = null;

    if (surfAddr === null || gridDef === null) {
        queryKey = ["getResampledSurfaceData_DUMMY_ALWAYS_DISABLED"];
        queryFn = dummyApiCall;
    } else {
        queryKey = ["getResampledSurfaceData", surfAddr];
        const body: Body_post_get_resampled_surface_data_api = {
            surface_address: surfAddr,
            grid_definition: gridDef,
        };
        queryFn = () => apiService.surface.postGetResampledSurfaceData(body);
    }

    return useQuery({
        queryKey: queryKey,
        queryFn: queryFn,
        select: transformSurfaceData,
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: Boolean(surfAddr),
    });
}
