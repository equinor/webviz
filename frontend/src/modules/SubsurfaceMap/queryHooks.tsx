import {
    PolygonData_api,
    SurfaceData_api,
    SurfacePolygonDirectory_api,
    WellBoreHeader_api,
    WellBoreTrajectory_api,
} from "@api";
import { apiService } from "@framework/ApiService";
import { SurfaceAddress } from "@modules_shared/Surface";
import { SurfaceData_trans, transformSurfaceData } from "@modules_shared/Surface/queryDataTransforms";
import { QueryFunction, QueryKey, UseQueryResult, useQuery } from "@tanstack/react-query";

import { SurfacePolygonsAddress } from "./SurfacePolygonsAddress";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export type SurfaceGridSpec = {
    ncol: number;
    nrow: number;
    xinc: number;
    yinc: number;
    xori: number;
    yori: number;
    rotation: number;
};
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

export function usePropertySurfaceDataByQueryAddress(
    meshSurfSpec: SurfaceGridSpec | null,
    propertySurfAddr: SurfaceAddress | null
): UseQueryResult<SurfaceData_trans> {
    function dummyApiCall(): Promise<SurfaceData_trans> {
        return new Promise((_resolve, reject) => {
            reject(null);
        });
    }

    if (!propertySurfAddr || !meshSurfSpec) {
        return useQuery({
            queryKey: ["getSurfaceData_DUMMY_ALWAYS_DISABLED"],
            queryFn: () => dummyApiCall,
            enabled: false,
        });
    }

    let queryFn: QueryFunction<SurfaceData_api> | null = null;
    let queryKey: QueryKey | null = null;

    // Static, per realization surface
    if (propertySurfAddr.addressType === "realization") {
        queryKey = [
            "getResampledRealizationSurfaceData",
            meshSurfSpec.ncol,
            meshSurfSpec.nrow,
            meshSurfSpec.xinc,
            meshSurfSpec.yinc,
            meshSurfSpec.xori,
            meshSurfSpec.yori,
            meshSurfSpec.rotation,
            propertySurfAddr.realizationNum,
            propertySurfAddr.name,
            propertySurfAddr.attribute,
            propertySurfAddr.isoDateOrInterval,
        ];
        queryFn = () =>
            apiService.surface.getResampledRealizationSurfaceData(
                propertySurfAddr.caseUuid,
                propertySurfAddr.ensemble,
                meshSurfSpec.ncol,
                meshSurfSpec.nrow,
                meshSurfSpec.xinc,
                meshSurfSpec.yinc,
                meshSurfSpec.xori,
                meshSurfSpec.yori,
                meshSurfSpec.rotation,
                propertySurfAddr.realizationNum,
                propertySurfAddr.name,
                propertySurfAddr.attribute,
                propertySurfAddr.isoDateOrInterval
            );
    } else if (propertySurfAddr.addressType === "observation") {
        queryKey = [
            "getResampledObservedSurfaceData",
            meshSurfSpec.ncol,
            meshSurfSpec.nrow,
            meshSurfSpec.xinc,
            meshSurfSpec.yinc,
            meshSurfSpec.xori,
            meshSurfSpec.yori,
            meshSurfSpec.rotation,
            propertySurfAddr.name,
            propertySurfAddr.attribute,
            propertySurfAddr.isoDateOrInterval,
        ];
        queryFn = () =>
            apiService.surface.getResampledObservedSurfaceData(
                propertySurfAddr.caseUuid,
                propertySurfAddr.ensemble,
                meshSurfSpec.ncol,
                meshSurfSpec.nrow,
                meshSurfSpec.xinc,
                meshSurfSpec.yinc,
                meshSurfSpec.xori,
                meshSurfSpec.yori,
                meshSurfSpec.rotation,
                propertySurfAddr.name,
                propertySurfAddr.attribute,
                propertySurfAddr.isoDateOrInterval
            );
    } else if (propertySurfAddr.addressType === "statistical") {
        queryKey = [
            "getResampledStatisticalSurfaceData",
            propertySurfAddr.caseUuid,
            propertySurfAddr.ensemble,
            propertySurfAddr.statisticFunction,
            meshSurfSpec.ncol,
            meshSurfSpec.nrow,
            meshSurfSpec.xinc,
            meshSurfSpec.yinc,
            meshSurfSpec.xori,
            meshSurfSpec.yori,
            meshSurfSpec.rotation,

            propertySurfAddr.name,
            propertySurfAddr.attribute,
            propertySurfAddr.isoDateOrInterval,
        ];
        queryFn = () =>
            apiService.surface.getResampledStatisticalSurfaceData(
                propertySurfAddr.caseUuid,
                propertySurfAddr.ensemble,
                propertySurfAddr.statisticFunction,
                meshSurfSpec.ncol,
                meshSurfSpec.nrow,
                meshSurfSpec.xinc,
                meshSurfSpec.yinc,
                meshSurfSpec.xori,
                meshSurfSpec.yori,
                meshSurfSpec.rotation,
                propertySurfAddr.name,
                propertySurfAddr.attribute,
                propertySurfAddr.isoDateOrInterval
            );
    } else {
        throw new Error("Invalid surface address type");
    }

    return useQuery({
        queryKey: queryKey,
        queryFn: queryFn,
        select: transformSurfaceData,
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
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
