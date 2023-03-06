import { UseQueryResult, useQuery } from "@tanstack/react-query";

import { Ensemble, InplaceVolumetricsTableMetaData, InplaceVolumetricsRealizationsResponse, Body_get_realizations_response } from "@api";
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

export function useTableDescriptionsQuery(
    caseUuid: string | null,
    ensembleName: string | null,
    allowEnable: boolean
): UseQueryResult<Array<InplaceVolumetricsTableMetaData>> {
    return useQuery({
        queryKey: ["getTableNamesAndDescriptions", caseUuid, ensembleName],
        queryFn: () => apiService.inplaceVolumetrics.getTableNamesAndDescriptions(caseUuid ?? "", ensembleName ?? ""),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled: allowEnable && caseUuid && ensembleName ? true : false,
    });
}

export function useRealizationsResponseQuery(
    caseUuid: string | null,
    ensembleName: string | null,
    tableName: string | null,
    responseName: string | null,
    requestBody: Body_get_realizations_response | null,
    allowEnable: boolean
): UseQueryResult<InplaceVolumetricsRealizationsResponse> {
    return useQuery({
        queryKey: ["getRealizationResponse", caseUuid, ensembleName, tableName, responseName, requestBody],
        queryFn: () =>
            apiService.inplaceVolumetrics.getRealizationsResponse(
                caseUuid ?? "",
                ensembleName ?? "",
                tableName ?? "",
                responseName ?? "",
                requestBody ?? {}
            ),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled: allowEnable && caseUuid && ensembleName && tableName && responseName ? true : false,
    });
}
