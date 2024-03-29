import { PolygonData_api, PolygonsMeta_api } from "@api";
import { apiService } from "@framework/ApiService";
import { QueryFunction, QueryKey, UseQueryResult, useQuery } from "@tanstack/react-query";

import { PolygonsAddress } from "./polygonsAddress";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export function usePolygonsDirectoryQuery(
    caseUuid: string | undefined,
    ensembleName: string | undefined
): UseQueryResult<PolygonsMeta_api[]> {
    return useQuery({
        queryKey: ["getPolygonsDirectory", caseUuid, ensembleName],
        queryFn: () => apiService.polygons.getPolygonsDirectory(caseUuid ?? "", ensembleName ?? ""),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: caseUuid && ensembleName ? true : false,
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
        queryKey = [
            "getPolygonsData",
            polygonsAddress.caseUuid,
            polygonsAddress.ensemble,
            polygonsAddress.realizationNum,
            polygonsAddress.name,
            polygonsAddress.attribute,
        ];
        queryFn = () =>
            apiService.polygons.getPolygonsData(
                polygonsAddress.caseUuid,
                polygonsAddress.ensemble,
                polygonsAddress.realizationNum,
                polygonsAddress.name,
                polygonsAddress.attribute
            );
    }

    return useQuery({
        queryKey: queryKey,
        queryFn: queryFn,
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: Boolean(polygonsAddress),
    });
}
