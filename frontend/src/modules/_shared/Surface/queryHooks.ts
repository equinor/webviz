import { SurfaceData_api, SurfaceMetaSet_api } from "@api";
import { apiService } from "@framework/ApiService";
import { QueryFunction, QueryKey, UseQueryResult, useQuery } from "@tanstack/react-query";

import { SurfaceData_trans, transformSurfaceData } from "./queryDataTransforms";
import { SurfaceAddress } from "./surfaceAddress";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export function useRealizationSurfacesMetadataQuery(
    caseUuid: string | undefined,
    ensembleName: string | undefined
): UseQueryResult<SurfaceMetaSet_api> {
    return useQuery({
        queryKey: ["getRealizationSurfacesMetadata", caseUuid, ensembleName],
        queryFn: () => apiService.surface.getRealizationSurfacesMetadata(caseUuid ?? "", ensembleName ?? ""),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: caseUuid && ensembleName ? true : false,
    });
}

export function useObservedSurfacesMetadataQuery(caseUuid: string | undefined): UseQueryResult<SurfaceMetaSet_api> {
    return useQuery({
        queryKey: ["getObservedSurfacesMetadata", caseUuid],
        queryFn: () => apiService.surface.getObservedSurfacesMetadata(caseUuid ?? ""),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: caseUuid ? true : false,
    });
}

export function useSurfaceDataQueryByAddress(surfAddr: SurfaceAddress | null): UseQueryResult<SurfaceData_trans> {
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
    } else if (surfAddr.addressType === "realization") {
        queryKey = [
            "getRealizationSurfaceData",
            surfAddr.caseUuid,
            surfAddr.ensemble,
            surfAddr.realizationNum,
            surfAddr.name,
            surfAddr.attribute,
            surfAddr.isoDateOrInterval,
        ];
        queryFn = () =>
            apiService.surface.getRealizationSurfaceData(
                surfAddr.caseUuid,
                surfAddr.ensemble,
                surfAddr.realizationNum,
                surfAddr.name,
                surfAddr.attribute,
                surfAddr.isoDateOrInterval ?? undefined
            );
    } else if (surfAddr.addressType === "observed") {
        queryKey = [
            "getObservedSurfaceData",
            surfAddr.caseUuid,
            surfAddr.name,
            surfAddr.attribute,
            surfAddr.isoDateOrInterval,
        ];
        queryFn = () =>
            apiService.surface.getObservedSurfaceData(
                surfAddr.caseUuid,
                surfAddr.name,
                surfAddr.attribute,
                surfAddr.isoDateOrInterval ?? ""
            );
    } else if (surfAddr.addressType === "statistical") {
        queryKey = [
            "getStatisticalSurfaceData",
            surfAddr.caseUuid,
            surfAddr.ensemble,
            surfAddr.statisticFunction,
            surfAddr.name,
            surfAddr.attribute,
            surfAddr.isoDateOrInterval,
        ];
        queryFn = () =>
            apiService.surface.getStatisticalSurfaceData(
                surfAddr.caseUuid,
                surfAddr.ensemble,
                surfAddr.statisticFunction,
                surfAddr.name,
                surfAddr.attribute,
                surfAddr.isoDateOrInterval ?? undefined
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
        enabled: Boolean(surfAddr),
    });
}
