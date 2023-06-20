import { EnsembleScalarResponse_api, EnsembleSensitivity_api } from "@api";
import { apiService } from "@framework/ApiService";
import { UseQueryResult, useQuery } from "@tanstack/react-query";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export function useGetSensitivities(
    caseUuid: string | undefined,
    ensembleName: string | undefined
): UseQueryResult<EnsembleSensitivity_api[]> {
    return useQuery({
        queryKey: ["sensitivityCorrelationForInplaceVolumes", caseUuid, ensembleName],
        queryFn: () => apiService.parameters.getSensitivities(caseUuid ?? "", ensembleName ?? ""),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled: caseUuid && ensembleName ? true : false,
    });
}

export function useInplaceResponseQuery(
    caseUuid: string | null,
    ensembleName: string | null,
    tableName: string | null,
    responseName: string | null
    // requestBody: Body_get_realizations_response | null,
): UseQueryResult<EnsembleScalarResponse_api> {
    return useQuery({
        queryKey: ["getRealizationResponse", caseUuid, ensembleName, tableName, responseName], //, requestBody],
        queryFn: () =>
            apiService.inplaceVolumetrics.getRealizationsResponse(
                caseUuid ?? "",
                ensembleName ?? "",
                tableName ?? "",
                responseName ?? ""
                // requestBody ?? {}
            ),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled: caseUuid && ensembleName && tableName && responseName ? true : false,
    });
}
