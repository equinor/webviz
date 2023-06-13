import {
    Body_get_realizations_response,
    EnsembleInfo,
    EnsembleScalarResponse,
    InplaceVolumetricsTableMetaData,
} from "@api";
import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { UseQueryResult, useQuery } from "@tanstack/react-query";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export function useEnsemblesQuery(caseUuid: string | null): UseQueryResult<Array<EnsembleInfo>> {
    return useQuery({
        queryKey: ["getEnsembles", caseUuid],
        queryFn: () => apiService.explore.getEnsembles(caseUuid ?? ""),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled: caseUuid ? true : false,
    });
}

export function useTableDescriptionsQuery(
    ensemble: EnsembleIdent | null,
    allowEnable: boolean
): UseQueryResult<Array<InplaceVolumetricsTableMetaData>> {
    return useQuery({
        queryKey: ["getTableNamesAndDescriptions", ensemble],
        queryFn: () =>
            apiService.inplaceVolumetrics.getTableNamesAndDescriptions(
                ensemble?.getCaseUuid() ?? "",
                ensemble?.getEnsembleName() ?? ""
            ),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled: allowEnable && ensemble ? true : false,
    });
}

export function useRealizationsResponseQuery(
    caseUuid: string | null,
    ensembleName: string | null,
    tableName: string | null,
    responseName: string | null,
    requestBody: Body_get_realizations_response | null,
    allowEnable: boolean
): UseQueryResult<EnsembleScalarResponse> {
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
