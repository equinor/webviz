import { StaticSurfaceDirectory_api, SumoContent_api, SurfaceData_api } from "@api";
import { apiService } from "@framework/ApiService";
import { QueryFunction, QueryKey, UseQueryResult, useQuery } from "@tanstack/react-query";

import { SurfAddr } from "./SurfAddr";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export function useSurfaceDirectory(
    caseUuid: string | undefined,
    ensembleName: string | undefined,
    contentFilter: SumoContent_api[]
): UseQueryResult<StaticSurfaceDirectory_api> {
    return useQuery({
        queryKey: ["getStaticSurfaceDirectory", caseUuid, ensembleName],
        queryFn: () => apiService.surface.getStaticSurfaceDirectory(caseUuid ?? "", ensembleName ?? "", contentFilter),
        staleTime: STALE_TIME,
        cacheTime: STALE_TIME,
        enabled: caseUuid && ensembleName && contentFilter ? true : false,
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
    });
}
