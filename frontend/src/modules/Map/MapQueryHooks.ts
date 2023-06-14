import { DynamicSurfaceDirectory_api, StaticSurfaceDirectory_api, SurfaceData_api } from "@api";
import { apiService } from "@framework/ApiService";
import { QueryFunction, QueryKey, UseQueryResult, useQuery } from "@tanstack/react-query";

import { SurfAddr } from "./SurfAddr";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export function useDynamicSurfaceDirectoryQuery(
    caseUuid: string | undefined,
    ensembleName: string | undefined,
    allowEnable: boolean
): UseQueryResult<DynamicSurfaceDirectory_api> {
    return useQuery({
        queryKey: ["getDynamicSurfaceDirectory", caseUuid, ensembleName],
        queryFn: () => apiService.surface.getDynamicSurfaceDirectory(caseUuid ?? "", ensembleName ?? ""),
        staleTime: STALE_TIME,
        cacheTime: STALE_TIME,
        enabled: allowEnable && caseUuid && ensembleName ? true : false,
    });
}

export function useStaticSurfaceDirectoryQuery(
    caseUuid: string | undefined,
    ensembleName: string | undefined,
    allowEnable: boolean
): UseQueryResult<StaticSurfaceDirectory_api> {
    return useQuery({
        queryKey: ["getStaticSurfaceDirectory", caseUuid, ensembleName],
        queryFn: () => apiService.surface.getStaticSurfaceDirectory(caseUuid ?? "", ensembleName ?? ""),
        staleTime: STALE_TIME,
        cacheTime: STALE_TIME,
        enabled: allowEnable && caseUuid && ensembleName ? true : false,
    });
}

export function useSurfaceDataQueryByAddress(surfAddr: SurfAddr | null): UseQueryResult<SurfaceData_api> {
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

    // Dynamic, per realization surface
    if (surfAddr.addressType === "dynamic") {
        queryKey = [
            "getDynamicSurfaceData",
            surfAddr.caseUuid,
            surfAddr.ensemble,
            surfAddr.realizationNum,
            surfAddr.name,
            surfAddr.attribute,
            surfAddr.timeOrInterval,
        ];
        queryFn = () =>
            apiService.surface.getDynamicSurfaceData(
                surfAddr.caseUuid,
                surfAddr.ensemble,
                surfAddr.realizationNum,
                surfAddr.name,
                surfAddr.attribute,
                surfAddr.timeOrInterval
            );
    }

    // Dynamic, statistical surface
    else if (surfAddr.addressType === "statistical-dynamic") {
        queryKey = [
            "getStatisticalDynamicSurfaceData",
            surfAddr.caseUuid,
            surfAddr.ensemble,
            surfAddr.statisticFunction,
            surfAddr.name,
            surfAddr.attribute,
            surfAddr.timeOrInterval,
        ];
        queryFn = () =>
            apiService.surface.getStatisticalDynamicSurfaceData(
                surfAddr.caseUuid,
                surfAddr.ensemble,
                surfAddr.statisticFunction,
                surfAddr.name,
                surfAddr.attribute,
                surfAddr.timeOrInterval
            );
    }

    // Static, per realization surface
    else if (surfAddr.addressType === "static") {
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
    });
}
