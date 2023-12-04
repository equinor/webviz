import { SurfaceData_api } from "@api";
import { apiService } from "@framework/ApiService";
import { SurfaceAddress } from "@modules_shared/Surface";
import { SurfaceData_trans, transformSurfaceData } from "@modules_shared/Surface/queryDataTransforms";
import { QueryFunction, QueryKey, UseQueryResult, useQuery } from "@tanstack/react-query";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export function usePropertySurfaceDataByQueryAddress(
    meshSurfAddr: SurfaceAddress | null,
    propertySurfAddr: SurfaceAddress | null,
    enabled: boolean
): UseQueryResult<SurfaceData_trans> {
    function dummyApiCall(): Promise<SurfaceData_trans> {
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
    if (meshSurfAddr.addressType === "realization" && propertySurfAddr.addressType === "realization") {
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
            propertySurfAddr.isoDateOrInterval,
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
                propertySurfAddr.attribute,
                propertySurfAddr.isoDateOrInterval
            );
    } else if (meshSurfAddr.addressType === "statistical" && propertySurfAddr.addressType === "statistical") {
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
            propertySurfAddr.isoDateOrInterval,
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
        gcTime: CACHE_TIME,
        enabled: enabled,
    });
}
