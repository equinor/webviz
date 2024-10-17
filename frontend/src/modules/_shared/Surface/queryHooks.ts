import { SurfaceDef_api, SurfaceMetaSet_api } from "@api";
import { SurfaceDataPng_api } from "@api";
import { apiService } from "@framework/ApiService";
import { encodePropertiesAsKeyValStr } from "@lib/utils/queryStringUtils";
import { UseQueryResult, useQuery } from "@tanstack/react-query";

import { SurfaceDataFloat_trans, transformSurfaceData } from "./queryDataTransforms";
import { FullSurfaceAddress } from "./surfaceAddress";
import { encodeSurfAddrStr, peekSurfaceAddressType } from "./surfaceAddress";

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

export function useSurfaceDataQuery(surfAddrStr: string | null, format: "float", resampleTo: SurfaceDef_api | null, allowEnable: boolean): UseQueryResult<SurfaceDataFloat_trans>; // prettier-ignore
export function useSurfaceDataQuery(surfAddrStr: string | null, format: "png", resampleTo: SurfaceDef_api | null, allowEnable: boolean): UseQueryResult<SurfaceDataPng_api>; // prettier-ignore
export function useSurfaceDataQuery(surfAddrStr: string | null, format: "float" | "png", resampleTo: SurfaceDef_api | null, allowEnable: boolean): UseQueryResult<SurfaceDataFloat_trans | SurfaceDataPng_api>; // prettier-ignore
export function useSurfaceDataQuery(
    surfAddrStr: string | null,
    format: "float" | "png",
    resampleTo: SurfaceDef_api | null,
    allowEnable: boolean
): UseQueryResult<SurfaceDataFloat_trans | SurfaceDataPng_api> {
    if (surfAddrStr) {
        const surfAddrType = peekSurfaceAddressType(surfAddrStr);
        if (surfAddrType !== "OBS" && surfAddrType !== "REAL" && surfAddrType !== "STAT") {
            throw new Error("Invalid surface address type for surface data query");
        }
    }

    let resampleToKeyValStr: string | null = null;
    if (resampleTo) {
        resampleToKeyValStr = encodePropertiesAsKeyValStr(resampleTo);
    }

    return useQuery({
        queryKey: ["getSurfaceData", surfAddrStr, resampleToKeyValStr, format],
        queryFn: () => apiService.surface.getSurfaceData(surfAddrStr ?? "", format, resampleToKeyValStr),
        select: transformSurfaceData,
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: allowEnable && Boolean(surfAddrStr),
    });
}

export function useSurfaceDataQueryByAddress(surfAddr: FullSurfaceAddress | null, format: "float", resampleTo: SurfaceDef_api | null, allowEnable: boolean): UseQueryResult<SurfaceDataFloat_trans>; // prettier-ignore
export function useSurfaceDataQueryByAddress(surfAddr: FullSurfaceAddress | null, format: "png", resampleTo: SurfaceDef_api | null, allowEnable: boolean): UseQueryResult<SurfaceDataPng_api>; // prettier-ignore
export function useSurfaceDataQueryByAddress(
    surfAddr: FullSurfaceAddress | null,
    format: "float" | "png",
    resampleTo: SurfaceDef_api | null,
    allowEnable: boolean
): UseQueryResult<SurfaceDataFloat_trans | SurfaceDataPng_api> {
    const surfAddrStr = surfAddr ? encodeSurfAddrStr(surfAddr) : null;
    return useSurfaceDataQuery(surfAddrStr, format, resampleTo, allowEnable);
}


import { SurfaceDataFloat_api } from "@api";

function transformSurfaceData_HACKED(
    apiData: SurfaceDataFloat_api | SurfaceDataPng_api
): SurfaceDataFloat_trans {
    return transformSurfaceData(apiData) as SurfaceDataFloat_trans
}

export function useDeltaSurfaceDataQuery(surfAddrStrA: string | null, surfAddrStrB: string | null, format: "float", resampleTo: SurfaceDef_api | null, allowEnable: boolean): UseQueryResult<SurfaceDataFloat_trans> {
    if (surfAddrStrA) {
        const surfAddrType = peekSurfaceAddressType(surfAddrStrA);
        if (surfAddrType !== "OBS" && surfAddrType !== "REAL" && surfAddrType !== "STAT") {
            throw new Error("Invalid surface address type for surface A in delta surface data query");
        }
    }

    if (surfAddrStrB) {
        const surfAddrType = peekSurfaceAddressType(surfAddrStrB);
        if (surfAddrType !== "OBS" && surfAddrType !== "REAL" && surfAddrType !== "STAT") {
            throw new Error("Invalid surface address type for surface B in delta surface data query");
        }
    }

    let resampleToKeyValStr: string | null = null;
    if (resampleTo) {
        resampleToKeyValStr = encodePropertiesAsKeyValStr(resampleTo);
    }

    return useQuery({
        queryKey: ["getDeltaSurfaceData", surfAddrStrA, surfAddrStrB, resampleToKeyValStr, format],
        queryFn: () => apiService.surface.getDeltaSurfaceData(surfAddrStrA ?? "", surfAddrStrB ?? "", format, resampleToKeyValStr),
        select: transformSurfaceData_HACKED,
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: allowEnable && Boolean(surfAddrStrA) && Boolean(surfAddrStrB),
    });
}

export function useDeltaSurfaceDataQueryByAddress(surfAddrA: FullSurfaceAddress | null, surfAddrB: FullSurfaceAddress | null, format: "float", resampleTo: SurfaceDef_api | null, allowEnable: boolean): UseQueryResult<SurfaceDataFloat_trans> {
    const surfAddrStrA = surfAddrA ? encodeSurfAddrStr(surfAddrA) : null;
    const surfAddrStrB = surfAddrB ? encodeSurfAddrStr(surfAddrB) : null;
    return useDeltaSurfaceDataQuery(surfAddrStrA, surfAddrStrB, format, resampleTo, allowEnable);
}
