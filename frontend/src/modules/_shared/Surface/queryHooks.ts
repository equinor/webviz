import type { UseQueryResult } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";

import type { SurfaceDataPng_api, SurfaceDef_api, SurfaceMetaSet_api } from "@api";
import { getObservedSurfacesMetadataOptions, getRealizationSurfacesMetadataOptions, getSurfaceDataOptions } from "@api";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";
import { encodePropertiesAsKeyValStr } from "@lib/utils/queryStringUtils";

import type { SurfaceDataFormat } from "../DataProviderFramework/dataProviders/implementations/surfaceProviders/types";

import type { SurfaceDataFloat_trans } from "./queryDataTransforms";
import { transformSurfaceData } from "./queryDataTransforms";
import {
    type FullSurfaceAddress,
    encodeSurfAddrStr,
    peekSurfaceAddressType,
    peekSurfaceCaseUuid,
    peekSurfaceEnsemble,
} from "./surfaceAddress";

export function useRealizationSurfacesMetadataQuery(
    ensembleIdent: RegularEnsembleIdent | null,
): UseQueryResult<SurfaceMetaSet_api> {
    return useQuery({
        ...getRealizationSurfacesMetadataOptions({
            query: {
                case_uuid: ensembleIdent?.getCaseUuid() ?? "",
                ensemble_name: ensembleIdent?.getEnsembleName() ?? "",
                ...makeCacheBustingQueryParam(ensembleIdent),
            },
        }),
        enabled: Boolean(ensembleIdent),
    });
}

export function useObservedSurfacesMetadataQuery(
    ensembleIdent: RegularEnsembleIdent | null,
): UseQueryResult<SurfaceMetaSet_api> {
    return useQuery({
        ...getObservedSurfacesMetadataOptions({
            query: {
                case_uuid: ensembleIdent?.getCaseUuid() ?? "",
                ...makeCacheBustingQueryParam(ensembleIdent),
            },
        }),
        enabled: Boolean(ensembleIdent),
    });
}

export function useSurfaceDataQuery(surfAddrStr: string | null, format: SurfaceDataFormat.FLOAT, resampleTo: SurfaceDef_api | null, allowEnable: boolean): UseQueryResult<SurfaceDataFloat_trans>; // prettier-ignore
export function useSurfaceDataQuery(surfAddrStr: string | null, format:SurfaceDataFormat.PNG, resampleTo: SurfaceDef_api | null, allowEnable: boolean): UseQueryResult<SurfaceDataPng_api>; // prettier-ignore
export function useSurfaceDataQuery(surfAddrStr: string | null, format: SurfaceDataFormat, resampleTo: SurfaceDef_api | null, allowEnable: boolean): UseQueryResult<SurfaceDataFloat_trans | SurfaceDataPng_api>; // prettier-ignore
export function useSurfaceDataQuery(
    surfAddrStr: string | null,
    format: SurfaceDataFormat,
    resampleTo: SurfaceDef_api | null,
    allowEnable: boolean,
): UseQueryResult<SurfaceDataFloat_trans | SurfaceDataPng_api> {
    let cacheBustingQueryParam: { zCacheBust?: string } | undefined = undefined;
    if (surfAddrStr) {
        const surfAddrType = peekSurfaceAddressType(surfAddrStr);
        if (surfAddrType !== "OBS" && surfAddrType !== "REAL" && surfAddrType !== "STAT") {
            throw new Error("Invalid surface address type for surface data query");
        }

        const surfAddrEnsemble = peekSurfaceEnsemble(surfAddrStr);
        const surfAddrCaseUuid = peekSurfaceCaseUuid(surfAddrStr);
        if (surfAddrCaseUuid && surfAddrEnsemble) {
            const ensembleIdent = new RegularEnsembleIdent(surfAddrCaseUuid, surfAddrEnsemble);
            cacheBustingQueryParam = makeCacheBustingQueryParam(ensembleIdent);
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
                ...cacheBustingQueryParam,
            },
        }),
        select: transformSurfaceData,
        enabled: Boolean(allowEnable && surfAddrStr),
    });
}

export function useSurfaceDataQueryByAddress(surfAddr: FullSurfaceAddress | null, format: SurfaceDataFormat.FLOAT, resampleTo: SurfaceDef_api | null, allowEnable: boolean): UseQueryResult<SurfaceDataFloat_trans>; // prettier-ignore
export function useSurfaceDataQueryByAddress(surfAddr: FullSurfaceAddress | null, format: SurfaceDataFormat.PNG, resampleTo: SurfaceDef_api | null, allowEnable: boolean): UseQueryResult<SurfaceDataPng_api>; // prettier-ignore
export function useSurfaceDataQueryByAddress(
    surfAddr: FullSurfaceAddress | null,
    format: SurfaceDataFormat,
    resampleTo: SurfaceDef_api | null,
    allowEnable: boolean,
): UseQueryResult<SurfaceDataFloat_trans | SurfaceDataPng_api> {
    const surfAddrStr = surfAddr ? encodeSurfAddrStr(surfAddr) : null;
    return useSurfaceDataQuery(surfAddrStr, format, resampleTo, allowEnable);
}
