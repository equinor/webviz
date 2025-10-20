import type { UseQueryResult } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";

import type { PolygonData_api, PolygonsMeta_api } from "@api";
import { getPolygonsDataOptions, getPolygonsDirectoryOptions } from "@api";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";

import type { PolygonsAddress } from "./polygonsAddress";

export function usePolygonsDirectoryQuery(
    ensembleIdent: RegularEnsembleIdent | null,
): UseQueryResult<PolygonsMeta_api[]> {
    return useQuery({
        ...getPolygonsDirectoryOptions({
            query: {
                case_uuid: ensembleIdent?.getCaseUuid() ?? "",
                ensemble_name: ensembleIdent?.getEnsembleName() ?? "",
                ...makeCacheBustingQueryParam(ensembleIdent ?? null),
            },
        }),
        enabled: Boolean(ensembleIdent),
    });
}

export function usePolygonsDataQueryByAddress(
    polygonsAddress: PolygonsAddress | null,
): UseQueryResult<PolygonData_api[]> {
    const queryOptions = getPolygonsDataOptions({
        query: {
            case_uuid: polygonsAddress?.caseUuid ?? "",
            ensemble_name: polygonsAddress?.ensemble ?? "",
            realization_num: polygonsAddress?.realizationNum ?? 0,
            name: polygonsAddress?.name ?? "",
            attribute: polygonsAddress?.attribute ?? "",
            ...makeCacheBustingQueryParam(
                polygonsAddress ? new RegularEnsembleIdent(polygonsAddress.caseUuid, polygonsAddress.ensemble) : null,
            ),
        },
    });

    return useQuery({
        ...queryOptions,
        enabled: Boolean(polygonsAddress),
    });
}
