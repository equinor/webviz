import { EnsembleScalarResponse_api } from "@api";
import { apiService } from "@framework/ApiService";
import { UseQueryResult, useQuery } from "@tanstack/react-query";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

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
