import { UseQueryResult, useQuery } from "@tanstack/react-query";
import { SurfaceStatisticFunction } from "@api";

import { DynamicSurfaceDirectory, Ensemble, StaticSurfaceDirectory, SurfaceData } from "@api";
import { apiService } from "@framework/ApiService";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export function useEnsemblesQuery(caseUuid: string | null): UseQueryResult<Array<Ensemble>> {
    return useQuery({
        queryKey: ["getEnsembles", caseUuid],
        queryFn: () => apiService.explore.getEnsembles(caseUuid ?? ""),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled: caseUuid ? true : false,
    });
}

export function useDynamicSurfaceDirectoryQuery(
    caseUuid: string | null,
    ensembleName: string | null,
    allowEnable: boolean
): UseQueryResult<DynamicSurfaceDirectory> {
    return useQuery({
        queryKey: ["getDynamicSurfaceDirectory", caseUuid, ensembleName],
        queryFn: () => apiService.surface.getDynamicSurfaceDirectory(caseUuid ?? "", ensembleName ?? ""),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled: allowEnable && caseUuid && ensembleName ? true : false,
    });
}

export function useStaticSurfaceDirectoryQuery(
    caseUuid: string | null,
    ensembleName: string | null,
    allowEnable: boolean
): UseQueryResult<StaticSurfaceDirectory> {
    return useQuery({
        queryKey: ["getStaticSurfaceDirectory", caseUuid, ensembleName],
        queryFn: () => apiService.surface.getStaticSurfaceDirectory(caseUuid ?? "", ensembleName ?? ""),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled: allowEnable && caseUuid && ensembleName ? true : false,
    });
}

export function useSomeSurfaceDataQuery(
    surfTypeToQuery: "dynamic" | "static",
    aggregationToQuery: SurfaceStatisticFunction | null,
    caseUuid: string | null,
    ensembleName: string | null,
    realizationNum: number,
    name: string | null,
    attribute: string | null,
    timeOrInterval?: string | null,
): UseQueryResult<SurfaceData> {
    if (surfTypeToQuery === "dynamic") {
        // Dynamic, per realization surface
        if (aggregationToQuery === null) {
            const paramsValid = !!(caseUuid && ensembleName && realizationNum >= 0 && name && attribute && timeOrInterval);
            return useQuery({
                queryKey: ["getDynamicSurfaceData", caseUuid, ensembleName, realizationNum, name, attribute, timeOrInterval],
                queryFn: () =>
                    apiService.surface.getDynamicSurfaceData(
                        caseUuid ?? "",
                        ensembleName ?? "",
                        realizationNum,
                        name ?? "",
                        attribute ?? "",
                        timeOrInterval ?? ""
                    ),
                staleTime: STALE_TIME,
                cacheTime: CACHE_TIME,
                enabled: paramsValid,
            });
        }
        // Dynamic, statistical surface
        else {
            const paramsValid = !!(caseUuid && ensembleName && name && attribute && timeOrInterval);
            return useQuery({
                queryKey: ["getStatisticalDynamicSurfaceData", caseUuid, ensembleName, aggregationToQuery, name, attribute, timeOrInterval],
                queryFn: () =>
                    apiService.surface.getStatisticalDynamicSurfaceData(
                        caseUuid ?? "",
                        ensembleName ?? "",
                        aggregationToQuery,
                        name ?? "",
                        attribute ?? "",
                        timeOrInterval ?? ""
                    ),
                staleTime: STALE_TIME,
                cacheTime: CACHE_TIME,
                enabled: paramsValid,
            });
        }
    }
    else if (surfTypeToQuery === "static") {
        // Static, per realization surface
        if (aggregationToQuery === null) {
            const paramsValid = !!(caseUuid && ensembleName && realizationNum >= 0 && name && attribute);
            return useQuery({
                queryKey: ["getStaticSurfaceData", caseUuid, ensembleName, realizationNum, name, attribute],
                queryFn: () =>
                    apiService.surface.getStaticSurfaceData(
                        caseUuid ?? "",
                        ensembleName ?? "",
                        realizationNum,
                        name ?? "",
                        attribute ?? ""
                    ),
                staleTime: STALE_TIME,
                cacheTime: CACHE_TIME,
                enabled: paramsValid,
            });
        }
        // Static, statistical surface
        else {
            const paramsValid = !!(caseUuid && ensembleName && name && attribute);
            return useQuery({
                queryKey: ["getStatisticalStaticSurfaceData", caseUuid, ensembleName, aggregationToQuery, name, attribute],
                queryFn: () =>
                    apiService.surface.getStatisticalStaticSurfaceData(
                        caseUuid ?? "",
                        ensembleName ?? "",
                        aggregationToQuery,
                        name ?? "",
                        attribute ?? ""
                    ),
                staleTime: STALE_TIME,
                cacheTime: CACHE_TIME,
                enabled: paramsValid,
            });
        }
    }

    throw new Error("Invalid surfTypeToQuery");
}
