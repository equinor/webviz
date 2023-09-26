import {
    PolygonData_api,
    StaticSurfaceDirectory_api,
    SumoContent_api,
    SurfaceData_api,
    SurfacePolygonDirectory_api,
    WellBoreHeader_api,
    WellBoreTrajectory_api,
} from "@api";
import { apiService } from "@framework/ApiService";
import { QueryFunction, QueryKey, UseQueryResult, useQuery } from "@tanstack/react-query";

import { SurfAddr } from "./SurfaceAddress";
import { SurfacePolygonsAddress } from "./SurfacePolygonsAddress";

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

export function usePolygonDirectoryQuery(
    caseUuid: string | undefined,
    ensembleName: string | undefined
): UseQueryResult<SurfacePolygonDirectory_api> {
    return useQuery({
        queryKey: ["getSurfacePolygonsDirectory", caseUuid, ensembleName],
        queryFn: () => apiService.surfacePolygons.getSurfacePolygonsDirectory(caseUuid ?? "", ensembleName ?? ""),
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
export function useGetFieldWellsTrajectories(caseUuid: string | undefined): UseQueryResult<WellBoreTrajectory_api[]> {
    return useQuery({
        queryKey: ["getFieldWellsTrajectories", caseUuid],
        queryFn: () => apiService.well.getFieldWellTrajectories(caseUuid ?? ""),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled: caseUuid ? true : false,
    });
}

export function useSurfaceDataQueryByAddress(
    surfAddr: SurfAddr | null,
    enabled: boolean
): UseQueryResult<SurfaceData_api> {
    function dummyApiCall(): Promise<SurfaceData_api> {
        return new Promise((_resolve, reject) => {
            reject(null);
        });
    }

    if (!surfAddr) {
        return useQuery({
            queryKey: ["getSurfaceData_DUMMY_ALWAYS_DISABLED"],
            queryFn: () => dummyApiCall,
            enabled: false,
        });
    }

    let queryFn: QueryFunction<SurfaceData_api> | null = null;
    let queryKey: QueryKey | null = null;

    // Static, per realization surface
    if (surfAddr.addressType === "static") {
        queryKey = [
            "getStaticSurfaceData",
            surfAddr.caseUuid,
            surfAddr.ensemble,
            surfAddr.realizationNum,
            surfAddr.name,
            surfAddr.attribute,
        ];
        queryFn = () =>
            apiService.surface.getStaticSurfaceData(
                surfAddr.caseUuid,
                surfAddr.ensemble,
                surfAddr.realizationNum,
                surfAddr.name,
                surfAddr.attribute
            );
    }

    // Static, statistical surface
    else if (surfAddr.addressType === "statistical-static") {
        queryKey = [
            "getStatisticalStaticSurfaceData",
            surfAddr.caseUuid,
            surfAddr.ensemble,
            surfAddr.statisticFunction,
            surfAddr.name,
            surfAddr.attribute,
        ];
        queryFn = () =>
            apiService.surface.getStatisticalStaticSurfaceData(
                surfAddr.caseUuid,
                surfAddr.ensemble,
                surfAddr.statisticFunction,
                surfAddr.name,
                surfAddr.attribute
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
export function usePropertySurfaceDataByQueryAddress(
    meshSurfAddr: SurfAddr | null,
    propertySurfAddr: SurfAddr | null,
    enabled: boolean
): UseQueryResult<SurfaceData_api> {
    function dummyApiCall(): Promise<SurfaceData_api> {
        return new Promise((_resolve, reject) => {
            reject(null);
        });
    }

    if (!propertySurfAddr || !meshSurfAddr) {
        return useQuery({
            queryKey: ["getSurfaceData_DUMMY_ALWAYS_DISABLED"],
            queryFn: () => dummyApiCall,
            enabled: false,
        });
    }

    let queryFn: QueryFunction<SurfaceData_api> | null = null;
    let queryKey: QueryKey | null = null;

    // Static, per realization surface
    if (meshSurfAddr.addressType === "static" && propertySurfAddr.addressType === "static") {
        queryKey = [
            "getPropertySurfaceResampledToStaticSurface",
            meshSurfAddr.caseUuid,
            meshSurfAddr.ensemble,
            meshSurfAddr.realizationNum,
            meshSurfAddr.name,
            meshSurfAddr.attribute,
            propertySurfAddr.realizationNum,
            propertySurfAddr.name,
            propertySurfAddr.attribute,
        ];
        queryFn = () =>
            apiService.surface.getPropertySurfaceResampledToStaticSurface(
                meshSurfAddr.caseUuid,
                meshSurfAddr.ensemble,
                meshSurfAddr.realizationNum,
                meshSurfAddr.name,
                meshSurfAddr.attribute,
                propertySurfAddr.realizationNum,
                propertySurfAddr.name,
                propertySurfAddr.attribute
            );
    } else if (
        meshSurfAddr.addressType === "statistical-static" &&
        propertySurfAddr.addressType === "statistical-static"
    ) {
        queryKey = [
            "getPropertySurfaceResampledToStaticSurface",
            meshSurfAddr.caseUuid,
            meshSurfAddr.ensemble,
            meshSurfAddr.statisticFunction,
            meshSurfAddr.name,
            meshSurfAddr.attribute,
            // propertySurfAddr.statisticFunction,
            propertySurfAddr.name,
            propertySurfAddr.attribute,
        ];
        queryFn = () =>
            apiService.surface.getPropertySurfaceResampledToStatisticalStaticSurface(
                meshSurfAddr.caseUuid,
                meshSurfAddr.ensemble,
                meshSurfAddr.statisticFunction,
                meshSurfAddr.name,
                meshSurfAddr.attribute,
                // propertySurfAddr.statisticFunction,
                propertySurfAddr.name,
                propertySurfAddr.attribute
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
export function usePolygonsDataQueryByAddress(
    polygonAddr: SurfacePolygonsAddress | null
): UseQueryResult<PolygonData_api[]> {
    function dummyApiCall(): Promise<PolygonData_api[]> {
        return new Promise((_resolve, reject) => {
            reject(null);
        });
    }

    if (!polygonAddr) {
        return useQuery({
            queryKey: ["getSurfacePolygonData_DUMMY_ALWAYS_DISABLED"],
            queryFn: () => dummyApiCall,
            enabled: false,
        });
    }

    return useQuery({
        queryKey: [
            "getSurfacePolygonsData",
            polygonAddr.caseUuid,
            polygonAddr.ensemble,
            polygonAddr.realizationNum,
            polygonAddr.name,
            polygonAddr.attribute,
        ],
        queryFn: () =>
            apiService.surfacePolygons.getSurfacePolygonsData(
                polygonAddr.caseUuid,
                polygonAddr.ensemble,
                polygonAddr.realizationNum,
                polygonAddr.name,
                polygonAddr.attribute
            ),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
    });
}
