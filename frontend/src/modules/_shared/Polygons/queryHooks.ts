import type { QueryFunction, QueryKey, UseQueryResult } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";

import type { PolygonData_api, PolygonsMeta_api } from "@api";
import { getPolygonsData, getPolygonsDataQueryKey, getPolygonsDirectoryOptions } from "@api";
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
    function dummyApiCall(): Promise<PolygonData_api[]> {
        return new Promise((_resolve, reject) => {
            reject(null);
        });
    }

    let queryKey: QueryKey | null = null;
    let queryFn: QueryFunction<PolygonData_api[]> | null = null;

    if (!polygonsAddress) {
        queryKey = ["getPolygonsData_DUMMY_ALWAYS_DISABLED"];
        queryFn = dummyApiCall;
    } else {
        queryKey = getPolygonsDataQueryKey({
            query: {
                case_uuid: polygonsAddress.caseUuid,
                ensemble_name: polygonsAddress.ensemble,
                realization_num: polygonsAddress.realizationNum,
                name: polygonsAddress.name,
                attribute: polygonsAddress.attribute,
                ...makeCacheBustingQueryParam(
                    new RegularEnsembleIdent(polygonsAddress.caseUuid, polygonsAddress.ensemble),
                ),
            },
        });
        queryFn = async () => {
            const { data } = await getPolygonsData({
                query: {
                    case_uuid: polygonsAddress.caseUuid,
                    ensemble_name: polygonsAddress.ensemble,
                    realization_num: polygonsAddress.realizationNum,
                    name: polygonsAddress.name,
                    attribute: polygonsAddress.attribute,
                    ...makeCacheBustingQueryParam(
                        RegularEnsembleIdent.caseUuidAndEnsembleNameToString(
                            polygonsAddress.caseUuid,
                            polygonsAddress.ensemble,
                        ),
                    ),
                },
                throwOnError: true,
            });

            return data;
        };
    }

    return useQuery({
        queryKey: queryKey,
        queryFn: queryFn,
        enabled: Boolean(polygonsAddress),
    });
}
