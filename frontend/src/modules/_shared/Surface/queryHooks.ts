import {
    SurfaceDef_api,
    SurfaceMetaSet_api,
    getObservedSurfacesMetadataOptions,
    getRealizationSurfacesMetadataOptions,
    getSurfaceDataOptions,
} from "@api";
import { SurfaceDataPng_api } from "@api";
import { encodePropertiesAsKeyValStr } from "@lib/utils/queryStringUtils";
import { UseQueryResult, useQuery } from "@tanstack/react-query";

import { SurfaceDataFloat_trans, transformSurfaceData } from "./queryDataTransforms";
import { FullSurfaceAddress } from "./surfaceAddress";
import { encodeSurfAddrStr, peekSurfaceAddressType } from "./surfaceAddress";

export function useRealizationSurfacesMetadataQuery(
    caseUuid: string | undefined,
    ensembleName: string | undefined
): UseQueryResult<SurfaceMetaSet_api> {
    return useQuery({
        ...getRealizationSurfacesMetadataOptions({
            query: {
                case_uuid: caseUuid ?? "",
                ensemble_name: ensembleName ?? "",
            },
        }),
        enabled: Boolean(caseUuid && ensembleName),
    });
}

export function useObservedSurfacesMetadataQuery(caseUuid: string | undefined): UseQueryResult<SurfaceMetaSet_api> {
    return useQuery({
        ...getObservedSurfacesMetadataOptions({
            query: {
                case_uuid: caseUuid ?? "",
            },
        }),
        enabled: Boolean(caseUuid),
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
        ...getSurfaceDataOptions({
            query: {
                surf_addr_str: surfAddrStr ?? "",
                data_format: format,
                resample_to_def_str: resampleToKeyValStr,
            },
        }),
        select: transformSurfaceData,
        enabled: Boolean(allowEnable && surfAddrStr),
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
