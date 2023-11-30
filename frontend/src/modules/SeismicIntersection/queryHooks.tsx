import { Body_post_get_seismic_fence_api, SeismicCubeMeta_api, SeismicFencePolyline_api } from "@api";
import { apiService } from "@framework/ApiService";
import { UseQueryResult, useQuery } from "@tanstack/react-query";

import { SeismicFenceData_trans, transformSeismicFenceData } from "./utils/queryDataTransforms";

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

export function useSeismicFenceDataQuery(
    caseUuid: string | null,
    ensembleName: string | null,
    realizationNum: number | null,
    seismicAttribute: string | null,
    timeOrIntervalStr: string | null,
    observed: boolean | null,
    polyline: SeismicFencePolyline_api | null,
    allowEnable: boolean
): UseQueryResult<SeismicFenceData_trans> {
    const bodyPolyline: Body_post_get_seismic_fence_api = { polyline: polyline ?? { x_points: [], y_points: [] } };
    return useQuery({
        queryKey: [
            "postGetSeismicFence",
            caseUuid,
            ensembleName,
            realizationNum,
            seismicAttribute,
            timeOrIntervalStr,
            observed,
            bodyPolyline,
        ],
        queryFn: () =>
            apiService.seismic.postGetSeismicFence(
                caseUuid ?? "",
                ensembleName ?? "",
                realizationNum ?? 0,
                seismicAttribute ?? "",
                timeOrIntervalStr ?? "",
                observed ?? false,
                bodyPolyline
            ),
        select: transformSeismicFenceData,
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: !!(
            allowEnable &&
            caseUuid &&
            ensembleName &&
            realizationNum !== null &&
            seismicAttribute &&
            timeOrIntervalStr &&
            observed !== null &&
            polyline !== null
        ),
    });
}
