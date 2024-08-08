import { SeismicCubeMeta_api } from "@api";
import { apiService } from "@framework/ApiService";
import { UseQueryResult, useQuery } from "@tanstack/react-query";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export function useSeismicCubeMetaListQuery(
    caseUuid: string | undefined,
    ensembleName: string | undefined
): UseQueryResult<SeismicCubeMeta_api[]> {
    return useQuery({
        queryKey: ["getSeismicCubeMetaList", caseUuid, ensembleName],
        queryFn: () => apiService.seismic.getSeismicCubeMetaList(caseUuid ?? "", ensembleName ?? ""),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: !!(caseUuid && ensembleName),
    });
}
