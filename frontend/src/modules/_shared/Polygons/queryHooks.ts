import {
    PolygonData_api,
    PolygonsMeta_api,
    getPolygonsData,
    getPolygonsDataQueryKey,
    getPolygonsDirectoryOptions,
} from "@api";
import { QueryFunction, QueryKey, UseQueryResult, useQuery } from "@tanstack/react-query";

import { PolygonsAddress } from "./polygonsAddress";

export function usePolygonsDirectoryQuery(
    caseUuid: string | undefined,
    ensembleName: string | undefined
): UseQueryResult<PolygonsMeta_api[]> {
    return useQuery({
        ...getPolygonsDirectoryOptions({
            query: {
                case_uuid: caseUuid ?? "",
                ensemble_name: ensembleName ?? "",
            },
        }),
        enabled: Boolean(caseUuid && ensembleName),
    });
}

export function usePolygonsDataQueryByAddress(
    polygonsAddress: PolygonsAddress | null
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
