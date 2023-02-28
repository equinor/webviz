import { UseQueryResult, useQuery } from "react-query";

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

export function useStaticSurfaceDataQuery(
    caseUuid: string | null,
    ensembleName: string | null,
    realizationNum: number,
    name: string | null,
    attribute: string | null,
    allowEnable: boolean
): UseQueryResult<SurfaceData> {
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
        enabled: allowEnable && paramsValid,
    });
}

export function useDynamicSurfaceDataQuery(
    caseUuid: string | null,
    ensembleName: string | null,
    realizationNum: number,
    name: string | null,
    attribute: string | null,
    timeOrInterval: string | null,
    allowEnable: boolean
): UseQueryResult<SurfaceData> {
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
        enabled: allowEnable && paramsValid,
    });
}
